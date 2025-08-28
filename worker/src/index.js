import { Router } from 'itty-router';
import csvData from '../XAUUSD_M15.csv';

// ============================================================================
// 1. Constants & State Management
// ============================================================================

const CONFIG = {
    CONTRACT_SIZE: 100,
    INITIAL_BALANCE: 10000,
    SIMULATION_DURATION_DAYS: 30,
};

// This will hold the state of the single, ongoing game.
// NOTE: This simple state management is for a single-player experience.
// For a multi-user system, Cloudflare Durable Objects would be required.
let state = {};

// This will hold all parsed price data from the CSV.
let rawData = [];

// ============================================================================
// 2. Data Processing (Executed on Worker startup)
// ============================================================================

function parseData(csvText) {
    if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.substring(1);
    }
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    const firstLine = lines.find(line => {
        const lowerLine = line.trim().toLowerCase();
        return lowerLine !== '' && !lowerLine.includes('time') && !lowerLine.includes('open');
    });
    if (!firstLine) return [];
    let delimiter = ',';
    if (firstLine.includes('\t') || (firstLine.includes(' ') && !firstLine.includes(','))) {
        delimiter = /\s+/;
    } else if (firstLine.includes(';')) {
        delimiter = ';';
    }
    const testParts = firstLine.split(delimiter);
    if (testParts.length < 5) return [];
    let timeFormat = 'unknown';
    if (testParts[0].match(/^\d{10,}$/)) {
        timeFormat = 'timestamp';
    } else if (testParts[0].match(/^\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2}$/) && testParts.length > 1 && testParts[1].match(/^\d{2}:\d{2}/)) {
        timeFormat = 'datetime_separate';
    } else if (testParts[0].includes(':') || testParts[0].match(/^\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2}/)) {
        timeFormat = 'datetime_combined';
    }
    const parsedData = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '' || line.toLowerCase().includes('open') || line.toLowerCase().includes('time')) continue;
        const values = line.split(delimiter);
        let timestamp, open, high, low, close;
        try {
            if (timeFormat === 'timestamp') {
                if (values.length < 5) continue;
                timestamp = parseInt(values[0]);
                if (timestamp < 10000000000) timestamp *= 1000;
                open = parseFloat(values[1]);
                high = parseFloat(values[2]);
                low = parseFloat(values[3]);
                close = parseFloat(values[4]);
            } else if (timeFormat === 'datetime_separate') {
                if (values.length < 6) continue;
                const dateStr = `${values[0].replace(/[\.\/]/g, '-')} ${values[1]}`;
                timestamp = new Date(dateStr).getTime();
                open = parseFloat(values[2]);
                high = parseFloat(values[3]);
                low = parseFloat(values[4]);
                close = parseFloat(values[5]);
            } else if (timeFormat === 'datetime_combined') {
                if (values.length < 5) continue;
                timestamp = new Date(values[0].replace(/[\.\/]/g, '-')).getTime();
                open = parseFloat(values[1]);
                high = parseFloat(values[2]);
                low = parseFloat(values[3]);
                close = parseFloat(values[4]);
            } else {
                continue;
            }
            if (isNaN(timestamp) || timestamp <= 0 || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
                continue;
            }
            parsedData.push({ time: timestamp, open, high, low, close });
        } catch (error) {}
    }
    return parsedData.sort((a, b) => a.time - b.time);
}

// Immediately parse the data when the worker initializes.
try {
    rawData = parseData(csvData);
    console.log(`Successfully parsed ${rawData.length} data points.`);
} catch (e) {
    console.error("Failed to parse CSV data on worker startup:", e);
}


// ============================================================================
// 3. Game Logic Functions
// ============================================================================

function resetState() {
    state = {
        gameData: [],
        isEnded: false,
        currentIndex: 0,
        balance: CONFIG.INITIAL_BALANCE,
        equity: CONFIG.INITIAL_BALANCE,
        floatingPL: 0,
        openPositions: [],
        tradeHistory: [],
        orderIdCounter: 1,
    };
}

function selectRandomDataSegment() {
    const totalDurationMs = CONFIG.SIMULATION_DURATION_DAYS * 24 * 60 * 60 * 1000;
    if (rawData.length === 0) return;
    const dataDuration = rawData[rawData.length - 1].time - rawData[0].time;
    if (dataDuration < totalDurationMs) {
        state.gameData = [...rawData];
        return;
    }
    const latestStartTime = rawData[rawData.length - 1].time - totalDurationMs;
    const earliestStartTime = rawData[0].time;
    const randomStartTime = earliestStartTime + Math.random() * (latestStartTime - earliestStartTime);
    let startIndex = rawData.findIndex(d => d.time >= randomStartTime);
    if (startIndex === -1) startIndex = 0;
    const startTime = rawData[startIndex].time;
    const endTime = startTime + totalDurationMs;
    state.gameData = rawData.filter(d => d.time >= startTime && d.time <= endTime);
}

function getCurrentPrice() {
    if (state.isEnded || !state.gameData || state.gameData.length === 0 || state.currentIndex >= state.gameData.length) return 0;
    return state.gameData[state.currentIndex].close;
}

function calculateProfit(position, currentPrice) {
    const priceDiff = position.type === 'BUY' ? currentPrice - position.entryPrice : position.entryPrice - currentPrice;
    return priceDiff * CONFIG.CONTRACT_SIZE * position.lots;
}

function updateAccount() {
    state.floatingPL = state.openPositions.reduce((sum, pos) => {
        pos.profit = calculateProfit(pos, getCurrentPrice());
        return sum + pos.profit;
    }, 0);
    state.equity = state.balance + state.floatingPL;
}

function internalCloseOrder(id, closePrice) {
    const index = state.openPositions.findIndex(p => p.id === id);
    if (index === -1) return null;

    const position = state.openPositions[index];
    const profit = calculateProfit(position, closePrice);
    state.balance += profit;

    const closeTime = state.gameData[state.currentIndex].time;
    const historyEntry = { ...position, closePrice, closeTime, profit };
    state.tradeHistory.push(historyEntry);
    state.openPositions.splice(index, 1);

    return historyEntry;
}


function updatePositions() {
    if (state.isEnded || !state.gameData || state.currentIndex >= state.gameData.length) return [];

    const currentBar = state.gameData[state.currentIndex];
    const closedTrades = [];

    // Use a reverse loop to safely remove items while iterating
    for (let i = state.openPositions.length - 1; i >= 0; i--) {
        const pos = state.openPositions[i];

        let closed = false;
        if (pos.type === 'BUY') {
            if (pos.sl && currentBar.low <= pos.sl) {
                const closedTrade = internalCloseOrder(pos.id, pos.sl);
                if(closedTrade) closedTrades.push(closedTrade);
                closed = true;
            } else if (pos.tp && currentBar.high >= pos.tp) {
                const closedTrade = internalCloseOrder(pos.id, pos.tp);
                if(closedTrade) closedTrades.push(closedTrade);
                closed = true;
            }
        } else { // SELL
            if (pos.sl && currentBar.high >= pos.sl) {
                const closedTrade = internalCloseOrder(pos.id, pos.sl);
                if(closedTrade) closedTrades.push(closedTrade);
                closed = true;
            } else if (pos.tp && currentBar.low <= pos.tp) {
                const closedTrade = internalCloseOrder(pos.id, pos.tp);
                if(closedTrade) closedTrades.push(closedTrade);
                closed = true;
            }
        }
    }

    updateAccount();
    return closedTrades;
}

function advanceSimulation() {
    if (state.currentIndex < state.gameData.length - 1) {
        state.currentIndex++;
        return true;
    }
    state.isEnded = true;
    return false;
}

// ============================================================================
// 4. API Router & Handlers
// ============================================================================

const router = Router();

// A helper to create a standard JSON response
const jsonResponse = (data, status = 200) =>
    new Response(JSON.stringify(data, null, 2), {
        headers: { 'Content-Type': 'application/json' },
        status,
    });

// A helper to create a standard error response
const errorResponse = (message, status = 400) =>
    jsonResponse({ error: message }, status);

// POST /api/start - Initializes a new game
router.post('/api/start', () => {
    resetState();
    selectRandomDataSegment();
    if (state.gameData.length === 0) {
        return errorResponse("Could not initialize game, no data available.", 500);
    }
    state.currentIndex = 0; // Start at the beginning of the segment
    updateAccount();

    return jsonResponse({
        initialBalance: CONFIG.INITIAL_BALANCE,
        gameData: state.gameData,
        startIndex: state.currentIndex,
    });
});

// POST /api/tick - Advances the simulation by one step
router.post('/api/tick', () => {
    if (state.isEnded || !state.gameData || state.gameData.length === 0) {
        return errorResponse("Game is not active or has ended.", 400);
    }

    const hasAdvanced = advanceSimulation();
    const closedTrades = updatePositions(); // This also calls updateAccount inside

    return jsonResponse({
        isEnded: state.isEnded,
        currentIndex: state.currentIndex,
        equity: state.equity,
        floatingPL: state.floatingPL,
        openPositions: state.openPositions,
        newlyClosedTrades: closedTrades, // Send back trades that were just closed
    });
});

// POST /api/trade - Opens a new trade
router.post('/api/trade', async request => {
    if (state.isEnded) return errorResponse("Game has ended.", 400);

    const { type, lots, sl, tp } = await request.json();

    if (!['BUY', 'SELL'].includes(type)) return errorResponse("Invalid trade type.");
    if (isNaN(lots) || lots <= 0) return errorResponse("Invalid lots.");

    const entryPrice = getCurrentPrice();
    if (entryPrice <= 0) return errorResponse("Invalid entry price.", 500);

    // Basic validation
    if (type === 'BUY') {
        if (sl && sl >= entryPrice) return errorResponse("Buy order SL must be below entry price.");
        if (tp && tp <= entryPrice) return errorResponse("Buy order TP must be above entry price.");
    } else {
        if (sl && sl <= entryPrice) return errorResponse("Sell order SL must be above entry price.");
        if (tp && tp >= entryPrice) return errorResponse("Sell order TP must be below entry price.");
    }

    const position = {
        id: state.orderIdCounter++,
        type,
        lots,
        entryPrice,
        entryTime: state.gameData[state.currentIndex].time,
        sl: sl || null,
        tp: tp || null,
        profit: 0
    };

    state.openPositions.push(position);
    updateAccount();

    return jsonResponse(state);
});

// DELETE /api/trade/:id - Closes a single trade
router.delete('/api/trade/:id', (request) => {
    if (state.isEnded) return errorResponse("Game has ended.", 400);
    const id = parseInt(request.params.id);
    if (isNaN(id)) return errorResponse("Invalid trade ID.");

    const closePrice = getCurrentPrice();
    const closedTrade = internalCloseOrder(id, closePrice);

    if (!closedTrade) return errorResponse("Position not found.", 404);

    updateAccount();
    return jsonResponse(state);
});

// DELETE /api/trades - Closes all open trades
router.delete('/api/trades', () => {
    if (state.isEnded) return errorResponse("Game has ended.", 400);

    const closePrice = getCurrentPrice();
    [...state.openPositions].forEach(pos => internalCloseOrder(pos.id, closePrice));

    updateAccount();
    return jsonResponse(state);
});


// Catch-all for 404s
router.all('*', () => new Response('Not Found.', { status: 404 }));

// ============================================================================
// 5. Worker Entrypoint
// ============================================================================

export default {
    async fetch(request, env, ctx) {
        // We only handle API requests. The Pages plugin handles serving static assets.
        const url = new URL(request.url);
        if (url.pathname.startsWith('/api/')) {
            return router.handle(request);
        }
        // This is a fallback. In a real Pages setup, this response would likely not be used
        // as the Pages plugin would serve the `index.html` or a 404 asset.
        return new Response('Not an API route. Your Pages assets should be served.', { status: 404 });
    },
};

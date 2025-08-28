import { Router, error, json } from 'itty-router';
// The path is relative to the functions directory root.
// The ?raw suffix tells the bundler to import the file as a raw text string.
import csvData from '../XAUUSD_M15.csv?raw';

// ============================================================================
// 1. Constants & State Management
// ============================================================================

const CONFIG = {
    CONTRACT_SIZE: 100,
    INITIAL_BALANCE: 10000,
    SIMULATION_DURATION_DAYS: 30,
};

// NOTE: This simple state management is for a single-player experience and will
// reset if the worker instance restarts. For persistent state, a storage
// solution like KV or Durable Objects would be needed.
let state = {};

// This will hold all parsed price data from the CSV.
// This parsing happens only once when the function is first invoked.
let rawData = [];
let isDataParsed = false;

// ============================================================================
// 2. Data Processing & Game Logic
// ============================================================================

function parseAndLoadData() {
    if (isDataParsed) return;
    try {
        // The imported csvData is a string containing the file's content.
        rawData = parseData(csvData);
        console.log(`Successfully parsed ${rawData.length} data points.`);
        isDataParsed = true;
    } catch (e) {
        console.error("Failed to parse CSV data on worker startup:", e);
        // If data fails to parse, rawData will be empty, and subsequent calls will fail.
    }
}

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

function resetState() {
    state = {
        gameData: [], isEnded: false, currentIndex: 0,
        balance: CONFIG.INITIAL_BALANCE, equity: CONFIG.INITIAL_BALANCE,
        floatingPL: 0, openPositions: [], tradeHistory: [],
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
    for (let i = state.openPositions.length - 1; i >= 0; i--) {
        const pos = state.openPositions[i];
        if (pos.type === 'BUY') {
            if (pos.sl && currentBar.low <= pos.sl) {
                const closedTrade = internalCloseOrder(pos.id, pos.sl);
                if(closedTrade) closedTrades.push(closedTrade);
            } else if (pos.tp && currentBar.high >= pos.tp) {
                const closedTrade = internalCloseOrder(pos.id, pos.tp);
                if(closedTrade) closedTrades.push(closedTrade);
            }
        } else {
            if (pos.sl && currentBar.high >= pos.sl) {
                const closedTrade = internalCloseOrder(pos.id, pos.sl);
                if(closedTrade) closedTrades.push(closedTrade);
            } else if (pos.tp && currentBar.low <= pos.tp) {
                const closedTrade = internalCloseOrder(pos.id, pos.tp);
                if(closedTrade) closedTrades.push(closedTrade);
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
// 4. API Router
// ============================================================================

// The base path is `/api/` due to the file location `functions/api/[[path]].js`
const router = Router({ base: '/api' });

router
    .post('/start', () => {
        parseAndLoadData(); // Ensure data is loaded
        if (rawData.length === 0) return error(500, "Could not initialize game, no data available.");

        resetState();
        selectRandomDataSegment();
        state.currentIndex = 0;
        updateAccount();

        return json({
            initialBalance: CONFIG.INITIAL_BALANCE,
            gameData: state.gameData,
            startIndex: state.currentIndex,
        });
    })
    .post('/tick', () => {
        if (state.isEnded || !state.gameData || state.gameData.length === 0) {
            return error(400, "Game is not active or has ended.");
        }
        advanceSimulation();
        const closedTrades = updatePositions();
        return json({
            isEnded: state.isEnded,
            currentIndex: state.currentIndex,
            equity: state.equity,
            floatingPL: state.floatingPL,
            openPositions: state.openPositions,
            newlyClosedTrades: closedTrades,
        });
    })
    .post('/trade', async request => {
        if (state.isEnded) return error(400, "Game has ended.");
        const { type, lots, sl, tp } = await request.json();
        if (!['BUY', 'SELL'].includes(type) || isNaN(lots) || lots <= 0) return error(400, "Invalid trade parameters.");

        const entryPrice = getCurrentPrice();
        if (entryPrice <= 0) return error(500, "Invalid entry price.");

        const position = {
            id: state.orderIdCounter++, type, lots, entryPrice,
            entryTime: state.gameData[state.currentIndex].time,
            sl: sl || null, tp: tp || null, profit: 0
        };
        state.openPositions.push(position);
        updateAccount();
        return json(state);
    })
    .delete('/trade/:id', (request) => {
        if (state.isEnded) return error(400, "Game has ended.");
        const id = parseInt(request.params.id);
        if (isNaN(id)) return error(400, "Invalid trade ID.");
        const closePrice = getCurrentPrice();
        if (!internalCloseOrder(id, closePrice)) return error(404, "Position not found.");
        updateAccount();
        return json(state);
    })
    .delete('/trades', () => {
        if (state.isEnded) return error(400, "Game has ended.");
        const closePrice = getCurrentPrice();
        [...state.openPositions].forEach(pos => internalCloseOrder(pos.id, closePrice));
        updateAccount();
        return json(state);
    })
    // Catch-all for other /api routes
    .all('*', () => error(404, 'API route not found.'));

// ============================================================================
// 5. Pages Function Entrypoint
// ============================================================================

// This single onRequest function handles all incoming requests.
export const onRequest = async (context) => {
    // Pass the request to the itty-router instance.
    return router.handle(context.request);
};

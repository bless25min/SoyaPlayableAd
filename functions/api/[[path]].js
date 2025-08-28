import { Router, error, json } from 'itty-router';

// ============================================================================
// 1. Constants & State Management
// ============================================================================

const CONFIG = {
    CONTRACT_SIZE: 100,
    INITIAL_BALANCE: 10000,
    SIMULATION_DURATION_DAYS: 30,
};

const PERFORMANCE_BENCHMARKS = {
    GENERAL: [
        { ror: -Infinity, text: "你目前的模擬績效還有很大的進步空間，繼續學習！" },
        { ror: -0.20, text: "模擬剛開始，請謹慎操作，掌握風險管理。" },
        { ror: 0.00, text: "保持穩健！你成功在模擬中保護了初始虛擬資金。" },
        { ror: 0.02, text: "表現穩健，你正在掌握模擬交易的節奏。" },
        { ror: 0.05, text: "技巧提升中！你的模擬績效持續進步。" },
        { ror: 0.10, text: "優秀的模擬表現！你展現了良好的交易策略理解。" },
    ],
    FUND: [
        { ror: -Infinity, text: "在高波動模擬環境中，風險控制是首要任務。" },
        { ror: 0.03, text: "穩定的操作策略，在模擬中逐步積累經驗。" },
        { ror: 0.06, text: "展現紀律性，你的模擬策略開始奏效。" },
        { ror: 0.11, text: "表現亮眼！你對市場動態有敏銳的觀察力。" },
        { ror: 0.16, text: "模擬交易大師！你展現了高水準的策略應用能力。" },
        { ror: 0.21, text: "卓越的模擬成果！你的交易技巧已達頂尖水準。" },
    ]
};

const FINANCIAL_EVENTS = [
     { triggerDay: 5, title: '美國非農就業數據 (NFP)', description: '非農數據即將公布，市場預期將出現劇烈波動。請注意風險！' },
    { triggerDay: 15, title: '美國 CPI 公布', description: '消費者物價指數 (CPI) 高於預期，可能引發市場對通膨的擔憂。' },
    { triggerDay: 25, title: 'FOMC 利率決議', description: '聯準會即將宣布利率決議。市場普遍預期將維持現有利率。' },
];

let state = {};
let rawData = [];
let dataLoadingPromise = null;

// ============================================================================
// 2. Data Processing & Game Logic
// ============================================================================

async function loadAndParseData(requestUrl) {
    const url = new URL(requestUrl);
    const csvUrl = new URL('/XAUUSD_M15.csv', url.origin).toString();
    console.log(`Fetching data from: ${csvUrl}`);
    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        const csvText = await response.text();
        rawData = parseData(csvText);
        console.log(`Successfully parsed ${rawData.length} data points.`);
    } catch (e) {
        console.error("Failed to fetch or parse CSV data:", e);
        rawData = [];
        throw e;
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
        // Gamification state
        triggeredEvents: new Set(),
        lastAlertedHigh: null,
        lastAlertedLow: null,
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
                if(closedTrade) closedTrades.push({ ...closedTrade, reason: 'SL' });
            } else if (pos.tp && currentBar.high >= pos.tp) {
                const closedTrade = internalCloseOrder(pos.id, pos.tp);
                if(closedTrade) closedTrades.push({ ...closedTrade, reason: 'TP' });
            }
        } else {
            if (pos.sl && currentBar.high >= pos.sl) {
                const closedTrade = internalCloseOrder(pos.id, pos.sl);
                if(closedTrade) closedTrades.push({ ...closedTrade, reason: 'SL' });
            } else if (pos.tp && currentBar.low <= pos.tp) {
                const closedTrade = internalCloseOrder(pos.id, pos.tp);
                if(closedTrade) closedTrades.push({ ...closedTrade, reason: 'TP' });
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

function getPerformanceFeedback(ror, benchmarkType = 'GENERAL') {
    const benchmarks = PERFORMANCE_BENCHMARKS[benchmarkType];
    if (!benchmarks) return null;
    let feedback = benchmarks[0];
    for (const benchmark of benchmarks) {
        if (ror >= benchmark.ror) feedback = benchmark;
        else break;
    }
    return feedback;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
function calculate7DayRange() {
    if (state.gameData.length === 0 || state.currentIndex <= 0) return { high: null, low: null };
    const endTime = state.gameData[state.currentIndex].time;
    const startTime = endTime - SEVEN_DAYS_MS;
    let high = -Infinity, low = Infinity;
    for (let i = state.currentIndex - 1; i >= 0; i--) {
        const bar = state.gameData[i];
        if (bar.time < startTime && i < state.currentIndex - 1) break;
        high = Math.max(high, bar.high);
        low = Math.min(low, bar.low);
    }
    return { high: high === -Infinity ? null : high, low: low === Infinity ? null : low };
}

// ============================================================================
// 4. API Router
// ============================================================================

const router = Router({ base: '/api' });

router
    .post('/start', () => {
        if (rawData.length === 0) return error(500, "Game data is not loaded or failed to load.");
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
        if (state.isEnded || !state.gameData || state.gameData.length === 0) return error(400, "Game is not active or has ended.");

        const events = [];
        advanceSimulation();
        const closedTrades = updatePositions();

        // Check for gamification events
        const currentBar = state.gameData[state.currentIndex];
        const elapsedDays = Math.floor((currentBar.time - state.gameData[0].time) / 86400000) + 1;

        // Financial Events
        const event = FINANCIAL_EVENTS.find(e => e.triggerDay === elapsedDays);
        if (event && !state.triggeredEvents.has(event.title)) {
            events.push({ type: 'FINANCIAL_EVENT', data: event });
            state.triggeredEvents.add(event.title);
        }

        // Market Alerts
        const range = calculate7DayRange();
        if (range && range.high !== null && currentBar.high > range.high && range.high !== state.lastAlertedHigh) {
            events.push({ type: 'MARKET_ALERT', data: { type: 'BREAKOUT', price: range.high } });
            state.lastAlertedHigh = range.high;
        }
        if (range && range.low !== null && currentBar.low < range.low && range.low !== state.lastAlertedLow) {
            events.push({ type: 'MARKET_ALERT', data: { type: 'BREAKDOWN', price: range.low } });
            state.lastAlertedLow = range.low;
        }

        // Check for game end and add performance feedback
        if (state.isEnded) {
            const finalRoR = (state.equity - CONFIG.INITIAL_BALANCE) / CONFIG.INITIAL_BALANCE;
            const feedbackGeneral = getPerformanceFeedback(finalRoR, 'GENERAL');
            const feedbackFund = getPerformanceFeedback(finalRoR, 'FUND');
            events.push({ type: 'PERFORMANCE_FEEDBACK', data: { feedbackGeneral, feedbackFund } });
        }

        return json({
            isEnded: state.isEnded,
            currentIndex: state.currentIndex,
            equity: state.equity,
            floatingPL: state.floatingPL,
            openPositions: state.openPositions,
            newlyClosedTrades: closedTrades,
            events: events,
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
        const closedTrade = internalCloseOrder(id, closePrice);
        if (!closedTrade) return error(404, "Position not found.");
        updateAccount();
        return json({ ...state, lastClosedTrade: closedTrade });
    })
    .delete('/trades', () => {
        if (state.isEnded) return error(400, "Game has ended.");
        const closePrice = getCurrentPrice();
        const closedTrades = [];
        [...state.openPositions].forEach(pos => {
            const closed = internalCloseOrder(pos.id, closePrice);
            if(closed) closedTrades.push(closed);
        });
        updateAccount();
        return json({ ...state, lastClosedTrades: closedTrades });
    })
    .all('*', () => error(404, 'API route not found.'));

// ============================================================================
// 5. Pages Function Entrypoint
// ============================================================================

export const onRequest = async (context) => {
    if (dataLoadingPromise === null) {
        dataLoadingPromise = loadAndParseData(context.request.url);
    }
    try {
        await dataLoadingPromise;
    } catch (e) {
        return error(500, "Failed to load critical game data. Cannot start game.");
    }
    return router.handle(context.request, context.env, context);
};

import { Router, error, json } from 'itty-router';

const CONFIG = { CONTRACT_SIZE: 100, INITIAL_BALANCE: 10000, SIMULATION_DURATION_DAYS: 30 };
const PERFORMANCE_BENCHMARKS = { GENERAL: [ { ror: -Infinity, text: "你目前的模擬績效還有很大的進步空間，繼續學習！" }, { ror: -0.20, text: "模擬剛開始，請謹慎操作，掌握風險管理。" }, { ror: 0.00, text: "保持穩健！你成功在模擬中保護了初始虛擬資金。" }, { ror: 0.02, text: "表現穩健，你正在掌握模擬交易的節奏。" }, { ror: 0.05, text: "技巧提升中！你的模擬績效持續進步。" }, { ror: 0.10, text: "優秀的模擬表現！你展現了良好的交易策略理解。" }, ], FUND: [ { ror: -Infinity, text: "在高波動模擬環境中，風險控制是首要任務。" }, { ror: 0.03, text: "穩定的操作策略，在模擬中逐步積累經驗。" }, { ror: 0.06, text: "展現紀律性，你的模擬策略開始奏效。" }, { ror: 0.11, text: "表現亮眼！你對市場動態有敏銳的觀察力。" }, { ror: 0.16, text: "模擬交易大師！你展現了高水準的策略應用能力。" }, { ror: 0.21, text: "卓越的模擬成果！你的交易技巧已達頂尖水準。" }, ] };
const FINANCIAL_EVENTS = [ { triggerDay: 5, title: '美國非農就業數據 (NFP)', description: '非農數據即將公布，市場預期將出現劇烈波動。請注意風險！' }, { triggerDay: 15, title: '美國 CPI 公布', description: '消費者物價指數 (CPI) 高於預期，可能引發市場對通膨的擔憂。' }, { triggerDay: 25, title: 'FOMC 利率決議', description: '聯準會即將宣布利率決議。市場普遍預期將維持現有利率。' }, ];

let state = {};
let rawData = [];
let dataLoadingPromise = null;

async function loadAndParseData(requestUrl) {
    const url = new URL(requestUrl);
    const csvUrl = new URL('/XAUUSD_M15.csv', url.origin).toString();
    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.status}`);
        const csvText = await response.text();
        rawData = parseData(csvText);
    } catch (e) {
        console.error("Failed to fetch or parse CSV data:", e);
        rawData = [];
        throw e;
    }
}

function parseData(csvText) {
    if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.substring(1);
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    const firstLine = lines.find(line => !/^\s*time|open/i.test(line.trim()));
    if (!firstLine) return [];
    const delimiter = firstLine.includes(',') ? ',' : /\s+/;
    return lines.map(line => {
        if (/^\s*time|open/i.test(line)) return null;
        const values = line.split(delimiter);
        if (values.length < 5) return null;
        const timestamp = new Date(values[0].replace(/[.\/]/g, '-')).getTime();
        const [open, high, low, close] = values.slice(1).map(parseFloat);
        if ([timestamp, open, high, low, close].some(isNaN)) return null;
        return { time: timestamp, open, high, low, close };
    }).filter(Boolean).sort((a, b) => a.time - b.time);
}

function resetState() {
    state = {
        gameData: [], isEnded: false, currentIndex: 0,
        balance: CONFIG.INITIAL_BALANCE, equity: CONFIG.INITIAL_BALANCE,
        floatingPL: 0, openPositions: [], tradeHistory: [],
        orderIdCounter: 1, triggeredEvents: new Set(),
        lastAlertedHigh: null, lastAlertedLow: null,
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

// This function processes the game state from the current index up to a target index.
function processTicksUntil(targetIndex) {
    const events = [];
    const newlyClosedTrades = [];

    while (state.currentIndex < targetIndex && state.currentIndex < state.gameData.length - 1) {
        state.currentIndex++;
        const currentBar = state.gameData[state.currentIndex];

        // Update positions based on the new bar's data
        for (let i = state.openPositions.length - 1; i >= 0; i--) {
            const pos = state.openPositions[i];
            let closePrice = null;
            if (pos.type === 'BUY') {
                if (pos.sl && currentBar.low <= pos.sl) closePrice = pos.sl;
                else if (pos.tp && currentBar.high >= pos.tp) closePrice = pos.tp;
            } else { // SELL
                if (pos.sl && currentBar.high >= pos.sl) closePrice = pos.sl;
                else if (pos.tp && currentBar.low <= pos.tp) closePrice = pos.tp;
            }

            if (closePrice !== null) {
                const profit = (pos.type === 'BUY' ? closePrice - pos.entryPrice : pos.entryPrice - closePrice) * CONFIG.CONTRACT_SIZE * pos.lots;
                state.balance += profit;
                const historyEntry = { ...pos, closePrice, closeTime: currentBar.time, profit };
                state.tradeHistory.push(historyEntry);
                newlyClosedTrades.push(historyEntry);
                state.openPositions.splice(i, 1);
            }
        }

        // Gamification events for the current tick
        const elapsedDays = Math.floor((currentBar.time - state.gameData[0].time) / 86400000) + 1;
        const event = FINANCIAL_EVENTS.find(e => e.triggerDay === elapsedDays);
        if (event && !state.triggeredEvents.has(event.title)) {
            events.push({ type: 'FINANCIAL_EVENT', data: event });
            state.triggeredEvents.add(event.title);
        }
    }

    // Final account update after processing all ticks
    const finalPrice = state.gameData[state.currentIndex].close;
    state.floatingPL = state.openPositions.reduce((sum, pos) => {
        const profit = (pos.type === 'BUY' ? finalPrice - pos.entryPrice : pos.entryPrice - finalPrice) * CONFIG.CONTRACT_SIZE * pos.lots;
        pos.profit = profit; // Update position's profit
        return sum + profit;
    }, 0);
    state.equity = state.balance + state.floatingPL;

    state.isEnded = state.currentIndex >= state.gameData.length - 1;
    if (state.isEnded) {
        const finalRoR = (state.equity - CONFIG.INITIAL_BALANCE) / CONFIG.INITIAL_BALANCE;
        events.push({ type: 'PERFORMANCE_FEEDBACK', data: {
            feedbackGeneral: PERFORMANCE_BENCHMARKS.GENERAL.findLast(b => finalRoR >= b.ror),
            feedbackFund: PERFORMANCE_BENCHMARKS.FUND.findLast(b => finalRoR >= b.ror),
        }});
    }

    return { events, newlyClosedTrades };
}

const router = Router({ base: '/api' });

router
    .post('/start', () => {
        if (rawData.length === 0) return error(500, "Game data not loaded.");
        resetState();
        selectRandomDataSegment();
        return json({
            initialBalance: CONFIG.INITIAL_BALANCE,
            gameData: state.gameData, // Send the whole dataset
        });
    })
    .post('/tick', async request => {
        const { currentIndex } = await request.json();
        if (typeof currentIndex !== 'number' || currentIndex < state.currentIndex) {
            return error(400, 'Invalid currentIndex.');
        }
        if (state.isEnded) return error(400, "Game has already ended.");

        const { events, newlyClosedTrades } = processTicksUntil(currentIndex);

        return json({
            isEnded: state.isEnded,
            equity: state.equity,
            floatingPL: state.floatingPL,
            openPositions: state.openPositions,
            newlyClosedTrades: newlyClosedTrades,
            events: events,
        });
    })
    .post('/trade', async request => {
        const { type, lots, sl, tp, currentIndex } = await request.json();

        if (state.isEnded) return error(400, "Game has ended.");
        if (!['BUY', 'SELL'].includes(type) || isNaN(lots) || lots <= 0) return error(400, "Invalid trade parameters.");
        if (currentIndex !== state.currentIndex) return error(409, "Client and server state mismatch. Please refresh.");

        const entryPrice = state.gameData[currentIndex].close;
        const position = {
            id: state.orderIdCounter++, type, lots, entryPrice,
            entryTime: state.gameData[currentIndex].time,
            sl: sl || null, tp: tp || null, profit: 0
        };
        state.openPositions.push(position);

        // Recalculate current equity after opening the position
        state.floatingPL = state.openPositions.reduce((sum, pos) => sum + pos.profit, 0);
        state.equity = state.balance + state.floatingPL;

        return json({
            equity: state.equity,
            floatingPL: state.floatingPL,
            openPositions: state.openPositions,
        });
    })
    .all('*', () => error(404, 'API route not found.'));

export const onRequest = async (context) => {
    if (dataLoadingPromise === null) {
        dataLoadingPromise = loadAndParseData(context.request.url);
    }
    try {
        await dataLoadingPromise;
    } catch (e) {
        return error(500, "Failed to load critical game data.");
    }
    return router.handle(context.request, context.env, context);
};

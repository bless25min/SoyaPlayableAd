export function getIntegrityToken() {
    // By stringifying a large, non-obvious data structure, we create a simple
    // but effective token. If an attacker modifies the game's behavior (e.g., reward logic),
    // this object is likely to change, invalidating the checksum.
    try {
        return JSON.stringify(PERFORMANCE_BENCHMARKS);
    } catch (e) {
        return '';
    }
}

// This object is moved to the top level of the module so it can be accessed by getIntegrityToken.
const PERFORMANCE_BENCHMARKS = {
    GENERAL: [
        { ror: -Infinity, text: "你目前的模擬績效還有很大的進步空間，繼續學習！", beat: 0 },
        { ror: -0.20, text: "模擬剛開始，請謹慎操作，掌握風險管理。", beat: 0 },
        { ror: 0.00, text: "保持穩健！你成功在模擬中保護了初始虛擬資金。", beat: 0 },
        { ror: 0.02, text: "表現穩健，你正在掌握模擬交易的節奏。", beat: 0 },
        { ror: 0.05, text: "技巧提升中！你的模擬績效持續進步。", beat: 0 },
        { ror: 0.10, text: "優秀的模擬表現！你展現了良好的交易策略理解。", beat: 0 },
    ],
    // 修改：進階評估，強調策略與紀律
    FUND: [
        { ror: -Infinity, text: "在高波動模擬環境中，風險控制是首要任務。", beat: 0 },
        { ror: 0.03, text: "穩定的操作策略，在模擬中逐步積累經驗。", beat: 0 },
        { ror: 0.06, text: "展現紀律性，你的模擬策略開始奏效。", beat: 0 },
        { ror: 0.11, text: "表現亮眼！你對市場動態有敏銳的觀察力。", beat: 0 },
        { ror: 0.16, text: "模擬交易大師！你展現了高水準的策略應用能力。", beat: 0 },
        { ror: 0.21, text: "卓越的模擬成果！你的交易技巧已達頂尖水準。", beat: 0 },
    ]
};

export function runGame() {
    // ============================================================================
    // 專案：交易模擬學習 Playable Ad (Rework V11.0 - Compliance Update)
    // ============================================================================

    // ----------------------------------------------------------------------------
    // 1. 狀態管理與常數 (State Management & Constants)
    // ----------------------------------------------------------------------------

    const CONFIG = {
        DATA_URL: 'XAUUSD_M15.csv',
        TICK_INTERVAL: 500,
        CHART_PADDING: { top: 20, right: 60, bottom: 30, left: 10 },
        CANDLE_WIDTH_DEFAULT: 8,
        CANDLE_SPACING: 3,
        CONTRACT_SIZE: 100,
        INITIAL_BALANCE: 10000,
        SIMULATION_DURATION_DAYS: 30,
        // V11.0: Zoom Constraints (Feature 3)
        MIN_VISIBLE_CANDLES: 10,
        MAX_VISIBLE_CANDLES: 200,
    };

    // 修改：成就係統調整。移除所有金融敏感詞彙、俚語或可能暗示快速致富的描述。
    const ACHIEVEMENTS = {
        FIRST_TRADE: { title: "模擬初體驗", description: "完成了第一筆模擬交易。", icon: "🎓" },
        BIG_WIN: { title: "漂亮的操作", description: "單筆模擬交易獲得顯著虛擬收益。(>$3000)", icon: "🎯" },
        BIG_LOSS: { title: "寶貴的經驗", description: "從大幅虛擬虧損中學習風險管理的重要性。(>$3000)", icon: "💡" },
        WIN_STREAK_3: { title: "連戰連捷", description: "連續三次模擬交易獲得虛擬收益。", icon: "⭐" },
        LOSS_STREAK_3: { title: "需要冷靜", description: "連續三次模擬交易出現虛擬虧損，建議重新審視策略。", icon: "🤔" },
        HOLD_LOSS_7D: { title: "長期觀察", description: "持有處於虛擬虧損狀態的部位超過7天。", icon: "⏳" },
        HOLD_WIN_7D: { title: "趨勢跟隨者", description: "成功持有一個處於虛擬收益狀態的部位超過7天。", icon: "📈" },
        TRADER_10: { title: "積極練習", description: "累積完成了10筆模擬交易。", icon: "🔄" },
        QUICK_DRAW: { title: "短線高手", description: "在1小時內完成一筆有虛擬收益的模擬交易。", icon: "⚡" },
        DOUBLE_UP: { title: "模擬績效卓越", description: "虛擬帳戶淨值達到初始資金的兩倍。(>$20000)", icon: "🏆" },
        MARGIN_CALL: { title: "風險警示", description: "虛擬帳戶淨值曾低於$2000，請注意風險控管。", icon: "⚠️" },
        CONSISTENT: { title: "穩健操作", description: "模擬結束時勝率>60%且至少10筆交易。", icon: "📊" },
        DIAMOND_HANDS_LOSS: { title: "深度回撤觀察", description: "持有單一虛擬虧損部位超過30%仍未平倉。", icon: "👀" },
        AVERAGE_DOWN: { title: "分批進場", description: "對同一方向建立模擬部位3次以上。", icon: "🧱" },
        BAD_DAY: { title: "逆風考驗", description: "單日內執行了三次虛擬虧損的模擬交易。", icon: "🌧️" },
        RUG_PULL: { title: "劇烈波動", description: "模擬帳戶在同日內由虛擬收益轉為虛擬虧損超過 $2000。", icon: "🎢" },
    };

    const state = {
        rawData: [],
        gameData: [],
        isLoading: true,
        isPlaying: false,
        isEnded: false,
        speedMultiplier: 1,
        currentIndex: 0,
        barAnimationProgress: 0,
        balance: CONFIG.INITIAL_BALANCE,
        equity: CONFIG.INITIAL_BALANCE,
        floatingPL: 0,
        openPositions: [],
        tradeHistory: [],
        orderIdCounter: 1,
        chart: {
            canvas: null,
            ctx: null,
            width: 0,
            height: 0,
            viewStartIndex: 0,
            viewEndIndex: 0,
            minPrice: 0,
            maxPrice: 0,
            candleWidth: CONFIG.CANDLE_WIDTH_DEFAULT,
            candleSpacing: CONFIG.CANDLE_SPACING,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            dragStartScroll: 0,
            scrollOffset: 0,
            isCrosshairPinned: false,
            pinnedCrosshairPos: { x: 0, y: 0 },
            // V11.0: New state properties for interactions (Feature 1 & 3)
            draggedLineType: null, // 'SL' or 'TP' (Feature 1)
            pinchStartDistance: 0,
            pinchStartCandleWidth: 0,
            isPinching: false,
        },
        mouse: { x: -1, y: -1, isOverChart: false },
        isMobile: false,
        tutorialActive: false,
        tutorialCompletedOnce: false,
        gameStartTime: null,
        elapsedTime: 0,
        timerIntervalId: null,
        current7DayRange: { high: null, low: null },
        lastAlertedHigh: null,
        lastAlertedLow: null,
        unlockedAchievements: new Set(),
        achievementStats: {
            consecutiveWins: 0,
            consecutiveLosses: 0,
            maxEquity: CONFIG.INITIAL_BALANCE,
            minEquity: CONFIG.INITIAL_BALANCE,
            currentDay: null,
            dailyLossCount: 0,
            dailyMaxPL: 0,
        },
        // 財經事件描述保持中性，符合規範
        financialEvents: [
             { triggerDay: 5, title: '美國非農就業數據 (NFP)', description: '非農數據即將公布，市場預期將出現劇烈波動。請注意風險！' },
            { triggerDay: 15, title: '美國 CPI 公布', description: '消費者物價指數 (CPI) 高於預期，可能引發市場對通膨的擔憂。' },
            { triggerDay: 25, title: 'FOMC 利率決議', description: '聯準會即將宣布利率決議。市場普遍預期將維持現有利率。' },
        ],
        triggeredEvents: new Set(),
        wasPlayingBeforeEvent: false,
    };

    const DOM = {};

    // ----------------------------------------------------------------------------
    // 2. 數據處理 (Data Processing)
    // (Data Processing functions remain the same)
    // ----------------------------------------------------------------------------

    async function loadData() {
        try {
            const response = await fetch(CONFIG.DATA_URL);
            if (!response.ok) {
                throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`);
            }
            const csvText = await response.text();
            processData(csvText);
        } catch (error) {
            console.error("自動載入數據失敗:", error);
            let errorMessage = error.message;
            if (error instanceof TypeError && window.location.protocol === 'file:') {
                errorMessage = "無法從本地檔案系統 (file://) 載入數據。這是瀏覽器的安全限制。";
            }
            promptForFileUpload(errorMessage);
        }
    }

    function promptForFileUpload(errorMessage) {
        document.getElementById('loader-status').classList.add('hidden');
        document.getElementById('fileUploadFallback').classList.remove('hidden');
        if (errorMessage) {
            document.getElementById('loader-error-message').textContent = errorMessage;
        }

        const fileInput = document.getElementById('csvFileInput');
        if (fileInput.dataset.listenerAttached) return;
        fileInput.dataset.listenerAttached = true;

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const csvText = e.target.result;
                    document.getElementById('fileUploadFallback').classList.add('hidden');
                    document.getElementById('loader-status').classList.remove('hidden');
                    processData(csvText);
                };
                reader.readAsText(file, 'UTF-8');
            }
        });
    }

    function processData(csvText) {
        try {
            state.rawData = parseData(csvText);
            if (state.rawData.length === 0) {
                throw new Error("無法解析數據或數據為空。請檢查 CSV 檔案格式、內容和編碼。");
            }
            startGame();
        } catch (error) {
            console.error("處理數據失敗:", error);
            promptForFileUpload(error.message);
        }
    }

    function parseData(csvText) {
        // Handle BOM (Byte Order Mark) if present
        if (csvText.charCodeAt(0) === 0xFEFF) {
            csvText = csvText.substring(1);
        }

        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        // Find the first actual data line (skipping headers)
        const firstLine = lines.find(line => {
            const lowerLine = line.trim().toLowerCase();
            return lowerLine !== '' && !lowerLine.includes('time') && !lowerLine.includes('open');
        });

        if (!firstLine) return [];

        // Determine delimiter (Auto-detect comma, tab, space, or semicolon)
        let delimiter = ',';
        if (firstLine.includes('\t') || (firstLine.includes(' ') && !firstLine.includes(','))) {
            delimiter = /\s+/; // Handles tabs and multiple spaces
        } else if (firstLine.includes(';')) {
            delimiter = ';';
        }

        const testParts = firstLine.split(delimiter);
        if (testParts.length < 5) return [];

        // Determine time format (Timestamp, Date+Time separate, DateTime combined)
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
                    if (timestamp < 10000000000) timestamp *= 1000; // Convert seconds to ms if needed
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
            } catch (error) {
                // Ignore parsing errors for individual lines
            }
        }
        return parsedData.sort((a, b) => a.time - b.time);
    }

    // ----------------------------------------------------------------------------
    // 3. 遊戲初始化與流程控制 (Game Initialization & Flow Control)
    // ----------------------------------------------------------------------------

    function init() {
        // V9.0: Determine mobile based on screen width (900px breakpoint)
        state.isMobile = window.innerWidth <= 900 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        cacheDOMElements();
        setupEventListeners();
        initChart();
        loadData();
    }

    function cacheDOMElements() {
        // V9.0: Updated DOM caching for new layout
        Object.assign(DOM, {
            hudDate: document.getElementById('hud-date'),
            hudEquity: document.getElementById('hud-equity'),
            hudPL: document.getElementById('hud-pl'),
            hudProgress: document.getElementById('hud-progress'),
            hudTimer: document.getElementById('hud-timer'),
            btnPlayPause: document.getElementById('btnPlayPause'),
            btnStepForward: document.getElementById('btnStepForward'),
            speedSelector: document.getElementById('speedSelector'),
            chartWrap: document.getElementById('chartWrap'),
            chartCanvas: document.getElementById('chartCanvas'),
            chartOverlay: document.getElementById('chartOverlay'),
            chartControls: document.getElementById('chartControls'),
            // V9.0: New elements
            bottomNavBar: document.getElementById('bottomNavBar'),
            positionsCountNav: document.getElementById('positionsCountNav'),
            btnToggleControls: document.getElementById('btnToggleControls'),
        });
        Object.assign(DOM, {
            inputLots: document.getElementById('inputLots'),
            inputSL: document.getElementById('inputSL'),
            inputTP: document.getElementById('inputTP'),
            estimateSL: document.getElementById('estimateSL'),
            estimateTP: document.getElementById('estimateTP'),
            positionsList: document.getElementById('positionsList'),
            historyList: document.getElementById('historyList'),
            // V9.0: Keep positionsCount (used inside the Positions/History tab)
            positionsCount: document.getElementById('positionsCount'),
            btnCloseAllGlobal: document.getElementById('btnCloseAllGlobal'),
            emptyPositions: document.getElementById('emptyPositions'),
            emptyHistory: document.getElementById('emptyHistory'),
        });
        Object.assign(DOM, {
            loader: document.getElementById('loader'),
            eventModal: document.getElementById('eventModal'),
            endGameModal: document.getElementById('endGameModal'),
            tutorialHighlight: document.getElementById('tutorialHighlight'),
            tutorialMessage: document.getElementById('tutorialMessage'),
            tutorialText: document.getElementById('tutorialText'),
            tutorialNextBtn: document.getElementById('tutorialNextBtn'),
            notificationContainer: document.getElementById('notification-container'),
        });
    }

    function startGame() {
        if (state.rawData.length === 0) return;
        DOM.endGameModal.classList.remove('active');
        resetState();
        selectRandomDataSegment();
        if (state.gameData.length === 0) return;

        const initialVisibleCandles = calculateVisibleCandles();
        // Start with some history visible
        state.currentIndex = Math.min(Math.floor(initialVisibleCandles * 0.8), state.gameData.length - 1);

        updateDailyStats();
        state.current7DayRange = calculate7DayRange();
        state.isLoading = false;
        DOM.loader.classList.add('hidden');

        startTimer();
        updateUI();
        requestAnimationFrame(draw);

        if (!state.tutorialCompletedOnce) {
            startTutorial();
        }
    }

    function resetState() {
        if (state.timerIntervalId) {
            clearInterval(state.timerIntervalId);
            state.timerIntervalId = null;
        }
        state.balance = CONFIG.INITIAL_BALANCE;
        state.equity = CONFIG.INITIAL_BALANCE;
        state.floatingPL = 0;
        state.openPositions = [];
        state.tradeHistory = [];
        state.orderIdCounter = 1;
        state.isPlaying = false;
        state.isEnded = false;
        state.currentIndex = 0;
        state.barAnimationProgress = 0;
        state.triggeredEvents.clear();
        state.chart.candleWidth = CONFIG.CANDLE_WIDTH_DEFAULT;
        state.chart.candleSpacing = CONFIG.CANDLE_SPACING;
        state.chart.scrollOffset = 0;
        state.chart.isCrosshairPinned = false;
        // V11.0: Reset interaction states
        state.chart.isDragging = false;
        state.chart.isPinching = false;
        state.chart.draggedLineType = null;

        DOM.chartOverlay.innerHTML = '';

        // Clear lists correctly while retaining empty state elements
        DOM.positionsList.querySelectorAll('.trade-item').forEach(item => item.remove());
        DOM.historyList.querySelectorAll('.trade-item').forEach(item => item.remove());

        DOM.inputLots.value = "0.10";
        DOM.inputSL.value = "";
        DOM.inputTP.value = "";

        state.gameStartTime = null;
        state.elapsedTime = 0;
        DOM.hudTimer.textContent = "00:00";

        state.current7DayRange = { high: null, low: null };
        state.lastAlertedHigh = null;
        state.lastAlertedLow = null;

        // V9.0 (R3): Ensure controls are collapsed on restart
        if (!DOM.chartControls.classList.contains('controls-collapsed')) {
            DOM.chartControls.classList.add('controls-collapsed');
            DOM.btnToggleControls.textContent = '展開設定';
        }

        state.unlockedAchievements.clear();
        state.achievementStats = {
            consecutiveWins: 0,
            consecutiveLosses: 0,
            maxEquity: CONFIG.INITIAL_BALANCE,
            minEquity: CONFIG.INITIAL_BALANCE,
            currentDay: null,
            dailyLossCount: 0,
            dailyMaxPL: 0,
        };
    }

    function selectRandomDataSegment() {
        const totalDurationMs = CONFIG.SIMULATION_DURATION_DAYS * 24 * 60 * 60 * 1000;
        if (state.rawData.length === 0) return;
        const dataDuration = state.rawData[state.rawData.length - 1].time - state.rawData[0].time;
        if (dataDuration < totalDurationMs) {
            console.warn("Data duration is less than simulation duration. Using all available data.");
            state.gameData = [...state.rawData];
            return;
        }
        const latestStartTime = state.rawData[state.rawData.length - 1].time - totalDurationMs;
        const earliestStartTime = state.rawData[0].time;
        const randomStartTime = earliestStartTime + Math.random() * (latestStartTime - earliestStartTime);
        let startIndex = state.rawData.findIndex(d => d.time >= randomStartTime);
        if (startIndex === -1) startIndex = 0;
        const startTime = state.rawData[startIndex].time;
        const endTime = startTime + totalDurationMs;
        state.gameData = state.rawData.filter(d => d.time >= startTime && d.time <= endTime);
    }

    let lastTickTime = 0;
    let animationFrameId;

    function gameLoop(timestamp) {
        if (!state.isPlaying || state.isEnded) {
            cancelAnimationFrame(animationFrameId);
            return;
        }
        const effectiveInterval = CONFIG.TICK_INTERVAL / state.speedMultiplier;
        if (lastTickTime === 0) lastTickTime = timestamp;
        const deltaTime = timestamp - lastTickTime;

         // Ensure deltaTime is positive before proceeding
         if (deltaTime > 0) {
             const progressIncrement = deltaTime / effectiveInterval;
             state.barAnimationProgress = Math.min(1, state.barAnimationProgress + progressIncrement);

             // Update systems based on the current (animating) bar
             updateDailyStats();
             updatePositions();
             check7DayBreakout();
             updateAccount();
             updateUI();
             checkDurationAchievements();
             checkDrawdownAchievement();

             if (state.barAnimationProgress >= 1) {
                finalizeCurrentBar();
                if (!advanceSimulation()) {
                    endGame();
                    return;
                }
                state.barAnimationProgress = 0;
                checkForEvents();
                // Auto-scroll if the chart was already at the latest data
                if (state.chart.scrollOffset > 0) {
                    state.chart.scrollOffset++;
                }
             }
             lastTickTime = timestamp;
        }
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function finalizeCurrentBar() {
        // Ensure the bar is fully drawn before moving to the next index
        state.barAnimationProgress = 1;
        updatePositions();
        updateAccount();
    }

    function advanceSimulation() {
        if (state.currentIndex < state.gameData.length - 1) {
            state.currentIndex++;
            updateDailyStats(); // Update stats for the new day
            state.current7DayRange = calculate7DayRange();
            return true;
        }
        return false;
    }

    function endGame() {
        if (state.isEnded) return;
        state.isPlaying = false;
        state.isEnded = true;
        cancelAnimationFrame(animationFrameId);
        stopTimer();

        // Close all remaining positions at the final price
        if (state.gameData.length > 0) {
            let closeIndex = state.currentIndex;
            if (closeIndex >= state.gameData.length) {
                closeIndex = state.gameData.length - 1;
            }
            const closePrice = state.gameData[closeIndex].close;
            while(state.openPositions.length > 0) {
                // Skip final achievement check during forced closure at game end
                closeOrder(state.openPositions[0].id, closePrice, false);
            }
        }
        checkFinalAchievements();
        updateAccount();
        updateUI();
        showEndGameModal();
    }

    function startTimer() {
        state.gameStartTime = Date.now();
        if (state.timerIntervalId) clearInterval(state.timerIntervalId);
        state.timerIntervalId = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        if (state.gameStartTime && !state.isEnded) {
            state.elapsedTime = Math.floor((Date.now() - state.gameStartTime) / 1000);
            const minutes = Math.floor(state.elapsedTime / 60);
            const seconds = state.elapsedTime % 60;
            DOM.hudTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    function stopTimer() {
        if (state.timerIntervalId) {
            clearInterval(state.timerIntervalId);
            state.timerIntervalId = null;
        }
    }

    // ... (the rest of the functions from the original file)

    function formatDuration(ms) {
        if (ms < 0) ms = 0;
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}天 ${hours % 24}小時`;
        if (hours > 0) return `${hours}小時 ${minutes % 60}分鐘`;
        if (minutes === 0) return `${Math.floor(ms / 1000)}秒`;
        return `${minutes}分鐘`;
    }

    // The game is now initialized by the security loader, which will add this listener.
    document.addEventListener('DOMContentLoaded', init);
}

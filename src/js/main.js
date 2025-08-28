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
        
        // 修改：績效回饋文字調整。移除與真實投資人的比較，改為強調學習與技巧提升。
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

        // ----------------------------------------------------------------------------
        // 4. 圖表繪製與渲染 (Chart Drawing & Rendering)
        // ----------------------------------------------------------------------------
        
        function initChart() {
            state.chart.canvas = DOM.chartCanvas;
            state.chart.ctx = state.chart.canvas.getContext('2d');
            resizeCanvas();
        }

        function resizeCanvas() {
            // V9.0: Update mobile detection on resize (using 900px breakpoint)
            const newIsMobile = window.innerWidth <= 900 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            if (newIsMobile !== state.isMobile) {
                state.isMobile = newIsMobile;
                // If the mobile state changed, we might need to refresh tutorial positioning if active
                if (state.tutorialActive) {
                    setTimeout(showTutorialStep, 50);
                }
            }

            const dpr = window.devicePixelRatio || 1;
            const rect = DOM.chartWrap.getBoundingClientRect();
            // Ensure dimensions are at least 1px
            const width = Math.max(1, Math.floor(rect.width));
            const height = Math.max(1, Math.floor(rect.height));

            if (state.chart.width !== width || state.chart.height !== height) {
                state.chart.canvas.width = width * dpr;
                state.chart.canvas.height = height * dpr;
                state.chart.canvas.style.width = `${width}px`;
                state.chart.canvas.style.height = `${height}px`;
                state.chart.ctx.scale(dpr, dpr);
                state.chart.width = width;
                state.chart.height = height;
                validateScrollOffset();
            }
            if (!state.isLoading) {
                draw();
            }
        }

        function draw() {
            if (state.isLoading || state.gameData.length === 0) return;
            const ctx = state.chart.ctx;
            ctx.clearRect(0, 0, state.chart.width, state.chart.height);
            calculateViewport();
            drawBackground(ctx);
            drawGrid(ctx);
            drawCandles(ctx);
            // V11.0: Draw SL/TP setup lines (Feature 1)
            drawOrderSetupLines(ctx);
            drawYAxis(ctx);
            drawXAxis(ctx);
            drawCrosshair(ctx);
            drawTradeAnimations(ctx);
            drawChartAlertAnimations(ctx);
            updatePositionOverlays();
        }

        // V11.0: New function to draw interactive SL/TP lines (Feature 1)
        function drawOrderSetupLines(ctx) {
            // Ensure inputs are available (e.g. during initialization)
            if (!DOM.inputSL || !DOM.inputTP || !DOM.inputLots) return;

            const slPrice = parseFloat(DOM.inputSL.value);
            const tpPrice = parseFloat(DOM.inputTP.value);
            const lots = parseFloat(DOM.inputLots.value);

            if (!isNaN(slPrice) && slPrice > 0) {
                drawSetupLine(ctx, slPrice, 'SL', lots);
            }
            if (!isNaN(tpPrice) && tpPrice > 0) {
                drawSetupLine(ctx, tpPrice, 'TP', lots);
            }
        }

        // V11.0: Helper function for drawing individual setup lines (Feature 1)
        function drawSetupLine(ctx, price, type, lots) {
            const y = priceToY(price);
            const { left, right, top, bottom } = CONFIG.CHART_PADDING;
            const { width, height } = state.chart;

            // Don't draw if outside the visible area
            if (y < top || y > height - bottom) return;

            const color = type === 'SL' ? getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim() : getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim();
            
            // Draw the line
            ctx.strokeStyle = color;
            // V11.0: Enhance visibility if dragging
            ctx.lineWidth = state.chart.draggedLineType === type ? 2.5 : 1.5;
            // Make it slightly dashed for distinction from existing position lines
            ctx.setLineDash([10, 5]); 
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(width - right, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Calculate and draw estimated P/L label
            const currentPrice = getCurrentPrice();
            let estimatedPL = 0;
            if (!isNaN(lots) && lots > 0 && currentPrice > 0) {
                // P/L is calculated as the absolute difference between current price and target price
                estimatedPL = Math.abs(currentPrice - price) * CONFIG.CONTRACT_SIZE * lots;
            }

            const labelText = `${type}: ${type === 'SL' ? '-' : '+'}$${estimatedPL.toFixed(2)}`;
            const padding = 5;
            
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';

            const textMetrics = ctx.measureText(labelText);
            const labelWidth = textMetrics.width + padding * 2;
            const labelHeight = 20;

            // Position label just above the line, starting from the left padding edge
            ctx.fillStyle = color;
            // Add a slight background opacity for better readability
            ctx.globalAlpha = 0.85; 
            ctx.fillRect(left, y - labelHeight, labelWidth, labelHeight);
            ctx.globalAlpha = 1.0;

            ctx.fillStyle = 'white';
            // Adjust vertical alignment within the box
            ctx.fillText(labelText, left + padding, y - (labelHeight - 16) / 2 );
        }


        function calculateVisibleCandles() {
            const { width, candleWidth, candleSpacing } = state.chart;
            const { left, right } = CONFIG.CHART_PADDING;
            const chartAreaWidth = width - left - right;
            const candleUnitWidth = candleWidth + candleSpacing;
            if (candleUnitWidth <= 0) return 100; // Fallback
            return Math.max(1, Math.floor(chartAreaWidth / candleUnitWidth));
        }

        function calculateViewport() {
            const visibleCandles = calculateVisibleCandles();
            
            // Calculate start and end indices based on scroll offset
            let endIndex = state.currentIndex + 1 - state.chart.scrollOffset;
            let startIndex = endIndex - visibleCandles;

            // Constrain the viewport to the available data
            if (endIndex > state.currentIndex + 1) {
                endIndex = state.currentIndex + 1;
                startIndex = Math.max(0, endIndex - visibleCandles);
            }
            if (startIndex < 0) {
                startIndex = 0;
                endIndex = Math.min(state.currentIndex + 1, startIndex + visibleCandles);
            }
            state.chart.viewStartIndex = startIndex;
            state.chart.viewEndIndex = endIndex;

            // Calculate price range (Y-axis)
            let minPrice = Infinity;
            let maxPrice = -Infinity;
            for (let i = startIndex; i < endIndex; i++) {
                if (i >= state.gameData.length || i < 0) continue; 
                const bar = state.gameData[i];
                
                // Include the animation progress for the current bar if visible and not scrolled
                if (i === state.currentIndex && state.chart.scrollOffset === 0) {
                    const animatedBar = getAnimatedBar(bar);
                    minPrice = Math.min(minPrice, animatedBar.low);
                    maxPrice = Math.max(maxPrice, animatedBar.high);
                } else {
                    minPrice = Math.min(minPrice, bar.low);
                    maxPrice = Math.max(maxPrice, bar.high);
                }
            }
            
            // Handle edge cases where price range is zero or invalid
            const priceRange = maxPrice - minPrice;
            if (priceRange <= 0 || !isFinite(priceRange)) {
                const centerPrice = (minPrice === Infinity) ? (state.gameData[0]?.close || 1900) : minPrice;
                const padding = centerPrice * 0.001; // Small padding based on price magnitude
                state.chart.minPrice = centerPrice - padding;
                state.chart.maxPrice = centerPrice + padding;
            } else {
                const padding = priceRange * 0.1; // 10% padding top and bottom
                state.chart.minPrice = minPrice - padding;
                state.chart.maxPrice = maxPrice + padding;
            }
        }

        function priceToY(price) {
            const { height, minPrice, maxPrice } = state.chart;
            const { top, bottom } = CONFIG.CHART_PADDING;
            const chartAreaHeight = height - top - bottom;
            const priceRange = maxPrice - minPrice;
            if (chartAreaHeight <= 0 || priceRange <= 0) return top + chartAreaHeight / 2;
            const y = top + chartAreaHeight * (1 - (price - minPrice) / priceRange);
            return Math.max(top, Math.min(height - bottom, y));
        }

        function yToPrice(y) {
            const { height, minPrice, maxPrice } = state.chart;
            const { top, bottom } = CONFIG.CHART_PADDING;
            const chartAreaHeight = height - top - bottom;
            const priceRange = maxPrice - minPrice;
            if (chartAreaHeight <= 0) return (minPrice + maxPrice) / 2;
            // V11.0: Constrain Y to the chart area boundaries before calculation (Feature 1)
            const constrainedY = Math.max(top, Math.min(height - bottom, y));
            const price = minPrice + priceRange * (1 - (constrainedY - top) / chartAreaHeight);
            return price;
        }

        function indexToX(index) {
            const { viewStartIndex, candleWidth, candleSpacing } = state.chart;
            const { left } = CONFIG.CHART_PADDING;
            const candleUnitWidth = candleWidth + candleSpacing;
            return left + (index - viewStartIndex) * candleUnitWidth + candleWidth / 2;
        }

        function drawBackground(ctx) {
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--chart-bg').trim();
            ctx.fillRect(0, 0, state.chart.width, state.chart.height);
        }

        function drawGrid(ctx) {
            const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim();
            const dateSeparatorColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-date-separator').trim();
            const { left, right, top, bottom } = CONFIG.CHART_PADDING;

            // Horizontal grid lines (Y-axis ticks)
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            const yTicks = calculateYAxisTicks();
            yTicks.forEach(tick => {
                const y = priceToY(tick.price);
                ctx.beginPath();
                ctx.moveTo(left, y);
                ctx.lineTo(state.chart.width - right, y);
                ctx.stroke();
            });

            // Vertical grid lines (X-axis ticks)
            const xTicks = calculateXAxisTicks();
            xTicks.forEach(tick => {
                const x = indexToX(tick.index);
                if (x >= left && x <= state.chart.width - right) {
                    if (tick.isDateSeparator) {
                        ctx.strokeStyle = dateSeparatorColor;
                        ctx.lineWidth = 1.5;
                    } else {
                        ctx.strokeStyle = gridColor;
                        ctx.lineWidth = 1;
                    }
                    ctx.beginPath();
                    ctx.moveTo(x, top);
                    ctx.lineTo(x, state.chart.height - bottom);
                    ctx.stroke();
                }
            });
            ctx.lineWidth = 1;
        }

        function getAnimatedBar(bar) {
            const progress = state.barAnimationProgress;
            const open = bar.open;
            
            // Simulate wick formation (faster) then body fill
            const wickProgress = Math.min(1, progress * 2); 
            const high = open + (bar.high - open) * wickProgress;
            const low = open + (bar.low - open) * wickProgress;
            
            const close = open + (bar.close - open) * progress;
            
            // Ensure high/low encompass the current close price
            const finalHigh = Math.max(high, close, open);
            const finalLow = Math.min(low, close, open);
            
            return { open, high: finalHigh, low: finalLow, close };
        }

        function drawCandles(ctx) {
            const { viewStartIndex, viewEndIndex, candleWidth } = state.chart;
            const colorBull = getComputedStyle(document.documentElement).getPropertyValue('--color-bull').trim();
            const colorBear = getComputedStyle(document.documentElement).getPropertyValue('--color-bear').trim();

            for (let i = viewStartIndex; i < viewEndIndex; i++) {
                 if (i >= state.gameData.length || i < 0) continue;
                const bar = state.gameData[i];
                let displayBar = bar;
                
                // Apply animation to the current bar if at the edge
                if (i === state.currentIndex && state.chart.scrollOffset === 0) {
                    displayBar = getAnimatedBar(bar);
                }
                
                const x = indexToX(i);
                const openY = priceToY(displayBar.open);
                const highY = priceToY(displayBar.high);
                const lowY = priceToY(displayBar.low);
                const closeY = priceToY(displayBar.close);
                
                const color = displayBar.close >= displayBar.open ? colorBull : colorBear;
                ctx.strokeStyle = color;
                ctx.fillStyle = color;
                ctx.lineWidth = 1;
                
                // Draw wick
                ctx.beginPath();
                ctx.moveTo(x, highY);
                ctx.lineTo(x, lowY);
                ctx.stroke();
                
                // Draw body
                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.abs(openY - closeY);
                const finalHeight = Math.max(1, bodyHeight); // Ensure at least 1px height
                const finalWidth = Math.max(1, candleWidth);
                ctx.fillRect(x - finalWidth / 2, bodyTop, finalWidth, finalHeight);
            }
        }

        function calculateYAxisTicks() {
            const { minPrice, maxPrice, height } = state.chart;
            const priceRange = maxPrice - minPrice;
            if (priceRange <= 0) return [];
            
            // Determine appropriate tick spacing
            const targetCount = Math.max(2, Math.floor(height / 50)); // Aim for ticks every 50px
            const rawSpacing = priceRange / targetCount;
            
            // Calculate a "nice" spacing (e.g., 0.1, 0.2, 0.5, 1, 2, 5, 10...)
            const magnitude = Math.pow(10, Math.floor(Math.log10(rawSpacing)));
            const normalizedSpacing = rawSpacing / magnitude;
            
            let tickSpacing;
            if (normalizedSpacing > 5) tickSpacing = 10 * magnitude;
            else if (normalizedSpacing > 2) tickSpacing = 5 * magnitude;
            else if (normalizedSpacing > 1) tickSpacing = 2 * magnitude;
            else tickSpacing = magnitude;
            
            const ticks = [];
            let currentTick = Math.ceil(minPrice / tickSpacing) * tickSpacing;
            while (currentTick <= maxPrice) {
                if (isFinite(currentTick)) ticks.push({ price: currentTick });
                currentTick += tickSpacing;
                if (tickSpacing === 0) break; // Prevent infinite loop if spacing is 0
            }
            return ticks;
        }

        function drawYAxis(ctx) {
            const { width, height } = state.chart;
            const { right } = CONFIG.CHART_PADDING;
            const axisX = width - right;
            
            // Background for the axis area
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--chart-bg').trim();
            ctx.fillRect(axisX, 0, right, height);
            
            // Axis line
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim();
            ctx.beginPath();
            ctx.moveTo(axisX, 0);
            ctx.lineTo(axisX, height);
            ctx.stroke();
            
            // Ticks labels
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim();
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const ticks = calculateYAxisTicks();
            ticks.forEach(tick => {
                const y = priceToY(tick.price);
                ctx.fillText(tick.price.toFixed(2), axisX + 5, y);
            });
            
            // Current price indicator (only when not using crosshair and at the latest data)
            // V11.0: Added check for !state.chart.draggedLineType
            const isCrosshairActive = (state.mouse.isOverChart || state.chart.isCrosshairPinned) && !state.chart.isDragging && !state.chart.draggedLineType;
            if (state.currentIndex < state.gameData.length && state.chart.scrollOffset === 0 && !isCrosshairActive) {
                const currentPrice = getCurrentPrice();
                const currentY = priceToY(currentPrice);
                const color = currentPrice >= state.gameData[state.currentIndex].open 
                    ? getComputedStyle(document.documentElement).getPropertyValue('--color-bull').trim()
                    : getComputedStyle(document.documentElement).getPropertyValue('--color-bear').trim();
                
                ctx.fillStyle = color;
                ctx.fillRect(axisX + 1, currentY - 10, right - 1, 20);
                ctx.fillStyle = 'white';
                ctx.fillText(currentPrice.toFixed(2), axisX + 5, currentY);
            }
        }

        function calculateXAxisTicks() {
            const { viewStartIndex, viewEndIndex, width } = state.chart;
            if (viewEndIndex <= viewStartIndex || viewStartIndex >= state.gameData.length) return [];
            
            const targetCount = Math.max(2, Math.floor(width / 100)); // Aim for ticks every 100px
            const visibleCandles = viewEndIndex - viewStartIndex;
            const interval = Math.max(1, Math.round(visibleCandles / targetCount));
            
            const ticks = [];
            let lastDateStr = null;
            
            for (let i = viewStartIndex; i < viewEndIndex; i++) {
                if (i < 0 || i >= state.gameData.length) continue;
                const time = state.gameData[i].time;
                const currentDate = new Date(time);
                const currentDateStr = currentDate.toDateString(); 
                
                let isDateSeparator = false;
                if (lastDateStr !== null && currentDateStr !== lastDateStr) {
                    isDateSeparator = true;
                }
                lastDateStr = currentDateStr;
                
                if (isDateSeparator || (i - viewStartIndex) % interval === 0) {
                     // Prevent duplicate ticks
                     if (!ticks.some(t => t.index === i)) {
                        ticks.push({ index: i, time: time, isDateSeparator: isDateSeparator });
                     }
                }
            }
            return ticks;
        }

        function drawXAxis(ctx) {
            const { width, height } = state.chart;
            const { bottom, right, left } = CONFIG.CHART_PADDING;
            const axisY = height - bottom;
            
            // Background for the axis area
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--chart-bg').trim();
            ctx.fillRect(0, axisY, width, bottom);
            
            // Axis line
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim();
            ctx.beginPath();
            ctx.moveTo(0, axisY);
            ctx.lineTo(width - right, axisY);
            ctx.stroke();
            
            // Ticks labels
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            const ticks = calculateXAxisTicks();
            
            // Determine time difference to decide label format
            let timeDiff = 0;
            if (state.chart.viewEndIndex > state.chart.viewStartIndex && state.gameData.length > 0) {
                const startIndex = Math.max(0, state.chart.viewStartIndex);
                const endIndex = Math.min(state.gameData.length - 1, state.chart.viewEndIndex - 1);
                if (endIndex >= startIndex) {
                    timeDiff = state.gameData[endIndex].time - state.gameData[startIndex].time;
                }
            }
            
            ticks.forEach(tick => {
                const x = indexToX(tick.index);
                if (x >= left && x <= width - right) {
                    const date = new Date(tick.time);
                    let label;
                    if (tick.isDateSeparator) {
                         label = date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
                         ctx.font = 'bold 12px sans-serif'; 
                    } else {
                        ctx.font = '12px sans-serif';
                        // Show time if duration is short, otherwise show date
                        if (timeDiff < 48 * 3600 * 1000) { // Less than 2 days
                            label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        } else {
                            label = date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
                        }
                    }
                    ctx.fillText(label, x, axisY + 5);
                }
            });
        }

        function drawCrosshair(ctx) {
            // V11.0: If dragging the chart (panning), don't show crosshair. (Feature 1)
            if (state.chart.isDragging && state.chart.draggedLineType === null) return;
            
            let x, y;
            if (state.chart.isCrosshairPinned) {
                x = state.chart.pinnedCrosshairPos.x;
                y = state.chart.pinnedCrosshairPos.y;
            } else if (state.mouse.isOverChart) {
                x = state.mouse.x;
                y = state.mouse.y;
            } else {
                return;
            }
            
            const { left, right, top, bottom } = CONFIG.CHART_PADDING;
            const { width, height } = state.chart;
            
            // Constrain crosshair to the chart area
            if (x < left || x > width - right || y < top || y > height - bottom) return;
            
            // V11.0: If dragging a line, only show the horizontal component (Feature 1)
            const showVertical = state.chart.draggedLineType === null;

            const crosshairColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-crosshair').trim();
            ctx.strokeStyle = crosshairColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            
            // Horizontal line
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(width - right, y);
            ctx.stroke();
            
            // Vertical line
            if (showVertical) {
                ctx.beginPath();
                ctx.moveTo(x, top);
                ctx.lineTo(x, height - bottom);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
            
            // Price label on Y-axis
            const crosshairPrice = yToPrice(y);
            const axisX = width - right;
            ctx.fillStyle = crosshairColor;
            ctx.fillRect(axisX + 1, y - 10, right - 1, 20);
            ctx.fillStyle = 'white'; 
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(crosshairPrice.toFixed(2), axisX + 5, y);
        }

        function updatePositionOverlays() {
            const overlay = DOM.chartOverlay;
            const linesToKeep = new Set();
            
            state.openPositions.forEach(pos => {
                const entryId = `line-entry-${pos.id}`;
                const slId = `line-sl-${pos.id}`;
                const tpId = `line-tp-${pos.id}`;
                
                const entryColor = pos.type === 'BUY' ? 'var(--color-bull)' : 'var(--color-bear)';
                
                // Entry Price Line
                createOrUpdatePositionLine(overlay, entryId, pos.entryPrice, entryColor, `進場價 ${pos.entryPrice.toFixed(2)}`, pos);
                linesToKeep.add(entryId);
                
                // SL Line
                if (pos.sl) {
                    const potentialPL = calculateProfit(pos, pos.sl);
                    createOrUpdatePositionLine(overlay, slId, pos.sl, 'var(--color-danger)', `停損 ${pos.sl.toFixed(2)}`, null, potentialPL);
                    linesToKeep.add(slId);
                }
                
                // TP Line
                if (pos.tp) {
                    const potentialPL = calculateProfit(pos, pos.tp);
                    createOrUpdatePositionLine(overlay, tpId, pos.tp, 'var(--color-success)', `停利 ${pos.tp.toFixed(2)}`, null, potentialPL);
                    linesToKeep.add(tpId);
                }
            });
            
            // Remove lines for closed positions
            Array.from(overlay.children).forEach(child => {
                if (child.classList.contains('position-line') && !linesToKeep.has(child.id)) {
                    overlay.removeChild(child);
                }
            });
        }

        function createOrUpdatePositionLine(container, id, price, color, labelText, position = null, potentialPL = null) {
            let line = document.getElementById(id);
            if (!line) {
                line = document.createElement('div');
                line.id = id;
                line.className = 'position-line';
                const label = document.createElement('div');
                label.className = 'position-label';
                line.appendChild(label);
                const plDisplay = document.createElement('div');
                plDisplay.className = 'position-pl';
                line.appendChild(plDisplay);
                const dash = document.createElement('div');
                dash.className = 'position-line-dash';
                line.appendChild(dash);
                container.appendChild(line);
            }
            
            const y = priceToY(price);
            
            // Hide if outside the visible chart area
            if (y < CONFIG.CHART_PADDING.top || y > state.chart.height - CONFIG.CHART_PADDING.bottom) {
                line.style.opacity = 0;
            } else {
                line.style.opacity = 1;
                line.style.top = `${y - 10}px`; // Center vertically
            }
            
            line.style.width = `calc(100% - ${CONFIG.CHART_PADDING.right}px)`;
            
            const dash = line.querySelector('.position-line-dash');
            dash.style.borderTopColor = color;
            
            const label = line.querySelector('.position-label');
            label.style.backgroundColor = color;
            label.textContent = labelText;
            
            const plDisplay = line.querySelector('.position-pl');
            let displayValue = null;
            if (position) {
                displayValue = position.profit;
            } else if (potentialPL !== null) {
                displayValue = potentialPL;
            }
            
            if (displayValue !== null) {
                plDisplay.textContent = `$${displayValue.toFixed(2)}`;
                plDisplay.style.color = displayValue >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
                plDisplay.style.display = 'block';
            } else {
                plDisplay.style.display = 'none';
            }
        }

        const tradeAnimations = [];
        const chartAlertAnimations = [];

        function addTradeAnimation(type, price, index, profit = 0) {
            tradeAnimations.push({ type, price, index, profit, startTime: performance.now(), duration: type === 'CLOSE' ? 1500 : 800 });
            if (!state.isPlaying) requestAnimationFrame(draw);
        }

        function addChartAlertAnimation(type, price, index) {
            chartAlertAnimations.push({ type, price, index, startTime: performance.now(), duration: 2500 });
            if (!state.isPlaying) requestAnimationFrame(draw);
        }
        
        // V10.1: Updated animation drawing for centered display and smaller size
        function drawChartAlertAnimations(ctx) {
            const now = performance.now();
            let animationsRunning = false;
            // V10.1: Use all paddings and dimensions for accurate positioning
            const { left, right, top, bottom } = CONFIG.CHART_PADDING;
            const { width, height } = state.chart;

            for (let i = chartAlertAnimations.length - 1; i >= 0; i--) {
                const anim = chartAlertAnimations[i];
                const elapsed = now - anim.startTime;
                const progress = Math.min(1, elapsed / anim.duration);
                // Slightly faster fade out
                const opacity = progress < 0.7 ? 1 : 1 - ((progress - 0.7) / 0.3);
                const y = priceToY(anim.price);
                
                let color, text;
                if (anim.type === 'BREAKOUT') {
                    color = '#FFD700'; // Gold color for breakout
                    text = '💥 突破 7 日新高！';
                } else {
                    color = getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim();
                    text = '🔻 跌破 7 日新低！';
                }
                
                // Draw the pulsating line
                ctx.globalAlpha = opacity * 0.8;
                ctx.strokeStyle = color;
                // Reduced pulsation intensity slightly
                ctx.lineWidth = 2 + Math.sin(progress * Math.PI * 8) * 0.5; 
                ctx.beginPath();
                ctx.moveTo(left, y);
                ctx.lineTo(width - right, y);
                ctx.stroke();
                
                // Draw the floating text
                ctx.globalAlpha = opacity;

                // V10.1: Configuration for smaller, centered animation
                const fontSize = 16; // Reduced from 20px
                const padding = 8; // Reduced from 10px
                const floatDistance = progress * 30 + 20; // Reduced distance

                // V10.1: Center horizontally
                const chartAreaWidth = width - left - right;
                const textX = left + chartAreaWidth / 2;
                
                // Calculate Y position
                // Try positioning above the line first
                let floatY = y - floatDistance;
                
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle'; // Center vertically around floatY

                const textMetrics = ctx.measureText(text);
                const rectHeight = fontSize + padding * 2;
                const halfHeight = rectHeight / 2;

                // Robust Vertical Positioning:
                // Check if it goes off the top boundary
                if (floatY - halfHeight < top) {
                    // If it does, try positioning below the line
                    floatY = y + floatDistance;
                    
                    // Check if it goes off the bottom boundary
                    if (floatY + halfHeight > height - bottom) {
                        // If both top and bottom are cramped, place it at the boundary (top or bottom depending on where the price line 'y' is)
                        if (y < (top + height - bottom) / 2) {
                             // Price line is in the top half, place animation at the very top
                             floatY = top + halfHeight;
                        } else {
                            // Price line is in the bottom half, place animation at the very bottom
                            floatY = height - bottom - halfHeight;
                        }
                    }
                }

                const rectWidth = textMetrics.width + padding * 2;
                const rectX = textX - rectWidth / 2;
                const rectY = floatY - halfHeight;

                ctx.fillStyle = `rgba(50, 50, 50, ${opacity * 0.7})`;
                ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
                
                ctx.fillStyle = color;
                ctx.fillText(text, textX, floatY);
                
                ctx.globalAlpha = 1;
                ctx.lineWidth = 1;
                
                if (progress >= 1) {
                    chartAlertAnimations.splice(i, 1);
                } else {
                    animationsRunning = true;
                }
            }
            if (animationsRunning && !state.isPlaying) requestAnimationFrame(draw);
        }

        function drawTradeAnimations(ctx) {
            const now = performance.now();
            let animationsRunning = false;
            for (let i = tradeAnimations.length - 1; i >= 0; i--) {
                const anim = tradeAnimations[i];
                const elapsed = now - anim.startTime;
                const progress = Math.min(1, elapsed / anim.duration);
                const opacity = 1 - progress;
                
                const x = indexToX(anim.index);
                const y = priceToY(anim.price);
                
                // Skip if off-screen
                if (x < CONFIG.CHART_PADDING.left || x > state.chart.width - CONFIG.CHART_PADDING.right) {
                     if (progress >= 1) tradeAnimations.splice(i, 1);
                     else animationsRunning = true;
                    continue;
                }
                
                ctx.globalAlpha = opacity;
                
                if (anim.type === 'BUY' || anim.type === 'SELL') {
                    // Draw pulsating arrows for entry
                    const color = anim.type === 'BUY' ? getComputedStyle(document.documentElement).getPropertyValue('--color-bull').trim() : getComputedStyle(document.documentElement).getPropertyValue('--color-bear').trim();
                    ctx.fillStyle = color;
                    const size = 12 + progress * 5; 
                    const offsetY = anim.type === 'BUY' ? 15 : -15;
                    
                    ctx.beginPath();
                    if (anim.type === 'BUY') {
                        ctx.moveTo(x, y + offsetY);
                        ctx.lineTo(x - size/2, y + offsetY + size);
                        ctx.lineTo(x + size/2, y + offsetY + size);
                    } else {
                        ctx.moveTo(x, y + offsetY);
                        ctx.lineTo(x - size/2, y + offsetY - size);
                        ctx.lineTo(x + size/2, y + offsetY - size);
                    }
                    ctx.closePath();
                    ctx.fill();
                } else if (anim.type === 'CLOSE') {
                    // Draw floating profit/loss text
                    const color = anim.profit >= 0 ? getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim() : getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim();
                    ctx.fillStyle = color;
                    ctx.font = 'bold 18px sans-serif';
                    ctx.textAlign = 'center';
                    const floatY = y - progress * 60; 
                    ctx.fillText(`$${anim.profit.toFixed(2)}`, x, floatY);
                }
                
                ctx.globalAlpha = 1;
                
                if (progress >= 1) {
                    tradeAnimations.splice(i, 1);
                } else {
                    animationsRunning = true;
                }
            }
            if (animationsRunning && !state.isPlaying) requestAnimationFrame(draw);
        }

        // ----------------------------------------------------------------------------
        // 5. 交易邏輯與帳戶管理 (Trading Logic & Account Management)
        // ----------------------------------------------------------------------------
        
        function getCurrentPrice() {
            if (state.gameData.length === 0 || state.currentIndex >= state.gameData.length) return 0;
            const currentBar = state.gameData[state.currentIndex];
            return getAnimatedBar(currentBar).close;
        }

         function openOrder(type, lots, sl = null, tp = null) {
            if (state.isEnded || state.gameData.length === 0) return;
            const entryPrice = getCurrentPrice();
            if (entryPrice <= 0) return;
            
            // Validation checks (使用標準技術性提示，符合規範)
            if (type === 'BUY') {
                if (sl && sl >= entryPrice) { alert("買單 (BUY) 的停損價格 (SL) 必須低於進場價格。"); return; }
                if (tp && tp <= entryPrice) { alert("買單 (BUY) 的停利價格 (TP) 必須高於進場價格。"); return; }
            } else {
                if (sl && sl <= entryPrice) { alert("賣單 (SELL) 的停損價格 (SL) 必須高於進場價格。"); return; }
                if (tp && tp >= entryPrice) { alert("賣單 (SELL) 的停利價格 (TP) 必須低於進場價格。"); return; }
            }
            
            const position = { id: state.orderIdCounter++, type, lots, entryPrice, entryTime: state.gameData[state.currentIndex].time, sl, tp, profit: 0 };
            
            // Check achievement for averaging down
            const sameTypeCount = state.openPositions.filter(p => p.type === type).length;
            if (sameTypeCount + 1 >= 3) unlockAchievement('AVERAGE_DOWN');

            state.openPositions.push(position);

            // V11.0: Clear SL/TP inputs after successful order (Feature 1 behavior refinement)
            DOM.inputSL.value = "";
            DOM.inputTP.value = "";

            addTradeAnimation(type, entryPrice, state.currentIndex);
            updateAccount();
            updateUI();
            if (!state.isPlaying) requestAnimationFrame(draw);
        }

        function closeOrder(id, closePrice, skipAchievementCheck = false) {
            const index = state.openPositions.findIndex(p => p.id === id);
            if (index === -1) return;
            
            const position = state.openPositions[index];
            const profit = calculateProfit(position, closePrice);
            state.balance += profit;
            
            let closeTime;
            if (state.gameData && state.gameData.length > 0) {
                let closeIndex = state.currentIndex;
                if (closeIndex >= state.gameData.length) closeIndex = state.gameData.length - 1;
                closeTime = state.gameData[closeIndex].time;
            } else {
                closeTime = position.entryTime; // Fallback
            }
            
            const historyEntry = { ...position, closePrice, closeTime, profit };
            state.tradeHistory.push(historyEntry);
            state.openPositions.splice(index, 1);
            
            if (!skipAchievementCheck) {
                updateAchievementStats(historyEntry);
                checkTradeAchievements(historyEntry);
            }
            
            addTradeAnimation('CLOSE', closePrice, Math.min(state.currentIndex, state.gameData.length - 1), profit);
            updateAccount();
            updateUI();
            if (!state.isPlaying) requestAnimationFrame(draw);
        }
         
        function calculateProfit(position, currentPrice) {
            const priceDiff = position.type === 'BUY' ? currentPrice - position.entryPrice : position.entryPrice - currentPrice;
            return priceDiff * CONFIG.CONTRACT_SIZE * position.lots;
        }

        function updatePositions() {
            if (state.currentIndex >= state.gameData.length || state.gameData.length === 0) return;
            
            const currentBar = state.gameData[state.currentIndex];
            const animatedBar = getAnimatedBar(currentBar);
            const currentPrice = animatedBar.close;
            const currentHigh = animatedBar.high;
            const currentLow = animatedBar.low;
            
            const positionsToClose = [];
            
            // Iterate over a copy of the array to allow modification during loop (if needed later)
            [...state.openPositions].forEach(pos => {
                // Re-check if position still exists (might have been closed by SL/TP interaction)
                if (!state.openPositions.find(p => p.id === pos.id)) return;

                pos.profit = calculateProfit(pos, currentPrice);
                
                // Check achievement for diamond hands loss
                if (pos.profit < 0) {
                    const positionValue = pos.entryPrice * CONFIG.CONTRACT_SIZE * pos.lots;
                    if (positionValue > 0) {
                        const lossPercentage = (Math.abs(pos.profit) / positionValue) * 100;
                        if (lossPercentage > 30) unlockAchievement('DIAMOND_HANDS_LOSS');
                    }
                }

                // Check SL/TP triggers based on wicks (High/Low)
                if (pos.type === 'BUY') {
                    if (pos.sl && currentLow <= pos.sl) positionsToClose.push({ id: pos.id, price: pos.sl, reason: 'SL' });
                    else if (pos.tp && currentHigh >= pos.tp) positionsToClose.push({ id: pos.id, price: pos.tp, reason: 'TP' });
                } else { // SELL
                    if (pos.sl && currentHigh >= pos.sl) positionsToClose.push({ id: pos.id, price: pos.sl, reason: 'SL' });
                    else if (pos.tp && currentLow <= pos.tp) positionsToClose.push({ id: pos.id, price: pos.tp, reason: 'TP' });
                }
            });
            
            // Process closures sequentially to avoid race conditions
            const closedIds = new Set();
            positionsToClose.forEach(order => {
                if (!closedIds.has(order.id)) {
                    closeOrder(order.id, order.price);
                    closedIds.add(order.id);
                }
            });
        }

        function updateAccount() {
            state.floatingPL = state.openPositions.reduce((sum, pos) => sum + pos.profit, 0);
            state.equity = state.balance + state.floatingPL;
            
            // Update equity stats for achievements
            if (state.equity > state.achievementStats.maxEquity) state.achievementStats.maxEquity = state.equity;
            if (state.equity < state.achievementStats.minEquity) state.achievementStats.minEquity = state.equity;
            
            checkEquityAchievements();
        }

        // ----------------------------------------------------------------------------
        // 6. UI 更新與互動 (UI Updates & Interaction)
        // ----------------------------------------------------------------------------
        function updateUI() {
            updateHUD();
            updatePositionsPanel();
            updateHistoryPanel();
            updateControls();
            updateOrderPanel();
            // V11.0: If not playing, trigger a redraw to update the SL/TP lines (Feature 1)
            // This ensures lines update when inputs change (typing, scrubbing, or dragging).
            if (!state.isPlaying) {
                requestAnimationFrame(draw);
            }
        }

        function updateOrderPanel() {
            DOM.btnCloseAllGlobal.disabled = state.openPositions.length === 0 || state.isEnded;
            updateEstimatedPL();
        }

        function updateEstimatedPL() {
            // Ensure DOM elements are ready
            if (!DOM.inputLots || !DOM.inputSL || !DOM.inputTP || !DOM.estimateSL || !DOM.estimateTP) return;

            const lots = parseFloat(DOM.inputLots.value);
            const slPrice = parseFloat(DOM.inputSL.value);
            const tpPrice = parseFloat(DOM.inputTP.value);
            const currentPrice = getCurrentPrice();
            
            DOM.estimateSL.textContent = '';
            DOM.estimateTP.textContent = '';
            if (isNaN(lots) || lots <= 0 || currentPrice <= 0) return;
            
            if (!isNaN(slPrice) && slPrice > 0) {
                const slPL = Math.abs(currentPrice - slPrice) * CONFIG.CONTRACT_SIZE * lots;
                DOM.estimateSL.textContent = `SL: -$${slPL.toFixed(2)}`;
            }
            if (!isNaN(tpPrice) && tpPrice > 0) {
                const tpPL = Math.abs(currentPrice - tpPrice) * CONFIG.CONTRACT_SIZE * lots;
                DOM.estimateTP.textContent = `TP: +$${tpPL.toFixed(2)}`;
            }
        }
        
        function updateHUD() {
            if (state.gameData.length === 0) return;
            let displayIndex = Math.min(state.currentIndex, state.gameData.length - 1);
            if (displayIndex < 0) return;

            const currentDate = new Date(state.gameData[displayIndex].time);
            DOM.hudDate.textContent = currentDate.toLocaleString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
            
            DOM.hudEquity.textContent = `$${state.equity.toFixed(2)}`;
            DOM.hudPL.textContent = `$${state.floatingPL.toFixed(2)}`;
            DOM.hudPL.classList.toggle('positive', state.floatingPL > 0);
            DOM.hudPL.classList.toggle('negative', state.floatingPL < 0);
            
            const progress = (displayIndex / (state.gameData.length - 1)) * 100;
            DOM.hudProgress.style.width = `${Math.min(100, progress)}%`;
        }
        
        // V9.0: Updated to update navigation bar count
        function updatePositionsPanel() {
            DOM.positionsCount.textContent = state.openPositions.length;
            // V9.0: Update the count in the navigation bar as well
            if (DOM.positionsCountNav) {
                DOM.positionsCountNav.textContent = state.openPositions.length;
            }
            
            // Handle Empty State visibility
            if (state.openPositions.length === 0) {
                DOM.emptyPositions.style.display = 'flex';
            } else {
                DOM.emptyPositions.style.display = 'none';
            }

            // Select only trade items, not the empty state
            const existingItems = DOM.positionsList.querySelectorAll('.trade-item');
            const currentIds = new Set(state.openPositions.map(p => p.id));
            
            // Remove closed positions
            existingItems.forEach(item => {
                if (!currentIds.has(parseInt(item.dataset.id))) {
                    DOM.positionsList.removeChild(item);
                }
            });

            // Add or update existing positions
            state.openPositions.forEach(pos => {
                let item = DOM.positionsList.querySelector(`[data-id="${pos.id}"]`);
                if (!item) {
                    item = document.createElement('div');
                    item.className = 'trade-item';
                    item.dataset.id = pos.id;
                    item.innerHTML = `
                        <div class="trade-header">
                            <span class="trade-type ${pos.type}">#${pos.id} ${pos.type === 'BUY' ? '買入' : '賣出'} ${pos.lots.toFixed(2)}手</span>
                            <span class="trade-profit"></span>
                        </div>
                        <div class="trade-details">
                            <div><div class="trade-detail-label">進場價</div><div>${pos.entryPrice.toFixed(2)}</div></div>
                            <div><div class="trade-detail-label">停損(SL)</div><div class="trade-sl"></div></div>
                            <div><div class="trade-detail-label">停利(TP)</div><div class="trade-tp"></div></div>
                        </div>
                        <div class="trade-actions-buttons">
                            <button class="btn btn-small btn-secondary btn-modify">修改</button>
                            <button class="btn btn-small btn-danger btn-close">平倉</button>
                        </div>
                    `;
                    // Insert before the empty state element
                    DOM.positionsList.insertBefore(item, DOM.emptyPositions);
                }
                
                // Update profit and SL/TP values
                const profitElement = item.querySelector('.trade-profit');
                const newProfitText = `$${pos.profit.toFixed(2)}`;
                if (profitElement.textContent !== newProfitText) {
                    profitElement.textContent = newProfitText;
                    profitElement.style.color = pos.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
                }
                item.querySelector('.trade-sl').textContent = pos.sl ? pos.sl.toFixed(2) : 'N/A';
                item.querySelector('.trade-tp').textContent = pos.tp ? pos.tp.toFixed(2) : 'N/A';
            });
        }

        function updateHistoryPanel() {
            // Handle Empty State visibility
            if (state.tradeHistory.length === 0) {
                DOM.emptyHistory.style.display = 'flex';
            } else {
                DOM.emptyHistory.style.display = 'none';
            }

            // Check against actual trade items, excluding the empty state
            const tradeItemCount = DOM.historyList.querySelectorAll('.trade-item').length;
            if (tradeItemCount === state.tradeHistory.length) return;
            
            // Clear existing items (but keep the empty state element)
            DOM.historyList.querySelectorAll('.trade-item').forEach(item => item.remove());

            [...state.tradeHistory].reverse().forEach(trade => {
                const item = document.createElement('div');
                item.className = 'trade-item';
                item.innerHTML = `
                    <div class="trade-header">
                        <span class="trade-type ${trade.type}">#${trade.id} ${trade.type === 'BUY' ? '買入' : '賣出'} ${trade.lots.toFixed(2)}手</span>
                        <span style="color: ${trade.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">$${trade.profit.toFixed(2)}</span>
                    </div>
                    <div class="trade-details">
                        <div><div class="trade-detail-label">開倉價</div><div>${trade.entryPrice.toFixed(2)}</div></div>
                        <div><div class="trade-detail-label">平倉價</div><div>${trade.closePrice.toFixed(2)}</div></div>
                        <div><div class="trade-detail-label">持有時間</div><div>${formatDuration(trade.closeTime - trade.entryTime)}</div></div>
                    </div>
                `;
                // Insert before the empty state
                DOM.historyList.insertBefore(item, DOM.emptyHistory);
            });
        }

        function updateControls() {
            DOM.btnPlayPause.textContent = state.isPlaying ? '⏸️ 暫停' : '▶️ 播放';
            DOM.btnStepForward.disabled = state.isPlaying || state.isEnded;
            DOM.btnPlayPause.disabled = state.isEnded;
            document.getElementById('btnBuy').disabled = state.isEnded;
            document.getElementById('btnSell').disabled = state.isEnded;
            document.getElementById('btnEndGame').disabled = state.isEnded;
        }

        function setupEventListeners() {
            window.addEventListener('resize', resizeCanvas);
            DOM.btnPlayPause.addEventListener('click', togglePlayPause);
            DOM.btnStepForward.addEventListener('click', stepForward);
            DOM.speedSelector.addEventListener('click', handleSpeedChange);
            document.getElementById('btnZoomIn').addEventListener('click', () => zoomChart(1.2));
            document.getElementById('btnZoomOut').addEventListener('click', () => zoomChart(1/1.2));
            document.getElementById('btnEndGame').addEventListener('click', handleEndGameClick);

            // V9.0: Handle the internal tabs (Positions vs History)
            document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', handleInternalTabSwitch));
            
            // V9.0: Handle the main navigation tabs (Order vs Positions/History)
            document.querySelectorAll('.nav-btn-v9').forEach(btn => btn.addEventListener('click', handleNavigationTabSwitch));
            
            DOM.btnToggleControls.addEventListener('click', toggleCollapsibleControls);

            setupInputScrubbing();

            // V11.0: Added 'change' event listener for manual input updates (Feature 1)
            // Using 'input' covers real-time changes (typing/scrubbing), 'change' covers final confirmation.
            DOM.inputLots.addEventListener('input', updateUI);
            DOM.inputSL.addEventListener('input', updateUI);
            DOM.inputTP.addEventListener('input', updateUI);
            DOM.inputLots.addEventListener('change', updateUI);
            DOM.inputSL.addEventListener('change', updateUI);
            DOM.inputTP.addEventListener('change', updateUI);

            document.getElementById('btnBuy').addEventListener('click', () => handleTrade('BUY'));
            document.getElementById('btnSell').addEventListener('click', () => handleTrade('SELL'));
            
            DOM.btnCloseAllGlobal.addEventListener('click', closeAllOrders);


            DOM.positionsList.addEventListener('click', (e) => {
                const target = e.target;
                const tradeItem = target.closest('.trade-item');
                if (!tradeItem) return;
                const id = parseInt(tradeItem.dataset.id);
                if (!state.openPositions.find(p => p.id === id)) return;
                if (target.classList.contains('btn-close')) closeOrder(id, getCurrentPrice());
                else if (target.classList.contains('btn-modify')) modifyOrder(id);
            });
            
            // Chart Interactions
            DOM.chartWrap.addEventListener('mousemove', handleMouseMove);
            DOM.chartWrap.addEventListener('mouseleave', handleMouseLeave);
            DOM.chartWrap.addEventListener('wheel', handleMouseWheel, { passive: false });
            DOM.chartWrap.addEventListener('mousedown', handleDragStart);
            window.addEventListener('mousemove', handleDragging);
            window.addEventListener('mouseup', handleDragEnd);

            // V11.0: Updated touch listeners for Pinch-to-Zoom (Feature 3)
            DOM.chartWrap.addEventListener('touchstart', handleTouchStart, { passive: false });
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
            
            document.getElementById('eventContinueBtn').addEventListener('click', continueFromEvent);
            document.getElementById('restartButton').addEventListener('click', startGame);
        }
        
        function handleEndGameClick() {
            if (state.isEnded) return;
            if (state.isPlaying) togglePlayPause();
            if (confirm("確定要提前結束本次挑戰嗎？")) endGame();
        }

        function toggleCollapsibleControls() {
            // V9.0 (R3): Updated logic for new initial state
            DOM.chartControls.classList.toggle('controls-collapsed');
            
            if (DOM.chartControls.classList.contains('controls-collapsed')) {
                DOM.btnToggleControls.textContent = '展開設定';
            } else {
                DOM.btnToggleControls.textContent = '隱藏設定';
            }

            // Trigger a resize just in case layout changes affect the chart wrap dimensions.
            setTimeout(resizeCanvas, 50);
        }
        
        function togglePlayPause() {
            if (state.isEnded) return;
            state.isPlaying = !state.isPlaying;
            if (state.isPlaying) {
                lastTickTime = 0; 
                animationFrameId = requestAnimationFrame(gameLoop);
            } else {
                cancelAnimationFrame(animationFrameId);
            }
            updateControls();
        }

        function stepForward() {
            if (state.isPlaying || state.isEnded) return;
            finalizeCurrentBar();
            if (!advanceSimulation()) {
                endGame();
            } else {
                state.barAnimationProgress = 1; // Show the new bar immediately
                updatePositions();
                check7DayBreakout(); 
                updateAccount();
                checkDurationAchievements();
                checkDrawdownAchievement();
                updateUI();
                checkForEvents();
                // If scrolled back, step forward should decrease the offset
                if (state.chart.scrollOffset > 0) state.chart.scrollOffset = Math.max(0, state.chart.scrollOffset - 1);
                requestAnimationFrame(draw);
            }
        }
        
        function handleSpeedChange(e) {
            if (e.target.classList.contains('speed-btn')) {
                document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                state.speedMultiplier = parseInt(e.target.dataset.speed);
                lastTickTime = 0; // Reset tick timing when speed changes
            }
        }
        
        // V9.0: New function for main navigation tabs
        function handleNavigationTabSwitch(e) {
            const target = e.target.closest('.nav-btn-v9');
            if (!target) return;
            const targetId = target.dataset.target;

            document.querySelectorAll('.nav-btn-v9').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content-v9').forEach(c => c.classList.remove('active'));
            
            target.classList.add('active');
            document.getElementById(targetId).classList.add('active');

            // V10.0: Trigger resize when switching tabs. Crucial for the Grid/Flex hybrid layout.
            setTimeout(resizeCanvas, 50);

            if (state.tutorialActive) setTimeout(showTutorialStep, 50); 
        }

        // V9.0: Renamed from handleTabSwitch to handleInternalTabSwitch
        function handleInternalTabSwitch(e) {
            const target = e.target.closest('.tab-btn');
            if (!target) return;
            // V9.0: Selectors target the internal tabs (tab-btn and tab-content)
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            target.classList.add('active');
            document.getElementById(target.dataset.target).classList.add('active');
            if (state.tutorialActive) setTimeout(showTutorialStep, 50); 
        }

        function handleTrade(type) {
            const lots = parseFloat(DOM.inputLots.value);
            const sl = DOM.inputSL.value ? parseFloat(DOM.inputSL.value) : null;
            const tp = DOM.inputTP.value ? parseFloat(DOM.inputTP.value) : null;
            
            if (isNaN(lots) || lots < 0.01) { alert("請輸入有效的手數 (Lots)，最小為 0.01。"); return; }
            if ((sl !== null && (isNaN(sl) || sl <= 0)) || (tp !== null && (isNaN(tp) || tp <= 0))) {
                alert("停損/停利價格必須是正數。"); return;
            }
            
            openOrder(type, lots, sl, tp);
        }

        function closeAllOrders() {
            if (state.openPositions.length === 0 || state.isEnded) return;

            // V10.0: Added confirmation for closing all orders (Good practice)
            if (!confirm(`確定要關閉所有 ${state.openPositions.length} 個持倉嗎？`)) return;

            const currentPrice = getCurrentPrice();
            // Iterate over a copy of the array as closeOrder modifies the original array
            [...state.openPositions].forEach(pos => closeOrder(pos.id, currentPrice));
        }

        function modifyOrder(id) {
            const position = state.openPositions.find(p => p.id === id);
            if (!position) return;
            
            if (state.isPlaying) togglePlayPause(); // Pause simulation during modification
            
            const currentSL = position.sl ? position.sl.toFixed(2) : '';
            const currentTP = position.tp ? position.tp.toFixed(2) : '';
            
            const newSLInput = prompt(`修改訂單 #${id} 停損 (SL)。\n進場價: ${position.entryPrice.toFixed(2)}\n留空則取消 SL。目前值: ${currentSL}`, currentSL);
            if (newSLInput === null) return; // User cancelled
            
            const newTPInput = prompt(`修改訂單 #${id} 停利 (TP)。\n進場價: ${position.entryPrice.toFixed(2)}\n留空則取消 TP。目前值: ${currentTP}`, currentTP);
            if (newTPInput === null) return; // User cancelled

            // Parse and validate SL
            let newSL = null;
            if (newSLInput !== '') {
                newSL = parseFloat(newSLInput);
                if (isNaN(newSL) || newSL <= 0) { alert("無效的 SL 價格。"); return; }
                if (position.type === 'BUY' && newSL >= position.entryPrice) { alert("買單的停損必須低於進場價。"); return; }
                if (position.type === 'SELL' && newSL <= position.entryPrice) { alert("賣單的停損必須高於進場價。"); return; }
            }
            
            // Parse and validate TP
            let newTP = null;
            if (newTPInput !== '') {
                newTP = parseFloat(newTPInput);
                if (isNaN(newTP) || newTP <= 0) { alert("無效的 TP 價格。"); return; }
                if (position.type === 'BUY' && newTP <= position.entryPrice) { alert("買單的停利必須高於進場價。"); return; }
                if (position.type === 'SELL' && newTP >= position.entryPrice) { alert("賣單的停利必須低於進場價。"); return; }
            }
            
            position.sl = newSL;
            position.tp = newTP;
            updateUI();
            if (!state.isPlaying) requestAnimationFrame(draw);
        }
        
        function handleMouseMove(e) {
            const rect = DOM.chartWrap.getBoundingClientRect();
            state.mouse.x = e.clientX - rect.left;
            state.mouse.y = e.clientY - rect.top;
            state.mouse.isOverChart = true;
            // Unpin crosshair on mouse move (Desktop behavior)
            if (state.chart.isCrosshairPinned && !state.isMobile) state.chart.isCrosshairPinned = false;
            
            // V11.0: Update cursor style based on hover (Feature 1)
            updateCursorStyle();

            if (!state.isPlaying && !state.chart.isDragging) requestAnimationFrame(draw);
        }

        function handleMouseLeave() {
            state.mouse.isOverChart = false;
            // V11.0: Reset cursor style on leave (Feature 1)
            updateCursorStyle();
            if (!state.isPlaying && !state.chart.isDragging) requestAnimationFrame(draw);
        }

        function handleMouseWheel(e) {
            e.preventDefault();
            zoomChart(e.deltaY > 0 ? 1 / 1.1 : 1.1);
        }

        function zoomChart(factor) {
            const newWidth = state.chart.candleWidth * factor;
            
            // V11.0: Enforce Zoom Constraints (Feature 3)
            // Define physical constraints based on candle width
            const MIN_CANDLE_WIDTH = 2; 
            const MAX_CANDLE_WIDTH = 50; 

            // Calculate potential visible candles with the new width
            const chartAreaWidth = state.chart.width - CONFIG.CHART_PADDING.left - CONFIG.CHART_PADDING.right;
            const newSpacing = state.chart.candleSpacing * factor;
            const newUnitWidth = newWidth + newSpacing;

            if (newUnitWidth <= 0) return;

            // Check constraints based on visible candles (if chart area is valid)
            if (chartAreaWidth > 0) {
                const visibleCandles = Math.floor(chartAreaWidth / newUnitWidth);

                // Enforce minimum visible candles (Zoom In Limit)
                if (visibleCandles < CONFIG.MIN_VISIBLE_CANDLES && factor > 1) {
                    // Allow zoom if the chart area is inherently very small, otherwise restrict
                    if (chartAreaWidth > CONFIG.MIN_VISIBLE_CANDLES * (CONFIG.CANDLE_WIDTH_DEFAULT + CONFIG.CANDLE_SPACING)) {
                        return;
                    }
                }

                // Enforce maximum visible candles (Zoom Out Limit)
                if (visibleCandles > CONFIG.MAX_VISIBLE_CANDLES && factor < 1) {
                    return;
                }
            }

            // Fallback physical constraints (important if chartAreaWidth is 0 or for extreme aspect ratios)
            if (newWidth < MIN_CANDLE_WIDTH || newWidth > MAX_CANDLE_WIDTH) return;

            state.chart.candleWidth = newWidth;
            state.chart.candleSpacing = newSpacing; // Keep spacing proportional
            validateScrollOffset();
            if (!state.isPlaying) requestAnimationFrame(draw);
        }

        // V11.0: Helper to check if a point is near a setup line (Feature 1)
        function getLineNearPoint(x, y) {
            const proximityThreshold = 8; // pixels tolerance
            const { left, right } = CONFIG.CHART_PADDING;
            const { width } = state.chart;

            // Only check if cursor is within the main chart area horizontally
            if (x < left || x > width - right) return null;

            // Ensure inputs are available
            if (!DOM.inputSL || !DOM.inputTP) return null;

            const slPrice = parseFloat(DOM.inputSL.value);
            const tpPrice = parseFloat(DOM.inputTP.value);

            // Check SL proximity
            if (!isNaN(slPrice) && slPrice > 0) {
                const slY = priceToY(slPrice);
                if (Math.abs(y - slY) <= proximityThreshold) return 'SL';
            }
            // Check TP proximity
            if (!isNaN(tpPrice) && tpPrice > 0) {
                const tpY = priceToY(tpPrice);
                if (Math.abs(y - tpY) <= proximityThreshold) return 'TP';
            }
            return null;
        }

        // V11.0: Helper to manage cursor style based on hover state (Feature 1)
        function updateCursorStyle() {
            if (state.chart.isDragging || state.chart.isPinching) return; // Dragging/Pinching handles its own cursor

            const chartX = state.mouse.x;
            const chartY = state.mouse.y;

            if (state.mouse.isOverChart) {
                const lineType = getLineNearPoint(chartX, chartY);
                if (lineType) {
                    DOM.chartWrap.style.cursor = 'ns-resize'; // Vertical resize cursor when hovering a line
                } else {
                    DOM.chartWrap.style.cursor = 'crosshair';
                }
            } else {
                DOM.chartWrap.style.cursor = 'crosshair';
            }
        }


        function handleDragStart(e) { if (e.button === 0) startDrag(e.clientX, e.clientY); }
        function handleDragging(e) { if (state.chart.isDragging) performDrag(e.clientX, e.clientY); }
        
        // V11.0: Updated handleDragEnd for desktop
        function handleDragEnd() { 
            // V11.0: Only call endDrag if dragging was active (handles desktop/mobile differences)
            if (state.chart.isDragging) {
                endDrag(); 
            }
        }

        // V11.0: Updated touch handlers for Pinch-to-Zoom and Line Dragging (Feature 1 & 3)
        function handleTouchStart(e) {
            // Only handle touches that originated within the chart wrap area
            if (!e.target.closest('#chartWrap')) return;

            // V11.0: Handle multi-touch (Pinch-to-zoom) (Feature 3)
            if (e.touches.length === 2) {
                if (e.cancelable) e.preventDefault();
                state.chart.isDragging = false; // Cancel any ongoing panning/line dragging
                state.chart.isPinching = true;
                
                // Calculate initial distance between fingers
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                state.chart.pinchStartDistance = Math.sqrt(dx * dx + dy * dy);
                state.chart.pinchStartCandleWidth = state.chart.candleWidth;

            } else if (e.touches.length === 1) {
                // Handle single touch (Panning or Line Dragging)
                // Prevent default scrolling/zooming behavior, unless interacting with controls
                if (!e.target.closest('.controls')) {
                     if (e.cancelable) e.preventDefault();
                }
                // Ensure pinching flag is off
                state.chart.isPinching = false;
                startDrag(e.touches[0].clientX, e.touches[0].clientY);
            }
        }

        function handleTouchMove(e) {
            // V11.0: Handle Pinching (Feature 3)
            if (state.chart.isPinching && e.touches.length === 2) {
                if (e.cancelable) e.preventDefault();

                // Calculate current distance
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);

                if (state.chart.pinchStartDistance > 0) {
                    const scaleFactor = currentDistance / state.chart.pinchStartDistance;
                    // Calculate the target width based on the width at the start of the pinch
                    const newWidth = state.chart.pinchStartCandleWidth * scaleFactor;
                    // Call zoomChart with the ratio relative to the CURRENT width to apply the change
                    zoomChart(newWidth / state.chart.candleWidth);
                }

            } else if (e.touches.length === 1 && state.chart.isDragging) {
                if (e.cancelable) e.preventDefault();
                const dx = e.touches[0].clientX - state.chart.dragStartX;
                const dy = e.touches[0].clientY - state.chart.dragStartY;
                
                // Unpin crosshair if dragging the chart significantly (Mobile behavior)
                // V11.0: Check specifically if dragging the chart (draggedLineType === null)
                if (state.chart.draggedLineType === null && Math.sqrt(dx * dx + dy * dy) > 10 && state.chart.isCrosshairPinned) {
                    state.chart.isCrosshairPinned = false;
                }
                performDrag(e.touches[0].clientX, e.touches[0].clientY);
            }
        }

        function handleTouchEnd(e) {
            // V11.0: Reset pinching state (Feature 3)
            if (state.chart.isPinching) {
                state.chart.isPinching = false;
                // If one finger remains on screen after pinch ends, potentially initiate drag
                if (e.touches.length === 1) {
                    startDrag(e.touches[0].clientX, e.touches[0].clientY);
                }
                return; 
            }

            if (!state.chart.isDragging) return;

            // V11.0: If dragging a line, just end the drag, don't check for taps (Feature 1)
            if (state.chart.draggedLineType !== null) {
                endDrag();
                return;
            }

            const touchDuration = Date.now() - state.chart.dragStartTimeStamp;
            const dx = state.chart.dragCurrentX - state.chart.dragStartX;
            const dy = state.chart.dragCurrentY - state.chart.dragStartY;
            const isTap = touchDuration < 300 && Math.sqrt(dx * dx + dy * dy) < 10;
            
            // Check if the tap occurred on the chart canvas itself, not on the controls
            // We must check the coordinates of the interaction against the bounds of the controls.
            let isOnControls = false;
            const rect = DOM.chartWrap.getBoundingClientRect();
            // Use the start coordinates (relative to viewport) for checking against control bounds
            const startX = state.chart.dragStartX;
            const startY = state.chart.dragStartY;
            
            // Check if the starting point of the drag was within the bounds of any control container
            const controlsContainers = document.querySelectorAll('.controls-overlay-container .controls');
            controlsContainers.forEach(container => {
                const ctrlRect = container.getBoundingClientRect();
                if (startX >= ctrlRect.left && startX <= ctrlRect.right &&
                    startY >= ctrlRect.top && startY <= ctrlRect.bottom) {
                    isOnControls = true;
                }
            });


            if (isTap && !isOnControls) {
                // Toggle pinned crosshair on tap (Mobile behavior)
                if (state.chart.isCrosshairPinned) {
                    state.chart.isCrosshairPinned = false;
                } else {
                    // Use the current coordinates (relative to chart wrap) for pinning
                    state.chart.pinnedCrosshairPos.x = state.chart.dragCurrentX - rect.left;
                    state.chart.pinnedCrosshairPos.y = state.chart.dragCurrentY - rect.top;
                    state.chart.isCrosshairPinned = true;
                }
            }
            endDrag();
        }

        function startDrag(clientX, clientY) {
            // V11.0: Check if starting a line drag (Feature 1)
            const rect = DOM.chartWrap.getBoundingClientRect();
            const chartX = clientX - rect.left;
            const chartY = clientY - rect.top;

            const lineType = getLineNearPoint(chartX, chartY);
            if (lineType) {
                state.chart.isDragging = true;
                state.chart.draggedLineType = lineType;
                DOM.chartWrap.style.cursor = 'ns-resize'; // Vertical resize cursor
            } else {
                // Default chart panning behavior
                state.chart.isDragging = true;
                state.chart.draggedLineType = null;
                state.chart.dragStartX = clientX;
                state.chart.dragStartScroll = state.chart.scrollOffset;
                // Only set 'grabbing' cursor if not pinching (prevents flicker on mobile)
                if (!state.chart.isPinching) {
                     DOM.chartWrap.style.cursor = 'grabbing';
                }
            }

            // Common setup
            state.chart.dragCurrentX = clientX;
            state.chart.dragCurrentY = clientY;
            state.chart.dragStartTimeStamp = Date.now();
        }

        function performDrag(clientX, clientY) {
            state.chart.dragCurrentX = clientX;
            state.chart.dragCurrentY = clientY;

            // V11.0: Handle line dragging (Feature 1)
            if (state.chart.draggedLineType) {
                const rect = DOM.chartWrap.getBoundingClientRect();
                const chartY = clientY - rect.top;
                // yToPrice handles boundary constraints
                const newPrice = yToPrice(chartY);
                
                if (newPrice > 0) {
                    const inputField = state.chart.draggedLineType === 'SL' ? DOM.inputSL : DOM.inputTP;
                    // Update input field value in real-time
                    inputField.value = newPrice.toFixed(2);
                    // Update estimates and UI (which redraws the chart)
                    updateUI(); 
                }
            } else {
                // Default chart panning behavior
                const dx = clientX - state.chart.dragStartX;
                const candleUnitWidth = state.chart.candleWidth + state.chart.candleSpacing;
                if (candleUnitWidth <= 0) return;
                state.chart.scrollOffset = state.chart.dragStartScroll + Math.round(dx / candleUnitWidth);
                validateScrollOffset();
                requestAnimationFrame(draw);
            }
        }

        function endDrag() {
            state.chart.isDragging = false;
            // V11.0: Reset dragged line type (Feature 1)
            state.chart.draggedLineType = null;
            // V11.0: Restore cursor based on current hover state
            updateCursorStyle(); 
            if (!state.isPlaying) requestAnimationFrame(draw);
        }

        function validateScrollOffset() {
            if (state.gameData.length === 0) {
                state.chart.scrollOffset = 0;
                return;
            }
            const visibleCandles = calculateVisibleCandles();
            // Max offset means the chart is scrolled all the way to the beginning (left)
            const maxOffset = Math.max(0, state.currentIndex + 1 - visibleCandles);
            state.chart.scrollOffset = Math.max(0, Math.min(maxOffset, state.chart.scrollOffset));
        }

        // ----------------------------------------------------------------------------
        // 7. 遊戲化功能 (Gamification Features)
        // ----------------------------------------------------------------------------
        
        // (Event and Modal functions remain the same)

        function checkForEvents() {
            if (state.isEnded || state.gameData.length === 0) return;
            const elapsedDays = Math.floor((state.gameData[state.currentIndex].time - state.gameData[0].time) / 86400000) + 1;
            const event = state.financialEvents.find(e => e.triggerDay === elapsedDays);
            const eventKey = `Day${elapsedDays}`;
            if (event && !state.triggeredEvents.has(eventKey)) {
                showEventModal(event);
                state.triggeredEvents.add(eventKey);
            }
        }

        function showEventModal(event) {
            if (state.isPlaying) {
                state.wasPlayingBeforeEvent = true;
                state.isPlaying = false;
                cancelAnimationFrame(animationFrameId);
                updateControls();
            } else {
                state.wasPlayingBeforeEvent = false;
            }
            document.getElementById('eventTitle').textContent = `⚠️ ${event.title}`;
            document.getElementById('eventBody').textContent = event.description;
            DOM.eventModal.classList.add('active');
        }

        function continueFromEvent() {
            DOM.eventModal.classList.remove('active');
            if (state.wasPlayingBeforeEvent) togglePlayPause();
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
        
        function showEndGameModal() {
            const finalRoR = (state.equity - CONFIG.INITIAL_BALANCE) / CONFIG.INITIAL_BALANCE;
            
            // Calculate actual simulation days from data
            let simulationDays = CONFIG.SIMULATION_DURATION_DAYS;
            if (state.gameData.length > 1) {
                simulationDays = (state.gameData[state.gameData.length-1].time - state.gameData[0].time) / 86400000;
            }
            
            // Calculate Annualized RoR
            let annualizedRoR = 0;
            if (simulationDays > 0) {
                const annualizationFactor = 365 / simulationDays;
                if (1 + finalRoR > 0) {
                    annualizedRoR = Math.pow(1 + finalRoR, annualizationFactor) - 1;
                } else {
                    annualizedRoR = -1; // Handle total loss or negative base
                }
            }
            
            document.getElementById('finalScore').textContent = `$${state.equity.toFixed(2)}`;
            // 修改：強調模擬性質
            document.getElementById('finalRoR').innerHTML = `模擬回報率 (Simulated RoR): ${(finalRoR * 100).toFixed(2)}% <br><small style="font-size: 14px; color: var(--color-text-secondary);">(模擬年化報酬率估算: ${(annualizedRoR * 100).toFixed(2)}%)</small>`;
            document.getElementById('finalRoR').style.color = finalRoR >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
            
            const minutes = Math.floor(state.elapsedTime / 60);
            const seconds = state.elapsedTime % 60;
            document.getElementById('finalTime').textContent = `總花費時間: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Performance Feedback
            const feedbackGeneral = getPerformanceFeedback(annualizedRoR, 'GENERAL');
            const feedbackFund = getPerformanceFeedback(annualizedRoR, 'FUND');
            let feedbackHTML = '';
            if (feedbackGeneral && feedbackFund) {
                // 修改：標題改為基礎評估與進階評估
                feedbackHTML = `<div class="performance-feedback" style="text-align: left; margin-top: 20px; padding: 15px; background-color: var(--color-bg); border-radius: var(--radius-main);"><h3 style="text-align: center; margin-bottom: 10px;">📊 模擬表現分析</h3><p style="margin-top: 10px;"><strong>基礎評估：</strong><br>${feedbackGeneral.text}</p><p style="margin-top: 10px;"><strong>進階評估：</strong><br>${feedbackFund.text}</p></div>`;
            }
            
            // Statistics
            const totalTrades = state.tradeHistory.length;
            const winRate = totalTrades > 0 ? (state.tradeHistory.filter(t => t.profit > 0).length / totalTrades) * 100 : 0;
            const totalProfit = state.tradeHistory.reduce((sum, t) => sum + t.profit, 0);
            // 修改：標籤強調模擬性質
            document.getElementById('endGameStats').innerHTML = `${feedbackHTML}<div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--color-border); text-align: left;"><p><strong>交易統計：</strong></p><ul style="list-style-position: inside; padding-left: 10px;"><li>總交易次數: ${totalTrades}</li><li>勝率: ${winRate.toFixed(2)}%</li><li>模擬總損益: $${totalProfit.toFixed(2)}</li><li>模擬期間: 約 ${Math.round(simulationDays)} 天</li></ul></div>`;
            
            displayAchievements();
            DOM.endGameModal.classList.add('active');
        }

        // V11.0: Updated Tutorial Steps (including new features)
        // Define steps dynamically to handle mobile/desktop differences correctly
        // 修改：教學引導文字，強調學習和虛擬帳戶
        const TUTORIAL_STEPS = [
            { selector: '.header', message: '歡迎！本次模擬挑戰目標是在30天內學習交易並提升績效。您可以在頂部追蹤虛擬帳戶狀態和進度。', action: 'next' },
            // V11.0 (Feature 3 update)
            { selector: '.chart-container-v9', message: '圖表區域已最大化。拖曳查看歷史數據，使用滑鼠滾輪或手機雙指縮放 (Pinch-to-Zoom) 查看細節。', action: 'next' },
            // V11.0 (Feature 2 update)
            { 
                selector: '#btnToggleControls', 
                message: '圖表設定預設已收合並以半透明顯示。點擊此按鈕展開速度控制和縮放選項。', 
                action: 'next' 
            },
            // V9.0: New step for the bottom navigation/tabs (dynamically adapts)
            { 
                dynamicSelector: () => state.isMobile ? '.bottom-nav-bar-v9' : '.main-container-v9 .bottom-nav-bar-v9', 
                dynamicMessage: () => state.isMobile ? '使用底部導航欄切換「下單」和「倉位/紀錄」頁面。' : '使用側邊欄頂部的頁籤切換「下單」和「倉位/紀錄」面板。',
                action: 'next' 
            },
            // V9.0: Ensure 'Order' tab is active before highlighting controls
            { selector: '#tabOrder', message: '下單介面集中在此。', action: 'ensureActiveTabOrder', skipDraw: true },
            { selector: '.order-controls', message: '設定停損(SL)、手數和停利(TP)。在輸入框上按住並左右拖動 (Scrubbing) 可快速調整數值。', action: 'next' },
             // V11.0 (Feature 1 New Step)
            { 
                selector: '.chart-wrap', 
                message: '當您設定 SL/TP 價格後，圖表上會顯示對應的價格線。您可以直接【拖曳】這些線條來快速微調價格。', 
                action: 'demoSLTPInput' // Add a helper action to populate inputs for demo
            },
            // V10.0: Updated message for 3-button layout
            { selector: '.trade-actions', message: '點擊「賣出」、「全部平倉」或「買入」進行交易。', action: 'next' },
            // V10.0: Updated final step as the button is moved.
            { selector: '.order-info-bar', message: '您可以在此查看預估的停損/停利金額。祝您模擬順利！', action: 'next' },
        ];
        let currentTutorialStep = 0;

        function startTutorial() {
            if (state.isPlaying) togglePlayPause();
            state.tutorialActive = true;
            currentTutorialStep = 0;
            showTutorialStep();
        }

        // V9.0: Helper for tutorial actions
        function ensureActiveTab(tabId) {
            const tabContent = document.getElementById(tabId);
            if (!tabContent.classList.contains('active')) {
                const navButton = document.querySelector(`.nav-btn-v9[data-target="${tabId}"]`);
                if (navButton) {
                    // Manually trigger the switch logic instead of relying on click() which might be blocked
                    handleNavigationTabSwitch({ target: navButton });
                }
            }
        }

        // V11.0: Helper to demo SL/TP input for tutorial
        function demoSLTPInput() {
            const currentPrice = getCurrentPrice();
            if (currentPrice > 0) {
                // Set SL/TP roughly 10 units away
                DOM.inputSL.value = (currentPrice - 10).toFixed(2);
                DOM.inputTP.value = (currentPrice + 10).toFixed(2);
                updateUI(); // Trigger redraw to show the lines
            }
        }


        function showTutorialStep() {
            if (currentTutorialStep >= TUTORIAL_STEPS.length) {
                endTutorial();
                return;
            }

            const step = TUTORIAL_STEPS[currentTutorialStep];
            
            // V11.0: Handle specific actions before resolving selectors
            if (step.action === 'ensureActiveTabOrder') {
                ensureActiveTab('tabOrder');
                // Proceed to the next step immediately if skipDraw is true
                if (step.skipDraw) {
                    currentTutorialStep++;
                    // Use setTimeout to allow UI to update after tab switch
                    setTimeout(showTutorialStep, 50); 
                    return;
                }
            } else if (step.action === 'demoSLTPInput') {
                // Execute the demo action
                demoSLTPInput();
            }


            // V9.0: Resolve dynamic selectors/messages before use
            if (step.dynamicSelector) {
                step.selector = step.dynamicSelector();
                if (step.dynamicMessage) {
                     step.message = step.dynamicMessage();
                }
            }

            const element = document.querySelector(step.selector);
            
            // V9.0: Handle cases where the element might not be visible (e.g. inside inactive tab)
            // Check if element exists and is visible (offsetParent check), unless it's the nav bar itself
            if (!element || (element.offsetParent === null && !step.selector.includes('bottom-nav-bar-v9'))) {
                
                // If the element is inside a tab content, try activating the tab first (fallback)
                const parentTab = element ? element.closest('.tab-content-v9') : null;
                if (parentTab && !parentTab.classList.contains('active')) {
                    ensureActiveTab(parentTab.id);
                    setTimeout(showTutorialStep, 100); // Wait for activation
                    return;
                }
                
                // Fallback if element genuinely doesn't exist or is still hidden
                if (!element) {
                     console.warn("Tutorial element not found:", step.selector);
                     completeTutorialStep(); // Skip step
                     return;
                }
            }

            // V9.0 (R3): Ensure controls are collapsed if we are highlighting the toggle button
            if (step.selector === '#btnToggleControls' && !DOM.chartControls.classList.contains('controls-collapsed')) {
                toggleCollapsibleControls();
            }

            DOM.tutorialText.textContent = step.message;
            highlightElement(element);
            
            if (!DOM.tutorialMessage.classList.contains('hidden')) {
                DOM.tutorialNextBtn.classList.remove('hidden');
                DOM.tutorialNextBtn.onclick = completeTutorialStep;
            }
        }

        function completeTutorialStep() {
            if (!state.tutorialActive) return;
            currentTutorialStep++;
            showTutorialStep();
        }

        function endTutorial() {
            state.tutorialActive = false;
            state.tutorialCompletedOnce = true;
            DOM.tutorialHighlight.classList.add('hidden');
            DOM.tutorialMessage.classList.add('hidden');

            // V11.0: Clear the demo inputs (Feature 1)
            DOM.inputSL.value = "";
            DOM.inputTP.value = "";
            updateUI();

            // V9.0 (R3): Expand controls automatically after tutorial if they were collapsed
            if (DOM.chartControls.classList.contains('controls-collapsed')) {
                toggleCollapsibleControls();
            }

            if (!state.isPlaying && !state.isEnded) togglePlayPause();
        }

        // Optimized V7.3 (Kept in V9.0): Robust tutorial positioning
        function highlightElement(element) {
            const rect = element.getBoundingClientRect();
            const padding = 10;

            // V9.0 Check for zero dimensions
            if (rect.width === 0 && rect.height === 0) {
                DOM.tutorialHighlight.classList.add('hidden');
                DOM.tutorialMessage.classList.add('hidden');
                return;
            }

            // Position the highlight box
            DOM.tutorialHighlight.classList.remove('hidden');
            DOM.tutorialHighlight.style.top = `${rect.top + window.scrollY - padding}px`;
            DOM.tutorialHighlight.style.left = `${rect.left + window.scrollX - padding}px`;
            DOM.tutorialHighlight.style.width = `${rect.width + padding * 2}px`;
            DOM.tutorialHighlight.style.height = `${rect.height + padding * 2}px`;

            // Position the message bubble
            DOM.tutorialMessage.classList.remove('hidden');
            DOM.tutorialMessage.style.width = 'auto'; 
            const messageRect = DOM.tutorialMessage.getBoundingClientRect();
            
            // 1. Calculate potential positions (Above and Below)
            let positionAboveTop = rect.top + window.scrollY - messageRect.height - padding - 15;
            let positionBelowTop = rect.bottom + window.scrollY + padding + 15;

            // 2. Check visibility (Vertical)
            const viewportTop = window.scrollY;
            const viewportBottom = window.scrollY + window.innerHeight;
            const safetyMargin = 15;

            const spaceAbove = (rect.top + window.scrollY) - viewportTop;
            const spaceBelow = viewportBottom - (rect.bottom + window.scrollY);

            let finalMessageTop;

            // Prioritize placing below if there is enough space
            if (spaceBelow >= messageRect.height + safetyMargin * 2) {
                finalMessageTop = positionBelowTop;
            } 
            // Otherwise, try placing above if there is enough space
            else if (spaceAbove >= messageRect.height + safetyMargin * 2) {
                finalMessageTop = positionAboveTop;
            } 
            // If neither fits perfectly
            else {
                if (spaceBelow >= spaceAbove) {
                    finalMessageTop = viewportBottom - messageRect.height - safetyMargin;
                } else {
                    finalMessageTop = viewportTop + safetyMargin;
                }
            }

            // 3. Calculate horizontal position
            let messageLeft = rect.left + window.scrollX;
            
            // V9.0 Specific adjustment for desktop side panel (prefer placing message to the left)
            if (!state.isMobile && element.closest('.bottom-content-v9')) {
                 messageLeft = rect.left + window.scrollX - messageRect.width - padding - 15;
            }

            if (messageLeft + messageRect.width > window.innerWidth - safetyMargin) {
                messageLeft = window.innerWidth - messageRect.width - safetyMargin;
            }
            // Ensure messageLeft is not negative (can happen if desktop side panel adjustment pushes it off-screen left)
            messageLeft = Math.max(safetyMargin, messageLeft);

            DOM.tutorialMessage.style.top = `${finalMessageTop}px`;
            DOM.tutorialMessage.style.left = `${messageLeft}px`;
        }

        // ----------------------------------------------------------------------------
        // 8. 成就係統與市場監控 (Achievement System & Market Monitoring)
        // (All achievement and monitoring functions remain the same)
        // ----------------------------------------------------------------------------
        
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        function calculate7DayRange() {
            if (state.gameData.length === 0 || state.currentIndex <= 0) return { high: null, low: null };
            const endTime = state.gameData[state.currentIndex].time; 
            const startTime = endTime - SEVEN_DAYS_MS;
            
            let high = -Infinity, low = Infinity;
            // Look back from the previous bar
            for (let i = state.currentIndex - 1; i >= 0; i--) {
                const bar = state.gameData[i];
                if (bar.time < startTime && i < state.currentIndex - 1) break;
                high = Math.max(high, bar.high);
                low = Math.min(low, bar.low);
            }
            return { high: high === -Infinity ? null : high, low: low === Infinity ? null : low };
        }

        function check7DayBreakout() {
            if (state.currentIndex === 0) return;
            const range = state.current7DayRange;
            if (!range || range.high === null || range.low === null) return;
            
            const animatedBar = getAnimatedBar(state.gameData[state.currentIndex]);
            
            if (animatedBar.high > range.high && range.high !== state.lastAlertedHigh) {
                addChartAlertAnimation('BREAKOUT', range.high, state.currentIndex);
                state.lastAlertedHigh = range.high;
            }
            if (animatedBar.low < range.low && range.low !== state.lastAlertedLow) {
                addChartAlertAnimation('BREAKDOWN', range.low, state.currentIndex);
                state.lastAlertedLow = range.low;
            }
        }

        function unlockAchievement(key) {
            if (!state.unlockedAchievements.has(key)) {
                state.unlockedAchievements.add(key);
                const achievement = ACHIEVEMENTS[key];
                if (achievement) showNotification(`🏆 成就解鎖: ${achievement.title}`, achievement.description);
            }
        }

        function updateDailyStats() {
            if (state.gameData.length === 0 || state.currentIndex >= state.gameData.length) return;
            const currentDay = new Date(state.gameData[state.currentIndex].time).toDateString();
            const currentTotalPL = state.equity - CONFIG.INITIAL_BALANCE;

            if (state.achievementStats.currentDay !== currentDay) {
                state.achievementStats.currentDay = currentDay;
                state.achievementStats.dailyLossCount = 0;
                state.achievementStats.dailyMaxPL = currentTotalPL;
            }
            
            if (currentTotalPL > state.achievementStats.dailyMaxPL) {
                state.achievementStats.dailyMaxPL = currentTotalPL;
            }
        }

        function updateAchievementStats(closedTrade) {
            if (closedTrade.profit > 0) {
                state.achievementStats.consecutiveWins++;
                state.achievementStats.consecutiveLosses = 0;
            } else if (closedTrade.profit < 0) {
                state.achievementStats.consecutiveLosses++;
                state.achievementStats.consecutiveWins = 0;
                if (new Date(closedTrade.closeTime).toDateString() === state.achievementStats.currentDay) {
                   state.achievementStats.dailyLossCount++;
                }
            }
        }

        function checkTradeAchievements(trade) {
            if (state.tradeHistory.length >= 1) unlockAchievement('FIRST_TRADE');
            if (state.tradeHistory.length >= 10) unlockAchievement('TRADER_10');
            if (trade.profit > 3000) unlockAchievement('BIG_WIN');
            if (trade.profit < -3000) unlockAchievement('BIG_LOSS');
            if (state.achievementStats.consecutiveWins >= 3) unlockAchievement('WIN_STREAK_3');
            if (state.achievementStats.consecutiveLosses >= 3) unlockAchievement('LOSS_STREAK_3');
            if (trade.profit > 0 && (trade.closeTime - trade.entryTime) <= 3600000) unlockAchievement('QUICK_DRAW');
            if (state.achievementStats.dailyLossCount >= 3) unlockAchievement('BAD_DAY');
        }

        function checkEquityAchievements() {
            if (state.equity >= 20000) unlockAchievement('DOUBLE_UP');
            if (state.achievementStats.minEquity < 2000) unlockAchievement('MARGIN_CALL');
        }

        function checkDrawdownAchievement() {
            const currentTotalPL = state.equity - CONFIG.INITIAL_BALANCE;
            // Check if PL dropped significantly from the daily high
            if (state.achievementStats.dailyMaxPL > 0 && state.achievementStats.dailyMaxPL - currentTotalPL > 2000 && currentTotalPL < 0) {
                unlockAchievement('RUG_PULL');
            }
        }

        function checkDurationAchievements() {
            if (!state.gameData || state.currentIndex >= state.gameData.length) return;
            const currentTime = state.gameData[state.currentIndex].time;
            state.openPositions.forEach(pos => {
                if (currentTime - pos.entryTime > SEVEN_DAYS_MS) {
                    if (pos.profit > 0) unlockAchievement('HOLD_WIN_7D');
                    else if (pos.profit < 0) unlockAchievement('HOLD_LOSS_7D');
                }
            });
        }

        function checkFinalAchievements() {
            const totalTrades = state.tradeHistory.length;
            if (totalTrades >= 10) {
                const winRate = (state.tradeHistory.filter(t => t.profit > 0).length / totalTrades) * 100;
                if (winRate > 60) unlockAchievement('CONSISTENT');
            }
        }

        function displayAchievements() {
            const listElement = document.getElementById('achievementsList');
            const sectionElement = document.getElementById('achievementsSection');
            listElement.innerHTML = '';
            if (state.unlockedAchievements.size === 0) {
                sectionElement.style.display = 'none';
                return;
            }
            sectionElement.style.display = 'block';
            state.unlockedAchievements.forEach(key => {
                const achievement = ACHIEVEMENTS[key];
                if (achievement) {
                    const item = document.createElement('li');
                    item.className = 'achievement-item';
                    item.innerHTML = `<span class="achievement-icon">${achievement.icon}</span><div><strong>${achievement.title}</strong><p style="font-size: 12px; color: var(--color-text-secondary);">${achievement.description}</p></div>`;
                    listElement.appendChild(item);
                }
            });
        }

        function showNotification(title, message) {
            if (!DOM.notificationContainer) return;
            const toast = document.createElement('div');
            toast.className = 'notification-toast';
            toast.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
            DOM.notificationContainer.insertBefore(toast, DOM.notificationContainer.firstChild);
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (DOM.notificationContainer.contains(toast)) DOM.notificationContainer.removeChild(toast);
                }, 500);
            }, 5000);
        }

        // ----------------------------------------------------------------------------
        // 9. 輔助函式 (Utility Functions)
        // ----------------------------------------------------------------------------
        
        // Scrubbing functionality (V11.0 Update)
        function setupInputScrubbing() {
            document.querySelectorAll('.input-field.scrubbable').forEach(input => {
                let isScrubbing = false;
                let startX = 0;
                let startValue = 0;
                const scrubStep = parseFloat(input.dataset.scrubStep) || 1;
                const inputId = input.id;
                const isLots = inputId === 'inputLots';
                const decimalPlaces = 2;

                const onScrubMove = (e) => {
                    if (!isScrubbing) return;
                    if (e.cancelable) e.preventDefault();

                    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                    const dx = clientX - startX;

                    const sensitivity = 10;
                    const steps = Math.floor(dx / sensitivity);

                    let newValue = startValue + steps * scrubStep;

                    if (isLots) {
                        if (newValue < 0.01) newValue = 0.01;
                    } else {
                        if (newValue < 0) {
                            newValue = 0;
                        }
                    }

                    const precisionFactor = Math.pow(10, decimalPlaces);
                    newValue = Math.round(newValue * precisionFactor) / precisionFactor;

                    if (newValue === 0 && !isLots) {
                        input.value = '';
                    } else {
                        input.value = newValue.toFixed(decimalPlaces);
                    }

                    // V11.0: Update UI instead of just EstimatedPL to redraw lines (Feature 1)
                    updateUI();
                };

                const onScrubEnd = () => {
                    if (!isScrubbing) return;
                    isScrubbing = false;
                    document.body.style.cursor = '';
                    window.removeEventListener('mousemove', onScrubMove);
                    window.removeEventListener('mouseup', onScrubEnd);
                    window.removeEventListener('touchmove', onScrubMove);
                    window.removeEventListener('touchend', onScrubEnd);
                };

                const onScrubStart = (e) => {
                    if (e.type === 'mousedown' && e.button !== 0) return;

                    if (document.activeElement === input && window.getSelection().toString()) {
                         return;
                    }

                    if (e.cancelable) e.preventDefault();

                    isScrubbing = true;
                    startX = e.clientX || (e.touches && e.touches[0].clientX);

                    let currentValue = parseFloat(input.value);

                    if (isNaN(currentValue) || (!isLots && currentValue <= 0)) {
                         if (!isLots) {
                            const currentPrice = getCurrentPrice();
                            if (currentPrice > 0) {
                                startValue = currentPrice;
                            } else {
                                startValue = 0;
                            }
                         } else {
                            startValue = 0.10;
                         }
                    } else {
                        startValue = currentValue;
                    }


                    document.body.style.cursor = 'ew-resize';
                    window.addEventListener('mousemove', onScrubMove);
                    window.addEventListener('mouseup', onScrubEnd);
                    window.addEventListener('touchmove', onScrubMove, { passive: false });
                    window.addEventListener('touchend', onScrubEnd);
                };

                input.addEventListener('mousedown', onScrubStart);
                input.addEventListener('touchstart', onScrubStart, { passive: false });
            });
        }

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

        document.addEventListener('DOMContentLoaded', init);

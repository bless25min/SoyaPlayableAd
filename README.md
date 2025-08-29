# 交易獲利挑戰賽 (Trading Profit Challenge)

本專案是一個基於 HTML5 Canvas 的高擬真度交易模擬遊戲。玩家的目標是在一個隨機的30天市場數據中，透過交易操作最大化其虛擬帳戶的獲利。

## 核心功能 (Core Features)

*   **高階圖表引擎**:
    *   使用原生 HTML5 Canvas 高效能渲染 K 線圖，支援流暢的拖曳與縮放。
    *   圖表上即時顯示價格軸、時間軸，以及標示最新價位的「當前價格線」。
*   **專業交易系統**:
    *   整合式下單面板，可快速設定手數、停損 (SL) 與停利 (TP)。
    *   下單前可在圖表上即時預覽 SL/TP 價位。
    *   完整的倉位管理與歷史交易紀錄查詢。
*   **遊戲化流程**:
    *   以「在一個月內最大化獲利」為核心挑戰。
    *   專業的播放控制器，包含播放/暫停、單根 K 棒步進及多段變速。
    *   模擬真實的財經新聞事件，增加挑戰性。
*   **玩家排行榜 (Leaderboard)**:
    *   遊戲結束時，玩家可以輸入姓名來儲存他們的最終成績。
    *   結算畫面提供頁籤，可隨時切換查看當前的玩家排名榜。

## 技術架構 (Architecture)

本專案使用 **Cloudflare Pages** 進行部署，其架構簡潔且高效能：

*   `public/`: 包含所有前端靜態資源。
    *   `index.html`: 一個獨立的單體式應用程式 (Single-File Application)，包含了所有的 HTML, CSS, 和 JavaScript 遊戲邏輯。
    *   `XAUUSD_M15.csv`: 遊戲所使用的市場數據文件。
*   `functions/`: 包含後端無伺服器函數 (Cloudflare Functions)。
    *   `api/[[path]].js`: 處理所有後端 API 請求。

## API 端點 (API Endpoints)

後端函數提供了以下 API：

*   `GET /api/data`:
    *   **功能**: 提供遊戲所需的 K 線圖數據。
    *   **回應**: `text/csv` 格式的數據文件。
*   `GET /api/leaderboard`:
    *   **功能**: 獲取玩家排行榜數據。
    *   **回應**: `application/json` 格式的陣列，包含排名、玩家名稱、分數與提交時間。
*   `POST /api/leaderboard`:
    *   **功能**: 提交一個新的玩家分數到排行榜。
    *   **請求內文**: `application/json` 格式，包含 `{ "name": "玩家名稱", "score": 分數 }`。
    *   **回應**: `application/json` 格式，回傳更新後的排行榜。

## 安裝與部署 (Setup and Deployment)

本專案為 Cloudflare Pages 設計，部署流程如下：

1.  **Fork 或 Clone 此儲存庫。**
2.  **在 Cloudflare Pages 上建立一個新專案**，並連接到您的儲存庫。
3.  **設定構建 (Build settings)**:
    *   **構建命令 (Build command)**: 此專案不需任何構建步驟，您可以將此欄位留空，或填入 `npm install` (如果未來有新增的 npm 套件)。
    *   **構建輸出目錄 (Build output directory)**: 設定為 `public`。
4.  **設定排行榜資料庫 (Crucial Step for Leaderboard)**:
    *   前往 Cloudflare Dashboard > Workers & Pages > KV。
    *   建立一個新的 **KV 命名空間 (KV Namespace)**，例如，您可以命名為 `TRADING_CHALLENGE_DB`。
    *   回到您的 Pages 專案設定 > Settings > Functions > KV Namespace Bindings。
    *   點擊 **Add binding**。
    *   **變數名稱 (Variable name)**: **必須**設定為 `DB`。
    *   **KV 命名空間 (KV namespace)**: 選擇您剛剛建立的 KV 命名空間。
5.  **儲存並部署 (Save and Deploy)**。

完成以上步驟後，您的交易挑戰賽應用程式將會上線，並且排行榜功能將可正常運作。

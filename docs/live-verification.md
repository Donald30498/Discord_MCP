# Discord 實機驗收紀錄

## 2026-10-20：工具目錄 v1 接入

來源為本機 DCenter `d55ae5f` 加工作目錄中的 `docs/discord-mcp-directory-upgrade.md`、`docs/contracts/mcp-directory-v1.md`、`docs/verification/mcp-directory-v1.md` 與 validator。這些目錄契約檔案當時尚未提交；本節記錄實際使用的工作目錄契約，不將它當成已發布版本。Discord MCP 基線為 `2f98ff3` 加本次修改。

目錄是導航資料。本次未加入工具白名單、唯讀限制或權限審核；底座接上整個 MCP，Discord 權限及 Bot 規則決定操作是否執行。下方 2026-10-19 的逐工具審核內容保留為舊契約歷史，現行操作以 [README](../README.md#接入-dcenter-本機-mcp) 為準。

| 文件主張／檢查 | 事實來源與結果 | 未驗證範圍 |
| --- | --- | --- |
| 固定標準 resource 與完整工具歸屬 | [實作](../src/tool-directory.ts)、[目錄測試](../test/tool-directory.test.mjs)：`dcenter://mcp/directory/v1`，JSON UTF-8 18,787 bytes，43 個資料夾、16 個第一層分類、201 個工具全部唯一歸屬，無未分類 | 不主張其他 MCP 客戶端會理解分類語意 |
| revision 與相容性 | 目錄 revision 為 `ac26caacba83371524bdce8db27f2c4c0c0b44a442ce27fa270dffc35da379b5`；對內容計算 SHA-256，測試確認歸屬變動會改 revision，既有工具名稱、schema、callback 保留 | 目前目錄隨程序啟動建立，不提供熱更新或 resource 訂閱 |
| 底座 validator | 在 Discord_MCP 執行 `node ../DCenter/scripts/validate-mcp-directory.mjs --stdio dist/main.js --cwd . --credential-env DISCORD_BOT_TOKEN`：`valid: true`、201/201 classified、43 normalized folders。啟動環境只放非正式 placeholder token，無 Discord HTTP 呼叫 | placeholder 驗證不代表正式憑證或 Discord API 已驗收 |
| 協定協商 | 標準 SDK 2.3.1 客戶端以底座相同版本矩陣及 auto probe，實際協商 `2026-07-28`；resources 與 tools 均宣告 `listChanged: true`，resources 不宣告 subscribe | 本次未強制逐版測試 `2025-11-25` |
| 完整自動化回歸 | `npm.cmd test`：TypeScript 建置及 79 項測試全通過，0 fail、0 skipped；既有標準工具呼叫以受控 HTTP 驗證 | 不取代真實 Discord 操作或 Bot AI 驗收 |
| 執行中 DCenter 的目錄整合 | 管理 API `/v1/mcp-connections/discord-butler-directory-v1/catalog?refresh=true` 回 `provided`，第一層 16 個資料夾；`messages` 有 5 個子資料夾，`messages.read` 有 `guild_message_search`、`message_get`、`message_list`；搜尋 `guild_get` 後按 toolId 取得單一 schema 及「伺服器／基本資料」麵包屑 | 只驗證真實 MCP 程序與管理 API，未操作瀏覽器前端 |
| Butler 接入升級 | 新服務 `discord-mcp-directory-v1`、身分安裝及連線 `discord-butler-directory-v1`，入口摘要核對通過；新接入 `enabled: true`，解除舊 `discord-butler-mcp` 接入並停用舊連線。Bot 當時為 running／ready | 未觸發 Bot AI 的 browse → load → invoke 對話，沒有執行真實 Discord 讀寫 |

底座自身的 provider、前端、handle 及快取測試結果見其驗證文件；本次沒有重跑或據此宣稱 Discord MCP 已完成相同的實機情境。18,787 bytes 是完整 resource 大小，不是模型初始輸入量或 token 數。

同日依使用者要求清理重複登錄：底座目前沒有服務／安裝的刪除或改名 API，因此正常停止底座後，在原私有設定位置將新版取代舊紀錄，再背景啟動；只修改 MCP 的服務、安裝、連線及接入四個陣列，其餘設定比對不變。最終只保留 `discord-mcp`／`Discord MCP`、`discord-butler-identity`、`discord-butler-mcp`，以及 Butler 對該連線的一筆有效接入；移除版本後綴與重複紀錄。啟動後管理 API 確認目錄 `provided`、16 個第一層分類、201 個工具，Butler 為 running／ready。此清理替代上表先建立版本化連線的暫時狀態。

`1.0.0` 發行建置檢查：套件、lockfile 根套件及 MCP server metadata 同步為 `1.0.0`；完整 79 項測試、底座 validator 及標準客戶端版本核對通過。既有 `discord-mcp` 登錄原地更新版本與入口摘要，重啟後目錄仍為 `provided`、16 個第一層分類，Butler running／ready；沒有重新建立帶版本後綴的登錄。真實 Discord 操作、AI 對話及前端操作的未驗證範圍維持如上。

## 2026-10-19：DCenter 0.2.0 本機相容性檢查

對象為 Discord_MCP `025ef98`、DCenter `36ef4dc`，使用 Windows／Node.js `24.14.0`。本節記錄本機自動化與模擬 API 結果，沒有使用正式 Discord 憑證，不能視為新版實機驗收。

| 檢查 | 結果與邊界 |
| --- | --- |
| `npm.cmd test` | TypeScript 建置及 77 項測試通過，0 失敗、0 跳過；以標準 MCP 客戶端與受控 HTTP 回應驗證 |
| DCenter `McpConnections` → 本專案 stdio | 以底座實際連線元件完成工具發現，列出 201 個工具；`guild_get` 透過本機模擬 Discord HTTP API 回傳 200，路徑與 Bot 身分標頭符合預期，結束後關閉連線 |
| 完整新版接入 | 真實管理 API 註冊、身分安裝、工具審核／授權、正式 Bot／AI → Discord、撤權與重啟尚未完成實機驗收；上述連線元件檢查不涵蓋這些步驟 |

此處的工具數量屬於該提交的觀測結果，不是固定契約。現行註冊與驗收操作見 [README](../README.md#接入-dcenter-本機-mcp)。

## 2026-10-19：DCenter 0.2.0 文件主張對照

本次核對 Discord_MCP `025ef98` 加工作目錄文件修改，以及本機 DCenter `2122877`。兩個工作目錄均有未提交修改；下列底座來源的 MCP 區段與 `2122877` 無差異（`src/openapi.ts` 的維修端點摘要另有修改），管理 API 與 MCP 指南也與先前引用的 `36ef4dc` 無差異。這是文件與契約的靜態核對，沒有對執行中的管理 API 發送註冊或授權請求。

底座來源固定於 [DCenter `2122877`](https://github.com/Donald30498/DCenter/tree/2122877)。表中的來源檔案均相對於該提交。

| 文件位置／主張 | 事實來源 | 結果 | 未驗證範圍 |
| --- | --- | --- | --- |
| [README 接入流程](../README.md#接入-dcenter-本機-mcp)：服務 → 安裝 → 連線 → 審核 → grant，包含 `artifact`、`credentialSlot`、`installationId`、`decision`、`toolNames` | [`src/openapi.ts`](https://github.com/Donald30498/DCenter/blob/2122877/src/openapi.ts) 的 MCP schemas 及 `/v1/mcp-*`、`mcp-grants` 端點 | 已核對，範例方法、路徑與必要欄位一致 | 尚未以真實管理 API 執行整組範例 |
| README 身分隔離與唯讀審核：Bot 身分只供擁有者，annotation 不是審核 | [`docs/management-api.md`](https://github.com/Donald30498/DCenter/blob/2122877/docs/management-api.md)「本機 MCP 服務定義」「Bot MCP 工具授權」；`src/openapi.ts` 的 grant 403 與 `read-only` 決策 | 已核對契約；[本專案測試](../test/dcenter-integration.test.mjs)另驗證兩個 stdio 客戶端使用不同 Bot token | 該測試未覆蓋底座跨 Bot 授權拒絕 |
| README 更新與撤權：入口檔雜湊變更拒絕呼叫、工具或安裝資料變更使審核失效、新呼叫重驗授權 | [`src/mcp-connections.ts`](https://github.com/Donald30498/DCenter/blob/2122877/src/mcp-connections.ts) 的 `verifyArtifact`、[`src/mcp-review-policy.ts`](https://github.com/Donald30498/DCenter/blob/2122877/src/mcp-review-policy.ts) 的 `fingerprintMcpReview`、[`src/mcp-broker.ts`](https://github.com/Donald30498/DCenter/blob/2122877/src/mcp-broker.ts) 的 `call` | 已核對原始碼 | 尚未在真實 Bot／AI 回合執行撤權與重啟驗收 |
| README stdio 版本矩陣、stdout／stderr 約定與協商錯誤碼 | [`docs/mcp-development.md`](https://github.com/Donald30498/DCenter/blob/2122877/docs/mcp-development.md)「MCP 開發契約」；`src/mcp-connections.ts` 的 `supportedVersions` 與錯誤對應 | 已核對底座契約，已補入 README | 本 MCP 的實際協商版本及逐版相容性仍待記錄，不能將底座矩陣當成本 MCP 的逐版驗收結果 |
| 本頁自動化紀錄：建置與 77 項測試通過 | 本次工作階段執行 `npm.cmd test`：77 pass、0 fail、0 skipped；測試碼位於 `test/` | 已核對本機受控情境 | 沒有正式 Discord 憑證、Bot／AI 或完整管理流程的實機結果 |
| 本頁先前 `McpConnections` 列出 201 個工具並呼叫成功的紀錄 | 本頁前一節記錄 Discord_MCP `025ef98`／DCenter `36ef4dc` 的連線元件檢查 | 歷史紀錄，本次未重跑該探測 | 原探測未記錄協商版本，也不涵蓋管理 API 註冊與工具授權 |

## 2026-10-14：Discord 實機歷史紀錄

2026-10-14 使用測試 Bot 與測試伺服器 `1559785203763912844` 驗證 T11–T25。憑證只從本機且被 Git 忽略的 `docs/token.txt` 讀取，沒有寫入提交或測試輸出。這是當時的驗收紀錄；[合併前的逐票紀錄](https://github.com/Donald30498/Discord_MCP/tree/818e6e9/docs)仍保留在 Git 歷史。現行行為以程式、測試及 Discord 實際回應為準；[API 覆蓋清單](discord-api-coverage.md)記錄操作的盤點狀態。

T12–T19 的原紀錄載明使用 MCP stdio 客戶端進行實機驗證。T11 與 T20–T25 的原紀錄只載明測試 Bot 的 Discord 實機回應，未記載完整呼叫路徑；對應工具另有 MCP 客戶端至受控 HTTP 回應的自動測試。下表的「未實機驗證」不代表工具沒有實作。

| 票單 | 實機結果與清理 | 未實機驗證或前置條件 |
| --- | --- | --- |
| T11 成員管理 | Bot 身分、成員讀取、封鎖清單均 200；Bot 暱稱暫改、讀取確認後已還原。 | 其他成員修改、踢除、單筆與批次封鎖需可處置且能重新加入的測試成員，以及足夠的 Discord 權限與身分組階級。 |
| T12 伺服器管理 | 預覽、語音區域、整合、稽核紀錄、prune 人數均 200；伺服器改名後已還原。Vanity URL 回 403，MCP 原樣回傳。 | 整合刪除、prune 執行及事件應對設定未實機寫入。 |
| T13 入門與小工具 | 入門設定讀取及原值修改 200；範本建立、讀取、同步、修改、刪除均 200；小工具設定已還原。PNG 回 200，解碼為 1995 位元組且有 PNG 簽章。 | 歡迎畫面回 404 / 10069，測試伺服器未啟用 Community；小工具 JSON 回 403 / 50004，暫時啟用後仍如此。 |
| T14 自動審查 | 規則列表、建立、讀取、修改均 200，刪除 204；測試規則停用且已清理。 | 無。 |
| T15 排程活動 | 外部活動建立、讀取、列表、修改及參與者列表均 200；刪除 204，後續讀取 404。本次建立的兩個暫時活動都已刪除。 | 刪除後立即查詢曾遇 429；驗收客戶端依 `Retry-After` 重試，MCP 沒有自動重試。 |
| T16 表情與貼圖 | 列表及貼圖包查詢 200；建立表情、貼圖 201；讀取與修改 200；刪除 204，測試資源已清理。 | 當時列表為空，未用既有資源驗證單筆讀取；全域 `sticker_get` 缺既有貼圖 ID。 |
| T17 音效板 | 預設音效列表 200，當時有 6 項；伺服器音效列表 200，當時為空。 | 單筆讀取及寫入需有效音訊、音效名額及權限；發送音效需可用語音連線。 |
| T18 語音與舞台 | 語音區域列表 200；Bot 當時不在語音頻道，語音狀態回 404 / 10065；建立舞台頻道回 400 / 50024，沒有留下資源。 | 修改語音狀態及舞台實例操作需 Bot 語音連線或支援舞台頻道的伺服器。 |
| T19 應用程式指令 | 應用程式身分、全域與伺服器指令列表 200；測試伺服器指令建立 201、讀取及修改 200、刪除 204；權限讀取回 404 / 10066。 | 全域指令寫入與整組覆寫未對實機執行；單筆權限更新需使用者 OAuth Bearer token。 |
| T20 應用程式資料 | `GET /applications/@me`、role connection metadata、應用程式表情列表均 200。 | 應用程式資料與 metadata 修改、表情寫入未對實機執行。 |
| T21 SKU 與權益 | SKU 與 entitlement 列表均 200，當時為空。 | 無 SKU，訂閱查詢及 entitlement 寫入未實機執行。 |
| T22 邀請 | 頻道與伺服器邀請列表 200；建立 60 秒、一次使用的測試邀請 200，查詢 200，隨後刪除 200。 | 沒有專用 target-user 邀請，相關操作未實機驗證。 |
| T23 Webhook | 測試文字頻道建立、查詢及修改 Webhook 均 200，刪除 204。 | Webhook token 專用端點不屬 Bot token 階段。 |
| T24 使用者與私訊 | 讀取測試 Bot user ID 與已加入伺服器列表均 200。 | 沒有可接收測試私訊的第二位使用者；DM 建立、Bot 資料修改及離開伺服器未實機執行。 |
| T25 Gateway 與其他端點 | Gateway 兩項讀取均 200；Lobby 建立回 403 / 50001；typing 回 204；OAuth 應用程式與 keys、應用程式讀取及空物件修改均 200；不存在的 Activity instance 回 404。 | 其餘 Lobby 操作、公告頻道追蹤及語音狀態缺測試條件。預覽規格的 Application Attachment 與 Partner SDK 端點缺正式公開參數或 Bot 授權說明，仍列於覆蓋清單待核對。 |

未實機執行的具名工具，以受控 Discord HTTP 回應進行 MCP 完整呼叫測試；這些測試確認請求與回應轉送，不能取代具備前置條件時的實機驗收。

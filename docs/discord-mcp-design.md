# Discord MCP 設計

本文記錄初次設計訪談已確認的決定。核心邊界見 [ADR-0001](adr/0001-discord-mcp-is-an-operation-toolset.md)：此 MCP 只是 Discord 操作工具，沒有自己的判斷、規則或額外限制。

此處的 T01–T11 驗收安排是初始計畫；已執行的 T11–T25 結果及未具備的測試條件見[實機驗收紀錄](live-verification.md)。

## 執行方式與憑證

- 客戶端啟動本機 TypeScript／Node.js MCP 程序；多個 Agent 可各自啟動程序。
- 使用者自行註冊並設定 Discord Bot。客戶端在啟動程序時提供 Bot token；工具呼叫不要求重複填入 token。
- MCP 不註冊帳號、不執行 OAuth 流程、不管理使用者，也不預先檢查 Discord 權限。呼叫是否成功以 Discord 回應為準。

## 工具表

- 第一階段以官方文件中可用 Bot token 呼叫的 Discord HTTP API 操作為範圍。長期目標是涵蓋所有這類操作；無法支援的項目與原因記錄在[覆蓋清單](discord-api-coverage.md)。
- 每個已實作的操作提供具名 MCP 工具，其參數與結果貼近對應的 Discord API。工具名稱以資源類別為前綴，覆蓋清單也依類別分組，方便 Agent 查找。已實作工具全部列入 MCP 工具清單。
- 以 Discord 的[官方 OpenAPI 規格](https://github.com/discord/discord-api-spec)建立待涵蓋清單，再逐項對照[官方 API 文件](https://docs.discord.com/developers/reference)核對工具。官方將規格標為預覽，因此正式文件才是行為判準。
- 先實作訊息、頻道、伺服器、成員及身分組操作，再逐類補齊其他 Bot HTTP 資源。

## 呼叫行為

- 保留 Discord 的請求欄位。清單工具沿用 Discord 的分頁參數，一次呼叫只回傳一頁。
- 檔案上傳接受呼叫端提供的本機路徑；MCP 不另設路徑允許清單。
- 回傳 HTTP 狀態碼、Discord 回應本文及相關標頭，包括速率限制標頭與存在時的 `Retry-After`。
- 將 Discord API 錯誤回傳給 Agent。MCP 不重試 HTTP 429；Agent 決定是否及何時再次呼叫。
- 刪除等具破壞性的 Discord 操作也提供工具；是否需要人工確認由呼叫的 Agent 或客戶端決定。

## 驗收

- 自動測試由 MCP 客戶端呼叫工具，並以可控制的 Discord HTTP 回應核對工具的對外行為。
- 使用者已建立測試 Bot 與測試伺服器，並把測試 token 保存在本機 `docs/token.txt`。實機驗收時由測試啟動程序讀取該檔並傳給 MCP 程序的環境變數；工具呼叫不攜帶 token。不得將 token 內容寫入 Issue、提交、日誌或測試輸出。
- T01 以真實 Discord 查詢 Bot 身分；T02–T03 驗證伺服器、頻道與訊息讀取；T04–T08 在測試伺服器建立測試訊息、附件、頻道或討論串，核對建立、修改、讀取、刪除的實際結果並清理本次建立的資源；T09–T10 驗證可用的成員與身分組操作。
- T11 的踢除、封鎖等管理操作需要額外、可處置的測試成員及相應 Discord 權限；缺少前置條件時記錄未執行項目與原因，不對伺服器擁有者或其他非測試成員執行。
- 每張首批票單仍須通過可重複的 MCP 完整呼叫測試；實機驗收補充確認 Discord 真實行為與官方文件相符。清理只針對該次測試建立的資源。

## 第一階段以外

持續接收 Gateway 事件、關鍵字監聽、惡意連結檢查、刷屏偵測及 `!command` 流程不屬於第一階段的 HTTP 工具表。日後若要提供事件介面，需另行設計；判斷規則仍由 Agent 負責。

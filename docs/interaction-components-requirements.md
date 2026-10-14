# Discord 互動元件與回覆工具開發需求

狀態：已實作；實機互動待驗證

## 背景與目標

不同模組會用按鈕或選單請使用者確認分類、從候選項目中選擇，或確認操作。Discord_MCP 應提供可重用的 Discord 訊息元件格式說明，以及收到互動事件後可呼叫的回覆工具。元件顯示內容、`custom_id`、操作者授權、點擊後的業務行為與狀態保存由呼叫模組決定。

現有 `message_create` 與 `message_edit` 已接受 `components` 和 `flags`，能轉送帶元件的訊息；但 README 尚未提供按鈕／選單的完整範例，MCP 也沒有使用 interaction token 回覆點擊事件的工具。`docs/discord-api-coverage.md` 目前將 interaction callback 標為不適用，原因是現有 HTTP 客戶端只使用 Bot token。此需求會為互動回覆新增獨立的 token 授權路徑，不改動既有 Bot token 操作。

## 功能需求

1. **訊息元件格式**：文件提供可直接用於 `message_create`、`message_edit` 的按鈕與訊息元件 String Select 單選選單範例；單選明確設定 `min_values: 1`、`max_values: 1`。範例包括 `custom_id`、選項值、停用元件、`allowed_mentions`，以及傳統訊息元件和 Components V2 的 `flags`／內容限制。Radio Group 是 Modal 元件，不作為訊息選單範例。維持現有通用 `components` 輸入，不建立特定業務場景的工具。
2. **初次互動回覆**：提供具名 MCP 工具，讓呼叫模組以 `interaction_id`、`interaction_token`、Discord callback `type` 和 `data` 呼叫 `POST /interactions/{interaction_id}/{interaction_token}/callback`。至少支援新訊息回覆（`type` 4）、延後新訊息回覆（`type` 5）、延後更新原元件訊息（`type` 6）及更新原元件訊息（`type` 7）。`type` 6／7 只用於元件互動及符合 Discord 規則的 Modal Submit；不能當作一般斜線指令的新訊息回覆。新訊息回覆可設定 `EPHEMERAL`；`type` 5 延後回覆的初次 callback 若帶 `flags`，只可設定 `EPHEMERAL`。工具回傳 HTTP 狀態、本文與相關速率限制標頭，沿用本專案的回應格式，不自行重試。
3. **延後回覆的完成路徑**：提供編輯原始互動回覆的工具，供模組在 defer 後完成結果；如採用 follow-up，也提供建立 follow-up 訊息的工具。獨立建立的 follow-up 可設定 `EPHEMERAL`；編輯原始回覆不能改變初次回覆決定的公開狀態。`type` 5 後立即使用 follow-up endpoint 會以相容行為編輯原始回覆並忽略新的 `EPHEMERAL` flag，文件與範例應改用編輯原始回覆 endpoint 完成 defer。這些工具使用 `application_id` 與 `interaction_token`，而非 Bot token。工具不得把 token 放入回傳本文、錯誤文字或記錄。
4. **操作邊界**：MCP 不接收 Gateway 事件、不架設 Interactions webhook、不檢查 Discord 使用者權限、不解析 `custom_id` 的業務意義，也不保存待確認狀態。各模組負責接收事件、驗證操作者與來源、產生元件參數、在時限內回覆，以及處理重複或過期點擊。

## 驗收情境

- 模組可透過現有訊息工具送出三個分類按鈕或一個三選一選單，點擊後取得由模組自行接收的 `custom_id`／選值，再透過新工具更新原訊息或只對點擊者回覆。
- 模組可先 defer，再編輯原始互動回覆；測試涵蓋 Discord 成功、4xx、429 與 token 過期回應，並確認不以 Bot token 代替 interaction token。
- 文件清楚區分「送出元件」、「接收點擊事件」、「回覆互動」三個步驟，並提供模組端最小呼叫範例；不把 Butler 的私人／公開／公共分類寫進 MCP 的通用 API。

## 時限與參考

Discord 要求收到互動後 **3 秒內送出初次回覆**；互動 token 可用於後續回覆約 **15 分鐘**。模組應在耗時處理前先回覆或 defer。Discord 的 Gateway 與 outgoing webhook 是互斥的互動接收方式，由模組選用。

- [Discord：Components Overview](https://docs.discord.com/developers/components/overview)
- [Discord：Component Reference](https://docs.discord.com/developers/components/reference)
- [Discord：Receiving and Responding to Interactions](https://docs.discord.com/developers/interactions/receiving-and-responding)
- 本專案 `docs/adr/0001-discord-mcp-is-an-operation-toolset.md`

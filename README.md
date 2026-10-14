# Discord MCP

本機 stdio MCP 伺服器，將 Discord Bot 可用的 HTTP 操作提供為具名工具。現有工具及待完成範圍見[覆蓋清單](docs/discord-api-coverage.md)。

## 啟動

需要 Node.js 20 以上。執行 `npm ci`、`npm run build`，然後在 MCP 客戶端設定：

- 命令：`node`
- 引數：本專案的 `dist/main.js` 絕對路徑
- 環境變數：`DISCORD_BOT_TOKEN`，值為自行建立的 Discord Bot token

每個客戶端可各自啟動程序。token 由啟動環境提供，不放在工具參數中。

## 已提供的工具

`user_get_current` 無參數，呼叫 Discord `GET /users/@me`。結果以 JSON 文字包含 `status`、`body`、`headers`；`headers` 保留回應的 `content-type`、`retry-after` 和 `x-ratelimit-*`。Discord 4xx、5xx 與 429 回應也原樣提供狀態與本文，工具不重試。

- `guild_get`：`guild_id`，可選 `with_counts`；呼叫 `GET /guilds/{guild_id}`。
- `guild_list_channels`：`guild_id`；呼叫 `GET /guilds/{guild_id}/channels`，清單不含討論串。
- `channel_get`：`channel_id`；呼叫 `GET /channels/{channel_id}`，也可讀取討論串。
- `message_get`：`channel_id`、`message_id`；呼叫 `GET /channels/{channel_id}/messages/{message_id}`。
- `message_list`：`channel_id`，可選 `around`、`before`、`after`、`limit`；呼叫 `GET /channels/{channel_id}/messages`，單次只取 Discord 回傳的一頁。

執行 `npm test` 可用本機 HTTP 測試伺服器完成 MCP 客戶端到 Discord 請求的全流程測試。

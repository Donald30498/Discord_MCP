# T20 實機驗收（2026-10-14）

使用本機測試 Bot token，未輸出或儲存憑證。

- `GET /applications/@me`：200。
- `GET /applications/{application_id}/role-connections/metadata`：200。
- `GET /applications/{application_id}/emojis`：200。
- 修改應用程式資料、覆寫 metadata、表情符號寫入操作：受控 HTTP 的完整 MCP 測試驗證，未改動實機設定。


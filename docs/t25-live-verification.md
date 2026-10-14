# T25 實機驗收（2026-10-14）

使用本機測試 Bot token，未輸出或儲存憑證。

- `GET /gateway`：200；`GET /gateway/bot`：200。
- `POST /lobbies`：403，Discord 錯誤碼 50001（Missing Access）；測試應用程式無法建立 Lobby。其餘 Lobby 操作由受控 HTTP 的完整 MCP 測試驗證。
- 遺漏路由稽核：`POST /channels/{channel_id}/typing`：204；公告頻道追蹤及語音狀態因測試伺服器沒有對應頻道，使用受控 HTTP MCP 測試。
- `GET /oauth2/applications/@me`、`GET /oauth2/keys`、`GET /applications/{application_id}`：200；`PATCH /applications/{application_id}` 送空物件：200；不存在的 Activity instance 查詢：404。
- 預覽 OpenAPI 中的 Application Attachment 與 Partner SDK 專門端點缺少可核對的正式公開參數／Bot 授權說明，覆蓋清單逐項標為待核對，未假定可以只靠 Bot token 呼叫。

# T23 實機驗收（2026-10-14）

使用本機測試 Bot token，未輸出或儲存憑證。

- 在測試文字頻道建立 Webhook：200。
- 依 ID 查詢：200；修改名稱：200；刪除：204。
- Webhook token 專用端點依官方文件列為本階段例外；不以 Bot Authorization 呼叫。

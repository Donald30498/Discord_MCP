# T21 實機驗收（2026-10-14）

使用本機測試 Bot token，未輸出或儲存憑證。

- `GET /applications/{application_id}/skus`：200，清單為空。
- `GET /applications/{application_id}/entitlements`：200，清單為空。
- 因測試應用程式沒有 SKU，訂閱查詢與 entitlement 寫入只能由受控 HTTP 的完整 MCP 測試驗證。

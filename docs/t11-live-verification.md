# T11 實機驗收紀錄

2026-10-14，測試伺服器 `1559785203763912844`。Bot token 僅從本機 `docs/token.txt` 注入測試程序；此紀錄不含憑證。

- `user_get_current`、`guild_member_get`：HTTP 200。
- `guild_member_modify_current`：將 Bot 暱稱暫改為測試值，重新讀取確認，再恢復原暱稱並重新讀取確認；所有操作 HTTP 200。
- `guild_ban_list`：`limit=1`，HTTP 200。
- `guild_member_modify` 對其他成員、`guild_member_remove`、`guild_ban_create`、`guild_ban_get`、`guild_ban_delete`、`guild_ban_bulk_create` 未執行實機寫入驗收。缺少明確指定且可處置的測試成員 ID；不可對伺服器擁有者或非測試成員執行。要驗收踢除與封鎖，需準備可重新加入的測試帳號，並確認 Bot 擁有相應 Discord 權限與身分組階級。

完整 MCP stdio 至可控 Discord HTTP 的自動測試已涵蓋以上所有具名操作，以及 Discord 429 原樣回傳與不重試。

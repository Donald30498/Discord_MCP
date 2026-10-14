# T12 Discord 實機驗證

2026-10-14 使用本機測試 Bot 對測試伺服器 `1559785203763912844`，經由 MCP stdio 工具呼叫 Discord。token 只由主工作區 `docs/token.txt` 注入程序環境，未記錄於輸出或提交。

| 工具 | 結果 |
| --- | --- |
| `guild_preview_get` | 200 |
| `guild_voice_regions_list` | 200 |
| `guild_integrations_list` | 200 |
| `guild_audit_log_get` | 200 |
| `guild_prune_count_get` | 200 |
| `guild_vanity_url_get` | 403；測試伺服器目前不允許此 Bot 讀取，MCP 原樣回傳 |
| `guild_modify` | 200；改名後以 `guild_get` 核對，再改回原名並再次核對 |

`guild_integration_delete`、`guild_prune_begin` 未實機呼叫，因為目前沒有由本次測試建立、可安全移除的整合或測試成員。`guild_incident_actions_modify` 也未實機呼叫，避免影響測試伺服器邀請及私訊設定。這些操作已由完整 MCP 客戶端到可控 HTTP 伺服器的自動測試覆蓋。

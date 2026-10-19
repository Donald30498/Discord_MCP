# Discord MCP

本機 stdio MCP 伺服器，將 Discord Bot 可用的 HTTP 操作及互動回覆的 token 專用操作提供為具名工具。現有工具及待完成範圍見[覆蓋清單](docs/discord-api-coverage.md)。

文件導覽：[設計決定](docs/discord-mcp-design.md) · [實機驗收與未驗證項目](docs/live-verification.md) · [核心邊界 ADR](docs/adr/0001-discord-mcp-is-an-operation-toolset.md)。

## 啟動

需要 Node.js 20 以上。執行 `npm ci`、`npm run build`，然後在 MCP 客戶端設定：

- 命令：`node`
- 引數：本專案的 `dist/main.js` 絕對路徑
- 環境變數：`DISCORD_BOT_TOKEN`，值為自行建立的 Discord Bot token

每個客戶端可各自啟動程序。token 由啟動環境提供，不放在工具參數中。

## 接入 DCenter 本機 MCP

本節對應 DCenter **0.2.0**，依底座提交 `36ef4dc` 的[管理 API](https://github.com/Donald30498/DCenter/blob/36ef4dc/docs/management-api.md)與[MCP 指南](https://github.com/Donald30498/DCenter/blob/36ef4dc/docs/mcp-development.md)核對。Discord MCP 自身版本仍為 `0.1.0`，不需因底座升級而改成 `0.2.0`。實際端點結構以執行中且已認證的 `GET /v1/openapi.json` 為準。

底座的 stdio 協定矩陣為 `2025-11-25` 與 `2026-07-28`，以版本協商選擇；這不代表本 MCP 已逐版驗證，實際協商版本仍須記錄。發現失敗時，`MCP_PROTOCOL_UNSUPPORTED` 表示版本不支援、`MCP_NEGOTIATION_FAILED` 表示協商失敗、`MCP_TOOLS_UNAVAILABLE` 表示服務未提供 tools 能力。stdio 的 stdout 僅供協定訊息，診斷輸出使用 stderr；[證據與待驗證範圍](docs/live-verification.md)分開記錄文件核對及執行結果。

0.2.0 不自動遷移舊 MCP 服務、身分、連線與工具授權；升級前備份私有設定，依底座指南重新設定與註冊。先完成 Bot 註冊並在 DCenter 管理頁設定該 Bot 的 Discord token，再依序建立「服務 → 外部安裝／身分 → 連線 → 工具審核 → Bot 授權」。Bot 使用 IPC v3；本 MCP 本身使用標準 stdio，不實作 Bot IPC。

### 1. 建置與管理員工作階段

在 Discord_MCP 專案執行 `npm.cmd ci`、`npm.cmd run build`。以下範例在**管理員 PowerShell** 執行，請替換實際路徑、Bot ID 與管理埠；若使用自訂 `DCENTER_CONFIG`，也須調整私有設定檔路徑。設定檔只在管理員工作階段讀取，不複製到 MCP 或 Bot 專案。

```powershell
$dcenterRoot = 'C:\Users\USER\Desktop\DCenter'
$mcpRoot = 'C:\Users\USER\Desktop\Discord_MCP'
$botId = 'example-bot'
$base = 'http://127.0.0.1:4317'
$secret = (Get-Content -LiteralPath (Join-Path $dcenterRoot '.dcenter\config.json') -Raw -Encoding UTF8 | ConvertFrom-Json).managementSecret
$headers = @{ Authorization = "Bearer $secret" }
$mcpEntry = (Resolve-Path -LiteralPath (Join-Path $mcpRoot 'dist\main.js')).Path
```

### 2. 註冊可信本機服務

管理員先核對程式與依賴，再以建置後的入口檔 SHA-256 註冊。`credentialSlot` 表示 DCenter 將憑證放入哪個環境變數；此處不填 token 原值。

```powershell
$service = @{
  id = 'discord-mcp'
  name = 'Discord MCP'
  version = '0.1.0'
  transport = 'stdio'
  command = (Get-Command node -CommandType Application).Source
  args = @($mcpEntry)
  cwd = $mcpRoot
  credentialSlot = 'DISCORD_BOT_TOKEN'
  artifact = @{ path = $mcpEntry; sha256 = (Get-FileHash -LiteralPath $mcpEntry -Algorithm SHA256).Hash.ToLowerInvariant() }
} | ConvertTo-Json -Depth 4
Invoke-RestMethod -Method Post -Uri "$base/v1/mcp-services" -Headers $headers -ContentType 'application/json' -Body $service
```

### 3. 建立 Bot 專屬身分與連線

`kind = 'bot-discord-token'` 以 `ownerBotId` 參照底座已保存的 Bot 身分，不傳 `secret`。連線透過 `installationId` 選擇身分，不能直接以連線上的 `botId` 取代外部安裝。

```powershell
$installation = @{ id = 'example-discord-identity'; serviceId = 'discord-mcp'; kind = 'bot-discord-token'; ownerBotId = $botId } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/v1/mcp-installations" -Headers $headers -ContentType 'application/json' -Body $installation
$connection = @{ id = 'discord-example-bot'; serviceId = 'discord-mcp'; installationId = 'example-discord-identity' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/v1/mcp-connections" -Headers $headers -ContentType 'application/json' -Body $connection
Invoke-RestMethod -Uri "$base/v1/mcp-connections/discord-example-bot/tools" -Headers $headers
```

DCenter 按需啟動 stdio 程序並注入該 Bot 的 token；Bot 不自行啟動 MCP。服務程式可共用，但每個 Bot 的 Discord 身分安裝與連線分開建立，只有擁有該身分的 Bot 可取得授權。

### 4. 審核工具，再授權 Bot

先確認實際清單有 `guild_get`，核對程式、身分範圍、描述及參數後才記錄唯讀審核。`readOnlyHint` 等 annotation 只是提示，不代替管理員審核，也不證明工具真正唯讀。

```powershell
Invoke-RestMethod -Uri "$base/v1/mcp-connections/discord-example-bot/reviews" -Headers $headers
$review = @{ decision = 'read-only' } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "$base/v1/mcp-connections/discord-example-bot/reviews/guild_get" -Headers $headers -ContentType 'application/json' -Body $review
$grant = @{ toolNames = @('guild_get') } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "$base/v1/bots/$botId/mcp-grants/discord-example-bot" -Headers $headers -ContentType 'application/json' -Body $grant
```

底座目前依連線實際發現且審核有效的工具授權，已無固定三個工具名稱的白名單；現行審核決策只有 `read-only`。發送、修改、刪除與讀本機檔案的工具不可為了通過授權而標成唯讀，須另行完成底座的相應能力與驗收。本 MCP 仍向其他標準 MCP 客戶端提供全部既有工具。

### 5. 呼叫、撤權與更新後驗收

Bot 從公開 runtime 的 `tools.list()` 取得當前已授權工具，再以回傳的不透明名稱呼叫 `tools.call(name, args)`，不要自行拼接跨連線工具名稱。新增授權在下一個 AI 回合可見；底座每次呼叫仍重驗權限。

使用 Starter 時，在已設定的受控伺服器以操作者執行 `/mcp-check`，應得到 `guild_get OK`；AI 已啟用且 Codex 可用時，再以 `/ask` 查詢同一伺服器資料。撤權範例：

```powershell
Invoke-RestMethod -Method Delete -Uri "$base/v1/bots/$botId/mcp-grants/discord-example-bot" -Headers $headers
```

撤權後新呼叫應被拒絕，Starter `/mcp-check` 應顯示工具不可用，新一回合 `/ask` 不應再取得該工具，而 `/ping` 仍可用。`tools/list` 成功不代表真實 Discord 呼叫、Bot 授權或 AI 已完成驗收。

產物內容變更會觸發 `MCP_ARTIFACT_CHANGED`；工具描述／參數或安裝範圍變更會使既有審核失效。現行服務定義沒有更新端點；升級程式時建立新的服務 ID、身分安裝與連線，重新發現、審核與授權，並撤銷舊連線授權。入口檔雜湊只核對指定檔案，不涵蓋全部匯入模組及依賴，不能當成整個套件的完整性證明。

本機相容性與真實 Discord 驗收分開記錄，見[驗證紀錄](docs/live-verification.md)。新版 DCenter 的完整真實 Bot／AI／Discord 接入仍待驗收。

## 已提供的工具

`user_get_current` 無參數，呼叫 Discord `GET /users/@me`。結果以 JSON 文字包含 `status`、`body`、`headers`；`headers` 保留回應的 `content-type`、`retry-after` 和 `x-ratelimit-*`。Discord 4xx、5xx 與 429 回應也原樣提供狀態與本文，工具不重試。

- `guild_get`：`guild_id`，可選 `with_counts`；呼叫 `GET /guilds/{guild_id}`。
- `guild_modify`：`guild_id`，可選 Discord 伺服器設定欄位及 `audit_log_reason`；呼叫 `PATCH /guilds/{guild_id}`。
- `guild_audit_log_get`：`guild_id`，可選 `user_id`、`action_type`、`before`、`after`、`limit`；讀取一頁稽核紀錄。
- `guild_preview_get`、`guild_voice_regions_list`、`guild_integrations_list`、`guild_vanity_url_get`：以 `guild_id` 讀取對應的預覽、語音區域、整合與 vanity URL。
- `guild_integration_delete`：`guild_id`、`integration_id`，可選 `audit_log_reason`；刪除整合，Discord 亦會移除相關 webhook 與 Bot。
- `guild_prune_count_get`：`guild_id`，可選 `days`、`include_roles`；取得清理成員的預估數量。
- `guild_prune_begin`：`guild_id`，可選 `days`、`compute_prune_count`、`include_roles`、已棄用的 `reason`、`audit_log_reason`；清理不活躍成員。
- `guild_incident_actions_modify`：`guild_id`，可選 `invites_disabled_until`、`dms_disabled_until`；設定或清除事件應對時限。
- `guild_list_channels`：`guild_id`；呼叫 `GET /guilds/{guild_id}/channels`，清單不含討論串。
- `channel_get`：`channel_id`；呼叫 `GET /channels/{channel_id}`，也可讀取討論串。
- `guild_create_channel`：`guild_id`、`name`，可選官方頻道建立欄位與 `audit_log_reason`；呼叫 `POST /guilds/{guild_id}/channels`。
- `guild_modify_channel_positions`：`guild_id`、`channels`（官方頻道位置物件陣列），可選 `audit_log_reason`；呼叫 `PATCH /guilds/{guild_id}/channels`。
- `channel_modify`：`channel_id`，可選官方頻道或討論串修改欄位與 `audit_log_reason`；呼叫 `PATCH /channels/{channel_id}`。
- `channel_delete`：`channel_id`，可選 `audit_log_reason`；呼叫 `DELETE /channels/{channel_id}`。伺服器頻道刪除無法復原。
- `channel_permission_edit`：`channel_id`、`overwrite_id`、`type`，可選 `allow`、`deny`、`audit_log_reason`；呼叫 `PUT /channels/{channel_id}/permissions/{overwrite_id}`。
- `channel_permission_delete`：`channel_id`、`overwrite_id`，可選 `audit_log_reason`；呼叫 `DELETE /channels/{channel_id}/permissions/{overwrite_id}`。
- `guild_member_get`：`guild_id`、`user_id`；讀取單一伺服器成員。
- `guild_member_list`：`guild_id`，可選 `limit`、`after`；依 Discord 分頁讀取一次成員列表。Bot 需啟用 `GUILD_MEMBERS` privileged intent。
- `guild_member_search`：`guild_id`、`query`，可選 `limit`；搜尋使用者名稱或暱稱前綴。
- `guild_role_list`、`guild_role_get`、`guild_role_member_counts_get`：以 `guild_id` 讀取身分組列表或人數；單一身分組另帶 `role_id`。
- `guild_role_create`、`guild_role_modify`：`guild_id`，修改時另帶 `role_id`；可填 Discord 身分組欄位 `name`、`permissions`、`color`、`colors`、`hoist`、`icon`、`unicode_emoji`、`mentionable` 與 `audit_log_reason`。`color` 是 Discord 保留的舊欄位，建議使用 `colors`。
- `guild_role_positions_modify`：`guild_id`、`roles: [{ id, position? }]`，可選 `audit_log_reason`；批次調整身分組位置。
- `guild_role_delete`：`guild_id`、`role_id`，可選 `audit_log_reason`；刪除身分組。
- `guild_member_role_add`、`guild_member_role_remove`：`guild_id`、`user_id`、`role_id`，可選 `audit_log_reason`；指派或移除成員身分組。
- `guild_member_modify`：`guild_id`、`user_id`，可選官方成員修改欄位與 `audit_log_reason`。
- `guild_member_modify_current`：`guild_id`，可選 `nick`、`banner`、`avatar`、`bio`、`audit_log_reason`；修改 Bot 自身的伺服器成員資料。
- `guild_member_remove`：`guild_id`、`user_id`，可選 `audit_log_reason`；踢除成員。
- `guild_ban_list`：`guild_id`，可選 `limit`、`before`、`after`；依 Discord 分頁讀取一次封鎖列表。
- `guild_ban_get`：`guild_id`、`user_id`；讀取單一封鎖。
- `guild_ban_create`：`guild_id`、`user_id`，可選 `delete_message_seconds`、已棄用的 `delete_message_days`、`audit_log_reason`；封鎖成員。
- `guild_ban_delete`：`guild_id`、`user_id`，可選 `audit_log_reason`；解除封鎖。
- `guild_ban_bulk_create`：`guild_id`、`user_ids`，可選 `delete_message_seconds`、`audit_log_reason`；批量封鎖，Discord 限制最多 200 位。
- `guild_onboarding_get`、`guild_onboarding_modify`：`guild_id`；修改可帶官方的 `prompts`、`default_channel_ids`、`enabled`、`mode` 及 `audit_log_reason`。
- `guild_template_get`：`code`；依範本代碼讀取。
- `guild_template_list`、`guild_template_create`：`guild_id`；建立另帶 `name`，可選 `description`。
- `guild_template_sync`、`guild_template_modify`、`guild_template_delete`：`guild_id`、`code`；修改可帶 `name`、`description`。
- `guild_welcome_screen_get`、`guild_welcome_screen_modify`：`guild_id`；修改可帶 `enabled`、`welcome_channels`、`description` 與 `audit_log_reason`。
- `guild_widget_settings_get`、`guild_widget_settings_modify`：`guild_id`；修改可帶 `enabled`、`channel_id` 與 `audit_log_reason`。
- `guild_widget_get`：`guild_id`；讀取公開小工具 JSON。
- `guild_widget_image_get`：`guild_id`，可選 `style`；讀取公開小工具 PNG。成功結果的 `body` 是原始 PNG 位元組的 base64，另附 `body_encoding: "base64"`、HTTP 狀態與標頭。
- `guild_auto_moderation_rule_list`、`guild_auto_moderation_rule_get`：`guild_id`，單筆另帶 `rule_id`；讀取 Discord 自動審查規則。
- `guild_auto_moderation_rule_create`：`guild_id`、`name`、`event_type`、`trigger_type`、`actions`，可選 `trigger_metadata`、`enabled`、`exempt_roles`、`exempt_channels`、`audit_log_reason`。
- `guild_auto_moderation_rule_modify`：`guild_id`、`rule_id`，可選建立工具中除 `trigger_type` 外的規則欄位及 `audit_log_reason`。
- `guild_auto_moderation_rule_delete`：`guild_id`、`rule_id`，可選 `audit_log_reason`；刪除規則。

上述五個工具只管理 [Discord Auto Moderation 規則資源](https://docs.discord.com/developers/resources/auto-moderation)，MCP 不監聽訊息或執行自訂審查判斷。Discord 決定權限及規則欄位的有效性。

- `guild_emoji_list`、`guild_emoji_get`：`guild_id`，單筆另帶 `emoji_id`；讀取伺服器表情符號。
- `guild_emoji_create`：`guild_id`、`name`、`image`（Discord 支援的 image data URI），可選 `roles`、`audit_log_reason`；建立表情符號。
- `guild_emoji_modify`、`guild_emoji_delete`：`guild_id`、`emoji_id`；修改可帶 `name`、`roles`，兩者都可帶 `audit_log_reason`。
- `guild_sticker_list`、`guild_sticker_get`：`guild_id`，單筆另帶 `sticker_id`；讀取伺服器貼圖。
- `guild_sticker_create`：`guild_id`、`name`、`description`、`tags`、`file_path`，可選 `audit_log_reason`；從呼叫端指定的本機檔案建立貼圖，以 Discord `multipart/form-data` 的 `file` 欄位上傳。
- `guild_sticker_modify`、`guild_sticker_delete`：`guild_id`、`sticker_id`；修改可帶 `name`、`description`、`tags`，兩者都可帶 `audit_log_reason`。
- `sticker_get`、`sticker_pack_list`、`sticker_pack_get`：讀取任意貼圖、貼圖包列表或單一貼圖包；單筆分別帶 `sticker_id`、`pack_id`。

排程活動工具依 [Discord Guild Scheduled Event API](https://docs.discord.com/developers/resources/guild-scheduled-event) 提供：

- `guild_scheduled_event_list`：`guild_id`，可選 `with_user_count`；列出伺服器活動。
- `guild_scheduled_event_create`：`guild_id`、`name`、`privacy_level`、`scheduled_start_time`、`entity_type`，可選官方活動欄位及 `audit_log_reason`；建立活動。`EXTERNAL` 活動還需依 Discord 規定提供地點與結束時間。
- `guild_scheduled_event_get`：`guild_id`、`guild_scheduled_event_id`，可選 `with_user_count`；讀取活動。
- `guild_scheduled_event_modify`：活動識別欄位，可選官方活動修改欄位、`status` 與 `audit_log_reason`；修改活動。
- `guild_scheduled_event_delete`：活動識別欄位；刪除活動。
- `guild_scheduled_event_users_list`：活動識別欄位，可選 `limit`、`with_member`、`before`、`after`；一次讀取一頁報名使用者。

音效板工具依 [Discord Soundboard API](https://docs.discord.com/developers/resources/soundboard) 提供：

- `soundboard_default_sound_list`：列出預設音效，無參數。
- `guild_soundboard_sound_list`、`guild_soundboard_sound_get`：以 `guild_id` 列出伺服器音效；讀取單筆另帶 `sound_id`。
- `guild_soundboard_sound_create`：`guild_id`、`name`、`sound`（MP3/Ogg base64 data URI），可帶 `volume`、`emoji_id`、`emoji_name`、`audit_log_reason`。
- `guild_soundboard_sound_modify`、`guild_soundboard_sound_delete`：`guild_id`、`sound_id`，可帶 `audit_log_reason`；修改可帶 `name`、`volume`、`emoji_id`、`emoji_name`。
- `channel_soundboard_sound_send`：`channel_id`、`sound_id`，可帶 `source_guild_id`。語音連線、音效可用性及權限由 Discord 判定。

建立音效傳入官方 data URI，MCP 不轉檔或判定音訊長度；Discord 回應包含狀態、本文與相關標頭。

語音與舞台工具依 [Voice API](https://docs.discord.com/developers/resources/voice) 及 [Stage Instance API](https://docs.discord.com/developers/resources/stage-instance) 提供：

- `voice_regions_list`：列出語音區域，無參數。
- `guild_voice_state_get_current`、`guild_voice_state_get`：以 `guild_id` 讀取目前 Bot 或指定 `user_id` 的語音狀態。
- `guild_voice_state_modify_current`、`guild_voice_state_modify`：以 `guild_id` 修改目前 Bot 或指定 `user_id` 的語音狀態；保留官方 `channel_id`、`suppress`，目前 Bot 另可帶 `request_to_speak_timestamp`。
- `stage_instance_create`：以 `channel_id`、`topic` 建立舞台實例，可帶 `privacy_level`、`send_start_notification`、`guild_scheduled_event_id`、`audit_log_reason`。
- `stage_instance_get`、`stage_instance_modify`、`stage_instance_delete`：以 `channel_id` 查詢、修改或刪除舞台實例；修改可帶 `topic`、`privacy_level`、`audit_log_reason`，刪除可帶稽核原因。

語音連線、舞台頻道與主持人權限等前置條件由 Discord 判定；MCP 只轉送操作並回傳 Discord 狀態、本文及標頭。

應用程式指令工具依 [Discord Application Commands 文件](https://docs.discord.com/developers/interactions/application-commands) 提供：

- 全域指令：`application_command_list`、`application_command_create`、`application_command_bulk_overwrite`、`application_command_get`、`application_command_modify`、`application_command_delete`。工具使用 `application_id`；單筆操作另用 `command_id`；列表可帶 `with_localizations`，覆寫接受 `commands` 陣列。建立與修改 `PRIMARY_ENTRY_POINT` 指令可帶 `handler`。
- 伺服器指令：對應的 `guild_application_command_*` 六個操作，另用 `guild_id`；可讀取權限的 `guild_application_command_permissions_list` 與 `guild_application_command_permissions_get`。
- 建立與修改接受 Discord 指令欄位，如 `name`、`description`、`type`、`options`、本地化、預設成員權限、整合類型與情境。Discord 判定欄位有效性與操作權限。

更新單一指令權限的官方 `PUT` 需要使用者 OAuth Bearer token，不能只用本程序的 Bot token，因此不在目前工具表中。
- `message_get`：`channel_id`、`message_id`；呼叫 `GET /channels/{channel_id}/messages/{message_id}`。
- `message_list`：`channel_id`，可選 `around`、`before`、`after`、`limit`；呼叫 `GET /channels/{channel_id}/messages`，單次只取 Discord 回傳的一頁。
- `guild_message_search`：`guild_id`，可選 Discord 搜尋條件與 `limit`、`offset`；陣列條件以同名查詢參數重複傳送。Discord 索引尚未就緒時可能回 `202 / 110000`，由 Agent 決定是否再次呼叫。
- `message_create`：`channel_id` 加上 Discord 建立訊息的欄位，例如 `content`、`embeds`、`allowed_mentions`、`message_reference`、`components`、`poll`、`attachments`；呼叫 `POST /channels/{channel_id}/messages`。
- `message_edit`：`channel_id`、`message_id` 加上 `content`、`embeds`、`flags`、`allowed_mentions`、`components` 或 `attachments`；呼叫 `PATCH /channels/{channel_id}/messages/{message_id}`。
- `message_delete`：`channel_id`、`message_id`，可選 `audit_log_reason`；呼叫 `DELETE /channels/{channel_id}/messages/{message_id}`。
- `message_bulk_delete`：`channel_id`、`messages`（訊息 ID 陣列），可選 `audit_log_reason`；呼叫 `POST /channels/{channel_id}/messages/bulk-delete`。
- `message_crosspost`：`channel_id`、`message_id`；呼叫 `POST /channels/{channel_id}/messages/{message_id}/crosspost`，適用於公告頻道。
- `message_reaction_create`、`message_reaction_delete_own`、`message_reaction_delete_user`、`message_reaction_list`、`message_reaction_delete_emoji`、`message_reaction_delete_all`：訊息反應操作。需要表情的工具傳入 `emoji`（Unicode 或自訂表情 `name:id`），工具會做 URL 編碼；刪除指定使用者反應另帶 `user_id`。列表可帶 `type`、`after`、`limit`，一次只回傳一頁。
- `message_pin_list`：`channel_id`，可選 `before`（ISO 時間）、`limit`；依新的 `/messages/pins` 路由讀取一頁釘選。
- `message_pin`、`message_unpin`：`channel_id`、`message_id`，可選 `audit_log_reason`；依新的 `/messages/pins/{message_id}` 路由釘選或取消釘選。
- `poll_answer_voters_list`：`channel_id`、`message_id`、數字型 `answer_id`，可選 `after`、`limit`；讀取一頁投票者。
- `poll_end`：`channel_id`、`message_id`；結束 Bot 自己建立的投票。使用 `message_create` 的 `poll` 欄位建立投票；Discord 不允許 Bot 投票。

`message_create` 與 `message_edit` 可選填 `files: [{ "path": "本機檔案路徑", "filename": "可選的上傳檔名" }]`。有檔案時，工具以 `multipart/form-data` 傳送 `files[0]` 等檔案欄位，其他訊息欄位放入 `payload_json`；沒有檔案時仍使用 JSON。`attachments` 沿用 Discord 官方欄位：新檔案的 `id` 對應 `files[n]` 的索引；編輯時若指定 `attachments`，必須列出所有要保留的舊附件與新附件。工具不限制檔案路徑。大量刪除的 2–100 筆、14 天限制以及轉送所需頻道與權限由 Discord 判定，工具不做額外預檢。[Discord Message API](https://docs.discord.com/developers/resources/message)、[官方上傳說明](https://docs.discord.com/developers/reference#uploading-files)

## 互動元件與回覆

**送出元件。** `message_create` 與 `message_edit` 沿用通用的 `components` 欄位。下列是傳統訊息元件的三個按鈕；`allowed_mentions` 避免範例文字觸發提及：

```json
{
  "channel_id": "CHANNEL_ID",
  "content": "請選擇一項",
  "allowed_mentions": { "parse": [] },
  "components": [{ "type": 1, "components": [
    { "type": 2, "style": 1, "label": "選項 A", "custom_id": "choose:a" },
    { "type": 2, "style": 2, "label": "選項 B", "custom_id": "choose:b" },
    { "type": 2, "style": 2, "label": "選項 C", "custom_id": "choose:c" }
  ] }]
}
```

改用訊息元件 **String Select** 單選時，可把上述 `components` 換成：

```json
[{ "type": 1, "components": [{
  "type": 3, "custom_id": "choose:menu", "min_values": 1, "max_values": 1,
  "options": [
    { "label": "選項 A", "value": "a" },
    { "label": "選項 B", "value": "b" },
    { "label": "選項 C", "value": "c" }
  ]
}] }]
```

處理完成後可呼叫 `message_edit`，帶入原本的 `channel_id`、`message_id` 及元件，並對要停用的按鈕或選單設定 `"disabled": true`。例如將選單停用：

```json
{
  "channel_id": "CHANNEL_ID", "message_id": "MESSAGE_ID",
  "content": "已完成選擇", "allowed_mentions": { "parse": [] },
  "components": [{ "type": 1, "components": [{
    "type": 3, "custom_id": "choose:menu", "min_values": 1, "max_values": 1,
    "disabled": true,
    "options": [
      { "label": "選項 A", "value": "a" },
      { "label": "選項 B", "value": "b" },
      { "label": "選項 C", "value": "c" }
    ]
  }] }]
}
```

Components V2 訊息需設定 `flags: 32768`，文字改放在 Text Display 元件中；建立時不可同時提供傳統 `content`、`embeds`、`sticker_ids` 或 `poll`。編輯既有訊息並加上此 flag 時，也須依 Discord 規則清空原本的傳統內容。此 flag 設定後不能移除。可直接用於 `message_create`：

```json
{
  "channel_id": "CHANNEL_ID",
  "flags": 32768,
  "allowed_mentions": { "parse": [] },
  "components": [
    { "type": 10, "content": "請選擇一項" },
    { "type": 1, "components": [
      { "type": 2, "style": 1, "label": "選項 A", "custom_id": "choose:a" },
      { "type": 2, "style": 2, "label": "選項 B", "custom_id": "choose:b" },
      { "type": 2, "style": 2, "label": "選項 C", "custom_id": "choose:c" }
    ] }
  ]
}
```

**接收點擊事件。** 呼叫模組自行透過 Gateway 或 outgoing webhook 接收互動；兩者對同一 Discord 應用程式互斥。模組從事件取得 `id`、`token`、`application_id`、使用者，以及 `data.custom_id`；String Select 的選值在 `data.values`。模組自行驗證操作者、來源及操作狀態。MCP 不接收事件。

**回覆互動。** 模組應在事件送達後 3 秒內呼叫 `interaction_response_create`。以下使用 callback `type: 7` 更新被點擊的元件訊息；若只回覆點擊者，可改用 `type: 4`，並在 `data` 設定 `flags: 64`（`EPHEMERAL`）：

```json
{
  "interaction_id": "INTERACTION_ID",
  "interaction_token": "INTERACTION_TOKEN",
  "type": 7,
  "data": { "content": "已處理", "components": [], "allowed_mentions": { "parse": [] } }
}
```

耗時工作先以 `type: 5` defer，例如 `data: { "flags": 64 }`，再呼叫 `interaction_original_response_edit`：

```json
{
  "application_id": "APPLICATION_ID",
  "interaction_token": "INTERACTION_TOKEN",
  "content": "已完成",
  "allowed_mentions": { "parse": [] }
}
```

`type: 5` 的初次 callback 若帶 `flags`，只可使用 `EPHEMERAL`；原始回覆的公開狀態之後不能更改。`type: 6` 是延後更新原元件訊息，`type: 6`／`7` 僅適用元件互動及符合 Discord 規則的 Modal Submit。互動 token 約 15 分鐘有效。兩個回覆工具從參數取得 token，HTTP 請求不帶 Bot Authorization；結果保留 HTTP 狀態、本文及相關標頭，不自動重試。呼叫模組與 MCP 客戶端應避免記錄 token。[Discord 互動回覆文件](https://docs.discord.com/developers/interactions/receiving-and-responding)、[元件參考](https://docs.discord.com/developers/components/reference)

討論串工具依資源命名：

- `thread_start_from_message`：`channel_id`、`message_id`、`name`，可帶 `auto_archive_duration`、`rate_limit_per_user`、`audit_log_reason`。
- `thread_start_without_message`：`channel_id`、`name`，可帶 `type`、`invitable`、封存時長、慢速模式與稽核原因。
- `thread_start_forum`：論壇／媒體頻道的 `channel_id`、`name`、首則 `message`；可帶 `applied_tags`、`files`、封存時長、慢速模式與稽核原因。檔案路徑處理與訊息附件相同。
- `guild_thread_list_active`：`guild_id`；讀取伺服器中所有可見的活躍討論串。
- `thread_list_public_archived`、`thread_list_private_archived`：`channel_id`，可帶 `before`（ISO 時間）與 `limit`；各取一頁。
- `thread_list_joined_private_archived`：`channel_id`，可帶 `before`（thread ID）與 `limit`；取已加入的私人封存討論串一頁。
- `thread_join`、`thread_leave`：`channel_id` 為討論串 ID；加入或離開。
- `thread_member_add`、`thread_member_remove`、`thread_member_get`：討論串 `channel_id`、`user_id`；讀取工具可帶 `with_member`。
- `thread_member_list`：討論串 `channel_id`，可帶 `with_member`、`after`、`limit`；Discord v10 在 `with_member=true` 時分頁，需應用程式的 `GUILD_MEMBERS` intent。

討論串修改與刪除使用 `channel_modify`、`channel_delete`；Discord 權限與狀態由 Discord 判定。[官方 Channel Threads API](https://docs.discord.com/developers/resources/channel#start-thread-from-message)

執行 `npm test` 可用本機 HTTP 測試伺服器完成 MCP 客戶端到 Discord 請求的全流程測試。

Application tools: `application_get_current`, `application_modify_current`, `application_role_connection_metadata_get`, `application_role_connection_metadata_update`; application emojis: `application_emoji_list`, `application_emoji_create`, `application_emoji_get`, `application_emoji_modify`, `application_emoji_delete`.

Monetization tools: `sku_list`, `entitlement_list`, `entitlement_get`, `entitlement_create_test`, `entitlement_consume`, `entitlement_delete_test`, `sku_subscription_list`, `sku_subscription_get`. The caller supplies Discord pagination parameters; test entitlement writes are Discord's official test operations.

Invite tools: `channel_invite_list`, `channel_invite_create`, `guild_invite_list`, `invite_get`, `invite_delete`, plus `invite_target_user_list`, `invite_target_user_job_status`, `invite_target_user_replace`, `invite_target_user_add`, `invite_target_user_remove`, `invite_target_user_bulk_add`, and `invite_target_user_bulk_remove`. CSV upload operations read a caller supplied local path.

Webhook management tools: `channel_webhook_create`, `channel_webhook_list`, `guild_webhook_list`, `webhook_get`, `webhook_modify`, `webhook_delete`. Webhook token operations are outside the Bot token phase.

User and DM tools: `user_get`, `user_modify_current`, `user_guild_list`, `user_guild_leave`, `dm_create`. The `user_get_current` tool is in the base server; send messages through the message tools after `dm_create` returns a channel ID.

Gateway lookup tools: `gateway_get`, `gateway_bot_get`. Lobby tools: `lobby_create`, `lobby_get`, `lobby_modify`, `lobby_delete`, `lobby_member_add`, `lobby_member_remove`, `lobby_member_bulk_update`, `lobby_message_moderation_metadata_update`, `lobby_member_channel_invite_create`. Social SDK Bearer operations remain listed as exceptions in the coverage inventory.

Remaining channel tools: `channel_follow`, `channel_typing_trigger`, `voice_channel_status_set`.

Additional application information tools: `application_get`, `application_modify`, `application_activity_instance_get`, `oauth_bot_application_get`, `oauth_public_keys_get`.

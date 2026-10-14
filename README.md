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

上述五個工具只管理 [Discord Auto Moderation 規則資源](https://docs.discord.com/developers/resources/auto-moderation)，MCP 不監聽訊息或執行自訂審查判斷。Discord 決定權限及規則欄位的有效性。

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
- `message_get`：`channel_id`、`message_id`；呼叫 `GET /channels/{channel_id}/messages/{message_id}`。
- `message_list`：`channel_id`，可選 `around`、`before`、`after`、`limit`；呼叫 `GET /channels/{channel_id}/messages`，單次只取 Discord 回傳的一頁。
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

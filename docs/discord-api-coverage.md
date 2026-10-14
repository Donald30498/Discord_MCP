# Discord HTTP API 覆蓋清單

此清單是具名 MCP 工具的待辦盤點，不代表下列操作都能使用 Bot token。每項操作須對照 Discord 正式文件確認 Bot 適用性、參數與回應。

- 來源：[Discord 官方 OpenAPI v10 規格](https://github.com/discord/discord-api-spec/tree/ed014089afa986f2b532ae081c456a85de074d0c/specs)，固定於 commit ed014089afa986f2b532ae081c456a85de074d0c。
- 初始盤點：153 條路徑、246 個 HTTP 操作；全部尚未實作。
- Discord 將此規格標為預覽；若規格與[正式 API 文件](https://docs.discord.com/developers/reference)不同，以正式文件為準，也須補上正式文件中規格缺漏的操作。
- 以下按 URL 第一段分組，並非正式的工具命名分類。

Bot 適用性：待核對、可用、不適用。工具／備註欄在實作後填入工具名稱；不適用時填入原因。

## applications（33）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| GET | /applications/@me | get_my_application | 待核對 | 未實作 |
| PATCH | /applications/@me | update_my_application | 待核對 | 未實作 |
| GET | /applications/{application_id} | get_application | 待核對 | 未實作 |
| PATCH | /applications/{application_id} | update_application | 待核對 | 未實作 |
| GET | /applications/{application_id}/activity-instances/{instance_id} | applications_get_activity_instance | 待核對 | 未實作 |
| POST | /applications/{application_id}/attachment | upload_application_attachment | 待核對 | 未實作 |
| GET | /applications/{application_id}/commands | list_application_commands | 待核對 | 未實作 |
| POST | /applications/{application_id}/commands | create_application_command | 待核對 | 未實作 |
| PUT | /applications/{application_id}/commands | bulk_set_application_commands | 待核對 | 未實作 |
| DELETE | /applications/{application_id}/commands/{command_id} | delete_application_command | 待核對 | 未實作 |
| GET | /applications/{application_id}/commands/{command_id} | get_application_command | 待核對 | 未實作 |
| PATCH | /applications/{application_id}/commands/{command_id} | update_application_command | 待核對 | 未實作 |
| GET | /applications/{application_id}/emojis | list_application_emojis | 待核對 | 未實作 |
| POST | /applications/{application_id}/emojis | create_application_emoji | 待核對 | 未實作 |
| DELETE | /applications/{application_id}/emojis/{emoji_id} | delete_application_emoji | 待核對 | 未實作 |
| GET | /applications/{application_id}/emojis/{emoji_id} | get_application_emoji | 待核對 | 未實作 |
| PATCH | /applications/{application_id}/emojis/{emoji_id} | update_application_emoji | 待核對 | 未實作 |
| GET | /applications/{application_id}/entitlements | get_entitlements | 待核對 | 未實作 |
| POST | /applications/{application_id}/entitlements | create_entitlement | 待核對 | 未實作 |
| DELETE | /applications/{application_id}/entitlements/{entitlement_id} | delete_entitlement | 待核對 | 未實作 |
| GET | /applications/{application_id}/entitlements/{entitlement_id} | get_entitlement | 待核對 | 未實作 |
| POST | /applications/{application_id}/entitlements/{entitlement_id}/consume | consume_entitlement | 待核對 | 未實作 |
| GET | /applications/{application_id}/guilds/{guild_id}/commands | list_guild_application_commands | 待核對 | 未實作 |
| POST | /applications/{application_id}/guilds/{guild_id}/commands | create_guild_application_command | 待核對 | 未實作 |
| PUT | /applications/{application_id}/guilds/{guild_id}/commands | bulk_set_guild_application_commands | 待核對 | 未實作 |
| DELETE | /applications/{application_id}/guilds/{guild_id}/commands/{command_id} | delete_guild_application_command | 待核對 | 未實作 |
| GET | /applications/{application_id}/guilds/{guild_id}/commands/{command_id} | get_guild_application_command | 待核對 | 未實作 |
| PATCH | /applications/{application_id}/guilds/{guild_id}/commands/{command_id} | update_guild_application_command | 待核對 | 未實作 |
| GET | /applications/{application_id}/guilds/{guild_id}/commands/{command_id}/permissions | get_guild_application_command_permissions | 待核對 | 未實作 |
| PUT | /applications/{application_id}/guilds/{guild_id}/commands/{command_id}/permissions | set_guild_application_command_permissions | 待核對 | 未實作 |
| GET | /applications/{application_id}/guilds/{guild_id}/commands/permissions | list_guild_application_command_permissions | 待核對 | 未實作 |
| GET | /applications/{application_id}/role-connections/metadata | get_application_role_connections_metadata | 待核對 | 未實作 |
| PUT | /applications/{application_id}/role-connections/metadata | update_application_role_connections_metadata | 待核對 | 未實作 |

## channels（48）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| DELETE | /channels/{channel_id} | delete_channel | 待核對 | 未實作 |
| GET | /channels/{channel_id} | get_channel | Bot 可用 | `channel_get` 已實作 |
| PATCH | /channels/{channel_id} | update_channel | 待核對 | 未實作 |
| POST | /channels/{channel_id}/followers | follow_channel | 待核對 | 未實作 |
| GET | /channels/{channel_id}/invites | list_channel_invites | 待核對 | 未實作 |
| POST | /channels/{channel_id}/invites | create_channel_invite | 待核對 | 未實作 |
| GET | /channels/{channel_id}/messages | list_messages | 待核對 | 未實作 |
| POST | /channels/{channel_id}/messages | create_message | Bot 可用 | `message_create` 已實作 JSON 請求；檔案上傳待 T05 |
| DELETE | /channels/{channel_id}/messages/{message_id} | delete_message | Bot 可用 | `message_delete` 已實作 |
| GET | /channels/{channel_id}/messages/{message_id} | get_message | 待核對 | 未實作 |
| PATCH | /channels/{channel_id}/messages/{message_id} | update_message | Bot 可用 | `message_edit` 已實作 JSON 請求；檔案上傳待 T05 |
| POST | /channels/{channel_id}/messages/{message_id}/crosspost | crosspost_message | Bot 可用 | `message_crosspost` 已實作；限公告頻道，依 Discord 權限處理 |
| DELETE | /channels/{channel_id}/messages/{message_id}/reactions | delete_all_message_reactions | 待核對 | 未實作 |
| DELETE | /channels/{channel_id}/messages/{message_id}/reactions/{emoji_name} | delete_all_message_reactions_by_emoji | 待核對 | 未實作 |
| GET | /channels/{channel_id}/messages/{message_id}/reactions/{emoji_name} | list_message_reactions_by_emoji | 待核對 | 未實作 |
| DELETE | /channels/{channel_id}/messages/{message_id}/reactions/{emoji_name}/@me | delete_my_message_reaction | 待核對 | 未實作 |
| PUT | /channels/{channel_id}/messages/{message_id}/reactions/{emoji_name}/@me | add_my_message_reaction | 待核對 | 未實作 |
| DELETE | /channels/{channel_id}/messages/{message_id}/reactions/{emoji_name}/{user_id} | delete_user_message_reaction | 待核對 | 未實作 |
| POST | /channels/{channel_id}/messages/{message_id}/threads | create_thread_from_message | 待核對 | 未實作 |
| POST | /channels/{channel_id}/messages/bulk-delete | bulk_delete_messages | Bot 可用 | `message_bulk_delete` 已實作；2–100 筆、14 天限制由 Discord 處理 |
| GET | /channels/{channel_id}/messages/pins | list_pins | 待核對 | 未實作 |
| DELETE | /channels/{channel_id}/messages/pins/{message_id} | delete_pin | 待核對 | 未實作 |
| PUT | /channels/{channel_id}/messages/pins/{message_id} | create_pin | 待核對 | 未實作 |
| DELETE | /channels/{channel_id}/permissions/{overwrite_id} | delete_channel_permission_overwrite | 待核對 | 未實作 |
| PUT | /channels/{channel_id}/permissions/{overwrite_id} | set_channel_permission_overwrite | 待核對 | 未實作 |
| GET | /channels/{channel_id}/pins | deprecated_list_pins | 待核對 | 未實作 |
| DELETE | /channels/{channel_id}/pins/{message_id} | deprecated_delete_pin | 待核對 | 未實作 |
| PUT | /channels/{channel_id}/pins/{message_id} | deprecated_create_pin | 待核對 | 未實作 |
| GET | /channels/{channel_id}/polls/{message_id}/answers/{answer_id} | get_answer_voters | 待核對 | 未實作 |
| POST | /channels/{channel_id}/polls/{message_id}/expire | poll_expire | 待核對 | 未實作 |
| DELETE | /channels/{channel_id}/recipients/{user_id} | delete_group_dm_user | 待核對 | 未實作 |
| PUT | /channels/{channel_id}/recipients/{user_id} | add_group_dm_user | 待核對 | 未實作 |
| POST | /channels/{channel_id}/send-soundboard-sound | send_soundboard_sound | 待核對 | 未實作 |
| GET | /channels/{channel_id}/thread-members | list_thread_members | 待核對 | 未實作 |
| DELETE | /channels/{channel_id}/thread-members/@me | leave_thread | 待核對 | 未實作 |
| PUT | /channels/{channel_id}/thread-members/@me | join_thread | 待核對 | 未實作 |
| DELETE | /channels/{channel_id}/thread-members/{user_id} | delete_thread_member | 待核對 | 未實作 |
| GET | /channels/{channel_id}/thread-members/{user_id} | get_thread_member | 待核對 | 未實作 |
| PUT | /channels/{channel_id}/thread-members/{user_id} | add_thread_member | 待核對 | 未實作 |
| POST | /channels/{channel_id}/threads | create_thread | 待核對 | 未實作 |
| GET | /channels/{channel_id}/threads/archived/private | list_private_archived_threads | 待核對 | 未實作 |
| GET | /channels/{channel_id}/threads/archived/public | list_public_archived_threads | 待核對 | 未實作 |
| GET | /channels/{channel_id}/threads/search | thread_search | 待核對 | 未實作 |
| POST | /channels/{channel_id}/typing | trigger_typing_indicator | 待核對 | 未實作 |
| GET | /channels/{channel_id}/users/@me/threads/archived/private | list_my_private_archived_threads | 待核對 | 未實作 |
| PUT | /channels/{channel_id}/voice-status | update_voice_channel_status | 待核對 | 未實作 |
| GET | /channels/{channel_id}/webhooks | list_channel_webhooks | 待核對 | 未實作 |
| POST | /channels/{channel_id}/webhooks | create_webhook | 待核對 | 未實作 |

## gateway（2）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| GET | /gateway | get_gateway | 待核對 | 未實作 |
| GET | /gateway/bot | get_bot_gateway | 待核對 | 未實作 |

## guilds（91）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| GET | /guilds/{guild_id} | get_guild | Bot 可用 | `guild_get` 已實作 |
| PATCH | /guilds/{guild_id} | update_guild | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/audit-logs | list_guild_audit_log_entries | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/auto-moderation/rules | list_auto_moderation_rules | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/auto-moderation/rules | create_auto_moderation_rule | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/auto-moderation/rules/{rule_id} | delete_auto_moderation_rule | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/auto-moderation/rules/{rule_id} | get_auto_moderation_rule | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/auto-moderation/rules/{rule_id} | update_auto_moderation_rule | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/bans | list_guild_bans | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/bans/{user_id} | unban_user_from_guild | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/bans/{user_id} | get_guild_ban | 待核對 | 未實作 |
| PUT | /guilds/{guild_id}/bans/{user_id} | ban_user_from_guild | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/bulk-ban | bulk_ban_users_from_guild | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/channels | list_guild_channels | Bot 可用 | `guild_list_channels` 已實作 |
| PATCH | /guilds/{guild_id}/channels | bulk_update_guild_channels | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/channels | create_guild_channel | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/emojis | list_guild_emojis | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/emojis | create_guild_emoji | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/emojis/{emoji_id} | delete_guild_emoji | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/emojis/{emoji_id} | get_guild_emoji | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/emojis/{emoji_id} | update_guild_emoji | 待核對 | 未實作 |
| PUT | /guilds/{guild_id}/incident-actions | update_guild_incident_actions | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/integrations | list_guild_integrations | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/integrations/{integration_id} | delete_guild_integration | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/invites | list_guild_invites | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/members | list_guild_members | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/members/@me | update_my_guild_member | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/members/{user_id} | delete_guild_member | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/members/{user_id} | get_guild_member | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/members/{user_id} | update_guild_member | 待核對 | 未實作 |
| PUT | /guilds/{guild_id}/members/{user_id} | add_guild_member | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/members/{user_id}/roles/{role_id} | delete_guild_member_role | 待核對 | 未實作 |
| PUT | /guilds/{guild_id}/members/{user_id}/roles/{role_id} | add_guild_member_role | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/members/search | search_guild_members | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/messages/search | guild_search | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/new-member-welcome | get_guild_new_member_welcome | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/onboarding | get_guilds_onboarding | 待核對 | 未實作 |
| PUT | /guilds/{guild_id}/onboarding | put_guilds_onboarding | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/preview | get_guild_preview | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/prune | preview_prune_guild | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/prune | prune_guild | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/regions | list_guild_voice_regions | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/requests | get_guild_join_requests | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/requests/{request_id} | action_guild_join_request | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/roles | list_guild_roles | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/roles | bulk_update_guild_roles | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/roles | create_guild_role | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/roles/{role_id} | delete_guild_role | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/roles/{role_id} | get_guild_role | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/roles/{role_id} | update_guild_role | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/roles/member-counts | guild_role_member_counts | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/scheduled-events | list_guild_scheduled_events | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/scheduled-events | create_guild_scheduled_event | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id} | delete_guild_scheduled_event | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id} | get_guild_scheduled_event | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id} | update_guild_scheduled_event | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id}/{guild_scheduled_event_exception_id}/users | list_guild_scheduled_event_exception_users | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id}/exceptions | create_guild_scheduled_event_exception | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id}/exceptions/{exception_id} | delete_guild_scheduled_event_exception | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id}/exceptions/{exception_id} | update_guild_scheduled_event_exception | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id}/users | list_guild_scheduled_event_users | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id}/users/counts | count_guild_scheduled_event_users | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/soundboard-sounds | list_guild_soundboard_sounds | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/soundboard-sounds | create_guild_soundboard_sound | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/soundboard-sounds/{sound_id} | delete_guild_soundboard_sound | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/soundboard-sounds/{sound_id} | get_guild_soundboard_sound | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/soundboard-sounds/{sound_id} | update_guild_soundboard_sound | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/stickers | list_guild_stickers | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/stickers | create_guild_sticker | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/stickers/{sticker_id} | delete_guild_sticker | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/stickers/{sticker_id} | get_guild_sticker | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/stickers/{sticker_id} | update_guild_sticker | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/templates | list_guild_templates | 待核對 | 未實作 |
| POST | /guilds/{guild_id}/templates | create_guild_template | 待核對 | 未實作 |
| DELETE | /guilds/{guild_id}/templates/{code} | delete_guild_template | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/templates/{code} | update_guild_template | 待核對 | 未實作 |
| PUT | /guilds/{guild_id}/templates/{code} | sync_guild_template | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/threads/active | get_active_guild_threads | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/vanity-url | get_guild_vanity_url | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/voice-states/@me | get_self_voice_state | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/voice-states/@me | update_self_voice_state | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/voice-states/{user_id} | get_voice_state | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/voice-states/{user_id} | update_voice_state | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/webhooks | get_guild_webhooks | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/welcome-screen | get_guild_welcome_screen | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/welcome-screen | update_guild_welcome_screen | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/widget | get_guild_widget_settings | 待核對 | 未實作 |
| PATCH | /guilds/{guild_id}/widget | update_guild_widget_settings | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/widget.json | get_guild_widget | 待核對 | 未實作 |
| GET | /guilds/{guild_id}/widget.png | get_guild_widget_png | 待核對 | 未實作 |
| GET | /guilds/templates/{code} | get_guild_template | 待核對 | 未實作 |

## interactions（1）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| POST | /interactions/{interaction_id}/{interaction_token}/callback | create_interaction_response | 待核對 | 未實作 |

## invites（9）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| DELETE | /invites/{code} | invite_revoke | 待核對 | 未實作 |
| GET | /invites/{code} | invite_resolve | 待核對 | 未實作 |
| GET | /invites/{code}/target-users | get_invite_target_users | 待核對 | 未實作 |
| PUT | /invites/{code}/target-users | update_invite_target_users | 待核對 | 未實作 |
| DELETE | /invites/{code}/target-users/{user_id} | remove_invite_target_user | 待核對 | 未實作 |
| PUT | /invites/{code}/target-users/{user_id} | add_invite_target_user | 待核對 | 未實作 |
| POST | /invites/{code}/target-users/bulk-add | bulk_add_invite_target_users | 待核對 | 未實作 |
| POST | /invites/{code}/target-users/bulk-delete | bulk_remove_invite_target_users | 待核對 | 未實作 |
| GET | /invites/{code}/target-users/job-status | get_invite_target_users_job_status | 待核對 | 未實作 |

## lobbies（15）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| POST | /lobbies | create_lobby | 待核對 | 未實作 |
| PUT | /lobbies | create_or_join_lobby | 待核對 | 未實作 |
| DELETE | /lobbies/{lobby_id} | delete_lobby | 待核對 | 未實作 |
| GET | /lobbies/{lobby_id} | get_lobby | 待核對 | 未實作 |
| PATCH | /lobbies/{lobby_id} | edit_lobby | 待核對 | 未實作 |
| PATCH | /lobbies/{lobby_id}/channel-linking | edit_lobby_channel_link | 待核對 | 未實作 |
| DELETE | /lobbies/{lobby_id}/members/@me | leave_lobby | 待核對 | 未實作 |
| POST | /lobbies/{lobby_id}/members/@me/invites | create_linked_lobby_guild_invite_for_self | 待核對 | 未實作 |
| DELETE | /lobbies/{lobby_id}/members/{user_id} | delete_lobby_member | 待核對 | 未實作 |
| PUT | /lobbies/{lobby_id}/members/{user_id} | add_lobby_member | 待核對 | 未實作 |
| POST | /lobbies/{lobby_id}/members/{user_id}/invites | create_linked_lobby_guild_invite_for_user | 待核對 | 未實作 |
| POST | /lobbies/{lobby_id}/members/bulk | bulk_update_lobby_members | 待核對 | 未實作 |
| GET | /lobbies/{lobby_id}/messages | get_lobby_messages | 待核對 | 未實作 |
| POST | /lobbies/{lobby_id}/messages | create_lobby_message | 待核對 | 未實作 |
| PUT | /lobbies/{lobby_id}/messages/{message_id}/moderation-metadata | update_lobby_message_external_moderation_metadata | 待核對 | 未實作 |

## oauth2（4）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| GET | /oauth2/@me | get_my_oauth2_authorization | 待核對 | 未實作 |
| GET | /oauth2/applications/@me | get_my_oauth2_application | 待核對 | 未實作 |
| GET | /oauth2/keys | get_public_keys | 待核對 | 未實作 |
| GET | /oauth2/userinfo | get_openid_connect_userinfo | 待核對 | 未實作 |

## partner-sdk（5）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| PUT | /partner-sdk/dms/{user_id_1}/{user_id_2}/messages/{message_id}/moderation-metadata | update_user_message_external_moderation_metadata | 待核對 | 未實作 |
| POST | /partner-sdk/provisional-accounts/unmerge | partner_sdk_unmerge_provisional_account | 待核對 | 未實作 |
| POST | /partner-sdk/provisional-accounts/unmerge/bot | bot_partner_sdk_unmerge_provisional_account | 待核對 | 未實作 |
| POST | /partner-sdk/token | partner_sdk_token | 待核對 | 未實作 |
| POST | /partner-sdk/token/bot | bot_partner_sdk_token | 待核對 | 未實作 |

## skus（2）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| GET | /skus/{sku_id}/subscriptions | get_sku_subscriptions | 待核對 | 未實作 |
| GET | /skus/{sku_id}/subscriptions/{subscription_id} | get_sku_subscription | 待核對 | 未實作 |

## soundboard-default-sounds（1）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| GET | /soundboard-default-sounds | get_soundboard_default_sounds | 待核對 | 未實作 |

## stage-instances（4）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| POST | /stage-instances | create_stage_instance | 待核對 | 未實作 |
| DELETE | /stage-instances/{channel_id} | delete_stage_instance | 待核對 | 未實作 |
| GET | /stage-instances/{channel_id} | get_stage_instance | 待核對 | 未實作 |
| PATCH | /stage-instances/{channel_id} | update_stage_instance | 待核對 | 未實作 |

## sticker-packs（2）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| GET | /sticker-packs | list_sticker_packs | 待核對 | 未實作 |
| GET | /sticker-packs/{pack_id} | get_sticker_pack | 待核對 | 未實作 |

## stickers（1）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| GET | /stickers/{sticker_id} | get_sticker | 待核對 | 未實作 |

## users（12）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| GET | /users/@me | get_my_user | Bot token 可用 | `user_get_current`（T01） |
| PATCH | /users/@me | update_my_user | 待核對 | 未實作 |
| GET | /users/@me/applications/{application_id}/entitlements | get_current_user_application_entitlements | 待核對 | 未實作 |
| DELETE | /users/@me/applications/{application_id}/role-connection | delete_application_user_role_connection | 待核對 | 未實作 |
| GET | /users/@me/applications/{application_id}/role-connection | get_application_user_role_connection | 待核對 | 未實作 |
| PUT | /users/@me/applications/{application_id}/role-connection | update_application_user_role_connection | 待核對 | 未實作 |
| POST | /users/@me/channels | create_dm | 待核對 | 未實作 |
| GET | /users/@me/connections | list_my_connections | 待核對 | 未實作 |
| GET | /users/@me/guilds | list_my_guilds | 待核對 | 未實作 |
| DELETE | /users/@me/guilds/{guild_id} | leave_guild | 待核對 | 未實作 |
| GET | /users/@me/guilds/{guild_id}/member | get_my_guild_member | 待核對 | 未實作 |
| GET | /users/{user_id} | get_user | 待核對 | 未實作 |

## voice（1）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| GET | /voice/regions | list_voice_regions | 待核對 | 未實作 |

## webhooks（15）

| 方法 | 路徑 | 官方 operationId | Bot 適用性 | 工具／備註 |
| --- | --- | --- | --- | --- |
| DELETE | /webhooks/{webhook_id} | delete_webhook | 待核對 | 未實作 |
| GET | /webhooks/{webhook_id} | get_webhook | 待核對 | 未實作 |
| PATCH | /webhooks/{webhook_id} | update_webhook | 待核對 | 未實作 |
| DELETE | /webhooks/{webhook_id}/{webhook_token} | delete_webhook_by_token | 待核對 | 未實作 |
| GET | /webhooks/{webhook_id}/{webhook_token} | get_webhook_by_token | 待核對 | 未實作 |
| PATCH | /webhooks/{webhook_id}/{webhook_token} | update_webhook_by_token | 待核對 | 未實作 |
| POST | /webhooks/{webhook_id}/{webhook_token} | execute_webhook | 待核對 | 未實作 |
| POST | /webhooks/{webhook_id}/{webhook_token}/github | execute_github_compatible_webhook | 待核對 | 未實作 |
| DELETE | /webhooks/{webhook_id}/{webhook_token}/messages/@original | delete_original_webhook_message | 待核對 | 未實作 |
| GET | /webhooks/{webhook_id}/{webhook_token}/messages/@original | get_original_webhook_message | 待核對 | 未實作 |
| PATCH | /webhooks/{webhook_id}/{webhook_token}/messages/@original | update_original_webhook_message | 待核對 | 未實作 |
| DELETE | /webhooks/{webhook_id}/{webhook_token}/messages/{message_id} | delete_webhook_message | 待核對 | 未實作 |
| GET | /webhooks/{webhook_id}/{webhook_token}/messages/{message_id} | get_webhook_message | 待核對 | 未實作 |
| PATCH | /webhooks/{webhook_id}/{webhook_token}/messages/{message_id} | update_webhook_message | 待核對 | 未實作 |
| POST | /webhooks/{webhook_id}/{webhook_token}/slack | execute_slack_compatible_webhook | 待核對 | 未實作 |

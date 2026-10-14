import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const jsonObject = z.record(z.string(), z.unknown());
const snowflake = z.string();
const channelFields = {
  type: z.number().int().nullable().optional(),
  topic: z.string().nullable().optional(),
  bitrate: z.number().int().nullable().optional(),
  user_limit: z.number().int().nullable().optional(),
  rate_limit_per_user: z.number().int().nullable().optional(),
  position: z.number().int().nullable().optional(),
  permission_overwrites: z.array(jsonObject).nullable().optional(),
  parent_id: snowflake.nullable().optional(),
  nsfw: z.boolean().nullable().optional(),
  rtc_region: z.string().nullable().optional(),
  video_quality_mode: z.number().int().nullable().optional(),
  default_auto_archive_duration: z.number().int().nullable().optional(),
  default_reaction_emoji: jsonObject.nullable().optional(),
  available_tags: z.array(jsonObject).nullable().optional(),
  default_sort_order: z.number().int().nullable().optional(),
  default_forum_layout: z.number().int().nullable().optional(),
  default_thread_rate_limit_per_user: z.number().int().nullable().optional(),
  flags: z.number().int().nullable().optional(),
};
const auditLogReason = { audit_log_reason: z.string().optional() };

export function registerChannelWrite(server: McpServer): void {
  server.registerTool('guild_create_channel', {
    description: 'Create a guild channel (POST /guilds/{guild_id}/channels).',
    inputSchema: z.strictObject({ guild_id: snowflake, name: z.string(), ...channelFields, ...auditLogReason }),
  }, async ({ guild_id, audit_log_reason, ...body }) => discordRequest('POST', `/guilds/${encodeURIComponent(guild_id)}/channels`, body, audit_log_reason));

  server.registerTool('guild_modify_channel_positions', {
    description: 'Modify guild channel positions (PATCH /guilds/{guild_id}/channels).',
    inputSchema: z.strictObject({ guild_id: snowflake, channels: z.array(z.strictObject({
      id: snowflake,
      position: z.number().int().nullable().optional(),
      lock_permissions: z.boolean().nullable().optional(),
      parent_id: snowflake.nullable().optional(),
      flags: z.number().int().nullable().optional(),
    })), ...auditLogReason }),
  }, async ({ guild_id, channels, audit_log_reason }) => discordRequest('PATCH', `/guilds/${encodeURIComponent(guild_id)}/channels`, channels, audit_log_reason));

  server.registerTool('channel_modify', {
    description: 'Modify a channel or thread (PATCH /channels/{channel_id}).',
    inputSchema: z.strictObject({ channel_id: snowflake, name: z.string().optional(), ...channelFields,
      icon: z.string().nullable().optional(),
      archived: z.boolean().optional(),
      auto_archive_duration: z.number().int().optional(),
      locked: z.boolean().optional(),
      invitable: z.boolean().optional(),
      applied_tags: z.array(snowflake).optional(),
      ...auditLogReason }),
  }, async ({ channel_id, audit_log_reason, ...body }) => discordRequest('PATCH', `/channels/${encodeURIComponent(channel_id)}`, body, audit_log_reason));

  server.registerTool('channel_delete', {
    annotations: { destructiveHint: true },
    description: 'Delete a guild channel or thread, or close a DM (DELETE /channels/{channel_id}).',
    inputSchema: z.strictObject({ channel_id: snowflake, ...auditLogReason }),
  }, async ({ channel_id, audit_log_reason }) => discordRequest('DELETE', `/channels/${encodeURIComponent(channel_id)}`, undefined, audit_log_reason));

  server.registerTool('channel_permission_edit', {
    description: 'Edit a channel permission overwrite (PUT /channels/{channel_id}/permissions/{overwrite_id}).',
    inputSchema: z.strictObject({ channel_id: snowflake, overwrite_id: snowflake,
      type: z.number().int(), allow: z.string().nullable().optional(), deny: z.string().nullable().optional(),
      ...auditLogReason }),
  }, async ({ channel_id, overwrite_id, audit_log_reason, ...body }) => discordRequest('PUT', `/channels/${encodeURIComponent(channel_id)}/permissions/${encodeURIComponent(overwrite_id)}`, body, audit_log_reason));

  server.registerTool('channel_permission_delete', {
    annotations: { destructiveHint: true },
    description: 'Delete a channel permission overwrite (DELETE /channels/{channel_id}/permissions/{overwrite_id}).',
    inputSchema: z.strictObject({ channel_id: snowflake, overwrite_id: snowflake, ...auditLogReason }),
  }, async ({ channel_id, overwrite_id, audit_log_reason }) => discordRequest('DELETE', `/channels/${encodeURIComponent(channel_id)}/permissions/${encodeURIComponent(overwrite_id)}`, undefined, audit_log_reason));
}

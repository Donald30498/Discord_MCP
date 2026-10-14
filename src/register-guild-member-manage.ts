import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordGet, discordRequest } from './discord-http.js';

const id = z.string();
const reason = { audit_log_reason: z.string().optional() };
const guild = (guild_id: string) => `/guilds/${encodeURIComponent(guild_id)}`;
const member = (guild_id: string, user_id: string) => `${guild(guild_id)}/members/${encodeURIComponent(user_id)}`;
const ban = (guild_id: string, user_id: string) => `${guild(guild_id)}/bans/${encodeURIComponent(user_id)}`;

export function registerGuildMemberManage(server: McpServer): void {
  server.registerTool('guild_member_modify', {
    description: 'Modify a guild member (PATCH /guilds/{guild_id}/members/{user_id}).',
    inputSchema: z.strictObject({ guild_id: id, user_id: id,
      nick: z.string().nullable().optional(), roles: z.array(id).nullable().optional(),
      mute: z.boolean().nullable().optional(), deaf: z.boolean().nullable().optional(),
      channel_id: id.nullable().optional(), communication_disabled_until: z.string().nullable().optional(),
      flags: z.number().int().nullable().optional(), ...reason }),
  }, async ({ guild_id, user_id, audit_log_reason, ...body }) => discordRequest('PATCH', member(guild_id, user_id), body, audit_log_reason));

  server.registerTool('guild_member_modify_current', {
    description: 'Modify the current Bot member profile (PATCH /guilds/{guild_id}/members/@me).',
    inputSchema: z.strictObject({ guild_id: id, nick: z.string().nullable().optional(),
      banner: z.string().nullable().optional(), avatar: z.string().nullable().optional(),
      bio: z.string().nullable().optional(), ...reason }),
  }, async ({ guild_id, audit_log_reason, ...body }) => discordRequest('PATCH', `${guild(guild_id)}/members/@me`, body, audit_log_reason));

  server.registerTool('guild_member_remove', {
    description: 'Remove (kick) a guild member (DELETE /guilds/{guild_id}/members/{user_id}). This removes the member from the guild.',
    inputSchema: z.strictObject({ guild_id: id, user_id: id, ...reason }),
  }, async ({ guild_id, user_id, audit_log_reason }) => discordRequest('DELETE', member(guild_id, user_id), undefined, audit_log_reason));

  server.registerTool('guild_ban_list', {
    description: 'List one page of guild bans (GET /guilds/{guild_id}/bans).',
    inputSchema: z.strictObject({ guild_id: id, limit: z.number().int().optional(),
      before: id.optional(), after: id.optional() }),
  }, async ({ guild_id, limit, before, after }) => {
    const query = new URLSearchParams();
    if (limit !== undefined) query.set('limit', String(limit));
    if (before !== undefined) query.set('before', before);
    if (after !== undefined) query.set('after', after);
    return discordGet(`${guild(guild_id)}/bans${query.size ? `?${query}` : ''}`);
  });

  server.registerTool('guild_ban_get', {
    description: 'Get a guild ban (GET /guilds/{guild_id}/bans/{user_id}).',
    inputSchema: z.strictObject({ guild_id: id, user_id: id }),
  }, async ({ guild_id, user_id }) => discordGet(ban(guild_id, user_id)));

  server.registerTool('guild_ban_create', {
    description: 'Ban a user from a guild (PUT /guilds/{guild_id}/bans/{user_id}). This removes the member and prevents rejoining.',
    inputSchema: z.strictObject({ guild_id: id, user_id: id,
      delete_message_days: z.number().int().optional(),
      delete_message_seconds: z.number().int().optional(), ...reason }),
  }, async ({ guild_id, user_id, audit_log_reason, ...body }) => discordRequest('PUT', ban(guild_id, user_id), body, audit_log_reason));

  server.registerTool('guild_ban_delete', {
    description: 'Remove a guild ban (DELETE /guilds/{guild_id}/bans/{user_id}).',
    inputSchema: z.strictObject({ guild_id: id, user_id: id, ...reason }),
  }, async ({ guild_id, user_id, audit_log_reason }) => discordRequest('DELETE', ban(guild_id, user_id), undefined, audit_log_reason));

  server.registerTool('guild_ban_bulk_create', {
    description: 'Ban up to 200 users from a guild (POST /guilds/{guild_id}/bulk-ban). This removes members and prevents rejoining.',
    inputSchema: z.strictObject({ guild_id: id, user_ids: z.array(id),
      delete_message_seconds: z.number().int().optional(), ...reason }),
  }, async ({ guild_id, audit_log_reason, ...body }) => discordRequest('POST', `${guild(guild_id)}/bulk-ban`, body, audit_log_reason));
}

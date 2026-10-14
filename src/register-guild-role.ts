import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const snowflake = z.string();
const auditLogReason = { audit_log_reason: z.string().optional() };
const roleFields = {
  name: z.string().nullable().optional(),
  permissions: z.string().nullable().optional(),
  color: z.number().int().nullable().optional(),
  colors: z.record(z.string(), z.unknown()).nullable().optional(),
  hoist: z.boolean().nullable().optional(),
  icon: z.string().nullable().optional(),
  unicode_emoji: z.string().nullable().optional(),
  mentionable: z.boolean().nullable().optional(),
};

export function registerGuildRole(server: McpServer): void {
  server.registerTool('guild_role_list', {
    description: 'List guild roles (GET /guilds/{guild_id}/roles).',
    inputSchema: z.strictObject({ guild_id: snowflake }),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/roles`));

  server.registerTool('guild_role_get', {
    description: 'Get a guild role (GET /guilds/{guild_id}/roles/{role_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, role_id: snowflake }),
  }, async ({ guild_id, role_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/roles/${encodeURIComponent(role_id)}`));

  server.registerTool('guild_role_member_counts_get', {
    description: 'Get guild role member counts (GET /guilds/{guild_id}/roles/member-counts).',
    inputSchema: z.strictObject({ guild_id: snowflake }),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/roles/member-counts`));

  server.registerTool('guild_role_create', {
    description: 'Create a guild role (POST /guilds/{guild_id}/roles).',
    inputSchema: z.strictObject({ guild_id: snowflake, ...roleFields, ...auditLogReason }),
  }, async ({ guild_id, audit_log_reason, ...body }) =>
    discordRequest('POST', `/guilds/${encodeURIComponent(guild_id)}/roles`, body, audit_log_reason));

  server.registerTool('guild_role_positions_modify', {
    description: 'Modify guild role positions (PATCH /guilds/{guild_id}/roles).',
    inputSchema: z.strictObject({ guild_id: snowflake, roles: z.array(z.strictObject({
      id: snowflake, position: z.number().int().nullable().optional(),
    })), ...auditLogReason }),
  }, async ({ guild_id, roles, audit_log_reason }) =>
    discordRequest('PATCH', `/guilds/${encodeURIComponent(guild_id)}/roles`, roles, audit_log_reason));

  server.registerTool('guild_role_modify', {
    description: 'Modify a guild role (PATCH /guilds/{guild_id}/roles/{role_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, role_id: snowflake, ...roleFields, ...auditLogReason }),
  }, async ({ guild_id, role_id, audit_log_reason, ...body }) =>
    discordRequest('PATCH', `/guilds/${encodeURIComponent(guild_id)}/roles/${encodeURIComponent(role_id)}`, body, audit_log_reason));

  server.registerTool('guild_role_delete', {
    annotations: { destructiveHint: true },
    description: 'Delete a guild role (DELETE /guilds/{guild_id}/roles/{role_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, role_id: snowflake, ...auditLogReason }),
  }, async ({ guild_id, role_id, audit_log_reason }) =>
    discordRequest('DELETE', `/guilds/${encodeURIComponent(guild_id)}/roles/${encodeURIComponent(role_id)}`, undefined, audit_log_reason));

  server.registerTool('guild_member_role_add', {
    description: 'Add a role to a guild member (PUT /guilds/{guild_id}/members/{user_id}/roles/{role_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, user_id: snowflake, role_id: snowflake, ...auditLogReason }),
  }, async ({ guild_id, user_id, role_id, audit_log_reason }) =>
    discordRequest('PUT', `/guilds/${encodeURIComponent(guild_id)}/members/${encodeURIComponent(user_id)}/roles/${encodeURIComponent(role_id)}`, undefined, audit_log_reason));

  server.registerTool('guild_member_role_remove', {
    annotations: { destructiveHint: true },
    description: 'Remove a role from a guild member (DELETE /guilds/{guild_id}/members/{user_id}/roles/{role_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, user_id: snowflake, role_id: snowflake, ...auditLogReason }),
  }, async ({ guild_id, user_id, role_id, audit_log_reason }) =>
    discordRequest('DELETE', `/guilds/${encodeURIComponent(guild_id)}/members/${encodeURIComponent(user_id)}/roles/${encodeURIComponent(role_id)}`, undefined, audit_log_reason));
}

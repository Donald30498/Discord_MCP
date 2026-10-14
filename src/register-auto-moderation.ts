import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const snowflake = z.string();
const auditLogReason = { audit_log_reason: z.string().optional() };
const ruleFields = {
  name: z.string().optional(),
  event_type: z.number().int().optional(),
  trigger_metadata: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(z.strictObject({
    type: z.number().int(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
  enabled: z.boolean().optional(),
  exempt_roles: z.array(snowflake).optional(),
  exempt_channels: z.array(snowflake).optional(),
};

export function registerAutoModeration(server: McpServer): void {
  server.registerTool('guild_auto_moderation_rule_list', {
    description: 'List Auto Moderation rules (GET /guilds/{guild_id}/auto-moderation/rules).',
    inputSchema: z.strictObject({ guild_id: snowflake }),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/auto-moderation/rules`));

  server.registerTool('guild_auto_moderation_rule_get', {
    description: 'Get an Auto Moderation rule (GET /guilds/{guild_id}/auto-moderation/rules/{rule_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, rule_id: snowflake }),
  }, async ({ guild_id, rule_id }) =>
    discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/auto-moderation/rules/${encodeURIComponent(rule_id)}`));

  server.registerTool('guild_auto_moderation_rule_create', {
    description: 'Create an Auto Moderation rule (POST /guilds/{guild_id}/auto-moderation/rules).',
    inputSchema: z.strictObject({ guild_id: snowflake, ...ruleFields,
      name: z.string(), event_type: z.number().int(), trigger_type: z.number().int(),
      actions: ruleFields.actions.unwrap(), ...auditLogReason }),
  }, async ({ guild_id, audit_log_reason, ...body }) =>
    discordRequest('POST', `/guilds/${encodeURIComponent(guild_id)}/auto-moderation/rules`, body, audit_log_reason));

  server.registerTool('guild_auto_moderation_rule_modify', {
    description: 'Modify an Auto Moderation rule (PATCH /guilds/{guild_id}/auto-moderation/rules/{rule_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, rule_id: snowflake, ...ruleFields, ...auditLogReason }),
  }, async ({ guild_id, rule_id, audit_log_reason, ...body }) =>
    discordRequest('PATCH', `/guilds/${encodeURIComponent(guild_id)}/auto-moderation/rules/${encodeURIComponent(rule_id)}`, body, audit_log_reason));

  server.registerTool('guild_auto_moderation_rule_delete', {
    description: 'Delete an Auto Moderation rule (DELETE /guilds/{guild_id}/auto-moderation/rules/{rule_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, rule_id: snowflake, ...auditLogReason }),
  }, async ({ guild_id, rule_id, audit_log_reason }) =>
    discordRequest('DELETE', `/guilds/${encodeURIComponent(guild_id)}/auto-moderation/rules/${encodeURIComponent(rule_id)}`, undefined, audit_log_reason));
}

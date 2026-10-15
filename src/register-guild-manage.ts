import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordGet, discordRequest } from './discord-http.js';

const id = z.string();
const reason = { audit_log_reason: z.string().optional() };
const guild = (guild_id: string) => `/guilds/${encodeURIComponent(guild_id)}`;

export function registerGuildManage(server: McpServer): void {
  server.registerTool('guild_modify', {
    description: 'Modify guild settings (PATCH /guilds/{guild_id}).',
    inputSchema: z.strictObject({ guild_id: id,
      name: z.string().optional(), region: z.string().nullable().optional(),
      verification_level: z.number().int().nullable().optional(),
      default_message_notifications: z.number().int().nullable().optional(),
      explicit_content_filter: z.number().int().nullable().optional(),
      afk_channel_id: id.nullable().optional(), afk_timeout: z.number().int().optional(),
      icon: z.string().nullable().optional(), splash: z.string().nullable().optional(),
      discovery_splash: z.string().nullable().optional(), banner: z.string().nullable().optional(),
      system_channel_id: id.nullable().optional(), system_channel_flags: z.number().int().optional(),
      rules_channel_id: id.nullable().optional(), public_updates_channel_id: id.nullable().optional(),
      preferred_locale: z.string().nullable().optional(), features: z.array(z.string()).optional(),
      description: z.string().nullable().optional(), premium_progress_bar_enabled: z.boolean().optional(),
      safety_alerts_channel_id: id.nullable().optional(), ...reason }),
  }, async ({ guild_id, audit_log_reason, ...body }) => discordRequest('PATCH', guild(guild_id), body, audit_log_reason));

  server.registerTool('guild_audit_log_get', {
    description: 'Get one page of guild audit log entries (GET /guilds/{guild_id}/audit-logs).',
    inputSchema: z.strictObject({ guild_id: id, user_id: id.optional(), action_type: z.number().int().optional(),
      before: id.optional(), after: id.optional(), limit: z.number().int().optional() }),
  }, async ({ guild_id, ...params }) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, String(value));
    return discordGet(`${guild(guild_id)}/audit-logs${query.size ? `?${query}` : ''}`);
  });

  server.registerTool('guild_preview_get', {
    description: 'Get a guild preview (GET /guilds/{guild_id}/preview).',
    inputSchema: z.strictObject({ guild_id: id }),
  }, async ({ guild_id }) => discordGet(`${guild(guild_id)}/preview`));

  server.registerTool('guild_voice_regions_list', {
    description: 'List guild voice regions (GET /guilds/{guild_id}/regions).',
    inputSchema: z.strictObject({ guild_id: id }),
  }, async ({ guild_id }) => discordGet(`${guild(guild_id)}/regions`));

  server.registerTool('guild_integrations_list', {
    description: 'List guild integrations (GET /guilds/{guild_id}/integrations).',
    inputSchema: z.strictObject({ guild_id: id }),
  }, async ({ guild_id }) => discordGet(`${guild(guild_id)}/integrations`));

  server.registerTool('guild_integration_delete', {
    annotations: { destructiveHint: true },
    description: 'Delete a guild integration (DELETE /guilds/{guild_id}/integrations/{integration_id}). This also deletes associated webhooks and removes the associated Bot, if any.',
    inputSchema: z.strictObject({ guild_id: id, integration_id: id, ...reason }),
  }, async ({ guild_id, integration_id, audit_log_reason }) =>
    discordRequest('DELETE', `${guild(guild_id)}/integrations/${encodeURIComponent(integration_id)}`, undefined, audit_log_reason));

  server.registerTool('guild_vanity_url_get', {
    description: 'Get guild vanity URL (GET /guilds/{guild_id}/vanity-url).',
    inputSchema: z.strictObject({ guild_id: id }),
  }, async ({ guild_id }) => discordGet(`${guild(guild_id)}/vanity-url`));

  server.registerTool('guild_prune_count_get', {
    description: 'Get number of guild members a prune would remove (GET /guilds/{guild_id}/prune).',
    inputSchema: z.strictObject({ guild_id: id, days: z.number().int().optional(), include_roles: z.array(id).optional() }),
  }, async ({ guild_id, days, include_roles }) => {
    const query = new URLSearchParams();
    if (days !== undefined) query.set('days', String(days));
    if (include_roles !== undefined) query.set('include_roles', include_roles.join(','));
    return discordGet(`${guild(guild_id)}/prune${query.size ? `?${query}` : ''}`);
  });

  server.registerTool('guild_prune_begin', {
    annotations: { destructiveHint: true },
    description: 'Begin guild prune (POST /guilds/{guild_id}/prune). This removes inactive members.',
    inputSchema: z.strictObject({ guild_id: id, days: z.number().int().optional(),
      compute_prune_count: z.boolean().optional(), include_roles: z.array(id).optional(),
      reason: z.string().optional(), audit_log_reason: z.string().optional() }),
  }, async ({ guild_id, audit_log_reason, ...body }) =>
    discordRequest('POST', `${guild(guild_id)}/prune`, body, audit_log_reason));

  server.registerTool('guild_incident_actions_modify', {
    description: 'Modify guild incident actions (PUT /guilds/{guild_id}/incident-actions).',
    inputSchema: z.strictObject({ guild_id: id, invites_disabled_until: z.string().nullable().optional(),
      dms_disabled_until: z.string().nullable().optional() }),
  }, async ({ guild_id, ...body }) => discordRequest('PUT', `${guild(guild_id)}/incident-actions`, body));
}

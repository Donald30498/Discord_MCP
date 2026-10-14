import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const snowflake = z.string();
const eventId = { guild_scheduled_event_id: snowflake };
const reason = { audit_log_reason: z.string().optional() };
const recurrenceRule = z.strictObject({
  start: z.string(),
  frequency: z.number().int(),
  interval: z.number().int(),
  by_weekday: z.array(z.number().int()).nullable().optional(),
  by_n_weekday: z.array(z.strictObject({ n: z.number().int(), day: z.number().int() })).nullable().optional(),
  by_month: z.array(z.number().int()).nullable().optional(),
  by_month_day: z.array(z.number().int()).nullable().optional(),
});
const eventFields = {
  channel_id: snowflake.nullable().optional(),
  entity_metadata: z.strictObject({ location: z.string().optional() }).nullable().optional(),
  name: z.string().optional(),
  privacy_level: z.number().int().optional(),
  scheduled_start_time: z.string().optional(),
  scheduled_end_time: z.string().optional(),
  description: z.string().nullable().optional(),
  entity_type: z.number().int().optional(),
  image: z.string().optional(),
  recurrence_rule: recurrenceRule.nullable().optional(),
};

function query(params: Record<string, string | number | boolean | undefined>): string {
  const values = Object.entries(params).filter(([, value]) => value !== undefined);
  return values.length ? `?${new URLSearchParams(values.map(([key, value]) => [key, String(value)]))}` : '';
}

export function registerGuildScheduledEvent(server: McpServer): void {
  server.registerTool('guild_scheduled_event_list', {
    description: 'List guild scheduled events (GET /guilds/{guild_id}/scheduled-events).',
    inputSchema: z.strictObject({ guild_id: snowflake, with_user_count: z.boolean().optional() }),
  }, async ({ guild_id, with_user_count }) => discordRequest('GET',
    `/guilds/${encodeURIComponent(guild_id)}/scheduled-events${query({ with_user_count })}`));

  server.registerTool('guild_scheduled_event_create', {
    description: 'Create a guild scheduled event (POST /guilds/{guild_id}/scheduled-events).',
    inputSchema: z.strictObject({ guild_id: snowflake, ...eventFields, name: z.string(),
      privacy_level: z.number().int(), scheduled_start_time: z.string(), entity_type: z.number().int(), ...reason }),
  }, async ({ guild_id, audit_log_reason, ...body }) => discordRequest('POST',
    `/guilds/${encodeURIComponent(guild_id)}/scheduled-events`, body, audit_log_reason));

  server.registerTool('guild_scheduled_event_get', {
    description: 'Get a guild scheduled event (GET /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, ...eventId, with_user_count: z.boolean().optional() }),
  }, async ({ guild_id, guild_scheduled_event_id, with_user_count }) => discordRequest('GET',
    `/guilds/${encodeURIComponent(guild_id)}/scheduled-events/${encodeURIComponent(guild_scheduled_event_id)}${query({ with_user_count })}`));

  server.registerTool('guild_scheduled_event_modify', {
    description: 'Modify a guild scheduled event (PATCH /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, ...eventId, ...eventFields,
      status: z.number().int().optional(), ...reason }),
  }, async ({ guild_id, guild_scheduled_event_id, audit_log_reason, ...body }) => discordRequest('PATCH',
    `/guilds/${encodeURIComponent(guild_id)}/scheduled-events/${encodeURIComponent(guild_scheduled_event_id)}`,
    body, audit_log_reason));

  server.registerTool('guild_scheduled_event_delete', {
    description: 'Delete a guild scheduled event (DELETE /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, ...eventId }),
  }, async ({ guild_id, guild_scheduled_event_id }) => discordRequest('DELETE',
    `/guilds/${encodeURIComponent(guild_id)}/scheduled-events/${encodeURIComponent(guild_scheduled_event_id)}`));

  server.registerTool('guild_scheduled_event_users_list', {
    description: 'List one page of guild scheduled event users (GET /guilds/{guild_id}/scheduled-events/{guild_scheduled_event_id}/users).',
    inputSchema: z.strictObject({ guild_id: snowflake, ...eventId, limit: z.number().int().optional(),
      with_member: z.boolean().optional(), before: snowflake.optional(), after: snowflake.optional() }),
  }, async ({ guild_id, guild_scheduled_event_id, ...params }) => discordRequest('GET',
    `/guilds/${encodeURIComponent(guild_id)}/scheduled-events/${encodeURIComponent(guild_scheduled_event_id)}/users${query(params)}`));
}

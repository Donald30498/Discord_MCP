import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const id = z.string();
const reason = { audit_log_reason: z.string().optional() };

export function registerVoiceStage(server: McpServer): void {
  server.registerTool('voice_regions_list', {
    description: 'List available voice regions (GET /voice/regions).',
    inputSchema: z.strictObject({}),
  }, async () => discordRequest('GET', '/voice/regions'));

  server.registerTool('guild_voice_state_get_current', {
    description: 'Get the current Bot voice state in a guild (GET /guilds/{guild_id}/voice-states/@me).',
    inputSchema: z.strictObject({ guild_id: id }),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/voice-states/@me`));

  server.registerTool('guild_voice_state_get', {
    description: 'Get a user voice state in a guild (GET /guilds/{guild_id}/voice-states/{user_id}).',
    inputSchema: z.strictObject({ guild_id: id, user_id: id }),
  }, async ({ guild_id, user_id }) =>
    discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/voice-states/${encodeURIComponent(user_id)}`));

  server.registerTool('guild_voice_state_modify_current', {
    description: 'Modify the current Bot voice state (PATCH /guilds/{guild_id}/voice-states/@me).',
    inputSchema: z.strictObject({ guild_id: id, channel_id: id.optional(), suppress: z.boolean().optional(),
      request_to_speak_timestamp: z.string().nullable().optional() }),
  }, async ({ guild_id, ...body }) =>
    discordRequest('PATCH', `/guilds/${encodeURIComponent(guild_id)}/voice-states/@me`, body));

  server.registerTool('guild_voice_state_modify', {
    description: 'Modify a user voice state (PATCH /guilds/{guild_id}/voice-states/{user_id}).',
    inputSchema: z.strictObject({ guild_id: id, user_id: id, channel_id: id.optional(), suppress: z.boolean().optional() }),
  }, async ({ guild_id, user_id, ...body }) =>
    discordRequest('PATCH', `/guilds/${encodeURIComponent(guild_id)}/voice-states/${encodeURIComponent(user_id)}`, body));

  server.registerTool('stage_instance_create', {
    description: 'Create a Stage instance (POST /stage-instances).',
    inputSchema: z.strictObject({ channel_id: id, topic: z.string(), privacy_level: z.number().optional(),
      send_start_notification: z.boolean().optional(), guild_scheduled_event_id: id.optional(), ...reason }),
  }, async ({ audit_log_reason, ...body }) => discordRequest('POST', '/stage-instances', body, audit_log_reason));

  server.registerTool('stage_instance_get', {
    description: 'Get a Stage instance (GET /stage-instances/{channel_id}).',
    inputSchema: z.strictObject({ channel_id: id }),
  }, async ({ channel_id }) => discordRequest('GET', `/stage-instances/${encodeURIComponent(channel_id)}`));

  server.registerTool('stage_instance_modify', {
    description: 'Modify a Stage instance (PATCH /stage-instances/{channel_id}).',
    inputSchema: z.strictObject({ channel_id: id, topic: z.string().optional(), privacy_level: z.number().optional(), ...reason }),
  }, async ({ channel_id, audit_log_reason, ...body }) =>
    discordRequest('PATCH', `/stage-instances/${encodeURIComponent(channel_id)}`, body, audit_log_reason));

  server.registerTool('stage_instance_delete', {
    annotations: { destructiveHint: true },
    description: 'Delete a Stage instance (DELETE /stage-instances/{channel_id}).',
    inputSchema: z.strictObject({ channel_id: id, ...reason }),
  }, async ({ channel_id, audit_log_reason }) =>
    discordRequest('DELETE', `/stage-instances/${encodeURIComponent(channel_id)}`, undefined, audit_log_reason));
}

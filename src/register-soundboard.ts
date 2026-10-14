import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const snowflake = z.string();
const reason = { audit_log_reason: z.string().optional() };
const soundFields = {
  name: z.string().optional(),
  volume: z.number().nullable().optional(),
  emoji_id: snowflake.nullable().optional(),
  emoji_name: z.string().nullable().optional(),
};

export function registerSoundboard(server: McpServer): void {
  server.registerTool('soundboard_default_sound_list', {
    description: 'List default soundboard sounds (GET /soundboard-default-sounds).',
    inputSchema: z.strictObject({}),
  }, async () => discordRequest('GET', '/soundboard-default-sounds'));

  server.registerTool('guild_soundboard_sound_list', {
    description: 'List guild soundboard sounds (GET /guilds/{guild_id}/soundboard-sounds).',
    inputSchema: z.strictObject({ guild_id: snowflake }),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/soundboard-sounds`));

  server.registerTool('guild_soundboard_sound_get', {
    description: 'Get a guild soundboard sound (GET /guilds/{guild_id}/soundboard-sounds/{sound_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, sound_id: snowflake }),
  }, async ({ guild_id, sound_id }) =>
    discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/soundboard-sounds/${encodeURIComponent(sound_id)}`));

  server.registerTool('guild_soundboard_sound_create', {
    description: 'Create a guild soundboard sound (POST /guilds/{guild_id}/soundboard-sounds).',
    inputSchema: z.strictObject({ guild_id: snowflake, ...soundFields, name: z.string(), sound: z.string(), ...reason }),
  }, async ({ guild_id, audit_log_reason, ...body }) =>
    discordRequest('POST', `/guilds/${encodeURIComponent(guild_id)}/soundboard-sounds`, body, audit_log_reason));

  server.registerTool('guild_soundboard_sound_modify', {
    description: 'Modify a guild soundboard sound (PATCH /guilds/{guild_id}/soundboard-sounds/{sound_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, sound_id: snowflake, ...soundFields, ...reason }),
  }, async ({ guild_id, sound_id, audit_log_reason, ...body }) =>
    discordRequest('PATCH', `/guilds/${encodeURIComponent(guild_id)}/soundboard-sounds/${encodeURIComponent(sound_id)}`, body, audit_log_reason));

  server.registerTool('guild_soundboard_sound_delete', {
    description: 'Delete a guild soundboard sound (DELETE /guilds/{guild_id}/soundboard-sounds/{sound_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, sound_id: snowflake, ...reason }),
  }, async ({ guild_id, sound_id, audit_log_reason }) =>
    discordRequest('DELETE', `/guilds/${encodeURIComponent(guild_id)}/soundboard-sounds/${encodeURIComponent(sound_id)}`,
      undefined, audit_log_reason));

  server.registerTool('channel_soundboard_sound_send', {
    description: 'Send a soundboard sound to a voice channel (POST /channels/{channel_id}/send-soundboard-sound).',
    inputSchema: z.strictObject({ channel_id: snowflake, sound_id: snowflake, source_guild_id: snowflake.optional() }),
  }, async ({ channel_id, ...body }) =>
    discordRequest('POST', `/channels/${encodeURIComponent(channel_id)}/send-soundboard-sound`, body));
}

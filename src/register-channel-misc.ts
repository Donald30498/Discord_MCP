import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const id = z.string();
const channelPath = (channelId: string) => `/channels/${encodeURIComponent(channelId)}`;

export function registerChannelMisc(server: McpServer): void {
  server.registerTool('channel_follow', {
    description: 'Follow an announcement channel (POST /channels/{channel_id}/followers).',
    inputSchema: z.strictObject({ channel_id: id, webhook_channel_id: id,
      audit_log_reason: z.string().optional() }),
  }, async ({ channel_id, webhook_channel_id, audit_log_reason }) => discordRequest('POST',
    `${channelPath(channel_id)}/followers`, { webhook_channel_id }, audit_log_reason));

  server.registerTool('channel_typing_trigger', {
    description: 'Trigger a typing indicator (POST /channels/{channel_id}/typing).',
    inputSchema: z.strictObject({ channel_id: id }),
  }, async ({ channel_id }) => discordRequest('POST', `${channelPath(channel_id)}/typing`));

  server.registerTool('voice_channel_status_set', {
    description: 'Set a voice channel status (PUT /channels/{channel_id}/voice-status).',
    inputSchema: z.strictObject({ channel_id: id, status: z.string().nullable(),
      audit_log_reason: z.string().optional() }),
  }, async ({ channel_id, status, audit_log_reason }) => discordRequest('PUT',
    `${channelPath(channel_id)}/voice-status`, { status }, audit_log_reason));
}

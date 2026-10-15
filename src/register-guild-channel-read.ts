import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordGet } from './discord-http.js';

export function registerGuildChannelRead(server: McpServer): void {
  server.registerTool(
    'guild_get',
    {
      description: 'Get a guild (GET /guilds/{guild_id}).',
      inputSchema: z.strictObject({ guild_id: z.string(), with_counts: z.boolean().optional() }),
    },
    async ({ guild_id, with_counts }) => discordGet(
      `/guilds/${encodeURIComponent(guild_id)}${with_counts === undefined ? '' : `?with_counts=${with_counts}`}`,
    ),
  );
  server.registerTool(
    'guild_list_channels',
    {
      description: 'Get guild channels, excluding threads (GET /guilds/{guild_id}/channels).',
      inputSchema: z.strictObject({ guild_id: z.string() }),
    },
    async ({ guild_id }) => discordGet(`/guilds/${encodeURIComponent(guild_id)}/channels`),
  );
  server.registerTool(
    'channel_get',
    {
      description: 'Get a channel by ID (GET /channels/{channel_id}).',
      inputSchema: z.strictObject({ channel_id: z.string() }),
    },
    async ({ channel_id }) => discordGet(`/channels/${encodeURIComponent(channel_id)}`),
  );
}

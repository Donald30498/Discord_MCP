import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordGet } from './discord-http.js';

export function registerGuildMemberRead(server: McpServer): void {
  server.registerTool(
    'guild_member_get',
    {
      description: 'Get a guild member (GET /guilds/{guild_id}/members/{user_id}).',
      inputSchema: z.strictObject({ guild_id: z.string(), user_id: z.string() }),
    },
    async ({ guild_id, user_id }) => discordGet(
      `/guilds/${encodeURIComponent(guild_id)}/members/${encodeURIComponent(user_id)}`,
    ),
  );
  server.registerTool(
    'guild_member_list',
    {
      description: 'List one page of guild members (GET /guilds/{guild_id}/members). Requires GUILD_MEMBERS privileged intent.',
      inputSchema: z.strictObject({ guild_id: z.string(), limit: z.number().int().optional(), after: z.string().optional() }),
    },
    async ({ guild_id, limit, after }) => {
      const query = [
        ...(limit === undefined ? [] : [`limit=${limit}`]),
        ...(after === undefined ? [] : [`after=${encodeURIComponent(after)}`]),
      ].join('&');
      return discordGet(`/guilds/${encodeURIComponent(guild_id)}/members${query ? `?${query}` : ''}`);
    },
  );
  server.registerTool(
    'guild_member_search',
    {
      description: 'Search guild members by username or nickname prefix (GET /guilds/{guild_id}/members/search).',
      inputSchema: z.strictObject({ guild_id: z.string(), query: z.string(), limit: z.number().int().optional() }),
    },
    async ({ guild_id, query, limit }) => discordGet(
      `/guilds/${encodeURIComponent(guild_id)}/members/search?query=${encodeURIComponent(query)}${limit === undefined ? '' : `&limit=${limit}`}`,
    ),
  );
}

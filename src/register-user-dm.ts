import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const id = z.string();

export function registerUserDm(server: McpServer): void {
  server.registerTool('user_get', {
    description: 'Get a user (GET /users/{user_id}).', inputSchema: z.strictObject({ user_id: id }),
  }, async ({ user_id }) => discordRequest('GET', `/users/${encodeURIComponent(user_id)}`));

  server.registerTool('user_modify_current', {
    description: 'Modify current Bot user (PATCH /users/@me).',
    inputSchema: z.strictObject({ username: z.string().optional(), avatar: z.string().nullable().optional(),
      banner: z.string().nullable().optional() }),
  }, async (body) => discordRequest('PATCH', '/users/@me', body));

  server.registerTool('user_guild_list', {
    description: 'List current Bot guilds, one Discord page (GET /users/@me/guilds).',
    inputSchema: z.strictObject({ before: id.optional(), after: id.optional(), limit: z.number().int().optional(),
      shard: z.number().int().optional(), with_counts: z.boolean().optional() }),
  }, async (params) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, String(value));
    return discordRequest('GET', `/users/@me/guilds${search.size ? `?${search}` : ''}`);
  });

  server.registerTool('user_guild_leave', {
    annotations: { destructiveHint: true },
    description: 'Leave a guild as the current Bot user (DELETE /users/@me/guilds/{guild_id}).',
    inputSchema: z.strictObject({ guild_id: id }),
  }, async ({ guild_id }) => discordRequest('DELETE', `/users/@me/guilds/${encodeURIComponent(guild_id)}`));

  server.registerTool('dm_create', {
    description: 'Create or get a DM with recipient (POST /users/@me/channels). Use message tools with returned channel ID.',
    inputSchema: z.strictObject({ recipient_id: id }),
  }, async ({ recipient_id }) => discordRequest('POST', '/users/@me/channels', { recipient_id }));
}

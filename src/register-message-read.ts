import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordGet } from './discord-http.js';

export function registerMessageRead(server: McpServer): void {
  server.registerTool(
    'message_get',
    {
      description: 'Get a channel message (GET /channels/{channel_id}/messages/{message_id}).',
      inputSchema: z.strictObject({ channel_id: z.string(), message_id: z.string() }),
    },
    async ({ channel_id, message_id }) => discordGet(
      `/channels/${encodeURIComponent(channel_id)}/messages/${encodeURIComponent(message_id)}`,
    ),
  );
  server.registerTool(
    'message_list',
    {
      description: 'List one page of channel messages (GET /channels/{channel_id}/messages).',
      inputSchema: z.strictObject({
        channel_id: z.string(),
        around: z.string().optional(),
        before: z.string().optional(),
        after: z.string().optional(),
        limit: z.number().int().optional(),
      }),
    },
    async ({ channel_id, around, before, after, limit }) => {
      const query = new URLSearchParams();
      if (around !== undefined) query.set('around', around);
      if (before !== undefined) query.set('before', before);
      if (after !== undefined) query.set('after', after);
      if (limit !== undefined) query.set('limit', String(limit));
      const suffix = query.size ? `?${query}` : '';
      return discordGet(`/channels/${encodeURIComponent(channel_id)}/messages${suffix}`);
    },
  );
  server.registerTool(
    'guild_message_search',
    {
      description: 'Search one page of guild messages (GET /guilds/{guild_id}/messages/search).',
      inputSchema: z.strictObject({
        guild_id: z.string(),
        limit: z.number().int().optional(),
        offset: z.number().int().optional(),
        max_id: z.string().optional(),
        min_id: z.string().optional(),
        slop: z.number().int().optional(),
        content: z.string().optional(),
        channel_id: z.array(z.string()).optional(),
        author_type: z.array(z.string()).optional(),
        author_id: z.array(z.string()).optional(),
        mentions: z.array(z.string()).optional(),
        mentions_role_id: z.array(z.string()).optional(),
        mention_everyone: z.boolean().optional(),
        replied_to_user_id: z.array(z.string()).optional(),
        replied_to_message_id: z.array(z.string()).optional(),
        pinned: z.boolean().optional(),
        has: z.array(z.string()).optional(),
        embed_type: z.array(z.string()).optional(),
        embed_provider: z.array(z.string()).optional(),
        link_hostname: z.array(z.string()).optional(),
        attachment_filename: z.array(z.string()).optional(),
        attachment_extension: z.array(z.string()).optional(),
        sort_by: z.string().optional(),
        sort_order: z.string().optional(),
        include_nsfw: z.boolean().optional(),
      }),
    },
    async ({ guild_id, ...filters }) => {
      const query = new URLSearchParams();
      for (const [name, value] of Object.entries(filters)) {
        if (Array.isArray(value)) {
          for (const item of value) query.append(name, item);
        } else if (value !== undefined) {
          query.set(name, String(value));
        }
      }
      return discordGet(`/guilds/${encodeURIComponent(guild_id)}/messages/search${query.size ? `?${query}` : ''}`);
    },
  );
}

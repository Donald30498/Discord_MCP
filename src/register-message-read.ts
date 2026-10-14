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
}

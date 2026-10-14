import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const jsonObject = z.record(z.string(), z.unknown());
const createFields = {
  content: z.string().optional(),
  nonce: z.union([z.string(), z.number()]).optional(),
  tts: z.boolean().optional(),
  embeds: z.array(jsonObject).optional(),
  allowed_mentions: jsonObject.optional(),
  message_reference: jsonObject.optional(),
  components: z.array(jsonObject).optional(),
  sticker_ids: z.array(z.string()).optional(),
  attachments: z.array(jsonObject).optional(),
  flags: z.number().int().optional(),
  enforce_nonce: z.boolean().optional(),
  poll: jsonObject.optional(),
  shared_client_theme: jsonObject.optional(),
};
const editFields = {
  content: z.string().nullable().optional(),
  embeds: z.array(jsonObject).nullable().optional(),
  flags: z.number().int().nullable().optional(),
  allowed_mentions: jsonObject.nullable().optional(),
  components: z.array(jsonObject).nullable().optional(),
  attachments: z.array(jsonObject).nullable().optional(),
};

export function registerMessageWrite(server: McpServer): void {
  server.registerTool('message_create', {
    description: 'Create a message (POST /channels/{channel_id}/messages).',
    inputSchema: z.strictObject({ channel_id: z.string(), ...createFields }),
  }, async ({ channel_id, ...body }) => discordRequest('POST', `/channels/${encodeURIComponent(channel_id)}/messages`, body));

  server.registerTool('message_edit', {
    description: 'Edit a message (PATCH /channels/{channel_id}/messages/{message_id}).',
    inputSchema: z.strictObject({ channel_id: z.string(), message_id: z.string(), ...editFields }),
  }, async ({ channel_id, message_id, ...body }) => discordRequest('PATCH', `/channels/${encodeURIComponent(channel_id)}/messages/${encodeURIComponent(message_id)}`, body));

  server.registerTool('message_delete', {
    description: 'Delete a message (DELETE /channels/{channel_id}/messages/{message_id}).',
    inputSchema: z.strictObject({ channel_id: z.string(), message_id: z.string(), audit_log_reason: z.string().optional() }),
  }, async ({ channel_id, message_id, audit_log_reason }) => discordRequest('DELETE', `/channels/${encodeURIComponent(channel_id)}/messages/${encodeURIComponent(message_id)}`, undefined, audit_log_reason));

  server.registerTool('message_bulk_delete', {
    description: 'Bulk delete messages (POST /channels/{channel_id}/messages/bulk-delete).',
    inputSchema: z.strictObject({ channel_id: z.string(), messages: z.array(z.string()), audit_log_reason: z.string().optional() }),
  }, async ({ channel_id, messages, audit_log_reason }) => discordRequest('POST', `/channels/${encodeURIComponent(channel_id)}/messages/bulk-delete`, { messages }, audit_log_reason));

  server.registerTool('message_crosspost', {
    description: 'Crosspost an announcement message (POST /channels/{channel_id}/messages/{message_id}/crosspost).',
    inputSchema: z.strictObject({ channel_id: z.string(), message_id: z.string() }),
  }, async ({ channel_id, message_id }) => discordRequest('POST', `/channels/${encodeURIComponent(channel_id)}/messages/${encodeURIComponent(message_id)}/crosspost`));
}

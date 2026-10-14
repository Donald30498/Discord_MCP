import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const id = z.string();
const webhookPath = (webhookId: string) => `/webhooks/${encodeURIComponent(webhookId)}`;

export function registerWebhook(server: McpServer): void {
  server.registerTool('channel_webhook_create', {
    description: 'Create a channel webhook (POST /channels/{channel_id}/webhooks).',
    inputSchema: z.strictObject({ channel_id: id, name: z.string(), avatar: z.string().nullable().optional(),
      audit_log_reason: z.string().optional() }),
  }, async ({ channel_id, audit_log_reason, ...body }) => discordRequest('POST',
    `/channels/${encodeURIComponent(channel_id)}/webhooks`, body, audit_log_reason));

  server.registerTool('channel_webhook_list', {
    description: 'List channel webhooks (GET /channels/{channel_id}/webhooks).',
    inputSchema: z.strictObject({ channel_id: id }),
  }, async ({ channel_id }) => discordRequest('GET', `/channels/${encodeURIComponent(channel_id)}/webhooks`));

  server.registerTool('guild_webhook_list', {
    description: 'List guild webhooks (GET /guilds/{guild_id}/webhooks).',
    inputSchema: z.strictObject({ guild_id: id }),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/webhooks`));

  server.registerTool('webhook_get', {
    description: 'Get a webhook with Bot authorization (GET /webhooks/{webhook_id}).',
    inputSchema: z.strictObject({ webhook_id: id }),
  }, async ({ webhook_id }) => discordRequest('GET', webhookPath(webhook_id)));

  server.registerTool('webhook_modify', {
    description: 'Modify a webhook with Bot authorization (PATCH /webhooks/{webhook_id}).',
    inputSchema: z.strictObject({ webhook_id: id, name: z.string().optional(),
      avatar: z.string().nullable().optional(), channel_id: id.optional(),
      audit_log_reason: z.string().optional() }),
  }, async ({ webhook_id, audit_log_reason, ...body }) => discordRequest('PATCH',
    webhookPath(webhook_id), body, audit_log_reason));

  server.registerTool('webhook_delete', {
    description: 'Delete a webhook with Bot authorization (DELETE /webhooks/{webhook_id}).',
    inputSchema: z.strictObject({ webhook_id: id, audit_log_reason: z.string().optional() }),
  }, async ({ webhook_id, audit_log_reason }) => discordRequest('DELETE',
    webhookPath(webhook_id), undefined, audit_log_reason));
}

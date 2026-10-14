import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const id = z.string();
const appPath = (applicationId: string) => `/applications/${encodeURIComponent(applicationId)}`;
const emojiPath = (applicationId: string) => `${appPath(applicationId)}/emojis`;

export function registerApplicationResource(server: McpServer): void {
  server.registerTool('application_get_current', {
    description: 'Get the current application (GET /applications/@me).', inputSchema: z.strictObject({}),
  }, async () => discordRequest('GET', '/applications/@me'));

  server.registerTool('application_modify_current', {
    description: 'Modify the current application (PATCH /applications/@me).',
    inputSchema: z.strictObject({ description: z.string().optional(), icon: z.string().nullable().optional(),
      cover_image: z.string().nullable().optional(), tags: z.array(z.string()).optional(),
      install_params: z.record(z.string(), z.unknown()).nullable().optional(),
      interactions_endpoint_url: z.string().nullable().optional(),
      event_webhooks_url: z.string().nullable().optional(), event_webhooks_status: z.number().int().optional(),
      event_webhooks_types: z.array(z.string()).optional(),
      role_connections_verification_url: z.string().nullable().optional(),
      custom_install_url: z.string().nullable().optional(),
      integration_types_config: z.record(z.string(), z.unknown()).optional() }),
  }, async (body) => discordRequest('PATCH', '/applications/@me', body));

  server.registerTool('application_role_connection_metadata_get', {
    description: 'Get application role connection metadata (GET /applications/{application_id}/role-connections/metadata).',
    inputSchema: z.strictObject({ application_id: id }),
  }, async ({ application_id }) => discordRequest('GET', `${appPath(application_id)}/role-connections/metadata`));

  server.registerTool('application_role_connection_metadata_update', {
    description: 'Replace application role connection metadata (PUT /applications/{application_id}/role-connections/metadata).',
    inputSchema: z.strictObject({ application_id: id, records: z.array(z.record(z.string(), z.unknown())) }),
  }, async ({ application_id, records }) => discordRequest('PUT', `${appPath(application_id)}/role-connections/metadata`, records));

  server.registerTool('application_emoji_list', {
    description: 'List application emojis (GET /applications/{application_id}/emojis).',
    inputSchema: z.strictObject({ application_id: id }),
  }, async ({ application_id }) => discordRequest('GET', emojiPath(application_id)));

  server.registerTool('application_emoji_create', {
    description: 'Create application emoji with an image data URI (POST /applications/{application_id}/emojis).',
    inputSchema: z.strictObject({ application_id: id, name: z.string(), image: z.string() }),
  }, async ({ application_id, ...body }) => discordRequest('POST', emojiPath(application_id), body));

  server.registerTool('application_emoji_get', {
    description: 'Get application emoji (GET /applications/{application_id}/emojis/{emoji_id}).',
    inputSchema: z.strictObject({ application_id: id, emoji_id: id }),
  }, async ({ application_id, emoji_id }) => discordRequest('GET', `${emojiPath(application_id)}/${encodeURIComponent(emoji_id)}`));

  server.registerTool('application_emoji_modify', {
    description: 'Modify application emoji (PATCH /applications/{application_id}/emojis/{emoji_id}).',
    inputSchema: z.strictObject({ application_id: id, emoji_id: id, name: z.string() }),
  }, async ({ application_id, emoji_id, name }) => discordRequest('PATCH',
    `${emojiPath(application_id)}/${encodeURIComponent(emoji_id)}`, { name }));

  server.registerTool('application_emoji_delete', {
    description: 'Delete application emoji (DELETE /applications/{application_id}/emojis/{emoji_id}).',
    inputSchema: z.strictObject({ application_id: id, emoji_id: id }),
  }, async ({ application_id, emoji_id }) => discordRequest('DELETE',
    `${emojiPath(application_id)}/${encodeURIComponent(emoji_id)}`));
}

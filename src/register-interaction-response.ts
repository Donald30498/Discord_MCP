import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordInteractionRequest } from './discord-http.js';

const jsonObject = z.record(z.string(), z.unknown());

export function registerInteractionResponse(server: McpServer): void {
  server.registerTool('interaction_response_create', {
    description: 'Send an initial interaction callback (POST /interactions/{interaction_id}/{interaction_token}/callback).',
    inputSchema: z.strictObject({ interaction_id: z.string(), interaction_token: z.string(),
      type: z.number().int(), data: jsonObject.optional() }),
  }, async ({ interaction_id, interaction_token, type, data }) => discordInteractionRequest('POST',
    `/interactions/${encodeURIComponent(interaction_id)}/${encodeURIComponent(interaction_token)}/callback`,
    interaction_token, { type, ...(data === undefined ? {} : { data }) }));

  server.registerTool('interaction_original_response_edit', {
    description: 'Edit the original interaction response (PATCH /webhooks/{application_id}/{interaction_token}/messages/@original).',
    inputSchema: z.strictObject({ application_id: z.string(), interaction_token: z.string(),
      content: z.string().nullable().optional(), embeds: z.array(jsonObject).nullable().optional(),
      flags: z.number().int().nullable().optional(), allowed_mentions: jsonObject.nullable().optional(),
      components: z.array(jsonObject).nullable().optional(), attachments: z.array(jsonObject).nullable().optional(),
      poll: jsonObject.optional() }),
  }, async ({ application_id, interaction_token, ...body }) => discordInteractionRequest('PATCH',
    `/webhooks/${encodeURIComponent(application_id)}/${encodeURIComponent(interaction_token)}/messages/@original${body.components === undefined ? '' : '?with_components=true'}`,
    interaction_token, body));
}

import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const id = z.string();
const entitlementPath = (applicationId: string) => `/applications/${encodeURIComponent(applicationId)}/entitlements`;
const subscriptionPath = (skuId: string) => `/skus/${encodeURIComponent(skuId)}/subscriptions`;
const query = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, String(value));
  return search.size ? `?${search}` : '';
};

export function registerMonetization(server: McpServer): void {
  server.registerTool('sku_list', {
    description: 'List application SKUs (GET /applications/{application_id}/skus).',
    inputSchema: z.strictObject({ application_id: id }),
  }, async ({ application_id }) => discordRequest('GET', `/applications/${encodeURIComponent(application_id)}/skus`));

  server.registerTool('entitlement_list', {
    description: 'List application entitlements, one Discord page (GET /applications/{application_id}/entitlements).',
    inputSchema: z.strictObject({ application_id: id, user_id: id.optional(), sku_ids: z.string().optional(),
      before: id.optional(), after: id.optional(), limit: z.number().int().optional(), guild_id: id.optional(),
      exclude_ended: z.boolean().optional(), exclude_deleted: z.boolean().optional() }),
  }, async ({ application_id, ...params }) => discordRequest('GET', `${entitlementPath(application_id)}${query(params)}`));

  server.registerTool('entitlement_get', {
    description: 'Get an entitlement (GET /applications/{application_id}/entitlements/{entitlement_id}).',
    inputSchema: z.strictObject({ application_id: id, entitlement_id: id }),
  }, async ({ application_id, entitlement_id }) => discordRequest('GET',
    `${entitlementPath(application_id)}/${encodeURIComponent(entitlement_id)}`));

  server.registerTool('entitlement_create_test', {
    description: 'Create a Discord test entitlement (POST /applications/{application_id}/entitlements).',
    inputSchema: z.strictObject({ application_id: id, sku_id: id, owner_id: id, owner_type: z.number().int() }),
  }, async ({ application_id, ...body }) => discordRequest('POST', entitlementPath(application_id), body));

  server.registerTool('entitlement_consume', {
    annotations: { destructiveHint: true },
    description: 'Consume an entitlement (POST /applications/{application_id}/entitlements/{entitlement_id}/consume).',
    inputSchema: z.strictObject({ application_id: id, entitlement_id: id }),
  }, async ({ application_id, entitlement_id }) => discordRequest('POST',
    `${entitlementPath(application_id)}/${encodeURIComponent(entitlement_id)}/consume`));

  server.registerTool('entitlement_delete_test', {
    annotations: { destructiveHint: true },
    description: 'Delete a Discord test entitlement (DELETE /applications/{application_id}/entitlements/{entitlement_id}).',
    inputSchema: z.strictObject({ application_id: id, entitlement_id: id }),
  }, async ({ application_id, entitlement_id }) => discordRequest('DELETE',
    `${entitlementPath(application_id)}/${encodeURIComponent(entitlement_id)}`));

  server.registerTool('sku_subscription_list', {
    description: 'List SKU subscriptions for a user, one Discord page (GET /skus/{sku_id}/subscriptions).',
    inputSchema: z.strictObject({ sku_id: id, user_id: id, before: id.optional(), after: id.optional(),
      limit: z.number().int().optional() }),
  }, async ({ sku_id, ...params }) => discordRequest('GET', `${subscriptionPath(sku_id)}${query(params)}`));

  server.registerTool('sku_subscription_get', {
    description: 'Get SKU subscription (GET /skus/{sku_id}/subscriptions/{subscription_id}).',
    inputSchema: z.strictObject({ sku_id: id, subscription_id: id }),
  }, async ({ sku_id, subscription_id }) => discordRequest('GET',
    `${subscriptionPath(sku_id)}/${encodeURIComponent(subscription_id)}`));
}

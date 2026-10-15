import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';
import { applicationFields } from './register-application-resource.js';

const id = z.string();
const appPath = (applicationId: string) => `/applications/${encodeURIComponent(applicationId)}`;

export function registerApplicationExtra(server: McpServer): void {
  server.registerTool('application_get', {
    description: 'Get an application by ID (GET /applications/{application_id}).',
    inputSchema: z.strictObject({ application_id: id }),
  }, async ({ application_id }) => discordRequest('GET', appPath(application_id)));

  server.registerTool('application_modify', {
    description: 'Modify an application by ID (PATCH /applications/{application_id}).',
    inputSchema: z.strictObject({ application_id: id, ...applicationFields }),
  }, async ({ application_id, ...body }) => discordRequest('PATCH', appPath(application_id), body));

  server.registerTool('application_activity_instance_get', {
    description: 'Get an application activity instance (GET /applications/{application_id}/activity-instances/{instance_id}).',
    inputSchema: z.strictObject({ application_id: id, instance_id: id }),
  }, async ({ application_id, instance_id }) => discordRequest('GET',
    `${appPath(application_id)}/activity-instances/${encodeURIComponent(instance_id)}`));

  server.registerTool('oauth_bot_application_get', {
    description: 'Get current Bot application information (GET /oauth2/applications/@me).',
    inputSchema: z.strictObject({}),
  }, async () => discordRequest('GET', '/oauth2/applications/@me'));

  server.registerTool('oauth_public_keys_get', {
    description: 'Get Discord OAuth public keys (GET /oauth2/keys).',
    inputSchema: z.strictObject({}),
  }, async () => discordRequest('GET', '/oauth2/keys'));
}

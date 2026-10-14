import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const id = z.string();
const jsonObject = z.record(z.string(), z.unknown());
const commandFields = {
  name: z.string().optional(),
  name_localizations: z.record(z.string(), z.string().nullable()).nullable().optional(),
  type: z.number().int().optional(),
  description: z.string().optional(),
  description_localizations: z.record(z.string(), z.string().nullable()).nullable().optional(),
  options: z.array(jsonObject).optional(),
  default_member_permissions: z.string().nullable().optional(),
  integration_types: z.array(z.number().int()).optional(),
  contexts: z.array(z.number().int()).optional(),
  nsfw: z.boolean().optional(),
  dm_permission: z.boolean().optional(),
  default_permission: z.boolean().optional(),
};
const globalPath = (applicationId: string) => `/applications/${encodeURIComponent(applicationId)}/commands`;
const guildPath = (applicationId: string, guildId: string) =>
  `/applications/${encodeURIComponent(applicationId)}/guilds/${encodeURIComponent(guildId)}/commands`;

export function registerApplicationCommands(server: McpServer): void {
  server.registerTool('application_command_list', {
    description: 'List global application commands (GET /applications/{application_id}/commands).',
    inputSchema: z.strictObject({ application_id: id, with_localizations: z.boolean().optional() }),
  }, async ({ application_id, with_localizations }) => discordRequest('GET',
    `${globalPath(application_id)}${with_localizations === undefined ? '' : `?with_localizations=${with_localizations}`}`));

  server.registerTool('application_command_create', {
    description: 'Create a global application command (POST /applications/{application_id}/commands).',
    inputSchema: z.strictObject({ application_id: id, ...commandFields, name: z.string() }),
  }, async ({ application_id, ...body }) => discordRequest('POST', globalPath(application_id), body));

  server.registerTool('application_command_bulk_overwrite', {
    description: 'Overwrite global application commands (PUT /applications/{application_id}/commands).',
    inputSchema: z.strictObject({ application_id: id, commands: z.array(jsonObject) }),
  }, async ({ application_id, commands }) => discordRequest('PUT', globalPath(application_id), commands));

  server.registerTool('application_command_get', {
    description: 'Get a global application command (GET /applications/{application_id}/commands/{command_id}).',
    inputSchema: z.strictObject({ application_id: id, command_id: id }),
  }, async ({ application_id, command_id }) =>
    discordRequest('GET', `${globalPath(application_id)}/${encodeURIComponent(command_id)}`));

  server.registerTool('application_command_modify', {
    description: 'Modify a global application command (PATCH /applications/{application_id}/commands/{command_id}).',
    inputSchema: z.strictObject({ application_id: id, command_id: id, ...commandFields }),
  }, async ({ application_id, command_id, ...body }) =>
    discordRequest('PATCH', `${globalPath(application_id)}/${encodeURIComponent(command_id)}`, body));

  server.registerTool('application_command_delete', {
    description: 'Delete a global application command (DELETE /applications/{application_id}/commands/{command_id}).',
    inputSchema: z.strictObject({ application_id: id, command_id: id }),
  }, async ({ application_id, command_id }) =>
    discordRequest('DELETE', `${globalPath(application_id)}/${encodeURIComponent(command_id)}`));

  server.registerTool('guild_application_command_list', {
    description: 'List guild application commands (GET /applications/{application_id}/guilds/{guild_id}/commands).',
    inputSchema: z.strictObject({ application_id: id, guild_id: id, with_localizations: z.boolean().optional() }),
  }, async ({ application_id, guild_id, with_localizations }) => discordRequest('GET',
    `${guildPath(application_id, guild_id)}${with_localizations === undefined ? '' : `?with_localizations=${with_localizations}`}`));

  server.registerTool('guild_application_command_create', {
    description: 'Create a guild application command (POST /applications/{application_id}/guilds/{guild_id}/commands).',
    inputSchema: z.strictObject({ application_id: id, guild_id: id, ...commandFields, name: z.string() }),
  }, async ({ application_id, guild_id, ...body }) =>
    discordRequest('POST', guildPath(application_id, guild_id), body));

  server.registerTool('guild_application_command_bulk_overwrite', {
    description: 'Overwrite guild application commands (PUT /applications/{application_id}/guilds/{guild_id}/commands).',
    inputSchema: z.strictObject({ application_id: id, guild_id: id, commands: z.array(jsonObject) }),
  }, async ({ application_id, guild_id, commands }) =>
    discordRequest('PUT', guildPath(application_id, guild_id), commands));

  server.registerTool('guild_application_command_get', {
    description: 'Get a guild application command (GET /applications/{application_id}/guilds/{guild_id}/commands/{command_id}).',
    inputSchema: z.strictObject({ application_id: id, guild_id: id, command_id: id }),
  }, async ({ application_id, guild_id, command_id }) =>
    discordRequest('GET', `${guildPath(application_id, guild_id)}/${encodeURIComponent(command_id)}`));

  server.registerTool('guild_application_command_modify', {
    description: 'Modify a guild application command (PATCH /applications/{application_id}/guilds/{guild_id}/commands/{command_id}).',
    inputSchema: z.strictObject({ application_id: id, guild_id: id, command_id: id, ...commandFields }),
  }, async ({ application_id, guild_id, command_id, ...body }) =>
    discordRequest('PATCH', `${guildPath(application_id, guild_id)}/${encodeURIComponent(command_id)}`, body));

  server.registerTool('guild_application_command_delete', {
    description: 'Delete a guild application command (DELETE /applications/{application_id}/guilds/{guild_id}/commands/{command_id}).',
    inputSchema: z.strictObject({ application_id: id, guild_id: id, command_id: id }),
  }, async ({ application_id, guild_id, command_id }) =>
    discordRequest('DELETE', `${guildPath(application_id, guild_id)}/${encodeURIComponent(command_id)}`));

  server.registerTool('guild_application_command_permissions_list', {
    description: 'List guild application command permissions (GET /applications/{application_id}/guilds/{guild_id}/commands/permissions).',
    inputSchema: z.strictObject({ application_id: id, guild_id: id }),
  }, async ({ application_id, guild_id }) =>
    discordRequest('GET', `${guildPath(application_id, guild_id)}/permissions`));

  server.registerTool('guild_application_command_permissions_get', {
    description: 'Get guild application command permissions (GET /applications/{application_id}/guilds/{guild_id}/commands/{command_id}/permissions).',
    inputSchema: z.strictObject({ application_id: id, guild_id: id, command_id: id }),
  }, async ({ application_id, guild_id, command_id }) =>
    discordRequest('GET', `${guildPath(application_id, guild_id)}/${encodeURIComponent(command_id)}/permissions`));
}

import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const id = z.string();
const metadata = z.record(z.string(), z.string()).nullable();
const member = z.record(z.string(), z.unknown());
const lobbyPath = (lobbyId: string) => `/lobbies/${encodeURIComponent(lobbyId)}`;
const lobbyFields = { metadata: metadata.optional(), members: z.array(member).optional(),
  idle_timeout_seconds: z.number().int().optional() };
const memberFields = { metadata: metadata.optional(), flags: z.number().int().optional(),
  additional_name: z.string().nullable().optional() };

export function registerLobbyGateway(server: McpServer): void {
  server.registerTool('gateway_get', {
    description: 'Get Gateway URL (GET /gateway).', inputSchema: z.strictObject({}),
  }, async () => discordRequest('GET', '/gateway'));

  server.registerTool('gateway_bot_get', {
    description: 'Get Bot Gateway URL and session limits (GET /gateway/bot).', inputSchema: z.strictObject({}),
  }, async () => discordRequest('GET', '/gateway/bot'));

  server.registerTool('lobby_create', {
    description: 'Create a lobby (POST /lobbies).', inputSchema: z.strictObject(lobbyFields),
  }, async (body) => discordRequest('POST', '/lobbies', body));

  server.registerTool('lobby_get', {
    description: 'Get a lobby (GET /lobbies/{lobby_id}).', inputSchema: z.strictObject({ lobby_id: id }),
  }, async ({ lobby_id }) => discordRequest('GET', lobbyPath(lobby_id)));

  server.registerTool('lobby_modify', {
    description: 'Modify a lobby (PATCH /lobbies/{lobby_id}).',
    inputSchema: z.strictObject({ lobby_id: id, ...lobbyFields }),
  }, async ({ lobby_id, ...body }) => discordRequest('PATCH', lobbyPath(lobby_id), body));

  server.registerTool('lobby_delete', {
    description: 'Delete a lobby (DELETE /lobbies/{lobby_id}).', inputSchema: z.strictObject({ lobby_id: id }),
  }, async ({ lobby_id }) => discordRequest('DELETE', lobbyPath(lobby_id)));

  server.registerTool('lobby_member_add', {
    description: 'Add or update a lobby member (PUT /lobbies/{lobby_id}/members/{user_id}).',
    inputSchema: z.strictObject({ lobby_id: id, user_id: id, ...memberFields }),
  }, async ({ lobby_id, user_id, ...body }) => discordRequest('PUT',
    `${lobbyPath(lobby_id)}/members/${encodeURIComponent(user_id)}`, body));

  server.registerTool('lobby_member_remove', {
    description: 'Remove a lobby member (DELETE /lobbies/{lobby_id}/members/{user_id}).',
    inputSchema: z.strictObject({ lobby_id: id, user_id: id }),
  }, async ({ lobby_id, user_id }) => discordRequest('DELETE',
    `${lobbyPath(lobby_id)}/members/${encodeURIComponent(user_id)}`));

  server.registerTool('lobby_member_bulk_update', {
    description: 'Bulk update lobby members (POST /lobbies/{lobby_id}/members/bulk).',
    inputSchema: z.strictObject({ lobby_id: id, members: z.array(member) }),
  }, async ({ lobby_id, members }) => discordRequest('POST', `${lobbyPath(lobby_id)}/members/bulk`, members));

  server.registerTool('lobby_message_moderation_metadata_update', {
    description: 'Set lobby message moderation metadata (PUT /lobbies/{lobby_id}/messages/{message_id}/moderation-metadata).',
    inputSchema: z.strictObject({ lobby_id: id, message_id: id, metadata: z.record(z.string(), z.string()) }),
  }, async ({ lobby_id, message_id, metadata }) => discordRequest('PUT',
    `${lobbyPath(lobby_id)}/messages/${encodeURIComponent(message_id)}/moderation-metadata`, metadata));

  server.registerTool('lobby_member_channel_invite_create', {
    description: 'Create linked channel invite for a lobby user (POST /lobbies/{lobby_id}/members/{user_id}/invites).',
    inputSchema: z.strictObject({ lobby_id: id, user_id: id }),
  }, async ({ lobby_id, user_id }) => discordRequest('POST',
    `${lobbyPath(lobby_id)}/members/${encodeURIComponent(user_id)}/invites`));
}

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const id = z.string();
const invitePath = (code: string) => `/invites/${encodeURIComponent(code)}`;
const targetPath = (code: string) => `${invitePath(code)}/target-users`;
const createFields = {
  max_age: z.number().int().optional(), max_uses: z.number().int().optional(),
  temporary: z.boolean().optional(), unique: z.boolean().optional(), target_type: z.number().int().optional(),
  target_user_id: id.optional(), target_application_id: id.optional(),
  target_user_ids: z.array(id).optional(), role_ids: z.array(id).optional(),
};
const params = (values: Record<string, string | boolean | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) search.set(key, String(value));
  return search.size ? `?${search}` : '';
};
async function inviteForm(fields: Record<string, unknown>, filePath: string) {
  const form = new FormData();
  const bytes = await readFile(filePath);
  form.set('target_users_file', new Blob([new Uint8Array(bytes)], { type: 'text/csv' }), basename(filePath));
  if (Object.keys(fields).length) form.set('payload_json', JSON.stringify(fields));
  return form;
}

export function registerInvite(server: McpServer): void {
  server.registerTool('channel_invite_list', {
    description: 'List channel invites (GET /channels/{channel_id}/invites).',
    inputSchema: z.strictObject({ channel_id: id }),
  }, async ({ channel_id }) => discordRequest('GET', `/channels/${encodeURIComponent(channel_id)}/invites`));

  server.registerTool('channel_invite_create', {
    description: 'Create channel invite (POST /channels/{channel_id}/invites). Local CSV path optionally supplies target_users_file.',
    inputSchema: z.strictObject({ channel_id: id, ...createFields, target_users_file_path: z.string().optional(),
      audit_log_reason: z.string().optional() }),
  }, async ({ channel_id, target_users_file_path, audit_log_reason, ...body }) => discordRequest('POST',
    `/channels/${encodeURIComponent(channel_id)}/invites`,
    target_users_file_path ? await inviteForm(body, target_users_file_path) : body, audit_log_reason));

  server.registerTool('guild_invite_list', {
    description: 'List guild invites (GET /guilds/{guild_id}/invites).',
    inputSchema: z.strictObject({ guild_id: id }),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/invites`));

  server.registerTool('invite_get', {
    description: 'Get invite (GET /invites/{code}).',
    inputSchema: z.strictObject({ code: id, with_counts: z.boolean().optional(), guild_scheduled_event_id: id.optional() }),
  }, async ({ code, ...query }) => discordRequest('GET', `${invitePath(code)}${params(query)}`));

  server.registerTool('invite_delete', {
    description: 'Delete invite (DELETE /invites/{code}).',
    inputSchema: z.strictObject({ code: id, audit_log_reason: z.string().optional() }),
  }, async ({ code, audit_log_reason }) => discordRequest('DELETE', invitePath(code), undefined, audit_log_reason));

  server.registerTool('invite_target_user_list', {
    description: 'Get target users as CSV text (GET /invites/{code}/target-users).',
    inputSchema: z.strictObject({ code: id }),
  }, async ({ code }) => discordRequest('GET', targetPath(code)));

  server.registerTool('invite_target_user_job_status', {
    description: 'Get target users CSV processing status (GET /invites/{code}/target-users/job-status).',
    inputSchema: z.strictObject({ code: id }),
  }, async ({ code }) => discordRequest('GET', `${targetPath(code)}/job-status`));

  server.registerTool('invite_target_user_replace', {
    description: 'Replace invite target users from a local CSV file (PUT /invites/{code}/target-users).',
    inputSchema: z.strictObject({ code: id, target_users_file_path: z.string() }),
  }, async ({ code, target_users_file_path }) => discordRequest('PUT', targetPath(code),
    await inviteForm({}, target_users_file_path)));

  server.registerTool('invite_target_user_add', {
    description: 'Add one invite target user (PUT /invites/{code}/target-users/{user_id}).',
    inputSchema: z.strictObject({ code: id, user_id: id }),
  }, async ({ code, user_id }) => discordRequest('PUT', `${targetPath(code)}/${encodeURIComponent(user_id)}`));

  server.registerTool('invite_target_user_remove', {
    description: 'Remove one invite target user (DELETE /invites/{code}/target-users/{user_id}).',
    inputSchema: z.strictObject({ code: id, user_id: id }),
  }, async ({ code, user_id }) => discordRequest('DELETE', `${targetPath(code)}/${encodeURIComponent(user_id)}`));

  for (const [name, suffix] of [['invite_target_user_bulk_add', 'bulk-add'], ['invite_target_user_bulk_remove', 'bulk-delete']] as const) {
    server.registerTool(name, {
      description: `${suffix} invite target users (POST /invites/{code}/target-users/${suffix}).`,
      inputSchema: z.strictObject({ code: id, user_ids: z.array(id) }),
    }, async ({ code, user_ids }) => discordRequest('POST', `${targetPath(code)}/${suffix}`, { user_ids }));
  }
}

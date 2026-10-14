import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { discordGet, discordRequest } from './discord-http.js';

const id = z.string();
const jsonObject = z.record(z.string(), z.unknown());
const reason = { audit_log_reason: z.string().optional() };
const archive = { before: z.string().optional(), limit: z.number().int().optional() };
const threadFields = {
  name: z.string(),
  auto_archive_duration: z.number().int().optional(),
  rate_limit_per_user: z.number().int().nullable().optional(),
};

function query(fields: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) params.set(key, String(value));
  return params.size ? `?${params}` : '';
}

export function registerThread(server: McpServer): void {
  server.registerTool('thread_start_from_message', {
    description: 'Start a thread from an existing message (POST /channels/{channel_id}/messages/{message_id}/threads).',
    inputSchema: z.strictObject({ channel_id: id, message_id: id, ...threadFields, ...reason }),
  }, async ({ channel_id, message_id, audit_log_reason, ...body }) => discordRequest('POST',
    `/channels/${encodeURIComponent(channel_id)}/messages/${encodeURIComponent(message_id)}/threads`, body, audit_log_reason));

  server.registerTool('thread_start_without_message', {
    description: 'Start a thread without an existing message in a text or announcement channel (POST /channels/{channel_id}/threads).',
    inputSchema: z.strictObject({ channel_id: id, ...threadFields, type: z.number().int().optional(),
      invitable: z.boolean().optional(), ...reason }),
  }, async ({ channel_id, audit_log_reason, ...body }) => discordRequest('POST',
    `/channels/${encodeURIComponent(channel_id)}/threads`, body, audit_log_reason));

  server.registerTool('thread_start_forum', {
    description: 'Start a thread with an initial message in a forum or media channel (POST /channels/{channel_id}/threads).',
    inputSchema: z.strictObject({ channel_id: id, ...threadFields, message: z.strictObject({
      content: z.string().optional(), embeds: z.array(jsonObject).optional(), allowed_mentions: jsonObject.optional(),
      components: z.array(jsonObject).optional(), sticker_ids: z.array(id).optional(),
      attachments: z.array(jsonObject).optional(), flags: z.number().int().optional(),
    }), applied_tags: z.array(id).optional(),
    files: z.array(z.strictObject({ path: z.string(), filename: z.string().optional() })).optional(), ...reason }),
  }, async ({ channel_id, audit_log_reason, files, ...body }) => {
    if (!files?.length) return discordRequest('POST', `/channels/${encodeURIComponent(channel_id)}/threads`, body, audit_log_reason);
    const form = new FormData();
    form.set('payload_json', JSON.stringify(body));
    for (const [index, file] of files.entries()) {
      const bytes = await readFile(file.path);
      form.append(`files[${index}]`, new Blob([new Uint8Array(bytes)]), file.filename ?? basename(file.path));
    }
    return discordRequest('POST', `/channels/${encodeURIComponent(channel_id)}/threads`, form, audit_log_reason);
  });

  server.registerTool('guild_thread_list_active', {
    description: 'List active guild threads (GET /guilds/{guild_id}/threads/active).',
    inputSchema: z.strictObject({ guild_id: id }),
  }, async ({ guild_id }) => discordGet(`/guilds/${encodeURIComponent(guild_id)}/threads/active`));

  for (const [name, path] of [
    ['thread_list_public_archived', 'threads/archived/public'],
    ['thread_list_private_archived', 'threads/archived/private'],
    ['thread_list_joined_private_archived', 'users/@me/threads/archived/private'],
  ] as const) {
    server.registerTool(name, {
      description: `List one page of archived threads (GET /channels/{channel_id}/${path}).`,
      inputSchema: z.strictObject({ channel_id: id, ...archive }),
    }, async ({ channel_id, ...params }) => discordGet(`/channels/${encodeURIComponent(channel_id)}/${path}${query(params)}`));
  }

  for (const [name, method, path] of [
    ['thread_join', 'PUT', '@me'], ['thread_leave', 'DELETE', '@me'],
    ['thread_member_add', 'PUT', 'user'], ['thread_member_remove', 'DELETE', 'user'],
  ] as const) {
    server.registerTool(name, {
      description: `${method} /channels/{channel_id}/thread-members/${path === 'user' ? '{user_id}' : '@me'}.`,
      inputSchema: path === 'user' ? z.strictObject({ channel_id: id, user_id: id }) : z.strictObject({ channel_id: id }),
    }, async (args) => discordRequest(method, `/channels/${encodeURIComponent(args.channel_id)}/thread-members/${path === 'user' ? encodeURIComponent(String('user_id' in args ? args.user_id : '')) : '@me'}`));
  }

  server.registerTool('thread_member_get', {
    description: 'Get a thread member (GET /channels/{channel_id}/thread-members/{user_id}).',
    inputSchema: z.strictObject({ channel_id: id, user_id: id, with_member: z.boolean().optional() }),
  }, async ({ channel_id, user_id, with_member }) => discordGet(
    `/channels/${encodeURIComponent(channel_id)}/thread-members/${encodeURIComponent(user_id)}${query({ with_member })}`));

  server.registerTool('thread_member_list', {
    description: 'List one page of thread members (GET /channels/{channel_id}/thread-members).',
    inputSchema: z.strictObject({ channel_id: id, with_member: z.boolean().optional(), after: id.optional(), limit: z.number().int().optional() }),
  }, async ({ channel_id, ...params }) => discordGet(`/channels/${encodeURIComponent(channel_id)}/thread-members${query(params)}`));
}

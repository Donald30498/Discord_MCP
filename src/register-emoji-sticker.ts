import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { discordRequest } from './discord-http.js';

const snowflake = z.string();
const guildEmojiPath = (guildId: string) => `/guilds/${encodeURIComponent(guildId)}/emojis`;
const guildStickerPath = (guildId: string) => `/guilds/${encodeURIComponent(guildId)}/stickers`;

async function stickerForm(name: string, description: string, tags: string, filePath: string) {
  const form = new FormData();
  form.set('name', name);
  form.set('description', description);
  form.set('tags', tags);
  const contentType: Record<string, string> = {
    '.png': 'image/png', '.apng': 'image/apng', '.gif': 'image/gif', '.json': 'application/json',
  };
  const bytes = await readFile(filePath);
  form.set('file', new Blob([new Uint8Array(bytes)], { type: contentType[extname(filePath).toLowerCase()] ?? 'application/octet-stream' }), basename(filePath));
  return form;
}

export function registerEmojiSticker(server: McpServer): void {
  server.registerTool('guild_emoji_list', {
    description: 'List guild emojis (GET /guilds/{guild_id}/emojis).',
    inputSchema: z.strictObject({ guild_id: snowflake }),
  }, async ({ guild_id }) => discordRequest('GET', guildEmojiPath(guild_id)));

  server.registerTool('guild_emoji_get', {
    description: 'Get a guild emoji (GET /guilds/{guild_id}/emojis/{emoji_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, emoji_id: snowflake }),
  }, async ({ guild_id, emoji_id }) =>
    discordRequest('GET', `${guildEmojiPath(guild_id)}/${encodeURIComponent(emoji_id)}`));

  server.registerTool('guild_emoji_create', {
    description: 'Create a guild emoji with a Discord image data URI (POST /guilds/{guild_id}/emojis).',
    inputSchema: z.strictObject({ guild_id: snowflake, name: z.string(), image: z.string(),
      roles: z.array(snowflake).optional(), audit_log_reason: z.string().optional() }),
  }, async ({ guild_id, audit_log_reason, ...body }) =>
    discordRequest('POST', guildEmojiPath(guild_id), body, audit_log_reason));

  server.registerTool('guild_emoji_modify', {
    description: 'Modify a guild emoji (PATCH /guilds/{guild_id}/emojis/{emoji_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, emoji_id: snowflake, name: z.string().optional(),
      roles: z.array(snowflake).nullable().optional(), audit_log_reason: z.string().optional() }),
  }, async ({ guild_id, emoji_id, audit_log_reason, ...body }) =>
    discordRequest('PATCH', `${guildEmojiPath(guild_id)}/${encodeURIComponent(emoji_id)}`, body, audit_log_reason));

  server.registerTool('guild_emoji_delete', {
    description: 'Delete a guild emoji (DELETE /guilds/{guild_id}/emojis/{emoji_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, emoji_id: snowflake, audit_log_reason: z.string().optional() }),
  }, async ({ guild_id, emoji_id, audit_log_reason }) =>
    discordRequest('DELETE', `${guildEmojiPath(guild_id)}/${encodeURIComponent(emoji_id)}`, undefined, audit_log_reason));

  server.registerTool('guild_sticker_list', {
    description: 'List guild stickers (GET /guilds/{guild_id}/stickers).',
    inputSchema: z.strictObject({ guild_id: snowflake }),
  }, async ({ guild_id }) => discordRequest('GET', guildStickerPath(guild_id)));

  server.registerTool('guild_sticker_get', {
    description: 'Get a guild sticker (GET /guilds/{guild_id}/stickers/{sticker_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, sticker_id: snowflake }),
  }, async ({ guild_id, sticker_id }) =>
    discordRequest('GET', `${guildStickerPath(guild_id)}/${encodeURIComponent(sticker_id)}`));

  server.registerTool('sticker_get', {
    description: 'Get a sticker (GET /stickers/{sticker_id}).',
    inputSchema: z.strictObject({ sticker_id: snowflake }),
  }, async ({ sticker_id }) => discordRequest('GET', `/stickers/${encodeURIComponent(sticker_id)}`));

  server.registerTool('sticker_pack_list', {
    description: 'List sticker packs (GET /sticker-packs).',
    inputSchema: z.strictObject({}),
  }, async () => discordRequest('GET', '/sticker-packs'));

  server.registerTool('sticker_pack_get', {
    description: 'Get a sticker pack (GET /sticker-packs/{pack_id}).',
    inputSchema: z.strictObject({ pack_id: snowflake }),
  }, async ({ pack_id }) => discordRequest('GET', `/sticker-packs/${encodeURIComponent(pack_id)}`));

  server.registerTool('guild_sticker_create', {
    description: 'Create a guild sticker from a local file (POST /guilds/{guild_id}/stickers).',
    inputSchema: z.strictObject({ guild_id: snowflake, name: z.string(), description: z.string(),
      tags: z.string(), file_path: z.string(), audit_log_reason: z.string().optional() }),
  }, async ({ guild_id, name, description, tags, file_path, audit_log_reason }) =>
    discordRequest('POST', guildStickerPath(guild_id), await stickerForm(name, description, tags, file_path), audit_log_reason));

  server.registerTool('guild_sticker_modify', {
    description: 'Modify a guild sticker (PATCH /guilds/{guild_id}/stickers/{sticker_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, sticker_id: snowflake, name: z.string().optional(),
      description: z.string().nullable().optional(), tags: z.string().optional(), audit_log_reason: z.string().optional() }),
  }, async ({ guild_id, sticker_id, audit_log_reason, ...body }) =>
    discordRequest('PATCH', `${guildStickerPath(guild_id)}/${encodeURIComponent(sticker_id)}`, body, audit_log_reason));

  server.registerTool('guild_sticker_delete', {
    description: 'Delete a guild sticker (DELETE /guilds/{guild_id}/stickers/{sticker_id}).',
    inputSchema: z.strictObject({ guild_id: snowflake, sticker_id: snowflake, audit_log_reason: z.string().optional() }),
  }, async ({ guild_id, sticker_id, audit_log_reason }) =>
    discordRequest('DELETE', `${guildStickerPath(guild_id)}/${encodeURIComponent(sticker_id)}`, undefined, audit_log_reason));
}

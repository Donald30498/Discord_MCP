import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const ids = { channel_id: z.string(), message_id: z.string() };
const emojiIds = { ...ids, emoji: z.string() };
const messagePath = (channelId: string, messageId: string) =>
  `/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}`;
const reactionPath = (channelId: string, messageId: string, emoji: string) =>
  `${messagePath(channelId, messageId)}/reactions/${encodeURIComponent(emoji)}`;

export function registerMessageReactionPinPoll(server: McpServer): void {
  server.registerTool('message_reaction_create', {
    description: 'React to a message as the Bot (PUT /channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me).',
    inputSchema: z.strictObject(emojiIds),
  }, async ({ channel_id, message_id, emoji }) => discordRequest('PUT', `${reactionPath(channel_id, message_id, emoji)}/@me`));

  server.registerTool('message_reaction_delete_own', {
    annotations: { destructiveHint: true },
    description: 'Remove the Bot reaction (DELETE /channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me).',
    inputSchema: z.strictObject(emojiIds),
  }, async ({ channel_id, message_id, emoji }) => discordRequest('DELETE', `${reactionPath(channel_id, message_id, emoji)}/@me`));

  server.registerTool('message_reaction_delete_user', {
    annotations: { destructiveHint: true },
    description: 'Remove a user reaction (DELETE /channels/{channel_id}/messages/{message_id}/reactions/{emoji}/{user_id}).',
    inputSchema: z.strictObject({ ...emojiIds, user_id: z.string() }),
  }, async ({ channel_id, message_id, emoji, user_id }) =>
    discordRequest('DELETE', `${reactionPath(channel_id, message_id, emoji)}/${encodeURIComponent(user_id)}`));

  server.registerTool('message_reaction_list', {
    description: 'List one page of users who reacted with an emoji (GET /channels/{channel_id}/messages/{message_id}/reactions/{emoji}).',
    inputSchema: z.strictObject({ ...emojiIds, type: z.number().int().optional(), after: z.string().optional(), limit: z.number().int().optional() }),
  }, async ({ channel_id, message_id, emoji, type, after, limit }) => {
    const query = new URLSearchParams();
    if (type !== undefined) query.set('type', String(type));
    if (after !== undefined) query.set('after', after);
    if (limit !== undefined) query.set('limit', String(limit));
    return discordRequest('GET', `${reactionPath(channel_id, message_id, emoji)}${query.size ? `?${query}` : ''}`);
  });

  server.registerTool('message_reaction_delete_all', {
    annotations: { destructiveHint: true },
    description: 'Remove all reactions from a message (DELETE /channels/{channel_id}/messages/{message_id}/reactions).',
    inputSchema: z.strictObject(ids),
  }, async ({ channel_id, message_id }) => discordRequest('DELETE', `${messagePath(channel_id, message_id)}/reactions`));

  server.registerTool('message_reaction_delete_emoji', {
    annotations: { destructiveHint: true },
    description: 'Remove all reactions for one emoji (DELETE /channels/{channel_id}/messages/{message_id}/reactions/{emoji}).',
    inputSchema: z.strictObject(emojiIds),
  }, async ({ channel_id, message_id, emoji }) => discordRequest('DELETE', reactionPath(channel_id, message_id, emoji)));

  server.registerTool('message_pin_list', {
    description: 'List one page of channel pins (GET /channels/{channel_id}/messages/pins).',
    inputSchema: z.strictObject({ channel_id: z.string(), before: z.string().optional(), limit: z.number().int().optional() }),
  }, async ({ channel_id, before, limit }) => {
    const query = new URLSearchParams();
    if (before !== undefined) query.set('before', before);
    if (limit !== undefined) query.set('limit', String(limit));
    return discordRequest('GET', `/channels/${encodeURIComponent(channel_id)}/messages/pins${query.size ? `?${query}` : ''}`);
  });

  server.registerTool('message_pin', {
    description: 'Pin a message (PUT /channels/{channel_id}/messages/pins/{message_id}).',
    inputSchema: z.strictObject({ ...ids, audit_log_reason: z.string().optional() }),
  }, async ({ channel_id, message_id, audit_log_reason }) => discordRequest('PUT',
    `/channels/${encodeURIComponent(channel_id)}/messages/pins/${encodeURIComponent(message_id)}`, undefined, audit_log_reason));

  server.registerTool('message_unpin', {
    annotations: { destructiveHint: true },
    description: 'Unpin a message (DELETE /channels/{channel_id}/messages/pins/{message_id}).',
    inputSchema: z.strictObject({ ...ids, audit_log_reason: z.string().optional() }),
  }, async ({ channel_id, message_id, audit_log_reason }) => discordRequest('DELETE',
    `/channels/${encodeURIComponent(channel_id)}/messages/pins/${encodeURIComponent(message_id)}`, undefined, audit_log_reason));

  server.registerTool('poll_answer_voters_list', {
    description: 'List one page of users who voted for a poll answer (GET /channels/{channel_id}/polls/{message_id}/answers/{answer_id}).',
    inputSchema: z.strictObject({ ...ids, answer_id: z.number().int(), after: z.string().optional(), limit: z.number().int().optional() }),
  }, async ({ channel_id, message_id, answer_id, after, limit }) => {
    const query = new URLSearchParams();
    if (after !== undefined) query.set('after', after);
    if (limit !== undefined) query.set('limit', String(limit));
    return discordRequest('GET', `/channels/${encodeURIComponent(channel_id)}/polls/${encodeURIComponent(message_id)}/answers/${answer_id}${query.size ? `?${query}` : ''}`);
  });

  server.registerTool('poll_end', {
    annotations: { destructiveHint: true },
    description: 'End a poll authored by the Bot (POST /channels/{channel_id}/polls/{message_id}/expire).',
    inputSchema: z.strictObject(ids),
  }, async ({ channel_id, message_id }) => discordRequest('POST',
    `/channels/${encodeURIComponent(channel_id)}/polls/${encodeURIComponent(message_id)}/expire`));
}

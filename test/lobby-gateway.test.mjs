import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

test('agent calls Bot lobby and gateway HTTP tools through MCP', async () => {
  const requests = [];
  const http = createServer(async (request, reply) => {
    let raw = ''; for await (const part of request) raw += part;
    requests.push({ method: request.method, url: request.url, body: raw ? JSON.parse(raw) : null,
      auth: request.headers.authorization });
    reply.writeHead(request.method === 'DELETE' ? 204 : 200, { 'Content-Type': 'application/json' });
    reply.end(request.method === 'DELETE' ? '' : '{}');
  });
  http.listen(0, '127.0.0.1'); await once(http, 'listening');
  const client = new Client({ name: 'test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../dist/main.js', import.meta.url))],
    env: { ...process.env, DISCORD_BOT_TOKEN: 'test-token',
      DISCORD_API_BASE_URL: `http://127.0.0.1:${http.address().port}/api/v10` } });
  try {
    await client.connect(transport);
    const cases = [
      ['gateway_get', {}, 'GET', '/gateway', null],
      ['gateway_bot_get', {}, 'GET', '/gateway/bot', null],
      ['lobby_create', { metadata: { topic: 'test' } }, 'POST', '/lobbies', { metadata: { topic: 'test' } }],
      ['lobby_get', { lobby_id: '1' }, 'GET', '/lobbies/1', null],
      ['lobby_modify', { lobby_id: '1', idle_timeout_seconds: 60 }, 'PATCH', '/lobbies/1', { idle_timeout_seconds: 60 }],
      ['lobby_member_add', { lobby_id: '1', user_id: '2', additional_name: 'Player' }, 'PUT', '/lobbies/1/members/2', { additional_name: 'Player' }],
      ['lobby_member_bulk_update', { lobby_id: '1', members: [{ id: '2', remove_member: true }] }, 'POST', '/lobbies/1/members/bulk', [{ id: '2', remove_member: true }]],
      ['lobby_member_remove', { lobby_id: '1', user_id: '2' }, 'DELETE', '/lobbies/1/members/2', null],
      ['lobby_message_moderation_metadata_update', { lobby_id: '1', message_id: '3', metadata: { reason: 'spam' } }, 'PUT', '/lobbies/1/messages/3/moderation-metadata', { reason: 'spam' }],
      ['lobby_member_channel_invite_create', { lobby_id: '1', user_id: '2' }, 'POST', '/lobbies/1/members/2/invites', null],
      ['lobby_delete', { lobby_id: '1' }, 'DELETE', '/lobbies/1', null],
    ];
    for (const [name, args, method, path, body] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(JSON.parse(result.content[0].text).status, method === 'DELETE' ? 204 : 200);
      assert.deepEqual(requests.at(-1), { method, url: `/api/v10${path}`, body, auth: 'Bot test-token' });
    }
  } finally { await client.close(); http.close(); await once(http, 'close'); }
});

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

test('application metadata and emojis pass through named MCP tools', async () => {
  const requests = [];
  const http = createServer(async (request, reply) => {
    let raw = '';
    for await (const part of request) raw += part;
    requests.push({ method: request.method, url: request.url, body: raw ? JSON.parse(raw) : null,
      auth: request.headers.authorization });
    reply.writeHead(request.method === 'DELETE' ? 204 : 200, { 'Content-Type': 'application/json' });
    reply.end(request.method === 'DELETE' ? '' : '{}');
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../dist/main.js', import.meta.url))],
    env: { ...process.env, DISCORD_BOT_TOKEN: 'test-token',
      DISCORD_API_BASE_URL: `http://127.0.0.1:${http.address().port}/api/v10` } });
  try {
    await client.connect(transport);
    const cases = [
      ['application_get_current', {}, 'GET', '/applications/@me', null],
      ['application_modify_current', { description: 'bot', flags: 64 }, 'PATCH', '/applications/@me', { description: 'bot', flags: 64 }],
      ['application_role_connection_metadata_get', { application_id: '1' }, 'GET', '/applications/1/role-connections/metadata', null],
      ['application_role_connection_metadata_update', { application_id: '1', records: [{ key: 'wins', name: 'Wins', description: 'Wins', type: 2 }] }, 'PUT', '/applications/1/role-connections/metadata', [{ key: 'wins', name: 'Wins', description: 'Wins', type: 2 }]],
      ['application_emoji_list', { application_id: '1' }, 'GET', '/applications/1/emojis', null],
      ['application_emoji_create', { application_id: '1', name: 'test', image: 'data:image/png;base64,AA==' }, 'POST', '/applications/1/emojis', { name: 'test', image: 'data:image/png;base64,AA==' }],
      ['application_emoji_get', { application_id: '1', emoji_id: '2' }, 'GET', '/applications/1/emojis/2', null],
      ['application_emoji_modify', { application_id: '1', emoji_id: '2', name: 'new' }, 'PATCH', '/applications/1/emojis/2', { name: 'new' }],
      ['application_emoji_delete', { application_id: '1', emoji_id: '2' }, 'DELETE', '/applications/1/emojis/2', null],
    ];
    for (const [name, args, method, path, body] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(JSON.parse(result.content[0].text).status, method === 'DELETE' ? 204 : 200);
      assert.deepEqual(requests.at(-1), { method, url: `/api/v10${path}`, body, auth: 'Bot test-token' });
    }
  } finally {
    await client.close();
    http.close();
    await once(http, 'close');
  }
});

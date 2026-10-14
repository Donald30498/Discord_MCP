import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

test('agent manages Bot-authorized webhooks through MCP', async () => {
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
      ['channel_webhook_create', { channel_id: '1', name: 'Test Hook' }, 'POST', '/channels/1/webhooks', { name: 'Test Hook' }],
      ['channel_webhook_list', { channel_id: '1' }, 'GET', '/channels/1/webhooks', null],
      ['guild_webhook_list', { guild_id: '2' }, 'GET', '/guilds/2/webhooks', null],
      ['webhook_get', { webhook_id: '3' }, 'GET', '/webhooks/3', null],
      ['webhook_modify', { webhook_id: '3', name: 'New', channel_id: '2' }, 'PATCH', '/webhooks/3', { name: 'New', channel_id: '2' }],
      ['webhook_delete', { webhook_id: '3' }, 'DELETE', '/webhooks/3', null],
    ];
    for (const [name, args, method, path, body] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(JSON.parse(result.content[0].text).status, method === 'DELETE' ? 204 : 200);
      assert.deepEqual(requests.at(-1), { method, url: `/api/v10${path}`, body, auth: 'Bot test-token' });
    }
  } finally { await client.close(); http.close(); await once(http, 'close'); }
});

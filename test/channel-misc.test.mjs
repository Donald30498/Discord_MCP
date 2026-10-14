import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

test('agent calls remaining Bot channel operations through MCP', async () => {
  const requests = [];
  const http = createServer(async (request, reply) => {
    let raw = ''; for await (const part of request) raw += part;
    requests.push({ method: request.method, url: request.url, body: raw ? JSON.parse(raw) : null });
    reply.writeHead(200, { 'Content-Type': 'application/json' }); reply.end('{}');
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
      ['channel_follow', { channel_id: '1', webhook_channel_id: '2' }, 'POST', '/channels/1/followers', { webhook_channel_id: '2' }],
      ['channel_typing_trigger', { channel_id: '1' }, 'POST', '/channels/1/typing', null],
      ['voice_channel_status_set', { channel_id: '1', status: 'Live' }, 'PUT', '/channels/1/voice-status', { status: 'Live' }],
    ];
    for (const [name, args, method, path, body] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(JSON.parse(result.content[0].text).status, 200);
      assert.deepEqual(requests.at(-1), { method, url: `/api/v10${path}`, body });
    }
  } finally { await client.close(); http.close(); await once(http, 'close'); }
});

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

const serverPath = fileURLToPath(new URL('../dist/main.js', import.meta.url));

async function withMcp(run) {
  const requests = [];
  const http = createServer((request, reply) => {
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization });
    reply.writeHead(200, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '4' });
    reply.end(JSON.stringify(request.url?.includes('/messages?') || request.url?.endsWith('/messages')
      ? [{ id: '789', channel_id: '456', content: 'hello' }]
      : { id: '789', channel_id: '456', content: 'hello' }));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'discord-mcp-test', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { ...process.env, DISCORD_BOT_TOKEN: 'test-token', DISCORD_API_BASE_URL: `http://127.0.0.1:${http.address().port}/api/v10` },
  });
  try {
    await client.connect(transport);
    await run(client, requests);
  } finally {
    await client.close();
    http.close();
    await once(http, 'close');
  }
}

test('agent reads one channel message through MCP', async () => {
  await withMcp(async (client, requests) => {
    const { tools } = await client.listTools();
    assert.ok(tools.some(({ name }) => name === 'message_get'));
    const result = await client.callTool({ name: 'message_get', arguments: { channel_id: '456', message_id: '789' } });
    assert.equal(result.isError, undefined);
    assert.deepEqual(JSON.parse(result.content[0].text), {
      status: 200,
      body: { id: '789', channel_id: '456', content: 'hello' },
      headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '4' },
    });
    assert.deepEqual(requests, [{ method: 'GET', url: '/api/v10/channels/456/messages/789', authorization: 'Bot test-token' }]);
  });
});

test('agent requests one page using Discord message cursors and limit', async () => {
  await withMcp(async (client, requests) => {
    const { tools } = await client.listTools();
    assert.ok(tools.some(({ name }) => name === 'message_list'));
    const calls = [
      [{ channel_id: '456' }, '/api/v10/channels/456/messages'],
      [{ channel_id: '456', before: '800', limit: 25 }, '/api/v10/channels/456/messages?before=800&limit=25'],
      [{ channel_id: '456', after: '700' }, '/api/v10/channels/456/messages?after=700'],
      [{ channel_id: '456', around: '750' }, '/api/v10/channels/456/messages?around=750'],
    ];
    for (const [args, url] of calls) {
      const result = await client.callTool({ name: 'message_list', arguments: args });
      assert.equal(result.isError, undefined);
      assert.deepEqual(JSON.parse(result.content[0].text), {
        status: 200,
        body: [{ id: '789', channel_id: '456', content: 'hello' }],
        headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '4' },
      });
      assert.equal(requests.at(-1).url, url);
    }
    assert.equal(requests.length, calls.length);
    assert.ok(requests.every(({ method, authorization }) => method === 'GET' && authorization === 'Bot test-token'));
  });
});

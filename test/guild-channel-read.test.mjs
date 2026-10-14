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
    const body = request.url === '/api/v10/guilds/123?with_counts=true'
      ? { id: '123', name: 'Test guild', approximate_member_count: 2 }
      : request.url === '/api/v10/guilds/123/channels'
        ? [{ id: '456', guild_id: '123', name: 'general', type: 0 }]
        : { id: '456', guild_id: '123', name: 'general', type: 0 };
    reply.writeHead(200, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '3' });
    reply.end(JSON.stringify(body));
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

test('agent reads guild and channel resources through named MCP tools', async () => {
  await withMcp(async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_get', 'guild_list_channels', 'channel_get']) {
      assert.ok(tools.some((tool) => tool.name === name));
    }

    const cases = [
      ['guild_get', { guild_id: '123', with_counts: true }, { id: '123', name: 'Test guild', approximate_member_count: 2 }],
      ['guild_list_channels', { guild_id: '123' }, [{ id: '456', guild_id: '123', name: 'general', type: 0 }]],
      ['channel_get', { channel_id: '456' }, { id: '456', guild_id: '123', name: 'general', type: 0 }],
    ];
    for (const [name, args, body] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, undefined);
      assert.deepEqual(JSON.parse(result.content[0].text), {
        status: 200, body, headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' },
      });
    }
    assert.deepEqual(requests, [
      { method: 'GET', url: '/api/v10/guilds/123?with_counts=true', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/channels', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/channels/456', authorization: 'Bot test-token' },
    ]);
  });
});

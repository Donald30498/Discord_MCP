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
    const bodies = {
      '/api/v10/guilds/123/members/456': { user: { id: '456', username: 'alice' }, nick: null },
      '/api/v10/guilds/123/members?limit=2&after=455': [{ user: { id: '456' } }, { user: { id: '457' } }],
      '/api/v10/guilds/123/members/search?query=Ali%20%26%20Bob&limit=5': [{ user: { id: '456', username: 'alice' } }],
    };
    reply.writeHead(200, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '3' });
    reply.end(JSON.stringify(bodies[request.url]));
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

test('agent reads one guild member, one list page, and member search through MCP', async () => {
  await withMcp(async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_member_get', 'guild_member_list', 'guild_member_search']) {
      assert.ok(tools.some((tool) => tool.name === name), name);
    }

    for (const [name, args, body] of [
      ['guild_member_get', { guild_id: '123', user_id: '456' }, { user: { id: '456', username: 'alice' }, nick: null }],
      ['guild_member_list', { guild_id: '123', limit: 2, after: '455' }, [{ user: { id: '456' } }, { user: { id: '457' } }]],
      ['guild_member_search', { guild_id: '123', query: 'Ali & Bob', limit: 5 }, [{ user: { id: '456', username: 'alice' } }]],
    ]) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, undefined);
      assert.deepEqual(JSON.parse(result.content[0].text), {
        status: 200, body, headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' },
      });
    }
    assert.deepEqual(requests, [
      { method: 'GET', url: '/api/v10/guilds/123/members/456', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/members?limit=2&after=455', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/members/search?query=Ali%20%26%20Bob&limit=5', authorization: 'Bot test-token' },
    ]);
  });
});

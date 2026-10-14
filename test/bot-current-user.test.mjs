import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

const serverPath = fileURLToPath(new URL('../dist/main.js', import.meta.url));

async function withMcp(response, run) {
  const requests = [];
  const http = createServer((request, reply) => {
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization });
    reply.writeHead(response.status, response.headers);
    reply.end(JSON.stringify(response.body));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const address = http.address();
  const client = new Client({ name: 'discord-mcp-test', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: {
      ...process.env,
      DISCORD_BOT_TOKEN: 'test-token',
      DISCORD_API_BASE_URL: `http://127.0.0.1:${address.port}/api/v10`,
    },
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

test('agent lists the user tool and reads Bot identity through Discord HTTP', async () => {
  await withMcp(
    { status: 200, headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '4' }, body: { id: '123', username: 'testbot', bot: true } },
    async (client, requests) => {
      const { tools } = await client.listTools();
      assert.equal(tools[0].name, 'user_get_current');
      assert.equal(tools[0].inputSchema.type, 'object');
      assert.deepEqual(tools[0].inputSchema.properties, {});
      assert.equal(tools[0].inputSchema.additionalProperties, false);

      const result = await client.callTool({ name: 'user_get_current', arguments: {} });
      assert.equal(result.isError, undefined);
      assert.deepEqual(JSON.parse(result.content[0].text), {
        status: 200,
        body: { id: '123', username: 'testbot', bot: true },
        headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '4' },
      });
      assert.deepEqual(requests, [{ method: 'GET', url: '/api/v10/users/@me', authorization: 'Bot test-token' }]);
    },
  );
});

test('agent receives a 429 with Retry-After and the tool does not retry', async () => {
  await withMcp(
    {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '2', 'X-RateLimit-Remaining': '0' },
      body: { message: 'You are being rate limited.', retry_after: 2, global: false },
    },
    async (client, requests) => {
      const result = await client.callTool({ name: 'user_get_current', arguments: {} });
      assert.equal(result.isError, true);
      assert.deepEqual(JSON.parse(result.content[0].text), {
        status: 429,
        body: { message: 'You are being rate limited.', retry_after: 2, global: false },
        headers: { 'content-type': 'application/json', 'retry-after': '2', 'x-ratelimit-remaining': '0' },
      });
      assert.equal(requests.length, 1);
    },
  );
});

for (const [status, body] of [
  [401, { message: '401: Unauthorized', code: 0 }],
  [500, { message: 'Internal Server Error', code: 0 }],
]) {
  test(`agent sees Discord ${status} and its response body`, async () => {
    await withMcp(
      { status, headers: { 'Content-Type': 'application/json' }, body },
      async (client, requests) => {
        const result = await client.callTool({ name: 'user_get_current', arguments: {} });
        assert.equal(result.isError, true);
        assert.deepEqual(JSON.parse(result.content[0].text), {
          status,
          body,
          headers: { 'content-type': 'application/json' },
        });
        assert.equal(requests.length, 1);
      },
    );
  });
}

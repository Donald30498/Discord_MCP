import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const serverPath = fileURLToPath(new URL('../dist/main.js', import.meta.url));

test('stdio discovery and calls keep two Bot identities separate and redact echoed credentials', async () => {
  const requests = [];
  const http = createServer((request, reply) => {
    requests.push({ url: request.url, authorization: request.headers.authorization });
    const secret = request.headers.authorization.slice(4);
    reply.writeHead(403, { 'Content-Type': 'application/json' });
    reply.end(JSON.stringify({ message: `Rejected ${secret} and ${encodeURIComponent(secret)}` }));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const clients = [];
  const tokens = ['test-bot-A.secret', 'test-bot-B.secret'];
  try {
    for (const token of tokens) {
      const client = new Client({ name: 'dcenter-contract-test', version: '1' });
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [serverPath],
        cwd: projectRoot,
        env: { ...process.env, DISCORD_BOT_TOKEN: token,
          DISCORD_API_BASE_URL: `http://127.0.0.1:${http.address().port}/api/v10` },
      });
      clients.push(client);
      await client.connect(transport);
      const { tools } = await client.listTools();
      for (const [name, parameter] of [
        ['guild_get', 'guild_id'], ['guild_list_channels', 'guild_id'], ['channel_get', 'channel_id'],
      ]) {
        const tool = tools.find(entry => entry.name === name);
        assert.ok(tool, name);
        assert.ok(tool.description);
        assert.equal(tool.inputSchema.type, 'object');
        assert.ok(tool.inputSchema.required.includes(parameter));
        assert.equal(tool.inputSchema.properties[parameter].type, 'string');
      }
      assert.ok(tools.some(entry => entry.name === 'user_get_current'));
      const result = await client.callTool({ name: 'guild_get', arguments: { guild_id: '123' } });
      assert.equal(result.isError, true);
      const response = JSON.parse(result.content[0].text);
      assert.equal(response.status, 403);
      assert.deepEqual(response.body, { message: 'Rejected [REDACTED] and [REDACTED]' });
      assert.ok(!JSON.stringify(result).includes(token));
    }
    assert.deepEqual(requests, tokens.map(token => ({
      url: '/api/v10/guilds/123', authorization: `Bot ${token}`,
    })));
  } finally {
    await Promise.all(clients.map(client => client.close()));
    http.close();
    await once(http, 'close');
  }
});

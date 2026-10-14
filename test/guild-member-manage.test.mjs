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
  const http = createServer(async (request, reply) => {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    requests.push({ method: request.method, url: request.url, body: raw ? JSON.parse(raw) : undefined,
      reason: request.headers['x-audit-log-reason'], authorization: request.headers.authorization });
    const status = request.url.endsWith('/bans/999') ? 429 : request.method === 'DELETE' || request.method === 'PUT' ? 204 : 200;
    reply.writeHead(status, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '2', ...(status === 429 ? { 'Retry-After': '1.5' } : {}) });
    reply.end(status === 204 ? '' : JSON.stringify(status === 429 ? { message: 'rate limited', retry_after: 1.5 } : { ok: true }));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'guild-member-manage-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath],
    env: { ...process.env, DISCORD_BOT_TOKEN: 'test-token', DISCORD_API_BASE_URL: `http://127.0.0.1:${http.address().port}/api/v10` } });
  try {
    await client.connect(transport);
    await run(client, requests);
  } finally {
    await client.close();
    http.close();
    await once(http, 'close');
  }
}

test('agent modifies another member and its own member profile through MCP', async () => {
  await withMcp(async (client, requests) => {
    const other = await client.callTool({ name: 'guild_member_modify', arguments: {
      guild_id: '123', user_id: '456', nick: null, roles: ['777'], mute: false, deaf: true,
      channel_id: null, communication_disabled_until: null, flags: 2, audit_log_reason: 'test & review',
    } });
    const self = await client.callTool({ name: 'guild_member_modify_current', arguments: {
      guild_id: '123', nick: 'Test Bot', banner: null, avatar: null, bio: 'test',
    } });
    assert.equal(other.isError, undefined);
    assert.deepEqual(JSON.parse(self.content[0].text).body, { ok: true });
    assert.deepEqual(requests, [
      { method: 'PATCH', url: '/api/v10/guilds/123/members/456', body: { nick: null, roles: ['777'], mute: false,
        deaf: true, channel_id: null, communication_disabled_until: null, flags: 2 }, reason: 'test%20%26%20review', authorization: 'Bot test-token' },
      { method: 'PATCH', url: '/api/v10/guilds/123/members/@me', body: { nick: 'Test Bot', banner: null, avatar: null, bio: 'test' },
        reason: undefined, authorization: 'Bot test-token' },
    ]);
  });
});

test('agent can list, inspect, create, remove and bulk create guild bans', async () => {
  await withMcp(async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_member_remove', 'guild_ban_create', 'guild_ban_bulk_create']) {
      assert.match(tools.find((tool) => tool.name === name)?.description ?? '', /removes? (the )?member/i);
    }
    const calls = [
      ['guild_ban_list', { guild_id: '123', limit: 20, before: '300', after: '100' }],
      ['guild_ban_get', { guild_id: '123', user_id: '456' }],
      ['guild_ban_create', { guild_id: '123', user_id: '456', delete_message_seconds: 3600, audit_log_reason: 'test ban' }],
      ['guild_ban_delete', { guild_id: '123', user_id: '456', audit_log_reason: 'undo' }],
      ['guild_ban_bulk_create', { guild_id: '123', user_ids: ['456', '789'], delete_message_seconds: 60, audit_log_reason: 'bulk' }],
      ['guild_member_remove', { guild_id: '123', user_id: '456', audit_log_reason: 'kick test' }],
    ];
    for (const [name, args] of calls) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, undefined, name);
    }
    assert.deepEqual(requests.map(({ method, url, body, reason }) => ({ method, url, body, reason })), [
      { method: 'GET', url: '/api/v10/guilds/123/bans?limit=20&before=300&after=100', body: undefined, reason: undefined },
      { method: 'GET', url: '/api/v10/guilds/123/bans/456', body: undefined, reason: undefined },
      { method: 'PUT', url: '/api/v10/guilds/123/bans/456', body: { delete_message_seconds: 3600 }, reason: 'test%20ban' },
      { method: 'DELETE', url: '/api/v10/guilds/123/bans/456', body: undefined, reason: 'undo' },
      { method: 'POST', url: '/api/v10/guilds/123/bulk-ban', body: { user_ids: ['456', '789'], delete_message_seconds: 60 }, reason: 'bulk' },
      { method: 'DELETE', url: '/api/v10/guilds/123/members/456', body: undefined, reason: 'kick%20test' },
    ]);
  });
});

test('Discord 429 and headers are returned without a retry', async () => {
  await withMcp(async (client, requests) => {
    const result = await client.callTool({ name: 'guild_ban_get', arguments: { guild_id: '123', user_id: '999' } });
    assert.equal(result.isError, true);
    assert.deepEqual(JSON.parse(result.content[0].text), { status: 429,
      body: { message: 'rate limited', retry_after: 1.5 },
      headers: { 'content-type': 'application/json', 'retry-after': '1.5', 'x-ratelimit-remaining': '2' } });
    assert.equal(requests.length, 1);
  });
});

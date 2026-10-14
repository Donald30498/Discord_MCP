import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

const serverPath = fileURLToPath(new URL('../dist/main.js', import.meta.url));

async function withMcp(responses, run) {
  const requests = [];
  const http = createServer(async (request, reply) => {
    let raw = '';
    for await (const part of request) raw += part;
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization,
      reason: request.headers['x-audit-log-reason'], body: raw ? JSON.parse(raw) : null });
    const response = responses[requests.length - 1];
    reply.writeHead(response.status, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '3', ...response.headers });
    reply.end(response.body === undefined ? '' : JSON.stringify(response.body));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'guild-role-test', version: '1.0.0' });
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

function body(result) { return JSON.parse(result.content[0].text); }

test('agent lists and reads guild roles and member counts', async () => {
  await withMcp([
    { status: 200, body: [{ id: '456', name: 'test-role' }] },
    { status: 200, body: { id: '456', name: 'test-role' } },
    { status: 200, body: { '456': 2 } },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_role_list', 'guild_role_get', 'guild_role_member_counts_get']) {
      assert.ok(tools.some((tool) => tool.name === name), name);
    }
    assert.deepEqual(body(await client.callTool({ name: 'guild_role_list', arguments: { guild_id: '123' } })).body,
      [{ id: '456', name: 'test-role' }]);
    assert.deepEqual(body(await client.callTool({ name: 'guild_role_get', arguments: { guild_id: '123', role_id: '456' } })).body,
      { id: '456', name: 'test-role' });
    assert.deepEqual(body(await client.callTool({ name: 'guild_role_member_counts_get', arguments: { guild_id: '123' } })).body,
      { '456': 2 });
    assert.deepEqual(requests.map(({ method, url, authorization }) => ({ method, url, authorization })), [
      { method: 'GET', url: '/api/v10/guilds/123/roles', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/roles/456', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/roles/member-counts', authorization: 'Bot test-token' },
    ]);
  });
});

test('agent creates and modifies roles with Discord fields and audit reasons', async () => {
  await withMcp([
    { status: 200, body: { id: '456', name: 'test-role' } },
    { status: 200, body: { id: '456', name: 'new-name' } },
    { status: 200, body: [{ id: '456', position: 1 }] },
  ], async (client, requests) => {
    assert.equal(body(await client.callTool({ name: 'guild_role_create', arguments: {
      guild_id: '123', name: 'test-role', permissions: '1024', color: 1234,
      colors: { primary_color: 1234, secondary_color: null, tertiary_color: null },
      hoist: false, icon: null, unicode_emoji: null, mentionable: false, audit_log_reason: '建立角色',
    } })).status, 200);
    assert.deepEqual(body(await client.callTool({ name: 'guild_role_modify', arguments: {
      guild_id: '123', role_id: '456', name: 'new-name', colors: { primary_color: 4321 },
      mentionable: true, audit_log_reason: 'rename',
    } })).body, { id: '456', name: 'new-name' });
    assert.deepEqual(body(await client.callTool({ name: 'guild_role_positions_modify', arguments: {
      guild_id: '123', roles: [{ id: '456', position: 1 }], audit_log_reason: 'reorder',
    } })).body, [{ id: '456', position: 1 }]);
    assert.deepEqual(requests.map(({ method, url, reason, body: requestBody }) => ({ method, url, reason, body: requestBody })), [
      { method: 'POST', url: '/api/v10/guilds/123/roles', reason: '%E5%BB%BA%E7%AB%8B%E8%A7%92%E8%89%B2',
        body: { name: 'test-role', permissions: '1024', color: 1234,
          colors: { primary_color: 1234, secondary_color: null, tertiary_color: null },
          hoist: false, icon: null, unicode_emoji: null, mentionable: false } },
      { method: 'PATCH', url: '/api/v10/guilds/123/roles/456', reason: 'rename',
        body: { name: 'new-name', colors: { primary_color: 4321 }, mentionable: true } },
      { method: 'PATCH', url: '/api/v10/guilds/123/roles', reason: 'reorder',
        body: [{ id: '456', position: 1 }] },
    ]);
  });
});

test('agent assigns and removes a member role and deletes a role', async () => {
  await withMcp([{ status: 204 }, { status: 204 }, { status: 204 }], async (client, requests) => {
    for (const [name, args] of [
      ['guild_member_role_add', { guild_id: '123', user_id: '789', role_id: '456', audit_log_reason: 'assign' }],
      ['guild_member_role_remove', { guild_id: '123', user_id: '789', role_id: '456', audit_log_reason: 'remove' }],
      ['guild_role_delete', { guild_id: '123', role_id: '456', audit_log_reason: 'cleanup' }],
    ]) assert.equal(body(await client.callTool({ name, arguments: args })).status, 204);
    assert.deepEqual(requests.map(({ method, url, reason }) => ({ method, url, reason })), [
      { method: 'PUT', url: '/api/v10/guilds/123/members/789/roles/456', reason: 'assign' },
      { method: 'DELETE', url: '/api/v10/guilds/123/members/789/roles/456', reason: 'remove' },
      { method: 'DELETE', url: '/api/v10/guilds/123/roles/456', reason: 'cleanup' },
    ]);
    assert.ok(requests.every((request) => request.body === null));
  });
});

test('agent receives Discord 429 without automatic retry', async () => {
  await withMcp([{ status: 429, headers: { 'Retry-After': '2' },
    body: { message: 'rate limited', retry_after: 2 } }], async (client, requests) => {
    const result = await client.callTool({ name: 'guild_role_delete', arguments: { guild_id: '123', role_id: '456' } });
    assert.equal(result.isError, true);
    assert.deepEqual(body(result), { status: 429, body: { message: 'rate limited', retry_after: 2 },
      headers: { 'content-type': 'application/json', 'retry-after': '2', 'x-ratelimit-remaining': '3' } });
    assert.equal(requests.length, 1);
  });
});

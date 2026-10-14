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
  const client = new Client({ name: 'scheduled-event-test', version: '1.0.0' });
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

test('agent can list, get and page scheduled event users', async () => {
  await withMcp([
    { status: 200, body: [{ id: '456', name: 'event', user_count: 2 }] },
    { status: 200, body: { id: '456', name: 'event', user_count: 2 } },
    { status: 200, body: [{ guild_scheduled_event_id: '456', user: { id: '789' } }] },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_scheduled_event_list', 'guild_scheduled_event_get', 'guild_scheduled_event_users_list']) {
      assert.ok(tools.some((tool) => tool.name === name), name);
    }
    const list = await client.callTool({ name: 'guild_scheduled_event_list', arguments: { guild_id: '123', with_user_count: true } });
    assert.deepEqual(body(list), { status: 200, body: [{ id: '456', name: 'event', user_count: 2 }],
      headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
    assert.equal(body(await client.callTool({ name: 'guild_scheduled_event_get', arguments: {
      guild_id: '123', guild_scheduled_event_id: '456', with_user_count: true,
    } })).body.id, '456');
    assert.deepEqual(body(await client.callTool({ name: 'guild_scheduled_event_users_list', arguments: {
      guild_id: '123', guild_scheduled_event_id: '456', limit: 10, with_member: true, after: '700',
    } })).body, [{ guild_scheduled_event_id: '456', user: { id: '789' } }]);
    assert.deepEqual(requests.map(({ method, url, authorization }) => ({ method, url, authorization })), [
      { method: 'GET', url: '/api/v10/guilds/123/scheduled-events?with_user_count=true', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/scheduled-events/456?with_user_count=true', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/scheduled-events/456/users?limit=10&with_member=true&after=700', authorization: 'Bot test-token' },
    ]);
  });
});

test('agent can create, modify and delete scheduled event with official fields', async () => {
  await withMcp([
    { status: 200, body: { id: '456', name: 'Demo' } },
    { status: 200, body: { id: '456', name: 'Renamed' } },
    { status: 204 },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_scheduled_event_create', 'guild_scheduled_event_modify', 'guild_scheduled_event_delete']) {
      assert.ok(tools.some((tool) => tool.name === name), name);
    }
    const created = await client.callTool({ name: 'guild_scheduled_event_create', arguments: {
      guild_id: '123', name: 'Demo', privacy_level: 2, scheduled_start_time: '2030-01-01T12:00:00Z',
      scheduled_end_time: '2030-01-01T13:00:00Z', entity_type: 3, channel_id: null,
      entity_metadata: { location: 'Online' }, description: 'Test', image: 'data:image/png;base64,aGVsbG8=',
      recurrence_rule: { start: '2030-01-01T12:00:00Z', frequency: 2, interval: 1, by_weekday: [1] },
      audit_log_reason: '建立活動',
    } });
    assert.equal(body(created).body.id, '456');
    const modified = await client.callTool({ name: 'guild_scheduled_event_modify', arguments: {
      guild_id: '123', guild_scheduled_event_id: '456', name: 'Renamed', description: null,
      status: 4, recurrence_rule: null, audit_log_reason: 'rename',
    } });
    assert.equal(body(modified).body.name, 'Renamed');
    const deleted = await client.callTool({ name: 'guild_scheduled_event_delete', arguments: {
      guild_id: '123', guild_scheduled_event_id: '456',
    } });
    assert.equal(body(deleted).status, 204);
    assert.deepEqual(requests.map(({ method, url, reason, body: requestBody }) => ({ method, url, reason, body: requestBody })), [
      { method: 'POST', url: '/api/v10/guilds/123/scheduled-events', reason: '%E5%BB%BA%E7%AB%8B%E6%B4%BB%E5%8B%95',
        body: { name: 'Demo', privacy_level: 2, scheduled_start_time: '2030-01-01T12:00:00Z',
          scheduled_end_time: '2030-01-01T13:00:00Z', entity_type: 3, channel_id: null,
          entity_metadata: { location: 'Online' }, description: 'Test', image: 'data:image/png;base64,aGVsbG8=',
          recurrence_rule: { start: '2030-01-01T12:00:00Z', frequency: 2, interval: 1, by_weekday: [1] } } },
      { method: 'PATCH', url: '/api/v10/guilds/123/scheduled-events/456', reason: 'rename',
        body: { name: 'Renamed', description: null, status: 4, recurrence_rule: null } },
      { method: 'DELETE', url: '/api/v10/guilds/123/scheduled-events/456', reason: undefined, body: null },
    ]);
  });
});

test('agent receives scheduled event 429 without a retry', async () => {
  await withMcp([{ status: 429, headers: { 'Retry-After': '2' }, body: { message: 'rate limited', retry_after: 2 } }],
    async (client, requests) => {
      const result = await client.callTool({ name: 'guild_scheduled_event_list', arguments: { guild_id: '123' } });
      assert.equal(result.isError, true);
      assert.deepEqual(body(result), { status: 429, body: { message: 'rate limited', retry_after: 2 },
        headers: { 'content-type': 'application/json', 'retry-after': '2', 'x-ratelimit-remaining': '3' } });
      assert.equal(requests.length, 1);
    });
});

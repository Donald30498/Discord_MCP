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
      contentType: request.headers['content-type'], reason: request.headers['x-audit-log-reason'],
      body: raw ? JSON.parse(raw) : null });
    const response = responses[requests.length - 1];
    reply.writeHead(response.status, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '3', ...response.headers });
    reply.end(response.body === undefined ? '' : JSON.stringify(response.body));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'channel-write-test', version: '1.0.0' });
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

function resultBody(result) { return JSON.parse(result.content[0].text); }

test('agent creates a guild channel with official fields and audit reason', async () => {
  await withMcp([{ status: 201, body: { id: '456', name: 'test-room', type: 0 } }], async (client, requests) => {
    const { tools } = await client.listTools();
    assert.ok(tools.some(({ name }) => name === 'guild_create_channel'));
    const result = await client.callTool({ name: 'guild_create_channel', arguments: {
      guild_id: '123', name: 'test-room', type: 0, topic: 'test', parent_id: '789',
      permission_overwrites: [{ id: '123', type: 0, allow: '1024', deny: '0' }],
      audit_log_reason: '建立測試',
    } });
    assert.equal(result.isError, undefined);
    assert.deepEqual(resultBody(result), { status: 201, body: { id: '456', name: 'test-room', type: 0 },
      headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
    assert.deepEqual(requests, [{ method: 'POST', url: '/api/v10/guilds/123/channels', authorization: 'Bot test-token',
      contentType: 'application/json', reason: '%E5%BB%BA%E7%AB%8B%E6%B8%AC%E8%A9%A6',
      body: { name: 'test-room', type: 0, topic: 'test', parent_id: '789',
        permission_overwrites: [{ id: '123', type: 0, allow: '1024', deny: '0' }] } }]);
  });
});

test('agent modifies channel positions with an array and edits channel settings', async () => {
  await withMcp([{ status: 204 }, { status: 200, body: { id: '456', name: 'renamed', topic: 'new topic' } }],
    async (client, requests) => {
      const positions = await client.callTool({ name: 'guild_modify_channel_positions', arguments: {
        guild_id: '123', channels: [{ id: '456', position: 1, parent_id: null, lock_permissions: false, flags: 0 }],
        audit_log_reason: 'reorder',
      } });
      assert.deepEqual(resultBody(positions), { status: 204, body: '',
        headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
      const modify = await client.callTool({ name: 'channel_modify', arguments: {
        channel_id: '456', name: 'renamed', topic: 'new topic',
        available_tags: [{ name: 'tag', moderated: false }], default_auto_archive_duration: 1440,
        audit_log_reason: 'rename',
      } });
      assert.deepEqual(resultBody(modify).body, { id: '456', name: 'renamed', topic: 'new topic' });
      assert.deepEqual(requests, [
        { method: 'PATCH', url: '/api/v10/guilds/123/channels', authorization: 'Bot test-token',
          contentType: 'application/json', reason: 'reorder',
          body: [{ id: '456', position: 1, parent_id: null, lock_permissions: false, flags: 0 }] },
        { method: 'PATCH', url: '/api/v10/channels/456', authorization: 'Bot test-token',
          contentType: 'application/json', reason: 'rename',
          body: { name: 'renamed', topic: 'new topic', available_tags: [{ name: 'tag', moderated: false }],
            default_auto_archive_duration: 1440 } },
      ]);
    });
});

test('agent manages permission overwrites and deletes a channel without an MCP confirmation', async () => {
  await withMcp([{ status: 204 }, { status: 204 }, { status: 200, body: { id: '456', name: 'renamed' } }],
    async (client, requests) => {
      assert.equal(resultBody(await client.callTool({ name: 'channel_permission_edit', arguments: {
        channel_id: '456', overwrite_id: '789', type: 0, allow: '1024', deny: '0', audit_log_reason: 'allow view',
      } })).status, 204);
      assert.equal(resultBody(await client.callTool({ name: 'channel_permission_delete', arguments: {
        channel_id: '456', overwrite_id: '789', audit_log_reason: 'remove overwrite',
      } })).status, 204);
      assert.deepEqual(resultBody(await client.callTool({ name: 'channel_delete', arguments: {
        channel_id: '456', audit_log_reason: 'cleanup',
      } })).body, { id: '456', name: 'renamed' });
      assert.deepEqual(requests, [
        { method: 'PUT', url: '/api/v10/channels/456/permissions/789', authorization: 'Bot test-token',
          contentType: 'application/json', reason: 'allow%20view', body: { type: 0, allow: '1024', deny: '0' } },
        { method: 'DELETE', url: '/api/v10/channels/456/permissions/789', authorization: 'Bot test-token',
          contentType: undefined, reason: 'remove%20overwrite', body: null },
        { method: 'DELETE', url: '/api/v10/channels/456', authorization: 'Bot test-token',
          contentType: undefined, reason: 'cleanup', body: null },
      ]);
    });
});

test('agent receives Discord 429 and retry headers without automatic retry', async () => {
  await withMcp([{ status: 429, headers: { 'Retry-After': '2' },
    body: { message: 'rate limited', retry_after: 2 } }], async (client, requests) => {
    const result = await client.callTool({ name: 'channel_modify', arguments: { channel_id: '456', name: 'later' } });
    assert.equal(result.isError, true);
    assert.deepEqual(resultBody(result), { status: 429, body: { message: 'rate limited', retry_after: 2 },
      headers: { 'content-type': 'application/json', 'retry-after': '2', 'x-ratelimit-remaining': '3' } });
    assert.equal(requests.length, 1);
  });
});

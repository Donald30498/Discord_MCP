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
    requests.push({ method: request.method, url: request.url,
      body: raw ? JSON.parse(raw) : undefined,
      reason: request.headers['x-audit-log-reason'], authorization: request.headers.authorization });
    const status = request.url.endsWith('/vanity-url') ? 429 : request.method === 'DELETE' ? 204 : 200;
    reply.writeHead(status, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '2',
      ...(status === 429 ? { 'Retry-After': '1.5' } : {}) });
    reply.end(status === 204 ? '' : JSON.stringify(status === 429 ? { message: 'rate limited' } : { ok: true }));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'guild-manage-test', version: '1.0.0' });
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

test('agent modifies guild settings and reads one audit log page', async () => {
  await withMcp(async (client, requests) => {
    const changed = await client.callTool({ name: 'guild_modify', arguments: {
      guild_id: '123', name: 'Demo', verification_level: 1, afk_channel_id: null,
      features: ['COMMUNITY'], audit_log_reason: 'review & test',
    } });
    const audit = await client.callTool({ name: 'guild_audit_log_get', arguments: {
      guild_id: '123', user_id: '456', action_type: 1, before: '999', after: '100', limit: 10,
    } });
    assert.equal(changed.isError, undefined);
    assert.deepEqual(JSON.parse(audit.content[0].text), {
      status: 200, body: { ok: true }, headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '2' },
    });
    assert.deepEqual(requests, [
      { method: 'PATCH', url: '/api/v10/guilds/123', body: { name: 'Demo', verification_level: 1,
        afk_channel_id: null, features: ['COMMUNITY'] }, reason: 'review%20%26%20test', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/audit-logs?user_id=456&action_type=1&before=999&after=100&limit=10',
        body: undefined, reason: undefined, authorization: 'Bot test-token' },
    ]);
  });
});

test('agent reads guild management resources through named tools', async () => {
  await withMcp(async (client, requests) => {
    const names = ['guild_preview_get', 'guild_voice_regions_list', 'guild_integrations_list',
      'guild_vanity_url_get', 'guild_prune_count_get'];
    const { tools } = await client.listTools();
    for (const name of names) assert.ok(tools.some((tool) => tool.name === name), name);
    for (const name of names) {
      await client.callTool({ name, arguments: { guild_id: '123', ...(name === 'guild_prune_count_get'
        ? { days: 14, include_roles: ['456', '789'] } : {}) } });
    }
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['GET', '/api/v10/guilds/123/preview'],
      ['GET', '/api/v10/guilds/123/regions'],
      ['GET', '/api/v10/guilds/123/integrations'],
      ['GET', '/api/v10/guilds/123/vanity-url'],
      ['GET', '/api/v10/guilds/123/prune?days=14&include_roles=456%2C789'],
    ]);
    assert.equal(requests.every(({ authorization }) => authorization === 'Bot test-token'), true);
  });
});

test('agent can set incident actions, begin pruning, and delete integration', async () => {
  await withMcp(async (client, requests) => {
    const actions = await client.callTool({ name: 'guild_incident_actions_modify', arguments: {
      guild_id: '123', invites_disabled_until: null, dms_disabled_until: '2026-10-14T12:00:00Z',
    } });
    const prune = await client.callTool({ name: 'guild_prune_begin', arguments: {
      guild_id: '123', days: 7, compute_prune_count: false, include_roles: ['456'], reason: 'old',
      audit_log_reason: 'test prune',
    } });
    const removed = await client.callTool({ name: 'guild_integration_delete', arguments: {
      guild_id: '123', integration_id: '456', audit_log_reason: 'test remove',
    } });
    for (const result of [actions, prune, removed]) assert.equal(result.isError, undefined);
    assert.deepEqual(requests.map(({ method, url, body, reason }) => ({ method, url, body, reason })), [
      { method: 'PUT', url: '/api/v10/guilds/123/incident-actions',
        body: { invites_disabled_until: null, dms_disabled_until: '2026-10-14T12:00:00Z' }, reason: undefined },
      { method: 'POST', url: '/api/v10/guilds/123/prune',
        body: { days: 7, compute_prune_count: false, include_roles: ['456'], reason: 'old' }, reason: 'test%20prune' },
      { method: 'DELETE', url: '/api/v10/guilds/123/integrations/456', body: undefined, reason: 'test%20remove' },
    ]);
  });
});

test('Discord rate limit is returned without a retry', async () => {
  await withMcp(async (client, requests) => {
    const result = await client.callTool({ name: 'guild_vanity_url_get', arguments: { guild_id: '123' } });
    assert.equal(result.isError, true);
    assert.deepEqual(JSON.parse(result.content[0].text), { status: 429, body: { message: 'rate limited' },
      headers: { 'content-type': 'application/json', 'retry-after': '1.5', 'x-ratelimit-remaining': '2' } });
    assert.equal(requests.length, 1);
  });
});

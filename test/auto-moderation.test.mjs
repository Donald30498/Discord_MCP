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
  const client = new Client({ name: 'auto-moderation-test', version: '1.0.0' });
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

test('agent can list and get Auto Moderation rules', async () => {
  await withMcp([
    { status: 200, body: [{ id: '456', name: 'rule' }] },
    { status: 200, body: { id: '456', name: 'rule' } },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_auto_moderation_rule_list', 'guild_auto_moderation_rule_get']) {
      assert.ok(tools.some((tool) => tool.name === name), name);
    }
    assert.deepEqual(body(await client.callTool({ name: 'guild_auto_moderation_rule_list', arguments: { guild_id: '123' } })),
      { status: 200, body: [{ id: '456', name: 'rule' }], headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
    assert.deepEqual(body(await client.callTool({ name: 'guild_auto_moderation_rule_get', arguments: { guild_id: '123', rule_id: '456' } })).body,
      { id: '456', name: 'rule' });
    assert.deepEqual(requests.map(({ method, url, authorization }) => ({ method, url, authorization })), [
      { method: 'GET', url: '/api/v10/guilds/123/auto-moderation/rules', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/auto-moderation/rules/456', authorization: 'Bot test-token' },
    ]);
  });
});

test('agent can create, modify and delete rules with official fields', async () => {
  await withMcp([
    { status: 200, body: { id: '456', name: 'new-rule' } },
    { status: 200, body: { id: '456', name: 'renamed-rule' } },
    { status: 204 },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_auto_moderation_rule_create', 'guild_auto_moderation_rule_modify', 'guild_auto_moderation_rule_delete']) {
      assert.ok(tools.some((tool) => tool.name === name), name);
    }
    const modify = tools.find((tool) => tool.name === 'guild_auto_moderation_rule_modify');
    assert.equal(Object.hasOwn(modify.inputSchema.properties, 'trigger_type'), false);
    const created = await client.callTool({ name: 'guild_auto_moderation_rule_create', arguments: {
      guild_id: '123', name: 'new-rule', event_type: 1, trigger_type: 1,
      trigger_metadata: { keyword_filter: ['test*'], regex_patterns: ['^test$'] },
      actions: [{ type: 1, metadata: { custom_message: 'blocked' } }], enabled: false,
      exempt_roles: ['789'], exempt_channels: ['012'], audit_log_reason: '建立規則',
    } });
    assert.equal(body(created).status, 200);
    const modified = await client.callTool({ name: 'guild_auto_moderation_rule_modify', arguments: {
      guild_id: '123', rule_id: '456', name: 'renamed-rule', event_type: 1,
      trigger_metadata: { allow_list: ['allowed'] }, actions: [{ type: 1 }],
      enabled: true, exempt_roles: [], exempt_channels: [], audit_log_reason: 'rename',
    } });
    assert.deepEqual(body(modified).body, { id: '456', name: 'renamed-rule' });
    const deleted = await client.callTool({ name: 'guild_auto_moderation_rule_delete', arguments: {
      guild_id: '123', rule_id: '456', audit_log_reason: 'cleanup',
    } });
    assert.deepEqual(body(deleted), { status: 204, body: '', headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
    assert.deepEqual(requests.map(({ method, url, reason, body: requestBody }) => ({ method, url, reason, body: requestBody })), [
      { method: 'POST', url: '/api/v10/guilds/123/auto-moderation/rules', reason: '%E5%BB%BA%E7%AB%8B%E8%A6%8F%E5%89%87',
        body: { name: 'new-rule', event_type: 1, trigger_type: 1,
          trigger_metadata: { keyword_filter: ['test*'], regex_patterns: ['^test$'] },
          actions: [{ type: 1, metadata: { custom_message: 'blocked' } }], enabled: false,
          exempt_roles: ['789'], exempt_channels: ['012'] } },
      { method: 'PATCH', url: '/api/v10/guilds/123/auto-moderation/rules/456', reason: 'rename',
        body: { name: 'renamed-rule', event_type: 1, trigger_metadata: { allow_list: ['allowed'] },
          actions: [{ type: 1 }], enabled: true, exempt_roles: [], exempt_channels: [] } },
      { method: 'DELETE', url: '/api/v10/guilds/123/auto-moderation/rules/456', reason: 'cleanup', body: null },
    ]);
  });
});

test('agent receives Discord 429 and retry header without automatic retry', async () => {
  await withMcp([{ status: 429, headers: { 'Retry-After': '2' },
    body: { message: 'rate limited', retry_after: 2 } }], async (client, requests) => {
    const result = await client.callTool({ name: 'guild_auto_moderation_rule_list', arguments: { guild_id: '123' } });
    assert.equal(result.isError, true);
    assert.deepEqual(body(result), { status: 429, body: { message: 'rate limited', retry_after: 2 },
      headers: { 'content-type': 'application/json', 'retry-after': '2', 'x-ratelimit-remaining': '3' } });
    assert.equal(requests.length, 1);
  });
});

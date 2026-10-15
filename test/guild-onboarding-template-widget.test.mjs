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
    reply.writeHead(response.status, { 'Content-Type': response.type ?? 'application/json',
      'X-RateLimit-Remaining': '3', ...response.headers });
    reply.end(response.bytes ?? (response.body === undefined ? '' : JSON.stringify(response.body)));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'guild-onboarding-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath],
    env: { ...process.env, DISCORD_BOT_TOKEN: 'test-token',
      DISCORD_API_BASE_URL: `http://127.0.0.1:${http.address().port}/api/v10` } });
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

test('agent gets and modifies guild onboarding through MCP', async () => {
  const onboarding = { guild_id: '123', prompts: [], default_channel_ids: [], enabled: false, mode: 0 };
  await withMcp([{ status: 200, body: onboarding }, { status: 200, body: onboarding }], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_onboarding_get', 'guild_onboarding_modify'])
      assert.ok(tools.some((tool) => tool.name === name), name);
    assert.deepEqual(body(await client.callTool({ name: 'guild_onboarding_get', arguments: { guild_id: '123' } })).body, onboarding);
    assert.equal(body(await client.callTool({ name: 'guild_onboarding_modify', arguments: {
      guild_id: '123', prompts: [{ id: '5', type: 0, title: 'Choose', single_select: true,
        required: false, in_onboarding: true, options: [{ id: '6', title: 'A', description: null,
          channel_ids: ['7'], role_ids: ['8'], emoji_id: null, emoji_name: '✨', emoji_animated: false }] }],
      default_channel_ids: ['7'], enabled: false, mode: 1, audit_log_reason: 'test onboarding',
    } })).status, 200);
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['GET', '/api/v10/guilds/123/onboarding'], ['PUT', '/api/v10/guilds/123/onboarding']]);
    assert.equal(requests[1].reason, 'test%20onboarding');
    assert.equal(requests[1].body.prompts[0].options[0].emoji_name, '✨');
    assert.equal(requests[1].body.mode, 1);
  });
});

test('agent operates guild templates with official methods and fields', async () => {
  const item = { code: 'code42', name: 'Test' };
  await withMcp(Array.from({ length: 6 }, () => ({ status: 200, body: item })), async (client, requests) => {
    const calls = [
      ['guild_template_get', { code: 'code42' }],
      ['guild_template_list', { guild_id: '123' }],
      ['guild_template_create', { guild_id: '123', name: 'Test', description: null }],
      ['guild_template_sync', { guild_id: '123', code: 'code42' }],
      ['guild_template_modify', { guild_id: '123', code: 'code42', name: 'New' }],
      ['guild_template_delete', { guild_id: '123', code: 'code42' }],
    ];
    for (const [name, args] of calls) assert.equal(body(await client.callTool({ name, arguments: args })).status, 200, name);
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['GET', '/api/v10/guilds/templates/code42'], ['GET', '/api/v10/guilds/123/templates'],
      ['POST', '/api/v10/guilds/123/templates'], ['PUT', '/api/v10/guilds/123/templates/code42'],
      ['PATCH', '/api/v10/guilds/123/templates/code42'], ['DELETE', '/api/v10/guilds/123/templates/code42']]);
    assert.deepEqual(requests[2].body, { name: 'Test', description: null });
    assert.deepEqual(requests[4].body, { name: 'New' });
    assert.equal(requests[4].reason, undefined);
  });
});

test('agent reads and modifies welcome screen and widget settings', async () => {
  await withMcp(Array.from({ length: 5 }, () => ({ status: 200, body: { enabled: false } })), async (client, requests) => {
    const calls = [
      ['guild_welcome_screen_get', { guild_id: '123' }],
      ['guild_welcome_screen_modify', { guild_id: '123', enabled: false, description: null,
        welcome_channels: [{ channel_id: '456', description: 'Here', emoji_id: null, emoji_name: '👋' }],
        audit_log_reason: 'test welcome' }],
      ['guild_widget_settings_get', { guild_id: '123' }],
      ['guild_widget_settings_modify', { guild_id: '123', enabled: false, channel_id: null,
        audit_log_reason: 'test widget' }],
      ['guild_widget_get', { guild_id: '123' }],
    ];
    for (const [name, args] of calls) assert.equal(body(await client.callTool({ name, arguments: args })).status, 200, name);
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['GET', '/api/v10/guilds/123/welcome-screen'], ['PATCH', '/api/v10/guilds/123/welcome-screen'],
      ['GET', '/api/v10/guilds/123/widget'], ['PATCH', '/api/v10/guilds/123/widget'],
      ['GET', '/api/v10/guilds/123/widget.json']]);
    assert.deepEqual(requests[1].body.welcome_channels, [{ channel_id: '456', description: 'Here', emoji_id: null, emoji_name: '👋' }]);
    assert.deepEqual(requests[3].body, { enabled: false, channel_id: null });
  });
});

test('agent receives exact widget PNG bytes as base64 with status and headers', async () => {
  const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 128]);
  await withMcp([{ status: 200, type: 'image/png', bytes }], async (client, requests) => {
    const result = body(await client.callTool({ name: 'guild_widget_image_get', arguments: {
      guild_id: '123', style: 'banner2' } }));
    assert.equal(result.status, 200);
    assert.equal(result.headers['content-type'], 'image/png');
    assert.equal(result.headers['x-ratelimit-remaining'], '3');
    assert.equal(result.body_encoding, 'base64');
    assert.deepEqual(Buffer.from(result.body, 'base64'), bytes);
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['GET', '/api/v10/guilds/123/widget.png?style=banner2']]);
  });
});

test('widget image returns Discord 429 once with response details', async () => {
  await withMcp([{ status: 429, headers: { 'Retry-After': '2' }, body: { message: 'rate limited' } }],
    async (client, requests) => {
      const response = await client.callTool({ name: 'guild_widget_image_get', arguments: { guild_id: '123' } });
      assert.equal(response.isError, true);
      assert.equal(body(response).status, 429);
      assert.equal(body(response).headers['retry-after'], '2');
      assert.equal(requests.length, 1);
    });
});

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
  const client = new Client({ name: 'soundboard-test', version: '1.0.0' });
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

test('agent can list default and guild sounds, and get one guild sound', async () => {
  await withMcp([
    { status: 200, body: [{ sound_id: '1', name: 'quack' }] },
    { status: 200, body: { items: [{ sound_id: '2', name: 'yay' }] } },
    { status: 200, body: { sound_id: '2', name: 'yay' } },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['soundboard_default_sound_list', 'guild_soundboard_sound_list', 'guild_soundboard_sound_get']) {
      assert.ok(tools.some((tool) => tool.name === name), name);
    }
    assert.deepEqual(resultBody(await client.callTool({ name: 'soundboard_default_sound_list' })),
      { status: 200, body: [{ sound_id: '1', name: 'quack' }], headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
    assert.deepEqual(resultBody(await client.callTool({ name: 'guild_soundboard_sound_list', arguments: { guild_id: '123' } })).body,
      { items: [{ sound_id: '2', name: 'yay' }] });
    assert.deepEqual(resultBody(await client.callTool({ name: 'guild_soundboard_sound_get', arguments: { guild_id: '123', sound_id: '2' } })).body,
      { sound_id: '2', name: 'yay' });
    assert.deepEqual(requests.map(({ method, url, authorization }) => ({ method, url, authorization })), [
      { method: 'GET', url: '/api/v10/soundboard-default-sounds', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/soundboard-sounds', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/soundboard-sounds/2', authorization: 'Bot test-token' },
    ]);
  });
});

test('agent can create, modify, delete, and send soundboard sounds with official fields', async () => {
  await withMcp([
    { status: 201, body: { sound_id: '2', name: 'yay' } },
    { status: 200, body: { sound_id: '2', name: 'yay2' } },
    { status: 204 },
    { status: 204 },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_soundboard_sound_create', 'guild_soundboard_sound_modify',
      'guild_soundboard_sound_delete', 'channel_soundboard_sound_send']) {
      assert.ok(tools.some((tool) => tool.name === name), name);
    }
    const created = await client.callTool({ name: 'guild_soundboard_sound_create', arguments: {
      guild_id: '123', name: 'yay', sound: 'data:audio/ogg;base64,T2dnUw==', volume: 0.5,
      emoji_id: null, emoji_name: '🎵', audit_log_reason: '建立音效',
    } });
    assert.equal(resultBody(created).status, 201);
    const modified = await client.callTool({ name: 'guild_soundboard_sound_modify', arguments: {
      guild_id: '123', sound_id: '2', name: 'yay2', volume: null, emoji_id: '55', emoji_name: null,
      audit_log_reason: 'rename',
    } });
    assert.equal(resultBody(modified).body.name, 'yay2');
    assert.equal(resultBody(await client.callTool({ name: 'guild_soundboard_sound_delete', arguments: {
      guild_id: '123', sound_id: '2', audit_log_reason: 'cleanup',
    } })).status, 204);
    assert.equal(resultBody(await client.callTool({ name: 'channel_soundboard_sound_send', arguments: {
      channel_id: '77', sound_id: '2', source_guild_id: '123',
    } })).status, 204);
    assert.deepEqual(requests.map(({ method, url, reason, body }) => ({ method, url, reason, body })), [
      { method: 'POST', url: '/api/v10/guilds/123/soundboard-sounds', reason: '%E5%BB%BA%E7%AB%8B%E9%9F%B3%E6%95%88',
        body: { name: 'yay', sound: 'data:audio/ogg;base64,T2dnUw==', volume: 0.5, emoji_id: null, emoji_name: '🎵' } },
      { method: 'PATCH', url: '/api/v10/guilds/123/soundboard-sounds/2', reason: 'rename',
        body: { name: 'yay2', volume: null, emoji_id: '55', emoji_name: null } },
      { method: 'DELETE', url: '/api/v10/guilds/123/soundboard-sounds/2', reason: 'cleanup', body: null },
      { method: 'POST', url: '/api/v10/channels/77/send-soundboard-sound', reason: undefined,
        body: { sound_id: '2', source_guild_id: '123' } },
    ]);
  });
});

test('agent receives Discord 429 and retry header without automatic retry', async () => {
  await withMcp([{ status: 429, headers: { 'Retry-After': '2' }, body: { message: 'rate limited', retry_after: 2 } }],
    async (client, requests) => {
      const result = await client.callTool({ name: 'guild_soundboard_sound_list', arguments: { guild_id: '123' } });
      assert.equal(result.isError, true);
      assert.deepEqual(resultBody(result), { status: 429, body: { message: 'rate limited', retry_after: 2 },
        headers: { 'content-type': 'application/json', 'retry-after': '2', 'x-ratelimit-remaining': '3' } });
      assert.equal(requests.length, 1);
    });
});

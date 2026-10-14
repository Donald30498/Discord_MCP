import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

const serverPath = fileURLToPath(new URL('../dist/main.js', import.meta.url));

async function withMcp(responses, run) {
  const requests = [];
  const http = createServer(async (request, reply) => {
    const raw = Buffer.concat(await Array.fromAsync(request));
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization,
      reason: request.headers['x-audit-log-reason'], contentType: request.headers['content-type'], raw });
    const response = responses[requests.length - 1];
    reply.writeHead(response.status, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '3', ...response.headers });
    reply.end(response.body === undefined ? '' : JSON.stringify(response.body));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'emoji-sticker-test', version: '1.0.0' });
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

test('agent can list and get guild emoji through MCP', async () => {
  await withMcp([
    { status: 200, body: [{ id: '456', name: 'wave' }] },
    { status: 200, body: { id: '456', name: 'wave' } },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    assert.ok(tools.some(({ name }) => name === 'guild_emoji_list'));
    assert.ok(tools.some(({ name }) => name === 'guild_emoji_get'));
    assert.deepEqual(resultBody(await client.callTool({ name: 'guild_emoji_list', arguments: { guild_id: '123' } })),
      { status: 200, body: [{ id: '456', name: 'wave' }],
        headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
    assert.deepEqual(resultBody(await client.callTool({ name: 'guild_emoji_get', arguments: {
      guild_id: '123', emoji_id: '456',
    } })).body, { id: '456', name: 'wave' });
    assert.deepEqual(requests.map(({ method, url, authorization }) => ({ method, url, authorization })), [
      { method: 'GET', url: '/api/v10/guilds/123/emojis', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/123/emojis/456', authorization: 'Bot test-token' },
    ]);
  });
});

test('agent can create, modify and delete a guild emoji using Discord fields', async () => {
  await withMcp([
    { status: 201, body: { id: '456', name: 'wave' } },
    { status: 200, body: { id: '456', name: 'wave_two' } },
    { status: 204 },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_emoji_create', 'guild_emoji_modify', 'guild_emoji_delete'])
      assert.ok(tools.some((tool) => tool.name === name), name);
    assert.equal(resultBody(await client.callTool({ name: 'guild_emoji_create', arguments: {
      guild_id: '123', name: 'wave', image: 'data:image/png;base64,AQID', roles: ['789'],
      audit_log_reason: 'create emoji',
    } })).status, 201);
    assert.deepEqual(resultBody(await client.callTool({ name: 'guild_emoji_modify', arguments: {
      guild_id: '123', emoji_id: '456', name: 'wave_two', roles: null,
    } })).body, { id: '456', name: 'wave_two' });
    assert.equal(resultBody(await client.callTool({ name: 'guild_emoji_delete', arguments: {
      guild_id: '123', emoji_id: '456',
    } })).status, 204);
    assert.deepEqual(requests.map(({ method, url, reason, raw }) => ({ method, url, reason,
      body: raw.length ? JSON.parse(raw.toString()) : null })), [
      { method: 'POST', url: '/api/v10/guilds/123/emojis', reason: 'create%20emoji',
        body: { name: 'wave', image: 'data:image/png;base64,AQID', roles: ['789'] } },
      { method: 'PATCH', url: '/api/v10/guilds/123/emojis/456', reason: undefined,
        body: { name: 'wave_two', roles: null } },
      { method: 'DELETE', url: '/api/v10/guilds/123/emojis/456', reason: undefined, body: null },
    ]);
  });
});

test('agent can read guild stickers, individual stickers, and sticker packs', async () => {
  const endpoints = [
    ['guild_sticker_list', { guild_id: '123' }, '/api/v10/guilds/123/stickers'],
    ['guild_sticker_get', { guild_id: '123', sticker_id: '456' }, '/api/v10/guilds/123/stickers/456'],
    ['sticker_get', { sticker_id: '456' }, '/api/v10/stickers/456'],
    ['sticker_pack_list', {}, '/api/v10/sticker-packs'],
    ['sticker_pack_get', { pack_id: '789' }, '/api/v10/sticker-packs/789'],
  ];
  await withMcp(endpoints.map((_, i) => ({ status: 200, body: { result: i } })), async (client, requests) => {
    const { tools } = await client.listTools();
    for (const [name, args] of endpoints) {
      assert.ok(tools.some((tool) => tool.name === name), name);
      const result = await client.callTool({ name, arguments: args });
      assert.equal(resultBody(result).status, 200);
    }
    assert.deepEqual(requests.map(({ method, url }) => ({ method, url })),
      endpoints.map(([, , url]) => ({ method: 'GET', url })));
  });
});

test('agent can upload, modify, and delete a guild sticker', async () => {
  const fixtureDir = resolve('.scratch/t16/fixture');
  const filePath = resolve(fixtureDir, 'sticker.png');
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(filePath, Buffer.from([137, 80, 78, 71, 1, 2]));
  try {
    await withMcp([
      { status: 201, body: { id: '456', name: 'wave' } },
      { status: 200, body: { id: '456', name: 'wave_two' } },
      { status: 204 },
    ], async (client, requests) => {
      const { tools } = await client.listTools();
      for (const name of ['guild_sticker_create', 'guild_sticker_modify', 'guild_sticker_delete'])
        assert.ok(tools.some((tool) => tool.name === name), name);
      assert.equal(resultBody(await client.callTool({ name: 'guild_sticker_create', arguments: {
        guild_id: '123', name: 'wave', description: '', tags: '👋', file_path: filePath,
        audit_log_reason: 'sticker test',
      } })).status, 201);
      assert.deepEqual(resultBody(await client.callTool({ name: 'guild_sticker_modify', arguments: {
        guild_id: '123', sticker_id: '456', name: 'wave_two', description: null, tags: 'hello',
      } })).body, { id: '456', name: 'wave_two' });
      assert.equal(resultBody(await client.callTool({ name: 'guild_sticker_delete', arguments: {
        guild_id: '123', sticker_id: '456', audit_log_reason: 'cleanup',
      } })).status, 204);
      assert.equal(requests[0].method, 'POST');
      assert.equal(requests[0].url, '/api/v10/guilds/123/stickers');
      assert.equal(requests[0].authorization, 'Bot test-token');
      assert.equal(requests[0].reason, 'sticker%20test');
      assert.match(requests[0].contentType, /^multipart\/form-data; boundary=/);
      const form = await new Request('http://localhost', { method: 'POST',
        headers: { 'Content-Type': requests[0].contentType }, body: requests[0].raw }).formData();
      assert.equal(form.get('name'), 'wave');
      assert.equal(form.get('description'), '');
      assert.equal(form.get('tags'), '👋');
      assert.equal(form.get('file').name, 'sticker.png');
      assert.deepEqual([...new Uint8Array(await form.get('file').arrayBuffer())], [137, 80, 78, 71, 1, 2]);
      assert.deepEqual(requests.slice(1).map(({ method, url, raw, reason }) => ({ method, url,
        body: raw.length ? JSON.parse(raw.toString()) : null, reason })), [
        { method: 'PATCH', url: '/api/v10/guilds/123/stickers/456',
          body: { name: 'wave_two', description: null, tags: 'hello' }, reason: undefined },
        { method: 'DELETE', url: '/api/v10/guilds/123/stickers/456', body: null, reason: 'cleanup' },
      ]);
    });
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});

test('agent receives a Discord 429 with retry headers and no automatic retry', async () => {
  await withMcp([{ status: 429, headers: { 'Retry-After': '3' },
    body: { message: 'rate limited', retry_after: 3 } }], async (client, requests) => {
    const result = await client.callTool({ name: 'guild_emoji_list', arguments: { guild_id: '123' } });
    assert.equal(result.isError, true);
    assert.deepEqual(resultBody(result), { status: 429, body: { message: 'rate limited', retry_after: 3 },
      headers: { 'content-type': 'application/json', 'retry-after': '3', 'x-ratelimit-remaining': '3' } });
    assert.equal(requests.length, 1);
  });
});

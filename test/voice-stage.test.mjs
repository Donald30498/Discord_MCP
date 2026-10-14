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
  const client = new Client({ name: 'voice-stage-test', version: '1.0.0' });
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

test('agent reads voice regions and current or another guild voice state', async () => {
  await withMcp([
    { status: 200, body: [{ id: 'us-east', name: 'US East' }] },
    { status: 200, body: { user_id: '2', channel_id: '4' } },
    { status: 200, body: { user_id: '3', channel_id: '4' } },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['voice_regions_list', 'guild_voice_state_get_current', 'guild_voice_state_get']) {
      assert.ok(tools.some((tool) => tool.name === name), name);
    }
    assert.deepEqual(resultBody(await client.callTool({ name: 'voice_regions_list' })),
      { status: 200, body: [{ id: 'us-east', name: 'US East' }],
        headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
    assert.equal(resultBody(await client.callTool({ name: 'guild_voice_state_get_current', arguments: { guild_id: '1' } })).body.user_id, '2');
    assert.equal(resultBody(await client.callTool({ name: 'guild_voice_state_get', arguments: { guild_id: '1', user_id: '3' } })).body.user_id, '3');
    assert.deepEqual(requests.map(({ method, url, authorization }) => ({ method, url, authorization })), [
      { method: 'GET', url: '/api/v10/voice/regions', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/1/voice-states/@me', authorization: 'Bot test-token' },
      { method: 'GET', url: '/api/v10/guilds/1/voice-states/3', authorization: 'Bot test-token' },
    ]);
  });
});

test('agent modifies voice states and manages a stage instance with official fields', async () => {
  await withMcp([
    { status: 204 }, { status: 204 }, { status: 200, body: { channel_id: '4', topic: 'first' } },
    { status: 200, body: { channel_id: '4', topic: 'first' } },
    { status: 200, body: { channel_id: '4', topic: 'second' } }, { status: 204 },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['guild_voice_state_modify_current', 'guild_voice_state_modify',
      'stage_instance_create', 'stage_instance_get', 'stage_instance_modify', 'stage_instance_delete']) {
      assert.ok(tools.some((tool) => tool.name === name), name);
    }
    assert.equal(resultBody(await client.callTool({ name: 'guild_voice_state_modify_current', arguments: {
      guild_id: '1', channel_id: '4', suppress: true, request_to_speak_timestamp: null,
    } })).status, 204);
    assert.equal(resultBody(await client.callTool({ name: 'guild_voice_state_modify', arguments: {
      guild_id: '1', user_id: '3', channel_id: '4', suppress: false,
    } })).status, 204);
    assert.equal(resultBody(await client.callTool({ name: 'stage_instance_create', arguments: {
      channel_id: '4', topic: 'first', privacy_level: 2, send_start_notification: false,
      guild_scheduled_event_id: '7', audit_log_reason: 'test stage',
    } })).status, 200);
    assert.equal(resultBody(await client.callTool({ name: 'stage_instance_get', arguments: { channel_id: '4' } })).body.topic, 'first');
    assert.equal(resultBody(await client.callTool({ name: 'stage_instance_modify', arguments: {
      channel_id: '4', topic: 'second', privacy_level: 2, audit_log_reason: 'update',
    } })).body.topic, 'second');
    assert.equal(resultBody(await client.callTool({ name: 'stage_instance_delete', arguments: {
      channel_id: '4', audit_log_reason: 'cleanup',
    } })).status, 204);
    assert.deepEqual(requests.map(({ method, url, reason, body }) => ({ method, url, reason, body })), [
      { method: 'PATCH', url: '/api/v10/guilds/1/voice-states/@me', reason: undefined,
        body: { channel_id: '4', suppress: true, request_to_speak_timestamp: null } },
      { method: 'PATCH', url: '/api/v10/guilds/1/voice-states/3', reason: undefined,
        body: { channel_id: '4', suppress: false } },
      { method: 'POST', url: '/api/v10/stage-instances', reason: 'test%20stage',
        body: { channel_id: '4', topic: 'first', privacy_level: 2, send_start_notification: false,
          guild_scheduled_event_id: '7' } },
      { method: 'GET', url: '/api/v10/stage-instances/4', reason: undefined, body: null },
      { method: 'PATCH', url: '/api/v10/stage-instances/4', reason: 'update', body: { topic: 'second', privacy_level: 2 } },
      { method: 'DELETE', url: '/api/v10/stage-instances/4', reason: 'cleanup', body: null },
    ]);
  });
});

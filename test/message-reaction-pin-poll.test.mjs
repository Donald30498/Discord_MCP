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
  const client = new Client({ name: 'reaction-pin-poll-test', version: '1.0.0' });
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

test('agent creates and lists reactions with encoded emoji and Discord pagination', async () => {
  await withMcp([{ status: 204 }, { status: 200, body: [{ id: 'user' }] }], async (client, requests) => {
    const { tools } = await client.listTools();
    assert.ok(tools.some(({ name }) => name === 'message_reaction_create'));
    assert.equal(body(await client.callTool({ name: 'message_reaction_create', arguments: {
      channel_id: '12', message_id: '34', emoji: '🙂',
    } })).status, 204);
    assert.deepEqual(body(await client.callTool({ name: 'message_reaction_list', arguments: {
      channel_id: '12', message_id: '34', emoji: 'a:b', type: 1, after: '55', limit: 10,
    } })).body, [{ id: 'user' }]);
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['PUT', '/api/v10/channels/12/messages/34/reactions/%F0%9F%99%82/@me'],
      ['GET', '/api/v10/channels/12/messages/34/reactions/a%3Ab?type=1&after=55&limit=10'],
    ]);
  });
});

test('agent removes own, another user, emoji and all reactions', async () => {
  await withMcp(Array.from({ length: 4 }, () => ({ status: 204 })), async (client, requests) => {
    for (const [name, args] of [
      ['message_reaction_delete_own', { emoji: '🙂' }],
      ['message_reaction_delete_user', { emoji: '🙂', user_id: '56' }],
      ['message_reaction_delete_emoji', { emoji: '🙂' }],
      ['message_reaction_delete_all', {}],
    ]) {
      assert.equal(body(await client.callTool({ name, arguments: { channel_id: '12', message_id: '34', ...args } })).status, 204);
    }
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['DELETE', '/api/v10/channels/12/messages/34/reactions/%F0%9F%99%82/@me'],
      ['DELETE', '/api/v10/channels/12/messages/34/reactions/%F0%9F%99%82/56'],
      ['DELETE', '/api/v10/channels/12/messages/34/reactions/%F0%9F%99%82'],
      ['DELETE', '/api/v10/channels/12/messages/34/reactions'],
    ]);
  });
});

test('agent pins, paginates pins and unpins on current routes', async () => {
  await withMcp([{ status: 204 }, { status: 200, body: { items: [{ message: { id: '34' } }], has_more: false } }, { status: 204 }],
    async (client, requests) => {
      assert.equal(body(await client.callTool({ name: 'message_pin', arguments: {
        channel_id: '12', message_id: '34', audit_log_reason: 'test pin',
      } })).status, 204);
      assert.deepEqual(body(await client.callTool({ name: 'message_pin_list', arguments: {
        channel_id: '12', before: '2026-10-14T00:00:00Z', limit: 2,
      } })).body, { items: [{ message: { id: '34' } }], has_more: false });
      assert.equal(body(await client.callTool({ name: 'message_unpin', arguments: {
        channel_id: '12', message_id: '34', audit_log_reason: 'test cleanup',
      } })).status, 204);
      assert.deepEqual(requests.map(({ method, url, reason }) => [method, url, reason]), [
        ['PUT', '/api/v10/channels/12/messages/pins/34', 'test%20pin'],
        ['GET', '/api/v10/channels/12/messages/pins?before=2026-10-14T00%3A00%3A00Z&limit=2', undefined],
        ['DELETE', '/api/v10/channels/12/messages/pins/34', 'test%20cleanup'],
      ]);
    });
});

test('agent creates a poll with message_create, lists voters and ends own poll', async () => {
  await withMcp([{ status: 200, body: { id: '34', poll: { question: { text: 'Q?' } } } },
    { status: 200, body: { users: [] } }, { status: 200, body: { id: '34', poll: { expiry: 'now' } } }],
  async (client, requests) => {
    const poll = { question: { text: 'Q?' }, answers: [{ poll_media: { text: 'A' } }, { poll_media: { text: 'B' } }],
      duration: 1, allow_multiselect: false, layout_type: 1 };
    assert.equal(body(await client.callTool({ name: 'message_create', arguments: { channel_id: '12', poll } })).status, 200);
    assert.deepEqual(body(await client.callTool({ name: 'poll_answer_voters_list', arguments: {
      channel_id: '12', message_id: '34', answer_id: 1, after: '56', limit: 5,
    } })).body, { users: [] });
    assert.equal(body(await client.callTool({ name: 'poll_end', arguments: {
      channel_id: '12', message_id: '34',
    } })).status, 200);
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['POST', '/api/v10/channels/12/messages'],
      ['GET', '/api/v10/channels/12/polls/34/answers/1?after=56&limit=5'],
      ['POST', '/api/v10/channels/12/polls/34/expire'],
    ]);
    assert.deepEqual(requests[0].body, { poll });
  });
});

test('Discord 429 for reaction is returned once with retry headers', async () => {
  await withMcp([{ status: 429, headers: { 'Retry-After': '2' }, body: { message: 'rate limited' } }], async (client, requests) => {
    const result = await client.callTool({ name: 'message_reaction_create', arguments: {
      channel_id: '12', message_id: '34', emoji: '🙂',
    } });
    assert.equal(result.isError, true);
    assert.deepEqual(body(result), { status: 429, body: { message: 'rate limited' },
      headers: { 'content-type': 'application/json', 'retry-after': '2', 'x-ratelimit-remaining': '3' } });
    assert.equal(requests.length, 1);
  });
});

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

async function withMcp(responses, run) {
  const requests = [];
  const http = createServer(async (request, reply) => {
    let raw = '';
    for await (const part of request) raw += part;
    requests.push({ method: request.method, url: request.url, auth: request.headers.authorization,
      body: raw ? JSON.parse(raw) : null });
    const response = responses[requests.length - 1];
    reply.writeHead(response.status, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '2',
      ...response.headers });
    reply.end(response.body === undefined ? '' : JSON.stringify(response.body));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'interaction-response-test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../dist/main.js', import.meta.url))],
    env: { ...process.env, DISCORD_BOT_TOKEN: 'bot-test-token',
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

const body = (result) => JSON.parse(result.content[0].text);

test('agent sends buttons and a disabled single-select through existing message tools', async () => {
  await withMcp([{ status: 200, body: { id: '456' } }, { status: 200, body: { id: '456' } }],
    async (client, requests) => {
      const buttons = [{ type: 1, components: [
        { type: 2, style: 1, label: 'A', custom_id: 'choose:a' },
        { type: 2, style: 2, label: 'B', custom_id: 'choose:b' },
        { type: 2, style: 2, label: 'C', custom_id: 'choose:c' },
      ] }];
      const created = await client.callTool({ name: 'message_create', arguments: {
        channel_id: '123', flags: 32768, allowed_mentions: { parse: [] },
        components: [{ type: 10, content: 'Choose one' }, ...buttons],
      } });
      assert.equal(body(created).status, 200);
      const selected = await client.callTool({ name: 'message_edit', arguments: {
        channel_id: '123', message_id: '456', allowed_mentions: { parse: [] },
        components: [{ type: 1, components: [{ type: 3, custom_id: 'choose:menu',
          min_values: 1, max_values: 1, disabled: true,
          options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }, { label: 'C', value: 'c' }],
        }] }],
      } });
      assert.equal(body(selected).status, 200);
      assert.deepEqual(requests.map(({ body: requestBody }) => requestBody), [
        { flags: 32768, allowed_mentions: { parse: [] },
          components: [{ type: 10, content: 'Choose one' }, ...buttons] },
        { allowed_mentions: { parse: [] }, components: [{ type: 1, components: [{ type: 3,
          custom_id: 'choose:menu', min_values: 1, max_values: 1, disabled: true,
          options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }, { label: 'C', value: 'c' }],
        }] }] },
      ]);
      assert.ok(requests.every(({ auth }) => auth === 'Bot bot-test-token'));
    });
});

test('agent sends component interaction callbacks without Bot authorization', async () => {
  await withMcp(Array.from({ length: 4 }, () => ({ status: 204 })), async (client, requests) => {
    const { tools } = await client.listTools();
    assert.ok(tools.some(({ name }) => name === 'interaction_response_create'));
    const callbacks = [
      { type: 4, data: { content: 'Private choice', flags: 64, allowed_mentions: { parse: [] } } },
      { type: 5, data: { flags: 64 } },
      { type: 6 },
      { type: 7, data: { content: 'Updated', components: [] } },
    ];
    for (const callback of callbacks) {
      const result = await client.callTool({ name: 'interaction_response_create', arguments: {
        interaction_id: '123', interaction_token: 'secret-token', ...callback,
      } });
      assert.equal(result.isError, undefined);
      assert.deepEqual(body(result), { status: 204, body: '',
        headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '2' } });
    }
    assert.deepEqual(requests, callbacks.map((callback) => ({ method: 'POST',
      url: '/api/v10/interactions/123/secret-token/callback', auth: undefined, body: callback })));
  });
});

test('agent completes a deferred response by editing the original interaction response', async () => {
  await withMcp([{ status: 200, body: { id: '456', content: 'Done' } }], async (client, requests) => {
    const { tools } = await client.listTools();
    assert.ok(tools.some(({ name }) => name === 'interaction_original_response_edit'));
    const result = await client.callTool({ name: 'interaction_original_response_edit', arguments: {
      application_id: '789', interaction_token: 'secret-token', content: 'Done',
      allowed_mentions: { parse: [] }, components: [],
    } });
    assert.deepEqual(body(result), { status: 200, body: { id: '456', content: 'Done' },
      headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '2' } });
    assert.deepEqual(requests, [{ method: 'PATCH',
      url: '/api/v10/webhooks/789/secret-token/messages/@original?with_components=true', auth: undefined,
      body: { content: 'Done', allowed_mentions: { parse: [] }, components: [] } }]);
  });
});

test('interaction errors preserve Discord status without retrying or exposing the token', async () => {
  await withMcp([
    { status: 400, body: { message: 'Invalid request' } },
    { status: 429, headers: { 'Retry-After': '2' }, body: { message: 'Slow down', retry_after: 2 } },
    { status: 401, body: { message: 'Unknown interaction: secret-token' } },
    { status: 404, body: { message: 'Unknown webhook: secret-token' } },
  ], async (client, requests) => {
    const call = () => client.callTool({ name: 'interaction_response_create', arguments: {
      interaction_id: '123', interaction_token: 'secret-token', type: 4, data: { content: 'Hi' },
    } });
    const invalid = await call();
    assert.equal(invalid.isError, true);
    assert.equal(body(invalid).status, 400);
    const rateLimited = await call();
    assert.equal(rateLimited.isError, true);
    assert.deepEqual(body(rateLimited).headers, { 'content-type': 'application/json',
      'retry-after': '2', 'x-ratelimit-remaining': '2' });
    const expired = await call();
    assert.equal(expired.isError, true);
    assert.equal(body(expired).status, 401);
    assert.ok(!JSON.stringify(body(expired)).includes('secret-token'));
    const editExpired = await client.callTool({ name: 'interaction_original_response_edit', arguments: {
      application_id: '789', interaction_token: 'secret-token', content: 'Done',
    } });
    assert.equal(editExpired.isError, true);
    assert.equal(body(editExpired).status, 404);
    assert.ok(!JSON.stringify(body(editExpired)).includes('secret-token'));
    assert.equal(requests.length, 4);
    assert.ok(requests.every(({ auth }) => auth === undefined));
  });
});

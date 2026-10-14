import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, writeFile, rm } from 'node:fs/promises';
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
    let body = request.headers['content-type']?.startsWith('multipart/form-data') ? null :
      raw.length ? JSON.parse(raw.toString()) : null;
    if (request.headers['content-type']?.startsWith('multipart/form-data')) {
      const form = await new Request('http://localhost', { method: 'POST',
        headers: { 'Content-Type': request.headers['content-type'] }, body: raw }).formData();
      body = {};
      for (const [name, value] of form) {
        body[name] = typeof value === 'string' ? JSON.parse(value) :
          { filename: value.name, bytes: [...new Uint8Array(await value.arrayBuffer())] };
      }
    }
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization,
      contentType: request.headers['content-type'], reason: request.headers['x-audit-log-reason'],
      body });
    const response = responses[requests.length - 1];
    reply.writeHead(response.status, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '3', ...response.headers });
    reply.end(response.body === undefined ? '' : JSON.stringify(response.body));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'message-write-test', version: '1.0.0' });
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

test('agent creates a message with official JSON options and receives Discord response', async () => {
  await withMcp([{ status: 200, body: { id: '789', content: 'hello' } }], async (client, requests) => {
    const { tools } = await client.listTools();
    assert.ok(tools.some(({ name }) => name === 'message_create'));
    const result = await client.callTool({ name: 'message_create', arguments: {
      channel_id: '123', content: 'hello', allowed_mentions: { parse: [] },
      message_reference: { message_id: '456' }, flags: 4096, enforce_nonce: true, nonce: 'abc',
    } });
    assert.equal(result.isError, undefined);
    assert.deepEqual(resultBody(result), { status: 200, body: { id: '789', content: 'hello' },
      headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
    assert.deepEqual(requests, [{ method: 'POST', url: '/api/v10/channels/123/messages', authorization: 'Bot test-token',
      contentType: 'application/json', reason: undefined,
      body: { content: 'hello', allowed_mentions: { parse: [] }, message_reference: { message_id: '456' }, flags: 4096, enforce_nonce: true, nonce: 'abc' } }]);
  });
});

test('agent edits, deletes, bulk deletes, and crossposts with Discord operation routes', async () => {
  await withMcp([
    { status: 200, body: { id: '789', content: 'edited' } },
    { status: 204 },
    { status: 204 },
    { status: 200, body: { id: '789', flags: 1 } },
  ], async (client, requests) => {
    const { tools } = await client.listTools();
    for (const name of ['message_edit', 'message_delete', 'message_bulk_delete', 'message_crosspost']) {
      assert.ok(tools.some((tool) => tool.name === name));
    }
    assert.deepEqual(resultBody(await client.callTool({ name: 'message_edit', arguments: {
      channel_id: '123', message_id: '789', content: 'edited', attachments: [{ id: '1' }], allowed_mentions: { parse: [] },
    } })).body, { id: '789', content: 'edited' });
    assert.deepEqual(resultBody(await client.callTool({ name: 'message_delete', arguments: {
      channel_id: '123', message_id: '789', audit_log_reason: 'test cleanup',
    } })), { status: 204, body: '', headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
    assert.equal(resultBody(await client.callTool({ name: 'message_bulk_delete', arguments: {
      channel_id: '123', messages: ['1', '2'], audit_log_reason: '批次測試',
    } })).status, 204);
    assert.deepEqual(resultBody(await client.callTool({ name: 'message_crosspost', arguments: {
      channel_id: '123', message_id: '789',
    } })).body, { id: '789', flags: 1 });
    assert.deepEqual(requests, [
      { method: 'PATCH', url: '/api/v10/channels/123/messages/789', authorization: 'Bot test-token',
        contentType: 'application/json', reason: undefined, body: { content: 'edited', attachments: [{ id: '1' }], allowed_mentions: { parse: [] } } },
      { method: 'DELETE', url: '/api/v10/channels/123/messages/789', authorization: 'Bot test-token',
        contentType: undefined, reason: 'test%20cleanup', body: null },
      { method: 'POST', url: '/api/v10/channels/123/messages/bulk-delete', authorization: 'Bot test-token',
        contentType: 'application/json', reason: '%E6%89%B9%E6%AC%A1%E6%B8%AC%E8%A9%A6', body: { messages: ['1', '2'] } },
      { method: 'POST', url: '/api/v10/channels/123/messages/789/crosspost', authorization: 'Bot test-token',
        contentType: undefined, reason: undefined, body: null },
    ]);
  });
});

test('agent receives Discord 429 once for a write operation', async () => {
  await withMcp([{ status: 429, headers: { 'Retry-After': '1' }, body: { message: 'rate limited', retry_after: 1 } }],
    async (client, requests) => {
      const result = await client.callTool({ name: 'message_create', arguments: { channel_id: '123', content: 'hi' } });
      assert.equal(result.isError, true);
      assert.deepEqual(resultBody(result), { status: 429, body: { message: 'rate limited', retry_after: 1 },
        headers: { 'content-type': 'application/json', 'retry-after': '1', 'x-ratelimit-remaining': '3' } });
      assert.equal(requests.length, 1);
    });
});

test('agent creates and edits messages with local file bytes in Discord multipart fields', async () => {
  const fixtureDir = resolve('.scratch/t05/fixture');
  const filePath = resolve(fixtureDir, 'sample.txt');
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(filePath, Buffer.from([0, 1, 2, 255]));
  try {
    await withMcp([
      { status: 200, body: { id: '789', attachments: [{ id: '900', filename: 'sample.txt' }] } },
      { status: 200, body: { id: '789', attachments: [{ id: '900' }, { id: '901' }] } },
    ], async (client, requests) => {
      const created = await client.callTool({ name: 'message_create', arguments: {
        channel_id: '123', content: 'file', files: [{ path: filePath }],
        attachments: [{ id: 0, filename: 'sample.txt', description: 'binary sample' }],
      } });
      assert.equal(resultBody(created).status, 200);
      const edited = await client.callTool({ name: 'message_edit', arguments: {
        channel_id: '123', message_id: '789', files: [{ path: filePath, filename: 'second.txt' }],
        attachments: [{ id: '900' }, { id: 0, filename: 'second.txt' }],
      } });
      assert.deepEqual(resultBody(edited).body.attachments, [{ id: '900' }, { id: '901' }]);
      assert.equal(requests.length, 2);
      for (const request of requests) {
        assert.match(request.contentType, /^multipart\/form-data; boundary=/);
        assert.equal(request.authorization, 'Bot test-token');
        assert.deepEqual(request.body['files[0]'].bytes, [0, 1, 2, 255]);
      }
      assert.deepEqual(requests[0].body.payload_json, {
        content: 'file', attachments: [{ id: 0, filename: 'sample.txt', description: 'binary sample' }],
      });
      assert.equal(requests[0].body['files[0]'].filename, 'sample.txt');
      assert.deepEqual(requests[1].body.payload_json, {
        attachments: [{ id: '900' }, { id: 0, filename: 'second.txt' }],
      });
      assert.equal(requests[1].body['files[0]'].filename, 'second.txt');
    });
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});

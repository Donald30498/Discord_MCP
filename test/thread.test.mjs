import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const serverPath = fileURLToPath(new URL('../dist/main.js', import.meta.url));

async function withMcp(responses, run) {
  const requests = [];
  const http = createServer(async (request, reply) => {
    const chunks = [];
    for await (const part of request) chunks.push(part);
    const raw = Buffer.concat(chunks).toString();
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization,
      reason: request.headers['x-audit-log-reason'], contentType: request.headers['content-type'], raw });
    const response = responses[requests.length - 1];
    reply.writeHead(response.status, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '3', ...response.headers });
    reply.end(response.body === undefined ? '' : JSON.stringify(response.body));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'thread-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], env: {
    ...process.env, DISCORD_BOT_TOKEN: 'test-token', DISCORD_API_BASE_URL: `http://127.0.0.1:${http.address().port}/api/v10`,
  } });
  try {
    await client.connect(transport);
    await run(client, requests);
  } finally {
    await client.close();
    http.close();
    await once(http, 'close');
  }
}

const resultBody = (result) => JSON.parse(result.content[0].text);

test('agent can create threads from message and without a message', async () => {
  await withMcp([{ status: 201, body: { id: '22', type: 11 } }, { status: 201, body: { id: '23', type: 12 } }], async (client, requests) => {
    const tools = (await client.listTools()).tools.map((tool) => tool.name);
    assert.ok(tools.includes('thread_start_from_message'));
    assert.ok(tools.includes('thread_start_without_message'));
    assert.deepEqual(resultBody(await client.callTool({ name: 'thread_start_from_message', arguments: {
      channel_id: '10', message_id: '22', name: 'from post', auto_archive_duration: 1440,
      rate_limit_per_user: 5, audit_log_reason: 'thread check',
    } })).body, { id: '22', type: 11 });
    assert.equal(resultBody(await client.callTool({ name: 'thread_start_without_message', arguments: {
      channel_id: '10', name: 'private', type: 12, invitable: false,
    } })).status, 201);
    assert.deepEqual(requests.map(({ method, url, authorization, reason, raw }) => ({ method, url, authorization, reason, body: JSON.parse(raw) })), [
      { method: 'POST', url: '/api/v10/channels/10/messages/22/threads', authorization: 'Bot test-token', reason: 'thread%20check',
        body: { name: 'from post', auto_archive_duration: 1440, rate_limit_per_user: 5 } },
      { method: 'POST', url: '/api/v10/channels/10/threads', authorization: 'Bot test-token', reason: undefined,
        body: { name: 'private', type: 12, invitable: false } },
    ]);
  });
});

test('agent lists active and archived threads using Discord pagination', async () => {
  const page = { threads: [{ id: '23' }], members: [], has_more: true };
  await withMcp(Array.from({ length: 4 }, () => ({ status: 200, body: page })), async (client, requests) => {
    const calls = [
      ['guild_thread_list_active', { guild_id: '1' }],
      ['thread_list_public_archived', { channel_id: '10', before: '2026-10-01T01:02:03Z', limit: 7 }],
      ['thread_list_private_archived', { channel_id: '10', before: '2026-10-01T01:02:03Z', limit: 5 }],
      ['thread_list_joined_private_archived', { channel_id: '10', before: '23', limit: 3 }],
    ];
    for (const [name, args] of calls) assert.deepEqual(resultBody(await client.callTool({ name, arguments: args })).body, page);
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['GET', '/api/v10/guilds/1/threads/active'],
      ['GET', '/api/v10/channels/10/threads/archived/public?before=2026-10-01T01%3A02%3A03Z&limit=7'],
      ['GET', '/api/v10/channels/10/threads/archived/private?before=2026-10-01T01%3A02%3A03Z&limit=5'],
      ['GET', '/api/v10/channels/10/users/@me/threads/archived/private?before=23&limit=3'],
    ]);
  });
});

test('agent starts a forum thread with a local attachment', async () => {
  const scratch = fileURLToPath(new URL('../.scratch/t08/', import.meta.url));
  await mkdir(scratch, { recursive: true });
  const dir = await mkdtemp(join(scratch, 'attachment-'));
  const path = join(dir, 'note.txt');
  try {
    await writeFile(path, 'thread attachment', 'utf8');
    await withMcp([{ status: 201, body: { id: '33', name: 'forum post' } }], async (client, requests) => {
      const result = await client.callTool({ name: 'thread_start_forum', arguments: {
        channel_id: '50', name: 'forum post', message: { content: 'first', attachments: [{ id: 0, filename: 'note.txt' }] },
        applied_tags: ['70'], files: [{ path }], audit_log_reason: 'forum check',
      } });
      assert.deepEqual(resultBody(result).body, { id: '33', name: 'forum post' });
      assert.equal(requests.length, 1);
      assert.equal(requests[0].url, '/api/v10/channels/50/threads');
      assert.equal(requests[0].reason, 'forum%20check');
      assert.match(requests[0].contentType, /^multipart\/form-data; boundary=/);
      assert.match(requests[0].raw, /name="payload_json"/);
      assert.match(requests[0].raw, /"message":\{"content":"first","attachments":\[\{"id":0,"filename":"note.txt"\}\]\}/);
      assert.match(requests[0].raw, /name="files\[0\]"; filename="note.txt"/);
      assert.match(requests[0].raw, /thread attachment/);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('agent manages thread membership, receives errors and retry headers without retry', async () => {
  const responses = [
    { status: 204 }, { status: 204 }, { status: 200, body: { user_id: '2' } },
    { status: 200, body: [{ user_id: '2' }] }, { status: 204 }, { status: 204 },
    { status: 429, headers: { 'Retry-After': '2' }, body: { message: 'rate limited', retry_after: 2 } },
  ];
  await withMcp(responses, async (client, requests) => {
    const calls = [
      ['thread_join', { channel_id: '23' }],
      ['thread_member_add', { channel_id: '23', user_id: '2' }],
      ['thread_member_get', { channel_id: '23', user_id: '2', with_member: true }],
      ['thread_member_list', { channel_id: '23', with_member: true, after: '2', limit: 4 }],
      ['thread_member_remove', { channel_id: '23', user_id: '2' }],
      ['thread_leave', { channel_id: '23' }],
    ];
    for (const [name, args] of calls) assert.ok([200, 204].includes(resultBody(await client.callTool({ name, arguments: args })).status));
    const limited = await client.callTool({ name: 'thread_join', arguments: { channel_id: '23' } });
    assert.equal(limited.isError, true);
    assert.deepEqual(resultBody(limited), { status: 429, body: { message: 'rate limited', retry_after: 2 },
      headers: { 'content-type': 'application/json', 'retry-after': '2', 'x-ratelimit-remaining': '3' } });
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['PUT', '/api/v10/channels/23/thread-members/@me'],
      ['PUT', '/api/v10/channels/23/thread-members/2'],
      ['GET', '/api/v10/channels/23/thread-members/2?with_member=true'],
      ['GET', '/api/v10/channels/23/thread-members?with_member=true&after=2&limit=4'],
      ['DELETE', '/api/v10/channels/23/thread-members/2'],
      ['DELETE', '/api/v10/channels/23/thread-members/@me'],
      ['PUT', '/api/v10/channels/23/thread-members/@me'],
    ]);
    assert.equal(requests.length, 7);
  });
});

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

test('agent manages channel and target-user invites through MCP', async () => {
  const requests = [];
  const http = createServer(async (request, reply) => {
    let raw = ''; for await (const part of request) raw += part;
    requests.push({ method: request.method, url: request.url, body: raw ? JSON.parse(raw) : null,
      auth: request.headers.authorization, reason: request.headers['x-audit-log-reason'] });
    reply.writeHead(request.method === 'DELETE' ? 204 : 200, { 'Content-Type': 'application/json' });
    reply.end(request.method === 'DELETE' ? '' : '{}');
  });
  http.listen(0, '127.0.0.1'); await once(http, 'listening');
  const client = new Client({ name: 'test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../dist/main.js', import.meta.url))],
    env: { ...process.env, DISCORD_BOT_TOKEN: 'test-token',
      DISCORD_API_BASE_URL: `http://127.0.0.1:${http.address().port}/api/v10` } });
  try {
    await client.connect(transport);
    const cases = [
      ['channel_invite_list', { channel_id: '1' }, 'GET', '/channels/1/invites', null],
      ['channel_invite_create', { channel_id: '1', max_age: 60, audit_log_reason: 'test' }, 'POST', '/channels/1/invites', { max_age: 60 }],
      ['guild_invite_list', { guild_id: '2' }, 'GET', '/guilds/2/invites', null],
      ['invite_get', { code: 'abc', with_counts: true }, 'GET', '/invites/abc?with_counts=true', null],
      ['invite_target_user_add', { code: 'abc', user_id: '3' }, 'PUT', '/invites/abc/target-users/3', null],
      ['invite_target_user_bulk_add', { code: 'abc', user_ids: ['3'] }, 'POST', '/invites/abc/target-users/bulk-add', { user_ids: ['3'] }],
      ['invite_target_user_list', { code: 'abc' }, 'GET', '/invites/abc/target-users', null],
      ['invite_target_user_job_status', { code: 'abc' }, 'GET', '/invites/abc/target-users/job-status', null],
      ['invite_target_user_remove', { code: 'abc', user_id: '3' }, 'DELETE', '/invites/abc/target-users/3', null],
      ['invite_target_user_bulk_remove', { code: 'abc', user_ids: ['3'] }, 'POST', '/invites/abc/target-users/bulk-delete', { user_ids: ['3'] }],
      ['invite_delete', { code: 'abc' }, 'DELETE', '/invites/abc', null],
    ];
    for (const [name, args, method, path, body] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(JSON.parse(result.content[0].text).status, method === 'DELETE' ? 204 : 200);
      assert.deepEqual(requests.at(-1), { method, url: `/api/v10${path}`, body, auth: 'Bot test-token',
        reason: name === 'channel_invite_create' ? 'test' : undefined });
    }
  } finally { await client.close(); http.close(); await once(http, 'close'); }
});

test('agent uploads exact CSV bytes for invite target users', async () => {
  const dir = resolve('.scratch/review_fix/invite');
  const path = resolve(dir, 'targets.csv');
  await mkdir(dir, { recursive: true });
  await writeFile(path, 'user_id\n123\n', 'utf8');
  const requests = [];
  const http = createServer(async (request, reply) => {
    const raw = Buffer.concat(await Array.fromAsync(request));
    const form = await new Request('http://localhost', { method: 'POST',
      headers: { 'Content-Type': request.headers['content-type'] }, body: raw }).formData();
    requests.push({ method: request.method, url: request.url, contentType: request.headers['content-type'],
      filename: form.get('target_users_file')?.name, csv: await form.get('target_users_file')?.text(),
      payload: form.has('payload_json') ? JSON.parse(form.get('payload_json')) : undefined });
    reply.writeHead(200, { 'Content-Type': 'application/json' }); reply.end('{}');
  });
  http.listen(0, '127.0.0.1'); await once(http, 'listening');
  const client = new Client({ name: 'test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../dist/main.js', import.meta.url))],
    env: { ...process.env, DISCORD_BOT_TOKEN: 'test-token',
      DISCORD_API_BASE_URL: `http://127.0.0.1:${http.address().port}/api/v10` } });
  try {
    await client.connect(transport);
    await client.callTool({ name: 'channel_invite_create', arguments: {
      channel_id: '1', target_users_file_path: path, max_uses: 1 } });
    await client.callTool({ name: 'invite_target_user_replace', arguments: {
      code: 'abc', target_users_file_path: path } });
    assert.deepEqual(requests.map(({ method, url, filename, csv, payload }) => ({ method, url, filename, csv, payload })), [
      { method: 'POST', url: '/api/v10/channels/1/invites', filename: 'targets.csv', csv: 'user_id\n123\n', payload: { max_uses: 1 } },
      { method: 'PUT', url: '/api/v10/invites/abc/target-users', filename: 'targets.csv', csv: 'user_id\n123\n', payload: undefined },
    ]);
    for (const request of requests) assert.match(request.contentType, /^multipart\/form-data; boundary=/);
  } finally {
    await client.close(); http.close(); await once(http, 'close');
    const projectRoot = fileURLToPath(new URL('../', import.meta.url));
    assert.equal(relative(projectRoot, dir), join('.scratch', 'review_fix', 'invite'));
    await rm(dir, { recursive: true, force: true });
  }
});

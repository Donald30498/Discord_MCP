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
    requests.push({ method: request.method, url: request.url, auth: request.headers.authorization,
      body: raw ? JSON.parse(raw) : null });
    const response = responses[requests.length - 1];
    reply.writeHead(response.status, { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '3', ...response.headers });
    reply.end(response.body === undefined ? '' : JSON.stringify(response.body));
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const client = new Client({ name: 'application-command-test', version: '1.0.0' });
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

test('agent lists global application commands with Discord localization option', async () => {
  await withMcp([{ status: 200, body: [{ id: '7', name: 'hello' }] }], async (client, requests) => {
    const { tools } = await client.listTools();
    assert.ok(tools.some((tool) => tool.name === 'application_command_list'));
    const result = await client.callTool({ name: 'application_command_list', arguments: {
      application_id: '1', with_localizations: true,
    } });
    assert.deepEqual(resultBody(result), { status: 200, body: [{ id: '7', name: 'hello' }],
      headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '3' } });
    assert.deepEqual(requests, [{ method: 'GET', url: '/api/v10/applications/1/commands?with_localizations=true',
      auth: 'Bot test-token', body: null }]);
  });
});

test('agent creates, reads, modifies, deletes, and bulk overwrites global commands', async () => {
  await withMcp([
    { status: 201, body: { id: '7', name: 'hello' } },
    { status: 200, body: { id: '7', name: 'hello' } },
    { status: 200, body: { id: '7', name: 'hi' } },
    { status: 204 },
    { status: 200, body: [{ id: '8', name: 'next' }] },
  ], async (client, requests) => {
    assert.equal(resultBody(await client.callTool({ name: 'application_command_create', arguments: {
      application_id: '1', name: 'hello', description: 'Greeting', type: 1, options: [{ name: 'who', type: 3 }],
      integration_types: [0], contexts: [0],
    } })).status, 201);
    assert.equal(resultBody(await client.callTool({ name: 'application_command_get', arguments: {
      application_id: '1', command_id: '7',
    } })).body.name, 'hello');
    assert.equal(resultBody(await client.callTool({ name: 'application_command_modify', arguments: {
      application_id: '1', command_id: '7', name: 'hi', description: 'Updated',
    } })).body.name, 'hi');
    assert.equal(resultBody(await client.callTool({ name: 'application_command_delete', arguments: {
      application_id: '1', command_id: '7',
    } })).status, 204);
    assert.equal(resultBody(await client.callTool({ name: 'application_command_bulk_overwrite', arguments: {
      application_id: '1', commands: [{ name: 'next', description: 'Next', type: 1 }],
    } })).status, 200);
    assert.deepEqual(requests.map(({ method, url, body }) => ({ method, url, body })), [
      { method: 'POST', url: '/api/v10/applications/1/commands', body: { name: 'hello', description: 'Greeting',
        type: 1, options: [{ name: 'who', type: 3 }], integration_types: [0], contexts: [0] } },
      { method: 'GET', url: '/api/v10/applications/1/commands/7', body: null },
      { method: 'PATCH', url: '/api/v10/applications/1/commands/7', body: { name: 'hi', description: 'Updated' } },
      { method: 'DELETE', url: '/api/v10/applications/1/commands/7', body: null },
      { method: 'PUT', url: '/api/v10/applications/1/commands', body: [{ name: 'next', description: 'Next', type: 1 }] },
    ]);
  });
});

test('agent sets the handler for a global primary entry point command', async () => {
  await withMcp([
    { status: 201, body: { id: '7', name: 'launch', type: 4, handler: 2 } },
    { status: 200, body: { id: '7', name: 'launch', type: 4, handler: 1 } },
  ], async (client, requests) => {
    const created = await client.callTool({ name: 'application_command_create', arguments: {
      application_id: '1', name: 'launch', description: 'Launch activity', type: 4, handler: 2,
    } });
    assert.equal(resultBody(created).body.handler, 2);
    const modified = await client.callTool({ name: 'application_command_modify', arguments: {
      application_id: '1', command_id: '7', handler: 1,
    } });
    assert.equal(resultBody(modified).body.handler, 1);
    assert.deepEqual(requests.map(({ method, url, body }) => ({ method, url, body })), [
      { method: 'POST', url: '/api/v10/applications/1/commands',
        body: { name: 'launch', description: 'Launch activity', type: 4, handler: 2 } },
      { method: 'PATCH', url: '/api/v10/applications/1/commands/7', body: { handler: 1 } },
    ]);
  });
});

test('agent manages guild commands and reads their permissions', async () => {
  await withMcp([
    { status: 200, body: [{ id: '7', name: 'hello' }] },
    { status: 201, body: { id: '7', name: 'hello' } },
    { status: 200, body: { id: '7', name: 'hello' } },
    { status: 200, body: { id: '7', name: 'hi' } },
    { status: 204 },
    { status: 200, body: [{ id: '8', name: 'next' }] },
    { status: 200, body: [{ id: '8', permissions: [] }] },
    { status: 200, body: { id: '8', permissions: [] } },
  ], async (client, requests) => {
    const ids = { application_id: '1', guild_id: '2' };
    assert.equal(resultBody(await client.callTool({ name: 'guild_application_command_list', arguments: {
      ...ids, with_localizations: false,
    } })).status, 200);
    assert.equal(resultBody(await client.callTool({ name: 'guild_application_command_create', arguments: {
      ...ids, name: 'hello', description: 'Greeting', type: 1,
    } })).status, 201);
    assert.equal(resultBody(await client.callTool({ name: 'guild_application_command_get', arguments: {
      ...ids, command_id: '7',
    } })).body.name, 'hello');
    assert.equal(resultBody(await client.callTool({ name: 'guild_application_command_modify', arguments: {
      ...ids, command_id: '7', name: 'hi',
    } })).body.name, 'hi');
    assert.equal(resultBody(await client.callTool({ name: 'guild_application_command_delete', arguments: {
      ...ids, command_id: '7',
    } })).status, 204);
    assert.equal(resultBody(await client.callTool({ name: 'guild_application_command_bulk_overwrite', arguments: {
      ...ids, commands: [{ name: 'next', description: 'Next', type: 1 }],
    } })).status, 200);
    assert.equal(resultBody(await client.callTool({ name: 'guild_application_command_permissions_list', arguments: ids })).status, 200);
    assert.equal(resultBody(await client.callTool({ name: 'guild_application_command_permissions_get', arguments: {
      ...ids, command_id: '8',
    } })).status, 200);
    assert.deepEqual(requests.map(({ method, url, body }) => ({ method, url, body })), [
      { method: 'GET', url: '/api/v10/applications/1/guilds/2/commands?with_localizations=false', body: null },
      { method: 'POST', url: '/api/v10/applications/1/guilds/2/commands', body: { name: 'hello', description: 'Greeting', type: 1 } },
      { method: 'GET', url: '/api/v10/applications/1/guilds/2/commands/7', body: null },
      { method: 'PATCH', url: '/api/v10/applications/1/guilds/2/commands/7', body: { name: 'hi' } },
      { method: 'DELETE', url: '/api/v10/applications/1/guilds/2/commands/7', body: null },
      { method: 'PUT', url: '/api/v10/applications/1/guilds/2/commands', body: [{ name: 'next', description: 'Next', type: 1 }] },
      { method: 'GET', url: '/api/v10/applications/1/guilds/2/commands/permissions', body: null },
      { method: 'GET', url: '/api/v10/applications/1/guilds/2/commands/8/permissions', body: null },
    ]);
  });
});

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

test('agent calls SKU, entitlement and subscription tools through MCP', async () => {
  const requests = [];
  const http = createServer(async (request, reply) => {
    let raw = '';
    for await (const part of request) raw += part;
    requests.push({ method: request.method, url: request.url, body: raw ? JSON.parse(raw) : null,
      auth: request.headers.authorization });
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
      ['sku_list', { application_id: '1' }, 'GET', '/applications/1/skus', null],
      ['entitlement_list', { application_id: '1', user_id: '2', limit: 5, exclude_deleted: false }, 'GET', '/applications/1/entitlements?user_id=2&limit=5&exclude_deleted=false', null],
      ['entitlement_get', { application_id: '1', entitlement_id: '3' }, 'GET', '/applications/1/entitlements/3', null],
      ['entitlement_create_test', { application_id: '1', sku_id: '4', owner_id: '2', owner_type: 2 }, 'POST', '/applications/1/entitlements', { sku_id: '4', owner_id: '2', owner_type: 2 }],
      ['entitlement_consume', { application_id: '1', entitlement_id: '3' }, 'POST', '/applications/1/entitlements/3/consume', null],
      ['entitlement_delete_test', { application_id: '1', entitlement_id: '3' }, 'DELETE', '/applications/1/entitlements/3', null],
      ['sku_subscription_list', { sku_id: '4', user_id: '2', after: '5' }, 'GET', '/skus/4/subscriptions?user_id=2&after=5', null],
      ['sku_subscription_get', { sku_id: '4', subscription_id: '6' }, 'GET', '/skus/4/subscriptions/6', null],
    ];
    for (const [name, args, method, path, body] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(JSON.parse(result.content[0].text).status, method === 'DELETE' ? 204 : 200);
      assert.deepEqual(requests.at(-1), { method, url: `/api/v10${path}`, body, auth: 'Bot test-token' });
    }
  } finally { await client.close(); http.close(); await once(http, 'close'); }
});

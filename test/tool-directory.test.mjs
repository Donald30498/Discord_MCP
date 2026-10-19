import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { buildDirectory, directoryUri } from '../dist/tool-directory.js';

test('standard resource exposes a complete navigable directory without changing tools/list', async () => {
  const client = new Client({ name: 'directory-contract-test', version: '1' });
  const token = 'directory-test-secret';
  try {
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL('../dist/main.js', import.meta.url))],
      env: { DISCORD_BOT_TOKEN: token },
    }));
    const resources = (await client.listResources()).resources;
    assert.equal(resources.filter(resource => resource.uri === directoryUri).length, 1);
    assert.equal(resources.find(resource => resource.uri === directoryUri).mimeType, 'application/json');
    const result = await client.readResource({ uri: directoryUri });
    assert.equal(result.contents.length, 1);
    assert.equal(result.contents[0].uri, directoryUri);
    assert.equal(result.contents[0].mimeType, 'application/json');
    const text = result.contents[0].text;
    assert.ok(Buffer.byteLength(text, 'utf8') <= 1024 * 1024);
    assert.ok(!text.includes(token));
    const directory = JSON.parse(text);
    assert.equal(directory.schemaVersion, 1);
    assert.ok(directory.revision.length > 0 && directory.revision.length <= 128);
    const tools = (await client.listTools()).tools;
    assert.deepEqual(directory.tools.map(tool => tool.toolName).sort(), tools.map(tool => tool.name).sort());
    assert.equal(new Set(directory.tools.map(tool => tool.toolName)).size, tools.length);
    assert.ok(directory.folders.length <= 512 && directory.tools.length <= 1000);
    const folders = new Map(directory.folders.map(folder => [folder.id, folder]));
    assert.equal(folders.size, directory.folders.length);
    for (const folder of folders.values()) {
      assert.match(folder.id, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/);
      assert.ok(folder.name.trim() && folder.name.length <= 80);
      assert.ok(folder.summary.trim() && folder.summary.length <= 240);
      const ancestors = new Set();
      let current = folder;
      while (current) {
        assert.ok(!ancestors.has(current.id), 'folder tree must be acyclic');
        ancestors.add(current.id);
        assert.ok(ancestors.size <= 32);
        if (current.parentId === null) break;
        assert.ok(folders.has(current.parentId));
        current = folders.get(current.parentId);
      }
    }
    for (const tool of directory.tools) assert.ok(folders.has(tool.folderId));
    const memberships = new Map(directory.tools.map(tool => [tool.toolName, tool.folderId]));
    for (const [name, folderId] of [
      ['guild_message_search', 'messages.read'],
      ['guild_list_channels', 'channels.manage'],
      ['guild_member_role_add', 'members.roles'],
      ['guild_application_command_get', 'applications.commands'],
      ['channel_soundboard_sound_send', 'media.soundboard'],
      ['application_emoji_create', 'media.emoji'],
      ['thread_member_list', 'threads.members'],
      ['interaction_response_create', 'interactions'],
    ]) assert.equal(memberships.get(name), folderId, name);
    assert.ok(tools.some(tool => tool.name === 'message_create'));
    assert.ok(tools.some(tool => tool.name === 'message_delete'));
    for (const tool of tools) assert.equal(Object.hasOwn(tool, 'folderId'), false);
    assert.deepEqual(await client.readResource({ uri: directoryUri }), result);
  } finally {
    await client.close();
  }
});

test('directory revision follows membership changes and leaves unknown tools unclassified', () => {
  const original = buildDirectory(['guild_get']);
  assert.deepEqual(buildDirectory(['guild_get']), original);
  const expanded = buildDirectory(['guild_get', 'message_get']);
  assert.notEqual(expanded.revision, original.revision);
  assert.deepEqual(expanded.folders, original.folders);
  assert.deepEqual(buildDirectory(['future_tool']).tools, []);
});

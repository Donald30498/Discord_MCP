import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { test } from 'node:test';

test('destructive operations advertise the MCP destructive hint', async () => {
  const client = new Client({ name: 'test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../dist/main.js', import.meta.url))],
    env: { ...process.env, DISCORD_BOT_TOKEN: 'test-token' } });
  try {
    await client.connect(transport);
    const tools = (await client.listTools()).tools;
    const destructive = [
      'application_command_bulk_overwrite', 'application_command_delete',
      'guild_application_command_bulk_overwrite', 'guild_application_command_delete',
      'application_role_connection_metadata_update', 'application_emoji_delete',
      'guild_auto_moderation_rule_delete', 'channel_delete', 'channel_permission_delete',
      'guild_integration_delete', 'guild_prune_begin', 'guild_emoji_delete', 'guild_sticker_delete',
      'guild_member_remove', 'guild_ban_create', 'guild_ban_bulk_create', 'guild_ban_delete',
      'guild_template_delete', 'guild_role_delete', 'guild_member_role_remove',
      'guild_scheduled_event_delete', 'invite_delete', 'invite_target_user_replace',
      'invite_target_user_remove', 'invite_target_user_bulk_remove', 'lobby_delete',
      'lobby_member_remove', 'message_reaction_delete_own', 'message_reaction_delete_user',
      'message_reaction_delete_all', 'message_reaction_delete_emoji', 'message_unpin',
      'poll_end', 'message_delete', 'message_bulk_delete', 'entitlement_consume',
      'entitlement_delete_test', 'thread_leave', 'thread_member_remove',
      'guild_soundboard_sound_delete', 'user_guild_leave', 'stage_instance_delete', 'webhook_delete',
    ];
    for (const name of destructive) {
      const tool = tools.find((entry) => entry.name === name);
      assert.ok(tool, `missing ${name}`);
      assert.equal(tool.annotations?.destructiveHint, true, name);
    }
  } finally { await client.close(); }
});

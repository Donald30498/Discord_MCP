import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { discordGet } from './discord-http.js';
import { registerGuildChannelRead } from './register-guild-channel-read.js';
import { registerChannelWrite } from './register-channel-write.js';
import { registerGuildMemberRead } from './register-guild-member-read.js';
import { registerGuildRole } from './register-guild-role.js';
import { registerGuildMemberManage } from './register-guild-member-manage.js';
import { registerMessageRead } from './register-message-read.js';
import { registerMessageReactionPinPoll } from './register-message-reaction-pin-poll.js';
import { registerMessageWrite } from './register-message-write.js';
import { registerThread } from './register-thread.js';
import { registerGuildOnboardingTemplateWidget } from './register-guild-onboarding-template-widget.js';
import { registerGuildManage } from './register-guild-manage.js';
import { registerAutoModeration } from './register-auto-moderation.js';
import { registerGuildScheduledEvent } from './register-guild-scheduled-event.js';
import { registerSoundboard } from './register-soundboard.js';
import { registerVoiceStage } from './register-voice-stage.js';

function createServer(): McpServer {
  const server = new McpServer({ name: 'discord-mcp', version: '0.1.0' });
  server.registerTool(
    'user_get_current',
    {
      description: 'Get the current Bot user (GET /users/@me).',
      inputSchema: z.strictObject({}),
    },
    async () => discordGet('/users/@me'),
  );
  registerGuildChannelRead(server);
  registerChannelWrite(server);
  registerGuildMemberRead(server);
  registerGuildRole(server);
  registerGuildMemberManage(server);
  registerMessageRead(server);
  registerMessageReactionPinPoll(server);
  registerMessageWrite(server);
  registerThread(server);
  registerGuildOnboardingTemplateWidget(server);
  registerGuildManage(server);
  registerAutoModeration(server);
  registerGuildScheduledEvent(server);
  registerSoundboard(server);
  registerVoiceStage(server);
  return server;
}

void serveStdio(createServer);

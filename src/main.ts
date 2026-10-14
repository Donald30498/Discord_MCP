import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { discordGet } from './discord-http.js';
import { registerGuildChannelRead } from './register-guild-channel-read.js';
import { registerGuildMemberRead } from './register-guild-member-read.js';
import { registerMessageRead } from './register-message-read.js';

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
  registerGuildMemberRead(server);
  registerMessageRead(server);
  return server;
}

void serveStdio(createServer);

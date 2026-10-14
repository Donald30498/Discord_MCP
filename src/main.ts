import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN is required');
  process.exit(1);
}

function createServer(): McpServer {
  const server = new McpServer({ name: 'discord-mcp', version: '0.1.0' });
  server.registerTool(
    'user_get_current',
    {
      description: 'Get the current Bot user (GET /users/@me).',
      inputSchema: z.strictObject({}),
    },
    async () => {
      const baseUrl = process.env.DISCORD_API_BASE_URL ?? 'https://discord.com/api/v10';
      const response = await fetch(`${baseUrl}/users/@me`, {
        headers: { Authorization: `Bot ${token}` },
      });
      const rawBody = await response.text();
      let body: unknown = rawBody;
      if (rawBody) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          // Keep non-JSON responses as text.
        }
      }
      const headers = Object.fromEntries(
        [...response.headers].filter(([name]) =>
          name === 'content-type' || name === 'retry-after' || name.startsWith('x-ratelimit-')),
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ status: response.status, body, headers }) }],
        ...(response.ok ? {} : { isError: true }),
      };
    },
  );
  return server;
}

void serveStdio(createServer);

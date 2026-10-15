import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { discordRequest } from './discord-http.js';

const snowflake = z.string();
const guild = { guild_id: snowflake };
const reason = { audit_log_reason: z.string().optional() };
const code = { code: z.string() };
const onboardingOption = z.strictObject({
  id: snowflake.optional(), channel_ids: z.array(snowflake), role_ids: z.array(snowflake),
  emoji_id: snowflake.nullable().optional(), emoji_name: z.string().nullable().optional(),
  emoji_animated: z.boolean().optional(), title: z.string(), description: z.string().nullable().optional(),
});
const onboardingPrompt = z.strictObject({
  id: snowflake.optional(), type: z.number().int(), options: z.array(onboardingOption),
  title: z.string(), single_select: z.boolean(), required: z.boolean(), in_onboarding: z.boolean(),
});
const templateFields = { name: z.string().optional(), description: z.string().nullable().optional() };
const welcomeChannel = z.strictObject({
  channel_id: snowflake, description: z.string(), emoji_id: snowflake.nullable().optional(),
  emoji_name: z.string().nullable().optional(),
});

export function registerGuildOnboardingTemplateWidget(server: McpServer): void {
  server.registerTool('guild_onboarding_get', {
    description: 'Get guild onboarding (GET /guilds/{guild_id}/onboarding).',
    inputSchema: z.strictObject(guild),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/onboarding`));

  server.registerTool('guild_onboarding_modify', {
    description: 'Modify guild onboarding (PUT /guilds/{guild_id}/onboarding).',
    inputSchema: z.strictObject({ ...guild, prompts: z.array(onboardingPrompt).optional(),
      default_channel_ids: z.array(snowflake).optional(), enabled: z.boolean().optional(),
      mode: z.number().int().optional(), ...reason }),
  }, async ({ guild_id, audit_log_reason, ...body }) =>
    discordRequest('PUT', `/guilds/${encodeURIComponent(guild_id)}/onboarding`, body, audit_log_reason));

  server.registerTool('guild_template_get', {
    description: 'Get guild template (GET /guilds/templates/{code}).',
    inputSchema: z.strictObject(code),
  }, async ({ code }) => discordRequest('GET', `/guilds/templates/${encodeURIComponent(code)}`));

  server.registerTool('guild_template_list', {
    description: 'List guild templates (GET /guilds/{guild_id}/templates).',
    inputSchema: z.strictObject(guild),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/templates`));

  server.registerTool('guild_template_create', {
    description: 'Create guild template (POST /guilds/{guild_id}/templates).',
    inputSchema: z.strictObject({ ...guild, name: z.string(), description: z.string().nullable().optional() }),
  }, async ({ guild_id, ...body }) => discordRequest('POST', `/guilds/${encodeURIComponent(guild_id)}/templates`, body));

  server.registerTool('guild_template_sync', {
    description: 'Sync guild template (PUT /guilds/{guild_id}/templates/{code}).',
    inputSchema: z.strictObject({ ...guild, ...code }),
  }, async ({ guild_id, code }) =>
    discordRequest('PUT', `/guilds/${encodeURIComponent(guild_id)}/templates/${encodeURIComponent(code)}`));

  server.registerTool('guild_template_modify', {
    description: 'Modify guild template (PATCH /guilds/{guild_id}/templates/{code}).',
    inputSchema: z.strictObject({ ...guild, ...code, ...templateFields }),
  }, async ({ guild_id, code, ...body }) =>
    discordRequest('PATCH', `/guilds/${encodeURIComponent(guild_id)}/templates/${encodeURIComponent(code)}`, body));

  server.registerTool('guild_template_delete', {
    annotations: { destructiveHint: true },
    description: 'Delete guild template (DELETE /guilds/{guild_id}/templates/{code}).',
    inputSchema: z.strictObject({ ...guild, ...code }),
  }, async ({ guild_id, code }) =>
    discordRequest('DELETE', `/guilds/${encodeURIComponent(guild_id)}/templates/${encodeURIComponent(code)}`));

  server.registerTool('guild_welcome_screen_get', {
    description: 'Get guild welcome screen (GET /guilds/{guild_id}/welcome-screen).',
    inputSchema: z.strictObject(guild),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/welcome-screen`));

  server.registerTool('guild_welcome_screen_modify', {
    description: 'Modify guild welcome screen (PATCH /guilds/{guild_id}/welcome-screen).',
    inputSchema: z.strictObject({ ...guild, enabled: z.boolean().nullable().optional(),
      welcome_channels: z.array(welcomeChannel).nullable().optional(),
      description: z.string().nullable().optional(), ...reason }),
  }, async ({ guild_id, audit_log_reason, ...body }) =>
    discordRequest('PATCH', `/guilds/${encodeURIComponent(guild_id)}/welcome-screen`, body, audit_log_reason));

  server.registerTool('guild_widget_settings_get', {
    description: 'Get guild widget settings (GET /guilds/{guild_id}/widget).',
    inputSchema: z.strictObject(guild),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/widget`));

  server.registerTool('guild_widget_settings_modify', {
    description: 'Modify guild widget settings (PATCH /guilds/{guild_id}/widget).',
    inputSchema: z.strictObject({ ...guild, enabled: z.boolean().optional(),
      channel_id: snowflake.nullable().optional(), ...reason }),
  }, async ({ guild_id, audit_log_reason, ...body }) =>
    discordRequest('PATCH', `/guilds/${encodeURIComponent(guild_id)}/widget`, body, audit_log_reason));

  server.registerTool('guild_widget_get', {
    description: 'Get guild widget (GET /guilds/{guild_id}/widget.json).',
    inputSchema: z.strictObject(guild),
  }, async ({ guild_id }) => discordRequest('GET', `/guilds/${encodeURIComponent(guild_id)}/widget.json`));

  server.registerTool('guild_widget_image_get', {
    description: 'Get guild widget PNG (GET /guilds/{guild_id}/widget.png). Successful body is base64.',
    inputSchema: z.strictObject({ ...guild, style: z.string().optional() }),
  }, async ({ guild_id, style }) => discordRequest('GET',
    `/guilds/${encodeURIComponent(guild_id)}/widget.png${style === undefined ? '' : `?style=${encodeURIComponent(style)}`}`,
    undefined, undefined, true));
}

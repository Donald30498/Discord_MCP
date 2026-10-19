import { createHash } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/server';

export const directoryUri = 'dcenter://mcp/directory/v1';

// IDs remain stable when display names or summaries change.
const folders = [
  ['guilds', null, '伺服器', '伺服器資訊、設定、整合、入門及範本'],
  ['guilds.info', 'guilds', '基本資料', '查詢伺服器、預覽、邀請代碼及稽核紀錄'],
  ['guilds.settings', 'guilds', '設定與整合', '修改伺服器設定、管理整合及事件應對'],
  ['guilds.onboarding', 'guilds', '入門與小工具', '入門、歡迎畫面及伺服器小工具'],
  ['guilds.templates', 'guilds', '範本', '建立、同步及管理伺服器範本'],
  ['channels', null, '頻道', '查詢、建立與管理頻道及頻道權限'],
  ['channels.manage', 'channels', '基本操作', '頻道查詢、建立、排序、修改、刪除及公告追蹤'],
  ['channels.permissions', 'channels', '權限覆寫', '編輯及刪除頻道權限覆寫'],
  ['messages', null, '訊息', '查詢、搜尋、發送、編輯、反應、釘選與投票'],
  ['messages.read', 'messages', '查詢與搜尋', '取得訊息、分頁列出及搜尋伺服器訊息'],
  ['messages.write', 'messages', '發送與管理', '發送、編輯、刪除及發布訊息，觸發輸入提示'],
  ['messages.reactions', 'messages', '反應', '新增、列出及移除訊息表情反應'],
  ['messages.pins', 'messages', '釘選', '列出、新增及移除釘選訊息'],
  ['messages.polls', 'messages', '投票', '查詢投票者及結束投票；建立投票使用發送訊息工具'],
  ['members', null, '成員與身分組', '成員查詢、修改、封鎖、清理及身分組管理'],
  ['members.manage', 'members', '成員', '列出、搜尋、查詢、修改及移除伺服器成員'],
  ['members.roles', 'members', '身分組', '查詢與管理身分組、排序及成員身分組歸屬'],
  ['members.bans', 'members', '封鎖', '查詢、新增、批次新增及移除封鎖'],
  ['members.prune', 'members', '清理', '估算及執行不活躍成員清理'],
  ['threads', null, '討論串', '建立、探索、加入及管理討論串成員'],
  ['threads.manage', 'threads', '建立與探索', '從訊息、論壇或獨立建立討論串，查詢活躍及封存項目；修改及刪除使用頻道工具'],
  ['threads.members', 'threads', '參與及成員', '加入、離開討論串及管理討論串成員'],
  ['interactions', null, '互動回覆', '以 interaction token 回覆事件及編輯原始互動回覆'],
  ['applications', null, '應用程式', '應用程式資訊、指令、角色連結及 Gateway 連線資訊'],
  ['applications.info', 'applications', '資訊與連線', '應用程式資料、活動實例、OAuth 公開資料及 Gateway 位置'],
  ['applications.commands', 'applications', '應用程式指令', '全域及伺服器指令的查詢、建立、修改、覆寫、刪除及權限查詢'],
  ['applications.roles', 'applications', '角色連結', '查詢與更新應用程式角色連結 metadata'],
  ['media', null, '表情、貼圖與音效', '伺服器及應用程式表情、貼圖與音效板'],
  ['media.emoji', 'media', '表情', '伺服器及應用程式表情的查詢與管理'],
  ['media.stickers', 'media', '貼圖', '貼圖、貼圖包的查詢及伺服器貼圖上傳與管理'],
  ['media.soundboard', 'media', '音效板', '預設及伺服器音效查詢、管理與發送'],
  ['voice', null, '語音與舞台', '語音區域、語音狀態及舞台實例'],
  ['voice.states', 'voice', '語音狀態', '查詢語音區域、查詢與修改語音狀態及頻道狀態文字'],
  ['voice.stage', 'voice', '舞台', '建立、查詢、修改及刪除舞台實例'],
  ['events', null, '排程活動', '建立、查詢、管理伺服器排程活動及參與者'],
  ['invites', null, '邀請', '頻道及伺服器邀請、指定使用者邀請名單'],
  ['invites.manage', 'invites', '基本操作', '建立、查詢及刪除邀請'],
  ['invites.targets', 'invites', '指定使用者', '查詢與管理指定使用者邀請名單及 CSV 上傳工作'],
  ['webhooks', null, 'Webhook', '建立、查詢、修改及刪除 Bot 可管理的 Webhook'],
  ['users', null, '使用者與私訊', '使用者資料、目前 Bot 身分、已加入伺服器及建立私訊頻道'],
  ['lobbies', null, 'Lobby', '建立及管理 Lobby、成員、邀請與訊息審查資料'],
  ['commerce', null, '商品、權益與訂閱', '查詢商品及訂閱，管理權益與測試權益'],
  ['moderation', null, '自動審查', '查詢、建立、修改及刪除 Discord 自動審查規則'],
] as const;

// Specific task routes precede resource-wide routes (e.g. guild message search).
const routes: [RegExp, string][] = [
  [/^(message_(get|list)$|guild_message_search$)/, 'messages.read'],
  [/^message_reaction_/, 'messages.reactions'],
  [/^message_(pin|unpin)/, 'messages.pins'],
  [/^poll_/, 'messages.polls'],
  [/^(message_|channel_typing_trigger$)/, 'messages.write'],
  [/^(guild_application_command_|application_command_)/, 'applications.commands'],
  [/^application_role_connection_/, 'applications.roles'],
  [/^(guild_emoji_|application_emoji_)/, 'media.emoji'],
  [/^(guild_sticker_|sticker_)/, 'media.stickers'],
  [/^(soundboard_|guild_soundboard_|channel_soundboard_)/, 'media.soundboard'],
  [/^stage_instance_/, 'voice.stage'],
  [/^(voice_|guild_voice_)/, 'voice.states'],
  [/^guild_member_role_/, 'members.roles'],
  [/^guild_role_/, 'members.roles'],
  [/^guild_member_/, 'members.manage'],
  [/^guild_ban_/, 'members.bans'],
  [/^guild_prune_/, 'members.prune'],
  [/^guild_auto_moderation_/, 'moderation'],
  [/^guild_scheduled_event_/, 'events'],
  [/^(thread_member_|thread_join$|thread_leave$)/, 'threads.members'],
  [/^(thread_|guild_thread_)/, 'threads.manage'],
  [/^invite_target_user_/, 'invites.targets'],
  [/^(invite_|channel_invite_|guild_invite_)/, 'invites.manage'],
  [/^(webhook_|channel_webhook_|guild_webhook_)/, 'webhooks'],
  [/^channel_permission_/, 'channels.permissions'],
  [/^(channel_|guild_list_channels$|guild_create_channel$|guild_modify_channel_positions$)/, 'channels.manage'],
  [/^guild_template_/, 'guilds.templates'],
  [/^guild_(onboarding|welcome_screen|widget)_/, 'guilds.onboarding'],
  [/^guild_(modify$|integration|incident_)/, 'guilds.settings'],
  [/^guild_/, 'guilds.info'],
  [/^interaction_/, 'interactions'],
  [/^(application_|oauth_|gateway_)/, 'applications.info'],
  [/^(user_|dm_)/, 'users'],
  [/^lobby_/, 'lobbies'],
  [/^(sku_|entitlement_)/, 'commerce'],
];

export function buildDirectory(toolNames: string[]) {
  const tools = toolNames.flatMap(toolName => {
    const folderId = routes.find(([pattern]) => pattern.test(toolName))?.[1];
    return folderId ? [{ toolName, folderId }] : [];
  });
  const content = {
    folders: folders.map(([id, parentId, name, summary]) => ({ id, parentId, name, summary })),
    tools,
  };
  return { schemaVersion: 1, revision: createHash('sha256').update(JSON.stringify(content)).digest('hex'), ...content };
}

export function registerDirectory(server: McpServer): void {
  const toolNames: string[] = [];
  const registerTool = server.registerTool.bind(server);
  // Collect real registrations without duplicating tool names or changing callbacks.
  server.registerTool = (...args: Parameters<McpServer['registerTool']>) => {
    const tool = registerTool(...args);
    toolNames.push(args[0]);
    return tool;
  };
  server.registerResource('dcenter-directory', directoryUri,
    { title: 'Discord 工具目錄', mimeType: 'application/json' },
    async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(buildDirectory(toolNames)) }] }));
}

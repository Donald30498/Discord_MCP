const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN is required');
  process.exit(1);
}

export async function discordRequest(method: string, path: string, requestBody?: unknown, auditLogReason?: string) {
  const baseUrl = process.env.DISCORD_API_BASE_URL ?? 'https://discord.com/api/v10';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      ...(requestBody === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(auditLogReason === undefined ? {} : { 'X-Audit-Log-Reason': encodeURIComponent(auditLogReason) }),
    },
    ...(requestBody === undefined ? {} : { body: JSON.stringify(requestBody) }),
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
}

export function discordGet(path: string) {
  return discordRequest('GET', path);
}

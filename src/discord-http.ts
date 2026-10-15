const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN is required');
  process.exit(1);
}

export async function discordRequest(method: string, path: string, requestBody?: unknown, auditLogReason?: string, binary = false) {
  const baseUrl = process.env.DISCORD_API_BASE_URL ?? 'https://discord.com/api/v10';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      ...(requestBody === undefined || requestBody instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(auditLogReason === undefined ? {} : { 'X-Audit-Log-Reason': encodeURIComponent(auditLogReason) }),
    },
    ...(requestBody === undefined ? {} : { body: requestBody instanceof FormData ? requestBody : JSON.stringify(requestBody) }),
  });
  const rawBody = binary && response.ok ? Buffer.from(await response.arrayBuffer()).toString('base64') : await response.text();
  let body: unknown = rawBody;
  if (rawBody && !(binary && response.ok)) {
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
    content: [{ type: 'text' as const, text: JSON.stringify({ status: response.status, body, headers,
      ...(binary && response.ok ? { body_encoding: 'base64' } : {}) }) }],
    ...(response.ok ? {} : { isError: true }),
  };
}

export function discordGet(path: string) {
  return discordRequest('GET', path);
}

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN is required');
  process.exit(1);
}

export async function discordRequest(method: string, path: string, requestBody?: unknown, auditLogReason?: string, binary = false) {
  return sendRequest(method, path, requestBody, `Bot ${token}`, auditLogReason, binary);
}

export async function discordInteractionRequest(method: string, path: string, interactionToken: string, requestBody: unknown) {
  try {
    return await sendRequest(method, path, requestBody, undefined, undefined, false, interactionToken);
  } catch {
    return { content: [{ type: 'text' as const, text: 'Discord interaction request failed' }], isError: true };
  }
}

async function sendRequest(method: string, path: string, requestBody?: unknown, authorization?: string,
  auditLogReason?: string, binary = false, sensitiveToken?: string) {
  const baseUrl = process.env.DISCORD_API_BASE_URL ?? 'https://discord.com/api/v10';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(authorization === undefined ? {} : { Authorization: authorization }),
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
    content: [{ type: 'text' as const, text: redact(JSON.stringify({ status: response.status, body, headers,
      ...(binary && response.ok ? { body_encoding: 'base64' } : {}) }), sensitiveToken) }],
    ...(response.ok ? {} : { isError: true }),
  };
}

function redact(value: string, token?: string): string {
  if (!token) return value;
  return value.replaceAll(token, '[REDACTED]').replaceAll(encodeURIComponent(token), '[REDACTED]');
}

export function discordGet(path: string) {
  return discordRequest('GET', path);
}

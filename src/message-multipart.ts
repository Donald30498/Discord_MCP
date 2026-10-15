import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

export async function messageBody(body: Record<string, unknown>, files?: Array<{ path: string; filename?: string }>) {
  if (!files?.length) return body;
  const form = new FormData();
  form.set('payload_json', JSON.stringify(body));
  for (const [index, file] of files.entries()) {
    const bytes = await readFile(file.path);
    form.append(`files[${index}]`, new Blob([new Uint8Array(bytes)]), file.filename ?? basename(file.path));
  }
  return form;
}

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Check the inline links and reference definitions used by this repository.
// Remote URLs and fragments are outside this file-existence check.
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '*.md'],
  { encoding: 'utf8' }).split('\0').filter(Boolean);
let failures = 0;
let checked = 0;
for (const file of files) {
  let fence;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      continue;
    }
    if (fence) continue;
    const prose = line.replace(/(`+).*?\1/g, '');
    const destinations = [...prose.matchAll(/\]\(\s*(?:<([^>]+)>|([^\s)]+))/g)]
      .map(match => match[1] ?? match[2]);
    const reference = prose.match(/^ {0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/);
    if (reference) destinations.push(reference[1] ?? reference[2]);
    for (const destination of destinations) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(destination)) continue;
      const path = destination.split(/[?#]/, 1)[0];
      if (!path) continue;
      checked++;
      let valid = false;
      try {
        const decoded = decodeURIComponent(path);
        const target = path.startsWith('/') ? resolve(`.${decoded}`) : resolve(dirname(file), decoded);
        valid = existsSync(target);
      } catch {
        // Malformed percent encoding is an invalid local destination.
      }
      if (!valid) {
        console.error(`${file}:${index + 1}: missing or invalid local link: ${destination}`);
        failures++;
      }
    }
  }
}
console.log(`Checked ${checked} local links in ${files.length} Markdown files; ${failures} failures.`);
process.exitCode = failures ? 1 : 0;

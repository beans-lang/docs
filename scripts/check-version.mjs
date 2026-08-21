import fs from 'node:fs';
import path from 'node:path';
import { BEANS_REPO, WEBSITE_ROOT, walk } from './lib/paths.mjs';

if (!BEANS_REPO) {
  console.error('version: Beans repo not found. Set BEANS_REPO to the beans checkout.');
  process.exit(1);
}

const values = new Map();
for (const line of fs.readFileSync(path.join(BEANS_REPO, 'VERSION'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([a-z_]+)=(.+)$/);
  if (match) values.set(match[1], match[2].trim());
}
const compiler = values.get('compiler');
const runtimeAbi = values.get('runtime_abi');
if (!compiler || !runtimeAbi) {
  console.error('version: VERSION has no compiler or runtime_abi value.');
  process.exit(1);
}

const files = [
  path.join(WEBSITE_ROOT, 'README.md'),
  ...walk(path.join(WEBSITE_ROOT, 'src', 'content', 'docs'), (file) => /\.mdx?$/.test(file)),
];
const failures = [];
for (const file of files) {
  const relative = path.relative(WEBSITE_ROOT, file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const match of line.matchAll(/\b0\.1\.\d+\b/g)) {
      if (match[0] !== compiler)
        failures.push(`${relative}:${index + 1}: compiler ${match[0]} (want ${compiler})`);
    }
    const normalized = line.toLowerCase().replaceAll('_', ' ');
    const marker = normalized.indexOf('runtime abi');
    if (marker < 0) continue;
    const number = normalized.slice(marker + 'runtime abi'.length).match(/\d+/);
    if (number && number[0] !== runtimeAbi)
      failures.push(`${relative}:${index + 1}: runtime ABI ${number[0]} (want ${runtimeAbi})`);
  }
}

if (failures.length > 0) {
  console.error(`version: ${failures.length} stale release fact(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`✓ docs track compiler ${compiler}, runtime ABI ${runtimeAbi}`);

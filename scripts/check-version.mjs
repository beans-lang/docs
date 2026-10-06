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

// VERSION describes the checkout, which can be ahead of a published release.
// The first dated changelog entry records the released contract; an Unreleased
// entry cannot silently change the installer instructions or sample output.
const changelog = fs.readFileSync(path.join(BEANS_REPO, 'CHANGELOG.md'), 'utf8');
const publishedEntry = changelog.match(/^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}\n([\s\S]*?)(?=^## |$(?![\s\S]))/m);
const published = publishedEntry?.[1];
const publishedAbi = publishedEntry?.[2].match(/Release contract: language=[\d.]+, runtime_abi=(\d+)\./)?.[1];
if (!published || !publishedAbi) {
  console.error('version: latest dated CHANGELOG entry has no release contract.');
  process.exit(1);
}

const files = [
  path.join(WEBSITE_ROOT, 'README.md'),
  ...walk(path.join(WEBSITE_ROOT, 'src', 'content', 'docs'), (file) => /\.mdx?$/.test(file)),
];
const failures = [];
for (const file of files) {
  const relative = path.relative(WEBSITE_ROOT, file);
  const releaseFacing = /^(?:src\/content\/docs\/)(?:bn\/)?start\/(?:install|verify)\.md$/.test(relative);
  const expectedCompiler = releaseFacing ? published : compiler;
  const expectedAbi = releaseFacing ? publishedAbi : runtimeAbi;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const match of line.matchAll(/\b0\.1\.\d+\b/g)) {
      if (match[0] !== expectedCompiler)
        failures.push(`${relative}:${index + 1}: compiler ${match[0]} (want ${expectedCompiler})`);
    }
    // Markdown may wrap "runtime ABI" or its value onto the next line.
    // Keep the window local: a heading must not consume a number in a later
    // paragraph, and historical v-prefixed release references remain history.
    let normalized = line.toLowerCase().replaceAll('_', ' ');
    if (/\bruntime\s*$/.test(normalized))
      normalized += ` ${lines[index + 1] ?? ''}`.toLowerCase();
    const marker = normalized.indexOf('runtime abi');
    if (marker < 0) continue;
    let number = normalized.slice(marker + 'runtime abi'.length).match(/\d+/);
    if (!number && /^\s*`?\d/.test(lines[index + 1] ?? ''))
      number = lines[index + 1].match(/\d+/);
    if (number && number[0] !== expectedAbi)
      failures.push(`${relative}:${index + 1}: runtime ABI ${number[0]} (want ${expectedAbi})`);
  }
}

// The compiler README is another public entry point for the same release.
// Check its current status and install command, not every historical version.
const readme = path.join(BEANS_REPO, 'README.md');
const readmeText = fs.readFileSync(readme, 'utf8');
const release = readmeText.match(/The latest release is\s+\*\*v([^*]+)\*\*/);
if (!release || release[1] !== published)
  failures.push(`beans/README.md: latest release ${release?.[1] ?? 'missing'} (want ${published})`);
const abi = readmeText.match(/It carries language contract\s+`[^`]+`\s+and runtime\s+ABI\s+`(\d+)`/);
if (!abi || abi[1] !== publishedAbi)
  failures.push(`beans/README.md: runtime ABI ${abi?.[1] ?? 'missing'} (want ${publishedAbi})`);
const checkout = readmeText.match(/This checkout reports compiler `([^`]+)` and runtime ABI `([^`]+)`/);
if (!checkout || checkout[1] !== compiler || checkout[2] !== runtimeAbi)
  failures.push(`beans/README.md: checkout contract ${checkout?.[1] ?? 'missing'}/${checkout?.[2] ?? 'missing'} (want ${compiler}/${runtimeAbi})`);
for (const match of readmeText.matchAll(/--version\s+(0\.1\.\d+)\b/g)) {
  if (match[1] !== published)
    failures.push(`beans/README.md: install version ${match[1]} (want ${published})`);
}

if (failures.length > 0) {
  console.error(`version: ${failures.length} stale release fact(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`✓ docs track checkout ${compiler}/ABI ${runtimeAbi}; install docs track published ${published}/ABI ${publishedAbi}`);

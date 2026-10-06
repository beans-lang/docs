import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { WEBSITE_ROOT } from './lib/paths.mjs';

// Isolate fixtures so negative controls never alter either working checkout.
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'beans-doc-version-'));
const website = path.join(fixture, 'docs');
const compiler = path.join(fixture, 'beans');
fs.mkdirSync(path.join(website, 'scripts', 'lib'), { recursive: true });
fs.mkdirSync(path.join(website, 'src', 'content', 'docs', 'start'), { recursive: true });
fs.mkdirSync(path.join(compiler, 'src'), { recursive: true });
for (const name of ['check-version.mjs', 'lib/paths.mjs']) {
  fs.copyFileSync(path.join(WEBSITE_ROOT, 'scripts', name), path.join(website, 'scripts', name));
}
fs.writeFileSync(path.join(compiler, 'src', 'main.b'), '');
fs.writeFileSync(path.join(compiler, 'VERSION'), 'compiler=0.1.51\nlanguage=1.0\nruntime_abi=22\n');
fs.writeFileSync(path.join(compiler, 'CHANGELOG.md'), '## [0.1.51] - Unreleased\nNo packages yet.\n\n## [0.1.50] - 2026-10-05\n\nRelease contract: language=1.0, runtime_abi=21.\n');
const currentReadme = 'The latest release is **v0.1.50**. It carries language contract `1.0` and runtime\nABI `21`.\nThis checkout reports compiler `0.1.51` and runtime ABI `22`; it is unreleased.\nsh --version 0.1.50\n';
fs.writeFileSync(path.join(compiler, 'README.md'), currentReadme);
const page = path.join(website, 'src', 'content', 'docs', 'version.md');
const install = path.join(website, 'src', 'content', 'docs', 'start', 'install.md');
const verify = path.join(website, 'src', 'content', 'docs', 'start', 'verify.md');
const currentPage = 'compiler=0.1.51\nruntime_abi=22\nPrint compiler and runtime ABI versions.\nsh --version 0.1.51\n';
const currentSiteReadme = 'Compiler `0.1.51`, runtime\nABI `22`.\nenum(u8) shipped in v0.1.30.\n';
fs.writeFileSync(path.join(website, 'README.md'), currentSiteReadme);
fs.writeFileSync(page, currentPage);
fs.writeFileSync(install, 'sh --version 0.1.50\n');
fs.writeFileSync(verify, 'beansc 0.1.50 (language 1.0, runtime ABI 21)\n');
function run() {
  return spawnSync(process.execPath, [path.join(website, 'scripts', 'check-version.mjs')], {
    encoding: 'utf8', env: { ...process.env, BEANS_REPO: compiler },
  });
}
try {
  assert.equal(run().status, 0, 'unreleased checkout, published installer, and explicit history must pass');
  fs.writeFileSync(path.join(website, 'README.md'), currentSiteReadme.replace('ABI `22`', 'ABI `10`'));
  assert.match(run().stderr, /runtime ABI 10 \(want 22\)/, 'wrapped ABI drift must fail');
  fs.writeFileSync(path.join(website, 'README.md'), currentSiteReadme);
  fs.writeFileSync(page, currentPage.replace('0.1.51', '0.1.49'));
  assert.match(run().stderr, /compiler 0\.1\.49 \(want 0\.1\.51\)/);
  fs.writeFileSync(page, currentPage);
  fs.writeFileSync(install, 'sh --version 0.1.51\n');
  assert.match(run().stderr, /compiler 0\.1\.51 \(want 0\.1\.50\)/, 'unreleased installer version must fail');
  fs.writeFileSync(install, 'sh --version 0.1.50\n');
  fs.writeFileSync(verify, 'beansc 0.1.50 (language 1.0, runtime ABI 22)\n');
  assert.match(run().stderr, /runtime ABI 22 \(want 21\)/);
  fs.writeFileSync(verify, 'beansc 0.1.50 (language 1.0, runtime ABI 21)\n');
  fs.writeFileSync(path.join(compiler, 'README.md'), currentReadme.replace('v0.1.50', 'v0.1.29'));
  assert.match(run().stderr, /latest release 0\.1\.29/);
  fs.writeFileSync(path.join(compiler, 'README.md'), currentReadme.replace('ABI `21`', 'ABI `9`'));
  assert.match(run().stderr, /beans\/README.md: runtime ABI 9/);
  fs.writeFileSync(path.join(compiler, 'README.md'), currentReadme.replace('compiler `0.1.51`', 'compiler `0.1.50`'));
  assert.match(run().stderr, /checkout contract 0\.1\.50\/22/);
  fs.writeFileSync(path.join(compiler, 'README.md'), currentReadme.replace('--version 0.1.50', '--version 0.1.51'));
  assert.match(run().stderr, /install version 0\.1\.51/);
  console.log('✓ version-check controls distinguish unreleased source, published installs, and history');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

#!/usr/bin/env node
// Check a single documentation file's Beans code blocks: lint every block for
// untyped let/var, and type-check every complete program (a block that declares
// `fn main`, or is marked <!-- beans:compile -->). Marked <!-- beans:expect-error -->
// blocks must fail; <!-- beans:fragment --> blocks are linted only.
//
// Usage: node scripts/check-file.mjs src/content/docs/reference/stdlib/json.md
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { findBeansc } from './lib/paths.mjs';

const beansc = findBeansc();
const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/check-file.mjs <path-to-md>');
  process.exit(2);
}

function blocks(text) {
  const lines = text.split('\n');
  const out = [];
  let marker = null;
  for (let i = 0; i < lines.length; i++) {
    const mm = lines[i].match(/<!--\s*beans:(compile|expect-error|fragment)\s*-->/);
    if (mm) { marker = mm[1]; continue; }
    if (/^```beans\b/.test(lines[i])) {
      const body = [];
      let j = i + 1;
      for (; j < lines.length && !/^```\s*$/.test(lines[j]); j++) body.push(lines[j]);
      out.push({ marker, code: body.join('\n'), line: i + 1, hasMain: /\bfn\s+main\s*\(/.test(body.join('\n')) });
      marker = null; i = j; continue;
    }
    if (lines[i].trim() !== '') marker = null;
  }
  return out;
}

const text = fs.readFileSync(file, 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-'));
const problems = [];
let compiled = 0;
for (const b of blocks(text)) {
  b.code.split('\n').forEach((l, k) => {
    if (/^\s*(?:async\s+)?(let|var)\s+[A-Za-z_]\w*\s*=/.test(l))
      problems.push(`${file}:${b.line + k + 1} untyped binding: ${l.trim()}`);
  });
  const shouldCompile = b.marker === 'compile' || (b.hasMain && b.marker !== 'fragment');
  const expectError = b.marker === 'expect-error';
  if (!shouldCompile && !expectError) continue;
  const p = path.join(tmp, 's.b');
  fs.writeFileSync(p, b.code + '\n');
  let ok = true, out = '';
  try { execFileSync(beansc, ['check', p], { stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { ok = false; out = ((e.stdout || '') + (e.stderr || '')).replace(new RegExp(tmp, 'g'), ''); }
  compiled++;
  if (ok !== !expectError)
    problems.push(`${file}:${b.line} expected ${expectError ? 'error' : 'compile'} — got:\n${out.trim()}`);
}
fs.rmSync(tmp, { recursive: true, force: true });

if (problems.length === 0) {
  console.log(`OK ${file} (compiled ${compiled} program(s))`);
  process.exit(0);
}
console.error(`FAIL ${file}: ${problems.length} problem(s)`);
for (const p of problems) console.error('  ' + p);
process.exit(1);

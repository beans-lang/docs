#!/usr/bin/env node
// Example check. Two things must hold:
//   1. Every real example program in the Beans repo (examples/**/*.b) type-checks.
//   2. Every documentation code block explicitly marked to compile does compile,
//      and every block marked as an intentional error does NOT compile.
//
// Marking a doc block (in the Markdown, on the line right before the fence):
//   <!-- beans:compile -->        the ```beans block that follows must check clean
//   <!-- beans:expect-error -->   the block that follows must fail to check
// Unmarked ```beans blocks are treated as fragments and skipped.
//
// If no working `beansc` is found, the check is skipped (exit 0) with a notice,
// so the site can still be built where the compiler is unavailable.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { DOCS_DIR, BEANS_REPO, findBeansc, walk } from './lib/paths.mjs';

const beansc = findBeansc();

function beanscWorks() {
  try {
    execFileSync(beansc, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Returns { ok: bool, output: string }
function check(file) {
  try {
    const out = execFileSync(beansc, ['check', file], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    return { ok: true, output: out };
  } catch (e) {
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

// Pull every ```beans block out of a markdown file, with its marker (if any)
// and whether it is a complete program (declares `fn main`).
function beansBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let marker = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mm = line.match(/<!--\s*beans:(compile|expect-error|fragment)\s*-->/);
    if (mm) {
      marker = mm[1];
      continue;
    }
    const fence = line.match(/^```beans\b/);
    if (fence) {
      const body = [];
      let j = i + 1;
      for (; j < lines.length && !/^```\s*$/.test(lines[j]); j++) body.push(lines[j]);
      const code = body.join('\n');
      blocks.push({
        marker,
        code,
        line: i + 1,
        hasMain: /\bfn\s+main\s*\(/.test(code),
      });
      marker = null;
      i = j;
      continue;
    }
    if (line.trim() !== '') marker = null; // marker only applies to the very next fence
  }
  return blocks;
}

// Context-free lint that holds for every Beans snippet, fragment or program:
// a `let`/`var` binding must state its type. Catches the most common way a
// hand-written example drifts from real Beans.
function lintBlock(code) {
  const violations = [];
  const lines = code.split('\n');
  for (let k = 0; k < lines.length; k++) {
    const m = lines[k].match(/^\s*(?:async\s+)?(let|var)\s+([A-Za-z_]\w*)\s*=/);
    if (m) violations.push({ line: k + 1, text: lines[k].trim() });
  }
  return violations;
}

function main() {
  if (!beanscWorks()) {
    const required = process.env.REQUIRE_BEANSC === '1' || process.env.CI === 'true';
    console[required ? 'error' : 'log'](
      `examples: no working beansc found (looked for "${beansc}").`,
    );
    if (required) {
      console.error('  REQUIRE_BEANSC/CI is set — a compiler is mandatory here. Failing.');
      console.error('  Install a release (beans-install.sh), build from source, or set BEANSC.');
      process.exit(1);
    }
    console.log('  Skipping (build beansc or set BEANSC to enable this check locally).');
    process.exit(0);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'beans-doc-ex-'));
  let pass = 0;
  const failures = [];

  // 1. real repo examples. A `.b` file can only be checked as an entry if it
  // sits directly in examples/ (single-file program) or next to a beans.pot
  // (a module root). Sub-package files are loaded transitively, not directly.
  if (BEANS_REPO) {
    const exDir = path.join(BEANS_REPO, 'examples');
    const entries = new Set();
    // single-file programs directly in examples/
    for (const e of fs.readdirSync(exDir, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith('.b')) entries.add(path.join(exDir, e.name));
    }
    // module roots: the entry sits next to a beans.pot
    for (const pot of walk(exDir, (f) => path.basename(f) === 'beans.pot')) {
      const dir = path.dirname(pot);
      const main = path.join(dir, 'main.b');
      if (fs.existsSync(main)) entries.add(main);
      else {
        const first = fs.readdirSync(dir).find((n) => n.endsWith('.b'));
        if (first) entries.add(path.join(dir, first));
      }
    }
    const files = [...entries].sort();
    for (const f of files) {
      const r = check(f);
      if (r.ok) pass++;
      else failures.push({ what: `example ${path.relative(BEANS_REPO, f)}`, output: r.output.trim() });
    }
    console.log(`Checked ${files.length} repo example entry file(s).`);
  } else {
    console.log('examples: Beans repo not found; skipping repo-example checks.');
  }

  // 2. documentation code blocks.
  //   - Every block is linted (untyped let/var).
  //   - Every complete program (declares `fn main`, or marked beans:compile)
  //     must type-check — unless marked beans:expect-error, when it must fail.
  //   - Blocks marked beans:fragment are linted only (an escape hatch for a
  //     genuine partial program that legitimately cannot stand alone).
  const docFiles = walk(DOCS_DIR, (f) => f.endsWith('.md') || f.endsWith('.mdx'));
  let compiled = 0;
  let linted = 0;
  let n = 0;
  for (const file of docFiles) {
    const rel = path.relative(DOCS_DIR, file);
    const text = fs.readFileSync(file, 'utf8');
    for (const b of beansBlocks(text)) {
      linted++;
      for (const v of lintBlock(b.code)) {
        failures.push({
          what: `${rel}:${b.line + v.line} — untyped binding (every let/var needs a type)`,
          output: v.text,
        });
      }

      const shouldCompile = b.marker === 'compile' || (b.hasMain && b.marker !== 'fragment');
      const expectError = b.marker === 'expect-error';
      if (!shouldCompile && !expectError) continue;

      n++;
      const p = path.join(tmp, `snippet_${n}.b`);
      fs.writeFileSync(p, b.code + '\n');
      const r = check(p);
      compiled++;
      const expectOk = !expectError;
      if (r.ok === expectOk) pass++;
      else {
        failures.push({
          what: `${rel}:${b.line} (expected ${expectOk ? 'to compile' : 'a compile error'})`,
          output: r.output.trim(),
        });
      }
    }
  }
  console.log(`Linted ${linted} doc code block(s); compiled ${compiled} program(s).`);

  fs.rmSync(tmp, { recursive: true, force: true });

  if (failures.length === 0) {
    console.log(`\n✓ ${pass} example(s) behaved as expected`);
    process.exit(0);
  }
  console.error(`\n✗ ${failures.length} example failure(s):`);
  for (const f of failures) {
    console.error(`  ${f.what}`);
    if (f.output) console.error(`    ${f.output.split('\n').slice(0, 4).join('\n    ')}`);
  }
  process.exit(1);
}

main();

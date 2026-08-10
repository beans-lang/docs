#!/usr/bin/env node
// Internal link check: every base-less absolute link written in the docs
// ( [text](/guide/variables/) ) must resolve to a real page. Also flags any
// content link that hard-codes the /beans base path. Exits 1 on any problem.
import fs from 'node:fs';
import path from 'node:path';
import { DOCS_DIR, walk } from './lib/paths.mjs';

// The configured base path. Content links are written base-less and a rehype
// plugin prepends this at build time, so a link that already hard-codes it is a
// bug. Kept in sync with astro.config.mjs via the BASE env var.
const BASE = (process.env.BASE ?? '/docs').replace(/\/+$/, '');

// Build the set of valid page slugs from the doc files on disk.
function collectSlugs() {
  const slugs = new Set();
  for (const file of walk(DOCS_DIR, (f) => f.endsWith('.md') || f.endsWith('.mdx'))) {
    let rel = path.relative(DOCS_DIR, file).replace(/\.(md|mdx)$/, '');
    rel = rel.split(path.sep).join('/');
    if (rel === 'index') rel = '';
    else if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
    slugs.add(rel);
  }
  return slugs;
}

function normalize(link) {
  let l = link.split('#')[0].split('?')[0];
  l = l.replace(/^\//, '').replace(/\/$/, '');
  return l;
}

function main() {
  const slugs = collectSlugs();
  const files = walk(DOCS_DIR, (f) => f.endsWith('.md') || f.endsWith('.mdx'));
  const problems = [];

  const patterns = [
    /\]\((\/[^)\s]+)\)/g, // markdown links
    /\blink:\s*(\/\S+)/g, // hero action / component link:
    /href=["'](\/[^"']+)["']/g, // html/jsx href
  ];

  for (const file of files) {
    const rel = path.relative(DOCS_DIR, file);
    const text = fs.readFileSync(file, 'utf8');
    const seen = new Set();
    for (const re of patterns) {
      for (const m of text.matchAll(re)) {
        const raw = m[1];
        if (seen.has(raw)) continue;
        seen.add(raw);
        if (raw === BASE || raw.startsWith(BASE + '/')) {
          problems.push({ file: rel, link: raw, reason: `hard-codes the ${BASE} base path` });
          continue;
        }
        const slug = normalize(raw);
        if (!slugs.has(slug)) {
          problems.push({ file: rel, link: raw, reason: `no page for "/${slug}/"` });
        }
      }
    }
  }

  console.log(`Checked internal links across ${files.length} pages (${slugs.size} slugs).`);
  if (problems.length === 0) {
    console.log('✓ all internal links resolve');
    process.exit(0);
  }
  console.error(`\n✗ ${problems.length} broken internal link(s):`);
  for (const p of problems) console.error(`  ${p.file}: ${p.link} — ${p.reason}`);
  process.exit(1);
}

main();

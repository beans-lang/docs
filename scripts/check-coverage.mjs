#!/usr/bin/env node
// Coverage check. Every public builtin and standard-library symbol must be
// documented on its mapped page, and where the symbol has a signature the page
// must show that exact signature (so a wrong parameter type, a wrong return
// type, or a dropped type is a failure, not just a missing name). Each package
// reference page must also carry a compact, source-generated API summary whose
// counts match the source, so a count can never silently go stale.
//
// Regenerates docs-coverage.md (the root maintenance report, kept out of the
// site) and fails (exit 1) on any gap. `--write` (re)writes the on-page API
// summary blocks from source instead of only checking them.
import fs from 'node:fs';
import path from 'node:path';
import { buildInventory } from './lib/inventory.mjs';
import { DOCS_DIR, WEBSITE_ROOT, BEANS_REPO } from './lib/paths.mjs';

const WRITE = process.argv.includes('--write');

function pageFile(page) {
  const asFile = path.join(DOCS_DIR, `${page}.md`);
  const asIndex = path.join(DOCS_DIR, page, 'index.md');
  if (fs.existsSync(asFile)) return asFile;
  if (fs.existsSync(asIndex)) return asIndex;
  return asFile; // report the expected path
}

const pageText = new Map();
function textOf(page) {
  if (pageText.has(page)) return pageText.get(page);
  const f = pageFile(page);
  const t = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  pageText.set(page, t);
  return t;
}

function wholeWord(text, token) {
  return new RegExp(`(?<![A-Za-z0-9_])${token}(?![A-Za-z0-9_])`).test(text);
}

// A formatting-insensitive key: HTML entities decoded and every whitespace
// character removed, so a signature matches whether the page writes it on one
// line, wraps it inside a code block, or renders it through an HTML table.
function matchKey(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, '');
}

// ---- compact per-page API summary ------------------------------------------

const SUMMARY_START = '<!-- coverage:summary -->';
const SUMMARY_END = '<!-- coverage:summary:end -->';

const SUMMARY_ORDER = [
  ['function', 'package function', 'package functions'],
  ['type', 'type', 'types'],
  ['constructor', 'constructor', 'constructors'],
  ['static', 'static method', 'static methods'],
  ['method', 'instance method', 'instance methods'],
  ['field', 'public field', 'public fields'],
  ['variant', 'enum variant', 'enum variants'],
  ['value', 'prelude value', 'prelude values'],
];

function summaryFor(page, inventory) {
  const counts = new Map();
  for (const e of inventory) {
    if (e.page !== page) continue;
    counts.set(e.summaryKind, (counts.get(e.summaryKind) ?? 0) + 1);
  }
  const parts = [];
  for (const [kind, one, many] of SUMMARY_ORDER) {
    const n = counts.get(kind);
    if (n) parts.push(`${n} ${n === 1 ? one : many}`);
  }
  if (!parts.length) return null;
  return (
    `${SUMMARY_START}\n` +
    `**API summary** (generated from the Beans source by \`npm run coverage\`): ` +
    `${parts.join(' · ')}.\n` +
    `${SUMMARY_END}`
  );
}

// Insert or replace the summary block in a page's text. Returns the new text.
function applySummary(text, block) {
  const start = text.indexOf(SUMMARY_START);
  if (start >= 0) {
    const end = text.indexOf(SUMMARY_END, start);
    if (end >= 0) {
      return text.slice(0, start) + block + text.slice(end + SUMMARY_END.length);
    }
  }
  // Insert just after the frontmatter block.
  const fm = text.match(/^---\n[\s\S]*?\n---\n/);
  if (fm) {
    const at = fm[0].length;
    return text.slice(0, at) + '\n' + block + '\n' + text.slice(at);
  }
  return block + '\n\n' + text;
}

// The current summary block on a page (between markers), normalized, or null.
function existingSummary(text) {
  const start = text.indexOf(SUMMARY_START);
  if (start < 0) return null;
  const end = text.indexOf(SUMMARY_END, start);
  if (end < 0) return null;
  return text.slice(start, end + SUMMARY_END.length);
}

function isPackagePage(page) {
  return page.startsWith('reference/builtins/') || page.startsWith('reference/stdlib/');
}

function main() {
  if (!BEANS_REPO) {
    console.error('coverage: Beans repo not found. Set BEANS_REPO to the beans checkout.');
    process.exit(2);
  }
  const inventory = buildInventory();
  const misses = [];
  const missingPages = new Set();

  for (const e of inventory) {
    const text = textOf(e.page);
    if (text === null) {
      missingPages.add(e.page);
      misses.push({ ...e, reason: 'page missing' });
      continue;
    }
    if (e.signature) {
      if (!matchKey(text).includes(matchKey(e.signature))) {
        // Distinguish "name present but signature wrong/incomplete" from "not
        // documented at all", so the report points at the real problem.
        const reason = wholeWord(text, e.token)
          ? 'signature missing or wrong (name present, exact signature not found)'
          : 'symbol not documented';
        misses.push({ ...e, reason });
      }
    } else if (!wholeWord(text, e.token)) {
      misses.push({ ...e, reason: 'symbol not documented' });
    }
  }

  // Per-package API summaries: generate, then write or verify.
  const summaryPages = [...new Set(inventory.map((e) => e.page))]
    .filter(isPackagePage)
    .sort();
  const summaryProblems = [];
  for (const page of summaryPages) {
    const block = summaryFor(page, inventory);
    if (!block) continue;
    const text = textOf(page);
    if (text === null) continue; // already reported as a missing page
    if (WRITE) {
      const next = applySummary(text, block);
      if (next !== text) {
        fs.writeFileSync(pageFile(page), next);
        pageText.set(page, next);
      }
    } else {
      const have = existingSummary(text);
      if (have === null) summaryProblems.push({ page, reason: 'no API summary block' });
      else if (matchKey(have) !== matchKey(block))
        summaryProblems.push({ page, reason: 'API summary is stale (counts changed)' });
    }
  }

  writeCoverageDoc(inventory, misses);

  const builtinCount = inventory.filter((e) => e.page.startsWith('reference/builtins')).length;
  const stdlibCount = inventory.filter((e) => e.page.startsWith('reference/stdlib')).length;
  const withSig = inventory.filter((e) => e.signature).length;

  console.log(`Coverage inventory: ${inventory.length} public symbols (${withSig} with signatures)`);
  console.log(`  builtin reference: ${builtinCount}`);
  console.log(`  standard library:  ${stdlibCount}`);

  if (WRITE) {
    console.log(`\nWrote API summary blocks to ${summaryPages.length} package page(s).`);
  }

  if (misses.length === 0 && summaryProblems.length === 0) {
    console.log('\n✓ every symbol is documented with its exact signature; every API summary is current');
    process.exit(0);
  }

  if (misses.length) {
    console.error(`\n✗ ${misses.length} coverage gap(s):`);
    if (missingPages.size) console.error(`  missing pages: ${[...missingPages].join(', ')}`);
    const shown = misses.slice(0, 80);
    for (const m of shown) {
      const sig = m.signature ? `  ::  ${m.signature}` : '';
      console.error(`  [${m.reason}] ${m.name} -> ${m.page}${sig}`);
    }
    if (misses.length > shown.length) console.error(`  ... and ${misses.length - shown.length} more`);
  }
  if (summaryProblems.length) {
    console.error(`\n✗ ${summaryProblems.length} API-summary problem(s) (run \`npm run coverage:write\`):`);
    for (const p of summaryProblems) console.error(`  ${p.page}: ${p.reason}`);
  }
  process.exit(1);
}

function writeCoverageDoc(inventory, misses) {
  const missSet = new Set(misses.map((m) => `${m.name}::${m.page}`));
  const groups = new Map();
  for (const e of inventory) {
    if (!groups.has(e.group)) groups.set(e.group, []);
    groups.get(e.group).push(e);
  }
  const builtinCount = inventory.filter((e) => e.page.startsWith('reference/builtins')).length;
  const stdlibCount = inventory.filter((e) => e.page.startsWith('reference/stdlib')).length;
  const withSig = inventory.filter((e) => e.signature).length;

  let out = '';
  out += '# Documentation coverage\n\n';
  out += '> This file is generated by `npm run coverage`. Do not edit by hand. It is a\n';
  out += '> maintenance report and is deliberately kept out of the published site.\n\n';
  out += 'It maps every public builtin and standard-library symbol discovered in the\n';
  out += 'Beans compiler and standard library to the documentation page that covers it,\n';
  out += 'with the exact signature that page must show. The check fails when a symbol is\n';
  out += 'missing, its signature is missing or wrong, or a page API summary is stale.\n\n';
  out += `- Total public symbols: **${inventory.length}**\n`;
  out += `- Symbols with an enforced signature: **${withSig}**\n`;
  out += `- Builtin reference symbols: **${builtinCount}**\n`;
  out += `- Standard-library symbols: **${stdlibCount}**\n`;
  out += `- Coverage gaps: **${misses.length}**\n\n`;

  for (const [group, list] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    out += `## ${group}\n\n`;
    out += '| Symbol | Kind | Signature | Page | Documented |\n|---|---|---|---|---|\n';
    for (const e of list.sort((a, b) => a.name.localeCompare(b.name))) {
      const ok = missSet.has(`${e.name}::${e.page}`) ? '✗' : '✓';
      const sig = e.signature ? `\`${e.signature.replace(/\|/g, '\\|')}\`` : '';
      out += `| \`${e.name}\` | ${e.kind} | ${sig} | \`${e.page}\` | ${ok} |\n`;
    }
    out += '\n';
  }
  fs.writeFileSync(path.join(WEBSITE_ROOT, 'docs-coverage.md'), `${out.trimEnd()}\n`);
}

main();

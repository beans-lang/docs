// Every section of the language spec must be described somewhere in these docs.
//
// The docs site and `spec/SYNTAX.md` drift in one direction: the spec gets a
// new section when a feature lands, and the docs get one when somebody
// remembers. `enum(u8)` shipped in v0.1.30 with a spec section of its own and
// went five releases without a single mention on this site, because no gate
// was watching the language surface — `check-coverage.mjs` reads stdlib
// symbols, not syntax.
//
// Two rules, both mechanical:
//
//   1. Every `##`/`###` heading in the spec needs a row in SPEC_SECTION_PAGE.
//      An unmapped heading fails the build naming itself, so a new spec
//      section forces a decision instead of passing unnoticed. `null` is a
//      legitimate answer — it records that the section needs no page, and why.
//   2. A mapped page must actually talk about the section: every backticked
//      token in the heading has to appear on the page, and at least one
//      backticked token from the section body as well. This is what a bare
//      mapping table cannot do — `enum(u8)` would have been mapped to
//      guide/enums.md on the day it landed, pointing at a page that said
//      nothing about it.
import fs from 'node:fs';
import path from 'node:path';
import { BEANS_REPO, WEBSITE_ROOT } from './lib/paths.mjs';

const DOCS = path.join(WEBSITE_ROOT, 'src', 'content', 'docs');

// Spec heading (verbatim, without the leading #s) -> the page that documents
// it, or null with a reason for why no page describes it.
const SPEC_SECTION_PAGE = new Map([
  ['What beans is for', 'intro/what-is-beans.md'],
  ['Design rules', 'intro/philosophy.md'],
  ['Annotations', 'guide/annotations.md'],
  ['Reflection', 'guide/reflection.md'],
  ['Typed JSON and XML decoding', 'reference/stdlib/json.md'],
  ['Why `Option` is uppercase but `some` is lowercase', 'guide/errors.md'],
  ['Files, modules, imports (implemented, v0.4)', 'guide/modules.md'],
  ['The package clause', 'guide/modules.md'],
  ['Named imports', 'guide/imports.md'],
  ['Lexical', 'guide/variables.md'],
  ['Strings', 'reference/builtins/string.md'],
  ['Raw string literals', 'reference/builtins/string.md'],
  ['Bytes (v0.5, implemented)', 'reference/builtins/bytes.md'],
  ['Files and the OS (v0.5, implemented)', 'reference/builtins/files.md'],
  ['MMap (v0.5, implemented)', 'reference/builtins/files.md'],
  ['std.fmt (v0.5, implemented)', 'reference/stdlib/fmt.md'],
  ['std.encoding (v0.9, implemented)', 'reference/stdlib.md'],
  ['std.encoding.json', 'reference/stdlib/json.md'],
  ['std.encoding.xml', 'reference/stdlib/xml.md'],
  ['std.encoding.base64', 'reference/stdlib/base64.md'],
  ['std.encoding.binary', 'reference/stdlib/binary.md'],
  ['Variables', 'guide/variables.md'],
  ['Module constants (v0.9, implemented)', 'guide/variables.md'],
  ['Struct and collection literals', 'guide/structs.md'],
  ['Types', 'guide/types.md'],
  ['decimal', 'reference/builtins/numbers.md'],
  ['Number rules', 'reference/builtins/numbers.md'],
  ['Collections', 'reference/builtins/collections.md'],
  ['Changing a collection while a loop reads it', 'reference/builtins/collections.md'],
  ['Functions', 'guide/functions.md'],
  ['Anonymous functions', 'guide/functions.md'],
  ['Classes', 'guide/classes.md'],
  ['Singleton classes', 'guide/classes.md'],
  ['Partial classes', 'guide/classes.md'],
  ['init and deinit (v0.7, implemented)', 'guide/classes.md'],
  ['weak fields (zeroing references)', 'guide/memory.md'],
  ['Inheritance and interfaces', 'guide/interfaces.md'],
  ['Downcast', 'guide/interfaces.md'],
  ['Enums', 'guide/enums.md'],
  ['Fixed representation: `enum(u8)`', 'guide/enums.md'],
  ['Option and Result', 'guide/errors.md'],
  ['Control flow', 'guide/control-flow.md'],
  ['if and match as values', 'guide/control-flow.md'],
  ['Generics', 'guide/generics.md'],
  ['Concurrency', 'guide/concurrency.md'],
  ['brew — child fibers (spec/CONCURRENCY.md)', 'guide/fibers.md'],
  // The removal is history, not surface. guide/fibers.md is what replaced it
  // and check-version.mjs already refuses a stale version number there.
  ['async and await (removed)', null],
  ['Targets and the build (v0.8, implemented)', 'tools/targets.md'],
  ['The seven Windows targets', 'tools/targets.md'],
  ['What a target can refuse', 'tools/targets.md'],
  ['std.target', 'reference/stdlib/target.md'],
  ['size_of, align_of, offset_of (v0.8, implemented)', 'guide/compile-time.md'],
  ['packed and align(N) (v0.8, implemented)', 'guide/structs.md'],
  ['RawPtr.alloc_aligned (v0.8, implemented)', 'guide/unsafe.md'],
  ['Atomic&lt;T&gt; and MemoryOrder (v0.8, implemented)', 'reference/builtins/atomics.md'],
  ['CPU feature detection and dispatch (v0.8, implemented)', 'guide/compile-time.md'],
  ['std.intrinsic (v0.8, implemented)', 'reference/stdlib/cpu-intrinsic.md'],
  ['std.time and std.random (v0.8, implemented)', 'reference/stdlib/time-random.md'],
  ['Shared memory (v0.8, implemented)', 'reference/builtins/files.md'],
  ['std.process (v0.8, implemented)', 'reference/stdlib/process.md'],
  ['std.net (v0.8, implemented)', 'reference/stdlib/net.md'],
  ['std.poll (v0.8, implemented)', 'reference/stdlib/poll.md'],
  ['std.term (v1.0, implemented)', 'reference/stdlib/term.md'],
  ['std.http (v1.0, implemented)', 'reference/stdlib/http.md'],
  ['std.websocket (v1.0, implemented)', 'reference/stdlib/websocket.md'],
  ['std.compress (v1.0, implemented)', 'reference/stdlib/compress.md'],
  ['std.crypto (v1.0, implemented)', 'reference/stdlib/crypto.md'],
  ['std.tls (v1.0, implemented)', 'reference/stdlib/tls.md'],
  ['std.signal (v0.8, implemented)', 'reference/stdlib/signal.md'],
  ['std.dylib (v0.8, implemented)', 'reference/stdlib/dylib.md'],
  ['Runtime profiles (v0.8, partly implemented)', 'tools/build.md'],
  ['WebAssembly (v0.8, implemented)', 'tools/targets.md'],
  ['Inline assembly (v0.8, implemented)', 'reference/stdlib/asm.md'],
  ['Embedded targets (v0.8, implemented)', 'tools/targets.md'],
  // Both are indexes over the whole language rather than one feature: `Misc`
  // collects rules that live on the page of whatever they are a rule about,
  // and `Decided` is the shipped-decision ledger. Splitting either across
  // pages here would assert a home that is not real.
  ['Misc', null],
  ['Keywords and modifiers', null],
  ['Decided', null],
]);

if (!BEANS_REPO) {
  console.error('spec-sections: Beans repo not found. Set BEANS_REPO to the beans checkout.');
  process.exit(1);
}

const specPath = path.join(BEANS_REPO, 'spec', 'SYNTAX.md');
if (!fs.existsSync(specPath)) {
  console.error(`spec-sections: no spec at ${specPath}.`);
  process.exit(1);
}
const lines = fs.readFileSync(specPath, 'utf8').split(/\r?\n/);

// Fenced code carries `###` comment lines in shell and Beans samples; a
// heading only counts outside a fence.
const headings = [];
let fenced = false;
for (let index = 0; index < lines.length; index += 1) {
  if (/^```/.test(lines[index])) fenced = !fenced;
  if (fenced) continue;
  const match = lines[index].match(/^(#{2,3}) (.+?)\s*$/);
  if (match) headings.push({ title: match[2], line: index + 1, start: index });
}

const ticked = (text) => [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
const pageCache = new Map();
const readPage = (page) => {
  if (!pageCache.has(page)) {
    const file = path.join(DOCS, page);
    pageCache.set(page, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);
  }
  return pageCache.get(page);
};

const failures = [];
for (let index = 0; index < headings.length; index += 1) {
  const { title, line, start } = headings[index];
  if (!SPEC_SECTION_PAGE.has(title)) {
    failures.push(
      `spec/SYNTAX.md:${line}: section '${title}' has no docs mapping.\n` +
        `    Add a row to SPEC_SECTION_PAGE in scripts/check-spec-sections.mjs:\n` +
        `    the page that documents it, or null with a comment saying why none does.`,
    );
    continue;
  }
  const page = SPEC_SECTION_PAGE.get(title);
  if (page === null) continue;

  const text = readPage(page);
  if (text === null) {
    failures.push(`spec/SYNTAX.md:${line}: section '${title}' maps to ${page}, which does not exist.`);
    continue;
  }

  for (const token of ticked(title)) {
    if (!text.includes(token)) {
      failures.push(
        `spec/SYNTAX.md:${line}: section '${title}' names \`${token}\`, and ${page} never mentions it.`,
      );
    }
  }

  const end = index + 1 < headings.length ? headings[index + 1].start : lines.length;
  const body = lines.slice(start + 1, end).join('\n');
  const tokens = [...new Set(ticked(body))].filter((t) => t.length >= 3 && t.length <= 40);
  if (tokens.length && !tokens.some((t) => text.includes(t))) {
    failures.push(
      `spec/SYNTAX.md:${line}: section '${title}' maps to ${page}, but that page uses none of ` +
        `the ${tokens.length} names the section defines (e.g. ${tokens.slice(0, 4).map((t) => `\`${t}\``).join(', ')}).`,
    );
  }
}

// A row for a heading the spec no longer has is dead weight that reads as
// coverage. Refuse it the same way.
const titles = new Set(headings.map((h) => h.title));
for (const title of SPEC_SECTION_PAGE.keys()) {
  if (!titles.has(title))
    failures.push(`SPEC_SECTION_PAGE maps '${title}', which is not a section of the spec any more — drop the row.`);
}

console.log(`Checked ${headings.length} spec section(s) against ${SPEC_SECTION_PAGE.size} mapping(s).`);
if (failures.length === 0) {
  console.log('\n✓ every spec section is documented');
  process.exit(0);
}
console.error(`\n✗ ${failures.length} spec section problem(s):`);
for (const failure of failures) console.error(`  ${failure}`);
process.exit(1);

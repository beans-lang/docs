#!/usr/bin/env node
// Regenerate the committed builtin-ABI snapshot from the live bootstrap source.
// Run this after the Beans C++ builtin tables change:
//   node scripts/gen-snapshots.mjs   (with compiler/bootstrap checked out)
import fs from 'node:fs';
import path from 'node:path';
import { parseBuiltinAbiFromSource } from './lib/extract-builtins.mjs';
import { DATA_DIR, BEANS_REPO } from './lib/paths.mjs';

if (!BEANS_REPO) {
  console.error('gen-snapshots: set BEANS_REPO to the Beans checkout.');
  process.exit(2);
}
const cpp = path.join(BEANS_REPO, 'compiler', 'bootstrap', 'builtins.cpp');
if (!fs.existsSync(cpp)) {
  console.error(`gen-snapshots: ${cpp} not found (check out the bootstrap submodule).`);
  process.exit(2);
}
const abi = parseBuiltinAbiFromSource();
fs.mkdirSync(DATA_DIR, { recursive: true });
const out = path.join(DATA_DIR, 'builtin-abi.json');
fs.writeFileSync(out, JSON.stringify(abi, null, 2) + '\n');
console.log(
  `Wrote ${path.relative(process.cwd(), out)}: ` +
    `${abi.methods.length} methods, ${abi.statics.length} statics, ${abi.fns.length} fns`,
);

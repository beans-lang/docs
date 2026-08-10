#!/usr/bin/env node
// One-off maintenance helper: remove em dashes from documentation prose, never
// touching fenced code blocks. A definition bullet ("`name` — text" or
// "**name** — text") becomes a colon; every other em dash becomes a comma, which
// is always grammatical. Prints the per-file count of replacements.
import fs from 'node:fs';

const files = process.argv.slice(2);
let grand = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const parts = src.split(/(```[\s\S]*?```)/g); // odd indices are fenced code
  let count = 0;
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i]
      // definition bullet: a code/bold label then em dash -> colon
      .replace(/(`[^`]+`|\*\*[^*]+\*\*)\s+—\s+/g, (m, label) => {
        count++;
        return `${label}: `;
      })
      // any other spaced em dash -> comma
      .replace(/\s+—\s+/g, () => {
        count++;
        return ', ';
      })
      // a bare em dash with no surrounding spaces -> comma+space
      .replace(/—/g, () => {
        count++;
        return ', ';
      });
  }
  if (count) {
    fs.writeFileSync(file, parts.join(''));
    console.log(`${count}\t${file}`);
    grand += count;
  }
}
console.log(`total replacements: ${grand}`);

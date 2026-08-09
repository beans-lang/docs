import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const WEBSITE_ROOT = path.resolve(here, '..', '..');

// The compiler repository is the sibling `beans` directory. Allow an override
// via BEANS_REPO so CI can point at a checkout in a different place.
function findRepo() {
  const candidates = [
    process.env.BEANS_REPO,
    path.resolve(WEBSITE_ROOT, '..', 'beans'),
    path.resolve(WEBSITE_ROOT, 'beans'),
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'compiler', 'version.h'))) return c;
  }
  return null;
}

export const BEANS_REPO = findRepo();
export const DOCS_DIR = path.join(WEBSITE_ROOT, 'src', 'content', 'docs');
export const DATA_DIR = path.join(WEBSITE_ROOT, 'data');

// The `beansc` used to check example snippets. Prefer the in-tree build, then a
// BEANSC override, then whatever is on PATH.
export function findBeansc() {
  if (process.env.BEANSC) return process.env.BEANSC;
  if (BEANS_REPO) {
    const local = path.join(BEANS_REPO, 'build', 'beansc');
    if (fs.existsSync(local)) return local;
  }
  return 'beansc';
}

// Walk a directory, returning absolute paths of files matching `test`.
export function walk(dir, test) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, test));
    else if (test(full)) out.push(full);
  }
  return out;
}

// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import fs from 'node:fs';

// GitHub Pages project-page settings. This is the `beans-lang/docs` repo, so a
// project page publishes at https://beans-lang.github.io/docs/ and the base path
// is "/docs". Override with the SITE / BASE env vars for a different deployment
// (for example a custom domain served at the root).
const SITE = process.env.SITE ?? 'https://beans-lang.github.io';
const BASE = process.env.BASE ?? '/docs';

// Beans syntax highlighting. We reuse the maintained TextMate grammars from the
// editors repository (source.beans / source.beans-manifest) so highlighting on
// the site matches VS Code and Zed exactly.
const readGrammar = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`./src/grammars/${name}`, import.meta.url), 'utf8'),
  );
const beansGrammar = { ...readGrammar('beans.tmLanguage.json'), name: 'beans', aliases: ['b'] };
const beansPotGrammar = {
  ...readGrammar('beans-manifest.tmLanguage.json'),
  name: 'beans-pot',
  aliases: ['pot'],
};

// Astro does not prepend the configured `base` to plain absolute links written
// inside Markdown ( [x](/guide/variables/) ). We write internal links base-less
// and this tiny rehype plugin rewrites them at build time, so the same content
// works both locally and under the /docs/ project path.
function rehypeBaseLinks() {
  const base = BASE.replace(/\/$/, '');
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'element' && node.tagName === 'a' && node.properties) {
      const href = node.properties.href;
      if (
        typeof href === 'string' &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !href.startsWith(base + '/') &&
        href !== base
      ) {
        node.properties.href = base + href;
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  markdown: {
    rehypePlugins: [rehypeBaseLinks],
  },
  integrations: [
    starlight({
      title: 'Beans',
      description:
        'The official documentation for Beans, a small object-oriented systems language with classes, interfaces, predictable ownership, and direct systems access.',
      tagline: 'A small object-oriented systems language.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/beans-lang/beans',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/beans-lang/docs/edit/main/',
      },
      lastUpdated: true,
      expressiveCode: {
        // Register the Beans languages with the bundled Shiki highlighter.
        shiki: { langs: [beansGrammar, beansPotGrammar] },
        styleOverrides: { borderRadius: '0.4rem' },
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Introduction',
          items: [
            { label: 'What Beans is', slug: 'intro/what-is-beans' },
            { label: 'Language philosophy', slug: 'intro/philosophy' },
            { label: 'Goals and non-goals', slug: 'intro/goals' },
            { label: 'Maturity and platforms', slug: 'intro/maturity' },
          ],
        },
        {
          label: 'Getting started',
          items: [
            { label: 'Install Beans', slug: 'start/install' },
            { label: 'Verify the install', slug: 'start/verify' },
            { label: 'Upgrade beansc', slug: 'start/upgrade' },
            { label: 'Hello world', slug: 'start/hello-world' },
            { label: 'Create and run a project', slug: 'start/projects' },
            { label: 'Editor setup', slug: 'start/editors' },
          ],
        },
        {
          label: 'Language guide',
          items: [
            { label: 'Source files and modules', slug: 'guide/modules' },
            { label: 'Imports and packages', slug: 'guide/imports' },
            { label: 'Variables and constants', slug: 'guide/variables' },
            { label: 'Types', slug: 'guide/types' },
            { label: 'Functions and closures', slug: 'guide/functions' },
            { label: 'Classes', slug: 'guide/classes' },
            { label: 'Interfaces and inheritance', slug: 'guide/interfaces' },
            { label: 'Structs and unions', slug: 'guide/structs' },
            { label: 'Enums', slug: 'guide/enums' },
            { label: 'Option and Result', slug: 'guide/errors' },
            { label: 'Generics', slug: 'guide/generics' },
            { label: 'Control flow', slug: 'guide/control-flow' },
            { label: 'Pattern matching', slug: 'guide/pattern-matching' },
            { label: 'Memory and ownership', slug: 'guide/memory' },
            { label: 'Concurrency', slug: 'guide/concurrency' },
            { label: 'Async and await', slug: 'guide/async' },
            { label: 'Compile-time features', slug: 'guide/compile-time' },
            { label: 'Annotations', slug: 'guide/annotations' },
            { label: 'Reflection', slug: 'guide/reflection' },
            { label: 'Attributes and modifiers', slug: 'guide/attributes' },
            { label: 'Unsafe and raw memory', slug: 'guide/unsafe' },
            { label: 'Foreign function interface', slug: 'guide/ffi' },
            { label: 'Operators and precedence', slug: 'guide/operators' },
          ],
        },
        {
          label: 'Builtin reference',
          items: [
            { label: 'Overview', slug: 'reference/builtins' },
            { label: 'Primitive types', slug: 'reference/builtins/primitives' },
            { label: 'Numbers and decimal', slug: 'reference/builtins/numbers' },
            { label: 'String', slug: 'reference/builtins/string' },
            { label: 'Bytes', slug: 'reference/builtins/bytes' },
            { label: 'Collections', slug: 'reference/builtins/collections' },
            { label: 'Option and Result', slug: 'reference/builtins/option-result' },
            { label: 'Ownership handles', slug: 'reference/builtins/handles' },
            { label: 'Atomics and MemoryOrder', slug: 'reference/builtins/atomics' },
            { label: 'Files and mappings', slug: 'reference/builtins/files' },
            { label: 'SIMD, arrays, slices', slug: 'reference/builtins/simd' },
            { label: 'Prelude functions', slug: 'reference/builtins/functions' },
          ],
        },
        {
          label: 'Standard library',
          items: [
            { label: 'Overview', slug: 'reference/stdlib' },
            { label: 'std.io and std.os', slug: 'reference/stdlib/io-os' },
            { label: 'std.collections', slug: 'reference/stdlib/collections' },
            { label: 'std.fmt', slug: 'reference/stdlib/fmt' },
            { label: 'std.math', slug: 'reference/stdlib/math' },
            { label: 'std.bytes', slug: 'reference/stdlib/bytes' },
            { label: 'std.path', slug: 'reference/stdlib/path' },
            { label: 'std.fs', slug: 'reference/stdlib/fs' },
            { label: 'std.reader', slug: 'reference/stdlib/reader' },
            { label: 'std.reflect', slug: 'reference/stdlib/reflect' },
            { label: 'std.encoding.json', slug: 'reference/stdlib/json' },
            { label: 'std.encoding.xml', slug: 'reference/stdlib/xml' },
            { label: 'std.encoding.base64', slug: 'reference/stdlib/base64' },
            { label: 'std.encoding.binary', slug: 'reference/stdlib/binary' },
            { label: 'std.net', slug: 'reference/stdlib/net' },
            { label: 'std.process', slug: 'reference/stdlib/process' },
            { label: 'std.poll', slug: 'reference/stdlib/poll' },
            { label: 'std.signal', slug: 'reference/stdlib/signal' },
            { label: 'std.dylib', slug: 'reference/stdlib/dylib' },
            { label: 'std.thread', slug: 'reference/stdlib/thread' },
            { label: 'std.time and std.random', slug: 'reference/stdlib/time-random' },
            { label: 'std.target', slug: 'reference/stdlib/target' },
            { label: 'std.cpu and std.intrinsic', slug: 'reference/stdlib/cpu-intrinsic' },
            { label: 'std.asm', slug: 'reference/stdlib/asm' },
          ],
        },
        {
          label: 'POT package management',
          items: [
            { label: 'Why it is called POT', slug: 'pot/why-pot' },
            { label: 'The beans.pot manifest', slug: 'pot/manifest' },
            { label: 'Dependencies and the lock file', slug: 'pot/dependencies' },
            { label: 'Local packages and imports', slug: 'pot/local-packages' },
            { label: 'Reproducible builds', slug: 'pot/reproducible' },
            { label: 'pot command reference', slug: 'pot/commands' },
          ],
        },
        {
          label: 'Tools',
          items: [
            { label: 'The beansc command', slug: 'tools/beansc' },
            { label: 'Building', slug: 'tools/build' },
            { label: 'Checking and running', slug: 'tools/check-run' },
            { label: 'Cross-compiling and targets', slug: 'tools/targets' },
            { label: 'bindgen', slug: 'tools/bindgen' },
            { label: 'Language server (LSP)', slug: 'tools/lsp' },
            { label: 'Debugger (DAP)', slug: 'tools/dap' },
            { label: 'doctor and upgrade', slug: 'tools/doctor-upgrade' },
            { label: 'Exit codes and troubleshooting', slug: 'tools/exit-codes' },
          ],
        },
        {
          label: 'Examples and recipes',
          items: [
            { label: 'Overview', slug: 'examples' },
            { label: 'Hello and the tour', slug: 'examples/hello-tour' },
            { label: 'Threads and channels', slug: 'examples/threads' },
            { label: 'Atomics', slug: 'examples/atomics' },
            { label: 'Files and a KV store', slug: 'examples/files-kv' },
            { label: 'Networking', slug: 'examples/networking' },
            { label: 'A local-package project', slug: 'examples/shop' },
            { label: 'C interop (FFI)', slug: 'examples/ffi' },
          ],
        },
        {
          label: 'Project reference',
          items: [
            { label: 'Versioning', slug: 'project/versioning' },
            { label: 'Compatibility', slug: 'project/compatibility' },
            { label: 'Building the compiler', slug: 'project/building' },
            { label: 'Running the tests', slug: 'project/testing' },
            { label: 'Contributing', slug: 'project/contributing' },
            { label: 'Release process', slug: 'project/release' },
          ],
        },
      ],
    }),
  ],
});

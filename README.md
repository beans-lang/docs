# Beans documentation

The official documentation site for the [Beans programming
language](https://github.com/beans-lang/beans). Built with
[Astro Starlight](https://starlight.astro.build/). All source lives in this
directory; the built site is a static bundle that runs on GitHub Pages under the
`/docs/` base path and needs no backend or network access.

The published reference tracks Beans `0.1.36` (language contract `1.0`, runtime
ABI `10`), including `std.log`, HTTP, HTTP/2, WebSocket, TLS, polling, and socket APIs,
the current `Send` rules, allocation-free read paths, OOP features, and runtime
reflection.

## Develop

```bash
npm install
npm run dev        # local dev server at http://localhost:4321/docs/
```

Other commands:

```bash
npm run build            # production build into dist/
npm run preview          # serve the production build locally
npm run test:signatures  # unit-test the signature extractors and API counts
npm run version:check    # release and runtime ABI facts match Beans VERSION
npm run coverage         # every public symbol is documented with its exact signature
npm run coverage:write   # regenerate the on-page API summary blocks from source
npm run links            # every internal link resolves
npm run examples         # compile the repo examples and marked doc blocks
npm run check            # test:signatures + coverage + links + examples
npm run verify           # test:signatures + coverage + links + build + examples (the full gate)
```

The coverage and example checks read the Beans compiler as their source of
truth. They look for it next to this repo (`../beans`) or wherever `BEANS_REPO`
points:

```bash
BEANS_REPO=/path/to/beans npm run coverage
BEANS_REPO=/path/to/beans \
BEANS_STDLIB=/path/to/beans/stdlib/std npm run examples
```

The example check compiles programs with `beansc`. It uses the in-tree build
(`$BEANS_REPO/build/beansc`), then `BEANSC`, then `beansc` on your `PATH`; if it
finds none it skips itself (set `REQUIRE_BEANSC=1` to make a missing compiler a
failure, as CI does). Point `BEANS_STDLIB` at the same checkout when that source
is newer than your installed release.

## Coverage and signatures (maintenance)

The coverage check proves the reference stays complete and correct. It builds an
inventory of every public builtin and standard-library symbol from the Beans
source and fails when a symbol is undocumented, when the page does not show the
symbol's exact signature (a wrong or missing parameter type or return type
fails), or when a page's API summary count is stale. The inventory is generated,
so it cannot drift from the compiler:

- **Standard library** — full signatures (with parameter names, generics, and
  modifiers) parsed from the Beans packages under `stdlib/std/**/*.b`
  (`scripts/lib/extract-signatures.mjs`).
- **Builtin methods, statics, and module functions** — signatures parsed from
  the checker's typed registry in `src/expression.b`
  (`builtin_method` / `builtin_static` / `builtin_module`, via
  `scripts/lib/extract-builtin-signatures.mjs`). These carry positional
  parameter types, matching how the compiler describes them.
- **Builtin type names** — parsed from `builtin_type()` in
  `src/resolve.b`, the compiler's single authority for builtin type
  names. Every name must map to a documentation page, so a new builtin type
  cannot be added to the compiler without a doc home.

Each package reference page carries a compact, source-generated API summary
between `<!-- coverage:summary -->` markers, right under the frontmatter. Run
`npm run coverage:write` after the source changes to refresh those blocks; the
plain `npm run coverage` verifies they are current. The full generated report,
including every enforced signature, is written to
[`docs-coverage.md`](docs-coverage.md) at the repository root. That report is a
maintenance artifact and is deliberately kept out of the published site.

## Beans syntax highlighting

Code blocks use the maintained Beans TextMate grammars copied from the
[editors repository](https://github.com/beans-lang/editors) into
`src/grammars/`. Use ` ```beans ` for Beans code and ` ```beans-pot ` for
`beans.pot` / `beans.lock` manifests.

## Deploy to GitHub Pages

Deployment is automated by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
it builds the site, runs the signature, coverage, link, and example checks, and
publishes `dist/` with the official GitHub Pages actions.

### One-time repository setting

Before the first deploy, set the Pages **source** to GitHub Actions:

> **Settings → Pages → Build and deployment → Source → GitHub Actions**

Do this once. Without it the workflow's deploy step fails because Pages is not
configured to accept an Actions-built artifact. After it is set, every push that
touches the site (or a manual **Run workflow**) publishes to
`https://beans-lang.github.io/docs/`.

The base path is `/docs/` (this repo is `beans-lang/docs`, so a GitHub project
page serves under `/docs/`). Override the deploy URL and base with the `SITE` and
`BASE` environment variables to host it elsewhere, for example `BASE=/` for a
user or organization page or a custom domain at the root.

## License

Apache License 2.0. See [LICENSE](LICENSE).

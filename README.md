# Beans website

The official documentation site for the [Beans programming
language](https://github.com/beans-lang/beans). Built with
[Astro Starlight](https://starlight.astro.build/). All source lives in this
directory; the built site is a fully static bundle that runs on GitHub Pages
under the `/beans/` base path and needs no backend or network access.

## Develop

```bash
npm install
npm run dev        # local dev server at http://localhost:4321/beans/
```

Other commands:

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build locally
npm run coverage   # check every public symbol is documented
npm run links      # check every internal link resolves
npm run examples   # compile the repo examples and marked doc blocks
npm run check      # coverage + links + examples
npm run verify     # coverage + links + build + examples (the full gate)
```

The coverage and example checks read the Beans compiler as their source of
truth. They look for it next to this repo (`../beans`) or wherever `BEANS_REPO`
points:

```bash
BEANS_REPO=/path/to/beans npm run coverage
```

The example check compiles programs with `beansc`. It uses the in-tree build
(`$BEANS_REPO/build/beansc`), then `BEANSC`, then `beansc` on your `PATH`; if it
finds none it skips itself. The builtin ABI inventory has a committed snapshot at
[`data/builtin-abi.json`](data/builtin-abi.json), so coverage works even without
the private bootstrap submodule; regenerate it with `node scripts/gen-snapshots.mjs`.

## Beans syntax highlighting

Code blocks use the maintained Beans TextMate grammars copied from the
[editors repository](https://github.com/beans-lang/editors) into
`src/grammars/`. Use ` ```beans ` for Beans code and ` ```beans-pot ` for
`beans.pot` / `beans.lock` manifests.

## Deploy to GitHub Pages

Deployment is automated by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
it builds the site, runs the coverage, link, and example checks, and publishes
`dist/` with the official GitHub Pages actions.

### One-time repository setting

Before the first deploy, set the Pages **source** to GitHub Actions:

> **Settings → Pages → Build and deployment → Source → GitHub Actions**

Do this once. Without it the workflow's deploy step fails because Pages is not
configured to accept an Actions-built artifact. After it is set, every push that
touches the site (or a manual **Run workflow**) publishes to
`https://beans-lang.github.io/website/`.

The base path is `/website/` (this repo is `beans-lang/website`, so a GitHub
project page serves under `/website/`). Override the deploy URL and base with the
`SITE` and `BASE` environment variables to host it elsewhere — for example
`BASE=/` for a user/organization page or a custom domain at the root.

## License

Apache License 2.0. See [LICENSE](LICENSE).

---
title: Editor setup
description: Set up Beans support in VS Code and Zed, both driven by the compiler's language server.
---

Beans has editor integrations for **VS Code** and **Zed**. Both are thin
clients over `beansc lsp` — the compiler's built-in language server. That means
every answer (errors, completion, go-to-definition) comes from the same
compiler that builds your code, so the editor never disagrees with the build.

The integrations live in a separate repository:
[`github.com/beans-lang/editors`](https://github.com/beans-lang/editors).

## VS Code

The extension is named **Beans** (id `beans-vscode`, publisher `beans-lang`,
Apache-2.0). It activates when you open a `**/*.b` file or a `**/beans.pot`.

### Install

Download `beans-vscode-<version>.vsix` from the
[editors repo releases](https://github.com/beans-lang/editors) and install it:

```bash
code --install-extension beans-vscode-<version>.vsix
```

### Settings

| Setting | What it does |
| --- | --- |
| `beans.compiler.path` | Path to the `beansc` to use. |
| `beans.compiler.searchDevelopmentPaths` | Also look for a source build. |
| `beans.trace.server` | Log the LSP traffic, for debugging the extension. |

### What you get

Diagnostics, completion, hover, signature help, go-to-definition (across
packages), find references, document symbols, rename, and syntax highlighting —
plus anything else the compiler exposes through the LSP. Press **F5** to debug
a `.b` file.

## Zed

The extension is named **Beans** (id `beans`). It uses an in-repo Tree-sitter
grammar for highlighting plus the `beansc` language server for everything
semantic. You need **Zed 0.205 or newer**.

### Install as a dev extension

```bash
rustup target add wasm32-wasip2
```

Then in Zed: open the command palette, run **"zed: extensions"**, choose
**"Install Dev Extension"**, and pick the `zed` directory from the editors
repo.

### Semantic tokens

Semantic highlighting is opt-in. Turn it on in your Zed settings:

```text
"semantic_tokens": "combined"
```

or `"full"`.

## How both find the compiler

Both editors resolve `beansc` and use the first one they find, in this order:

1. the editor setting (`beans.compiler.path` in VS Code),
2. the `BEANSC` environment variable,
3. your **official Beans installation** — the toolchain the one-line installer
   sets up under `$BEANS_HOME` (default `~/.beans` on macOS and Linux,
   `%LOCALAPPDATA%\Beans` on Windows). This lookup is what makes a released
   `beansc` work out of the box, with no setting to configure,
4. `beansc` at a workspace root, then on your `PATH`,
5. a source build next to the workspace (`build/beansc`, `beans/build/beansc`,
   `../beans/build/beansc`) — for working on the compiler itself.

If nothing is found, the extension turns Beans features off and tells you what
it looked for. The exact, current lookup is documented in the
[editors repository](https://github.com/beans-lang/editors); install the latest
release from there so step 3 or 4 finds your compiler.

## Not yet available

These need the compiler to add the capability first, so the editors cannot do
them yet:

- formatting,
- code actions,
- inlay hints.

## Where to go next

- [Language server (LSP)](/tools/lsp/) — what the server provides.
- [Debugger (DAP)](/tools/dap/) — debugging Beans programs.
- [Verify the install](/start/verify/) — make sure `beansc` is on your PATH first.

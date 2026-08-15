---
title: The beansc command
description: The beansc usage block, the full subcommand list, and the environment variables it honors.
---

`beansc` is the Beans compiler and its command-line tool. It lexes, parses,
checks, runs, and builds Beans code, and it hosts the package manager, the
language server, and the debug adapter. The entry point is
[`compiler/beans/main.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/main.b),
driving [`compiler/beans/driver.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/driver.b).

## Usage

```text
usage: beansc <lex|parse|check|mir|run> <file.b>...
       beansc build [options] <file.b> [-o out]
       beansc bindgen <header.h> -o <bindings.b> [options] [-- clang-options]
       beansc pot add <dependency> [ref]
       beansc pot remove <dependency>
       beansc pot <tidy|update [dependency]>
       beansc upgrade
       beansc doctor
       beansc lsp-probe <file.b>:<line>:<col>
       beansc lsp   (language server on stdio)
       beansc --version

build options:
  --release              -O3, NDEBUG
  --lto                  link-time optimization
  --target <triple>      <supported target names>
  --cpu <generic|native|name>
  --features <+f,-f,...> enable or disable CPU features
  --sysroot <path>       target sysroot for a cross link
  --cc <path>            C driver to use (default clang)
  --linker <name>        pass -fuse-ld=<name>
  --ar <path>            static archive tool (default ar)
  --header <path>        write a C header for library exports
  --emit <bin|obj|static|shared|ir>
  --runtime <full|minimal|freestanding>
                         how much runtime; anything a profile
                         drops is refused at check time
  --locked               require exact beans.lock entries
  --offline              forbid dependency network access
```

## Subcommands

| Command | What it does |
| --- | --- |
| `beansc --version` | Print the compiler, language, and runtime ABI versions. |
| `beansc doctor` | Report what this install can build and how to fix what it cannot. Always exits 0. |
| `beansc lex <file.b>...` | Dump the token stream. |
| `beansc parse <file.b>...` | Parse and print the AST. |
| `beansc check <file.b>` | Type-check. Prints `<file>: ok` or errors. Exit 1 on any error. |
| `beansc mir <file.b>` | Print the checked, ownership-planned MIR. |
| `beansc llvm <file.b>` | Print the LLVM IR native builds use. |
| `beansc run <file.b> [-- args...]` | Check, then run on the reference interpreter. |
| `beansc build [options] <file.b> [-o out]` | Compile to a native binary via LLVM/Clang. |
| `beansc target <triple>` | Print one target's layout and capability facts. |
| `beansc bindgen <header.h> -o <bindings.b> [options] [-- clang-options]` | Generate Beans C declarations with Clang. |
| `beansc pot add <dependency> [ref]` | Add a Git dependency and write `beans.lock`. |
| `beansc pot tidy` | Resolve used dependencies and write `beans.lock`. |
| `beansc pot remove <dependency>` | Remove a Git dependency and tidy `beans.lock`. |
| `beansc pot update [dependency]` | Refresh all locked dependencies, or one named. |
| `beansc upgrade` | Upgrade this Beans installation to the latest release. |
| `beansc lsp` | Language server on stdio. |
| `beansc debug-adapter` | Debug adapter (DAP) on stdio. |

Pages for each area:

- [Building](/tools/build/): `beansc build`, `--emit`, release and library builds.
- [Checking and running](/tools/check-run/): `check`, `run`, and the `lex`/`parse`/`mir`/`llvm` inspection commands.
- [Cross-compiling and targets](/tools/targets/): `--target` and friends, `beansc target`, runtime profiles.
- [bindgen](/tools/bindgen/): generate C bindings.
- [Language server (LSP)](/tools/lsp/): `beansc lsp` and `lsp-probe`.
- [Debugger (DAP)](/tools/dap/): `beansc debug-adapter`.
- [doctor and upgrade](/tools/doctor-upgrade/).
- [Exit codes and troubleshooting](/tools/exit-codes/).
- [The pot command reference](/pot/commands/).

## Environment variables

`beansc` honors these environment variables:

| Variable | What it sets |
| --- | --- |
| `BEANS_HOME` | Install root, and the prefix `upgrade` writes to. |
| `BEANS_STDLIB` | Standard library root. |
| `BEANS_RUNTIME` | C runtime source. |
| `BEANS_WASM_HOST` | WebAssembly host source. |
| `BEANS_ENCODING` | Encoding bridge sources. |
| `BEANS_CC` | C driver to use. |
| `BEANS_WASM_CC` | C driver for WebAssembly. |
| `BEANS_AR` | Static archive tool. |
| `BEANS_CPU_FEATURES` | An allowlist that can only hide detected CPU features. |
| `PATH` | Used to find tools such as `clang` and the linker. |

## What is not here

There is **no formatter** (`beansc fmt` does not exist, and there is no separate
formatter tool) and **no `beansc test`** subcommand. See [Exit codes and
troubleshooting](/tools/exit-codes/).

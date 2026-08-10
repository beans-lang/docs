---
title: Exit codes and troubleshooting
description: What each beansc exit code means, and the tools that do not exist (no formatter, no beansc test).
---

`beansc` uses a small, fixed set of exit codes. Scripts and CI can rely on them.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success. (`doctor` always exits 0.) |
| `1` | Compilation, analysis, or build failure. |
| `2` | Usage or argument error. |
| `3` | A runtime panic from the interpreter during `beansc run`. |

What falls under each:

- **1**: load, resolve, check, layout, MIR, LLVM, or native-build errors; a
  lex or parse failure; a `pot` load failure; and `upgrade` preconditions not
  met.
- **2**: no arguments; an unknown command; an unknown or misused flag; a
  missing flag value; a bad `--emit` or `--runtime`; an unknown target; and a
  malformed `pot`, `bindgen`, or `lsp` invocation.
- **3**: the program panicked while running on the reference interpreter under
  [`beansc run`](/tools/check-run/).

## There is no formatter

Beans has **no formatter**. `beansc fmt` does not exist, and there is no
separate formatter tool. Formatting is not yet implemented. If you are looking
for a "format on save," there is nothing to wire up yet.

## There is no `beansc test`

There is **no `beansc test` subcommand**. Beans' own test suite is run through
the project Makefile (`make test` and friends) when building from source. See
[Running the tests](/project/testing/). That is for working on the compiler, not
a per-project test runner.

## Troubleshooting

- **"is not a Beans command"**: you typed a command that does not exist. Check
  the [subcommand list](/tools/beansc/). Dependency commands live under `beansc
  pot`, such as `beansc pot tidy` and `beansc pot update`.
- **A capability is "refused at check time"**: your `--runtime` profile drops
  it. See [runtime profiles](/tools/targets/).
- **A native build fails to find clang**: you likely have a slim package. Run
  [`beansc doctor`](/tools/doctor-upgrade/); it names the fix.
- **A dependency is rejected**: its commit or tree does not match
  `beans.lock`. See [Reproducible builds](/pot/reproducible/).

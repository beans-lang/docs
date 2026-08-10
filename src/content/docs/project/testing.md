---
title: Running the tests
description: The make test targets, what each one checks, and the change loop for a behavior change.
---

Beans' tests run through the project Makefile when you [build from
source](/project/building/). There is no `beansc test` and no `make fmt`.

## The test targets

| Target | What it runs |
| --- | --- |
| `make test` | The interpreter/native differential suite: `test-core` plus the stage-0 gates. |
| `make test-core` | The self-hosted-only gates. |
| `make test-quick` | A roughly 5-minute developer gate, including the bootstrap and a fuzz smoke test. |
| `make test-sanitize` | ASan and TSan runs, plus macOS leak checks. |
| `make test-linux` | The whole gate inside a Linux container. |
| `make test-bootstrap` | The stage2 / stage3 fixed point. |
| `make test-ffi` | Layouts, the C ABI, bindgen, callbacks, and library output. |
| `make access-score` | The systems-access scorecard. |
| `make bench-verify` | 39 workloads checked for output parity. |
| `make bench-full` | The claim-eligible benchmark run. |

## The change loop

When you change behavior, run tests in this order:

1. The **smallest focused test** for what you touched.
2. `make test`.
3. `make test-sanitize`, for ownership, runtime, concurrency, FFI, or codegen
   changes.
4. `make test-bootstrap`, for frontend, MIR, or compiler changes.

## What is not here

- There is **no `make fmt`**. Beans has no formatter. See [Exit codes and
  troubleshooting](/tools/exit-codes/).
- There is **no `beansc test`** subcommand. These Makefile targets are for
  working on the compiler itself, not a per-project test runner.

See [Building the compiler](/project/building/) and
[Contributing](/project/contributing/) for the surrounding workflow.

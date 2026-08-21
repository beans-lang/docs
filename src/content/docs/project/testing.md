---
title: Running the tests
description: The make test targets, what each one checks, and the change loop for a behavior change.
---

Beans' tests run through the project Makefile when you [build from
source](/project/building/). There is no `beansc test` and no `make fmt`.

## The test targets

| Target | What it runs |
| --- | --- |
| `make test` | All behavioural suites, interpreter/native self-host checks, and the compiler fixed point. |
| `make test-core` | The full behavioural suite. |
| `make test-quick` | A roughly 5-minute developer gate with diagnostics, parity, determinism, and a fuzz smoke test. |
| `make test-frontend` | Parser, checker, packages, annotations, LSP, DAP, and source APIs. |
| `make test-semantics` | Interpreter/native language semantics and MIR ownership. |
| `make test-runtime` | Runtime, concurrency, filesystem, process, and networking. |
| `make test-sanitize` | ASan, UBSan, TSan, and macOS leak checks. |
| `make test-linux` | The whole gate inside a Linux container. |
| `make test-fixpoint` | Two release-mode self-builds must be byte-identical. |
| `make test-ffi` | Layouts, the C ABI, bindgen, callbacks, and library output. |
| `make fuzz-oop-smoke` | Generated class graphs, package visibility, generic structs, exact checker errors, interpreter, and debug native output. |
| `make fuzz-oop` | The OOP generator across interpreter, debug, release, and LTO. |
| `make fuzz-oop-long` | A 1,000-case OOP run; change the size with `OOP_FUZZ_CASES`. |
| `make fuzz-net` | Seeded socket and poller operations with deterministic failure injection. |
| `make fuzz-net-soak` | The wall-clock network fuzz lane. |
| `make fuzz-differential` | Generated programs checked against an independent evaluator, interpreter, debug, release, and LTO. |
| `make access-score` | The systems-access scorecard. |
| `make bench-verify` | 39 workloads checked for output parity. |
| `make bench-full` | The claim-eligible benchmark run. |

Network tests can inject deterministic syscall failures:

```bash
BEANS_SOCK_FAILPOINTS=42:10 ./build/beansc run examples/net.b
BEANS_SOCK_FAILPOINTS=42:10:eintr BEANS_SOCK_FAILPOINTS_LOG=1 \
  ./build/beansc run examples/net.b
```

The value is `<seed>[:<rate>[:eintr]]`. The last form injects only interrupts,
which every retry loop must absorb, and the log makes a run replayable.

## The change loop

When you change behavior, run tests in this order:

1. The **smallest focused test** for what you touched.
2. `make test`.
3. `make test-sanitize`, for ownership, runtime, concurrency, FFI, or codegen
   changes.
4. `make test-fixpoint`, for frontend, MIR, or compiler changes.

For an OOP or generic-struct change, run `make fuzz-oop` before the full gate.
Every generated valid program has an independent expected-output oracle. Every
invalid program must produce the exact expected checker errors.
Failures are saved under `build/oop-fuzz/failures/` with all generated source,
lane output, and a `replay.txt` command for the exact seed and case.

## What is not here

- There is **no `make fmt`**. Beans has no formatter. See [Exit codes and
  troubleshooting](/tools/exit-codes/).
- There is **no `beansc test`** subcommand. These Makefile targets are for
  working on the compiler itself, not a per-project test runner.

See [Building the compiler](/project/building/) and
[Contributing](/project/contributing/) for the surrounding workflow.

---
title: Maturity and platforms
description: How finished Beans is today, what is implemented, and which platforms are supported.
---

This page describes the current status of Beans: what works, what is still being
proven, and which platforms are supported.

## Where Beans stands

Beans is a production preview on the 1.0 stabilization line. Each part of that
phrase means something specific:

- **The language contract is frozen at `1.0`.** The syntax and semantics you
  write against are settled. Code you write now is meant to keep working.
- **The latest compiler release is `0.1.27`.** The language is `1.0`; the tool
  that implements it is still on its way to a matching release number.
- **The runtime ABI is `7`.**

It is a preview, not a finished 1.0. It is usable, but the full 1.0 release still
has open work, listed below.

## What is implemented

The list below is what works today:

- **A self-hosted compiler.** `beansc` is written in Beans. Its stage 2 and
  stage 3 builds are byte-identical, the standard proof that a compiler
  reproduces itself.
- **A full front end.** Whole-program loader and resolver, a generic checker,
  typed custom annotations and reflection, private/static/singleton/abstract
  object features, a high-level IR (HIR), and a checked mid-level IR (MIR)
  with ownership verification.
- **A native backend.** MIR compiled to LLVM for debug, release, and LTO builds,
  with automatic reference counting plus a cycle collector.
- **A reference interpreter** with behavior identical to the native backend.
- **Concurrency.** OS threads, typed atomics, mutexes, channels, structured
  `async`/`await`, and readiness waits.
- **Package management.** Canonical package identity, a hashed `beans.lock`,
  locked and offline builds, and a Git cache.
- **Full C interop.** Imports, exports, headers, bindgen, records, unions,
  globals, thread-local storage, `errno`, and callbacks.
- **Editor and debugger support.** A semantic LSP and an interpreter DAP.
- **Systems access.** Files, memory mappings, processes, sockets, DNS, polling,
  signals, shared memory, dynamic libraries, SIMD, and intrinsics. Every
  capability on the project's 100-point systems-access scorecard is implemented.
- **Typed encoding.** Generated JSON and XML decoders write nested structs,
  lists, and options directly, with compile-time mapping checks and XML
  namespace URI matching.

Thirty targets are registered, and most ship as prebuilt release packages.

## What is still open before 1.0

Beans is not calling itself production-ready 1.0 yet. These items are open:

- Clean performance baselines against the benchmark suite.
- A 24-hour fuzz campaign.
- A 30-clean-day public beta, then a 14-clean-day release candidate.
- No open critical or high correctness bugs.

When those are done, the preview becomes a full release.

## Supported platforms

### Required native 1.0 CI hosts

These three platforms are the ones the 1.0 release must build and pass on, and
they are the most tested:

- macOS arm64
- Linux x86-64 (GNU)
- Linux arm64 (GNU)

### Preview targets

These build and are shipped, but are marked preview rather than fully proven:

- WebAssembly
- Bare-metal Cortex-M4 (`thumbv7em-none-eabi`)
- Bare-metal RV32 (`riscv32-unknown-none-elf`)

For how the language, compiler, and ABI version numbers relate, see
[Versioning](/project/versioning/). To try the preview, [install Beans](/start/install/).

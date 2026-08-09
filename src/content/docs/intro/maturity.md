---
title: Maturity and platforms
description: An honest look at how finished Beans is today, what is implemented, and which platforms are supported.
---

This page is the honest status of Beans. It tells you what works, what is still
being proven, and which platforms are supported.

## Where Beans stands

Beans is a **production preview on the 1.0 stabilization line**. That is a
careful phrase, so here is what each part means:

- **The language contract is frozen at `1.0`.** The syntax and semantics you
  write against are settled. Code you write now is meant to keep working.
- **The latest compiler release is `0.1.7`.** The language is `1.0`;
  the tool that implements it is still on its way to a matching release number.
- **The runtime ABI is `4`.**

It is a **preview**, not a finished 1.0. It is usable, but the full 1.0
release still has open work (listed below).

## What is implemented

A lot is done. The list below is what actually works today:

- **A self-hosted compiler.** `beansc` is written in Beans. Its stage 2 and
  stage 3 builds are byte-identical, which is the standard proof a compiler
  reproduces itself.
- **Full front end.** Whole-program loader and resolver, generic checker, a
  high-level IR (HIR), a checked mid-level IR (MIR) with ownership
  verification.
- **A native backend.** MIR compiled to LLVM for debug, release, and LTO
  builds, with automatic reference counting plus a cycle collector.
- **A reference interpreter** with behavior identical to the native backend.
- **Concurrency.** OS threads, typed atomics, mutexes, channels, structured
  `async`/`await`, and readiness waits.
- **Package management.** Canonical package identity, a hashed `beans.lock`,
  locked and offline builds, and a Git cache.
- **Full C interop.** Imports, exports, headers, bindgen, records, unions,
  globals, thread-local storage, `errno`, and callbacks.
- **Editor and debugger support.** A semantic LSP and an interpreter DAP.
- **Systems access.** Files, memory mappings, processes, sockets, DNS, polling,
  signals, shared memory, dynamic libraries, SIMD, and intrinsics. The
  executable systems-access score is 100/100.

By the numbers: 30 targets are registered, and 26 have hosted release packages.

## What is still open before 1.0

Beans is not calling itself production-ready 1.0 yet. These items are still
open:

- Clean performance baselines.
- A 24-hour fuzz campaign.
- A 30-clean-day public beta, then a 14-clean-day release candidate.
- No open critical or high correctness bugs.

When those are done, the preview becomes a full release.

## Supported platforms

### Required native 1.0 CI hosts

These three platforms are the ones the 1.0 release must build and pass on. They
are the most tested:

- macOS arm64
- Linux x86-64 (GNU)
- Linux arm64 (GNU)

### Preview targets

These build and are shipped, but are marked preview rather than fully proven:

- WebAssembly
- Bare-metal Cortex-M4 (`thumbv7em-none-eabi`)
- Bare-metal RV32 (`riscv32-unknown-none-elf`)

## Where to go next

- [Versioning](/project/versioning/) — how the language, compiler, and ABI
  version numbers relate.
- [Goals and non-goals](/intro/goals/) — what Beans is and is not built for.
- [Install Beans](/start/install/) — get the preview and try it.

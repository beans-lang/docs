---
title: Goals and non-goals
description: What Beans is built to do well and the features it deliberately leaves out.
---

Beans keeps its grammar small, makes types explicit, and gives programs direct
access to system APIs. These goals guide what the language includes and leaves
out.

## Goals

- **Explicit code.** Types are written out. Missing values use `Option<T>` and
  failures use `Result<T>`, so callers handle both in ordinary code.
- **Exact arithmetic.** `decimal` provides exact base-10 arithmetic without
  binary floating-point rounding.
- **Direct systems access.** Sized integers, value types, raw memory in
  `unsafe` code, and C interop let programs work with native data and system APIs.
- **Predictable memory.** Automatic reference counting with a cycle collector, so
  there are no garbage-collector pauses on the normal path and destructors run at
  a known time.
- **A small, readable language.** Functions, closures, structs, enums, classes,
  and interfaces share a small grammar.

Fast native code is a stated project goal, measured against tuned C++ on a
benchmark suite. See [Maturity and platforms](/intro/maturity/) for where that
work stands today.

## Non-goals

- **No null.** Missing values are `Option<T>`. There is no null pointer to forget
  to check.
- **No exceptions.** Failures use `Result<T>`. There is no `throw` or `try`.
- **No colored functions.** Fibers are green threads you start with
  [`brew`](/guide/fibers/), but there is no `async` keyword and nothing to
  `await`. Any function may park without special syntax at the call site.
- **No implicit conversions.** A number does not silently change type. To turn an
  `int` into a `decimal`, you write `x as decimal`.
- **No tracing garbage collector.** Memory uses automatic reference counting plus
  a cycle collector, not a tracing GC.
- **No central package registry.** There is no package hub. Dependencies come from
  Git, pinned in a lock file. See [POT package management](/pot/why-pot/).
- **No stable native object ABI before 1.0.** The C ABI is stable and supported,
  but the layout of native Beans objects is not promised across compiler versions
  until the language reaches a full 1.0 release.

The [language philosophy](/intro/philosophy/) explains the design rules behind
these choices, and [Option and Result](/guide/errors/) covers the replacements
for null and exceptions.

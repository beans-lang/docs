---
title: Goals and non-goals
description: What Beans is built to do well and the features it deliberately leaves out.
---

Beans has a clear idea of what it is for. Knowing what it leaves out is as useful
as knowing what it includes, so this page lists both.

## Goals

Beans is built to do these things well:

- **Business apps.** Accounting, ERP, and billing: code that must be exact and
  stay readable for years. Explicit types, exact `decimal` arithmetic, and no
  hidden control flow serve this.
- **Systems work.** Databases, operating systems, and hardware control: code that
  touches the machine. Sized integers, value types, an `unsafe` layer, and C
  interop serve this.
- **Predictable memory.** Automatic reference counting with a cycle collector, so
  there are no garbage-collector pauses on the normal path and destructors run at
  a known time.
- **A small, readable language.** A small grammar with object-oriented features
  (classes, interfaces, inheritance) on top.

Fast native code is a stated project goal, measured against tuned C++ on a
benchmark suite. See [Maturity and platforms](/intro/maturity/) for where that
work stands today.

## Non-goals

These are things Beans deliberately does not have. They are choices, not gaps
waiting to be filled.

- **No null.** Missing values are `Option<T>`. There is no null pointer to forget
  to check.
- **No exceptions.** Failures are `Result<T>`. There is no `throw`, no `try`, and
  no stack unwinding surprising you from three functions down.
- **No colored functions.** Fibers are green threads you start with
  [`brew`](/guide/fibers/), but there is no `async` keyword and nothing to
  `await`. Any function may park, and the caller neither knows nor cares.
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

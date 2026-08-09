---
title: Goals and non-goals
description: What Beans is built to do well and the features it deliberately leaves out.
---

Beans has a clear idea of what it is for. Knowing what it leaves out is just as
useful as knowing what it includes, so this page lists both.

## Goals

Beans is built to do these things well:

- **Business apps** — accounting, ERP, billing. Code that must be exact and stay
  readable for years. Explicit types, `decimal` money math, and no hidden
  control flow serve this.
- **Systems work** — databases, operating systems, hardware control. Code that
  touches the machine. Sized integers, value types, an `unsafe` layer, and C
  interop serve this.
- **Predictable performance** — C++-class speed as a goal, with no
  garbage-collector pauses on the normal path.
- **A small, readable language** — a grammar about the size of Go's, with
  Java-style objects on top.

## Non-goals

These are things Beans **deliberately does not have**. They are choices, not
gaps waiting to be filled.

- **No null.** Missing values are `Option<T>`. There is no null pointer to
  forget to check.
- **No exceptions.** Failures are `Result<T>`. There is no `throw`, no `try`,
  no stack unwinding surprising you from three functions down.
- **No green threads.** Beans uses real OS threads. There is no hidden runtime
  scheduler multiplexing lightweight tasks onto them.
- **No implicit conversions.** A number does not silently change type. If you
  want an `int` to become a `decimal`, you write `x as decimal`.
- **No garbage-collector pauses.** Memory uses automatic reference counting plus
  a cycle collector, not a tracing GC that stops the world.
- **No central package registry.** There is no npm-style hub. Dependencies come
  from Git, pinned in a lock file. (See [POT package management](/pot/why-pot/).)
- **No stable native Beans object ABI before 1.0.** The C ABI is stable and
  supported, but the layout of native Beans objects is not promised across
  compiler versions until the language reaches a full 1.0 release.

## Where to go next

- [Language philosophy](/intro/philosophy/) — the design rules behind these choices.
- [Maturity and platforms](/intro/maturity/) — how finished Beans is today.
- [Option and Result](/guide/errors/) — the replacements for null and exceptions.

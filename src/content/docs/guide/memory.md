---
title: Memory and ownership
description: How Beans manages memory — automatic reference counting, a cycle collector, move semantics, and the shared-ownership handles.
---

Beans manages memory with **automatic reference counting (ARC)** plus a **cycle
collector**. There is no tracing garbage collector and no pauses on the
straight-line path. This page explains the model and the tools you use to
control it.

## Reference counting

Every heap value carries a small header (an atomic count plus shape
information). The compiler emits retains and releases at ownership boundaries,
and a generic destructor walks nested structures when a value's count reaches
zero. Destruction is deterministic: [`deinit`](/guide/classes/) runs the moment
the last reference drops, on the thread that dropped it.

The design keeps reference counting off hot paths: **function arguments, loop
variables, and reads borrow instead of retaining.** You pay for a retain only
when you actually keep a value.

## Cycles

Reference counting alone cannot free a cycle (`a.next = some(b); b.next =
some(a)`). Beans catches cycles with a **cycle collector** (trial deletion, the
Bacon–Rajan / Nim ORC family): a decrement that does not hit zero parks the
object as a possible cycle root; when enough roots pile up, the collector
trial-deletes each root's subgraph, restores anything still referenced from
outside, and frees the rest.

- It runs only between statements, when no worker threads are live, and once
  more at exit.
- All walks are iterative, so even a very large dropped structure will not
  overflow the stack.
- An object that dies **inside a cycle** does not run its `deinit`. If it owns a
  resource, break the cycle by hand — see `Weak<T>` below.

:::note[Known limit]
Collection is deferred while worker threads run. A program that churns cycles
forever beside a long-lived worker can grow until that worker exits.
:::

## Move

`move` transfers ownership of a value out of a binding instead of copying it.
`return move local` hands back the last reference rather than retaining. The
checker enforces use-after-move at compile time. See
[Variables and constants](/guide/variables/) for the rules.

## Move-only handles

`List`, `Map`, `OrderedMap`, `Box<T>`, and `Arena<T>` are **move-only outer
handles**, and so is any `unique class`. Binding, assigning, storing, or
returning them uses `move`; parameters and loop reads borrow. `clone()` makes an
independent copy (it needs `Clone` on the stored types).

```beans
var value: Box<int> = new Box(7)
value.set(9)
let owned: Box<int> = move value       // move the handle

var arena: Arena<string> = new Arena(1024)
let handle: int = arena.add("bean")
let word: string = arena.at(handle)    // checked; panics on a bad handle
arena.clear()                          // drops all values in one pass
```

- `Box<T>` owns one heap slot: `get()` returns the value, `set(value)` replaces
  it.
- `Arena<T>` is an append-only slab: `add(value)` returns a stable integer
  handle; `at`, `get`, `len`, and `clear` work on the region. `clear` keeps
  capacity but invalidates every old handle.

## Shared ownership across threads

`Shared<T>` is the explicit thread-safe shared-ownership handle. `Weak<T>`
observes the same value without keeping it alive:

```beans
let shared: Shared<string> = new Shared("beans")
let weak: Weak<string> = shared.downgrade()
let live: Option<Shared<string>> = weak.upgrade()
let gone: bool = weak.is_expired()
```

`get()` returns a copy of the value. The control block owns one value reference
until its last strong handle dies; `upgrade` uses an atomic compare/exchange, so
it can never revive a dead value. A cycle made through `Shared` must be broken
with `Weak`, exactly like C++ `shared_ptr`/`weak_ptr` — the local cycle
collector does not trace through `Shared` control blocks.

`Shared<T>` and `Weak<T>` are `Send` and `Sync` only when `T` is both.

## Send and Sync

Plain class references, `List`, `Map`, `Box`, `Arena`, `Bytes`, `File`, and
`MMap` are **not `Send`** — they are local reference values by default. Scalars,
immutable strings, `AtomicInt`, `Mutex`, a `Channel` of `Send` values, and
`Shared`/`Weak` of `Send + Sync` types can cross a thread boundary.
`thread.spawn` rejects a closure that captures or returns a non-`Send` value —
so you cannot silently race shared mutable data. Wrap it in a `Mutex` instead.
See [Concurrency](/guide/concurrency/).

## No leaks

The design is verified with Apple's `leaks` tool: zero leaked bytes on every
test program, including one that drops hundreds of thousands of cycle pairs, a
large ring, and a self-capturing closure. Two million dropped cycle pairs run in
about 1.4 MB, flat.

## Next

- [Concurrency](/guide/concurrency/)
- [Ownership handles reference](/reference/builtins/handles/)
- [Variables and constants](/guide/variables/)

Source: [`README.md`](https://github.com/beans-lang/beans/blob/main/README.md) and [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).

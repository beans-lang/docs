---
title: Memory and ownership
description: How Beans manages memory with automatic reference counting, a cycle collector, move semantics, and the shared-ownership handles.
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
when you actually keep a value. Because a plain reference is borrowed while it is
passed and read, most code never writes anything about ownership at all.

## Cycles

Reference counting alone cannot free a cycle (`a.next = some(b); b.next =
some(a)`). Beans catches cycles with a **cycle collector** (trial deletion, the
Bacon-Rajan / Nim ORC family): a decrement that does not hit zero parks the
object as a possible cycle root; when enough roots pile up, the collector
trial-deletes each root's subgraph, restores anything still referenced from
outside, and frees the rest.

- It runs only between statements, when no worker threads are live, and once
  more at exit.
- All walks are iterative, so even a very large dropped structure will not
  overflow the stack.
- An object that dies **inside a cycle** does not run its `deinit`. A cycle
  never drops to zero on its own, so if the object owns a resource (a file, a
  socket), that resource is not released. The declarative fix is a `weak`
  field, described next; `Shared<T>` cycles use `Weak<T>` instead.

:::note[Known limit]
Collection is deferred while worker threads run. A program that churns cycles
forever beside a long-lived worker can grow until that worker exits.
:::

## weak fields

A class field declared `weak` is a **zeroing reference**: it holds no
ownership count on its referent, so it never forms a cycle edge. Its type must
be `Option<C>` for a non-`unique` class `C`, and its default must be `none`.

<!-- beans:compile -->
```beans
package main

import std.io

class Node {
    name: string = ""
    child: Option<Node> = none        // owning: parent keeps child alive
    weak parent: Option<Node> = none  // non-owning: zeroes when parent dies

    fn deinit() { io.println("gone {self.name}") }
}

fn main() {
    let parent: Node = new Node()
    parent.name = "parent"
    let child: Node = new Node()
    child.name = "child"
    child.parent = some(parent)
    parent.child = some(child)
    match child.parent {
        some(found) => { io.println("up: {found.name}") }
        none => { io.println("up: gone") }
    }
}
// up: parent, then both deinits run — the back edge is weak, so
// there is no cycle to leak
```

Reads produce the declared `Option<C>`: `some` while the referent is alive —
the loaded value is retained for the read, so it cannot die mid-use — and
`none` from the first moment of the referent's death, *before* its `deinit`
body runs, so a destructor can never resurrect itself through a weak slot.
When the collector kills a strong cycle, weak fields pointing into that cycle
read `none` from the kill onward.

Build the back edge of every parent/child graph and every stored callback
that points at its owner as `weak`, and both sides get their `deinit`. The
slot's storage is a zeroing handle rather than the object, so weak fields are
invisible to reflection. `weak` is for instance fields of classes only — no
statics, no structs, no locals.

## Move

`move` transfers ownership of a value out of a binding instead of copying it.
`return move local` hands back the last reference rather than retaining. The
checker enforces use-after-move at compile time, so a moved binding cannot be
read again:

<!-- beans:expect-error -->
```beans
fn main() {
    var a: List<int> = [1, 2, 3]
    let b: List<int> = move a
    a.push(4)                    // error: use of moved value 'a'
}
```

A `var` can be moved out and then reassigned a fresh value before its next read.
Parameters, loop variables, match bindings, and closure captures are borrowed,
so they cannot be moved. See [Variables and constants](/guide/variables/) for
the full move, `move` parameter, and `inout` rules.

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
  it. Reach for it when a value has one clear owner and you just need it on the
  heap.
- `Arena<T>` is an append-only slab: `add(value)` returns a stable integer
  handle; `at`, `get`, `len`, and `clear` work on the region. `clear` keeps
  capacity but invalidates every old handle.

Passing a move-only handle to a function that only reads it needs no `move`,
because parameters borrow:

```beans
fn total(xs: List<int>) -> int {
    var sum: int = 0
    for x: int in xs { sum += x }
    return sum
}
```

## Shared ownership across threads

`Shared<T>` is the explicit thread-safe shared-ownership handle. `Weak<T>`
observes the same value without keeping it alive:

```beans
let shared: Shared<string> = new Shared("beans")
let weak: Weak<string> = shared.downgrade()
let live: Option<Shared<string>> = weak.upgrade()
let gone: bool = weak.is_expired()
```

`get()` returns a copy of the value. Copying a `Shared` handle adds another
strong owner, and the value lives until the last strong handle dies. `upgrade`
uses an atomic compare/exchange, so it can never revive a dead value.

The cycle collector does not trace through `Shared` control blocks, so a cycle
built from `Shared` values never drops on its own. Break it by making one side a
`Weak`. Use `Weak` the same way for a back-pointer (child to parent, observer to
subject) that must not keep its target alive.

`Shared<T>` and `Weak<T>` are `Send` and `Sync` only when `T` is both. Reach for
`Shared` when a value has no single obvious owner or must be handed to another
thread; use `Box<T>` when one owner is obvious, since it needs no atomic count.

## Send and Sync

Plain class references, `List`, `Map`, `Box`, `Arena`, `Bytes`, `File`, and
`MMap` are **not `Send`**: they are local reference values by default. Scalars,
immutable strings, `AtomicInt`, `Mutex`, a `Channel` of `Send` values, and
`Shared`/`Weak` of `Send + Sync` types can cross a thread boundary.
`thread.spawn` rejects a closure that captures or returns a non-`Send` value, so
you cannot silently race shared mutable data. Wrap it in a `Mutex` instead. See
[Concurrency](/guide/concurrency/).

## A complete program

`Shared` keeps a value alive while several places hold it; `Weak` watches it
without pinning it:

<!-- beans:compile -->
```beans
import std.io

class Cache {
    label: string
    fn init(label: string) { self.label = label }
    fn deinit() { io.println("drop {self.label}") }
}

fn main() {
    let strong: Shared<Cache> = new Shared(new Cache("db"))
    let observer: Weak<Cache> = strong.downgrade()

    match observer.upgrade() {
        some(live) => io.println("cache {live.get().label} still here"),
        none       => io.println("gone"),
    }

    io.println("expired {observer.is_expired()}")
}
```

The [ownership handles reference](/reference/builtins/handles/) lists every
method on these types.

---
title: Variables and constants
description: let and var, explicit types, move semantics, inout parameters, and move-only handles in Beans.
---

Beans has two ways to bind a name: `let` and `var`. **Every binding states its
type.** There is no type inference for `let`, `var`, parameters, fields, or loop
variables.

```beans
let x: int = 5              // cannot be reassigned
var total: decimal = 0.0    // can be reassigned
```

`let` means the *variable* cannot be rebound to a new value. The object it
points to can still change inside. Beans has no borrow checker and no `mut`
markers.

```beans
let xs: List<int> = [1, 2, 3]
xs.push(4)                  // fine: the list changes, the binding does not
// xs = [9]                 // error: cannot rebind a let
```

## Literals build values, not classes

Structs and collections have literal forms:

```beans
let point: Point = Point { x: 3, y: 4 }
let values: List<int> = [1, 2, 3]
let counts: Map<string, int> = {"beans": 2}
```

Classes never use field literals. Build them with `new Class(...)` so every
construction goes through `init`. See [Classes](/guide/classes/).

## Move

`move name` moves the value out of a local binding. The old binding cannot be
read again unless it is a `var` that gets a new value first:

```beans
var job: Job = next_job()
let running: Job = move job
job = next_job()                 // reinitializes it
```

The checker rejects use-after-move, and rejects a value moved on only one
branch (a move on every branch is fine). Normal parameters, loop variables,
match bindings, and closure captures are borrowed, so they cannot be moved.

## Parameters: borrow, move, inout

Parameters **borrow** by default. A `move` parameter owns its argument and drops
it at function exit unless the body moves it onward:

```beans
fn enqueue(move jobs: List<Job>) { /* ... */ }

var batch: List<Job> = make_batch()
enqueue(move batch)              // batch is moved in
```

A fresh result can be passed straight into a `move` parameter without the
keyword (`enqueue(make_batch())`); only an existing move-only local needs `move`.
Move modes must match across interface methods and overrides.

An `inout` parameter aliases one mutable caller local for the duration of the
call. It is not copy-in/copy-out:

```beans
fn swap(inout left: int, inout right: int) {
    let old: int = left
    left = right
    right = old
}

var a: int = 1
var b: int = 2
swap(inout a, inout b)
```

The caller must write `inout`, the argument must be a `var`, and the same local
cannot appear in two `inout` positions of one call. An `inout` parameter cannot
be captured by a closure.

## Move-only handles

Some values are **move-only outer handles**: binding, assigning, storing, or
returning them uses `move`, while function parameters and loop reads borrow by
default. `List`, `Map`, `OrderedMap`, `Box<T>`, and `Arena<T>` are move-only,
and so is any user type declared `unique class`:

```beans
unique class Packet {
    bytes: Bytes
}
```

A move-only value cannot be copied by binding, assignment, return, or storage;
use `move` to move it. A subclass of a move-only class is move-only too. This
controls the reference handle; fields inside the object still follow their own
rules.

`clone()` makes an independent copy of a collection, so changing the clone does
not change the original (it needs every stored type to implement `Clone`).

The full ownership model (reference counting, the cycle collector, `Shared`,
`Weak`, and `deinit`) is covered in [Memory and ownership](/guide/memory/).

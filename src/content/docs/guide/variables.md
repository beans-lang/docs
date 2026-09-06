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

## Constants

`let` and `var` are statements: they live inside a function. A named value that
belongs to the module is a `const`.

```beans
const TERMIOS_BYTES: int = 128
const O_NONBLOCK: i32 = 1 << 11
const GREETING: string = "hello"
pub const MAX_FRAME: int = 1 << 20      // pub, for a library package
```

A `const` has **no storage and no address**. The checker folds the initializer
once and writes that value at every use, so a constant costs exactly what typing
the literal there would cost — in the interpreter and in a native build alike.
It cannot be assigned to.

The type is written out, and it is a number, a `bool` or a `string`. There is no
composite constant: with no storage, there is nothing for a list or an object to
live in.

### What may appear in the initializer

A constant expression: literals; other constants, including ones declared
further down the file or in another package; unary `-`, `!`, `~`; and the binary
operators `+ - * / % & | ^ << >> && || == != < <= > >=`.

Anything else is refused with a message naming what was not constant — a call, a
local, a field read, an `as` cast, a `{}` piece in a string. `size_of`,
`align_of` and `offset_of` are **not** constant expressions either: they are
answered after layout, which runs later than the fold. A constant that names
itself, directly or through another constant, is refused.

Integer folding answers exactly what the same expression answers at run time.
Every result is narrowed to its own type, so `const X: i32 = 1 << 31` is `i32`'s
smallest value rather than an error. Division or modulo by zero, a shift count
outside `0..bits-1`, and dividing a signed minimum by `-1` are all refused.

`u64` is the one type the fold cannot carry whole. A `u64` value at or above
`2^63` may be declared and used like any other constant, but no operator may
fold with one — arithmetic, shifts and comparisons alike are refused, because
the fold computes in signed 64 bits and would otherwise answer with signed order
for a number the program never holds.

Floats and decimals fold a literal and a unary minus, and no arithmetic. The
compiler will not re-round a value the source did not write.

### Where a constant may stand

Anywhere a literal may stand, which includes match arms and annotation
arguments:

```beans
const LIMIT: int = 128

match n {
    LIMIT => { io.println("at the limit") }
    _ => { io.println("under it") }
}
```

It may also **size a fixed array**, in every position a type is written — a
local, a field, a parameter, a result, and nested inside another fixed array:

```beans
const SLOTS: int = 4

struct Row { cells: [int; SLOTS] }

fn widen(row: [int; SLOTS]) -> [[int; SLOTS]; 2] { return [row, row] }
```

A `const` **cannot** be a parameter default — write `fn f(n: int = 128)`, not
`= LIMIT`. A default is read while the signature holding it is lowered, and the
fold runs at the end of that stage, so the two positions differ. The refusal
says so where it is written.

### Reaching one from another package

Mark it `pub`, then reach it the way any name is reached: qualified through the
package, or selected on the import.

```beans
import std.io
import limits
import {SLOTS} from limits

let a: [int; limits.SLOTS] = [0, 0, 0, 0]
let b: [int; SLOTS] = [0, 0, 0, 0]
```

`const` is contextual. It is a declaration keyword only in `const <NAME>` at the
start of a module-level declaration, and stays an ordinary identifier everywhere
else.

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
and match bindings are borrowed, so they cannot be moved. Closure captures also
borrow by default; `fn() move(a, b) { ... }` explicitly moves named locals into
the closure.

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

---
title: Attributes and modifiers
description: Built-in Beans modifiers for visibility, OOP, layout, ownership, and CPU features.
---

Beans has custom [annotations](/guide/annotations/) for typed metadata and a
small set of built-in **declaration modifiers**. Modifiers are words that sit
before a declaration and change language behavior such as visibility, layout,
ownership, or CPU requirements. This page lists those modifiers.

## Visibility

- **`pub`** makes a declaration or field public outside its package. An
  unmarked name is visible only in its package.
- **`priv`** applies to a class or struct field or method. Only code inside the
  declaring type can access it, including when other code is in the same
  package. It works with static and `inout` methods. There is no `protected`
  visibility.

See [Source files and modules](/guide/modules/) for package visibility.

## Classes and methods

- **`abstract class`** declares a class that cannot be constructed. It may
  contain bodyless **`abstract fn`** methods.
- **`singleton class`** declares one eager instance, read as `Type.instance`.
- **`static`** declares a class field or a class/struct method owned by the
  type. Static members have no `self`.
- **`override`** is required when replacing a concrete or abstract base-class
  method, or an interface method that has a default body. It is optional for
  the first implementation of a bodyless interface requirement.
- A private method cannot be `abstract` or `override`, and an interface cannot
  declare one.

See [Classes](/guide/classes/) and
[Interfaces, abstract classes, and inheritance](/guide/interfaces/).

## C interop

- **`extern "C"`** declares a C-ABI entity: a struct, union, function, global,
  or thread-local. See [Foreign function interface](/guide/ffi/).
- **`opaque`** goes with `extern "C" opaque struct Handle` to declare an
  incomplete C type, valid only behind `RawPtr`.

## Layout modifiers

Two modifiers apply **only** to `extern "C"` structs and unions. A modifier that
moves bytes only means something against a fixed C layout, which is what
`extern "C"` promises:

- **`packed`** removes every byte of padding between fields.
- **`align(N)`** raises a record's alignment, or one field's. `N` must be a
  power of two, no larger than the target's maximum (4096).

```beans
pub extern "C" packed struct Header { kind: u8  length: u32  checksum: u32 }
extern "C" align(64) struct Counter { hits: u32 }
extern "C" struct Slot { tag: u8  align(16) payload: u64 }
```

Rules:

- Both names are contextual: `packed` only before `struct`/`union`, and `align`
  only when followed by `(`. A field or variable may still be named `packed` or
  `align`.
- `align(N)` on a field can only **raise** its alignment. A field `align(N)`
  inside a `packed` record is rejected, rather than letting one silently win over
  the other.
- Classes, interfaces, enums, and functions reject both by name.
- Semantics are C's, checked against Clang for every supported target.

## CPU features

- **`feature "name" fn`** marks a function body as allowed to use that CPU
  feature's instructions. Calling it, or storing it as a function value,
  requires the feature to be known present. See
  [Compile-time features](/guide/compile-time/).

```beans
feature "aes" fn mix_fast(seed: int) -> int { /* ... */ }
```

## Ownership

- **`unique`** goes with `unique class` to make a type a move-only outer handle.
  See [Variables and constants](/guide/variables/).
- **`move`** is a parameter mode that takes ownership of an argument. It is also
  the expression `move name`, which moves a value out of a binding.
- **`inout`** is a parameter mode that aliases a mutable caller local for the
  call. The caller writes `inout` at the call site and the argument must be a
  `var`.
- **`inout fn`** declares a mutating struct method. It gets mutable `self` and
  must be called on a `var` local. The caller does not write `inout` before the
  receiver.

## Modifier order

The standard order places visibility first, then the kind modifiers:
`pub unique class`, `pub abstract class`, `pub singleton class`, and
`pub extern "C" struct`. The C interop and layout modifiers stack in the same
chain: `pub extern "C" packed struct`.

Custom annotations can describe declarations, parameters, and locals, but they
do not add new language modifiers or replace rules such as `priv`, `abstract`,
`singleton`, or `extern "C"`. The [foreign function interface](/guide/ffi/)
page shows `extern "C"` and `opaque` in use, and
[structs and unions](/guide/structs/) shows the layout and method modifiers on
real records.

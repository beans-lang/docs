---
title: Builtins
description: What builtin types and functions Beans gives you, and where to read about each one.
---

A **builtin** is a type or function that the Beans compiler knows about on its own.
You do not import it. You do not write it. It is always there, ready to use. The
`int` type, the `string` type, `List`, `Option`, and the `panic` function are all
builtins.

This page lists every builtin and links to a page that explains it in full.

## Two layers

Beans builds its builtins in two ways. You do not need to think about this while
you write code, but it helps to know it once.

- Some builtins are implemented by the C runtime and reached through a fixed table (the
  "runtime ABI"). These are `string`, `Bytes`, `File`, `MMap`, and the `std.*`
  modules that talk to the operating system. You can see the table at
  [`src/expression.b`](https://github.com/beans-lang/beans/blob/main/src/expression.b).
- The rest are written into the compiler's own type checker and turned into
  machine code by the code generator. These are the generic types (`List`, `Map`,
  `Box`, `Atomic`, `RawPtr`, `Slice`, SIMD) and compile-time helpers like
  `size_of`. You can see the checker at
  [`src/expression.b`](https://github.com/beans-lang/beans/blob/main/src/expression.b).

The runtime ABI version for this compiler is `7`. The compiler reports version
`0.1.26` and the language contract is frozen at `1.0`.

## Error handling is builtin

Beans has no null and no exceptions. Instead it gives you three builtin types for
"maybe" and "failed" answers, and you will see them all over this reference:

- `Option<T>`: a value that may be missing.
- `Result<T, E>`: a value or an error.
- `Error`: the standard error class.

These, and the collection types like `List` and `Map`, are all builtin. Read
[Option, Result, and Error](/reference/builtins/option-result/) for the full story.

## All builtin pages

| Page | What it covers |
| --- | --- |
| [Primitive types](/reference/builtins/primitives/) | `unit`, `bool`, the integer and float types, `byte`, `string` |
| [Numbers and decimal](/reference/builtins/numbers/) | number rules, casts with `as`, and exact `decimal` math |
| [string](/reference/builtins/string/) | the `string` type and every method on it |
| [Bytes](/reference/builtins/bytes/) | the growable byte buffer `Bytes` |
| [Collections](/reference/builtins/collections/) | `List`, `Map`, and `OrderedMap` |
| [Option, Result, and Error](/reference/builtins/option-result/) | `Option`, `Result`, `Error`, `some`/`none`/`ok`/`err`, the `?` operator |
| [Ownership handles](/reference/builtins/handles/) | `Box`, `Arena`, `Shared`, `Weak`, `Mutex`, `Channel`, `Thread`, `AtomicInt` |
| [Atomics](/reference/builtins/atomics/) | `Atomic<T>` and `MemoryOrder` |
| [Files and mapping](/reference/builtins/files/) | `File`, `Dir`, `MMap` |
| [SIMD, arrays, and pointers](/reference/builtins/simd/) | `Simd{N}{elem}`, `[T; N]`, `Slice<T>`, `RawPtr<T>` |
| [Prelude functions](/reference/builtins/functions/) | `panic`, `size_of`/`align_of`/`offset_of`, printing |

## See also

- The [language guide](/guide/types/) explains how types, errors, memory, and the
  rest fit together.
- The [standard library reference](/reference/stdlib/) covers the modules you
  import with `import std.*`.

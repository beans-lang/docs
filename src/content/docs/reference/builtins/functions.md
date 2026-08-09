---
title: Prelude functions
description: The free functions Beans gives you everywhere, including panic, size_of, and how to print.
---

The **prelude** is the set of names available in every file without an import.
Besides the builtin types, it gives you a few free functions. This page covers
them. For the printing functions, which live in the `io` module, see the note
below and the [standard library reference](/reference/stdlib/).

## panic

`panic(message: string)` stops the program for an error you cannot recover from. It
reports the call location and your message, exits with status 3, and never returns.
It does **not** run defers.

```beans
panic("index out of range")
```

Use `panic` only for bugs that should never happen. For errors you can handle, use
[`Option` and `Result`](/reference/builtins/option-result/) instead.

## Compile-time layout functions

These three return a compile-time constant for the target you are building for.
They take a **type**, not a value, and give the layout of that type on the selected
target.

| Function | Returns | Meaning |
| --- | --- | --- |
| `size_of(Type)` | `int` | how many bytes a value of `Type` takes |
| `align_of(Type)` | `int` | the alignment of `Type` |
| `offset_of(Type, field)` | `int` | the byte offset of `field` inside `Type` |

```beans
let s: int = size_of(i32)
let a: int = align_of(f64)
let o: int = offset_of(Point, x)
```

Rules:

- These take a type in a contextual form, not a runtime value.
- They are rejected on type parameters, and on `Option`, `Result`, and user enums,
  because those have no single layout.
- `offset_of` needs a struct or union type and a real field name.

See [compile-time](/guide/compile-time/) for more on constants known at build time.

## Printing

Printing is done with the `io` module, so you import it and call `io.println`:

```beans
import std.io

fn main() {
    io.println("hello")
}
```

The four printing functions are:

- `io.println` — print a line to standard output
- `io.print` — print without a newline
- `io.eprintln` — print a line to standard error
- `io.eprint` — print to standard error without a newline

What can print:

- numbers, bools, and strings
- enums, shown as `variant` or `variant(payload)`
- lists of printable things, shown as `[a, b, c]`

What cannot print directly:

- `Map` values and class instances do not print; give them a string form of your
  own.
- `Result` is not printable; `match` on it instead.

## See also

- [Option, Result, and Error](/reference/builtins/option-result/) — `panic` alongside error handling.
- [Compile-time](/guide/compile-time/) — build-time constants.
- [The standard library reference](/reference/stdlib/) — the `io` module and other `std.*` functions.

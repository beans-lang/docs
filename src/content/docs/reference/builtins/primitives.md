---
title: Primitive types
description: The basic built-in types in Beans, from unit and bool to integers, floats, byte, and string.
---

A **primitive type** is the smallest kind of value Beans has. It is not made of
other values. Every primitive is stored directly (unboxed) in the generated code,
so it is cheap to use.

Every binding states its type. For example:

```beans
let x: int = 5
let ok: bool = true
let name: string = "beans"
```

## The types

| Type | What it holds | Size |
| --- | --- | --- |
| `unit` | nothing; the empty value | 0 bytes |
| `bool` | `true` or `false` | 1 byte |
| `int` | 64-bit signed whole number | 8 bytes |
| `i8` `i16` `i32` `i64` | fixed-width signed whole numbers | 1, 2, 4, 8 bytes |
| `uint` | 64-bit unsigned whole number (the word type) | 8 bytes |
| `u8` `u16` `u32` `u64` | fixed-width unsigned whole numbers | 1, 2, 4, 8 bytes |
| `byte` | another name for `u8` | 1 byte |
| `float` | 64-bit IEEE double | 8 bytes |
| `f32` `f64` | fixed-width floats | 4, 8 bytes |
| `decimal` | base-10 exact number | 32 bytes, align 16 |
| `string` | immutable UTF-8 text | — |

## Names to know

- `int` is the canonical form of `i64`. When you write `int` you get a signed
  64-bit whole number.
- `float` is the same as `f64`.
- `byte` is the same as `u8`.
- `uint` and `int` are the **word types**. Beans has no `usize` or `isize`; use
  `int` for signed word-sized numbers and `uint` for unsigned ones.

## unit

`unit` is the empty value. It takes 0 bytes. A function that returns nothing
returns `unit`. You rarely write it by hand.

## bool

`bool` is `true` or `false`, one byte.

## decimal

`decimal` is a base-10 exact number. Use it for money, where rounding errors are
not allowed. It takes 32 bytes and aligns to 16.

`decimal` is only present on targets that support it. It is refused on
`thumbv7em-none-eabi` and `riscv32-unknown-none-elf`. Read
[Numbers and decimal](/reference/builtins/numbers/) for the rules.

## string

`string` is immutable UTF-8 text. Once made, it does not change. See
[string](/reference/builtins/string/) for every method. For a growable, changeable
byte buffer, see [Bytes](/reference/builtins/bytes/).

## Everything has methods

Even a literal number or string has methods. You can call a method right on a
literal:

```beans
let a: int = (-5).abs()
let b: float = 3.7.round()
let c: Result<int> = "42".to_int()
```

## See also

- [Numbers and decimal](/reference/builtins/numbers/) — number rules and casts.
- [The type system](/guide/types/) in the language guide.

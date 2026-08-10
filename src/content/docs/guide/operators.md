---
title: Operators and precedence
description: The operators Beans has, their precedence, and the rules for casts, error propagation, and assignment.
---

This page lists every operator and how tightly it binds.

## Binary operator precedence

Precedence climbs from loosest (1) to tightest (10). Higher numbers bind
tighter, so `a + b * c` parses as `a + (b * c)`.

| Level | Operators | Meaning |
|---|---|---|
| 1 | `..`  `..=`  `\|\|` | ranges (exclusive / inclusive), logical OR |
| 2 | `&&` | logical AND |
| 3 | `==`  `!=` | equality |
| 4 | `<`  `<=`  `>`  `>=` | comparison |
| 5 | `\|` | bitwise OR |
| 6 | `^` | bitwise XOR |
| 7 | `&` | bitwise AND |
| 8 | `<<`  `>>` | shifts |
| 9 | `+`  `-` | add, subtract |
| 10 | `*`  `/`  `%` | multiply, divide, remainder |

Ranges (`0..10`, `0..=10`) sit at the lowest level, alongside `||`. Use them in
`for i: int in 0..10` and in `match` arms (`400..=499 => ...`).

## Unary and postfix

- Unary `-` (negate) and `!` (logical not).
- Postfix `.field` / `.method(...)`, `[index]`, and call `(...)`.
- `?` propagates errors on a `Result`/`Option`. On `err`/`none` it returns up;
  otherwise it unwraps. See [Option and Result](/guide/errors/).
- `as` is an explicit numeric cast or upcast: `qty as decimal`.
- `as?` is a checked downcast returning an `Option`. See
  [Interfaces and inheritance](/guide/interfaces/).

Postfix, `as`, `as?`, and `?` bind tighter than the binary operators above.

## Assignment

Assignment is a statement, not part of the precedence climb:

```text
=   +=   -=   *=   /=   %=
```

```beans
var n: int = 1
n += 4
n *= 2       // n is now 10
```

Bracket assignment works on lists, maps, and fixed arrays: `xs[i] = v`,
`m[key] = v`. List and Map bracket assignment has no compound form (no
`xs[i] += 1`); fixed arrays do support compound element assignment, because
their element is a real inline place.

## Number and comparison rules

- Fixed-width integer `+`, `-`, `*`, unary `-`, and the bit operations wrap to
  the type's width. Shift counts are masked by `width - 1`. Divide or modulo by
  zero panics.
- There are **no implicit numeric conversions**. Mixing `int`, `float`, and
  `decimal` needs an explicit `as`.
- Float comparisons follow IEEE-754: a NaN operand makes `==`, `<`, `<=`, `>`,
  `>=` false and `!=` true.

See [Numbers and decimal](/reference/builtins/numbers/).

## No operators for these

- **No `+` on strings.** Build strings with interpolation (`"a {b} c"`),
  [`std.fmt`](/reference/stdlib/fmt/), or `list.join(sep)`.
- **No `++` / `--`.** Use `+= 1` / `-= 1`.
- **No ternary.** Use `if`/`match` in value position (see
  [Control flow](/guide/control-flow/)).

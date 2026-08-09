---
title: Enums
description: User-defined enums in Beans — variants, payloads, methods, and matching.
---

An enum is a type with a fixed set of named **variants**. Variant names are
snake_case, and a variant may carry a payload. Enums are built for
[`match`](/guide/pattern-matching/).

```beans
enum Status {
    active
    suspended
    closed
}
```

## Payloads

A variant can carry named fields:

```beans
enum Payment {
    cash
    card(number: string)
    transfer(iban: string, amount: decimal)
}

fn describe(p: Payment) -> string {
    return match p {
        cash => "cash",
        card(n) => "card ending {n.last(4)}",
        transfer(iban, amt) => "sent {amt} to {iban}",
    }
}
```

Matching binds the payload fields positionally (`card(n)`), and the matched
value pins their types — you do not restate them.

## Methods

Enums are objects too. They can carry methods, with an implicit `self`:

```beans
enum Level {
    low
    high

    fn label() -> string {
        return match self {
            low => "low",
            high => "high",
        }
    }
}
```

## Option and Result are builtin enums

`Option<T>` and `Result<T, E>` are ordinary builtin enums:

```beans
enum Option<T> {
    some(value: T)
    none
}

enum Result<T, E> {
    ok(value: T)
    err(error: E)
}
```

That is why `some`, `none`, `ok`, and `err` are lowercase — they are variant
values, and variants are snake_case. See [Option and Result](/guide/errors/).

## Next

- [Pattern matching](/guide/pattern-matching/)
- [Option and Result](/guide/errors/)
- [Generics](/guide/generics/)

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).

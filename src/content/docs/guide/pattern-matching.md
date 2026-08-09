---
title: Pattern matching
description: match in Beans — variants, literals, ranges, or-patterns, wildcards, and block arms.
---

`match` chooses an arm based on the shape of a value. Each arm is
`pattern => result`.

```beans
let label: string = match code {
    200        => "ok",
    301 | 302  => "moved",
    400..=499  => "client bug",
    _          => "who knows",
}
```

Patterns can be:

- a **literal** (`200`),
- an **or-pattern** joining several (`301 | 302`),
- a **range** (`400..=499` inclusive, `0..10` exclusive),
- a **wildcard** `_` that matches anything.

## Matching enum variants

Matching on an enum binds its payload. The matched value pins the types, so you
do not restate them:

```beans
enum Payment {
    cash
    card(number: string)
    transfer(iban: string, amount: decimal)
}

let text: string = match p {
    cash => "cash",
    card(n) => "card ending {n.last(4)}",
    transfer(iban, amt) => "sent {amt} to {iban}",
}
```

`Option` and `Result` match the same way:

```beans
match parse_age(input) {
    ok(n)  => io.println("age {n}"),
    err(e) => io.println("bad: {e.msg}"),
}
```

If you want to name a payload's type explicitly, you may: `some(u: User) =>`.

## Value position vs statement position

Like `if`, `match` has two positions:

- **Value position:** each arm is exactly one expression, and the whole `match`
  is that value. A block arm here is an error.
- **Statement position:** arms may be blocks — several statements, no value:

```beans
match ch.receive() {
    some(v) => {
        total += v
        io.println("got {v}")
    }
    none => { break }
}
```

The `{` must follow `=>` on the same line. A corner case: a map literal used as
an arm *value* needs parentheses, `x => ({"a": 1})`.

## as? in a match

The [`as?`](/guide/interfaces/) downcast returns an `Option`, so it pairs
naturally with `match`:

```beans
match shape as? Circle {
    some(c) => io.println("circle r={c.r}"),
    none    => io.println("not a circle"),
}
```

## Next

- [Enums](/guide/enums/)
- [Option and Result](/guide/errors/)
- [Control flow](/guide/control-flow/)

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).

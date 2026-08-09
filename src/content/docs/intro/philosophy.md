---
title: Language philosophy
description: The design rules Beans follows and the reasoning behind them, including why Option and some are cased the way they are.
---

Beans is opinionated. It follows a short list of design rules, and every
feature has to earn its place against them. If you know these rules, most of
the language stops being surprising.

## The design rules

### 1. Small grammar

Every keyword must remove more complexity than it adds. Beans keeps its grammar
about the size of Go's on purpose. A feature that only saves a little typing but
adds a new thing to learn does not get in.

### 2. Everything is an object

You can call methods on any value, even primitives. `5.abs()` works. Under the
hood primitives are unboxed, so this costs nothing at run time — you get the
clean object model without the overhead.

### 3. No null, no exceptions

There is no `null` and there are no exceptions anywhere in the language. A value
that might be missing has type `Option<T>`. An operation that might fail returns
`Result<T>`. Both are ordinary values you handle in the open, so there is no
hidden control flow jumping out of your code.

### 4. Every new name states its type

There is no type inference on `let`, `var`, function parameters, fields, or loop
variables. You write the type. This keeps code readable without needing an
editor to tell you what things are.

There is one exception: **match bindings**. In a `match`, the value being
matched already pins the type, so the binding does not repeat it.

```beans
match find_user(id) {
    some(u) => io.println(u.name),  // u's type comes from the match
    none    => io.println("not found"),
}
```

### 5. One casing rule

- `snake_case` for functions, methods, variables, packages, and enum variants.
- `PascalCase` for types.
- `lowercase` for primitives (`int`, `bool`, `decimal`, `string`).

The casing tells you what a name is before you read anything else.

### 6. Private by default

Classes, interfaces, enums, functions, methods, and fields are all private
unless you say otherwise. `pub` is the only way to expose something outside its
package. You never leak API by accident.

### 7. If two designs work, pick the one with less syntax

When two designs both do the job, Beans takes the one that reads with fewer
symbols. This is the tie-breaker behind many small choices.

## Why `Option` is capitalized but `some` is not

This trips people up at first, so it is worth stating plainly.

The casing rule (rule 5) does all the work here:

- `PascalCase` means a **type**. `Option<User>` is a type.
- `snake_case` means a **value**. `some(u)` is a value.

`Option` and `Result` are not special syntax — they are just built-in enums.
And Beans enum variants are `snake_case` (rule 5). So the variants are
`some`, `none`, `ok`, and `err`, all lowercase.

```beans
let found: Option<User> = some(user)   // Option = type, some = value
let missing: Option<User> = none
```

This is different from Rust, where the variants are `Some` and `Ok`. Beans is
being consistent with its own casing rule, not copying Rust.

## Where to go next

- [Goals and non-goals](/intro/goals/) — the things Beans deliberately does not have.
- [Option and Result](/guide/errors/) — how to use them day to day.
- [What Beans is](/intro/what-is-beans/) — the short overview.

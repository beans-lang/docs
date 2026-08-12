---
title: Language philosophy
description: The design rules Beans follows and the reasoning behind them, including why Option and some are cased the way they are.
---

Beans is opinionated. It follows a short list of design rules, and every feature
has to earn its place against them. Once you know these rules, most of the
language stops being surprising.

## The design rules

### 1. Small grammar

Every keyword must remove more complexity than it adds. The grammar is kept small
on purpose. A feature that only saves a little typing but adds a new thing to
learn does not get in.

### 2. Everything is an object

You can call methods on any value, even primitives. `5.abs()` works. Primitives
are unboxed underneath, so this costs nothing at run time.

### 3. No null, no exceptions

There is no `null` and there are no exceptions anywhere in the language. A value
that might be missing has type `Option<T>`. An operation that might fail returns
`Result<T>`. Both are ordinary values you handle in the open, so no control flow
jumps out of your code without warning.

### 4. Every new name states its type

There is no type inference on `let`, `var`, function parameters, fields, or loop
variables. You write the type. Code stays readable without an editor to tell you
what things are.

There is one exception: match bindings. In a `match`, the value being matched
already pins the type, so the binding does not repeat it.

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

### 6. Package-private by default

Classes, interfaces, enums, functions, methods, and fields stay inside their
package unless you mark them `pub`, so you do not leak API by accident. A field
or method that must stay inside its own declaring type uses `priv`; same-package
code and subclasses still cannot access it.

### 7. If two designs work, pick the one with less syntax

When two designs both do the job, Beans takes the one that reads with fewer
symbols. That tie-breaker is behind many small choices.

## Why `Option` is capitalized but `some` is not

The casing rule (rule 5) does all the work here:

- `PascalCase` means a type. `Option<User>` is a type.
- `snake_case` means a value. `some(u)` is a value.

`Option` and `Result` are not special syntax. They are built-in enums, and enum
variants are `snake_case`, so the variants are `some`, `none`, `ok`, and `err`,
all lowercase.

```beans
let found: Option<User> = some(user)   // Option = type, some = value
let missing: Option<User> = none
```

For how to use them day to day, see [Option and Result](/guide/errors/). The
[goals and non-goals](/intro/goals/) page lists what Beans deliberately leaves
out.

---
title: Source files and modules
description: How Beans source files, packages, and modules fit together, and the lexical rules of the language.
---

Beans source files end in `.b`. This page explains how files group into
packages and modules, and the small set of lexical rules the language uses.

## The package clause

Every `.b` file the compiler loads as a package starts with a `package` clause,
before any import or declaration:

```beans
package main

import std.io

fn main() {
    io.println("hi")
}
```

```beans
package money

pub class Money {
    // ...
}
```

Rules:

- Exactly one `package` clause, at the top of the file.
- Every file in one directory declares the **same** package name.
- The name is a lowercase snake_case identifier.
- An application's root package is `main` and must have `fn main()`. A library
  root uses a normal name and has no `main`.
- A single file with no `beans.pot` next to it may leave the clause out, or
  write `package main`.

The name need not match the directory. `shop/transport_v2/` may declare
`package transport`; the import path stays `shop.transport_v2`. See
[Imports and packages](/guide/imports/) for the difference between a package's
name, its import path, and the local binding you use.

## One folder is one package

Every `.b` file in a directory belongs to the same package. Files in one package
share everything and need **no import between them** — a function in `a.b` can
call one in `b.b` directly, as long as both declare the same `package`.

<!-- beans:fragment -->
```beans
// file: shop/main.b
package main
fn main() { greet() }
```

```beans
// file: shop/helpers.b
package main
fn greet() { io.println("hi") }   // visible to main.b, no import needed
```

A declaration name is claimed once per package, whichever file writes it. Two
classes named `Cart` in one package are a duplicate error.

## Modules

A **module** is a directory tree with a `beans.pot` file at its root. That file
names the module and lists its dependencies:

```beans-pot
module shop
kind application
```

`kind` is `application` (the default) or `library`. An application is built or
run as a program and needs `fn main()`. A library has no `main` and exposes its
API with `pub`.

Subdirectories under the module root are sub-packages. `shop/money/` is imported
as `import shop.money`. See [The beans.pot manifest](/pot/manifest/) and
[Local packages and imports](/pot/local-packages/) for the full rules.

## Visibility: private by default

Everything — classes, interfaces, enums, functions, methods, and fields — is
**private** unless marked `pub`. `pub` is the only way to expose a name outside
its package. Private means the same import path, not the same package name.

```beans
package money

pub class Money {       // usable from other packages
    pub amount: decimal // public field
    currency: string    // private field
}

fn round_rule() {}      // private helper
```

## Lexical rules

- **No semicolons.** A newline ends a statement, Go-style (only after a token
  that can end one). A consequence: `} else {` must be on one line.
- **Comments:** `//` for a line, `/* ... */` for a block (blocks may nest).
- **No parentheses around conditions:** `if x > 3 { }`. Braces are always
  required.
- **Number literals** may use `_` separators (`1_000_000`), hex (`0xFF`), and
  binary (`0b1010`).
- **Strings** are `"..."`, immutable, UTF-8, with `{}` interpolation. There is
  no `+` on strings. See [String](/reference/builtins/string/).

## Keywords

```text
class struct union interface enum fn let var pub override
if else for in match return break continue move inout
import as defer unsafe extern new extends implements static
self true false unique
```

`some`, `none`, `ok`, and `err` are ordinary prelude names, not keywords.
`super` is contextual. `async`, `await`, and `package` are contextual too:
`async` means something only right before `fn`, `await` only inside an async
body, and `package` only as `package <name>` at the top of a file — so all three
stay usable as ordinary identifiers elsewhere.

## Next

- [Imports and packages](/guide/imports/)
- [Variables and constants](/guide/variables/)
- [POT package management](/pot/why-pot/)

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).

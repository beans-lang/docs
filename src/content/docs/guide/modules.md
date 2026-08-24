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
share everything and need **no import between them**. A function in `a.b` can
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
run as a program and needs `fn main()`. A library has no `main`, rejects one if
you write it, and exposes its API with `pub`.

Subdirectories under the module root are sub-packages. `shop/money/` is imported
as `import shop.money`. See [The beans.pot manifest](/pot/manifest/) and
[Local packages and imports](/pot/local-packages/) for the full rules.

## Visibility: package-private by default

Classes, interfaces, enums, functions, methods, and fields are
**package-private** unless marked `pub`. `pub` is the only way to expose a name
outside its package. Package-private means the same import path, not merely the
same package name written in source.

Fields and methods have one stricter option: `priv` makes a member visible only
inside the class or struct that declares it. A peer type, subclass, or free
function cannot access that member, even from the same package.

```beans
package money

pub class Money {       // usable from other packages
    pub amount: decimal // public field
    currency: string    // visible inside package money
    priv checksum: int  // visible only inside Money

    priv fn valid_checksum() -> bool { return self.checksum >= 0 }
}

fn round_rule() {}      // package-private helper
```

## Lexical rules

- **No semicolons.** A newline ends a statement (only after a token that can end
  one). Because of that, `} else {` must sit on one line.
- **Method chains span lines.** A chain may break after a trailing `.` (a dot
  can never end a statement) or before a leading `.name` (a newline is not a
  terminator when the next line begins a member access). `..` stays a range
  operator and never continues a line.

  ```beans
  let total: int = View.make("root")
      .pad(2)
      .child(View.make("leaf"))
      .depth()
  ```
- **Comments:** `//` for a line, `/* ... */` for a block (blocks may nest).
- **No parentheses around conditions:** `if x > 3 { }`. Braces are always
  required.
- **Number literals** may use `_` separators (`1_000_000`), hex (`0xFF`), and
  binary (`0b1010`).
- **Strings** are `"..."`, immutable, UTF-8, with `{}` interpolation. There is
  no `+` on strings. See [String](/reference/builtins/string/).

## Keywords

```text
class struct union interface enum fn let var pub priv override
if else for in match return break continue move inout
import as defer unsafe extern new extends implements static
self true false unique abstract singleton
```

`some`, `none`, `ok`, and `err` are ordinary prelude names, not keywords.
`super` is contextual. `priv`, `abstract`, `singleton`, and
`package` are contextual too. They take their special meaning only in the
matching field, class, function, or package position and stay usable as normal
identifiers elsewhere.

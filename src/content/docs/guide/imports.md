---
title: Imports and packages
description: How imports work in Beans, and the four separate ideas — module path, import path, package name, and import binding.
---

Beans imports are Go-style: the standard library by dot path, local packages by
module path, and remote libraries straight from a Git host.

```beans
import std.io
import std.thread
import shop.util                     // <root>/util/*.b, used as util.thing
import shop.money.fx                 // nested: <root>/money/fx/
import github.com/acme/http          // cloned on first build
import gitlab.com/tools/csv as csvlib
```

## Four separate ideas

It pays to keep these apart:

| Idea | Example | What it is |
|---|---|---|
| module path | `shop` | the `beans.pot` unit — one dependency, one lock row |
| import path | `shop.money` | a package's globally unique identity |
| package name | `money` | what the package calls itself in its `package` clause |
| import binding | `cash` in `import shop.money as cash` | a name, in one file only |

The **binding** is the name you actually write to reach the package. By default
it is the package's declared name (not the last path segment). `import
shop.transport_v2` binds `transport` when that directory declares `package
transport`. Use `as` to override it.

## Using imported names

Reach anything marked `pub` in the imported package by qualifying it with the
binding:

```beans
util.some_fn()
let u: util.User = new util.User("jul")
util.color.red
```

The methods of a `pub interface` travel with it — an interface is its method
set. `pub fn init(...)` is what lets another package write `new Conn(...)`.

## Bindings are per file

An import belongs to the file that wrote it. Two files of one package may give
the same alias to different packages, and an import in one file qualifies
nothing in its siblings. Two imports with the same local name in one file are an
error; separate them with `as`.

## Package identity

A package's identity is its whole import path. Two packages may freely share a
declared name, and two paths may share a final segment. `a/cart` and `b/cart`
both call themselves `cart`; give the imports different local names and both
work:

```beans
import shop.a.cart as retail
import shop.b.cart as wholesale

let a: retail.Cart = new retail.Cart()
let b: wholesale.Cart = new wholesale.Cart()
```

They stay separate everywhere — separate types, separate private methods,
separate generated symbols.

## No cycles

Packages form a directed graph. A package importing itself, or a cycle through
several packages, is refused with the whole chain:

```text
package import cycle:
  shop.a imports shop.b at a/a.b:3
  shop.b imports shop.c at b/b.b:2
  shop.c imports shop.a at c/c.b:4
```

Files of one package create no edges between each other, so mutually recursive
functions in one package are fine. A diamond is acyclic and loads its shared
dependency once.

## Where imports resolve

- `std.*` resolves to the shipped standard library.
- `<module>` or `<module>.<...>` resolves to a local package under your module
  root.
- `host/owner/repo[/sub...]` (a first segment containing a `.`, at least three
  segments) resolves to a Git dependency, cloned and cached on first build.

Without a `beans.pot` above your file, you are in single-file mode: `std.*` and
Git imports still work, but local packages do not.

## Next

- [POT package management](/pot/why-pot/) — the manifest, dependencies, and the lock file
- [Local packages and imports](/pot/local-packages/)
- [Standard library reference](/reference/stdlib/)

Source: [`compiler/beans/module.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/module.b).

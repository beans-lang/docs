---
title: Local packages and imports
description: One folder is one package, how sub-packages and import paths resolve, and single-file mode.
---

Most of your own code lives in **local packages** under your module root. The
rules are small and consistent. Resolution is done in
[`compiler/beans/module.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/module.b).

## One directory, one package

A directory is a package. Every `.b` file in that directory declares the same
`package` clause, written in `snake_case`:

```beans
package money
```

Files of the same package do **not** import each other. They already share one
namespace. You only import to reach a *different* package.

## Sub-packages

Sub-packages are subdirectories under the module root. A directory
`shop/money/` becomes the import path `shop.money`:

<!-- beans:fragment -->
```beans
import shop.money

fn main() {
    let m: Money = money.zero()
}
```

Note two things:

- You use the package by its **declared** package name (`money`), not the last
  path segment. Usually they match, but they do not have to.
- You can rename the binding for one file with `as`:

  ```beans
  import shop.money as cash
  ```

## How an import path resolves

When you write `import X`, Beans decides what `X` is by its shape:

| Shape of `X` | Resolves to |
| --- | --- |
| `std.*` | The shipped standard library. |
| `<module_name>` or `<module_name>.<...>` | A local package under your module root. |
| `host/owner/repo[/sub...]` (first segment has a `.`, three or more segments) | A [Git dependency](/pot/dependencies/) cloned to the cache. |
| anything else | An error. |

When an import matches none of these shapes, Beans reports it as an unknown
package and lists what it expected: `std.*`, `<module>.*`, or a git host path.

## Identity is the whole path

A package's identity is its **full import path**, not its declared name. Two
packages may call themselves the same name as long as their import paths
differ. For example `shop.a.cart` and `shop.b.cart` can both use
`package cart`, and they stay distinct packages.

Import cycles are refused. When packages import each other in a loop, Beans
prints the full chain of import sites so you can see the cycle.

## Reaching across packages

From another package you can reach anything marked `pub` on the imported
package: functions and types. To use `new` on a class, both the class and its
`init` must be `pub`. A plain `fn init` remains usable throughout its own
package.

<!-- beans:fragment -->
```beans
import shop.util

fn main() {
    util.some_fn()
    let u: util.User = new util.User("ada")
    let name: string = u.name
}
```

## Single-file mode

If there is **no `beans.pot` above a lone file**, you are in single-file mode.
You can still import `std.*` and Git dependencies, but you cannot use local
packages, because there is no module root to hang them off of.

The [imports guide](/guide/imports/) covers imports in everyday code, and
[a local-package project](/examples/shop/) works through a full example.

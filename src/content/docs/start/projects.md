---
title: Create and run a project
description: Set up a Beans project with a beans.pot manifest, a main package, and sub-packages.
---

A single `.b` file is fine for a quick test. A real program is a **project**:
a folder tree with a manifest at its root. This page shows how one is laid out
and how to run it.

## What makes a project

A module is a directory tree with a file named `beans.pot` at its root. That
file is the manifest. It names your module. (The name POT is a pun; see
[Why it is called POT](/pot/why-pot/).)

The smallest manifest just names the module:

```beans-pot
module shop
```

## The main package

An application's root package is `package main`, and it needs an `fn main()`,
the entry point. A minimal project looks like this:

```text
myapp/
  beans.pot
  main.b
```

`beans.pot`:

```beans-pot
module myapp
```

`main.b`:

```beans
package main

import std.io

fn main() {
    io.println("hello from myapp")
}
```

## One folder is one package

The rule is simple: **one folder = one package.** Every `.b` file in a folder
shares that package. Files in the same folder do not import each other; they
already see each other's names.

So you can split `main` across files:

```text
myapp/
  beans.pot
  main.b       package main
  helpers.b    package main   (same package, no import needed)
```

## Sub-folders are sub-packages

A sub-folder is a separate, importable package. If you have:

```text
shop/
  beans.pot
  main.b
  money/
    money.b    package money
```

then `main.b` imports the sub-package by its path and uses it by its name:

<!-- beans:fragment -->
```beans
package main

import shop.money

fn main() {
    let m: money.Money = new money.Money(19.99)
}
```

The import path is `shop.money`. Inside code you use it as `money.thing`,
because the package calls itself `money` in its `package` clause.

## Running a project

Point `beansc run` at the file with `fn main()`. For the bundled multi-package
example:

```bash
beansc run examples/shop/main.b
```

`beansc` finds the `beans.pot` above that file, resolves every package in the
module, and runs it.

## Single-file mode

Without a `beans.pot`, a lone `.b` file runs in **single-file mode**. Standard
library imports (`std.io`) and Git imports still work. Local packages do not,
because there is no module for them to belong to. As soon as you want more than
one package, add a `beans.pot`.

For every manifest field, see [the beans.pot manifest](/pot/manifest/). For a
full three-package project walked through end to end, see [the shop
example](/examples/shop/).

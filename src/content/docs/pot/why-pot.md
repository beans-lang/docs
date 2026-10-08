---
title: Why it is called POT
description: What POT is, why the name, and the four ideas you need to keep apart when you work with packages.
---

POT is the package manager built into Beans. It works on a file named
`beans.pot` that sits at the root of your project. That file is the manifest:
it names your module and lists the Git dependencies you pull in.

## Where the name comes from

POT is not an acronym. The name is a joke about a **pot of beans**. The manifest
file is `beans.pot`, and the package command is `beansc pot`.

Type a command Beans does not have, like `mod`, and it says so plainly:

```text
error: 'mod' is not a Beans command; use 'beansc pot tidy' or 'beansc pot update'
```

## Four ideas to keep apart

The table below distinguishes module paths, import paths, package names, and
import bindings.

| Idea | Example | What it is |
| --- | --- | --- |
| module path | `shop` | The unit `beans.pot` names. One dependency, one row in the lock file. |
| import path | `shop.money` | A package's globally unique identity. No two packages share one. |
| package name | `money` | What a package calls itself in its `package` clause. |
| import binding | `cash` | A local name for an import, alive in one file only. |

Put together, a line like this uses three of them at once:

```beans
import shop.money as cash
```

Here `shop.money` is the import path, and `cash` is the import binding you use
in this one file. The package itself still calls itself `money` in its
`package` clause; you just chose to call it `cash` here.

The [beans.pot manifest](/pot/manifest/) page covers every field, and the
[imports guide](/guide/imports/) shows how imports work in day-to-day code.

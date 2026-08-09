---
title: Why it is called POT
description: What POT is, why the name, and the four ideas you need to keep apart when you work with packages.
---

POT is the package manager built into Beans. It works on a file named
`beans.pot` that sits at the root of your project. That file is the manifest:
it names your module and lists the Git dependencies you pull in. If you have
used other languages, `beans.pot` is Beans' answer to `Cargo.toml` or `go.mod`.

## The name is a pun, not an acronym

POT does not stand for anything. There is no hidden expansion in the source,
the README, the spec, or these docs. The name is a joke on the project's own
name: Beans keeps its packages in a **pot of beans**. The manifest file is
`beans.pot`, and the command that works on it is `beansc pot`.

If you come from Go and type the command you would type there, Beans tells you
plainly:

```text
error: 'mod' is not a Beans command; use 'beansc pot tidy' or 'beansc pot update'
```

## Four ideas to keep apart

Package talk gets confusing because people use one word for four different
things. Beans keeps them separate. Learn these four and the rest of POT reads
easily.

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

## Where to go next

- [The beans.pot manifest](/pot/manifest/) — every field and how to write it.
- [Dependencies and the lock file](/pot/dependencies/) — Git pins, `require`,
  and `beans.lock`.
- [Local packages and imports](/pot/local-packages/) — one folder, one package,
  and how import paths resolve.
- [Reproducible builds](/pot/reproducible/) — the content-addressed cache,
  `--locked`, and `--offline`.
- [The pot command reference](/pot/commands/) — `tidy` and `update`.

See also the [imports guide](/guide/imports/) for how imports work in day-to-day
code.

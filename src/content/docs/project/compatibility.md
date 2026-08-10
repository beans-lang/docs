---
title: Compatibility
description: The compatibility promise, the runtime ABI, how to pin, and Git as the dependency source.
---

This page is about what stays stable, what may move, and how you hold a project
still while the language is still before 1.0.

## The promise, before and after 1.0

- **Before 1.0** (the current `0.1.x` line): the language, standard library,
  CLI, module format, and ABI may change between minor releases. Treat each
  minor release as a possible break.
- **After 1.0**: a breaking public change needs a new major version. The current
  and previous minor lines both get fixes.

See [Versioning](/project/versioning/) for how the numbers are assigned.

## The runtime ABI

The runtime ABI has its own number (`runtime_abi_version = 4`). It changes
whenever compiler-generated code and the shipped runtime stop being compatible.
If you mix a compiler and a runtime with different ABI numbers, they do not fit
together. Staying on one installed release keeps them matched.

## How to pin

For any project you care about, pin two things:

1. **The compiler.** Install one release and keep it. Do not float on
   `upgrade` mid-project.
2. **`beans.lock`.** Commit it. It records the exact commit and tree of every
   dependency. See [Dependencies and the lock file](/pot/dependencies/).

Then build with the strict flags so nothing drifts under you:

```bash
beansc build --locked --offline app.b -o app
```

`--locked` rejects a missing, stale, or changed lock; `--offline` forbids
dependency network access and accepts only a cached tree matching the lock. See
[Reproducible builds](/pot/reproducible/).

## Git is the dependency source

Beans dependencies come from Git, and that stays true for v1: there is no
central registry required. A dependency is a `host/owner/repo` path plus a ref
in [`beans.pot`](/pot/manifest/), resolved to an exact commit and tree in
`beans.lock`. Because the source is Git and the lock is exact, you do not depend
on a package server staying up.

See [Maturity and platforms](/intro/maturity/) for the wider status.

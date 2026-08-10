---
title: The pot command reference
description: The beansc pot subcommands, and where --locked and --offline apply.
---

The `beansc pot` command works on your project's dependencies and
[`beans.lock`](/pot/dependencies/). There are two subcommands.

```text
beansc pot <tidy|update [dependency]>
```

## `beansc pot tidy`

Resolves the dependencies your code actually uses and writes `beans.lock`.

```bash
beansc pot tidy
```

Use it after you add or remove `require` lines in
[`beans.pot`](/pot/manifest/), to bring the lock in line with what you import.

## `beansc pot update`

Refreshes locked dependencies to the newest commit their ref allows, and
rewrites the lock.

```bash
beansc pot update
```

You can update just one dependency by naming it:

```bash
beansc pot update github.com/acme/http
```

## What does not exist

There is no `pot init`, no `pot add`, and no `pot remove`. You edit
`beans.pot` by hand, adding or deleting a `require` line yourself, and then run
`beansc pot tidy` to update the lock. `tidy` and `update` are the only `pot`
subcommands.

## `--locked` and `--offline`

These two flags are not `pot` subcommands. They apply to `check`, `run`, and
`build` (and the loading path underneath them), where they control how strictly
the lock and the network are treated:

- `--locked`: require exact `beans.lock` entries; reject a missing, stale, or
  changed lock.
- `--offline`: forbid dependency network access; accept only a clean cached
  tree matching the locked hash.

Full detail is on [Reproducible builds](/pot/reproducible/). See also
[Dependencies and the lock file](/pot/dependencies/) and
[the beansc command](/tools/beansc/).

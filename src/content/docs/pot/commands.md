---
title: The pot command reference
description: The beansc pot subcommands, and where --locked and --offline apply.
---

The `beansc pot` command works on your project's dependencies and
[`beans.lock`](/pot/dependencies/). There are five subcommands.

```text
beansc pot init <module-name>
beansc pot add <dependency> [ref]
beansc pot add --system <pkg-config-name>
beansc pot tidy
beansc pot remove <dependency>
beansc pot remove --system <pkg-config-name>
beansc pot update [dependency]
beansc pot update --system <pkg-config-name>
```

## `beansc pot init`

Creates a new `beans.pot` in the current directory:

```bash
beansc pot init shop
```

The result is:

```beans-pot
module shop
```

Module names are lowercase dot-separated names, such as `shop` or
`acme.http_client`. The command refuses to overwrite an existing `beans.pot`.
It creates only the manifest; add `main.b` or your library source separately.

## `beansc pot add`

Adds a Git dependency to `beans.pot`, resolves it, and writes `beans.lock`.

```bash
beansc pot add acme/http v1.2
```

`owner/repo` is short for `github.com/owner/repo`. You can also paste a full
host path, HTTPS URL, or SSH URL:

```bash
beansc pot add https://github.com/acme/http.git v1.2
```

The ref may be a tag, branch, or commit. It defaults to `HEAD`. Adding an
existing dependency with a new ref updates its `require` line.

```bash
beansc pot add acme/http main
beansc pot add acme/http feature/new-api
beansc pot add acme/http 4f82c9a7d13e
```

There is no package registry lookup. `acme/http` always means
`github.com/acme/http`, which Git fetches from
`https://github.com/acme/http.git`. A full path such as
`git.example.com/acme/http` points at that host instead.

Private repositories use the same command. Beans does not store credentials;
the `git` command uses your normal credential helper. If a plain `git clone`
of the HTTPS URL works, `beansc pot add` works. To make GitHub fetches use SSH,
configure Git once:

```bash
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

Do not put access tokens in `beans.pot` or in the dependency argument.

### Add a system C library

Use `--system` for a C library that is already installed and has a
`pkg-config` file:

```bash
beansc pot add --system sqlite3
```

Beans asks `pkg-config` for the library search paths and names, then writes a
marked block like this:

```beans-pot
# beansc:system sqlite3 begin
link all library "sqlite3"
# beansc:system sqlite3 end
```

Search rows are added too when the library is outside the default linker
paths. The operating system package manager still owns the library. It is not
downloaded by Beans and does not enter `beans.lock`.

## `beansc pot tidy`

Resolves the dependencies your code actually uses and writes `beans.lock`.

```bash
beansc pot tidy
```

Use it after imports change, to bring the lock in line with what the code uses.

## `beansc pot remove`

Removes a Git dependency from `beans.pot` and tidies `beans.lock`.

```bash
beansc pot remove acme/http
```

Remove the dependency's imports first. If the code still imports it, the
command fails and leaves `beans.pot` unchanged.

Remove a generated system-library block with the matching flag:

```bash
beansc pot remove --system sqlite3
```

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

The dependency name accepts the same short names, host paths, and Git URLs as
`pot add`.

Refresh one generated system-library block from its current `pkg-config`
metadata with:

```bash
beansc pot update --system sqlite3
```

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

---
title: Dependencies and the lock file
description: How Git dependencies are pinned with require, and what beans.lock records.
---

Beans dependencies come from Git. There is no central registry. You name a Git
host path and a reference in `beans.pot`, and Beans clones it into a local
cache and records the exact result in `beans.lock`.

## Declaring a dependency

Use `pot add` from the project root:

```bash
beansc pot add acme/http v1.2
```

This adds a `require` line to your [manifest](/pot/manifest/):

```beans-pot
module shop
require github.com/acme/http v1.2
```

- The path is a Git host path: exactly `host/owner/repo`.
- The reference is a tag, branch, or commit-like ref (here, `v1.2`).
- You may have many `require` lines.
- The same path pinned at two different refs is an error.

`owner/repo` is GitHub shorthand. Full host paths and HTTPS/SSH Git URLs work
too. The ref defaults to `HEAD` when you leave it out.

Refs are not limited to tags. Branches and commit hashes work too. The lock
always records the exact resolved commit and tree. Updating a branch or `HEAD`
may move the lock forward; updating a fixed commit stays on that commit.

For private repositories, authenticate Git itself. Beans never writes a token
or password to the manifest or lock file.

Once required, you import packages from it by their full import path, for
example `import github.com/acme/http`. See [Local packages and
imports](/pot/local-packages/) for how import paths resolve.

## The beans.lock file

`beans.lock` sits next to `beans.pot` at the module root. It records the exact
commit and tree each dependency resolved to, so a later build gets the same
bytes.

It is line-based. The first line is the format version. Then there is one row
per resolved dependency, sorted:

```beans-pot
version 1
module github.com/acme/http v1.2 3f1c9a2b... 8ad00e1f...
```

Each dependency row is:

```text
module <path> <requested-ref> <commit> <tree>
```

- `<path>`: the module path from `require`.
- `<requested-ref>`: the ref you asked for (`v1.2`).
- `<commit>`: the exact Git commit SHA it resolved to.
- `<tree>`: the Git tree hash of that commit's contents.

The file is written safely: Beans writes a temporary file and then atomically
renames it into place, so you never see a half-written lock.

## When the lock is written

- A normal build writes `beans.lock` automatically.
- [`beansc pot add`](/pot/commands/) adds and resolves one dependency.
- [`beansc pot remove`](/pot/commands/) removes one dependency and tidies the
  lock.
- [`beansc pot tidy`](/pot/commands/) resolves the dependencies you actually use
  and writes the lock.
- [`beansc pot update`](/pot/commands/) refreshes locked dependencies and
  rewrites the lock.

Commit `beans.lock` for any serious project. It, plus a pinned compiler, is how
you get the same build later. See [Reproducible
builds](/pot/reproducible/) for `--locked` and `--offline`, and
[Compatibility](/project/compatibility/) for why pinning matters before 1.0.

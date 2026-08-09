---
title: Reproducible builds
description: The content-addressed dependency cache, and the --locked and --offline flags.
---

Beans is built so the same inputs give the same build later. Dependencies are
cached by content, the lock file records exact hashes, and two flags let you
demand that nothing drifts.

## The content-addressed cache

Resolved dependency trees are cached under your Beans home:

```text
$BEANS_HOME/pkg/<module>/<commit>
```

The path is content-addressed: it is keyed by the exact commit. When Beans
fetches a dependency, it checks the fetched commit and tree against
[`beans.lock`](/pot/dependencies/). If they do not match the lock, the fetch is
**rejected**. You never silently build against a different tree than the one you
locked.

## `--locked`

`--locked` requires the lock to be exactly right. A `beans.lock` that is
missing, stale, or changed is rejected instead of quietly rewritten. Use this
in CI, where a build should fail rather than update your pins for you.

## `--offline`

`--offline` forbids all network access for dependencies. It accepts only a
clean cached tree whose hash matches the lock. If a needed dependency is not
already in the cache in the exact locked form, the build fails rather than
reaching out to the network.

## Where the flags apply

Both `--locked` and `--offline` apply to `check`, `run`, and `build`, and to
the loading path underneath them. So the same guarantees hold whether you are
type-checking, running on the interpreter, or building a native binary.

```bash
beansc build --locked --offline app.b -o app
```

## How fetching is kept safe

- Git is always started with a plain argument vector, never through a shell.
- A remote path is validated to be exactly `host/owner/repo` before it is used.

Together with a pinned compiler (see [Compatibility](/project/compatibility/)),
a committed `beans.lock` and `--locked --offline` give you a build that does not
change under you.

## See also

- [Dependencies and the lock file](/pot/dependencies/)
- [The pot command reference](/pot/commands/)

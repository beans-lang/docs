---
title: Upgrade beansc
description: Move an installed Beans release to a newer version with beansc upgrade.
---

Once Beans is installed, you upgrade it with one command.

## Upgrade in place

```bash
beansc upgrade
```

This upgrades your installed release in place. It:

- downloads the new release,
- verifies its SHA-256 checksum, and
- keeps the same install location.

## Windows

On Windows, run the upgrade through the installed `beansc.cmd` launcher:

```bash
beansc.cmd upgrade
```

The launcher exists because a running program cannot always replace its own
files on Windows; the `.cmd` wrapper handles the swap.

## When it does not apply

`beansc upgrade` needs an **installed release** to upgrade. If you built
`beansc` from source (a `git clone` + `make`), there is no release package to
replace, so `upgrade` has nothing to do. Pull new source and rebuild instead.

For the full details on `doctor` and `upgrade`, see [doctor and
upgrade](/tools/doctor-upgrade/). After upgrading, [verify the
install](/start/verify/) to confirm the new version.

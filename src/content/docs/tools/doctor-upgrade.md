---
title: doctor and upgrade
description: beansc doctor reports what your install can build; beansc upgrade updates the install in place.
---

Two commands look after your Beans installation itself: `doctor` tells you what
it can do, and `upgrade` moves it to the latest release.

## `beansc doctor`

```bash
beansc doctor
```

`doctor` prints a banner, then a report. Every row is either `ready` or names
the one command that fixes it. It **always exits 0**, even when something is not
ready — it is a report, not a gate.

It reports:

- package class (from the install's VERSION file)
- host target
- install root (`BEANS_HOME`)
- standard library root (honors `BEANS_STDLIB`)
- runtime source
- wasm host source
- clang, with version
- linker
- archiver
- SDK / sysroot (on macOS it uses `xcode-select -p`)
- git

Then it checks capability rows:

| Capability | Needs |
| --- | --- |
| check / run / llvm / `build --emit ir` | stdlib |
| native build | stdlib + runtime + clang + macOS SDK |
| bindgen | clang |
| static library | native build + archiver |

Where a row is not ready, the fix names the exact command — for example
`xcode-select --install`.

## `beansc upgrade`

```bash
beansc upgrade
```

`upgrade` moves this installation to the latest release. It needs an **installed
release**: it reads `BEANS_HOME`, and a plain source checkout has no install, so
it errors there.

What it does:

- runs the bundled installer at `{BEANS_HOME}/libexec/beans-install.sh` (or
  `.ps1` on Windows) with `--prefix <BEANS_HOME> --no-modify-path`
- keeps the current install location
- verifies the download's SHA-256
- runs the staged compiler
- then replaces the old install

On Windows, run it through the installed `beansc.cmd` launcher.

See [Upgrade beansc](/start/upgrade/) for the getting-started view, and
[Install Beans](/start/install/) for a first install.

## See also

- [Exit codes and troubleshooting](/tools/exit-codes/)
- [The beansc command](/tools/beansc/)

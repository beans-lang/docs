---
title: Install Beans
description: Install the beansc toolchain on macOS, Linux, or Windows with a one-line installer.
---

Beans ships as one tool, `beansc`. There is a one-line installer for each
platform. It needs no admin rights and installs under your home directory.

## One-line install

### macOS and Linux

```bash
curl -fsSL https://github.com/beans-lang/beans/releases/latest/download/beans-install.sh | sh
```

### Windows (PowerShell)

```bash
irm https://github.com/beans-lang/beans/releases/latest/download/beans-install.ps1 | iex
```

Then open a **new** terminal (so the updated PATH is picked up) and check it:

```bash
beansc --version
beansc doctor
```

## What the installer does

The installer:

- detects your OS, CPU, and C library (libc),
- picks the right package for your machine,
- verifies its SHA-256 checksum **before** unpacking,
- installs under your home directory, with no `sudo` or admin needed, and
- adds the `bin` directory to your PATH.

Re-running the installer is safe. If a download fails, an existing install is
left untouched.

## Where it installs

Default locations:

| Platform | Default location |
| --- | --- |
| macOS / Linux | `$HOME/.beans` |
| Windows | `%LOCALAPPDATA%\Beans` |

Override the location with the `BEANS_HOME` environment variable or the
`--prefix` option.

Inside the install directory you get:

```text
bin/         the beansc command
lib/         libraries
toolchain/   backend tools
VERSION      the installed version
```

## Full vs slim packages

The installer picks one of two package kinds for you:

- **Full** packages bundle Clang, LLD, and `llvm-ar`, so native builds need no
  extra tools. They ship for Linux x86-64 and ARM64 (GNU), and Windows x64,
  ARM64, and x86 (LLVM-MinGW).
- **Slim** packages ship everywhere else. With a slim package, `--version`,
  `doctor`, `check`, `run`, `llvm`, and `build --emit ir` all work with nothing
  to install. A **native** `build` needs a C compiler (Clang) on your PATH.

Two platform notes:

- **macOS:** native builds need Apple's Command Line Tools. Install them with
  `xcode-select --install`. `check` and `run` work without them.
- **Git** is only needed if you pull in Git package dependencies.

The C++ bootstrap compiler, `beansc0`, is never installed. You do not need it.

## Choosing a version, location, or target

Pass options to the installer after `-s --`:

```bash
curl -fsSL https://github.com/beans-lang/beans/releases/latest/download/beans-install.sh | sh -s -- --version 0.1.12 --prefix /opt/beans
```

Pick a specific build target with the `BEANS_TARGET` environment variable:

```bash
BEANS_TARGET=x86_64-unknown-linux-musl curl -fsSL https://github.com/beans-lang/beans/releases/latest/download/beans-install.sh | sh
```

Other installer options:

- `--force`: reinstall even if a version is already present.
- `--no-modify-path`: install without touching your PATH.
- `--help`: list every option.

## Uninstalling

There is no uninstaller. Delete the install directory and remove the PATH line
the installer added.

## Installing from source

If you would rather build the compiler yourself:

1. Install a release compiler first (with the one-liner above). You need a
   working `beansc` to build the self-hosted one.
2. Clone and build:

```bash
git clone https://github.com/beans-lang/beans.git
cd beans
make
./build/beansc --version
```

With Beans installed, [verify the install](/start/verify/) and then [write your
first program](/start/hello-world/). To move to a newer release later, see
[Upgrade beansc](/start/upgrade/).

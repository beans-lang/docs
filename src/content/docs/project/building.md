---
title: Building the compiler
description: Building beansc from source, self-hosting, the C++ bootstrap, and make install.
---

Beans is self-hosted: the compiler is written in Beans. To build it from source
you need an existing `beansc` to compile it with. The build is driven by the
project Makefile, and `compiler/version.h` is the single version source.

## What you need

- clang
- lld
- make
- git

On Debian or Ubuntu:

```bash
sudo apt-get install clang lld make git
```

On macOS, native builds also need the command-line tools:

```bash
xcode-select --install
```

## Building on a public checkout

A public checkout has no private bootstrap, so `make` builds `build/beansc`
using an **already-installed** `beansc`: the one on your `PATH`, or at
`$BEANS_HOME/bin/beansc`. Under the hood it runs:

```bash
beansc build compiler/beans/main.b -o build/beansc.new
```

The full loop:

```bash
# 1. install a release compiler first (the one-line installer)
# 2. get the source
git clone https://github.com/beans-lang/beans.git
cd beans
# 3. build
make
# 4. check it
./build/beansc --version
./build/beansc run examples/hello.b
```

Choose which compiler bootstraps the build with `BEANSC_BOOT`:

```bash
make BEANSC_BOOT=/path/to/beansc
```

See [Install Beans](/start/install/) for the one-line installer.

## The C++ bootstrap

With the private C++ bootstrap submodule present, `make` runs the full
stage0 -> stage1 -> stage2 -> stage3 chain:

- `beansc0` is the C++ stage-0 compiler.
- Stages 2 and 3 must be **byte-identical**. That fixed point proves the
  self-hosted compiler reproduces itself.

`make test` adds the differential gates on top (see [Running the
tests](/project/testing/)).

`beansc0` is never installed, never packaged, and never on your `PATH`. It only
exists to bootstrap the build.

## Installing

```bash
sudo make install PREFIX=/usr/local
```

This installs `beansc` (never `beansc0`), the runtime sources, and the standard
library.

See [Running the tests](/project/testing/) and
[Contributing](/project/contributing/) for the change workflow.

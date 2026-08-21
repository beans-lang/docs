---
title: Building the compiler
description: Building beansc from source with a released compiler, checking the fixed point, and make install.
---

Beans is self-hosted: the compiler is written in Beans. To build it from source
you need an existing `beansc` to compile it with. The project Makefile drives
the build, and [`VERSION`](https://github.com/beans-lang/beans/blob/main/VERSION)
is the single version source.

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

A checkout builds `build/beansc` using an **already-installed** `beansc`: the
one on your `PATH`, or at
`$BEANS_HOME/bin/beansc`. Under the hood it runs:

```bash
beansc build --release src/main.b -o build/beansc.new
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

## The self-hosting proof

The old C++ stage-0 bootstrap is gone. A released Beans compiler now bootstraps
the source compiler. `make test-fixpoint` rebuilds the compiler twice with the
same release flags and requires the two binaries to be **byte-identical**. That
fixed point proves the self-hosted compiler reproduces itself.

`make test` runs the behavioural suites and the fixed-point gate. See [Running
the tests](/project/testing/).

## Installing

```bash
sudo make install PREFIX=/usr/local
```

This installs `beansc`, the runtime sources, and the standard library.

See [Running the tests](/project/testing/) and
[Contributing](/project/contributing/) for the change workflow.

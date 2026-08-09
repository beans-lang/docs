---
title: Contributing
description: How to contribute to Beans, the change loop, and the basic code style rules.
---

Contributions are welcome. This page is a short overview; the full guide is in
the repository.

## Start with CONTRIBUTING.md

Read
[`CONTRIBUTING.md`](https://github.com/beans-lang/beans/blob/main/CONTRIBUTING.md)
in the repository first. It is the source of truth for how changes are accepted.

## Get set up

1. [Build the compiler from source](/project/building/).
2. Make sure the tests run before you change anything — see [Running the
   tests](/project/testing/).

## The change loop

When you change behavior, run tests in this order:

1. The **smallest focused test** for what you touched.
2. `make test`.
3. `make test-sanitize` — for ownership, runtime, concurrency, FFI, or codegen
   changes.
4. `make test-bootstrap` — for frontend, MIR, or compiler changes.

Because Beans is self-hosted, a compiler change has to keep building itself: the
stage2 and stage3 outputs must stay byte-identical (`make test-bootstrap`).

## Code style basics

Beans' own code follows the language design rules. A few basics:

- Objects are made with `new` on a class or a named static, never a free
  constructor function in a module. See [the standard
  library](/reference/stdlib/).
- Packages are `snake_case`, one directory per package. See [Local packages and
  imports](/pot/local-packages/).
- There is no formatter yet, so match the style of the file you are editing.

## See also

- [Building the compiler](/project/building/)
- [Running the tests](/project/testing/)
- [Release process](/project/release/)

---
title: What Beans is
description: A short introduction to the Beans language, the two jobs it is built for, and the one tool you use to work with it.
---

Beans is a small object-oriented programming language. It has classes,
interfaces, and inheritance with reference semantics, on top of a small grammar.
It has predictable ownership and direct access to the operating system.

Source files end in `.b`.

## The two jobs Beans is built for

Beans is not a general "do everything" language. It is built for two kinds of
work, and most design choices serve one or both.

### Business apps

Accounting, ERP, and billing: programs where a wrong number is a real problem.
For this work Beans gives you:

- **Mandatory explicit types.** Every name says what it is, so code stays
  readable months later.
- **Exact `decimal` arithmetic.** `19.99 * 3` is `59.97` exactly, not a float
  that is almost right.
- **No null and no exceptions.** Missing values use `Option<T>`; failures use
  `Result<T>`. There is no hidden control flow.

### Systems work

Databases, operating systems, and hardware control: programs that touch the
machine directly. For this work Beans gives you:

- **Sized integers** like `i32` and `u64`, and value types (`struct`, `union`).
- **An `unsafe` layer** with raw memory and C interop.
- **No garbage-collector pauses.** Memory is managed with automatic reference
  counting plus a cycle collector, so no tracing collector stops your program at
  random.

## One tool: `beansc`

There is a single command, `beansc`, and it is the whole toolchain:

- a **type checker** that verifies your program,
- a **reference interpreter** that runs it with no build step,
- a **native LLVM backend** that compiles it to a real binary,
- a **package manager** (`beansc pot`),
- a **language server (LSP)** for editors, and
- a **debugger (DAP)**.

`beansc` is self-hosted: the Beans compiler is written in Beans and compiles
itself.

## A tiny example

Here is a complete Beans program. Save it as `hello.b`.

```beans
import std.io

fn main() {
    let name: string = "beans"
    io.println("hello from {name}")
}
```

`{name}` inside the string is interpolation: it prints the value of `name`. Run
it with:

```bash
beansc run hello.b
```

```text
hello from beans
```

Next, read the [language philosophy](/intro/philosophy/) for the rules behind
these choices, or [install Beans](/start/install/) and run your first program.

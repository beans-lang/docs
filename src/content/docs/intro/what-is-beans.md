---
title: What Beans is
description: A short introduction to the Beans language, the two jobs it is built for, and the one tool you use to work with it.
---

Beans is a small object-oriented programming language. It gives you Java-style
objects (classes, interfaces, inheritance) with a grammar about the size of
Go's. It has predictable ownership, direct access to the operating system, and
aims for the kind of performance you get from C++.

Source files end in `.b`.

## The two jobs Beans is built for

Beans is not a general "do everything" language. It is built for two kinds of
work, and every design choice serves one or both.

### Business apps

Accounting, ERP, billing — programs where a wrong number is a real problem.
For this work Beans gives you:

- **Mandatory explicit types.** Every name says what it is, so code stays
  readable months later.
- **`decimal` money math.** Exact decimal arithmetic, so `19.99 * 3` is
  `59.97` exactly, not a float that is almost right.
- **No null and no exceptions.** Missing values use `Option<T>`; failures use
  `Result<T>`. There is no hidden control flow.
- A tone that is deliberately boring and readable.

### Systems work

Databases, operating systems, hardware control — programs that touch the
machine directly. For this work Beans gives you:

- **Sized integers** like `i32`, `u64`, and value types (`struct`, `union`).
- **An `unsafe` layer** with raw memory and C/C++ interop.
- **No garbage-collector pauses.** Memory is managed with automatic reference
  counting plus a cycle collector, so there is no tracing GC stopping your
  program at random.

## One tool: `beansc`

There is a single command, `beansc`. It is the whole toolchain:

- a **type checker** that verifies your program,
- a **reference interpreter** that runs it with no build step,
- a **native LLVM backend** that compiles it to a real binary,
- a **package manager** (`beansc pot`),
- a **language server (LSP)** for editors, and
- a **debugger (DAP)**.

`beansc` is **self-hosted**: the Beans compiler is written in Beans and
compiles itself.

## A tiny example

Here is a complete Beans program. Save it as `hello.b`.

```beans
import std.io

fn main() {
    let name: string = "beans"
    io.println("hello from {name}")
}
```

`{name}` inside the string is interpolation: it prints the value of `name`.
Run it with:

```bash
beansc run hello.b
```

```text
hello from beans
```

## Where to go next

- [Language philosophy](/intro/philosophy/) — the design rules behind Beans.
- [Goals and non-goals](/intro/goals/) — what Beans is for and what it leaves out.
- [Maturity and platforms](/intro/maturity/) — how finished Beans is today.
- [Install Beans](/start/install/) — get the tool and run your first program.

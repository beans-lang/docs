---
title: What Beans is
description: A short introduction to the Beans language, what it is built to do well, and the one tool you use to work with it.
---

Beans is a small, general-purpose programming language with explicit types,
predictable ownership, and direct systems access.

It supports standalone functions and closures, structs and enums, and classes
with interfaces and inheritance. Structs copy by value; classes have reference
semantics. You can write a complete program with functions, without defining a
class.

Source files end in `.b`.

## Types, arithmetic, and errors

- **Mandatory explicit types.** Declarations state their types.
- **Exact `decimal` arithmetic.** Base-10 arithmetic gives `19.99 * 3` as
  `59.97` exactly.
- **No null and no exceptions.** Missing values use `Option<T>`; failures use
  `Result<T>`.

## Memory and systems access

- **Sized integers** like `i32` and `u64`, and value types (`struct`, `union`).
- **An `unsafe` layer** with raw memory and C interop.
- **Automatic memory management.** Memory uses automatic reference counting
  with a cycle collector, rather than a tracing garbage collector.

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

---
title: std.io and std.os
description: Printing, reading input, program arguments, environment variables, and exiting the program.
---

These two native modules are your basic link to the terminal and the operating
system. `std.io` handles input and output. `std.os` handles arguments, the
environment, and exit. Both are built into the compiler and runtime, so there is
no `stdlib/std/` source to read.

## std.io

```beans
import std.io
```

### Printing

| Function | What it does |
| --- | --- |
| `io.println(x)` | print `x` to stdout, then a newline |
| `io.print(x)` | print `x` to stdout, no newline |
| `io.eprintln(x)` | print `x` to stderr, then a newline |
| `io.eprint(x)` | print `x` to stderr, no newline |

What can print:

- numbers, bools, and strings, as you would expect;
- enums, shown as `variant` or `variant(payload)`;
- lists, shown as `[a, b, c]`.

Maps, class instances, and `Result` values do not print. Format those yourself
first (see [std.fmt](/reference/stdlib/fmt/) and string interpolation).

```beans
import std.io

fn main() {
    io.println("count is {3}")   // count is 3
    io.println([1, 2, 3])          // [1, 2, 3]
    io.eprintln("something went wrong")
}
```

### Reading input

| Function | Returns | What it does |
| --- | --- | --- |
| `io.read_line()` | `Option<string>` | read one line from stdin; `none` at end of input |
| `io.read_all()` | `string` | read all of stdin as one string |

```beans
import std.io

fn main() {
    let line: Option<string> = io.read_line()
    match line {
        some(text) => io.println("you typed {text}"),
        none => {},
    }
}
```

## std.os

```beans
import std.os
```

| Function | Returns | What it does |
| --- | --- | --- |
| `os.args()` | `List<string>` | the program's arguments |
| `os.env(name)` | `Option<string>` | value of environment variable `name`, or `none` |
| `os.exit(code)` | (does not return) | stop the program with exit code `code` |

`os.args()` gives you the arguments to your program. When you use
`beansc run f.b -- a b`, the arguments are the ones after `--` (so `a` and `b`).
A compiled native binary reads them straight from `argv`.

```beans
import std.io
import std.os

fn main() {
    for arg in os.args() {
        io.println(arg)
    }
    let home: Option<string> = os.env("HOME")
    match home {
        some(path) => io.println("home is {path}"),
        none => {},
    }
    os.exit(0)
}
```

## C errno, for hosted interop

When you call C code on a hosted target, two helpers let you read and set the C
`errno` value:

- `std.c.errno() -> i32` — read the current `errno`.
- `std.c.set_errno(i32)` — set `errno`.

Use these only when you are doing C interop and need to inspect the error a C
call left behind. See the [FFI guide](/guide/ffi/).

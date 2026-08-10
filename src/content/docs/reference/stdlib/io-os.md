---
title: std.io and std.os
description: Printing, reading input, program arguments, environment variables, and exiting the program.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 11 package functions.
<!-- coverage:summary:end -->

These two native modules are your basic link to the terminal and the operating
system. `std.io` handles input and output. `std.os` handles arguments, the
environment, and exit. Both are built into the compiler and runtime, so there is
no `stdlib/std/` source to read, and their functions are typed in the checker with
positional parameters that carry no names.

## std.io

```beans
import std.io
```

### Printing

```beans
print(any)
println(any)
eprint(any)
eprintln(any)
```

`print` writes to stdout with no newline; `println` adds a trailing newline.
`eprint` and `eprintln` are the same, but write to stderr. Each takes one value of
any type.

What can print:

- numbers, bools, and strings, as you would expect;
- enums, shown as `variant` or `variant(payload)`;
- lists, shown as `[a, b, c]`.

Maps, class instances, and `Result` values do not print. Format those yourself
first (see [std.fmt](/reference/stdlib/fmt/) and string interpolation).

<!-- beans:compile -->
```beans
import std.io

fn main() {
    io.println("count is {3}")     // count is 3
    io.println([1, 2, 3])          // [1, 2, 3]
    io.eprintln("something went wrong")
}
```

### Reading input

```beans
read_line() -> Option<string>
read_all() -> string
```

`read_line` reads one line from stdin and returns `none` at end of input.
`read_all` reads all of stdin as one string.

<!-- beans:compile -->
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

```beans
args() -> List<string>
env(string) -> Option<string>
exit(int)
```

- `args()` gives you the arguments to your program. When you use
  `beansc run f.b -- a b`, the arguments are the ones after `--` (so `a` and `b`).
  A compiled native binary reads them straight from `argv`.
- `env(name)` returns the value of environment variable `name`, or `none` when it
  is not set.
- `exit(code)` stops the program with exit code `code` and does not return.

<!-- beans:compile -->
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

When you call C code on a hosted target, two helpers in `std.c` let you read and
set the C `errno` value:

```beans
errno() -> i32
set_errno(i32)
```

- `errno()` reads the current `errno`.
- `set_errno(value)` sets it.

Use these only when you are doing C interop and need to inspect the error a C
call left behind. See the [FFI guide](/guide/ffi/).

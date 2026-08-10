---
title: Hello world
description: Write a one-file Beans program and check, run, and build it.
---

This page walks through your first Beans program from an empty file to a native
binary.

## Write the program

Save this as `hello.b`:

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let name: string = "beans"
    io.println("hello from {name}")
}
```

A few things to notice:

- `import std.io` pulls in the standard I/O package. `io.println` lives there.
- `fn main()` is where the program starts.
- `let name: string = "beans"` declares a value. `let` means it does not change.
  The type, `string`, is written out. Beans does not infer it for you.
- `"hello from {name}"` is an interpolated string. `{name}` is replaced with the
  value of `name`.

## Check it

Type-check the program without running it:

```bash
beansc check hello.b
```

```text
hello.b: ok
```

`check` catches type errors and other mistakes fast. It does not run anything.

## Run it

Run the program on the reference interpreter, with no build step:

```bash
beansc run hello.b
```

```text
hello from beans
```

`run` is the quickest way to see output while you work.

## Build a native binary

Compile to a real executable through LLVM:

```bash
beansc build hello.b -o hello
./hello
```

```text
hello from beans
```

The interpreter (`run`) and the native binary (`build`) produce the same
output. The two backends behave identically.

## Build an optimized binary

For a release build, turn on optimizations, link-time optimization, and tuning
for your own CPU:

```bash
beansc build --release --lto --cpu native hello.b -o hello
```

## An example that does not compile

Beans requires a function with a return type to return on every path. This
program is **intentionally wrong**. The docs example checker confirms it fails
to compile:

<!-- beans:expect-error -->
```beans
fn total() -> int {
    var sum: int = 0
    sum          // a trailing expression is discarded, not returned
}
```

```text
error: 'total' must return int — the body can finish without a return
```

The fix is to write `return sum`. See [Functions and closures](/guide/functions/).

To grow past a single file, [create a project](/start/projects/). For more on
the commands used here, see [Checking and running](/tools/check-run/) and
[Building](/tools/build/).

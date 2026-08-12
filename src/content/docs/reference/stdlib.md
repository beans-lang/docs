---
title: Standard library
description: What the Beans standard library is, how it is split into Beans-source packages and native modules, and a map of every package page.
---

The standard library is the set of packages you reach with `import std.*`. It
covers files, text formatting, math, collections helpers, encoding, networking,
processes, threads, time, randomness, and low-level machine access.

You import a package by its dotted name and then call into it by its last name:

```beans
import std.io
import std.encoding.json

fn main() {
    io.println("hello")
    let value: json.Value = json.parse("[1, 2, 3]").expect("parse")
}
```

## Two kinds of packages

The library comes in two layers.

- **Beans-source packages.** These are written in Beans and ship with the
  compiler under `stdlib/std/<pkg>/<pkg>.b`. You can read their code. Examples:
  `std.fmt` at
  [`stdlib/std/fmt/fmt.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/fmt/fmt.b),
  `std.collections`, `std.math`, `std.path`, `std.fs`, and the encoding
  packages.
- **Native modules.** These are built into the compiler and runtime, not into
  `stdlib/std/`. They are the parts that must talk to the operating system or the
  CPU directly: `std.io`, `std.os`, `std.thread`, `std.time`, `std.random`,
  `std.target`, `std.cpu`, `std.intrinsic`, and `std.asm`.

You do not need to think about which layer a package is in while you write code.
It only matters when you go looking for the source.

## One rule for making objects

Beans has no free "constructor functions" in modules. Anything that produces an
object is either a `new` on that object's class or a named static on the class,
never a plain module function.

```beans
import std.net

fn main() {
    // a class instance: use new
    let addr: net.Address = new net.Address("localhost", 8080)
    // fallible construction: a named static returning Result
    let stream: Result<net.TcpStream> = net.TcpStream.connect("localhost", 8080)
}
```

So `new process.Command("ls")` builds a command, and `File.open(path, "r")`
opens a file (it can fail, so it is a named static that returns a `Result`).

## Pointing the loader at another root

The compiler finds the standard library on its own. If you need to override where
it looks, set the `BEANS_STDLIB` environment variable to another root directory
and the loader will read packages from there instead.

## A note on `std.async$rt`

There is a compiler-internal package named `std.async$rt` that backs the async
runtime. You cannot import it. Its directory name contains a `$`, which is not a
legal character in an import path, so the name can never be written in your code.
Ignore it.

## Package pages

| Package | What it covers |
| --- | --- |
| [std.io and std.os](/reference/stdlib/io-os/) | printing, reading input, program arguments, environment, exit |
| [std.collections](/reference/stdlib/collections/) | generic helpers over `List` and `Map` |
| [std.fmt](/reference/stdlib/fmt/) | number and text formatting |
| [std.math](/reference/stdlib/math/) | small numeric helpers |
| [std.bytes](/reference/stdlib/bytes/) | CRC-32 and varint helpers over `Bytes` |
| [std.path](/reference/stdlib/path/) | path string math, no filesystem |
| [std.fs](/reference/stdlib/fs/) | read and write whole files |
| [std.reader](/reference/stdlib/reader/) | buffered line reading over a `File` |
| [std.reflect](/reference/stdlib/reflect/) | runtime types, members, annotations, checked field access and calls |
| [std.encoding.json](/reference/stdlib/json/) | JSON parsing and building |
| [std.encoding.xml](/reference/stdlib/xml/) | XML parsing and building |
| [std.encoding.base64](/reference/stdlib/base64/) | Base64 encode and decode |
| [std.encoding.binary](/reference/stdlib/binary/) | fixed-width integers and varints over `Bytes` |
| [std.net](/reference/stdlib/net/) | TCP and UDP sockets |
| [std.process](/reference/stdlib/process/) | run other programs, no shell |
| [std.poll](/reference/stdlib/poll/) | wait on many descriptors at once |
| [std.signal](/reference/stdlib/signal/) | receive OS signals as data |
| [std.dylib](/reference/stdlib/dylib/) | open dynamic libraries at run time |
| [std.thread](/reference/stdlib/thread/) | run closures on OS threads |
| [std.time and std.random](/reference/stdlib/time-random/) | clocks, sleeping, and secure random |
| [std.target](/reference/stdlib/target/) | facts about the selected target, at compile time |
| [std.cpu and std.intrinsic](/reference/stdlib/cpu-intrinsic/) | ask the CPU, and low-level intrinsics |
| [std.asm](/reference/stdlib/asm/) | constrained inline assembly |

## See also

- [Builtins](/reference/builtins/), the types the compiler gives you without an
  import.
- The [language guide](/guide/errors/) for how `Option`, `Result`, and `?` work.

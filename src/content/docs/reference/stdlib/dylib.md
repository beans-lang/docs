---
title: std.dylib
description: Open a shared library at run time, find symbols in it, and call them through unsafe.
---

`std.dylib` opens a dynamic library (a `.so`, `.dylib`, or `.dll`) while your
program runs and looks up symbols in it. It sits over `std.dl`. Read the source at
[`stdlib/std/dylib/dylib.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/dylib/dylib.b).

```beans
import std.dylib
```

Libraries are always opened with `RTLD_LOCAL`, so their symbols do not leak into
the global namespace.

Finding a symbol gives you its address. To actually call it you need
[`unsafe`](/guide/unsafe/) and you go through `std.dl`. The call functions are
`dl.call0` through `dl.call3` (0 to 3 arguments). Each argument and the result is
one machine word, so only integers and pointers work this way. Floats and structs
need a proper `extern "C"` declaration instead — see the [FFI guide](/guide/ffi/).

## class Symbol

A resolved symbol.

- `pub address: int` — its address.
- `pub name: string` — its name.
- `new dylib.Symbol(address, name)` — build one by hand.
- `is_null() -> bool` — whether the address is null.

## unique class Dylib

An open library. Move-only; closes on drop.

- `pub path: string` — the path it was opened from.
- `Dylib.open(path) -> Result<Dylib>` (static) — open a library.

| Method | Returns | What it does |
| --- | --- | --- |
| `find(name)` | `Result<Symbol>` | look up a symbol by name |
| `has(name)` | `bool` | whether a symbol exists |
| `close()` | `Result<bool>` | close the library |

```beans
import std.io
import std.dylib

fn main() {
    let lib: dylib.Dylib = dylib.Dylib.open("libm.so.6").expect("open")
    if lib.has("cos") {
        let sym: dylib.Symbol = lib.find("cos").expect("find")
        io.println("cos at {sym.address}")
        // calling it needs unsafe + std.dl, and cos takes a float,
        // so it really needs an extern "C" declaration.
    }
}
```

## See also

- [Unsafe guide](/guide/unsafe/) — what `unsafe` allows.
- [FFI guide](/guide/ffi/) — the safe, typed way to call C with floats and
  structs.

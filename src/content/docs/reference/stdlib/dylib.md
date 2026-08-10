---
title: std.dylib
description: Open a shared library at run time, find symbols in it, and call them through unsafe.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 2 types · 1 constructor · 1 static method · 4 instance methods · 3 public fields.
<!-- coverage:summary:end -->

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
one machine word, so only integers and pointers work this way. Floats, narrow
integers, and by-value structs need a proper `extern "C"` declaration instead, see
the [FFI guide](/guide/ffi/).

## Symbol

A resolved symbol: its address, and the name it was looked up by. Holding one is
safe; calling it is not.

```beans
pub class Symbol
new Symbol(address: int, name: string)

pub address: int
pub name: string

pub fn is_null() -> bool
```

- `is_null` is true when the address is 0. A symbol can legitimately live at
  address 0, so this is a convenience rather than the error check. `Dylib.find`
  already reports a real failure as an `err`.

## Dylib

An open shared library. It is a `unique class`: move-only, and it closes itself on
drop.

```beans
pub unique class Dylib
pub path: string

pub static fn open(path: string) -> Result<Dylib>

pub fn find(name: string) -> Result<Symbol>
pub fn has(name: string) -> bool
pub fn close() -> Result<bool>
```

- `open` opens a library by path. It fails with kind `not_found` and the loader's
  own message, which names the missing dependency when that is the real problem.
- `find` looks up a symbol; a missing symbol is kind `not_found`. `has` reports
  whether a symbol exists without treating its absence as an error, which is useful
  for probing an optional entry point.
- `close` closes the library. **Every address obtained from it becomes invalid**,
  and calling one afterwards is undefined. `find`, `has`, and `close` on an
  already-closed library return kind `closed` (`has` returns `false`).

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

- [Unsafe guide](/guide/unsafe/), what `unsafe` allows.
- [FFI guide](/guide/ffi/), the safe, typed way to call C with floats and
  structs.

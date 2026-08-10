---
title: C interop (FFI)
description: A line-by-line walk through examples/ffi.b, calling C from Beans, plus C struct layout and loading a library at run time.
---

Beans can call C directly. The core example is
[`ffi.b`](https://github.com/beans-lang/beans/blob/main/examples/ffi.b): it
declares some libc functions and calls them, and uses raw pointers inside an
`unsafe` block. This page walks it line by line, then points at two related
examples.

## ffi.b

### Declaring C functions

```beans
import std.io

extern "C" fn llabs(value: i64) -> i64
extern "C" fn fabs(value: f64) -> f64
extern "C" fn fabsf(value: f32) -> f32
extern "C" fn ldexp(value: f64, exponent: i32) -> f64
extern "C" fn ldexpf(value: f32, exponent: i32) -> f32
```

`extern "C" fn` declares a function that lives in C, not Beans. There is no
body: you are telling the compiler the name and the signature, and it links to
the C library at build time (or resolves it with `dlsym` in the interpreter).
The types are sized: `i64`, `f64`, `f32`, `i32`. These are libc math functions
(`llabs` is long-long absolute value, `ldexp` multiplies by a power of two).

### Raw memory in an unsafe block

<!-- beans:fragment -->
```beans
fn main() {
    unsafe {
        let memory: RawPtr<u8> = RawPtr.alloc(5)
        memory.write(65)
        memory.offset(1).write(65)
        memory.offset(2).write(65)
        memory.offset(3).write(65)
        memory.offset(4).write(0)
```

`RawPtr<u8>` is a raw pointer: unmanaged memory the compiler will not track for
you. That is why everything here is inside `unsafe { ... }`: you are taking
responsibility. `RawPtr.alloc(5)` allocates 5 bytes. `write(65)` stores a byte
(65 is ASCII `A`), and `offset(n)` moves the pointer forward `n` elements. The
last byte is set to `0`, a C string terminator.

### Reading it back

```beans
        let returned: RawPtr<u8> = memory
        let checksum: int = (returned.read() as int) +
                            (returned.offset(1).read() as int) +
                            (returned.offset(2).read() as int) +
                            (returned.offset(3).read() as int)
        io.println("ffi {llabs(-42)} {checksum} {returned == memory}")
        io.println("float {fabs(-3.5)} {fabsf(-2.25)}")
        io.println("mixed {ldexp(1.5, 3)} {ldexpf(3.0, -1)}")
        memory.free()
    }
}
```

`read()` loads a byte back; `as int` widens it so the sum is an `int`. The
`checksum` adds the four `A` bytes (65 × 4 = 260). The three `io.println` lines
then call the C functions directly, mixing them with the raw-pointer results.
Pointers compare with `==`, so `returned == memory` is `true`.

The last line is the rule you must not forget: `memory.free()` releases what
`RawPtr.alloc` gave you. Raw memory is not reference-counted, so you free it
yourself.

The file's own comment explains why it avoids `memset`: an older version
declared `memset`'s `size_t` as `u64`, which is the wrong declaration on every
32-bit target. Getting an `extern "C"` signature wrong is a real trap, because
the compiler believes what you write.

Run it:

```bash
beansc run examples/ffi.b
```

## C struct layout: c_layout_structs.b

[`c_layout_structs.b`](https://github.com/beans-lang/beans/blob/main/examples/c_layout_structs.b)
shows `extern "C" struct`, a struct laid out exactly the way a C compiler would
lay it out, so you can pass it to and from C:

```beans
extern "C" struct Packet {
    tag: u8
    count: u32
    ratio: f32
    live: bool
}
```

An `extern "C" struct` is a value type with C's field order, padding, and
alignment. The example copies these structs by value, mutates copies, compares
them with `==`, and puts them in raw memory. Its companion
[`c_layout_unions.b`](https://github.com/beans-lang/beans/blob/main/examples/c_layout_unions.b)
does the same for `extern "C"` unions.

## Loading a library at run time: dynamic_library.b

[`dynamic_library.b`](https://github.com/beans-lang/beans/blob/main/examples/dynamic_library.b)
opens a shared library while the program runs and calls a function by address,
using `std.dylib` and `std.dl`:

```beans
let lib: dylib.Dylib = dylib.Dylib.open(path)?
let present: bool = lib.has("plug_add")
let add: dylib.Symbol = lib.find("plug_add")?

unsafe {
    io.println("two arguments give {dl.call2(add.address, 40, 2)}")
}
```

Two rules from the file's header:

- **Probing is safe; calling is not.** `lib.has(...)` and `lib.find(...)` do not
  need `unsafe`. Only *calling* an address does, because a symbol is just an
  address: nothing about it proves what arguments it takes, and a wrong guess
  corrupts the stack. So the call goes straight to `std.dl` inside a visible
  `unsafe` block; there is no wrapper hiding it.
- **The library opens `RTLD_LOCAL`**, so its symbols never leak into the global
  namespace where an `extern "C" fn` would look.

Because a library binary cannot be committed to the repo, this example takes its
path from the `BEANS_DYLIB_EXAMPLE` environment variable. Without it, the
example still exercises every failure path.

[Foreign function interface](/guide/ffi/) is the FFI guide, and
[Unsafe and raw memory](/guide/unsafe/) explains what `unsafe` and `RawPtr` mean.
[std.dylib](/reference/stdlib/dylib/) covers loading libraries at run time, and
[bindgen](/tools/bindgen/) generates `extern "C"` declarations from C headers.

---
title: Foreign function interface
description: Calling and exporting C functions, C-layout records, callbacks, globals, and generating bindings with beansc bindgen.
---

Beans has a full C ABI: it can call C functions, export C functions, describe
C-layout records, pass callbacks, and read C globals. Clang owns the platform
ABI lowering, so Beans matches the target's real C rules.

## Declaring and calling a C function

`extern "C" fn` declares an unmangled host C symbol. Calls require `unsafe`.

```beans
import std.io

extern "C" fn llabs(value: i64) -> i64
extern "C" fn ldexp(value: f64, exponent: i32) -> f64

fn main() {
    unsafe {
        io.println("{llabs(-42)} {ldexp(1.5, 3)}")
    }
}
```

The ABI supports any number of integer, `bool`, `RawPtr`, `CFunctionPtr`, `f32`,
`f64`, or `extern "C"` struct/union arguments and the same return types (or no
return), including arguments past every register bank. Aggregates may contain
nested C-layout records and fixed arrays.

`as "native_name"` gives an import a different C symbol name.

## Variadic C functions

A C function with a `...` tail — `ioctl`, `fcntl`, three-argument `open`,
`printf` — declares its fixed head and then `...`:

```beans
extern "C" fn ioctl(fd: i32, request: u64, ...) -> i32
extern "C" fn open(path: RawPtr<u8>, flags: i32, ...) -> i32
```

At least one fixed parameter is required, the same rule C has. There is no
`va_list` in Beans, so a variadic declaration never has a body, and a
`pub extern "C" fn` export is never variadic.

**The tail belongs to the call, not to the declaration.** Each call site is
classified by the target's own variadic rules, which is the point of the form:
on Apple arm64 the fixed head stays in registers while the tail goes on the
stack, so the same arguments passed through a fixed signature would land in the
wrong places. Declaring `ioctl` with three fixed parameters is not the same
function, and on that target it does not work.

```beans
import std.io

// one declaration, as many signatures as it has call sites
extern "C" fn printf(format: RawPtr<u8>, ...) -> i32

fn main() {
    var format: Bytes = Bytes.from("tail %d and %d\n")
    format.push(0)   // C wants the NUL
    unsafe {
        // an empty tail would be a legal call too
        let written: i32 = printf(format.as_ptr(), 42, 7)
        io.println("printf wrote {written}")
    }
}
```

Arguments in the tail are promoted the way C promotes them: every integer
narrower than `int` arrives as an `int`, and an `f32` arrives as an `f64`.

## Exporting a C function

A `pub extern "C" fn` with a body exports its name for C callers. Only C-safe
parameters and results are accepted:

```beans
pub extern "C" fn add(a: i32, b: i32) -> i32 {
    return a + b
}
```

Build a C-facing library with `beansc build --emit static --header api.h
file.b`. See [Building](/tools/build/).

## C-layout records

Use [`extern "C"` structs and unions](/guide/structs/) so the layout matches C
exactly. They can be read and written through `RawPtr` and `Slice`, and passed
by value across the boundary. `extern "C" opaque struct Handle` declares an
incomplete type you only touch behind `RawPtr`.

## Callbacks

- A **borrowed callback** is an `fn(...)` parameter on an `extern "C" fn`. It is
  lent to C for the length of that one call only, so a Beans closure can be
  passed directly and no lifetime question arises. C must not store it or call
  it from another thread.
- A callback C **stores** or calls later needs `StoredCallback<F>`:
  `StoredCallback.create(userdata_index, closure)`. Pass `function()` to a
  borrowed parameter, `function_pointer()` when C stores the address in a
  `CFunctionPtr<F>` field, and `context()` for the separate userdata pointer.
  Captures must be `Send + Sync`. Unregister first, then `close()` (which waits
  for active calls). The value is move-only.
- A callback the library stores but **always invokes on the registering
  thread** — the common C event-loop shape — uses the separate
  `LocalStoredCallback<F>` type and
  `LocalStoredCallback.create(userdata_index, closure)`. Captures are
  unrestricted (no `Send`, no `Sync`): the registering thread is recorded, and
  an invocation from any other thread is a checked runtime abort rather than a
  data race. Same `function()` / `function_pointer()` / `context()` surface
  and the same unregister-then-`close()` discipline. It cannot be passed where
  an any-thread `StoredCallback<F>` is required.
- **`CFunctionPtr<F>`** is C function-pointer storage, one pointer wide but
  distinct from `RawPtr` and from Beans function values. It is valid in C-layout
  records, extern globals, parameters, returns, and generated headers.
  `CFunctionPtr.null()`, `is_null()`, and an `unsafe` `call(...)`.

## Globals, TLS, and errno

C data symbols use `extern "C" let`, `extern "C" var`, or
`extern "C" thread_local var`, with optional `as "native_name"`. Reads and
writes require `unsafe`. Hosted programs use `std.c.errno()` and
`std.c.set_errno(value)` instead of assuming a platform's errno spelling.

## Generating bindings

`beansc bindgen header.h -o bindings.b` asks Clang for the selected target's
JSON AST and emits Beans C declarations:

```bash
beansc bindgen vendor/api.h -o api_bindings.b --package main -- -Ivendor/include
beansc check api_bindings.b
```

It handles typedefs, records, unions, arrays, enums, globals, TLS, functions,
and function pointers, with the target's real scalar widths. In strict mode it
**refuses** constructs whose ABI it cannot reproduce exactly (varargs,
bitfields, flexible arrays, anonymous records, non-default calling conventions,
`_Atomic` members, packed/aligned records) and types with no exact Beans
equivalent (`long double`, 128-bit ints, `_Complex`, `_BitInt`).
`--allow-unsupported` omits each unsafe declaration and its dependants instead
of failing. See [bindgen](/tools/bindgen/).

## Dynamic libraries

To load a shared library at run time, use
[`std.dylib`](/reference/stdlib/dylib/). Calling a resolved address requires
`unsafe` and takes one machine word per argument.

## Getting the signature right

Beans trusts the signature you declare and matches the target's real C ABI for
it. It cannot check that declaration against the actual C function, so a wrong
argument type, count, or return type is undefined behavior at the boundary, not
a compile error. Generating declarations with `beansc bindgen` (above) keeps
them exact, and in strict mode it refuses any construct whose ABI it cannot
reproduce rather than guessing.

C-layout records go through [structs and unions](/guide/structs/), and the raw
pointers you read and write them with are in
[unsafe and raw memory](/guide/unsafe/).

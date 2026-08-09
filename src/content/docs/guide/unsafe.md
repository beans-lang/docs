---
title: Unsafe and raw memory
description: The unsafe block, RawPtr, Slice, fixed arrays, SIMD, intrinsics, and inline assembly in Beans.
---

Most Beans code is safe: no null, checked indexing, and ownership the compiler
proves. When you need raw memory — for a device, a database page, or C interop
— you enter an `unsafe { }` block. Inside it, some low-level operations become
available, and their safety becomes **your** responsibility.

```beans
unsafe {
    let counters: RawPtr<Counter> = RawPtr.alloc(4)   // element type's alignment
    let page: RawPtr<Counter> = RawPtr.alloc_aligned(2, 4096)
    counters.write(new_value)
    counters.free()
}
```

`unsafe` gates the operation, not a function — there is no `unsafe fn`, so the
block sits at the call site.

## RawPtr

`RawPtr<T>` is a raw typed pointer to primitive integer, float, bool,
raw-pointer, fixed-array, or `extern "C"` struct/union memory (these shapes can
nest).

Construct (all `unsafe`):

- `RawPtr.alloc(count)` — zeroed unmanaged storage with the element type's own
  alignment.
- `RawPtr.alloc_aligned(count, align)` — a stricter alignment (`align` a power of
  two, never weaker than the element's; checked at run time).
- `RawPtr.null()`, `RawPtr.from_address(addr)`.

Methods (all `unsafe`): `read()`, `write(v)`, `read_volatile()`,
`write_volatile(v)`, `offset(n)`, `address()`, `is_null()`, `element_size()`,
`element_align()`, `copy_from(src, n)` (overlap-safe), `fill_zero(n)`, `free()`.
Integer and bool pointers also provide sequentially-consistent `atomic_load`,
`atomic_store`, `atomic_compare_exchange`; integer pointers add
`atomic_fetch_add` (returns the old value).

You own lifetime, bounds, alignment, address validity, and matching each
`alloc` with one `free`. A null memory operation panics; everything else is on
you. Raw pointers are copyable, so freeing one alias leaves the others dangling.

`RawPtr.with_local(inout value, fn(pointer: RawPtr<T>) { ... })` lends a pointer
to one stack value for the duration of the closure.

## Slice

`Slice<T>` is a non-owning `{pointer, length}` view over raw-compatible memory.
`Slice.from_raw(ptr, len)`, `get`, `set`, indexing, `subslice`, `as_ptr`, and
iteration all require `unsafe`; reads and writes are bounds-checked. A non-empty
slice rejects a null pointer. You must keep the backing allocation alive and not
use the view after `free`.

## Fixed arrays

`[T; N]` is a fixed-size inline array (`1 <= N <= 4096`) of inline scalar,
`RawPtr`, nested-array, or struct elements. Unlike raw pointers, fixed arrays
are **safe**: checked indexing, element assignment on `var` locals, `len()`,
equality, and `for` iteration, all without `unsafe`. A list-shaped literal takes
fixed-array meaning from its declared spot:

```beans
var lanes: [f32; 4] = [1, 2, 3, 4]
lanes[0] = 9.0
```

## SIMD

SIMD vector families (`Simd4f32`, `Simd4i32`, `Simd16u8`, ...) are available
inside `unsafe`. A vector's name is its shape. See
[SIMD, arrays, slices](/reference/builtins/simd/) for the full operation set.

## Intrinsics and inline assembly

- `std.intrinsic` is a closed allowlist of named machine operations
  (`popcount`, `bswap32`, `sqrt`, `fma`, ...), each requiring `unsafe`. See
  [std.cpu and std.intrinsic](/reference/stdlib/cpu-intrinsic/).
- `std.asm` allows a small, per-architecture allowlist of assembly templates
  inside `unsafe`. See [std.asm](/reference/stdlib/asm/).

## Next

- [Foreign function interface](/guide/ffi/)
- [SIMD, arrays, slices](/reference/builtins/simd/)
- [Structs and unions](/guide/structs/)

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).

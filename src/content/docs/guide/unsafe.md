---
title: Unsafe and raw memory
description: The unsafe block, RawPtr, Slice, fixed arrays, SIMD, intrinsics, and inline assembly in Beans.
---

Most Beans code is safe: no null, checked indexing, and ownership the compiler
proves. When you need raw memory, for a device, a database page, or C interop,
you enter an `unsafe { }` block. Inside it, some low-level operations become
available, and their safety becomes **your** responsibility.

```beans
unsafe {
    let counters: RawPtr<Counter> = RawPtr.alloc(4)   // element type's alignment
    let page: RawPtr<Counter> = RawPtr.alloc_aligned(2, 4096)
    counters.write(new_value)
    counters.free()
}
```

`unsafe` gates the operation, not the function. There is no `unsafe fn`, so the
block always sits at the call site where the raw operation happens.

## RawPtr

`RawPtr<T>` is a raw typed pointer to primitive integer, float, bool,
raw-pointer, fixed-array, or `extern "C"` struct/union memory (these shapes can
nest).

Construct (all `unsafe`):

- `RawPtr.alloc(count)` gives zeroed unmanaged storage with the element type's
  own alignment.
- `RawPtr.alloc_aligned(count, align)` asks for a stricter alignment. `align`
  must be a power of two and never weaker than the element's own; both are
  checked at run time.
- `RawPtr.null()` and `RawPtr.from_address(addr)` build pointer values without
  allocating.

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
`RawPtr`, nested-array, or struct elements. `N` is an integer literal — decimal,
hex, binary, digit separators and all — or a module constant that folds to an
integer in that range, so `const LIMIT: int = 128` lets you write `[int; LIMIT]`.
Unlike raw pointers, fixed arrays
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

## A complete program

Allocate, write, read back, then free. Every raw step is inside the `unsafe`
block, and the one `alloc` is matched by one `free`:

<!-- beans:compile -->
```beans
import std.io

fn main() {
    unsafe {
        let cells: RawPtr<i32> = RawPtr.alloc(3)
        cells.write(10)
        cells.offset(1).write(20)
        cells.offset(2).write(30)

        let sum: i32 = cells.read() + cells.offset(1).read() +
                       cells.offset(2).read()
        io.println("sum {sum}")

        cells.free()
    }
}
```

Prefer a **fixed array** or a safe collection when you can: they give checked
indexing and automatic cleanup with no `unsafe`. Reach for `RawPtr` and `Slice`
only for device memory, a hand-laid file format, or
[C interop](/guide/ffi/), where the raw layout is the point.

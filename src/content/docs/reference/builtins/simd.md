---
title: SIMD, arrays, and pointers
description: The low-level built-in types for vector math, fixed arrays, slices, and raw pointers.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 7 types · 6 static methods · 31 instance methods.
<!-- coverage:summary:end -->

This page covers the low-level builtins: SIMD vectors, fixed-size arrays, slices,
and raw pointers. These are for tight, hardware-close code.

:::caution[Most of this needs unsafe]
SIMD, `Slice`, and `RawPtr` all require an `unsafe {}` block. Fixed arrays do not.
This page is a short reference. The full model, and every `RawPtr` detail, lives in
[the unsafe guide](/guide/unsafe/). For calling C, see [FFI](/guide/ffi/).
:::

## SIMD vectors

SIMD ("single instruction, multiple data") does the same math on several numbers at
once. Each SIMD type packs a fixed number of equal-typed numbers, called lanes.

A SIMD type is named `Simd` + lane count + element type, for example:

- `Simd4i32`: 4 lanes of `i32`
- `Simd16u8`: 16 lanes of `u8`
- `Simd2f64`: 2 lanes of `f64`
- `Simd4f32`: 4 lanes of `f32`

Element types are `i8`/`i16`/`i32`/`i64`, their `u` forms, and `f32`/`f64`. The
lane count is a power of two. Total width is 128 bits everywhere. A 256-bit width
needs CPU features, for example `Simd8i32` needs `--features +avx2`.

### Making a vector

| Constructor | Notes |
| --- | --- |
| `splat(x)` | every lane set to `x` |
| `of(...)` | one value per lane |
| `load(ptr)` | read lanes from memory |
| `load_unaligned(ptr)` | read from memory that may not be aligned |

### Lanes

| Method | Returns | Notes |
| --- | --- | --- |
| `lane(i)` | element | read lane `i` |
| `with_lane(i, v)` | vector | a copy with lane `i` set to `v` |
| `lane_count()` | `int` | how many lanes |

### Math

Arithmetic works lane by lane. You can use the operators `+ - * /` or the named
methods `add`, `sub`, `mul`, `div`, plus `min` and `max`.

Integer families also have `bit_and`, `bit_or`, `bit_xor`, `bit_not`, `shl`, and
`shr`.

### Comparisons and masks

The comparisons `eq`, `ne`, `lt`, `le`, `gt`, `ge` return a mask (a per-lane
true/false). With a mask you can:

- `mask.select(a, b)`: pick from `a` where true, else `b`
- `mask.any_true()`: is any lane true
- `mask.all_true()`: are all lanes true

### Reductions and storing

| Method | Notes |
| --- | --- |
| `sum()` | add all lanes |
| `product()` | multiply all lanes |
| `store(ptr)` | write lanes to memory |
| `store_unaligned(ptr)` | write to memory that may not be aligned |

A SIMD value cannot be a `Map` key: it has no `Hash`.

## Fixed arrays: [T; N]

`[T; N]` is a fixed inline array of `N` items of type `T`, where `1 <= N <= 4096`.
Unlike a `List`, it is not a handle: it copies by value.

- Indexing is checked (panics if out of range).
- You can assign an element when the binding is `var`.
- `array.len() -> int` gives `N`.
- Two arrays compare equal with `==`.
- You can loop over one with `for`.

A stable `for` loop reads the inline array directly when its item binding cannot
escape. If the loop can change the array, the compiler keeps the previous safe
snapshot behavior. This is an optimizer choice, not new array syntax.

A list literal takes on fixed-array meaning from the declared type:

```beans
var lanes: [f32; 4] = [1, 2, 3, 4]
lanes[0] = 9
let n: int = lanes.len()
```

## Slice&lt;T&gt;

`Slice<T>` is a non-owning view: a pointer plus a length. It does not own the data
it points at. All of its operations require `unsafe` and are bounds-checked.

```beans
Slice.from_raw(ptr, len)

Slice<T>.get(int) -> T
Slice<T>.set(int, T)
Slice<T>.subslice(int, int) -> Slice<T>
Slice<T>.as_ptr() -> RawPtr<T>
Slice<T>.len() -> int
```

- `Slice.from_raw(ptr, len)` makes a slice over `len` items at `ptr`. A non-empty
  slice rejects a null pointer.
- `get(i)` reads item `i` and `set(i, v)` writes it; `s[i]` does the same by index.
- `subslice(from, to)` is a smaller view over the same storage.
- `as_ptr()` hands back the underlying pointer; `len()` is the number of items.
- You can loop over a slice with `for`.

```beans
unsafe {
    let view: Slice<i32> = Slice.from_raw(ptr, 4)
    let first: i32 = view.get(0)
}
```

## RawPtr&lt;T&gt;

`RawPtr<T>` is a raw pointer to memory of type `T`. Every use is inside an
`unsafe {}` block. This is a brief list; see [the unsafe guide](/guide/unsafe/) for
the full detail and the rules you must follow.

Statics make or name a pointer:

```beans
RawPtr.alloc(count)
RawPtr.alloc_aligned(count, align)
RawPtr.null()
RawPtr.from_address(u64)
RawPtr.with_local(inout local, fn(RawPtr<T>))
```

- `alloc(count)` allocates room for `count` items; `alloc_aligned(count, align)`
  does the same with a chosen alignment.
- `null()` is a null pointer; `from_address(u64)` is a pointer at a raw address.
- `with_local(inout local, fn(RawPtr<T>))` runs your function with a raw pointer to
  a stack local. The pointer is valid only for that call.

The instance methods:

```beans
RawPtr<T>.read() -> T
RawPtr<T>.write(T)
RawPtr<T>.read_volatile() -> T
RawPtr<T>.write_volatile(T)
RawPtr<T>.offset(int) -> RawPtr<T>
RawPtr<T>.address() -> u64
RawPtr<T>.is_null() -> bool
RawPtr<T>.element_size() -> int
RawPtr<T>.element_align() -> int
RawPtr<T>.copy_from(RawPtr<T>, int)
RawPtr<T>.fill_zero(int)
RawPtr<T>.free()
RawPtr<T>.atomic_load() -> T
RawPtr<T>.atomic_store(T)
RawPtr<T>.atomic_fetch_add(T) -> T
RawPtr<T>.atomic_compare_exchange(T, T) -> bool
```

- `read`/`write` move a value in and out; the `_volatile` pair does the same
  without letting the compiler reorder or drop the access.
- `offset(n)` moves `n` items along; `address()` is the raw address and
  `is_null()` tells you whether the pointer is null.
- `element_size()` and `element_align()` are the size and alignment of `T`.
- `copy_from(src, n)` copies `n` items from `src`; `fill_zero(n)` zeros `n` items;
  `free()` releases memory that came from `alloc`.
- The `atomic_*` methods do sequentially consistent atomic access through the
  pointer.

```beans
unsafe {
    let p: RawPtr<i32> = RawPtr.alloc(4)
    p.write(7)
    let x: i32 = p.read()
    p.free()
}
```

## RawSlice

`RawSlice` is the untyped, two-word `{pointer, length}` value that backs a
`Slice<T>`. `Slice<T>` is the typed view you normally use; `RawSlice` is the
element-agnostic form the compiler and low-level code use for the same
pointer-plus-length shape. Like the other raw types it is only meaningful inside
`unsafe`, and `size_of(RawSlice)` folds to two pointers for the selected target.
Prefer `Slice<T>` in your own code, it carries the element type and
bounds-checks its accesses.

## A worked example

Four `f32` lanes multiplied and added, then stored through a `RawPtr` and read
back. Everything low-level here sits inside `unsafe`:

<!-- beans:compile -->
```beans
import std.io

fn main() {
    unsafe {
        let source: Simd4f32 = Simd4f32.of(1.0, 2.0, 3.0, 4.0)
        let scale: Simd4f32 = Simd4f32.splat(2.0)
        let result: Simd4f32 = source * scale + source
        io.println("lane0 {result.lane(0)} sum {result.sum()}")

        let memory: RawPtr<f32> = RawPtr.alloc(4)
        result.store(memory)
        let view: Slice<f32> = Slice.from_raw(memory, 4)
        io.println("view len {view.len()} first {view.get(0)}")
        memory.free()
    }
}
```

## See also

- [The unsafe guide](/guide/unsafe/), the full model and every `RawPtr` rule.
- [FFI](/guide/ffi/), calling C code.
- [Atomics](/reference/builtins/atomics/), the safe `Atomic<T>` type.

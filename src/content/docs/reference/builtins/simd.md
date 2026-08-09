---
title: SIMD, arrays, and pointers
description: The low-level built-in types for vector math, fixed arrays, slices, and raw pointers.
---

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

- `Simd4i32` — 4 lanes of `i32`
- `Simd16u8` — 16 lanes of `u8`
- `Simd2f64` — 2 lanes of `f64`
- `Simd4f32` — 4 lanes of `f32`

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

- `mask.select(a, b)` — pick from `a` where true, else `b`
- `mask.any_true()` — is any lane true
- `mask.all_true()` — are all lanes true

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
- `len()` gives `N`.
- Two arrays compare equal with `==`.
- You can loop over one with `for`.

A list literal takes on fixed-array meaning from the declared type:

```beans
var lanes: [f32; 4] = [1, 2, 3, 4]
lanes[0] = 9
let n: int = lanes.len()
```

## Slice&lt;T&gt;

`Slice<T>` is a non-owning view: a pointer plus a length. It does not own the data
it points at. All of its operations require `unsafe` and are bounds-checked.

| Member | Notes |
| --- | --- |
| `Slice.from_raw(ptr, len)` | make a slice over `len` items at `ptr` |
| `get(i)` | read item `i` |
| `set(i, v)` | write item `i` |
| indexing | `s[i]` read and write |
| `subslice(from, to)` | a smaller view |
| `as_ptr()` | the underlying pointer |
| iteration | loop with `for` |

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

| Member | Notes |
| --- | --- |
| `RawPtr.alloc(count)` | allocate room for `count` items |
| `RawPtr.alloc_aligned(count, align)` | allocate with a given alignment |
| `RawPtr.null()` | a null pointer |
| `RawPtr.from_address(u64)` | a pointer at a raw address |
| `read()` | read the value |
| `write(v)` | write a value |
| `read_volatile()` / `write_volatile(v)` | volatile read/write |
| `offset(n)` | move `n` items along |
| `address()` | `-> u64`, the raw address |
| `is_null()` | is it null |
| `element_size()` / `element_align()` | size and alignment of `T` |
| `copy_from(src, n)` | copy `n` items from `src` |
| `fill_zero(n)` | zero `n` items |
| `free()` | release allocated memory |
| `atomic_load` / `atomic_store` / `atomic_compare_exchange` / `atomic_fetch_add` | atomic access |

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
Prefer `Slice<T>` in your own code — it carries the element type and
bounds-checks its accesses.

## See also

- [The unsafe guide](/guide/unsafe/) — the full model and every `RawPtr` rule.
- [FFI](/guide/ffi/) — calling C code.
- [Atomics](/reference/builtins/atomics/) — the safe `Atomic<T>` type.

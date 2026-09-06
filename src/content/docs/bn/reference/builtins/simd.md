---
title: SIMD, arrays, and pointers
description: vector math, fixed array, slice, আর raw pointer-এর নিচু-স্তরের builtin type গুলো।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 7 types · 6 static methods · 31 instance methods.
<!-- coverage:summary:end -->

এই পেজে নিচু-স্তরের builtin গুলো আছে: SIMD vector, fixed-size array, slice, আর raw
pointer। এগুলো টাইট, hardware-ঘেঁষা কোডের জন্য।

:::caution[এর বেশিরভাগেই unsafe লাগে]
SIMD, `Slice`, আর `RawPtr` — সবগুলোরই একটা `unsafe {}` block লাগে। Fixed array-এর
লাগে না। এই পেজটা একটা ছোট reference। পুরো model, আর `RawPtr`-এর প্রতিটা খুঁটিনাটি
আছে [unsafe guide](/bn/guide/unsafe/)-এ। C call করার জন্য [FFI](/bn/guide/ffi/) দেখুন।
:::

## SIMD vector

SIMD ("single instruction, multiple data") একই math কয়েকটা number-এর ওপর একসাথে
করে। প্রতিটা SIMD type একই type-এর নির্দিষ্ট সংখ্যক number প্যাক করে, এগুলোকে বলে
lane।

একটা SIMD type-এর নাম হয় `Simd` + lane count + element type, যেমন:

- `Simd4i32`: `i32`-এর 4টা lane
- `Simd16u8`: `u8`-এর 16টা lane
- `Simd2f64`: `f64`-এর 2টা lane
- `Simd4f32`: `f32`-এর 4টা lane

Element type হলো `i8`/`i16`/`i32`/`i64`, এদের `u` রূপ, আর `f32`/`f64`। lane count
হলো দুইয়ের কোনো power। মোট চওড়া সব জায়গায় 128 bit। 256-bit চওড়ার জন্য CPU feature
লাগে, যেমন `Simd8i32`-এর জন্য `--features +avx2` লাগে।

### একটা vector বানানো

| Constructor | নোট |
| --- | --- |
| `splat(x)` | প্রতিটা lane-কে `x` করা হয় |
| `of(...)` | প্রতি lane-এ একটা করে value |
| `load(ptr)` | memory থেকে lane পড়া |
| `load_unaligned(ptr)` | এমন memory থেকে পড়া যেটা align না-ও থাকতে পারে |

### Lane

| Method | দেয় | নোট |
| --- | --- | --- |
| `lane(i)` | element | lane `i` পড়ে |
| `with_lane(i, v)` | vector | একটা copy, যার lane `i`-তে `v` বসানো |
| `lane_count()` | `int` | কতগুলো lane |

### Math

Arithmetic lane ধরে ধরে হয়। `+ - * /` operator ব্যবহার করা যায়, বা নাম-ধরা
method `add`, `sub`, `mul`, `div`, আর সাথে `min` ও `max`।

Integer family গুলোর `bit_and`, `bit_or`, `bit_xor`, `bit_not`, `shl`, আর `shr`-ও
আছে।

### Comparison আর mask

`eq`, `ne`, `lt`, `le`, `gt`, `ge` comparison গুলো একটা mask দেয় (প্রতি lane-এ একটা
true/false)। mask দিয়ে যা করা যায়:

- `mask.select(a, b)`: যেখানে true সেখানে `a` থেকে নেয়, নয়তো `b`
- `mask.any_true()`: কোনো lane কি true
- `mask.all_true()`: সব lane কি true

### Reduction আর store

| Method | নোট |
| --- | --- |
| `sum()` | সব lane যোগ করে |
| `product()` | সব lane গুণ করে |
| `store(ptr)` | lane গুলো memory-তে লেখে |
| `store_unaligned(ptr)` | এমন memory-তে লেখে যেটা align না-ও থাকতে পারে |

একটা SIMD value কোনো `Map`-এর key হতে পারে না: এর কোনো `Hash` নেই।

## Fixed array: [T; N]

`[T; N]` হলো `T` type-এর `N`টা item-এর একটা fixed inline array, যেখানে
`1 <= N <= 4096`। `List`-এর মতো এটা কোনো handle না: এটা value ধরে copy হয়।

`N` একটা integer literal — decimal, hex, binary, digit separator সবই চলে —
কিংবা এমন একটা module constant যেটা ওই সীমার ভেতরের integer-এ fold হয়, তাই
`const LIMIT: int = 128` লিখলে `[int; LIMIT]` লেখা যায়। তবে `const` কোনো
parameter default হতে পারে না; ওটা আলাদা stage-এ পড়া হয়।

- Indexing checked (সীমার বাইরে হলে panic করে)।
- binding `var` হলে একটা element assign করা যায়।
- `array.len() -> int` `N` দেয়।
- দুইটা array `==` দিয়ে সমান কিনা তুলনা হয়।
- `for` দিয়ে একটার ওপর loop করা যায়।

একটা স্থির `for` loop inline array-টা সরাসরি পড়ে, যখন তার item binding বাইরে
বেরোতে পারে না। loop-টা যদি array বদলাতে পারে, তাহলে compiler আগের নিরাপদ snapshot
আচরণটাই রাখে। এটা একটা optimizer-এর সিদ্ধান্ত, নতুন কোনো array syntax না।

একটা list literal তার declared type থেকে fixed-array রূপ নেয়:

```beans
var lanes: [f32; 4] = [1, 2, 3, 4]
lanes[0] = 9
let n: int = lanes.len()
```

## Slice&lt;T&gt;

`Slice<T>` হলো মালিকানা-ছাড়া একটা view: একটা pointer আর একটা length। এটা যে data-র
দিকে তাকায় তার মালিক না। এর সব operation-এর জন্য `unsafe` লাগে আর সবগুলো
bounds-checked।

```beans
Slice.from_raw(ptr, len)

Slice<T>.get(int) -> T
Slice<T>.set(int, T)
Slice<T>.subslice(int, int) -> Slice<T>
Slice<T>.as_ptr() -> RawPtr<T>
Slice<T>.len() -> int
```

- `Slice.from_raw(ptr, len)` `ptr`-এ থাকা `len`টা item-এর ওপর একটা slice বানায়।
  একটা non-empty slice null pointer বাতিল করে দেয়।
- `get(i)` item `i` পড়ে আর `set(i, v)` সেটা লেখে; `s[i]` index দিয়ে একই কাজ করে।
- `subslice(from, to)` একই storage-এর ওপর একটা ছোট view।
- `as_ptr()` নিচের pointer-টা ফেরত দেয়; `len()` হলো item-এর সংখ্যা।
- `for` দিয়ে একটা slice-এর ওপর loop করা যায়।

```beans
unsafe {
    let view: Slice<i32> = Slice.from_raw(ptr, 4)
    let first: i32 = view.get(0)
}
```

## RawPtr&lt;T&gt;

`RawPtr<T>` হলো `T` type-এর memory-র দিকে একটা raw pointer। এর প্রতিটা ব্যবহার একটা
`unsafe {}` block-এর ভেতরে। এটা একটা সংক্ষিপ্ত তালিকা; পুরো খুঁটিনাটি আর যেসব নিয়ম
মানতে হবে সেগুলোর জন্য [unsafe guide](/bn/guide/unsafe/) দেখুন।

Static গুলো একটা pointer বানায় বা নাম দেয়:

```beans
RawPtr.alloc(count)
RawPtr.alloc_aligned(count, align)
RawPtr.null()
RawPtr.from_address(u64)
RawPtr.with_local(inout local, fn(RawPtr<T>))
```

- `alloc(count)` `count`টা item-এর জায়গা নেয়; `alloc_aligned(count, align)` একই
  কাজ করে, তবে একটা বেছে নেওয়া alignment দিয়ে।
- `null()` একটা null pointer; `from_address(u64)` একটা raw address-এ একটা pointer।
- `with_local(inout local, fn(RawPtr<T>))` একটা stack local-এর দিকে একটা raw
  pointer দিয়ে দেওয়া function চালায়। pointer-টা শুধু সেই call-এর জন্যই valid।

Instance method গুলো:

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

- `read`/`write` একটা value ভেতরে-বাইরে সরায়; `_volatile` জোড়াটা একই কাজ করে, তবে
  compiler-কে access-টা reorder বা বাদ দিতে না দিয়ে।
- `offset(n)` `n`টা item সামনে সরায়; `address()` হলো raw address আর `is_null()`
  বলে দেয় pointer null কিনা।
- `element_size()` আর `element_align()` হলো `T`-এর size আর alignment।
- `copy_from(src, n)` `src` থেকে `n`টা item copy করে; `fill_zero(n)` `n`টা item শূন্য
  করে; `free()` `alloc` থেকে আসা memory ছেড়ে দেয়।
- `atomic_*` method গুলো pointer দিয়ে sequentially consistent atomic access করে।

```beans
unsafe {
    let p: RawPtr<i32> = RawPtr.alloc(4)
    p.write(7)
    let x: i32 = p.read()
    p.free()
}
```

## RawSlice

`RawSlice` হলো সেই untyped, দুই-word-এর `{pointer, length}` value যেটা একটা
`Slice<T>`-এর নিচে থাকে। `Slice<T>` হলো typed view যেটা সাধারণত ব্যবহার করা হয়;
`RawSlice` হলো element-নিরপেক্ষ রূপ, যেটা একই pointer-plus-length আকারের জন্য
compiler আর নিচু-স্তরের কোড ব্যবহার করে। বাকি raw type গুলোর মতো এটাও শুধু `unsafe`-এর
ভেতরে অর্থ বহন করে, আর নির্বাচিত target-এর জন্য `size_of(RawSlice)` দুইটা pointer-এ
নেমে আসে। নিজের কোডে `Slice<T>`-ই বেছে নেওয়া উচিত, কারণ এটা element type বহন করে আর
তার access গুলো bounds-check করে।

## একটা সাজানো উদাহরণ

চারটা `f32` lane গুণ আর যোগ করা, তারপর একটা `RawPtr` দিয়ে store করে আবার পড়া।
এখানকার সব নিচু-স্তরের জিনিস `unsafe`-এর ভেতরে বসে আছে:

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

## আরও দেখুন

- [unsafe guide](/bn/guide/unsafe/), পুরো model আর প্রতিটা `RawPtr` নিয়ম।
- [FFI](/bn/guide/ffi/), C code call করা।
- [Atomics](/bn/reference/builtins/atomics/), নিরাপদ `Atomic<T>` type।

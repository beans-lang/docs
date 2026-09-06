---
title: Unsafe and raw memory
description: Beans-এ unsafe block, RawPtr, Slice, fixed array, SIMD, intrinsic আর inline assembly।
---

Beans-এর বেশিরভাগ কোডই safe: কোনো null নেই, indexing check করা, আর ownership
compiler নিজে প্রমাণ করে। যখন raw memory লাগে — কোনো device, কোনো
database page, বা C interop-এর জন্য — তখন একটা `unsafe { }` block-এ
ঢুকতে হয়। তার ভেতরে কিছু নিচু-স্তরের operation খুলে যায়, আর সেগুলোর safety
নিশ্চিত করার দায় তখন **আপনার**।

```beans
unsafe {
    let counters: RawPtr<Counter> = RawPtr.alloc(4)   // element type's alignment
    let page: RawPtr<Counter> = RawPtr.alloc_aligned(2, 4096)
    counters.write(new_value)
    counters.free()
}
```

`unsafe` operation-টাকে আটকায়, function-কে না। কোনো `unsafe fn` নেই, তাই
block-টা সবসময় ঠিক সেই call site-এই বসে যেখানে raw operation-টা ঘটছে।

## RawPtr

`RawPtr<T>` হলো primitive integer, float, bool, raw-pointer, fixed-array বা
`extern "C"` struct/union memory-র দিকে একটা raw typed pointer (এই গড়নগুলো
একটার ভেতর আরেকটা nest হতে পারে)।

বানানো (সবই `unsafe`):

- `RawPtr.alloc(count)` element type-এর নিজের alignment-এ শূন্য-করা unmanaged
  storage দেয়।
- `RawPtr.alloc_aligned(count, align)` কড়া একটা alignment চায়। `align`
  দুইয়ের ঘাত হতে হবে আর element-এর নিজেরটার চেয়ে দুর্বল না; দুটোই run
  time-এ check হয়।
- `RawPtr.null()` আর `RawPtr.from_address(addr)` কিছু allocate না করেই pointer
  value বানায়।

Method (সবই `unsafe`): `read()`, `write(v)`, `read_volatile()`,
`write_volatile(v)`, `offset(n)`, `address()`, `is_null()`, `element_size()`,
`element_align()`, `copy_from(src, n)` (overlap হলেও নিরাপদ), `fill_zero(n)`,
`free()`। integer আর bool pointer sequentially-consistent `atomic_load`,
`atomic_store`, `atomic_compare_exchange`-ও দেয়; integer pointer সাথে যোগ
করে `atomic_fetch_add` (পুরনো value ফেরত দেয়)।

lifetime, bound, alignment, address-এর বৈধতা, আর প্রতিটা `alloc`-কে একটা
`free`-এর সাথে মেলানো — সব দায় আপনার। null-এর উপর কোনো memory operation
করলে panic; বাকি সব আপনার দায়িত্ব। raw pointer copy করা যায়, তাই একটা alias
free করলে বাকিগুলো ঝুলে থাকে।

`RawPtr.with_local(inout value, fn(pointer: RawPtr<T>) { ... })` closure-টা
চলার সময়টুকুর জন্য একটা stack value-র দিকে একটা pointer ধার দেয়।

## Slice

`Slice<T>` হলো raw-compatible memory-র উপর একটা মালিকানা-হীন `{pointer,
length}` view। `Slice.from_raw(ptr, len)`, `get`, `set`, indexing,
`subslice`, `as_ptr` আর iteration — সবের জন্য `unsafe` লাগে; read আর write
bound-check করা। কোনো non-empty slice একটা null pointer নাকচ করে। পেছনের
allocation-টা জীবিত রাখতে হবে, আর `free`-এর পরে view-টা ব্যবহার করা যাবে না।

## Fixed array

`[T; N]` হলো একটা fixed-size inline array (`1 <= N <= 4096`), যার element
হয় inline scalar, `RawPtr`, nested-array বা struct। `N` একটা integer literal —
decimal, hex, binary, digit separator সবই চলে — কিংবা এমন একটা module constant
যেটা ওই সীমার ভেতরের integer-এ fold হয়, তাই `const LIMIT: int = 128` লিখলে
`[int; LIMIT]` লেখা যায়। raw pointer-এর উল্টো,
fixed array **safe**: index check করা, `var` local-এ element assign করা,
`len()`, equality আর `for` iteration — সবই কোনো `unsafe` ছাড়া। list-আকৃতির
কোনো literal তার ঘোষিত জায়গা থেকেই fixed-array হিসেবে ধরা হয়:

```beans
var lanes: [f32; 4] = [1, 2, 3, 4]
lanes[0] = 9.0
```

## SIMD

SIMD vector পরিবার (`Simd4f32`, `Simd4i32`, `Simd16u8`, ...) `unsafe`-এর
ভেতরে পাওয়া যায়। একটা vector-এর নামই তার গড়ন। পুরো operation set-এর জন্য
দেখুন [SIMD, array, slice](/bn/reference/builtins/simd/)।

## Intrinsic আর inline assembly

- `std.intrinsic` হলো নাম-দেওয়া machine operation-এর একটা বন্ধ allowlist
  (`popcount`, `bswap32`, `sqrt`, `fma`, ...), প্রতিটার জন্য `unsafe` লাগে।
  দেখুন [std.cpu আর std.intrinsic](/bn/reference/stdlib/cpu-intrinsic/)।
- `std.asm` `unsafe`-এর ভেতরে প্রতি-architecture-এর একটা ছোট assembly
  template allowlist দেয়। দেখুন [std.asm](/bn/reference/stdlib/asm/)।

## একটা পুরো program

allocate করা হয়, লেখা হয়, আবার পড়া হয়, তারপর free করা হয়। প্রতিটা raw ধাপ `unsafe`
block-এর ভেতরে, আর সেই একটা `alloc`-কে একটা `free` মিলিয়ে দেয়:

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

যখন সম্ভব, একটা **fixed array** বা একটা safe collection বেছে নিন: এরা কোনো
`unsafe` ছাড়াই index check আর নিজে নিজে cleanup দেয়। `RawPtr` আর `Slice`
ব্যবহার করুন শুধু device memory, নিজে হাতে সাজানো কোনো file format, বা
[C interop](/bn/guide/ffi/)-এর জন্য — যেখানে raw layout-টাই আসল কথা।

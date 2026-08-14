---
title: C interop (FFI)
description: examples/ffi.b লাইন ধরে ধরে ঘুরে দেখা — Beans থেকে C call করা, সাথে C struct layout আর চলতে চলতে একটা library load করা।
---

Beans সরাসরি C call করতে পারে। মূল উদাহরণটা হলো
[`ffi.b`](https://github.com/beans-lang/beans/blob/main/examples/ffi.b): এটা
কয়েকটা libc function ঘোষণা করে আর সেগুলো call করে, আর একটা `unsafe` block-এর ভেতরে
raw pointer ব্যবহার করে। এই পেজটা এটাকে লাইন ধরে ঘুরে দেখায়, তারপর সম্পর্কিত দুইটা
উদাহরণ দেখিয়ে দেয়।

## ffi.b

### C function ঘোষণা করা

```beans
import std.io

extern "C" fn llabs(value: i64) -> i64
extern "C" fn fabs(value: f64) -> f64
extern "C" fn fabsf(value: f32) -> f32
extern "C" fn ldexp(value: f64, exponent: i32) -> f64
extern "C" fn ldexpf(value: f32, exponent: i32) -> f32
```

`extern "C" fn` এমন একটা function ঘোষণা করে যেটা C-তে থাকে, Beans-এ না। এর কোনো
body নেই: compiler-কে শুধু নাম আর signature-টা বলে দেওয়া হয়, আর সে build-এর সময়
C library-র সাথে link করে নেয় (কিংবা interpreter-এ `dlsym` দিয়ে খুঁজে বের করে)।
type-গুলো size-সহ: `i64`, `f64`, `f32`, `i32`। এগুলো libc-র math function
(`llabs` হলো long-long-এর absolute value, `ldexp` দুইয়ের একটা power দিয়ে গুণ করে)।

### একটা unsafe block-এ raw memory

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

`RawPtr<u8>` হলো একটা raw pointer: unmanaged memory, যেটা compiler track
করে না। এই জন্যই এখানকার সবকিছু `unsafe { ... }`-এর ভেতরে: দায়িত্বটা নিজের হাতেই
থাকে। `RawPtr.alloc(5)` ৫ byte allocate করে। `write(65)` একটা byte store করে
(৬৫ হলো ASCII `A`), আর `offset(n)` pointer-টাকে সামনে `n` element এগিয়ে নেয়। শেষ
byte-টা `0` করে দেওয়া — একটা C string-এর শেষ চিহ্ন।

### সেটা আবার পড়া

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

`read()` একটা byte আবার load করে; `as int` সেটাকে চওড়া করে দেয়, যাতে যোগফলটা একটা
`int` হয়। `checksum` চারটা `A` byte যোগ করে (৬৫ × ৪ = ২৬০)। তারপর তিনটা
`io.println` লাইন সরাসরি C function-গুলো call করে, raw-pointer-এর ফলাফলের সাথে মিশিয়ে।
pointer-রা `==` দিয়ে তুলনা হয়, তাই `returned == memory` হয় `true`।

শেষ লাইনটাই সেই নিয়ম যেটা কখনো ভোলা যাবে না: `memory.free()` `RawPtr.alloc` যা
দিয়েছিল সেটা ছেড়ে দেয়। raw memory reference-counted না, তাই এটা নিজে হাতেই free করতে হয়।

ফাইলের নিজের comment বলে দেয় এটা কেন `memset` এড়িয়ে চলে: একটা পুরনো version-এ
`memset`-এর `size_t`-কে `u64` বলে ঘোষণা করা ছিল, যেটা প্রতিটা 32-bit target-এ ভুল
ঘোষণা। একটা `extern "C"` signature ভুল করা একটা আসল ফাঁদ, কারণ যা লেখা হয়
compiler সেটাই বিশ্বাস করে।

চালান:

```bash
beansc run examples/ffi.b
```

## C struct layout: c_layout_structs.b

[`c_layout_structs.b`](https://github.com/beans-lang/beans/blob/main/examples/c_layout_structs.b)
দেখায় `extern "C" struct` — এমন একটা struct যেটা একদম একটা C compiler যেভাবে
সাজাত ঠিক সেভাবেই সাজানো, তাই এটা C-তে পাঠানো আর C থেকে আনা যায়:

```beans
extern "C" struct Packet {
    tag: u8
    count: u32
    ratio: f32
    live: bool
}
```

একটা `extern "C" struct` হলো একটা value type, তবে C-র field order, padding, আর
alignment সহ। উদাহরণটা এই struct-গুলো value দিয়ে কপি করে, কপিগুলো mutate করে,
`==` দিয়ে তুলনা করে, আর raw memory-তে রাখে। এর সঙ্গী
[`c_layout_unions.b`](https://github.com/beans-lang/beans/blob/main/examples/c_layout_unions.b)
`extern "C"` union-এর জন্য ঠিক একই কাজ করে।

## চলতে চলতে একটা library load করা: dynamic_library.b

[`dynamic_library.b`](https://github.com/beans-lang/beans/blob/main/examples/dynamic_library.b)
program চলা অবস্থায় একটা shared library খোলে আর একটা address দিয়ে একটা function
call করে — `std.dylib` আর `std.dl` ব্যবহার করে:

```beans
let lib: dylib.Dylib = dylib.Dylib.open(path)?
let present: bool = lib.has("plug_add")
let add: dylib.Symbol = lib.find("plug_add")?

unsafe {
    io.println("two arguments give {dl.call2(add.address, 40, 2)}")
}
```

ফাইলের header থেকে দুইটা নিয়ম:

- **খোঁজা নিরাপদ; call করা না।** `lib.has(...)` আর `lib.find(...)`-এর জন্য
  `unsafe` লাগে না। শুধু একটা address-এ *call* করার জন্যই লাগে, কারণ একটা symbol
  একটা address ছাড়া কিছু না: এটা কী argument নেয় সেটা প্রমাণ করার মতো কিছুই
  এর মধ্যে নেই, আর আন্দাজ ভুল হলে stack নষ্ট হয়ে যায়। তাই call-টা সোজা `std.dl`-এ
  যায়, একটা দেখা-যায়-এমন `unsafe` block-এর ভেতরে; একে লুকিয়ে রাখার কোনো wrapper নেই।
- **library-টা `RTLD_LOCAL` হিসেবে খোলে**, তাই এর symbol কখনো global namespace-এ
  লিক করে না — যেখানে একটা `extern "C" fn` খুঁজত।

একটা library binary যেহেতু repo-তে commit করা যায় না, এই উদাহরণটা তার path নেয়
`BEANS_DYLIB_EXAMPLE` environment variable থেকে। ওটা না থাকলেও উদাহরণটা প্রতিটা
failure-এর পথ ঠিকই ঘুরে দেখায়।

[Foreign function interface](/bn/guide/ffi/) হলো FFI-র গাইড, আর
[Unsafe আর raw memory](/bn/guide/unsafe/)-তে `unsafe` আর `RawPtr` কী সেটা
বোঝানো আছে। [std.dylib](/bn/reference/stdlib/dylib/)-এ চলতে চলতে library load করা
নিয়ে লেখা আছে, আর [bindgen](/bn/tools/bindgen/) C header থেকে `extern "C"` ঘোষণা
generate করে দেয়।

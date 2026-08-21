---
title: Foreign function interface
description: C function call করা আর export করা, C-layout record, callback, global, আর beansc bindgen দিয়ে binding বানানো।
---

Beans-এর একটা পুরো C ABI আছে: এটা C function call করতে পারে, C function
export করতে পারে, C-layout record বর্ণনা করতে পারে, callback পাস করতে পারে,
আর C global পড়তে পারে। platform-এর ABI lowering-এর মালিক Clang, তাই Beans
target-এর আসল C নিয়মের সাথেই মেলে।

## একটা C function ঘোষণা আর call করা

`extern "C" fn` একটা mangle-না-করা host C symbol ঘোষণা করে। call-এর জন্য
`unsafe` লাগে।

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

ABI যত খুশি integer, `bool`, `RawPtr`, `CFunctionPtr`, `f32`, `f64` বা
`extern "C"` struct/union argument সামলায় আর একই return type (অথবা কোনো
return না), এমনকি প্রতিটা register bank পেরিয়ে যাওয়া argument-ও। aggregate-এর
ভেতরে nested C-layout record আর fixed array থাকতে পারে।

`as "native_name"` কোনো import-কে একটা আলাদা C symbol নাম দেয়।

## একটা C function export করা

body আছে এমন একটা `pub extern "C" fn` তার নামটা C caller-দের জন্য export
করে। শুধু C-safe parameter আর result মানা হয়:

```beans
pub extern "C" fn add(a: i32, b: i32) -> i32 {
    return a + b
}
```

একটা C-মুখী library তৈরি করা হয় `beansc build --emit static --header api.h
file.b` দিয়ে। দেখুন [Building](/bn/tools/build/)।

## C-layout record

[`extern "C"` struct আর union](/bn/guide/structs/) ব্যবহার করা হয়, যাতে layout
হুবহু C-এর সাথে মেলে। এগুলো `RawPtr` আর `Slice` দিয়ে পড়া-লেখা করা যায়, আর
সীমানার এপার-ওপার value ধরে পাস করা যায়। `extern "C" opaque struct Handle`
এমন একটা অসম্পূর্ণ type ঘোষণা করে যেটা শুধু `RawPtr`-এর পেছনেই ছোঁয়া
যায়।

## Callback

- একটা **ধার-করা callback** হলো কোনো `extern "C" fn`-এর একটা `fn(...)`
  parameter। এটা C-কে ধার দেওয়া হয় শুধু সেই একটা call-এর সময়টুকুর জন্য, তাই
  একটা Beans closure সরাসরি পাস করা যায় আর lifetime নিয়ে কোনো প্রশ্নই ওঠে
  না। C একে store করতে পারবে না, বা অন্য thread থেকে call করতে পারবে না।
- C যে callback পরে **store** করে বা call করে, তার জন্য `StoredCallback<F>`
  লাগে: `StoredCallback.create(userdata_index, closure)`। কোনো ধার-করা
  parameter-এ `function()` পাস করা হয়, C যখন address-টা একটা `CFunctionPtr<F>`
  field-এ store করে তখন `function_pointer()`, আর আলাদা userdata pointer-এর
  জন্য `context()`। capture-গুলোকে `Send + Sync` হতে হবে। আগে unregister করা হয়,
  তারপর `close()` (যেটা চালু call-গুলোর জন্য অপেক্ষা করে)। value-টা
  move-only।
- library যে callback store করে কিন্তু **সবসময় register করা thread-এই invoke
  করে** — C event-loop-এর সবচেয়ে চেনা চেহারা — তার জন্য আলাদা
  `LocalStoredCallback<F>` type আর
  `LocalStoredCallback.create(userdata_index, closure)`। capture-এ কোনো
  বাধা নেই (`Send` না, `Sync`-ও না): register করার thread-টা রেকর্ড হয়ে থাকে,
  আর অন্য কোনো thread থেকে invoke করলে সেটা data race নয় — একটা checked
  runtime abort। `function()` / `function_pointer()` / `context()` surface
  একই, আর unregister-তারপর-`close()` নিয়মও একই।
- **`CFunctionPtr<F>`** হলো C function-pointer storage, এক pointer চওড়া
  কিন্তু `RawPtr` আর Beans function value — দুটো থেকেই আলাদা। এটা C-layout
  record, extern global, parameter, return আর বানানো header-এ বৈধ।
  `CFunctionPtr.null()`, `is_null()`, আর একটা `unsafe` `call(...)`।

## Global, TLS আর errno

C data symbol-এর জন্য `extern "C" let`, `extern "C" var`, বা
`extern "C" thread_local var` — সাথে ঐচ্ছিক `as "native_name"`। read আর
write-এর জন্য `unsafe` লাগে। Hosted program কোনো platform-এর errno বানান
ধরে না নিয়ে `std.c.errno()` আর `std.c.set_errno(value)` ব্যবহার করে।

## Binding বানানো

`beansc bindgen header.h -o bindings.b` Clang-এর কাছে বেছে নেওয়া target-এর
JSON AST চায় আর Beans C declaration বের করে দেয়:

```bash
beansc bindgen vendor/api.h -o api_bindings.b --package main -- -Ivendor/include
beansc check api_bindings.b
```

এটা typedef, record, union, array, enum, global, TLS, function আর function
pointer সামলায় — target-এর আসল scalar width-সহ। strict mode-এ এটা এমন
construct **নাকচ** করে যার ABI হুবহু বানানো যায় না (varargs, bitfield,
flexible array, anonymous record, non-default calling convention, `_Atomic`
member, packed/aligned record) আর এমন type যার হুবহু Beans সমতুল্য নেই
(`long double`, 128-bit int, `_Complex`, `_BitInt`)। `--allow-unsupported`
ব্যর্থ না হয়ে প্রতিটা unsafe declaration আর তার উপর নির্ভরশীল জিনিস বাদ দিয়ে
দেয়। দেখুন [bindgen](/bn/tools/bindgen/)।

## Dynamic library

Run time-এ একটা shared library load করতে চাইলে
[`std.dylib`](/bn/reference/stdlib/dylib/) ব্যবহার করা হয়। resolve করা কোনো
address call করতে `unsafe` লাগে আর প্রতি argument-এ এক machine word যায়।

## Signature ঠিক রাখা

যে signature ঘোষণা করা হয় Beans সেটাই বিশ্বাস করে আর তার জন্য target-এর আসল
C ABI-এর সাথে মেলায়। ওই ঘোষণাকে আসল C function-এর সাথে সে মিলিয়ে দেখতে পারে
না, তাই একটা ভুল argument type, ভুল সংখ্যা বা ভুল return type সীমানায়
undefined behavior — কোনো compile error না। `beansc bindgen` (উপরে) দিয়ে
declaration বানালে সেগুলো হুবহু থাকে, আর strict mode-এ এটা এমন যেকোনো
construct আন্দাজ না করে বরং নাকচ করে যার ABI হুবহু বানানো যায় না।

C-layout record যায় [struct আর union](/bn/guide/structs/)-এর ভেতর দিয়ে, আর
যেসব raw pointer দিয়ে সেগুলো পড়া-লেখা করা হয় সেগুলো আছে
[unsafe আর raw memory](/bn/guide/unsafe/)-তে।

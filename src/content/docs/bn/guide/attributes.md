---
title: Attributes and modifiers
description: visibility, OOP, layout, ownership আর CPU feature-এর জন্য Beans-এর built-in modifier।
---

Beans-এ typed metadata-র জন্য নিজের [annotation](/bn/guide/annotations/) আছে,
আর সাথে অল্প কিছু built-in **declaration modifier**। modifier হলো এমন শব্দ
যেগুলো কোনো declaration-এর আগে বসে আর ভাষার আচরণ বদলে দেয় — যেমন visibility,
layout, ownership বা CPU-এর দরকার। এই পেজে সেই modifier-গুলোই তালিকা করা।

## Visibility

- **`pub`** কোনো declaration বা field-কে তার package-এর বাইরে public করে
  দেয়। চিহ্ন না দেওয়া নাম শুধু নিজের package-এই দেখা যায়।
- **`priv`** কোনো class বা struct-এর field বা method-এ খাটে। শুধু ঘোষণা করা
  type-এর ভেতরের কোডই এতে ঢুকতে পারে — এমনকি অন্য কোড একই package-এ থাকলেও।
  এটা static আর `inout` method-এর সাথেও চলে। কোনো `protected` visibility
  নেই।

package visibility-র জন্য দেখুন [Source file আর module](/bn/guide/modules/)।

## Class আর method

- **`abstract class`** এমন একটা class ঘোষণা করে যেটা construct করা যায় না।
  এর ভেতরে body-হীন **`abstract fn`** method থাকতে পারে।
- **`singleton class`** একটাই eager instance ঘোষণা করে, যেটা `Type.instance`
  দিয়ে পড়া হয়।
- **`static`** একটা class field, অথবা type-এর মালিকানার একটা class/struct
  method ঘোষণা করে। static member-এর কোনো `self` নেই।
- **`override`** লাগে যখন কোনো concrete বা abstract base-class method
  বদলানো হয়, বা কোনো interface method যার একটা default body আছে। কোনো body-হীন
  interface requirement-এর প্রথম implementation-এর জন্য এটা ঐচ্ছিক।
- কোনো private method `abstract` বা `override` হতে পারে না, আর কোনো interface
  একটা ঘোষণা করতে পারে না।

দেখুন [Class](/bn/guide/classes/) আর
[Interface, abstract class আর inheritance](/bn/guide/interfaces/)।

## C interop

- **`extern "C"`** একটা C-ABI entity ঘোষণা করে: একটা struct, union, function,
  global বা thread-local। দেখুন [Foreign function interface](/bn/guide/ffi/)।
- **`opaque`** যায় `extern "C" opaque struct Handle`-এর সাথে, একটা অসম্পূর্ণ
  C type ঘোষণা করতে — যেটা শুধু `RawPtr`-এর পেছনেই বৈধ।

## Layout modifier

দুটো modifier **শুধু** `extern "C"` struct আর union-এ খাটে। byte সরায় এমন
কোনো modifier তখনই অর্থপূর্ণ যখন layout-টা fixed C layout — আর সেটাই
`extern "C"` কথা দেয়:

- **`packed`** field-এর মাঝে প্রতিটা byte padding সরিয়ে দেয়।
- **`align(N)`** কোনো record-এর alignment বাড়ায়, অথবা একটা field-এর। `N`
  দুইয়ের ঘাত হতে হবে, আর target-এর সর্বোচ্চের (4096) চেয়ে বড় না।

```beans
pub extern "C" packed struct Header { kind: u8  length: u32  checksum: u32 }
extern "C" align(64) struct Counter { hits: u32 }
extern "C" struct Slot { tag: u8  align(16) payload: u64 }
```

নিয়ম:

- দুটো নামই contextual: `packed` শুধু `struct`/`union`-এর আগে, আর `align`
  শুধু `(`-এর ঠিক আগে থাকলে। কোনো field বা variable-এর নাম এখনও `packed` বা
  `align` হতেই পারে।
- কোনো field-এ `align(N)` শুধু তার alignment **বাড়াতে** পারে। কোনো `packed`
  record-এর ভেতরে `align(N)` দেওয়া field নাকচ — একটা যেন চুপচাপ আরেকটাকে
  হারিয়ে না দেয়।
- Class, interface, enum আর function দুটোকেই নাম ধরে নাকচ করে।
- Semantics C-এর, প্রতিটা সমর্থিত target-এর জন্য Clang-এর বিপরীতে যাচাই করা।

## CPU feature

- **`feature "name" fn`** কোনো function-এর body-কে সেই CPU feature-এর
  instruction ব্যবহার করার অনুমতি দেয়। সেটা call করা, বা function value
  হিসেবে store করা, তার জন্য feature-টা নিশ্চিত present হতে হবে। দেখুন
  [Compile-time feature](/bn/guide/compile-time/)।

```beans
feature "aes" fn mix_fast(seed: int) -> int { /* ... */ }
```

## Ownership

- **`unique`** যায় `unique class`-এর সাথে, একটা type-কে move-only বাইরের
  handle বানাতে। দেখুন [Variable আর constant](/bn/guide/variables/)।
- **`move`** হলো একটা parameter mode যেটা কোনো argument-এর ownership নিয়ে
  নেয়। এটা `move name` expression-ও, যেটা কোনো binding থেকে একটা value বের
  করে নিয়ে যায়।
- **`inout`** হলো একটা parameter mode যেটা call-এর জন্য caller-এর একটা
  mutable local-কে alias করে। caller call site-এ `inout` লেখে, আর argument-কে
  একটা `var` হতে হবে।
- **`inout fn`** একটা mutating struct method ঘোষণা করে। এটা mutable `self`
  পায় আর একটা `var` local-এ call করতে হয়। caller receiver-এর আগে `inout`
  লেখে না।

## Modifier-এর ক্রম

আদর্শ ক্রমে visibility আগে বসে, তারপর kind modifier: `pub unique class`,
`pub abstract class`, `pub singleton class` আর `pub extern "C" struct`। C
interop আর layout modifier একই শিকলে সাজে: `pub extern "C" packed struct`।

Custom annotation declaration, parameter আর local বর্ণনা করতে পারে, কিন্তু
এরা কোনো নতুন ভাষার modifier যোগ করে না, আর `priv`, `abstract`, `singleton`
বা `extern "C"`-এর মতো নিয়ম বদলে দেয় না। [foreign function
interface](/bn/guide/ffi/) পেজ `extern "C"` আর `opaque`-কে কাজে দেখায়, আর
[struct আর union](/bn/guide/structs/) আসল record-এ layout ও method modifier
দেখায়।

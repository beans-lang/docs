---
title: Builtins
description: Beans কোন কোন builtin type আর function দেয়, আর কোনটা নিয়ে কোথায় পড়তে হবে।
---

**Builtin** হলো এমন type বা function যেটা Beans compiler নিজেই চেনে। এটা
import করতে হয় না, নিজে লিখতেও হয় না। সব সময় হাতের কাছে থাকে, চাইলেই ব্যবহার করা
যায়। `int` type, `string` type, `List`, `Option`, আর `panic` function — এগুলো সবই
builtin।

এই পেজে প্রতিটা builtin-এর নাম দেওয়া আছে, আর প্রতিটার পুরো ব্যাখ্যা যে পেজে আছে
সেটার লিংক দেওয়া আছে।

## দুইটা লেয়ার

Beans তার builtin গুলো দুই ভাবে তৈরি করে। কোড লেখার সময় এটা নিয়ে ভাবার দরকার
নেই, তবে একবার জেনে রাখলে সুবিধা।

- কিছু builtin C++ দিয়ে লেখা, আর একটা fixed runtime table দিয়ে ওগুলোতে পৌঁছানো
  হয় (এটাকে বলে "runtime ABI")। এগুলো হলো `string`, `Bytes`, `File`, `MMap`, আর
  যেসব `std.*` module operating system-এর সাথে কথা বলে সেগুলো। টেবিলটা দেখা যাবে
  [`compiler/beans/expression.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/expression.b)-তে।
- বাকিগুলো compiler-এর নিজের type checker-এ লেখা, আর code generator ওগুলোকে
  machine code বানিয়ে দেয়। এগুলো হলো generic type গুলো (`List`, `Map`,
  `Box`, `Atomic`, `RawPtr`, `Slice`, SIMD) আর compile-time-এর সাহায্যকারী যেমন
  `size_of`। checker দেখা যাবে
  [`compiler/beans/expression.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/expression.b)-তে।

এই compiler-এর runtime ABI version হলো `6`। compiler নিজের version জানায়
`0.1.18`, আর language contract `1.0`-তে আটকানো আছে।

## Error handling নিজেই builtin

Beans-এ null নেই, exception নেই। এর বদলে "হয়তো আছে" আর "ব্যর্থ হলো" — এই ধরনের
উত্তরের জন্য তিনটা builtin type দেওয়া আছে। এই reference জুড়ে এগুলো বারবার চোখে
পড়বে:

- `Option<T>`: এমন একটা value যা হয়তো থাকে না।
- `Result<T, E>`: একটা value, নয়তো একটা error।
- `Error`: standard error class।

এগুলো, আর `List` ও `Map`-এর মতো collection type গুলো — সবই builtin। পুরো গল্পটা
[Option, Result, আর Error](/bn/reference/builtins/option-result/)-এ পড়ে নিন।

## সব builtin পেজ

| পেজ | কী নিয়ে |
| --- | --- |
| [Primitive type](/bn/reference/builtins/primitives/) | `unit`, `bool`, integer আর float type গুলো, `byte`, `string` |
| [Numbers আর decimal](/bn/reference/builtins/numbers/) | number-এর নিয়ম, `as` দিয়ে cast, আর নিখুঁত `decimal` math |
| [string](/bn/reference/builtins/string/) | `string` type আর তার প্রতিটা method |
| [Bytes](/bn/reference/builtins/bytes/) | বাড়তে পারা byte buffer `Bytes` |
| [Collections](/bn/reference/builtins/collections/) | `List`, `Map`, আর `OrderedMap` |
| [Option, Result, আর Error](/bn/reference/builtins/option-result/) | `Option`, `Result`, `Error`, `some`/`none`/`ok`/`err`, আর `?` operator |
| [Ownership handle](/bn/reference/builtins/handles/) | `Box`, `Arena`, `Shared`, `Weak`, `Mutex`, `Channel`, `Thread`, `AtomicInt` |
| [Atomics](/bn/reference/builtins/atomics/) | `Atomic<T>` আর `MemoryOrder` |
| [File আর mapping](/bn/reference/builtins/files/) | `File`, `Dir`, `MMap` |
| [SIMD, array, আর pointer](/bn/reference/builtins/simd/) | `Simd{N}{elem}`, `[T; N]`, `Slice<T>`, `RawPtr<T>` |
| [Prelude function](/bn/reference/builtins/functions/) | `panic`, `size_of`/`align_of`/`offset_of`, printing |

## আরও দেখুন

- [language guide](/bn/guide/types/) দেখাবে type, error, memory আর বাকি সব কীভাবে
  একসাথে খাপ খায়।
- [standard library reference](/bn/reference/stdlib/)-এ আছে সেই module গুলো যেগুলো
  `import std.*` দিয়ে import করা হয়।

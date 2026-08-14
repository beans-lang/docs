---
title: Examples and recipes
description: Beans-এর সাথে আসা উদাহরণগুলো কীভাবে চালানো যায়, আর টপিক অনুযায়ী সাজানো দরকারি উদাহরণগুলোর গাইড।
---

Beans repo-র সাথে অনেকগুলো উদাহরণ প্রোগ্রাম আসে,
[`examples/`](https://github.com/beans-lang/beans/tree/main/examples) ফোল্ডারের ভেতরে।
প্রতিটাই আসল, চালানো যায় এমন `.b` ফাইল, আর একেকটা ভাষার একেকটা অংশ দেখায়।
এই পেজে দেখানো হলো এগুলো কীভাবে চালানো যায়, আর কোনগুলো পড়ে দেখা দরকার।

## একটা উদাহরণ কীভাবে চালাবে

`beansc run`-এর পরে একটা ফাইলের নাম দিন:

```bash
beansc run examples/hello.b
```

বেশিরভাগ উদাহরণই দুইভাবে কাজ করে — `beansc run` (interpreter) দিয়েও, আর
`beansc build` (native binary) দিয়েও। দুইভাবেই একই output পাওয়া যায়।

multi-package উদাহরণটা একটা পুরো project, তাই সেটা তার `main.b` থেকে চালাতে হয়:

```bash
beansc run examples/shop/main.b
```

কিছু উদাহরণ আবার **target-gated** — এগুলোর জন্য বিশেষ target বা CPU লাগে,
সাধারণ desktop build-এ চলবে না। এমনগুলো নিচে আলাদা করে চিহ্নিত করা আছে।

## ভাষার বেসিক

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [hello.b](https://github.com/beans-lang/beans/blob/main/examples/hello.b) | Hello world আর string interpolation | হ্যাঁ |
| [tour.b](https://github.com/beans-lang/beans/blob/main/examples/tour.b) | এক ফাইলে ভাষার সব আইডিয়ার একটা ট্যুর | হ্যাঁ |

বিস্তারিত দেখুন [Hello আর ট্যুর](/bn/examples/hello-tour/) পেজে।

## Object-oriented কোড আর value type

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [oop_classes.b](https://github.com/beans-lang/beans/blob/main/examples/oop_classes.b) | `priv` method আর field, static field, abstract method, interface, আর একটা singleton | হ্যাঁ |
| [generic_structs.b](https://github.com/beans-lang/beans/blob/main/examples/generic_structs.b) | Generic struct, default, read method, `inout fn`, আর static factory | হ্যাঁ |

বিস্তারিত দেখুন [OOP class আর value type](/bn/examples/oop/) পেজে।

## Concurrency

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [threads.b](https://github.com/beans-lang/beans/blob/main/examples/threads.b) | OS thread, generic, enum, `Option`/`Result`, `decimal` | হ্যাঁ |
| [atomics.b](https://github.com/beans-lang/beans/blob/main/examples/atomics.b) | Typed `Atomic<T>`, সাথে explicit `MemoryOrder` | হ্যাঁ |
| [wide_concurrency.b](https://github.com/beans-lang/beans/blob/main/examples/wide_concurrency.b) | channel-এর মধ্য দিয়ে struct আর enum value পাঠানো | হ্যাঁ |
| [wide_sync.b](https://github.com/beans-lang/beans/blob/main/examples/wide_sync.b) | `Mutex`-এর মধ্য দিয়ে struct আর enum value | হ্যাঁ |

বিস্তারিত দেখুন [Thread আর channel](/bn/examples/threads/) আর
[Atomics](/bn/examples/atomics/) পেজে।

## File আর storage

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [files.b](https://github.com/beans-lang/beans/blob/main/examples/files.b) | `File`/`Dir` static, positional I/O, error | হ্যাঁ |
| [reader.b](https://github.com/beans-lang/beans/blob/main/examples/reader.b) | Buffered করে লাইন পড়া | হ্যাঁ |
| [kv.b](https://github.com/beans-lang/beans/blob/main/examples/kv.b) | Append-only key-value store, সাথে durable commit | হ্যাঁ |
| [locks.b](https://github.com/beans-lang/beans/blob/main/examples/locks.b) | Advisory file lock (`flock`), single-writer প্যাটার্ন | হ্যাঁ |
| [mmap.b](https://github.com/beans-lang/beans/blob/main/examples/mmap.b) | পুরো ফাইলকে memory-তে map করা | হ্যাঁ |
| [shared_memory.b](https://github.com/beans-lang/beans/blob/main/examples/shared_memory.b) | POSIX shared memory-কে `MMap` হিসেবে | হ্যাঁ |

বিস্তারিত দেখুন [File আর একটা KV store](/bn/examples/files-kv/) পেজে।

## Networking

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [net.b](https://github.com/beans-lang/beans/blob/main/examples/net.b) | এক process-এই loopback-এর উপর TCP আর UDP | হ্যাঁ |
| [poller.b](https://github.com/beans-lang/beans/blob/main/examples/poller.b) | অনেক descriptor-এর জন্য একসাথে wait করা (epoll/kqueue) | হ্যাঁ |
| [signals.b](https://github.com/beans-lang/beans/blob/main/examples/signals.b) | poller দিয়ে signal-কে data হিসেবে ধরা | হ্যাঁ |

বিস্তারিত দেখুন [Networking](/bn/examples/networking/) পেজে।

## C interop আর low-level

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [ffi.b](https://github.com/beans-lang/beans/blob/main/examples/ffi.b) | libc-তে `extern "C"` call, `unsafe`-এর ভেতরে `RawPtr` | হ্যাঁ |
| [c_layout_structs.b](https://github.com/beans-lang/beans/blob/main/examples/c_layout_structs.b) | `extern "C"` struct layout | হ্যাঁ |
| [c_layout_unions.b](https://github.com/beans-lang/beans/blob/main/examples/c_layout_unions.b) | `extern "C"` union layout | হ্যাঁ |
| [dynamic_library.b](https://github.com/beans-lang/beans/blob/main/examples/dynamic_library.b) | চলতে চলতে একটা shared library load করা, একটা address-এ call করা | হ্যাঁ (load করার মতো একটা library লাগবে) |
| [packed.b](https://github.com/beans-lang/beans/blob/main/examples/packed.b) | `packed` আর `align(N)` | হ্যাঁ |
| [layout.b](https://github.com/beans-lang/beans/blob/main/examples/layout.b) | `size_of` / `align_of` / `offset_of` | হ্যাঁ |
| [raw_slices.b](https://github.com/beans-lang/beans/blob/main/examples/raw_slices.b) | `Slice<T>` | হ্যাঁ |
| [unsafe_raw.b](https://github.com/beans-lang/beans/blob/main/examples/unsafe_raw.b) | `RawPtr` null / alloc / offset / read / write | হ্যাঁ |

বিস্তারিত দেখুন [C interop (FFI)](/bn/examples/ffi/) পেজে।

## Memory আর ownership

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [box.b](https://github.com/beans-lang/beans/blob/main/examples/box.b) | Generic move-only handle | হ্যাঁ |
| [arena.b](https://github.com/beans-lang/beans/blob/main/examples/arena.b) | Generic move-only handle | হ্যাঁ |
| [shared_weak.b](https://github.com/beans-lang/beans/blob/main/examples/shared_weak.b) | `Shared` আর `Weak` | হ্যাঁ |
| [ordered_map.b](https://github.com/beans-lang/beans/blob/main/examples/ordered_map.b) | `OrderedMap` | হ্যাঁ |
| [cycles.b](https://github.com/beans-lang/beans/blob/main/examples/cycles.b) | collector যেভাবে reference cycle free করে | হ্যাঁ |
| [ctors.b](https://github.com/beans-lang/beans/blob/main/examples/ctors.b) | `init` / `deinit` চুক্তি | হ্যাঁ |
| [generic_deinit.b](https://github.com/beans-lang/beans/blob/main/examples/generic_deinit.b) | `deinit` আর একটা closure factory সহ একটা generic class | হ্যাঁ |

## Process, সময়, আর মেশিন

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [child_process.b](https://github.com/beans-lang/beans/blob/main/examples/child_process.b) | `Command.start()`, যেটা একটা `Child` ফেরত দেয় (async ব্যবহার করে) | হ্যাঁ |
| [processes.b](https://github.com/beans-lang/beans/blob/main/examples/processes.b) | `Command.run()` | হ্যাঁ |
| [clocks_random.b](https://github.com/beans-lang/beans/blob/main/examples/clocks_random.b) | সময় আর random | হ্যাঁ |
| [cpu_dispatch.b](https://github.com/beans-lang/beans/blob/main/examples/cpu_dispatch.b) | `cpu.has` আর একটা feature-gated function | হ্যাঁ (feature-gated কোডের জন্য ওই CPU feature লাগবে) |
| [intrinsics.b](https://github.com/beans-lang/beans/blob/main/examples/intrinsics.b) | `std.intrinsic` | হ্যাঁ |
| [inline_asm.b](https://github.com/beans-lang/beans/blob/main/examples/inline_asm.b) | `std.asm` | হ্যাঁ |
| [target_info.b](https://github.com/beans-lang/beans/blob/main/examples/target_info.b) | `std.target` | হ্যাঁ |

## SIMD

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [simd.b](https://github.com/beans-lang/beans/blob/main/examples/simd.b) | `Simd4f32` fused multiply-add | হ্যাঁ (কিছু SIMD-এর জন্য CPU feature লাগে) |
| [simd_families.b](https://github.com/beans-lang/beans/blob/main/examples/simd_families.b) | SIMD family-র নামকরণ, width আর feature নিয়ম | হ্যাঁ (কিছু SIMD-এর জন্য CPU feature লাগে) |

## Standard library-র ট্যুর

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [fmt.b](https://github.com/beans-lang/beans/blob/main/examples/fmt.b) | `std.fmt` | হ্যাঁ |
| [strings.b](https://github.com/beans-lang/beans/blob/main/examples/strings.b) | String নিয়ে কাজ | হ্যাঁ |
| [bytes.b](https://github.com/beans-lang/beans/blob/main/examples/bytes.b) | `Bytes` নিয়ে কাজ | হ্যাঁ |
| [containers.b](https://github.com/beans-lang/beans/blob/main/examples/containers.b) | Collection | হ্যাঁ |
| [stdlib_beans.b](https://github.com/beans-lang/beans/blob/main/examples/stdlib_beans.b) | stdlib-র একটা ট্যুর | হ্যাঁ |

এই ট্যুরগুলোর কিছু কিছু ইচ্ছা করেই একটা panic দিয়ে শেষ হয়। এটা এদের test হিসেবে
কাজ করারই একটা অংশ, ভয়ের কিছু নেই।

## Multi-package project

| উদাহরণ | কী দেখায় | চালানো যায়? |
| --- | --- | --- |
| [shop/](https://github.com/beans-lang/beans/tree/main/examples/shop) | তিনটা package, package পেরিয়ে interface আর generic | হ্যাঁ, `examples/shop/main.b` দিয়ে |

বিস্তারিত দেখুন [একটা local-package project](/bn/examples/shop/) পেজে।

## Target-gated উদাহরণ

এগুলোর জন্য নির্দিষ্ট target বা runtime লাগে, সাধারণ desktop build-এ চলবে না:

| উদাহরণ | কী লাগবে |
| --- | --- |
| [embedded.b](https://github.com/beans-lang/beans/blob/main/examples/embedded.b) | একটা 32-bit no-OS target (সেখানে `decimal` চলবে না) |
| [freestanding.b](https://github.com/beans-lang/beans/blob/main/examples/freestanding.b) | `--runtime freestanding` |

[language guide](/bn/guide/modules/)-এ সব feature একের পর এক আছে, আর
[builtin reference](/bn/reference/builtins/) ও
[standard library reference](/bn/reference/stdlib/) রয়েছে — কিছু খুঁজতে চাইলে
সেখানে দেখে নেওয়া যায়।

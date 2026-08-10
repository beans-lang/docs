---
title: Examples and recipes
description: How to run the bundled Beans examples, and a guide to the notable ones grouped by topic.
---

The Beans repository ships a folder of example programs under
[`examples/`](https://github.com/beans-lang/beans/tree/main/examples). Each one
is a real, runnable `.b` file that shows one part of the language. This page
tells you how to run them and points you at the ones worth reading.

## How to run an example

Point `beansc run` at a file:

```bash
beansc run examples/hello.b
```

Most examples work through both `beansc run` (the interpreter) and
`beansc build` (a native binary), and give the same output either way.

The multi-package example is a project, so run it from its `main.b`:

```bash
beansc run examples/shop/main.b
```

Some examples are **target-gated**: they need a special target or CPU and will
not run on a plain desktop build. Those are marked below.

## Language basics

| Example | Shows | Runnable |
| --- | --- | --- |
| [hello.b](https://github.com/beans-lang/beans/blob/main/examples/hello.b) | Hello world and string interpolation | yes |
| [tour.b](https://github.com/beans-lang/beans/blob/main/examples/tour.b) | A one-file tour of every language idea | yes |

Walked through in [Hello and the tour](/examples/hello-tour/).

## Concurrency

| Example | Shows | Runnable |
| --- | --- | --- |
| [threads.b](https://github.com/beans-lang/beans/blob/main/examples/threads.b) | OS threads, generics, enums, `Option`/`Result`, `decimal` | yes |
| [atomics.b](https://github.com/beans-lang/beans/blob/main/examples/atomics.b) | Typed `Atomic<T>` with explicit `MemoryOrder` | yes |
| [wide_concurrency.b](https://github.com/beans-lang/beans/blob/main/examples/wide_concurrency.b) | Struct and enum values across channels | yes |
| [wide_sync.b](https://github.com/beans-lang/beans/blob/main/examples/wide_sync.b) | Struct and enum values through a `Mutex` | yes |

Walked through in [Threads and channels](/examples/threads/) and
[Atomics](/examples/atomics/).

## Files and storage

| Example | Shows | Runnable |
| --- | --- | --- |
| [files.b](https://github.com/beans-lang/beans/blob/main/examples/files.b) | `File`/`Dir` statics, positional I/O, errors | yes |
| [reader.b](https://github.com/beans-lang/beans/blob/main/examples/reader.b) | Buffered line reading | yes |
| [kv.b](https://github.com/beans-lang/beans/blob/main/examples/kv.b) | Append-only key-value store with durable commit | yes |
| [locks.b](https://github.com/beans-lang/beans/blob/main/examples/locks.b) | Advisory file locks (`flock`), single-writer pattern | yes |
| [mmap.b](https://github.com/beans-lang/beans/blob/main/examples/mmap.b) | Whole-file memory mapping | yes |
| [shared_memory.b](https://github.com/beans-lang/beans/blob/main/examples/shared_memory.b) | POSIX shared memory as an `MMap` | yes |

Walked through in [Files and a KV store](/examples/files-kv/).

## Networking

| Example | Shows | Runnable |
| --- | --- | --- |
| [net.b](https://github.com/beans-lang/beans/blob/main/examples/net.b) | TCP and UDP on loopback in one process | yes |
| [poller.b](https://github.com/beans-lang/beans/blob/main/examples/poller.b) | Waiting on many descriptors (epoll/kqueue) | yes |
| [signals.b](https://github.com/beans-lang/beans/blob/main/examples/signals.b) | Signals as data, via the poller | yes |

Walked through in [Networking](/examples/networking/).

## C interop and low-level

| Example | Shows | Runnable |
| --- | --- | --- |
| [ffi.b](https://github.com/beans-lang/beans/blob/main/examples/ffi.b) | `extern "C"` calls to libc, `RawPtr` in `unsafe` | yes |
| [c_layout_structs.b](https://github.com/beans-lang/beans/blob/main/examples/c_layout_structs.b) | `extern "C"` struct layout | yes |
| [c_layout_unions.b](https://github.com/beans-lang/beans/blob/main/examples/c_layout_unions.b) | `extern "C"` union layout | yes |
| [dynamic_library.b](https://github.com/beans-lang/beans/blob/main/examples/dynamic_library.b) | Load a shared library at run time, call an address | yes (needs a library to load) |
| [packed.b](https://github.com/beans-lang/beans/blob/main/examples/packed.b) | `packed` and `align(N)` | yes |
| [layout.b](https://github.com/beans-lang/beans/blob/main/examples/layout.b) | `size_of` / `align_of` / `offset_of` | yes |
| [raw_slices.b](https://github.com/beans-lang/beans/blob/main/examples/raw_slices.b) | `Slice<T>` | yes |
| [unsafe_raw.b](https://github.com/beans-lang/beans/blob/main/examples/unsafe_raw.b) | `RawPtr` null / alloc / offset / read / write | yes |

Walked through in [C interop (FFI)](/examples/ffi/).

## Memory and ownership

| Example | Shows | Runnable |
| --- | --- | --- |
| [box.b](https://github.com/beans-lang/beans/blob/main/examples/box.b) | Generic move-only handles | yes |
| [arena.b](https://github.com/beans-lang/beans/blob/main/examples/arena.b) | Generic move-only handles | yes |
| [shared_weak.b](https://github.com/beans-lang/beans/blob/main/examples/shared_weak.b) | `Shared` and `Weak` | yes |
| [ordered_map.b](https://github.com/beans-lang/beans/blob/main/examples/ordered_map.b) | `OrderedMap` | yes |
| [cycles.b](https://github.com/beans-lang/beans/blob/main/examples/cycles.b) | Reference cycles freed by the collector | yes |
| [ctors.b](https://github.com/beans-lang/beans/blob/main/examples/ctors.b) | The `init` / `deinit` contract | yes |
| [generic_deinit.b](https://github.com/beans-lang/beans/blob/main/examples/generic_deinit.b) | A generic class with `deinit` and a closure factory | yes |

## Processes, time, and the machine

| Example | Shows | Runnable |
| --- | --- | --- |
| [child_process.b](https://github.com/beans-lang/beans/blob/main/examples/child_process.b) | `Command.start()` returning a `Child` (uses async) | yes |
| [processes.b](https://github.com/beans-lang/beans/blob/main/examples/processes.b) | `Command.run()` | yes |
| [clocks_random.b](https://github.com/beans-lang/beans/blob/main/examples/clocks_random.b) | Time and random | yes |
| [cpu_dispatch.b](https://github.com/beans-lang/beans/blob/main/examples/cpu_dispatch.b) | `cpu.has` and a feature-gated function | yes (feature-gated code needs the CPU feature) |
| [intrinsics.b](https://github.com/beans-lang/beans/blob/main/examples/intrinsics.b) | `std.intrinsic` | yes |
| [inline_asm.b](https://github.com/beans-lang/beans/blob/main/examples/inline_asm.b) | `std.asm` | yes |
| [target_info.b](https://github.com/beans-lang/beans/blob/main/examples/target_info.b) | `std.target` | yes |

## SIMD

| Example | Shows | Runnable |
| --- | --- | --- |
| [simd.b](https://github.com/beans-lang/beans/blob/main/examples/simd.b) | `Simd4f32` fused multiply-add | yes (some SIMD needs CPU features) |
| [simd_families.b](https://github.com/beans-lang/beans/blob/main/examples/simd_families.b) | SIMD family naming, width and feature rules | yes (some SIMD needs CPU features) |

## Standard library tours

| Example | Shows | Runnable |
| --- | --- | --- |
| [fmt.b](https://github.com/beans-lang/beans/blob/main/examples/fmt.b) | `std.fmt` | yes |
| [strings.b](https://github.com/beans-lang/beans/blob/main/examples/strings.b) | String operations | yes |
| [bytes.b](https://github.com/beans-lang/beans/blob/main/examples/bytes.b) | `Bytes` operations | yes |
| [containers.b](https://github.com/beans-lang/beans/blob/main/examples/containers.b) | Collections | yes |
| [stdlib_beans.b](https://github.com/beans-lang/beans/blob/main/examples/stdlib_beans.b) | A stdlib tour | yes |

Some of these tours end in a deliberate panic. That is part of their job as a
test.

## Multi-package project

| Example | Shows | Runnable |
| --- | --- | --- |
| [shop/](https://github.com/beans-lang/beans/tree/main/examples/shop) | Three packages, cross-package interfaces and generics | yes, via `examples/shop/main.b` |

Walked through in [A local-package project](/examples/shop/).

## Target-gated examples

These need a specific target or runtime and will not run on a plain desktop
build:

| Example | Needs |
| --- | --- |
| [embedded.b](https://github.com/beans-lang/beans/blob/main/examples/embedded.b) | A 32-bit no-OS target (`decimal` is refused there) |
| [freestanding.b](https://github.com/beans-lang/beans/blob/main/examples/freestanding.b) | `--runtime freestanding` |

The [language guide](/guide/modules/) covers every feature in order, and the
[builtin reference](/reference/builtins/) and
[standard library reference](/reference/stdlib/) are there to look things up.

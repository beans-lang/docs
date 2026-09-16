---
title: Cross-compiling and targets
description: Selecting a target, the cross-build options, runtime profiles, and the supported target list.
---

[`beansc build`](/tools/build/) compiles for exactly one target. The host is
the default. You pick another target with `--target`, and shape the build with
the CPU, sysroot, and runtime options below.

## Selecting a target

```bash
beansc build app.b --target x86_64-unknown-linux-gnu -o app
```

Thirty-four triples are registered. Common alternate spellings normalize to a
supported one, for example `aarch64-apple-darwin` and
`riscv64gc-unknown-linux-musl`.

Inspect one target's facts with:

```bash
beansc target x86_64-unknown-linux-gnu
```

`beansc target <triple>` prints that target's layout and capability facts.

## The cross-build options

| Option | Meaning |
| --- | --- |
| `--target <triple>` | The target to build for. Default host. |
| `--cpu <generic\|native\|name>` | Target CPU. `native` is host builds only. |
| `--features <+f,-f,...>` | Enable or disable CPU features. |
| `--sysroot <path>` | Target sysroot for a cross link. Must exist. |
| `--cc <path>` | C driver. Default `clang`. |
| `--linker <name>` | Passed as `-fuse-ld=<name>`. |
| `--ar <path>` | Static archive tool. Default `ar`. |

## Compile versus link

A cross **compile** needs no target libraries: `--emit obj` and `--emit ir`
work without a sysroot. Only a cross **link**, producing a finished binary or
shared library for another target, needs `--sysroot`. Every setting is
validated before Clang runs, and tools are executed directly, never through a
shell.

## Runtime profiles

`--runtime` chooses how much runtime the build includes. A capability a profile
drops is refused at **check** time, by name, so you find out early rather than
at link time.

| Profile | What you get |
| --- | --- |
| `full` (default) | Everything. |
| `minimal` | libc, but no OS services. Drops filesystem, sockets, poller, processes, signals, shared memory, and dylibs. |
| `freestanding` | No OS at all. Also drops threads, clocks, random, and environment. |

A target with no OS requires `--runtime freestanding`.

```bash
beansc build blink.b --target thumbv7em-none-eabi --runtime freestanding -o blink
```

## Supported targets

The 34 registered triples include:

- **macOS:** `arm64-apple-darwin`.
- **iOS:** `arm64-apple-ios` and `arm64-apple-ios-sim`. Two targets and not one
  flag, because they are two SDKs: a device binary does not load in the
  simulator, and the failure arrives from dyld rather than from the build. The
  SDK path comes from `xcrun --show-sdk-path`.
- **Android:** `aarch64-linux-android` and `x86_64-linux-android`. The C driver
  must be the NDK's clang — Android's compiler-rt builtins and libunwind ship
  with the NDK, so a host clang fails at link looking for a
  `libclang_rt.builtins.a` that was never on the machine. Set
  `BEANS_ANDROID_CC`, or `ANDROID_NDK_HOME` / `ANDROID_NDK_ROOT`. bionic has no
  `shm_open`, so `std.fs`'s shared memory answers `unsupported` there.
- **Linux GNU:** `x86_64`, `aarch64`, `riscv64`, `i686`, `armv7`, `arm`,
  `loongarch64`, `powerpc64le`, `powerpc`, `powerpc64`, `s390x`.
- **Linux musl:** `x86_64`, `aarch64`, `riscv64`, `loongarch64`, `powerpc64le`,
  `powerpc64`.
- **Windows (seven ABIs):** `x86_64-pc-windows-gnu`, `i686-pc-windows-gnu`,
  `x86_64-pc-windows-gnullvm`, `aarch64-pc-windows-gnullvm`,
  `x86_64-pc-windows-msvc`, `i686-pc-windows-msvc`, `aarch64-pc-windows-msvc`.
- **WebAssembly:** `wasm32-wasip1`, `wasm32-unknown-unknown`.
- **Bare metal:** `thumbv7em-none-eabi`, `riscv32-unknown-none-elf`.

WebAssembly and the two bare-metal targets are **preview**.

## Full and slim packages

Beans install packages come in two shapes:

- **Full packages** bundle Clang, LLD, and llvm-ar. They ship for Linux
  x86-64 and ARM64 GNU, and Windows x64, ARM64, and x86 (LLVM-MinGW). A native
  build needs no extra tools.
- **Slim packages** ship everywhere else. A native build then needs Clang on
  your `PATH`.

Run [`beansc doctor`](/tools/doctor-upgrade/) to see which tools your install
already has.

The required native 1.0 CI hosts are macOS arm64, Linux x86-64 GNU, and Linux
arm64 GNU. See [Maturity and platforms](/intro/maturity/).

---
title: Building
description: beansc build options, --emit, release and debug builds, library builds, and C headers.
---

`beansc build` compiles Beans to a native binary through LLVM and Clang. It
takes exactly **one** entry file.

```bash
beansc build app.b -o app
```

Every setting is validated before Clang runs, and every tool is executed
directly, never through a shell.

## Options

| Option | What it does |
| --- | --- |
| no mode flag | Fast edit-build-run loop: `-O0` (`-O1` on 32-bit x86). |
| `--release` | Optimize: `-O3`, `NDEBUG`. |
| `--debug` | `-O0` (`-Og` on 32-bit x86), frame pointers kept, platform debug info (DWARF/CodeView). |
| `--lto` | Link-time optimization. Disabled if `--debug`. |
| `--target <triple>` | Build for this target. Default is the host. |
| `--cpu <generic\|native\|name>` | Target CPU. `native` is host builds only. |
| `--features <+f,-f,...>` | Enable or disable CPU features. |
| `--sysroot <path>` | Target sysroot for a cross link. Must be an existing directory. |
| `--cc <path>` | C driver. Default `clang`. |
| `--linker <name>` | Passed to the driver as `-fuse-ld=<name>`. |
| `--ar <path>` | Static archive tool. Default `ar`. |
| `--header <path>` | Write a C header for library exports. Only with `--emit static` or `--emit shared`. |
| `-o <path>` | Output path. |
| `--emit <bin\|obj\|static\|shared\|ir>` | What to produce. Default `bin`. |
| `--runtime <full\|minimal\|freestanding>` | How much runtime to include. |
| `--locked` | Require exact `beans.lock` entries. |
| `--offline` | Forbid dependency network access. |

`--release` and `--debug` together is an error.

Target-related options (`--target`, `--cpu`, `--features`, `--sysroot`,
`--cc`, `--linker`, `--ar`, `--runtime`) are covered in full on
[Cross-compiling and targets](/tools/targets/). `--locked` and `--offline` are
covered on [Reproducible builds](/pot/reproducible/).

## `--emit`

`--emit` chooses the output kind:

| Value | Output |
| --- | --- |
| `bin` | A native executable (the default). |
| `obj` | A single object file. |
| `static` | A static library (`.a`). |
| `shared` | A shared library (`.dylib` / `.so`). |
| `ir` | LLVM IR. |

## Release and debug

- A plain build uses `-O0` for a short edit-build-run loop. Use `--release` for
  a fast program. On 32-bit x86, plain and debug builds use `-O1` and `-Og`
  because LLVM's `-O0` register allocator can run out of registers.
- `--release` turns on `-O3` and defines `NDEBUG`. Add `--lto` for link-time
  optimization.
- `--debug` produces an unoptimized `-O0` binary that keeps frame pointers and
  carries platform debug info (DWARF on Unix, CodeView on Windows). This debug
  info is for the C runtime, good for native backtraces and profilers. It is
  **not** source-level debugging of Beans code; see [Debugger
  (DAP)](/tools/dap/).

Native builds split generated code into content-addressed object chunks, compile
them in parallel, and reuse unchanged chunks. `BEANS_BUILD_JOBS` caps the number
of Clang processes. Set `BEANS_BUILD_JOBS=1` for one Clang. Set
`BEANS_IR_COMMENTS=1` only when you want compiler comments in emitted IR.

## Library builds

Set `kind library` in [`beans.pot`](/pot/manifest/) (a library must not have a
`main`). Then:

- `beansc build api.b` produces a static library, `build/libmath.a` by default.
- `--emit shared` produces a `.dylib` or `.so` instead.
- `--header math.h` writes a C header for the module's `pub extern "C"`
  exports. It is only valid with `--emit static` or `--emit shared`.

```bash
beansc build api.b --emit shared --header math.h -o libmath.dylib
```

A single file works too, with an explicit `--emit static` or `--emit shared`
and no `main`.

Note: Beans-to-Beans libraries stay **source packages**, imported through
[`beans.pot`](/pot/manifest/). The static and shared artifacts are the stable
**C ABI** path: how you hand a library to C, or take one across a stable
boundary. See the [FFI guide](/guide/ffi/).

## A cross compile versus a cross link

A cross **compile** needs no target libraries: `--emit obj` and `--emit ir`
work without a sysroot. Only a cross **link**, producing a linked binary or
shared library for another target, needs `--sysroot`. See
[Cross-compiling and targets](/tools/targets/).

---
title: bindgen
description: Generate Beans C declarations from a C header with beansc bindgen, and what it can and cannot bind.
---

`beansc bindgen` turns a C header into Beans C declarations. It asks Clang for
the header's AST as JSON for the selected target and emits matching Beans
declarations, so you can call the C library through Beans' [FFI](/guide/ffi/).

```bash
beansc bindgen --system sqlite3 sqlite3.h -o sqlite3.b --only sqlite3_open
```

## Usage

```text
beansc bindgen <header.h> -o <bindings.b> [options] [-- clang-options]
```

Anything after `--` is passed straight to Clang (for example include paths and
defines).

## Options

| Option | Meaning |
| --- | --- |
| `-o <path>` | Output file. **Required.** |
| `--target <triple>` | Target to generate for. |
| `--cpu <name>` | Target CPU. Default `generic`. |
| `--features <list>` | CPU features. Repeatable. |
| `--sysroot <path>` | Target sysroot. |
| `--cc <path>` | C driver. Default `clang`. |
| `--package <name>` | Write a `package` clause at the top of the output. |
| `--system <name>` | Find the header and Clang flags through `pkg-config`. |
| `--only <name>` | Restrict to named declarations. Repeatable. |
| `--allow-unsupported` | Omit each unsafe declaration (and its dependents) instead of failing. |
| `-- <clang-options>` | Everything after `--` goes to Clang. |

```bash
beansc bindgen sqlite3.h -o sqlite3.b --package sqlite --only sqlite3_open --only sqlite3_close -- -I/usr/include
```

## Linking a C library

Install the C library with the operating system package manager first. Beans
does not run CMake or another native build system for it. If the installation
has `pkg-config` metadata, Beans can discover both its linker settings and its
headers.

For a system SQLite installation:

```bash
beansc pot add --system sqlite3
beansc bindgen --system sqlite3 sqlite3.h \
  -o sqlite3_bindings.b --package main \
  --only sqlite3_open --only sqlite3_close --only sqlite3_exec --only sqlite3_free
```

SQLite's whole header contains variadic and other declarations Beans cannot
represent. `--only` selects the API your program actually calls. `--system`
also handles SDK headers that are not directly visible as a local file.

For a vendored library outside the system search paths:

```beans-pot
link all search "vendor/sqlite/lib"
link all library "sqlite3"
```

`search` paths are relative to `beans.pot`. The library must already exist as
something the linker accepts, such as `libsqlite3.a`, `libsqlite3.so`, or
`libsqlite3.dylib`. A Git Beans wrapper may carry these `link` rows, but Beans
does not build that native library.

## What it can bind

bindgen handles: typedefs, records (structs), unions, arrays, enums, globals,
thread-local storage, functions, and function pointers.

## What it refuses

bindgen is strict: it refuses to guess. It will not emit a binding for a
construct it cannot reproduce **exactly**:

- varargs
- bitfields
- flexible arrays
- anonymous records
- non-default calling conventions
- `_Atomic` members
- packed or aligned records
- types with no exact Beans equivalent: `long double`, 128-bit integers,
  `_Complex`, and `_BitInt`

By default hitting one of these is an error. With `--allow-unsupported`,
bindgen instead omits each unsafe declaration and anything that depends on it,
and keeps going.

## What works in practice

bindgen produces usable bindings for the supported parts of real libraries such
as SQLite, zlib, and curl.

The reverse direction, exporting a C header from a Beans library, is the
`--header` flag on [`beansc build`](/tools/build/).

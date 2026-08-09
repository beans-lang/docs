---
title: The beans.pot manifest
description: The fields and line-based syntax of the beans.pot project manifest.
---

`beans.pot` is the manifest file at the root of a Beans module. It names the
module, says whether the module is an application or a library, pins Git
dependencies, and passes native linker directives. It is parsed in
[`compiler/beans/module.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/module.b).

## Syntax

The manifest is **line-based**. It is not TOML and not JSON. Each line is one
directive. Blank lines are ignored. A line starting with `//` is a comment and
is ignored.

The smallest real manifests are one line. The example project ships a
`beans.pot` that is just:

```beans-pot
module shop
```

The compiler's own manifest is just `module compiler`.

## Fields

### `module <name>` (required)

Names the module. Exactly one `module` line is required. The name is the
**module path** — the root that local packages and the lock file hang off of.

```beans-pot
module shop
```

### `kind application` or `kind library` (optional)

Says what the module builds. The default is `application`.

- `kind application` — the module needs an `fn main()`.
- `kind library` — the module must **not** have a `main`.

```beans-pot
module shop
kind application
```

See [Building](/tools/build/) for how a library build produces a `.a`, a
`.dylib`/`.so`, and an optional C header.

### `require <host/owner/repo> <ref>` (repeatable)

Pins one Git dependency. The path is a Git host path; the ref is a tag, branch,
or commit-like reference.

```beans-pot
require github.com/acme/http v1.2
```

Requiring the same path at two different refs is an error. Full detail, and how
this feeds `beans.lock`, is on [Dependencies and the lock
file](/pot/dependencies/).

### `link <selector> <search|library|framework> "<value>"` (repeatable)

Passes a native linker directive, for modules that link against C libraries.

- `selector` is `all`, an OS name (for example `macos`, `linux`, `windows`),
  or an exact target triple (for example `x86_64-unknown-linux-gnu`).
- The kind is one of:
  - `search` — a library search directory. Search paths are **relative to the
    `beans.pot` file**.
  - `library` — a library to link (by name).
  - `framework` — a framework to link (macOS).
- The value is a quoted string.

Entries pass to the linker in the order you declare them.

## A fuller example

```beans-pot
module shop
kind application
require github.com/acme/http v1.2
link all search "native/lib"
link all library "shop_native"
link macos framework "CoreFoundation"
link x86_64-unknown-linux-gnu library "platform_helper"
```

This module is an application, pulls in one Git dependency, and links a native
library it ships under `native/lib`, plus a macOS framework and one
Linux-only helper.

## See also

- [Dependencies and the lock file](/pot/dependencies/)
- [Local packages and imports](/pot/local-packages/)
- [The pot command reference](/pot/commands/)
- The [FFI guide](/guide/ffi/) for how `link` fits with C interop.

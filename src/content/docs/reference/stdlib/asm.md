---
title: std.asm
description: A tiny, allowlisted set of inline assembly templates, reachable only through unsafe.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 2 package functions.
<!-- coverage:summary:end -->

`std.asm` lets you emit a very small, fixed set of inline assembly instructions.
It is a native module and needs [`unsafe`](/guide/unsafe/). This is not general
inline assembly: only templates the target has an allowlist row for are accepted,
and the template and constraint strings must be plain string literals.

```beans
import std.asm
```

## Functions

Both functions are native, so their parameters are positional and carry no names.

```beans
value(string, string, int) -> int
run(string, string)
```

- `value(template, constraints, operand)` runs a template that takes one `int`
  operand in and gives one `int` out. `template` is the instruction text and
  `constraints` is the LLVM constraint string.
- `run(template, clobbers)` runs a template with no operands, as volatile.
  `clobbers` lists what the instruction clobbers, for example `"memory"`.

Both `template` and the string beside it (`constraints` or `clobbers`) must be
literal strings written right there in the call. You cannot build them at run
time.

## Allowed templates

Only these templates are allowed, by architecture:

| Architecture | Templates |
| --- | --- |
| arm64 | `mov $0, $1`, `dmb ish`, `dmb ishst`, `isb` |
| x86_64 | `mov $0, $1` (Intel syntax), `mfence`, `lfence`, `sfence` |
| arm32 | `dmb sy`, `cpsid i`, `cpsie i`, `wfi` |
| riscv32 | `fence rw, rw`, `csrci mstatus, 8`, `csrsi mstatus, 8`, `wfi` |

There are no allowed templates on 32-bit x86 or on wasm32. The value-returning
`asm.value` rows exist only on 64-bit architectures; the barrier-style templates
that take no operand go through `asm.run`.

A value round-trip through a machine register. `mov $0, $1` is spelled the same on
arm64 and x86-64, so the same source compiles on either:

<!-- beans:compile -->
```beans
import std.io
import std.asm

fn through_register(value: int) -> int {
    unsafe {
        return asm.value("mov $0, $1", "=r,r", value)
    }
}

fn main() {
    io.println("42 comes back as {through_register(42)}")
    io.println("and zero as {through_register(0)}")
}
```

A no-operand barrier goes through `asm.run`. The template must be an allowed row
for the build's architecture, so pick the one for your target (for example
`dmb ish` on arm64 or `mfence` on x86-64):

```beans
unsafe {
    asm.run("dmb ish", "memory")
}
```

## See also

- [Unsafe guide](/guide/unsafe/), everything here lives inside `unsafe`.
- [std.intrinsic](/reference/stdlib/cpu-intrinsic/), higher-level hardware
  operations that are usually what you want instead.

---
title: std.asm
description: A tiny, allowlisted set of inline assembly templates, reachable only through unsafe.
---

`std.asm` lets you emit a very small, fixed set of inline assembly instructions.
It is a native module and needs [`unsafe`](/guide/unsafe/). This is not general
inline assembly: only templates the target has an allowlist row for are accepted,
and the template and constraint strings must be plain string literals.

```beans
import std.asm
```

## The two functions

| Function | What it does |
| --- | --- |
| `asm.value(template: string, constraints: string, operand: int) -> int` | run a template that takes one int in and gives one int out |
| `asm.run(template: string, clobbers: string)` | run a template with no operands, as volatile |

Both `template` and the string beside it (`constraints` or `clobbers`) must be
literal strings written right there in the call — you cannot build them at run
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

<!-- beans:fragment -->
```beans
import std.asm

fn main() {
    unsafe {
        // a full memory barrier on arm64
        asm.run("dmb ish", "memory")
    }
}
```

## See also

- [Unsafe guide](/guide/unsafe/) — everything here lives inside `unsafe`.
- [std.intrinsic](/reference/stdlib/cpu-intrinsic/) — higher-level hardware
  operations that are usually what you want instead.

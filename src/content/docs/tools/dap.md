---
title: Debugger (DAP)
description: beansc debug-adapter, what the Beans debugger supports, and why native source-level debugging is not available yet.
---

`beansc debug-adapter` speaks the Debug Adapter Protocol (DAP) over stdio. It
is how an editor debugs a Beans program.

```bash
beansc debug-adapter
```

It compiles and runs your program on the **reference interpreter** — there is no
build step. In VS Code, press F5 on a `.b` file to start a session.

## What it supports

- breakpoints, set by Beans file and line
- stop on entry
- a Beans call stack
- `self`, parameters, and locals (a shadowed local stays two distinct
  variables)
- paging through large lists, maps, and objects
- watch expressions over variable paths
- step over, step into, step out
- continue
- a stop on a runtime panic, with the stack still intact

## What it refuses

`attach` is refused, with this reason:

```text
the Beans debugger runs programs itself; there is nothing to attach to
```

The debugger launches and runs the program itself, so there is no separate
process to attach to.

## Native source-level debugging is not available yet

You cannot yet step through Beans source in lldb or gdb on a native binary.

`beansc build --debug` gives you an unoptimized binary that carries platform
debug info (DWARF or CodeView) for the **C runtime**. That is good for native
backtraces and profilers. But the emitter writes **no line table for Beans
statements**, so lldb and gdb cannot stop on a Beans line. For source-level
Beans debugging today, use the DAP debugger above.

## See also

- [Building](/tools/build/) — the `--debug` flag.
- [Language server (LSP)](/tools/lsp/)
- [The beansc command](/tools/beansc/)

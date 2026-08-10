---
title: Checking and running
description: beansc check and run, plus the lex, parse, mir, and llvm inspection commands.
---

Before you [build a native binary](/tools/build/) you usually check the code,
and often run it on the reference interpreter. `beansc` also exposes each
compiler stage so you can see what it produced.

## `beansc check`

Type-checks one file without building anything.

```bash
beansc check app.b
```

- On success it prints `<file>: ok`.
- On failure it prints errors as `file:line:col: error: ...` and exits 1.

`check` accepts `--target`, `--cpu`, `--features`, and `--runtime`, so you can
check that code is valid for a specific target and runtime profile without
building. A capability a runtime profile lacks is refused here, at check time,
by name. See [targets](/tools/targets/).

## `beansc run`

Checks the file and then runs it on the reference interpreter. No native build
happens.

```bash
beansc run app.b
```

Forward arguments to your program after `--`:

```bash
beansc run app.b -- --verbose input.txt
```

If the program panics on the interpreter, `run` exits 3. See [Exit codes and
troubleshooting](/tools/exit-codes/).

## Inspecting the stages

These commands dump one stage of the compiler. They are for understanding and
debugging, not for a normal workflow.

| Command | What it prints |
| --- | --- |
| `beansc lex <file.b>...` | The token stream. |
| `beansc parse <file.b>...` | The parsed AST. |
| `beansc mir <file.b>` | The checked, ownership-planned MIR. |
| `beansc llvm <file.b>` | The LLVM IR that native builds use. |

```bash
beansc parse app.b
beansc mir app.b
beansc llvm app.b
```

`lex` and `parse` take one or more files. `mir` and `llvm` take one file.

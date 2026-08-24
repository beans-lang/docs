---
title: Runtime hooks
description: Run checked annotation handlers and root application lifecycle callbacks.
---

Runtime hooks let one annotation run small pieces of code before and after a
function or method. The compiler checks the whole link and emits direct calls.
It does not expand text, scan reflection data on each call, or create a thread.

## Declare an active annotation

Add `@runtime_hook` to an annotation schema. Name a `before` handler, an
`after_return` handler, or both.

<!-- beans:compile -->
```beans
@runtime_hook(before: "log_before", after_return: "log_after")
@target(value: ["function", "method"])
annotation log {
    level: string = "info"
}

fn log_before(target: string, level: string) {}
fn log_after(target: string, level: string) {}

@log(level: "debug")
fn save() {}

fn main() {
    save()
}
```

Handlers must be top-level functions in the annotation's package. The first
parameter is the qualified target name. The remaining parameters match the
annotation fields in schema order. All parameters are borrowed. A handler must
be concrete, synchronous, non-generic, non-extern, and return no value.

Version one allows active annotations only on concrete, synchronous functions
and methods. It rejects abstract, extern, generic, `init`, and `deinit`
targets.

## Order and normal return

`before` handlers run in annotation source order. `after_return` handlers run
in reverse order. An after handler runs on every normal return, including an
early return and `?` propagation. It is not promised after panic or `os.exit`.

Hooks observe a call. They cannot change its receiver, arguments, or result.

## Application lifecycle

Use `@runtime_start` and `@runtime_stop` on top-level, no-argument functions in
the root application package:

```beans
@runtime_start
fn open_services() {}

@runtime_stop
fn close_services() {}
```

Starts run in declaration order after the Beans runtime is ready and before
the body of `main`. Stops run in reverse order after `main` returns normally.
Imported libraries cannot register application lifecycle work.

Lifecycle callbacks are not promised after panic, `os.exit`, forced process
termination, or power loss. `init` and `deinit` still own object lifecycle.

## Threads, nesting, and errors

A hook runs synchronously on the caller's current thread. If it needs a worker,
the handler can enqueue an owned `Send` value to a worker managed by lifecycle
callbacks.

While a handler runs, nested annotated functions still run their bodies, but
their hook handlers are skipped on that thread. This prevents accidental hook
recursion. A handler panic follows the normal Beans panic rule.

This release does not provide `around` or `proceed`, argument or result
rewriting, local-variable hooks, or a `@test` runner.

See [Annotations](/guide/annotations/) for schemas, targets, retention, and
repeatable uses.

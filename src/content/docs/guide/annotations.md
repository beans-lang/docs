---
title: Annotations
description: Declare and use typed metadata on Beans declarations, parameters, and local variables.
---

Annotations add typed metadata to source code. They can describe a type,
function, field, parameter, or local variable without changing normal Beans
semantics. Visibility, ownership, layout, ABI, and safety still use built-in
[modifiers](/guide/attributes/) such as `pub`, `unique`, and `extern "C"`.

Annotation names follow the normal `snake_case` convention for values and
functions.

## Declare and use an annotation

An `annotation` declaration defines a schema. Every field has an explicit type;
a field without a default is required.

<!-- beans:compile -->
```beans
@target(value: ["function", "parameter", "local"])
@retention(value: "tool")
annotation audit {
    event: string
    level: string = "info"
    tags: List<string> = []
}

@audit(event: "start", tags: ["example"])
fn run(@audit(event: "input") value: int) -> int {
    @audit(event: "result")
    let result: int = value + 1
    return result
}

fn main() {
    run(1)
}
```

Use `@name` when the schema has no required fields, or
`@name(field: value, ...)` when passing values. Arguments are always named.
Defaults fill any omitted optional fields.

## Schema field types

An annotation field can use:

- `bool`, integer types, float types, or `decimal`
- `string`
- an enum type
- `List<T>` where `T` is another supported annotation field type

Argument and default values must be compile-time constants. Beans accepts
booleans, numbers, strings, enum variants, and lists of supported values. Calls,
closures, interpolation, object construction, and reads of runtime values are
not annotation constants.

## Where annotations can go

Annotations come after a doc comment and before modifiers such as `pub`.

| Target name | Placement |
|---|---|
| `annotation` | Another annotation declaration |
| `type` | A class, interface, struct, union, or enum |
| `function` | A module-level function |
| `method` | A class or interface method |
| `field` | A type field |
| `variant` | An enum variant |
| `parameter` | A function, method, or enum payload parameter |
| `local` | A local `let` or `var` declaration |
| `c_global` | An `extern "C"` global |

Annotations do not go on call arguments, general expressions, statements, type
uses, or generic parameters.

## Meta-annotations

Beans provides three annotations that configure annotation declarations.

### `@target`

`@target(value: [...])` limits where an annotation may be used. With no
`@target`, every target in the table above is allowed.

```beans
@target(value: ["function", "method"])
annotation traced {
    operation: string
}
```

### `@retention`

`@retention(value: "tool")` keeps checked metadata in HIR and semantic editor
data. `@retention(value: "source")` validates the annotation and then drops it
from checked HIR. The default is `tool`.

`@retention(value: "runtime")` also emits the annotation into the executable.
Code can read it through [`std.reflect`](/guide/reflection/). Runtime retention
is supported on annotation declarations, types, functions, methods, fields,
enum variants, and parameters. It is rejected on locals and C globals because
the runtime API has no descriptor for either target.

### `@repeatable`

An annotation normally appears at most once on one target. Add `@repeatable` to
its declaration when more than one use is meaningful.

```beans
@target(value: ["function"])
@repeatable
annotation route {
    path: string
}

@route(path: "/items")
@route(path: "/v2/items")
fn list_items() {}
```

## Packages and visibility

Annotation declarations have their own namespace. They are private to their
package unless declared `pub`, and imported annotations use the normal package
binding:

```beans
@telemetry.audit(event: "checkout")
pub fn checkout() {}
```

The compiler rejects unknown or private annotations, wrong targets, duplicate
non-repeatable uses, missing or repeated arguments, unknown fields, wrong value
types, and values that are not compile-time constants.

## Metadata and active annotations

An annotation is metadata by default. Declaring `@debug` or `@log` does not
print anything by itself. A compiler tool or library can read `tool` metadata
without changing the annotation grammar.

An annotation schema can opt into checked runtime behavior with
`@runtime_hook`. The compiler then emits direct calls to its declared handlers.
This is not text macro expansion, and it cannot rewrite the annotated function.
See [Runtime hooks](/guide/runtime-hooks/) for the full contract.

Runtime reflection only reads the checked values. It never evaluates annotation
source expressions.

The same rule applies to testing: `@test` is not a built-in test runner feature
in this release. It can be declared as metadata, but no test command consumes it
yet.

---
title: Reflection
description: Inspect types and annotations, access fields by name, and make checked calls at run time.
---

Beans reflection is typed runtime metadata. It can list fields, methods, enum
variants, functions, initializers, and runtime annotations. It can also read or
write a public field and make a checked call by name.

Reflection follows normal Beans rules. It does not bypass `pub`, ownership,
moves, or the target ABI. There is no `setAccessible`, raw memory access, class
loader, proxy generator, or stack inspection.

## Get a type

Import `std.reflect` and use `type_of(T)` for a static type.

<!-- beans:compile -->
```beans
import std.io
import std.reflect

struct User {
    pub name: string
    pub age: int
}

fn main() {
    let user_type: reflect.Type = type_of(User)
    io.println(user_type.qualified_name())
    io.println(user_type.kind())

    for field: reflect.Field in user_type.fields() {
        io.println("{field.name()}: {field.type().qualified_name()}")
    }
}
```

`Type.declared_fields()` and `Type.declared_methods()` only return members
declared on that type. `fields()` and `methods()` include inherited members.
Singular lookup uses `field(name)`, `method(name)`, or `variant(name)` and
returns `Option`.

`Type` also exposes generic arguments, the direct base class, implemented
interfaces, enum variants, an initializer, and runtime annotations. Use
`reflect.types()`, `reflect.functions()`, and `reflect.annotation_types()` to
walk the linked registry.

## Dynamic values

`reflect.Value` is an owned box at a dynamic boundary. `reflect.value(item)`
puts a statically typed value into a box. `Value.type()` reports its stored
type, and checked `as?` gets it back.

```beans
let boxed: reflect.Value = reflect.value(42)
let number: int = (boxed as? int).expect("int")
```

Copyable payloads can be read without consuming the box. Move-only payloads
must move the box into the cast:

```beans
let values: List<int> = [1, 2]
let boxed: reflect.Value = reflect.value(move values)
let restored: List<int> =
    (move boxed as? List<int>).expect("List<int>")
```

`Value.copy()` makes another owned box. It retains reference-shaped data and
walks owned references inside structs, arrays, `Option`, and inline `Result`
values.

## Read and write fields by name

Field access is checked for the receiver type, field type, and visibility.

<!-- beans:compile -->
```beans
import std.io
import std.reflect

class Account {
    pub name: string

    fn init(name: string) { self.name = name }
}

fn main() {
    let account: Account = new Account("old")
    let receiver: reflect.Value = reflect.value(move account)
    let name: reflect.Field =
        type_of(Account).field("name").expect("name")

    name.set(receiver, reflect.value("new")).expect("set name")
    let current: string =
        (name.get(receiver).expect("get name") as? string).expect("string")
    io.println(current)
}
```

A non-`pub` member is still present in metadata, including a strict `priv`
field or method, but reflective access returns a `ReflectError` with kind
`inaccessible`.

## Construct and call

`Initializer.call`, `Variant.make`, `Function.call`, `Method.call`, and
`Method.call_static` take `List<reflect.Value>` and return
`Result<reflect.Value, reflect.ReflectError>`.

Class construction uses the declared or inherited `init`. A struct has a
synthetic initializer whose parameters are all fields in declaration order.
Every struct field must be supplied, including fields with source defaults.
The struct and all of its fields must be public.

Reflected calls support public synchronous Beans functions, instance methods,
static methods, virtual overrides, and initializers. They reject:

- non-`pub` members, including `priv` fields and methods
- `deinit`
- open generic, `extern`, variadic, or `inout` call shapes
- a wrong receiver, argument count, or argument type

The stable error kinds are `missing`, `inaccessible`, `receiver_type`,
`value_type`, `unsupported`, `argument_count`, and `failed`.

## Runtime annotations

Only annotations declared with `@retention(value: "runtime")` enter the
runtime registry. Reflection keeps repeated uses in source order and preserves
checked scalar, enum, and list values.

`AnnotationType` describes the annotation declaration: its retention,
repeatability, allowed targets, schema fields, defaults, and annotations on the
annotation declaration itself. `Annotation` describes one use and its filled
arguments.

See [Annotations](/guide/annotations/) for declaration and target rules.

## JSON and XML

Reflection supplies the pieces a serializer needs: ordered fields, names,
annotations, construction, and checked values. It does not choose a wire
format policy.

JSON and XML packages must define naming, unknown-field, default, versioning,
and numeric conversion rules. Reflection does not silently turn every object
into JSON or XML.

## Metadata scope

Metadata belongs to one executable. Descriptor identity is stable while that
program runs, but descriptor IDs are not a file format and are not stable
across builds or shared-library boundaries.

Open generic declarations can be inspected but not constructed or called.
Unions can be inspected, but reflection does not construct them or access their
overlapping storage.

## See also

- [`std.reflect` API reference](/reference/stdlib/reflect/)
- [Annotations](/guide/annotations/)
- [`std.encoding.json`](/reference/stdlib/json/)
- [`std.encoding.xml`](/reference/stdlib/xml/)

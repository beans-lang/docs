---
title: std.encoding.json
description: Parse and build JSON with a DOM-style Value API backed by yyjson.
---

`std.encoding.json` reads and writes JSON. Parsing gives you a `Value`, a cheap
view over an immutable document. You read fields and elements off that value, and
you can also build new values and turn them into text. Underneath it uses yyjson
(MIT). Read the source at
[`stdlib/std/encoding/json/json.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/json/json.b).

```beans
import std.encoding.json
```

A `Value` holds a shared reference to the whole document. Child values keep the
document alive, so a value pulled out of a parse stays valid as long as you hold
it. Parsing is strict RFC 8259 by default.

Note: a build made with `--runtime freestanding` refuses `std.encoding`. These
packages need the hosted runtime.

## Kinds

`enum Kind` names the type of a value: `null`, `boolean`, `integer`,
`unsigned_integer`, `floating`, `text`, `array`, `object`.

## Options

`class Options` loosens the parser. Every field is off by default:

- `pub allow_comments: bool = false`
- `pub allow_trailing_commas: bool = false`
- `pub allow_inf_nan: bool = false`

These are a small subset of JSON5, not full JSON5.

## Entry

`struct Entry` is one key/value pair from an object:

- `pub key: string`
- `pub value: Value`

## Reading a value

`class Value` methods for inspecting and pulling data out:

| Method | Returns | What it does |
| --- | --- | --- |
| `kind()` | `Kind` | the value's kind |
| `is_null()` | `bool` | whether it is JSON `null` |
| `to_bool()` | `Result<bool>` | the boolean value |
| `to_int()` | `Result<int>` | the value as a signed int |
| `to_uint()` | `Result<u64>` | the value as an unsigned int |
| `to_float()` | `Result<float>` | the value as a float |
| `number()` | `Result<float>` | any numeric value as a float |
| `to_string()` | `Result<string>` | the string value |
| `len()` | `Result<int>` | length of an array or object |
| `at(index)` | `Result<Value>` | element at `index` in an array |
| `elements()` | `Result<List<Value>>` | all array elements |
| `get(key)` | `Option<Value>` | first value for `key` in an object |
| `entries()` | `Result<List<Entry>>` | all key/value pairs, in document order |

`get` returns the first match for a key. `entries` keeps document order and
includes duplicate keys if the input had them.

```beans
import std.io
import std.encoding.json

fn main() {
    let doc: json.Value = json.parse("\{\"name\": \"beans\", \"stars\": 3\}").expect("parse")
    let name: Option<json.Value> = doc.get("name")
    match name {
        some(value) => io.println(value.to_string().expect("string")),   // beans
        none => io.println("no name"),
    }
}
```

## Building a value

Static builders and mutators let you make a document:

| Call | What it does |
| --- | --- |
| `Value.null()` | a JSON null |
| `Value.from_bool(b)` | a boolean |
| `Value.from_int(i)` | a signed integer |
| `Value.from_uint(u)` | an unsigned integer |
| `Value.from_float(f)` | a float |
| `Value.from_string(s)` | a string |
| `Value.array()` | an empty array |
| `Value.object()` | an empty object |
| `push(item) -> Result<bool>` | add `item` to an array |
| `add(key, item) -> Result<bool>` | add `key`/`item` to an object |

`push` and `add` deep-copy the item they take. Values that came from a parse are
read-only, so their kind reports as `immutable` if you try to change them; build
fresh values when you want to mutate.

```beans
import std.io
import std.encoding.json

fn main() {
    let obj: json.Value = json.Value.object()
    obj.add("name", json.Value.from_string("beans")).expect("add")
    obj.add("stars", json.Value.from_int(3)).expect("add")
    io.println(json.stringify(obj).expect("stringify"))   // {"name":"beans","stars":3}
}
```

## Parsing and printing functions

| Function | Returns | What it does |
| --- | --- | --- |
| `parse(text) -> Result<Value>` | `Value` | parse a JSON string |
| `parse_bytes(data: Bytes) -> Result<Value>` | `Value` | parse JSON bytes |
| `parse_with_options(text, options: Options) -> Result<Value>` | `Value` | parse with relaxed rules |
| `parse_bytes_with_options(data, options) -> Result<Value>` | `Value` | same, from bytes |
| `stringify(value) -> Result<string>` | `string` | compact JSON text |
| `stringify_pretty(value, indent) -> Result<string>` | `string` | pretty JSON text |

`stringify` writes compact JSON; a NaN or infinite number makes the result kind
`invalid`. `stringify_pretty` indents; the `indent` string must be exactly two
spaces (`"  "`) or four spaces (`"    "`).

Parse errors come back with kind `invalid`, `eof`, or `memory`, and carry the
byte position where the problem was found.

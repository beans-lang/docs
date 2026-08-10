---
title: std.encoding.json
description: Parse and build JSON with a DOM-style Value API backed by yyjson.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 6 package functions · 4 types · 8 static methods · 15 instance methods · 5 public fields · 8 enum variants.
<!-- coverage:summary:end -->

`std.encoding.json` reads and writes JSON. Parsing gives you a `Value`, a cheap
view over an immutable document; you read fields and elements off that value, or
build new values and turn them into text. It is backed by yyjson (MIT). The
source is [`stdlib/std/encoding/json/json.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/json/json.b).

```beans
import std.encoding.json
```

A `Value` holds a shared reference to the whole document. Child values keep the
document alive, so a value pulled out of a parse stays valid as long as you hold
it. Copying a `Value` is cheap. Parsing is strict RFC 8259 by default.

A build made with `--runtime freestanding` refuses `std.encoding`; these packages
need the hosted runtime.

## Kind

`Kind` names what a value holds.

```beans
pub enum Kind
null
boolean
integer
unsigned_integer
floating
text
array
object
```

Numbers keep their parsed kind: signed integers, unsigned integers, and
floating-point values stay distinct rather than collapsing to `f64`. An integer
too large for both `i64` and `u64` parses as `floating`.

## Options

`Options` opts into three extensions. Every field is off by default, so the
parser is strict RFC 8259 until you turn one on.

```beans
pub class Options
allow_comments: bool = false
allow_trailing_commas: bool = false
allow_inf_nan: bool = false
```

These three flags are a small subset of JSON5, deliberately not full JSON5:
unquoted keys and single quotes are still rejected.

## Entry

One key/value pair from an object, as returned by `entries()`.

```beans
pub struct Entry
pub key: string
pub value: Value
```

## Reading a value

```beans
pub fn kind() -> Kind
pub fn is_null() -> bool
pub fn to_bool() -> Result<bool>
pub fn to_int() -> Result<int>
pub fn to_uint() -> Result<u64>
pub fn to_float() -> Result<float>
pub fn number() -> Result<float>
pub fn to_string() -> Result<string>
pub fn len() -> Result<int>
pub fn at(index: int) -> Result<Value>
pub fn elements() -> Result<List<Value>>
pub fn get(key: string) -> Option<Value>
pub fn entries() -> Result<List<Entry>>
```

- The `to_*` readers fail with kind `type` when the value is the wrong kind.
  `to_int` accepts an unsigned integer when it fits in `i64`; `to_uint` accepts a
  signed integer when it is not negative; `number` accepts any numeric kind and
  returns it as a float.
- `at` fails with kind `range` when the index is out of bounds.
- `get` returns `none` for a missing key, or when the value is not an object. A
  missing field is not an error. With duplicate keys it returns the first;
  `entries()` reports them all in document order.

Read a field, and treat a missing one as absent rather than an error:

<!-- beans:compile -->
```beans
import std.io
import std.encoding.json

fn main() {
    let doc: json.Value = json.parse("\{\"name\": \"beans\", \"stars\": 3\}").expect("parse")

    match doc.get("name") {
        some(value) => io.println(value.to_string().expect("name is text")),
        none => io.println("no name"),
    }
    match doc.get("website") {
        some(value) => io.println(value.to_string().expect("website is text")),
        none => io.println("no website field"),
    }
}
```

## Building a value

Values built with these constructors live in mutable documents. `push` and `add`
deep-copy their argument, so one value can be inserted twice or shared freely.

```beans
pub static fn null() -> Value
pub static fn from_bool(value: bool) -> Value
pub static fn from_int(value: int) -> Value
pub static fn from_uint(value: u64) -> Value
pub static fn from_float(value: float) -> Value
pub static fn from_string(value: string) -> Value
pub static fn array() -> Value
pub static fn object() -> Value
pub fn push(item: Value) -> Result<bool>
pub fn add(key: string, item: Value) -> Result<bool>
```

Values that came from `parse` are read-only: calling `push` or `add` on them
returns an `err` with kind `immutable`. (`immutable` is an error kind, not a
`Kind` variant.) Build fresh values when you need to mutate.

<!-- beans:compile -->
```beans
import std.io
import std.encoding.json

fn main() {
    let obj: json.Value = json.Value.object()
    obj.add("name", json.Value.from_string("beans")).expect("add name")
    obj.add("stars", json.Value.from_int(3)).expect("add stars")

    let tags: json.Value = json.Value.array()
    tags.push(json.Value.from_string("small")).expect("push tag")
    obj.add("tags", tags).expect("add tags")

    io.println(json.stringify(obj).expect("stringify"))
}
```

## Parsing and printing

```beans
pub fn parse(text: string) -> Result<Value>
pub fn parse_bytes(data: Bytes) -> Result<Value>
pub fn parse_with_options(text: string, options: Options) -> Result<Value>
pub fn parse_bytes_with_options(data: Bytes, options: Options) -> Result<Value>
pub fn stringify(value: Value) -> Result<string>
pub fn stringify_pretty(value: Value, indent: string) -> Result<string>
```

- The whole input must be one document; trailing content is an error.
- `stringify` writes compact JSON. A NaN or infinite number makes the result kind
  `invalid`. `stringify_pretty` indents; the `indent` string must be exactly two
  spaces (`"  "`) or four spaces (`"    "`), or you get kind `invalid`.
- Parse errors come back with kind `invalid`, `eof`, or `memory`, and the message
  carries the byte position where the problem was found.

Handle a parse error instead of crashing:

<!-- beans:compile -->
```beans
import std.io
import std.encoding.json

fn main() {
    match json.parse("\{ not valid ]") {
        ok(value) => io.println("parsed a document with {value.len().expect("len")} entries"),
        err(problem) => io.println("bad JSON ({problem.kind}): {problem.msg}"),
    }
}
```

To accept comments and trailing commas, pass `Options`:

<!-- beans:compile -->
```beans
import std.encoding.json

fn main() {
    var options: json.Options = new json.Options()
    options.allow_comments = true
    options.allow_trailing_commas = true
    let doc: json.Value = json.parse_with_options("[1, 2, 3,] // ok", options).expect("parse")
}
```

---
title: std.encoding.json
description: JSON-কে DOM হিসেবে parse করা, struct-এ decode করা, বা struct-কে JSON বানানো।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 10 package functions · 7 types · 8 static methods · 15 instance methods · 7 public fields · 13 enum variants.
<!-- coverage:summary:end -->

`std.encoding.json` JSON পড়ে আর লেখে। DOM-ধাঁচের একটা `Value` পেতে `parse`,
ইনপুটকে struct tree-তে নিতে `decode<T>`, আর struct tree-কে JSON string বানাতে
`encode<T>` ব্যবহার করুন। এর পেছনে আছে yyjson (MIT)। সোর্স হলো
[`stdlib/std/encoding/json/json.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/json/json.b)।

```beans
import std.encoding.json
```

একটা `Value` পুরো document-এর একটা shared reference ধরে রাখে। Child value-গুলো
document-টাকে বাঁচিয়ে রাখে, তাই parse থেকে টেনে বের করা কোনো value যতক্ষণ ধরে
রাখা হয় ততক্ষণ valid থাকে। একটা `Value` কপি করা সস্তা। Parsing ডিফল্টে কড়া RFC 8259।

`--runtime freestanding` দিয়ে বানানো একটা build `std.encoding` মানে না; এই
প্যাকেজগুলোর hosted runtime লাগে।

## Typed struct

`decode<T>` কম্পাইল টাইমে concrete mapping-টা বানিয়ে ফেলে। এর native fast path কোনো
public `Value` wrapper বানায় না আর কোনো runtime reflection metadata স্ক্যান করে না।

```beans
import std.encoding.json

struct Storage {
    @json.name(value: "type")
    pub storage_type: string
    pub capacity_tb: float
}

struct Product {
    pub sku: string
    pub tags: List<string>
    pub storage: Option<Storage>
}

fn read_product(text: string) -> Result<Product> {
    return json.decode(text)
}
```

Typed entry point-গুলো হলো:

```beans
pub fn decode<T>(text: string) -> Result<T>
pub fn decode_bytes<T>(data: Bytes) -> Result<T>
pub fn decode_bytes_in_place<T>(move data: Bytes) -> Result<T>
pub fn decode_with_options<T>(text: string, options: DecodeOptions) -> Result<T>
pub fn encode<T>(value: T) -> Result<string>
pub fn encode_pretty<T>(value: T, indent: string) -> Result<string>
```

দুই দিকেই struct root বা `List<Struct>` root চলে। Field-এ boolean, নানা প্রস্থের
integer, `f32`, `float`, string, nested struct, এক স্তরের list, বা এক স্তরের option
থাকতে পারে। Option-এর ভেতরে supported scalar, struct, বা list থাকতে পারে। Nested
list আর nested option চলে না। `@json.name`, `@json.alias`, `@json.ignore`,
`@json.naming`, আর `@json.allow_unknown` mapping নিয়ন্ত্রণ করে। Encoding primary
mapped নাম ব্যবহার করে; alias শুধু input-এর জন্য। Ignored field output-এ থাকে না।
ভুল root, recursive schema, ডুপ্লিকেট mapped নাম, class, enum, map, fixed array,
Bytes, decimal, unit, আর generic struct কম্পাইল টাইমেই ফেল করে। `@json.bytes`
contract রিজার্ভ করা আছে, তবে typed Bytes support এখনো বানানো হয়নি।
Decode করার সময় ignored field-এর default থাকতে হবে, আর একই schema-তে nested
struct বা list field রাখা যাবে না। Encoding-এ এই সীমা নেই।

ডিফল্টে, না-থাকা required field, অচেনা key, ডুপ্লিকেট key, ভুল kind, আর numeric
overflow — সবই error। একটা না-থাকা `Option<T>` হয়ে যায় `none`; একটা option-এর
জন্য JSON `null` মানা হয়।

`decode_bytes_in_place(move data)` ব্যবহার করুন যখন ইনপুট বাফারটা আর লাগবে না। এটা
yyjson-কে সেই allocation-এ জায়গামতোই parse করতে দেয়, তাই একটা বড় payload-এর জন্য
আর দ্বিতীয় কোনো parse বাফার লাগে না। ফেরত পাওয়া string আর collection-গুলো এখনো
নিজেদের data-র মালিক থাকে আর অস্থায়ী parse tree চলে যাওয়ার পরেও valid থাকে। সাধারণ
`decode` আর `decode_bytes` রূপ কোনো bridge staging ছাড়াই তাদের ইনপুট borrow করে,
কিন্তু সেটা খেয়ে ফেলে না।

```beans
fn read_product_file(path: string) -> Result<Product> {
    let input: Bytes = fs.read_bytes(path)?
    return json.decode_bytes_in_place(move input)
}
```

### Typed mapping type

`Naming` একটা struct-এর প্রতিটা annotation-ছাড়া field-এর নাম বদলে দেয়:

```beans
pub enum Naming
exact
camel_case
snake_case
```

`BytesFormat` typed Bytes সাপোর্টের দুইটা রূপ রিজার্ভ করে রাখে। Bytes decoding
নিজে এই রিলিজে বানানো হয়নি।

```beans
pub enum BytesFormat
base64
array
```

`DecodeOptions` typed-decoder-এর parser flag আর nesting limit বহন করে:

```beans
pub class DecodeOptions
pub parse: Options
pub max_depth: int
```

ডিফল্ট হলো কড়া parsing আর সর্বোচ্চ depth 128।

`encode` compact JSON লেখে। `encode_pretty`-র `indent` হুবহু দুই বা চারটা space
হতে হয়। `Option.none` JSON `null` হয়; NaN আর infinity error। Print করাটা স্পষ্ট:

<!-- beans:compile -->
```beans
import std.io
import std.encoding.json

struct User {
    pub id: u64
    pub name: string
}

fn main() {
    let user: User = User { id: 7, name: "Ada" }
    io.println(json.encode(user).expect("encode user"))
}
```

## Kind

`Kind` বলে দেয় একটা value কী ধরে আছে।

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

সংখ্যা তাদের parse করা kind রাখে: signed integer, unsigned integer, আর
floating-point value আলাদা থাকে, `f64`-তে গুলিয়ে যায় না। `i64` আর `u64` দুটোর
জন্যই বড্ড বড় একটা integer `floating` হিসেবে parse হয়।

## Options

`Options` তিনটা এক্সটেনশন চালু করার সুযোগ দেয়। প্রতিটা field ডিফল্টে বন্ধ, তাই
একটা চালু না করা পর্যন্ত parser কড়া RFC 8259।

```beans
pub class Options
allow_comments: bool = false
allow_trailing_commas: bool = false
allow_inf_nan: bool = false
```

এই তিন flag হলো JSON5-এর একটা ছোট অংশ, ইচ্ছে করেই পুরো JSON5 না: unquoted key আর
single quote এখনো বাতিল হয়।

## Entry

একটা object থেকে একটা key/value জোড়া, যেমনটা `entries()` ফেরত দেয়।

```beans
pub struct Entry
pub key: string
pub value: Value
```

## একটা value পড়া

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

- value-টা ভুল kind-এর হলে `to_*` reader-গুলো `type` kind দিয়ে ফেল করে। `to_int`
  একটা unsigned integer মানে যদি সেটা `i64`-তে আঁটে; `to_uint` একটা signed integer
  মানে যদি সেটা negative না হয়; `number` যেকোনো numeric kind মানে আর সেটাকে float
  হিসেবে ফেরত দেয়।
- index সীমার বাইরে হলে `at` `range` kind দিয়ে ফেল করে।
- `get` না-থাকা key-র জন্য `none` ফেরত দেয়, অথবা value-টা object না হলে। একটা
  না-থাকা field কোনো error না। ডুপ্লিকেট key থাকলে এটা প্রথমটা ফেরত দেয়;
  `entries()` document-এর ক্রম অনুযায়ী সবগুলো জানায়।

একটা field পড়ে, আর না-থাকাটাকে error না ভেবে অনুপস্থিত হিসেবে ধরা যায়:

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

## একটা value বানানো

এই constructor দিয়ে বানানো value mutable document-এ থাকে। `push` আর `add` তাদের
argument-কে deep-copy করে, তাই একটা value দুইবার insert করা যায় বা অবাধে শেয়ার করা যায়।

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

`parse` থেকে আসা value-গুলো read-only: এদের উপর `push` বা `add` কল করলে `immutable`
kind-এর একটা `err` ফেরত আসে। (`immutable` একটা error kind, `Kind`-এর কোনো variant
না।) mutate করার দরকার হলে নতুন value তৈরি করতে হয়।

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

## Parse আর print করা

```beans
pub fn parse(text: string) -> Result<Value>
pub fn parse_bytes(data: Bytes) -> Result<Value>
pub fn parse_with_options(text: string, options: Options) -> Result<Value>
pub fn parse_bytes_with_options(data: Bytes, options: Options) -> Result<Value>
pub fn stringify(value: Value) -> Result<string>
pub fn stringify_pretty(value: Value, indent: string) -> Result<string>
```

- পুরো ইনপুটটা এক document হতে হবে; শেষে বাড়তি কিছু থাকলে সেটা error।
- `stringify` compact JSON লেখে। কোনো NaN বা infinite সংখ্যা থাকলে result-এর kind
  হয় `invalid`। `stringify_pretty` indent করে; `indent` string-টা হুবহু দুই স্পেস
  (`"  "`) বা চার স্পেস (`"    "`) হতে হবে, নয়তো `invalid` kind পাওয়া যায়।
- Parse error ফেরত আসে `invalid`, `eof`, বা `memory` kind নিয়ে, আর message-এ থাকে
  ঠিক কোন byte position-এ সমস্যাটা পাওয়া গেল।

crash না করে একটা parse error সামলানো যায়:

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

comment আর trailing comma মানতে চাইলে `Options` পাঠাতে হয়:

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

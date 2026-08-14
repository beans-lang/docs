---
title: std.encoding.xml
description: XML-কে DOM হিসেবে parse করা, নয়তো সরাসরি checked Beans struct-এ decode করা।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 11 package functions · 6 types · 1 static method · 22 instance methods · 4 public fields · 10 enum variants.
<!-- coverage:summary:end -->

`std.encoding.xml` XML পড়ে আর লেখে। `parse` একটা DOM বানায় আর `Node` view ফেরত
দেয়; `decode<T>` checked XML সরাসরি একটা struct tree-তে লেখে। একটা DOM node একটা
shared owner দিয়ে তার document-কে বাঁচিয়ে রাখে, তাই যে local variable তার root ধরে
রেখেছিল সেটা চলে গেলেও একটা child valid থাকে। একটা node কপি করা সস্তা। ভেতরে ভেতরে
এটা pugixml (MIT) ব্যবহার করে। সোর্স পড়ুন
[`stdlib/std/encoding/xml/xml.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/xml/xml.b)-তে।

```beans
import std.encoding.xml
```

এখানে security-র ডিফল্টগুলো গুরুত্বপূর্ণ:

- একটা `DOCTYPE` ডিফল্টে বাতিল হয়, message-এ তার byte offset সহ। `Options.allow_doctype`
  দিয়ে চালু করলে declaration-টা শুধু একটা নিষ্ক্রিয় node হিসেবে রাখা হয়।
- শুধু পাঁচটা built-in entity আর numeric character reference expand হয়। কোনো
  external-entity ব্যবস্থা নেই, তাই parsing কখনো filesystem বা network-এ হাত দেয়
  না।
- ঠিক একটা root element থাকা লাগবে।

DOM নাম হলো qualified নাম। `prefix()` আর `local_name()` qualified নামটাকে তার
colon-এ ভাগ করে। typed decoder আলাদাভাবে `xmlns` declaration মিলিয়ে নেয় আর একটা
namespace URI প্লাস local নাম মেলাতে পারে, তাই ইনপুটের prefix ভিন্ন হতে পারে।

`--runtime freestanding` দিয়ে বানানো একটা build `std.encoding` মানে না; এই
প্যাকেজগুলোর hosted runtime লাগে।

## Typed decoding

`decode<T>` কম্পাইল টাইমে concrete mapping-টা বানিয়ে ফেলে। Native decoding সরাসরি
চূড়ান্ত struct আর list storage-এ লেখে, কোনো public `Node` wrapper বা runtime
reflection lookup ছাড়াই।

```beans
import std.encoding.xml

@xml.namespace(value: "urn:store")
struct Product {
    @xml.attribute
    pub sku: string
    @xml.name(value: "tag")
    pub tags: List<string>
    pub note: Option<string>
}

fn read_product(text: string) -> Result<Product> {
    return xml.decode(text)
}
```

Typed entry point-গুলো হলো:

```beans
pub fn decode<T>(text: string) -> Result<T>
pub fn decode_bytes<T>(data: Bytes) -> Result<T>
pub fn decode_bytes_in_place<T>(move data: Bytes) -> Result<T>
pub fn decode_with_options<T>(text: string, options: Options) -> Result<T>
```

Struct root আর `List<Struct>` root-এ থাকতে পারে boolean, নানা প্রস্থের integer,
`f32`, `float`, string, nested struct, বারবার আসা list, আর এসব চেহারার option।
`@xml.name`, `@xml.namespace`, `@xml.attribute`, `@xml.text`, `@xml.naming`, আর
`@xml.allow_unknown` দিয়ে বাস্তবায়িত mapping-টা নিয়ন্ত্রণ হয়। `@xml.ignore` ঘোষণা
করা আছে কিন্তু এই রিলিজে বাতিল হয়। একটা namespace annotation URI আর local নাম
মেলায়, ইনপুটের prefix না।

না-থাকা required field, ডুপ্লিকেট attribute বা element, অচেনা ইনপুট, ভুল kind, আর
numeric overflow ডিফল্টে error। একটা না-থাকা option হয়ে যায় `none`।

`decode_bytes_in_place(move data)` ব্যবহার করুন যখন ইনপুট বাফারটা আর লাগবে না।
Pugixml সেই allocation সরাসরি tokenize করে যখন চূড়ান্ত typed value বানানো হয়। এটা
তার নিজস্ব parse কপিটা বাদ দেয়। ফেরত পাওয়া string আর collection এখনো নিজেদের data-র
মালিক থাকে। সাধারণ `decode` আর `decode_bytes` রূপ কোনো bridge staging ছাড়াই তাদের
ইনপুট borrow করে, আর pugixml তার দরকারি private parse কপিটা রেখে দেয়।

```beans
fn read_product_file(path: string) -> Result<Product> {
    let input: Bytes = fs.read_bytes(path)?
    return xml.decode_bytes_in_place(move input)
}
```

### Typed mapping name

`Naming` একটা struct-এর প্রতিটা annotation-ছাড়া field-এর নাম বদলে দেয়:

```beans
pub enum Naming
exact
camel_case
snake_case
```

## NodeKind

`NodeKind` বলে দেয় একটা node কী। Mixed content-এর ক্রম ধরে রাখা হয়, তাই
`children()` এগুলো ঠিক যেভাবে সোর্সে আছে সেভাবেই ফেরত দেয়।

```beans
pub enum NodeKind
element
text
cdata
comment
processing_instruction
declaration
doctype
```

## Options

`Options` parse-এর আচরণ নিয়ন্ত্রণ করে। দুইটা field-ই ডিফল্টে নিরাপদ, হালকা সেটিং।

```beans
pub class Options
pub allow_doctype: bool = false
pub preserve_space_text: bool = false
```

- `allow_doctype` ইনপুটের একটা `DOCTYPE`-কে বাতিল না করে একটা নিষ্ক্রিয় node হিসেবে
  রেখে দেয়।
- `preserve_space_text` শুধু-whitespace text node রেখে দেয়, যেগুলো নয়তো বাদ পড়ে
  যায়।

## Attribute

একটা attribute, declaration-এর ক্রমে।

```beans
pub struct Attribute
pub name: string
pub value: string
```

## class Node

তার document-এর ভেতরের একটা node view। একটা node পড়া হয়:

```beans
pub fn kind() -> NodeKind
pub fn name() -> string
pub fn prefix() -> string
pub fn local_name() -> string
pub fn value() -> string
pub fn text() -> string
pub fn children() -> List<Node>
pub fn attributes() -> List<Attribute>
pub fn attribute(name: string) -> Option<string>
```

- `name()` হলো কাঁচা qualified নাম; `<soap:Body>`-এর জন্য এটা `"soap:Body"`।
  `prefix()` হলো colon-এর আগের অংশ (বা `""`), আর `local_name()` হলো পরের অংশ (বা
  colon না থাকলে পুরো নামটাই)।
- `value()` হলো node-এর নিজের value: text আর CDATA content, একটা comment-এর body,
  একটা processing instruction-এর payload। Element-রা `""` জানায়, কারণ এদের text
  child node-এ থাকে; তার জন্য `text()` ব্যবহার করা হয়।
- `text()` সরাসরি text আর CDATA child-গুলোকে ক্রম অনুযায়ী জোড়া দেয়, mixed
  content-এর জন্য "এই element কী বলছে" জানার চেনা accessor।
- `children()` প্রতিটা child-কে document-এর ক্রমে ফেরত দেয়, mixed content সহ।
  `attributes()` প্রতিটা attribute-কে declaration-এর ক্রমে ফেরত দেয়, আর
  `attribute(name)` সেই qualified নামের প্রথম attribute-টা ফেরত দেয়, নয়তো `none`।

একটা node-এর নিচে build করা হয়:

```beans
pub fn append_element(name: string) -> Result<Node>
pub fn append_text(value: string) -> Result<Node>
pub fn append_cdata(value: string) -> Result<Node>
pub fn append_comment(value: string) -> Result<Node>
pub fn append_processing_instruction(name: string, value: string) -> Result<Node>
pub fn set_attribute(name: string, value: string) -> Result<bool>
```

প্রতিটা `append_*` সেই ধরনের একটা child যোগ করে আর সেটাকে ফেরত দেয়। যে node সেই
child ধরতে পারে না, সেটা `invalid` kind-এর একটা error। `set_attribute` একটা
attribute যোগ করে; একই element-এ আগে থেকেই সেট করা কোনো qualified নাম `exists`
kind দিয়ে ফিরিয়ে দেওয়া হয়। Parse করা document-এ ডুপ্লিকেট attribute থাকতে পারে,
যেগুলো `attributes()` ক্রমে জানায়, তবে ইচ্ছে করে একটা বানানো প্রায় সবসময়ই একটা bug।

## class Document

একটা পুরো XML document। একটা parse করা হয়, নয়তো static `empty()` থেকে একটা build করা হয়।

```beans
pub static fn empty() -> Document

pub fn nodes() -> List<Node>
pub fn declaration() -> Option<Node>
pub fn root() -> Result<Node>
pub fn append_element(name: string) -> Result<Node>
pub fn append_comment(value: string) -> Result<Node>
pub fn append_processing_instruction(name: string, value: string) -> Result<Node>
pub fn append_declaration(version: string, encoding: string) -> Result<Node>
```

- `nodes()` প্রতিটা top-level node-কে ক্রমে ফেরত দেয়: declaration, comment,
  processing instruction, root element, আর চালু করা একটা doctype।
- `declaration()` document-এ একটা `<?xml ...?>` declaration থাকলে সেটা ফেরত দেয়।
- `root()` একমাত্র root element-টা ফেরত দেয়, নয়তো root না থাকলে `not_found` kind-এর
  একটা error।
- `append_element`, `append_comment`, আর `append_processing_instruction` top
  level-এ একটা node যোগ করে। `append_declaration(version, encoding)` যোগ করে
  `<?xml version="..." encoding="..."?>`; সেই attribute বাদ দিতে `encoding`-এ `""`
  পাঠাতে হয়।

## Parse আর print করা

```beans
pub fn parse(text: string) -> Result<Document>
pub fn parse_bytes(data: Bytes) -> Result<Document>
pub fn parse_bytes_in_place(move data: Bytes) -> Result<Document>
pub fn parse_with_options(text: string, options: Options) -> Result<Document>
pub fn parse_bytes_with_options(data: Bytes, options: Options) -> Result<Document>
pub fn stringify(document: Document) -> Result<string>
pub fn stringify_pretty(document: Document, indent: string) -> Result<string>
```

- `parse` আর `parse_with_options` একটা string পড়ে। `parse_bytes` আর
  `parse_bytes_with_options` একটা বাফার পড়ে, একটা UTF-8, UTF-16, বা UTF-32
  byte-order mark মেনে; সেটা না থাকলে bytes-গুলো UTF-8 হিসেবে পড়া হয়।
- `parse_bytes_in_place(move data)` UTF-8 ইনপুট খেয়ে ফেলে আর সেই allocation সরাসরি
  tokenize করে। ফেরত পাওয়া document তার node view-র জন্য বাফারটা বাঁচিয়ে রাখে।
  caller-কে যদি তার ইনপুট রাখতে হয়, তাহলে `parse_bytes` ব্যবহার করুন।
- একটা বাতিল হওয়া `DOCTYPE` ফেরত আসে `doctype` kind নিয়ে, out-of-memory ব্যর্থতা
  `memory` kind নিয়ে, আর অন্য যেকোনো ভাঙাচোরা ইনপুট `invalid` kind নিয়ে। message-এ
  byte offset থাকে, নয়তো ইনপুটটা UTF-16 বা UTF-32 থেকে বদলে নেওয়া হলে বলে যে
  offset অজানা।
- `stringify` content ছুঁয়ে না দেখে compact XML লেখে। `stringify_pretty` প্রতিটা
  depth level-কে `indent` দিয়ে indent করে, যেটা বড়জোর 16 byte হতে পারে; এর চেয়ে
  লম্বা indent `invalid` kind। Escaping আর serialization pugixml-এর নিজের writer-এর।

একটা document parse করে ঘুরে দেখা যায়:

<!-- beans:compile -->
```beans
import std.io
import std.encoding.xml

fn main() {
    let doc: xml.Document = xml.parse("<note><to>beans</to></note>").expect("parse")
    let root: xml.Node = doc.root().expect("root")
    io.println(root.name())                 // note
    for child: xml.Node in root.children() {
        io.println(child.text())            // beans
    }
}
```

একটা document build করে print করা যায়:

<!-- beans:compile -->
```beans
import std.io
import std.encoding.xml

fn main() {
    let doc: xml.Document = xml.Document.empty()
    doc.append_declaration("1.0", "UTF-8").expect("declaration")

    let note: xml.Node = doc.append_element("note").expect("note")
    note.set_attribute("id", "1").expect("attribute")

    let to: xml.Node = note.append_element("to").expect("to")
    to.append_text("beans").expect("text")

    io.println(xml.stringify(doc).expect("stringify"))
}
```

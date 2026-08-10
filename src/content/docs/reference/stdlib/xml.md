---
title: std.encoding.xml
description: Parse and build XML with a DOM API backed by pugixml, with DOCTYPE rejected by default.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 6 package functions · 5 types · 1 static method · 22 instance methods · 4 public fields · 7 enum variants.
<!-- coverage:summary:end -->

`std.encoding.xml` reads and writes XML through a DOM: `parse` materializes the
whole document and a `Node` is a view into it. A node keeps its document alive
through a shared owner, so a child stays valid after the local variable holding
its root is gone. Copying a node is cheap. Underneath it uses pugixml (MIT). Read
the source at
[`stdlib/std/encoding/xml/xml.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/xml/xml.b).

```beans
import std.encoding.xml
```

Security defaults matter here:

- A `DOCTYPE` is rejected by default, with its byte offset in the message. Opting
  in with `Options.allow_doctype` only keeps the declaration as an inert node.
- Only the five built-in entities and numeric character references are expanded.
  There is no external-entity mechanism, so parsing never touches the filesystem
  or the network.
- Exactly one root element is required.

Names are qualified names. `prefix()` and `local_name()` split the qualified name
at its colon; there is no namespace-URI resolution, so prefixes are read as text
and are not matched against `xmlns` declarations.

A build made with `--runtime freestanding` refuses `std.encoding`; these packages
need the hosted runtime.

## NodeKind

`NodeKind` names what a node is. Mixed content order is preserved, so
`children()` returns these exactly as they appear in the source.

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

`Options` controls parse behaviour. Both fields default to the safe, lean
setting.

```beans
pub class Options
pub allow_doctype: bool = false
pub preserve_space_text: bool = false
```

- `allow_doctype` keeps a `DOCTYPE` in the input as an inert node instead of
  rejecting it.
- `preserve_space_text` keeps whitespace-only text nodes, which are otherwise
  dropped.

## Attribute

One attribute, in declaration order.

```beans
pub struct Attribute
pub name: string
pub value: string
```

## class Node

A node view into its document. Read a node:

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

- `name()` is the raw qualified name; for `<soap:Body>` it is `"soap:Body"`.
  `prefix()` is the part before the colon (or `""`), and `local_name()` is the
  part after (or the whole name when there is no colon).
- `value()` is the node's own value: text and CDATA content, a comment's body, a
  processing instruction's payload. Elements report `""`, because their text
  lives in child nodes; use `text()` for that.
- `text()` joins the direct text and CDATA children in order, the usual "what
  does this element say" accessor for mixed content.
- `children()` returns every child in document order, mixed content included.
  `attributes()` returns every attribute in declaration order, and
  `attribute(name)` returns the first attribute with that qualified name, or
  `none`.

Build under a node:

```beans
pub fn append_element(name: string) -> Result<Node>
pub fn append_text(value: string) -> Result<Node>
pub fn append_cdata(value: string) -> Result<Node>
pub fn append_comment(value: string) -> Result<Node>
pub fn append_processing_instruction(name: string, value: string) -> Result<Node>
pub fn set_attribute(name: string, value: string) -> Result<bool>
```

Each `append_*` adds a child of that kind and returns it. A node that cannot hold
that child is an error with kind `invalid`. `set_attribute` adds one attribute; a
qualified name that is already set on the same element is refused with kind
`exists`. Parsed documents may still carry duplicate attributes, reported in
order by `attributes()`, but building one on purpose is almost always a bug.

## class Document

A whole XML document. Parse one, or build one from the static `empty()`.

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

- `nodes()` returns every top-level node in order: the declaration, comments,
  processing instructions, the root element, and an opted-in doctype.
- `declaration()` returns the `<?xml ...?>` declaration when the document has one.
- `root()` returns the single root element, or an error with kind `not_found`
  when there is none.
- `append_element`, `append_comment`, and `append_processing_instruction` add a
  node at the top level. `append_declaration(version, encoding)` adds
  `<?xml version="..." encoding="..."?>`; pass `""` for `encoding` to omit that
  attribute.

## Parsing and printing

```beans
pub fn parse(text: string) -> Result<Document>
pub fn parse_bytes(data: Bytes) -> Result<Document>
pub fn parse_with_options(text: string, options: Options) -> Result<Document>
pub fn parse_bytes_with_options(data: Bytes, options: Options) -> Result<Document>
pub fn stringify(document: Document) -> Result<string>
pub fn stringify_pretty(document: Document, indent: string) -> Result<string>
```

- `parse` and `parse_with_options` read a string. `parse_bytes` and
  `parse_bytes_with_options` read a buffer, honouring a UTF-8, UTF-16, or UTF-32
  byte-order mark; without one the bytes are read as UTF-8.
- A rejected `DOCTYPE` comes back with kind `doctype`, an out-of-memory failure
  with kind `memory`, and any other malformed input with kind `invalid`. The
  message carries the byte offset, or says the offset is unknown when the input
  was transcoded from UTF-16 or UTF-32.
- `stringify` writes compact XML with content untouched. `stringify_pretty`
  indents each depth level with `indent`, which may be up to 16 bytes; a longer
  indent is kind `invalid`. Escaping and serialization are pugixml's own writer.

Parse a document and walk it:

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

Build a document and print it:

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

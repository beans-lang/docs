---
title: std.encoding.xml
description: Parse and build XML with a DOM API backed by pugixml, with DOCTYPE rejected by default.
---

`std.encoding.xml` reads and writes XML through a DOM (a tree of nodes you walk),
not a streaming parser. Underneath it uses pugixml (MIT). Read the source at
[`stdlib/std/encoding/xml/xml.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/xml/xml.b).

```beans
import std.encoding.xml
```

Security defaults matter here:

- A `DOCTYPE` is rejected by default (turn it on with an option if you must).
- Only the five built-in entities and numeric character references are expanded.
- Parsing never reads the filesystem or the network.
- Exactly one root element is required.

Note: a build made with `--runtime freestanding` refuses `std.encoding`.

## Node kinds

`enum NodeKind`: `element`, `text`, `cdata`, `comment`,
`processing_instruction`, `declaration`, `doctype`.

## Options

`class Options`:

- `pub allow_doctype: bool = false` — allow a `DOCTYPE` in the input.
- `pub preserve_space_text: bool = false` — keep whitespace-only text nodes.

## Attribute

`struct Attribute`:

- `pub name: string`
- `pub value: string`

## class Node

Read a node:

| Method | Returns | What it does |
| --- | --- | --- |
| `kind()` | `NodeKind` | the node's kind |
| `name()` | `string` | raw qualified name, like `ns:tag` |
| `prefix()` | `string` | the namespace prefix part |
| `local_name()` | `string` | the name without the prefix |
| `value()` | `string` | the node's own value |
| `text()` | `string` | direct text and CDATA children joined together |
| `children()` | `List<Node>` | child nodes |
| `attributes()` | `List<Attribute>` | the node's attributes |
| `attribute(name)` | `Option<string>` | one attribute's value by name |

Build under a node:

| Method | Returns | What it does |
| --- | --- | --- |
| `append_element(name)` | `Result<Node>` | add a child element |
| `append_text(value)` | `Result<Node>` | add a text child |
| `append_cdata(value)` | `Result<Node>` | add a CDATA child |
| `append_comment(value)` | `Result<Node>` | add a comment child |
| `append_processing_instruction(name, value)` | `Result<Node>` | add a processing instruction |
| `set_attribute(name, value)` | `Result<bool>` | set an attribute |

Setting an attribute whose name already exists gives an error with kind `exists`.

## class Document

The whole document. Build an empty one with the static `empty()`:

| Member | Returns | What it does |
| --- | --- | --- |
| `Document.empty()` (static) | `Document` | a new empty document |
| `nodes()` | `List<Node>` | the top-level nodes |
| `declaration()` | `Option<Node>` | the `<?xml ...?>` declaration, if any |
| `root()` | `Result<Node>` | the single root element; kind `not_found` if none |
| `append_element(name)` | `Result<Node>` | add a top-level element |
| `append_comment(value)` | `Result<Node>` | add a top-level comment |
| `append_processing_instruction(name, value)` | `Result<Node>` | add a top-level PI |
| `append_declaration(version, encoding)` | `Result<Node>` | add the XML declaration |

## Parsing and printing functions

| Function | Returns | What it does |
| --- | --- | --- |
| `parse(text) -> Result<Document>` | `Document` | parse an XML string |
| `parse_bytes(data) -> Result<Document>` | `Document` | parse XML bytes, honoring a byte-order mark |
| `parse_with_options(text, options)` | `Result<Document>` | parse with options |
| `parse_bytes_with_options(data, options)` | `Result<Document>` | same, from bytes |
| `stringify(document) -> Result<string>` | `string` | compact XML text |
| `stringify_pretty(document, indent) -> Result<string>` | `string` | pretty XML text; `indent` up to 16 bytes |

There is no namespace-URI resolution. Prefixes are read as text; they are not
matched against `xmlns` declarations.

```beans
import std.io
import std.encoding.xml

fn main() {
    let doc: xml.Document = xml.parse("<note><to>beans</to></note>").expect("parse")
    let root: xml.Node = doc.root().expect("root")
    io.println(root.name())                 // note
    for child in root.children() {
        io.println(child.text())            // beans
    }
}
```

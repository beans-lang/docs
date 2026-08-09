---
title: std.encoding.base64
description: Base64 encode and decode, with standard, URL-safe, and no-padding variants.
---

`std.encoding.base64` turns bytes into Base64 text and back. It supports the
standard alphabet and the URL-safe alphabet, each with or without padding.
Underneath it uses simdutf (MIT). Read the source at
[`stdlib/std/encoding/base64/base64.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/base64/base64.b).

```beans
import std.encoding.base64
```

Note: a build made with `--runtime freestanding` refuses `std.encoding`.

## The four encodings

`enum Encoding` has four members:

- `standard` — the normal alphabet, with `=` padding.
- `standard_no_pad` — normal alphabet, no padding.
- `url_safe` — `-` and `_` instead of `+` and `/`, with padding.
- `url_safe_no_pad` — URL-safe alphabet, no padding.

Each encoding value has three methods:

| Method | Returns | What it does |
| --- | --- | --- |
| `encode(data: Bytes) -> string` | `string` | encode bytes to Base64 text |
| `decode(text: string) -> Result<Bytes>` | `Bytes` | strict decode (RFC 4648) |
| `decode_forgiving(text: string) -> Result<Bytes>` | `Bytes` | lenient decode (WHATWG rules) |

`decode` is strict. On bad input it returns an error whose kind tells you what was
wrong — `invalid`, `length`, `padding`, `bits`, or `whitespace` — along with the
position.

`decode_forgiving` follows the WHATWG "forgiving base64" rules: it skips ASCII
whitespace, accepts a partial final group, and ignores non-zero trailing bits.

```beans
import std.io
import std.encoding.base64

fn main() {
    let text: string = base64.Encoding.url_safe.encode(Bytes.from("hi?"))
    io.println(text)
    let back: Bytes = base64.Encoding.url_safe.decode(text).expect("decode")
    io.println(back.to_string())            // hi?
}
```

## Module-level shortcuts

For the common case — standard alphabet, padded, strict decoding — call these
directly without naming an encoding:

| Function | Same as |
| --- | --- |
| `encode(data: Bytes) -> string` | `Encoding.standard.encode` |
| `decode(text: string) -> Result<Bytes>` | `Encoding.standard.decode` |
| `decode_forgiving(text: string) -> Result<Bytes>` | `Encoding.standard.decode_forgiving` |

```beans
import std.io
import std.encoding.base64

fn main() {
    let text: string = base64.encode(Bytes.from("beans"))
    io.println(text)                         // YmVhbnM=
    io.println(base64.decode(text).expect("decode").to_string())   // beans
}
```

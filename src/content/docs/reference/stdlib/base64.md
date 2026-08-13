---
title: std.encoding.base64
description: Base64 encode and decode, with standard, URL-safe, and no-padding variants.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 3 package functions · 1 type · 3 instance methods · 4 enum variants.
<!-- coverage:summary:end -->

`std.encoding.base64` turns bytes into Base64 text and back. It supports the
standard alphabet and the URL-safe alphabet, each with or without padding.
Underneath it uses simdutf (MIT). Read the source at
[`stdlib/std/encoding/base64/base64.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/base64/base64.b).

```beans
import std.encoding.base64
```

Note: a build made with `--runtime freestanding` refuses `std.encoding`.

## Encoding

`Encoding` is an enum with the four RFC 4648 alphabets and padding modes.

```beans
pub enum Encoding
standard
standard_no_pad
url_safe
url_safe_no_pad
```

- `standard` is the normal alphabet with `=` padding. `standard_no_pad` is the
  normal alphabet without padding. `url_safe` uses `-` and `_` in place of `+` and
  `/`, with padding. `url_safe_no_pad` is the URL-safe alphabet without padding.

Each encoding value has three methods:

```beans
pub fn encode(data: Bytes) -> string
pub fn decode(text: string) -> Result<Bytes>
pub fn decode_forgiving(text: string) -> Result<Bytes>
```

- `encode` turns bytes into Base64 text. The output length is exact for the chosen
  encoding. Native builds allocate that final string once and fill it directly.
- `decode` is strict RFC 4648. On bad input it returns an error whose kind tells you
  what was wrong: `invalid` (a byte outside the alphabet), `length` (a lone
  trailing character), `padding` (padding that does not match the encoding), `bits`
  (non-zero trailing padding bits), or `whitespace` (whitespace, which strict mode
  rejects). The message carries the byte position.
- `decode_forgiving` follows the WHATWG "forgiving base64" rules: it skips ASCII
  whitespace, accepts a partial final group with or without padding, and ignores
  non-zero trailing padding bits. Bytes outside the alphabet are still errors.

Decode fills its result `Bytes` directly and shrinks that same allocation to the
decoded length. Strict no-padding forms validate the final group without making
a padded copy of the input. These are implementation gains; the API and owned
result behavior do not change.

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

For the common case (standard alphabet, padded, strict decoding) call these
directly without naming an encoding. Each is the matching `Encoding.standard`
method in one call.

```beans
pub fn encode(data: Bytes) -> string
pub fn decode(text: string) -> Result<Bytes>
pub fn decode_forgiving(text: string) -> Result<Bytes>
```

```beans
import std.io
import std.encoding.base64

fn main() {
    let text: string = base64.encode(Bytes.from("beans"))
    io.println(text)                         // YmVhbnM=
    io.println(base64.decode(text).expect("decode").to_string())   // beans
}
```

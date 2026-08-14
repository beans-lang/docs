---
title: std.encoding.base64
description: বাইটকে Base64 টেক্সটে বদলানো আর ফেরত আনা — standard, URL-safe, আর no-padding, সব ভ্যারিয়েন্টেই।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 3টা package function · 1টা type · 3টা instance method · 4টা enum variant।
<!-- coverage:summary:end -->

`std.encoding.base64` দিয়ে বাইটকে Base64 টেক্সটে বদলানো যায়, আবার টেক্সট থেকে বাইট ফেরত আনা যায়। standard alphabet আর URL-safe alphabet দুটোই চলে, আর দুটোই padding সহ বা ছাড়া। ভেতরে এটা simdutf (MIT) ব্যবহার করে। source দেখুন এখানে:
[`stdlib/std/encoding/base64/base64.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/base64/base64.b)।

```beans
import std.encoding.base64
```

খেয়াল রাখতে হবে: `--runtime freestanding` দিয়ে বানানো build কিন্তু `std.encoding` নেবে না।

## Encoding

`Encoding` একটা enum। এতে RFC 4648-এর চারটা alphabet আর padding mode আছে।

```beans
pub enum Encoding
standard
standard_no_pad
url_safe
url_safe_no_pad
```

- `standard` হলো সাধারণ alphabet, সাথে `=` padding। `standard_no_pad` একই alphabet কিন্তু padding ছাড়া। `url_safe`-এ `+` আর `/`-এর জায়গায় `-` আর `_` বসে, padding সহ। `url_safe_no_pad` হলো সেই URL-safe alphabet-ই, শুধু padding ছাড়া।

প্রতিটা encoding value-র সাথে তিনটা method আছে:

```beans
pub fn encode(data: Bytes) -> string
pub fn decode(text: string) -> Result<Bytes>
pub fn decode_forgiving(text: string) -> Result<Bytes>
```

- `encode` বাইটকে Base64 টেক্সটে বদলায়। যে encoding বাছা হয়, output-এর length ঠিক সেই অনুযায়ী মাপা থাকে। native build-এ শেষের string-টা একবারেই allocate হয়ে সরাসরি ভরে যায়।
- `decode` কড়া RFC 4648 নিয়ম মেনে চলে। input খারাপ হলে error দেয়, আর error-এর kind দেখেই বোঝা যায় কোথায় সমস্যা হয়েছিল: `invalid` (alphabet-এর বাইরের কোনো বাইট), `length` (শেষে একলা একটা অক্ষর ঝুলে আছে), `padding` (padding encoding-এর সাথে মিলছে না), `bits` (padding-এর শেষের bit-গুলো শূন্য না), বা `whitespace` (whitespace, কড়া mode এটা নেয় না)। message-টা বলে দেয় কোন বাইট-position-এ সমস্যা।
- `decode_forgiving` চলে WHATWG-র "forgiving base64" নিয়মে: ASCII whitespace বাদ দিয়ে যায়, শেষের group অসম্পূর্ণ থাকলেও নেয় (padding থাক বা না থাক), আর শেষের নন-জিরো padding bit-গুলো উপেক্ষা করে। তবে alphabet-এর বাইরের বাইট থাকলে সেটা এখনো error।

decode তার result `Bytes`-টা সরাসরি ভরে ফেলে, আর সেই একই allocation ছোট করে decode হওয়া length-এ নামিয়ে আনে। কড়া no-padding form-গুলো শেষের group যাচাই করে input-এর একটা padded copy না বানিয়েই। এগুলো ভেতরের কারিগরি লাভ; API আর owned result-এর আচরণ বদলায় না।

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

## Module-level শর্টকাট

সবচেয়ে কমন কেসটার জন্য (standard alphabet, padded, কড়া decoding) কোনো encoding-এর নাম না বলেই এগুলো সরাসরি ডাকা যায়। প্রতিটাই সেই মিলে যাওয়া `Encoding.standard` method, এক কলে।

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

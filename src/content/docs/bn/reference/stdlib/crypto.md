---
title: std.crypto
description: SHA-1, SHA-256 আর HMAC — সবই platform-এর নিজের crypto library থেকে নেওয়া।
---

`std.crypto` দুটো hash আর HMAC দেয়, আর তিনটেই নেয় operating system থেকে: macOS-এ CommonCrypto, Windows-এ CNG, আর Linux/BSD-তে runtime-এ load করা libcrypto। কোনো hash-এর implementation এখানে ship হয় না। source আছে এখানে: [`stdlib/std/crypto/crypto.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/crypto/crypto.b)।

```beans
import std.crypto
```

## যে নিয়মগুলো এই package-টাকে গড়ে তুলেছে

- **cryptography-র মালিক platform।** hash ঠিক সেই জিনিস যেটা নিজে বয়ে বেড়ানোর চেয়ে OS থেকে নেওয়া উচিত, তাই এই package একটা পাতলা আর সৎ wrapper। `available()` বলে দেয় provider আছে কি না — macOS আর Windows-এ সবসময় আছে, অন্যত্র একটা libcrypto install করা থাকার উপর নির্ভর করে।
- **ইচ্ছে করেই ন্যূনতম।** SHA-1 আছে কারণ WebSocket handshake-এ ওটা লাগে; SHA-256 আছে কারণ তার উপরের protocol-গুলোতে লাগে। এটা general cryptography toolkit না, আর হওয়ার কথাও না। এর বেশি কিছু দরকার হলে সেটা এমন library-র কাজ যার একমাত্র কাজই cryptography।
- **HMAC এখানেই বানানো**, platform digest-এর উপরে, RFC 2104-এর চেনা ipad/opad গড়ন দিয়ে — তাই C bridge-এ বাড়তি কিছু চাপে না।
- **`finish` করলে `Hasher` শেষ।** এরপর ব্যবহার করলে `closed` kind-এর `err` আসে, কারণ যে digest দুবার পড়া যায় তার state নিয়ে যুক্তি করা যায় না।

যেসব error kind দেখা যেতে পারে: `unsupported` (এই platform-এ provider নেই), `closed` (শেষ হয়ে যাওয়া hasher), `io` (provider fail করেছে)।

## Algorithm

কোন digest বানানো হবে।

```beans
pub enum Algorithm {
    sha1
    sha256
}
```

`Algorithm.sha1` দেয় 20 byte, `Algorithm.sha256` দেয় 32 byte।

## Module function

```beans
pub fn available() -> bool
pub fn sha1(data: Bytes) -> Result<Bytes>
pub fn sha256(data: Bytes) -> Result<Bytes>
pub fn hmac(algorithm: Algorithm, key: Bytes, data: Bytes) -> Result<Bytes>
```

`sha1` আর `sha256` হলো one-shot রূপ। `hmac` `key` দিয়ে digest-টাকে key করে; 64-byte block-এর চেয়ে লম্বা key তার নিজের digest দিয়ে বদলে যায়, ঠিক যেমনটা RFC 2104 বলে।

```beans
let digest: Bytes = crypto.sha256(Bytes.from("abc"))?
let mac: Bytes = crypto.hmac(crypto.Algorithm.sha256, key, message)?
```

## Hasher

টুকরো টুকরো করে আসা data-র জন্য streaming digest। move-only এবং `Send`।

```beans
pub unique class Hasher implements Send
pub static fn open(algorithm: Algorithm) -> Result<Hasher>
pub fn update(data: Bytes) -> Result<bool>
pub fn finish() -> Result<Bytes>
```

`update` চলমান digest-এ byte যোগ করে; `finish` ফল দেয় আর hasher-টা শেষ করে দেয়। streaming আর one-shot সবসময় একই উত্তর দেয়:

```beans
let hasher: crypto.Hasher = crypto.Hasher.open(crypto.Algorithm.sha256)?
hasher.update(Bytes.from("a"))?
hasher.update(Bytes.from("bc"))?
let digest: Bytes = hasher.finish()?   // sha256("abc")-এর সমান
```

## WebSocket handshake

এই এক জায়গায় SHA-1 কেবল থাকলেই হয় না, লাগেই। `Sec-WebSocket-Accept` হলো client key আর একটা নির্দিষ্ট UUID জোড়া দিয়ে তার SHA-1-এর base64 — [`std.websocket`](/bn/reference/stdlib/websocket/) এটা `accept_for_key` দিয়ে করে দেয়, তবু গড়নটা দেখে রাখা ভালো:

```beans
let joined: string = "{client_key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
let accept: string = base64.encode(crypto.sha1(Bytes.from(joined))?)
```

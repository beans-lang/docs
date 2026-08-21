---
title: std.crypto
description: SHA-1, SHA-256 and HMAC, taken from the platform's own crypto library.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 4 package functions · 2 types · 1 static method · 2 instance methods · 2 enum variants.
<!-- coverage:summary:end -->

`std.crypto` provides two hashes and HMAC, and takes all of them from the
operating system: CommonCrypto on macOS, CNG on Windows, and libcrypto loaded at
runtime on Linux and BSD. No hash implementation ships here. The source is
[`stdlib/std/crypto/crypto.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/crypto/crypto.b).

```beans
import std.crypto
```

## Rules that shape the package

- **The platform owns the cryptography.** A hash is exactly the kind of thing to
  take from the OS rather than carry, so this package is a thin, honest wrapper.
  `available()` reports whether a provider is present — always true on macOS and
  Windows, dependent on a libcrypto being installed elsewhere.
- **Minimal by design.** SHA-1 exists because the WebSocket handshake needs it;
  SHA-256 because the protocols above it do. This is not a general cryptography
  toolkit and is not meant to become one. Anything more belongs in a library that
  makes cryptography its whole job.
- **HMAC is built here**, on the platform digest, using the standard ipad/opad
  construction from RFC 2104 — so nothing extra rides in the C bridge.
- **A `Hasher` is spent by `finish`.** Using one afterwards is an `err` with kind
  `closed`, because a digest that could be read twice would be a digest whose
  state you cannot reason about.

Error kinds you may see: `unsupported` (no provider on this platform), `closed`
(a spent hasher), `io` (the provider failed).

## Algorithm

Which digest to compute.

```beans
pub enum Algorithm {
    sha1
    sha256
}
```

`Algorithm.sha1` produces 20 bytes, `Algorithm.sha256` produces 32.

## Module functions

```beans
pub fn available() -> bool
pub fn sha1(data: Bytes) -> Result<Bytes>
pub fn sha256(data: Bytes) -> Result<Bytes>
pub fn hmac(algorithm: Algorithm, key: Bytes, data: Bytes) -> Result<Bytes>
```

`sha1` and `sha256` are the one-shot forms. `hmac` keys a digest with `key`; a
key longer than the 64-byte block is replaced by its own digest, exactly as
RFC 2104 specifies.

```beans
let digest: Bytes = crypto.sha256(Bytes.from("abc"))?
let mac: Bytes = crypto.hmac(crypto.Algorithm.sha256, key, message)?
```

## Hasher

A streaming digest, for data that arrives in pieces. Move-only and `Send`.

```beans
pub unique class Hasher implements Send
pub static fn open(algorithm: Algorithm) -> Result<Hasher>
pub fn update(data: Bytes) -> Result<bool>
pub fn finish() -> Result<Bytes>
```

`update` adds bytes to the running digest; `finish` produces the result and
spends the hasher. Streaming and one-shot always agree:

```beans
let hasher: crypto.Hasher = crypto.Hasher.open(crypto.Algorithm.sha256)?
hasher.update(Bytes.from("a"))?
hasher.update(Bytes.from("bc"))?
let digest: Bytes = hasher.finish()?   // the same digest as sha256("abc")
```

## The WebSocket handshake

The one place SHA-1 is required rather than merely available. `Sec-WebSocket-Accept`
is base64 of SHA-1 over the client key concatenated with one fixed UUID —
[`std.websocket`](/reference/stdlib/websocket/) does this for you through
`accept_for_key`, but the shape is worth seeing:

```beans
let joined: string = "{client_key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
let accept: string = base64.encode(crypto.sha1(Bytes.from(joined))?)
```

---
title: std.tls
description: TLS from the platform's own stack, wrapping a TcpStream as a filter.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 1 package function · 1 type · 3 static methods · 6 instance methods.
<!-- coverage:summary:end -->

`std.tls` wraps a connected `TcpStream` in TLS using the operating system's own
implementation — SecureTransport on macOS, SChannel on Windows, OpenSSL 3 loaded
at runtime on Linux and BSD — behind one API that never names which. The source
is [`stdlib/std/tls/tls.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/tls/tls.b).

```beans
import std.tls
```

## Rules that shape the package

- **The platform owns the cryptography and the trust decision.** Certificate
  chain building and hostname verification always belong to the platform
  verifier; this package never reimplements either. That is not a convenience —
  it is the only way to inherit the OS's revocation, policy and root updates.
- **Extra roots add, they never replace.** `connect_with_roots` widens which
  anchors are acceptable for one connection, for a private CA or a pinned root.
  The system store still applies, so a normal public chain still verifies.
- **A stream cut without `close_notify` is an error.** An empty `read` means the
  peer announced the end; a transport that dies before that is kind `eof`,
  whether it ended in FIN or RST. That is the truncation attack surfaced instead
  of hidden — a stack that reports it as end-of-data lets an attacker truncate
  any response at a boundary of their choosing.
- **The stream owns its socket** and behaves like `TcpStream` above the
  encryption: partial reads and writes, `write_all` and `read_exact` for when you
  want all of it.

Error kinds you may see: `handshake` (certificate, hostname or protocol),
`eof` (truncation, or the peer closing mid-handshake), `protocol` (record
layer), `unsupported` (no backend on this platform), `closed`, plus the
transport's own.

## One backend difference worth knowing

macOS SecureTransport negotiates **TLS 1.2 at most**. Apple never added 1.3 to
it; the replacement lives in Network.framework. A 1.3-only peer is therefore
refused with kind `handshake` on macOS and accepted everywhere else — a clean
refusal, never a silent downgrade. The API is shaped so that swapping macOS to
Network.framework later changes nothing a caller can see.

## Module functions

```beans
pub fn available() -> bool
```

True when a TLS backend is present. Always true on macOS; on Linux it depends on
a libssl being installed at runtime.

## TlsStream

A TLS connection over a `TcpStream`. Move-only: it owns the socket, and closing
sends `close_notify` before closing it.

```beans
pub static fn connect(host: string, port: int, alpn: string) -> Result<TlsStream>
pub static fn connect_timeout(host: string, port: int, alpn: string, ms: int) -> Result<TlsStream>
pub static fn connect_with_roots(host: string, port: int, alpn: string, extra_roots: Bytes, ms: int) -> Result<TlsStream>
pub fn protocol() -> string
pub fn write(data: Bytes) -> Result<int>
pub fn write_all(data: Bytes) -> Result<int>
pub fn read(max: int) -> Result<Bytes>
pub fn read_exact(count: int) -> Result<Bytes>
pub fn close() -> Result<bool>
```

`alpn` is a comma-separated protocol list — `"h2,http/1.1"` — or empty for none.
`protocol()` reports what was agreed, or an empty string if nothing was.
`extra_roots` is a PEM bundle; an empty one makes `connect_with_roots` exactly
`connect`.

```beans
let secure: tls.TlsStream =
    tls.TlsStream.connect("example.test", 443, "h2,http/1.1")?
io.println(secure.protocol())
secure.write_all(Bytes.from(request))?
let reply: Bytes = secure.read(16384)?    // empty means close_notify arrived
secure.close()?
```

## Talking to a private CA

The shape for a test server, an internal service, or a pinned root:

```beans
let roots: Bytes = fs.read_bytes("ca.pem")?
let secure: tls.TlsStream =
    tls.TlsStream.connect_with_roots("localhost", port, "", roots, 8000)?
```

The certificate is still checked for expiry, hostname and chain — adding an
anchor only says which roots may sign, never that verification is skipped.

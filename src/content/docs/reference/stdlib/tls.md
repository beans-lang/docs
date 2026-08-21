---
title: std.tls
description: TLS clients and servers from the platform stack, with PEM, PKCS#12, SNI, and ALPN.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 1 package function · 3 types · 12 static methods · 8 instance methods.
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
- **TLS handles stay on one thread.** `TlsStream` and `TlsListener` are move-only
  but do not implement `Send`. Platform TLS state is not promised to survive a
  thread handoff.

Error kinds you may see: `handshake` (certificate, hostname or protocol),
`eof` (truncation, or the peer closing mid-handshake), `protocol` (record
layer), `unsupported` (no backend on this platform), `closed`, plus the
transport's own.

## One backend difference worth knowing

macOS client connections and `TlsStream.accept` use SecureTransport, which
negotiates **TLS 1.2 at most**. A 1.3-only peer is refused with kind `handshake`,
never silently downgraded. `TlsListener` uses Network.framework on macOS, so its
accepted connections support TLS 1.3, server ALPN, and SNI.

## Module functions

```beans
pub fn available() -> bool
```

True when a TLS backend is present. Always true on macOS; on Linux it depends on
a libssl being installed at runtime.

## TlsIdentity

One server certificate identity. Use an empty `name` for the default identity;
named identities are selected by SNI.

```beans
pub class TlsIdentity
pub static fn pem(name: string, move certificate: Bytes, move private_key: Bytes, password: string = "") -> TlsIdentity
pub static fn pkcs12(name: string, move bundle: Bytes, password: string) -> TlsIdentity
```

`pem` takes a certificate chain and private key. `pkcs12` takes one PKCS#12
bundle. Both move the secret byte buffers into the identity.

## TlsStream

A TLS connection over a `TcpStream`. Move-only and local to one thread: it owns
the socket, and closing sends `close_notify` before closing it.

```beans
pub static fn connect(host: string, port: int, alpn: string) -> Result<TlsStream>
pub static fn connect_timeout(host: string, port: int, alpn: string, ms: int) -> Result<TlsStream>
pub static fn connect_with_roots(host: string, port: int, alpn: string, extra_roots: Bytes, ms: int) -> Result<TlsStream>
pub static fn connect_address_with_roots(address: string, server_name: string, port: int, alpn: string, extra_roots: Bytes, ms: int) -> Result<TlsStream>
pub static fn accept(move socket: net.TcpStream, move identities: List<TlsIdentity>, alpn: string, ms: int = 30000) -> Result<TlsStream>
pub static fn accept_pem(move socket: net.TcpStream, move certificate: Bytes, move private_key: Bytes, alpn: string, ms: int = 30000) -> Result<TlsStream>
pub static fn accept_pkcs12(move socket: net.TcpStream, move bundle: Bytes, password: string, alpn: string, ms: int = 30000) -> Result<TlsStream>
pub fn protocol() -> string
pub fn write(data: Bytes) -> Result<int>
pub fn write_all(data: Bytes) -> Result<int>
pub fn read(max: int) -> Result<Bytes>
pub fn read_exact(count: int) -> Result<Bytes>
pub fn shutdown_write() -> Result<bool>
pub fn close() -> Result<bool>
pub fn poll_handle() -> int
```

`alpn` is a comma-separated protocol list — `"h2,http/1.1"` — or empty for none.
`protocol()` reports what was agreed, or an empty string if nothing was.
`extra_roots` is a PEM bundle; an empty one makes `connect_with_roots` exactly
`connect`.

`connect_address_with_roots` connects to `address` while SNI and certificate
verification use `server_name`. The three `accept` forms wrap an already
accepted TCP socket. `poll_handle` is borrowed; it is `-1` for a native
Network.framework stream.

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

## TlsListener

A listener that accepts and handshakes TLS connections. The identity list must
contain one empty-name default; other names are SNI choices.

```beans
pub unique class TlsListener

pub static fn bind(host: string, port: int, move identities: List<TlsIdentity>, alpn: string, ms: int = 30000) -> Result<TlsListener>
pub static fn bind_pem(host: string, port: int, move certificate: Bytes, move private_key: Bytes, alpn: string, ms: int = 30000) -> Result<TlsListener>
pub static fn bind_pkcs12(host: string, port: int, move bundle: Bytes, password: string, alpn: string, ms: int = 30000) -> Result<TlsListener>
pub fn accept() -> Result<TlsStream>
pub fn accept_timeout(ms: int) -> Result<TlsStream>
pub fn port() -> Result<int>
pub fn close() -> Result<bool>
pub fn poll_handle() -> int
```

Port `0` asks the OS for a free port; read it with `port`. A zero timeout is a
non-blocking accept check. On macOS, `poll_handle` returns `-1` because
Network.framework does not expose a listener file descriptor.

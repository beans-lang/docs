---
title: std.websocket
description: RFC 6455 WebSocket over std.http's upgrade, yielding whole messages rather than frames.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 13 package functions · 4 types · 7 static methods · 20 instance methods · 4 public fields · 5 enum variants.
<!-- coverage:summary:end -->

`std.websocket` speaks RFC 6455 on top of [`std.http`](/reference/stdlib/http/)'s
upgrade handshake, with the framing done by wslay. The source is
[`stdlib/std/websocket/websocket.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/websocket/websocket.b).

```beans
import std.websocket
```

## Rules that shape the package

- **A message, not a frame.** `receive` yields whole messages; fragmentation,
  continuation frames and interleaved control frames are handled underneath,
  because every protocol built on WebSocket cares about messages and none of
  them care about frames.
- **Text means valid UTF-8**, checked on the assembled message rather than per
  frame, because a code point may straddle a fragment boundary. A text message
  that is not well-formed UTF-8 is a protocol error.
- **Ping is answered for you.** The pong is on the wire before the `ping` reaches
  your loop, because a library that makes you remember produces dead
  connections. Received pings are still reported, for callers who count them.
- **Close is a handshake, not a hangup.** `close` sends the close frame and
  waits, bounded, for the peer's. A protocol violation sends the close frame the
  RFC requires and then closes the TCP connection immediately, as section 7.1.1
  demands.
- **A message limit is part of the connection.** `max_message` bounds an
  assembled message; crossing it is kind `too_large`. A peer cannot make a server
  allocate without limit by fragmenting forever.

Error kinds you may see: `protocol` (a framing or UTF-8 violation),
`too_large`, `handshake` (the upgrade was refused or the accept value did not
match), `eof` (the connection ended without a close frame), `closed`.

## Module functions

```beans
pub fn available() -> bool
pub fn accept_for_key(key: string) -> Result<string>
pub fn upgrade_websocket<T implements net.ByteStream>(move stream: T, host: string, port: int, target: string, compress: bool = false) -> Result<WebSocketTransport<T>>
pub fn wrap_websocket<T implements net.ByteStream>(move stream: T, server: bool, max_message: int = 8388608, agreed: Option<Deflate> = none) -> Result<WebSocketTransport<T>>
pub fn accept_websocket<T implements net.ByteStream>(move stream: T, request: http.Request, max_message: int = 8388608, compress: bool = false, prefer: Option<Deflate> = none) -> Result<WebSocketTransport<T>>
```

`available` reports whether the native framing bridge is present.

The `Sec-WebSocket-Accept` value for a client's `Sec-WebSocket-Key`: base64 of
SHA-1 over the key and one fixed UUID. A server that gets this wrong is rejected
by every browser, which makes it the most-tested line in the protocol.

The three generic helpers upgrade, wrap, or accept any owned `net.ByteStream`.
Use them for TLS. The static methods below expose the same operations.

## Compression

`permessage-deflate` (RFC 7692) is negotiated in the handshake, not configured
afterwards. Pass `compress: true` and the client offers it; a server that is
given `compress: true` accepts an offer it can honour.

```beans
pub struct Deflate {
    pub server_no_context_takeover: bool
    pub client_no_context_takeover: bool
    pub server_max_window_bits: int
    pub client_max_window_bits: int
}
```

**`server` always names the server-to-client direction and `client` the
client-to-server one, whichever end you are** — the names come from the wire,
not from your role. A `no_context_takeover` flag means that direction starts a
fresh DEFLATE context for every message, which costs ratio and bounds memory. A
`max_window_bits` is that direction's LZ77 window, always 9 to 15.

The same struct also spells a server's *preference*, which is what `accept` and
`negotiate_deflate` take as `prefer`. Read that way a `true` flag **asks** for a
parameter and a `false` one has no opinion, and a `max_window_bits` is a
**ceiling** where 15 means no opinion — because a preference may only ever
narrow an offer, never widen one.

```beans
pub fn negotiate_deflate(headers: http.Headers, prefer: Option<Deflate> = none) -> Option<Deflate>
pub fn deflate_offer() -> string
pub fn deflate_agreement(agreed: Deflate) -> string
pub fn accept_deflate_response(value: string) -> Result<Deflate>
```

These four are the handshake itself, for a server or client that writes its own
rather than using `accept` and `upgrade`:

- `negotiate_deflate` reads a request's `Sec-WebSocket-Extensions` offers and
  answers the first one it can agree to, narrowed by `prefer`. `none` means no
  compression — which is always a valid outcome, never an error.
- `deflate_offer` is the header value a client sends.
- `deflate_agreement` is the header value a server sends back for what it
  agreed to. Parameters at their defaults are left out.
- `accept_deflate_response` reads a server's answer on the client side. It
  refuses an answer naming more than one extension, or one the client did not
  offer.

## Message

What arrived. `text` and `binary` are whole messages; `ping` and `pong` are the
control frames; `closed` carries the peer's code and reason, after which the
connection is done.

```beans
pub enum Message {
    text(body: string)
    binary(body: Bytes)
    ping(body: Bytes)
    pong(body: Bytes)
    closed(code: int, reason: string)
}
```

## WebSocketTransport

A move-only WebSocket over any owned byte stream:

```beans
pub unique class WebSocketTransport<T implements net.ByteStream> implements Send

pub static fn upgrade(move socket: T, host: string, port: int, target: string, compress: bool = false) -> Result<WebSocketTransport<T>>
pub static fn wrap(move stream: T, server: bool, max_message: int = 8388608, agreed: Option<Deflate> = none) -> Result<WebSocketTransport<T>>
pub static fn accept(move stream: T, request: http.Request, max_message: int = 8388608, compress: bool = false, prefer: Option<Deflate> = none) -> Result<WebSocketTransport<T>>
pub fn receive() -> Result<Option<Message>>
pub fn send_text(body: string) -> Result<bool>
pub fn send_binary(body: Bytes) -> Result<bool>
pub fn ping(body: Bytes) -> Result<bool>
pub fn pong(body: Bytes) -> Result<bool>
pub fn close(code: int, reason: string) -> Result<bool>
pub fn peer_close_code() -> int
pub fn is_open() -> bool
pub fn deflate() -> Option<Deflate>
pub fn poll_handle() -> int
```

`upgrade` writes and verifies the client-side HTTP handshake over a connected
stream. `accept` writes the server-side 101 response for a request already
parsed by `std.http`. `wrap` takes a stream whose handshake is already done.

`deflate` answers the compression in force, or `none` on a connection that
negotiated none. See [Compression](#compression).

## Connection

`Connection` is the raw-TCP wrapper. It owns the socket, implements `Send`, and
has the same instance methods as `WebSocketTransport`.

```beans
pub unique class Connection implements Send

pub static fn connect(host: string, port: int, target: string, compress: bool = false) -> Result<Connection>
pub static fn connect_timeout(host: string, port: int, target: string, ms: int, compress: bool = false) -> Result<Connection>
pub static fn accept(move stream: net.TcpStream, request: http.Request, max_message: int = 8388608, compress: bool = false, prefer: Option<Deflate> = none) -> Result<Connection>
pub static fn wrap(move stream: net.TcpStream, server: bool, max_message: int = 8388608, agreed: Option<Deflate> = none) -> Result<Connection>
pub fn receive() -> Result<Option<Message>>
pub fn send_text(body: string) -> Result<bool>
pub fn send_binary(body: Bytes) -> Result<bool>
pub fn ping(body: Bytes) -> Result<bool>
pub fn pong(body: Bytes) -> Result<bool>
pub fn close(code: int, reason: string) -> Result<bool>
pub fn peer_close_code() -> int
pub fn is_open() -> bool
pub fn deflate() -> Option<Deflate>
pub fn poll_handle() -> int
```

`connect` does the TCP connect, the HTTP upgrade and the accept-value check.
`target` is the request target (`"/chat"`), not a whole URL — the host and port
are already decided. `receive` returns `ok(none)` when the close handshake has
finished; `peer_close_code()` is the code the peer sent, or 0.

`accept` completes a server-side upgrade for a request `std.http` already parsed
and writes the 101 response itself, so the caller hands over a socket that has
not been answered yet. `wrap` takes an already-upgraded socket, for a caller who
ran the handshake themselves.

`poll_handle` returns the borrowed transport handle for a readiness poller.

## A client

```beans
let socket: websocket.Connection =
    websocket.Connection.connect("127.0.0.1", port, "/chat")?
socket.send_text("hello")?
match socket.receive()? {
    some(message) => {
        match message {
            text(body) => { io.println(body) }
            binary(body) => {}
            ping(body) => {}
            pong(body) => {}
            closed(code, reason) => {}
        }
    }
    none => {}
}
socket.close(1000, "done")?
```

## A server

The upgrade is ordinary HTTP, so `std.http` parses it and this package takes the
socket from there — which is why the handshake gets the same strict parser every
other HTTP message gets.

```beans
let parser: http.RequestParser = new http.RequestParser()
// ... feed until a head arrives ...
let live: websocket.Connection =
    websocket.Connection.accept(move stream, request)?
```

## Secure WebSocket

`std.websocket_tls` is a separate package so a plain `ws`-only binary links no
TLS backend. Import it for `wss`.

```beans
import std.websocket_tls

pub fn connect(host: string, port: int, target: string, ms: int = 30000, compress: bool = false) -> Result<websocket.WebSocketTransport<tls.TlsStream>>
pub fn connect_with_roots(address: string, server_name: string, port: int, target: string, extra_roots: Bytes, ms: int = 30000, compress: bool = false) -> Result<websocket.WebSocketTransport<tls.TlsStream>>
pub fn wrap(move stream: tls.TlsStream, server: bool, max_message: int = 8388608, agreed: Option<websocket.Deflate> = none) -> Result<websocket.WebSocketTransport<tls.TlsStream>>
pub fn accept(move stream: tls.TlsStream, request: http.Request, max_message: int = 8388608, compress: bool = false, prefer: Option<websocket.Deflate> = none) -> Result<websocket.WebSocketTransport<tls.TlsStream>>
```

- `connect` does the TLS handshake and then the ordinary WebSocket HTTP
  upgrade against `target` (the request path). `ms` is the connect timeout.
- `connect_with_roots` splits what to dial (`address`) from what to verify and
  send as SNI (`server_name`), and adds trust anchors in PEM form.
- `wrap` runs the protocol over a `tls.TlsStream` you already hold; `accept`
  is the server side, completing the upgrade for a `http.Request` you have
  already read. `max_message` caps a single message, defaulting to 8 MiB.

What comes back is the ordinary `WebSocketTransport`, so
[WebSocketTransport](#websockettransport) and [Connection](#connection) above
apply unchanged.

## Conformance

The framing is held to the Autobahn TestSuite, run containerized against both an
echo server and an echo client, with a hard bar: no failed case and no failed
close behavior. That suite is the reason this package wraps wslay rather than
being written in a weekend — it fails implementations that look finished.

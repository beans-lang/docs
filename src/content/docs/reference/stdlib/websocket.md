---
title: std.websocket
description: RFC 6455 WebSocket over std.http's upgrade, yielding whole messages rather than frames.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 1 package function · 2 types · 4 static methods · 8 instance methods · 5 enum variants.
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
pub fn accept_for_key(key: string) -> Result<string>
```

The `Sec-WebSocket-Accept` value for a client's `Sec-WebSocket-Key`: base64 of
SHA-1 over the key and one fixed UUID. A server that gets this wrong is rejected
by every browser, which makes it the most-tested line in the protocol.

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

## Connection

A WebSocket connection over an established TCP stream. Move-only: it owns the
socket and closes it.

```beans
pub static fn connect(host: string, port: int, target: string) -> Result<Connection>
pub static fn connect_timeout(host: string, port: int, target: string, ms: int) -> Result<Connection>
pub static fn accept(move stream: net.TcpStream, request: http.Request, max_message: int = 8388608) -> Result<Connection>
pub static fn wrap(move stream: net.TcpStream, server: bool, max_message: int = 8388608) -> Result<Connection>
pub fn receive() -> Result<Option<Message>>
pub fn send_text(body: string) -> Result<bool>
pub fn send_binary(body: Bytes) -> Result<bool>
pub fn ping(body: Bytes) -> Result<bool>
pub fn pong(body: Bytes) -> Result<bool>
pub fn close(code: int, reason: string) -> Result<bool>
pub fn peer_close_code() -> int
pub fn is_open() -> bool
```

`connect` does the TCP connect, the HTTP upgrade and the accept-value check.
`target` is the request target (`"/chat"`), not a whole URL — the host and port
are already decided. `receive` returns `ok(none)` when the close handshake has
finished; `peer_close_code()` is the code the peer sent, or 0.

`accept` completes a server-side upgrade for a request `std.http` already parsed
and writes the 101 response itself, so the caller hands over a socket that has
not been answered yet. `wrap` takes an already-upgraded socket, for a caller who
ran the handshake themselves.

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

## Conformance

The framing is held to the Autobahn TestSuite, run containerized against both an
echo server and an echo client, with a hard bar: no failed case and no failed
close behavior. That suite is the reason this package wraps wslay rather than
being written in a weekend — it fails implementations that look finished.

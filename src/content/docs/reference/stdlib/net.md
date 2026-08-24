---
title: std.net
description: Sendable TCP and UDP sockets, reusable read buffers, and address resolution.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 6 types · 1 constructor · 8 static methods · 36 instance methods · 4 public fields.
<!-- coverage:summary:end -->

`std.net` provides TCP and UDP sockets and name resolution. It is the readable
layer over the raw socket syscalls in `std.sock`. The
source is [`stdlib/std/net/net.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/net/net.b).

```beans
import std.net
```

## Rules that shape the package

- **Sockets are made with a named static, not a constructor.** Construction that
  can fail returns a `Result`, so you write `TcpStream.connect(...)`,
  `TcpListener.bind(...)`, and `UdpSocket.bind(...)`, the same shape as
  `File.open`.
- **Every socket is move-only and `Send`.** It closes itself in `deinit` when it
  goes out of scope. Move it into a `send fn` worker when one thread should own
  the connection. `close()` exists for when you want to see the close error;
  otherwise scope exit handles it.
- **The address family is resolved, never chosen.** Every entry point runs the
  host through `getaddrinfo`, so `"localhost"`, `"127.0.0.1"`, and `"::1"` all
  work with no family flag.
- **Reads and writes are partial by contract.** `read` returns what has arrived
  and `write` reports what went out. An empty `Bytes` from `read` means the peer
  closed. `write_all` and `read_exact` loop for you.
- **Blocking calls retry on EINTR.** A timeout returns an `err` with kind
  `timeout`, never a hang.

Error kinds you may see: `refused`, `in_use`, `timeout`, `reset`, `unreachable`,
`not_found`, `closed`, `eof`, `invalid`, `permission`, `io`.

## Address

An ordinary value: a numeric host and a port. Copy it freely.

```beans
pub class Address
new Address(host: string, port: int)

pub host: string
pub port: int

pub static fn resolve(host: string, port: int) -> Result<List<Address>>
pub fn to_string() -> string
pub fn is_ipv6() -> bool
pub fn is_loopback() -> bool
```

- `resolve` returns every distinct numeric address a name maps to, in resolver
  order. A name that does not resolve is an `err` with kind `not_found`.
- `to_string` prints `host:port`, or `[host]:port` for IPv6.

## Datagram

One received UDP message: the sender's address and the bytes.

```beans
pub class Datagram
pub from: Address
pub data: Bytes
```

## ByteStream

The transport shape shared by raw TCP and TLS. HTTP/2 and WebSocket use this
interface, so the same protocol code works over either transport.

```beans
pub interface ByteStream {
    fn write_all(data: Bytes) -> Result<int>
    fn read(max: int) -> Result<Bytes>
    fn shutdown_write() -> Result<bool>
    fn close() -> Result<bool>
    fn poll_handle() -> int
}
```

## TcpStream

A connected TCP socket. Move-only; pass it with `move`, take it out of a
`Result` with `?`.

```beans
pub unique class TcpStream implements ByteStream, Send

pub static fn connect(host: string, port: int) -> Result<TcpStream>
pub static fn connect_timeout(host: string, port: int, ms: int) -> Result<TcpStream>

pub fn write(data: Bytes) -> Result<int>
pub fn write_all(data: Bytes) -> Result<int>
pub fn write_text(text: string) -> Result<int>
pub fn write_from(data: Bytes, offset: int) -> Result<int>
pub fn try_write_from(data: Bytes, offset: int) -> Result<Option<int>>
pub fn read(max: int) -> Result<Bytes>
pub fn read_into(buffer: Bytes) -> Result<int>
pub fn try_read_into(buffer: Bytes) -> Result<Option<int>>
pub fn read_exact(count: int) -> Result<Bytes>
pub fn read_to_end(limit: int) -> Result<Bytes>
pub fn peer_address() -> Result<Address>
pub fn local_address() -> Result<Address>
pub fn set_timeouts(read_ms: int, write_ms: int) -> Result<bool>
pub fn set_nonblocking(on: bool) -> Result<bool>
pub fn set_nodelay(on: bool) -> Result<bool>
pub fn into_raw() -> Result<int>
pub fn shutdown_write() -> Result<bool>
pub fn shutdown_read() -> Result<bool>
pub fn close() -> Result<bool>
pub fn poll_handle() -> int
```

- `connect` waits as long as the OS does; `connect_timeout` gives up after `ms`
  milliseconds with kind `timeout`.
- `write` may send less than all of `data` and returns the count. `write_all`
  loops until everything is sent. `read` returns up to `max` bytes; an empty
  result means the peer closed. `read_exact` fails with kind `eof` if the peer
  closes before `count` bytes arrive. `read_exact` and `read_to_end` grow one
  result buffer instead of joining copied chunks. `write_text` sends string
  storage directly.
- `read_into` writes into an existing non-empty `Bytes` and returns the number
  of bytes written. Zero means EOF. The buffer keeps its length and only
  `0..count` belongs to that read, so one `Bytes.filled(...)` allocation can
  serve the whole connection.
- `write_from` writes starting at `offset` without slicing or copying `data` —
  the offset-aware form an output queue needs to resume a short write.
- The `try_` pair serves nonblocking streams: `try_write_from` and
  `try_read_into` return `ok(none)` when the socket would block, instead of an
  error. For `try_read_into`, `ok(some(0))` is EOF, so a quiet socket and a
  closed peer remain different facts.
- `set_nodelay(true)` disables Nagle's algorithm (and `false` restores it). A
  request/response server wants it disabled, so a small response is not held
  back for a coalescing timer.
- `into_raw` transfers the descriptor to a lower-level transport. The stream
  stops owning it; the new owner must close it.
- `shutdown_write` sends EOF to the peer while keeping the read half open.
- `poll_handle` returns the descriptor **borrowed**, for registering with a
  poller. It does not transfer ownership; do not close it.

A short request and reply over loopback:

<!-- beans:compile -->
```beans
import std.io
import std.net

fn main() {
    let listener: net.TcpListener = net.TcpListener.bind("127.0.0.1", 0).expect("bind")
    let port: int = listener.port().expect("port")

    let client: net.TcpStream = net.TcpStream.connect("127.0.0.1", port).expect("connect")
    let server: net.TcpStream = listener.accept().expect("accept")

    client.write_text("ping").expect("write")
    let got: Bytes = server.read(64).expect("read")
    io.println(got.to_string())

    client.close().expect("close")
    server.close().expect("close")
}
```

## TcpListener

A socket that accepts incoming TCP connections.

```beans
pub unique class TcpListener implements Send

pub static fn bind(host: string, port: int) -> Result<TcpListener>
pub static fn bind_with_backlog(host: string, port: int, depth: int) -> Result<TcpListener>
pub static fn bind_reuse_port(host: string, port: int) -> Result<TcpListener>
pub static fn bind_reuse_port_with_backlog(host: string, port: int, depth: int) -> Result<TcpListener>

pub fn accept() -> Result<TcpStream>
pub fn accept_timeout(ms: int) -> Result<TcpStream>
pub fn try_accept() -> Result<Option<TcpStream>>
pub fn local_address() -> Result<Address>
pub fn port() -> Result<int>
pub fn set_nonblocking(on: bool) -> Result<bool>
pub fn close() -> Result<bool>
pub fn poll_handle() -> int
```

- `bind` uses a backlog of 128; `bind_with_backlog` sets the accept-queue depth.
- `bind_reuse_port` lets independent listeners share one port, and the OS spreads
  new connections between them. It works on macOS and Linux. Windows returns
  kind `unsupported`. The `_with_backlog` form also sets the queue depth.
- Port `0` asks the system for a free port. Read it back with `port()`, which is
  how a test binds without guessing a number.
- `accept` blocks until a connection arrives. `accept_timeout(0)` is a
  non-blocking check; a positive timeout that runs out is kind `timeout`.
- `try_accept` accepts one connection without waiting: `ok(none)` means the
  accept queue is empty. This is the form a poller-driven accept loop uses
  after the listener's descriptor reports readable.

## UdpSocket

A bound UDP socket. Each send is one message; each receive returns one message
with the sender's address attached.

```beans
pub unique class UdpSocket implements Send

pub static fn bind(host: string, port: int) -> Result<UdpSocket>

pub fn send_to(data: Bytes, to: Address) -> Result<int>
pub fn recv_from(max: int) -> Result<Datagram>
pub fn local_address() -> Result<Address>
pub fn port() -> Result<int>
pub fn set_timeouts(read_ms: int, write_ms: int) -> Result<bool>
pub fn set_nonblocking(on: bool) -> Result<bool>
pub fn close() -> Result<bool>
pub fn poll_handle() -> int
```

- `send_to` reports how many bytes went. A datagram is sent whole or not at all,
  so a short count means the message was too large.
- `recv_from` reads one datagram up to `max` bytes; anything past `max` in a
  single datagram is dropped by the OS, so size `max` to your protocol. The
  returned `Datagram` takes ownership of the received payload without joining
  and slicing one combined runtime buffer.

Two UDP sockets on loopback, one sending to the other:

<!-- beans:compile -->
```beans
import std.io
import std.net

fn main() {
    let inbox: net.UdpSocket = net.UdpSocket.bind("127.0.0.1", 0).expect("bind")
    let port: int = inbox.port().expect("port")

    let sender: net.UdpSocket = net.UdpSocket.bind("127.0.0.1", 0).expect("bind")
    let target: net.Address = new net.Address("127.0.0.1", port)
    sender.send_to(Bytes.from("hello"), target).expect("send")

    let note: net.Datagram = inbox.recv_from(64).expect("recv")
    io.println("from {note.from.to_string()}: {note.data.to_string()}")
}
```

### Multicast

```beans
pub fn join_multicast(group: string) -> Result<bool>
pub fn leave_multicast(group: string) -> Result<bool>
```

Joins or leaves a multicast group, so datagrams sent to the group arrive on this
socket. The group is a **numeric** address — `"239.1.2.3"` or `"ff02::1"` —
because a name can resolve to anything and membership of the wrong group is
silent. The socket must be bound to the same address family. Leaving a group this
socket never joined is an `err` from the OS rather than a silent no-op: it is
always a bookkeeping mistake in the caller.

## Readiness

To wait for a socket to become readable or writable without spinning, register
the descriptor from `poll_handle()` with the
[std.poll](/reference/stdlib/poll/) poller and wait for its events.

---
title: std.net
description: TCP and UDP sockets, address resolution, and async readiness helpers.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 2 package functions · 5 types · 1 constructor · 6 static methods · 32 instance methods · 4 public fields.
<!-- coverage:summary:end -->

`std.net` provides TCP and UDP sockets, name resolution, and two async readiness
helpers. It is the readable layer over the raw socket syscalls in `std.sock`. The
source is [`stdlib/std/net/net.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/net/net.b).

```beans
import std.net
```

## Rules that shape the package

- **Sockets are made with a named static, not a constructor.** Construction that
  can fail returns a `Result`, so you write `TcpStream.connect(...)`,
  `TcpListener.bind(...)`, and `UdpSocket.bind(...)`, the same shape as
  `File.open`.
- **Every socket is a `unique class`.** It is move-only and closes itself in
  `deinit` when it goes out of scope. A socket cannot be captured into
  `thread.spawn`, because `unique` is not `Send`. `close()` exists for when you
  want to see the close error; otherwise scope exit handles it.
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

## TcpStream

A connected TCP socket. Move-only; pass it with `move`, take it out of a
`Result` with `?`.

```beans
pub unique class TcpStream

pub static fn connect(host: string, port: int) -> Result<TcpStream>
pub static fn connect_timeout(host: string, port: int, ms: int) -> Result<TcpStream>

pub fn write(data: Bytes) -> Result<int>
pub fn write_all(data: Bytes) -> Result<int>
pub fn write_text(text: string) -> Result<int>
pub fn read(max: int) -> Result<Bytes>
pub fn read_exact(count: int) -> Result<Bytes>
pub fn read_to_end(limit: int) -> Result<Bytes>
pub fn peer_address() -> Result<Address>
pub fn local_address() -> Result<Address>
pub fn set_timeouts(read_ms: int, write_ms: int) -> Result<bool>
pub fn set_nonblocking(on: bool) -> Result<bool>
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
  closes before `count` bytes arrive.
- `shutdown_write` sends EOF to the peer while keeping the read half open.
- `poll_handle` returns the descriptor **borrowed**, for registering with a
  poller or the async helpers. It does not transfer ownership; do not close it.

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
pub unique class TcpListener

pub static fn bind(host: string, port: int) -> Result<TcpListener>
pub static fn bind_with_backlog(host: string, port: int, depth: int) -> Result<TcpListener>

pub fn accept() -> Result<TcpStream>
pub fn accept_timeout(ms: int) -> Result<TcpStream>
pub fn local_address() -> Result<Address>
pub fn port() -> Result<int>
pub fn set_nonblocking(on: bool) -> Result<bool>
pub fn close() -> Result<bool>
pub fn poll_handle() -> int
```

- `bind` uses a backlog of 128; `bind_with_backlog` sets the accept-queue depth.
- Port `0` asks the system for a free port. Read it back with `port()`, which is
  how a test binds without guessing a number.
- `accept` blocks until a connection arrives. `accept_timeout(0)` is a
  non-blocking check; a positive timeout that runs out is kind `timeout`.

## UdpSocket

A bound UDP socket. Each send is one message; each receive returns one message
with the sender's address attached.

```beans
pub unique class UdpSocket

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
  single datagram is dropped by the OS, so size `max` to your protocol.

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

## Async readiness

Two `async` functions let an async task wait for a socket without holding a
thread. Pass the descriptor from `poll_handle()`. They are level-triggered: if
the socket is already ready, they complete at once.

```beans
pub async fn readable(handle: int) -> bool
pub async fn writable(handle: int) -> bool
```

The [async guide](/guide/async/) explains how async functions run. To wait on
many sockets from a single thread instead, use [std.poll](/reference/stdlib/poll/).

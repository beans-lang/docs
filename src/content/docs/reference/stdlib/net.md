---
title: std.net
description: TCP and UDP sockets, address resolution, and async readiness helpers.
---

`std.net` gives you TCP and UDP sockets. It is the readable layer over the raw
socket syscalls. Read the source at
[`stdlib/std/net/net.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/net/net.b).

```beans
import std.net
```

A few rules shape the whole package:

- Every socket is a `unique class`. That means it is move-only and closes itself
  in `deinit` when it goes out of scope. A socket cannot be captured into
  `thread.spawn` — it cannot cross to another thread.
- Addresses are resolved with `getaddrinfo`; the address family is never chosen by
  hand. Both IPv4 and IPv6 work.
- Reads and writes may move less than you asked for; that is normal. A `read` that
  returns an empty `Bytes` means the peer closed the connection.
- Every blocking call retries automatically if a signal interrupts it (EINTR). A
  timeout comes back as an error with kind `timeout`.
- Error kinds you may see: `refused`, `in_use`, `timeout`, `reset`,
  `unreachable`, `not_found`, `closed`, `eof`, `invalid`, `permission`, `io`.

## class Address

A host and port pair.

- `pub host: string`, `pub port: int`.
- `new net.Address(host, port)` — build one.
- `Address.resolve(host, port) -> Result<List<Address>>` (static) — resolve a
  name to every address it maps to.
- `to_string() -> string` — text form; IPv6 is wrapped in brackets.
- `is_ipv6() -> bool`.
- `is_loopback() -> bool`.

## class Datagram

One received UDP packet.

- `pub from: Address` — who sent it.
- `pub data: Bytes` — the bytes.

## unique class TcpStream

A connected TCP connection.

Connect (static):

- `connect(host, port) -> Result<TcpStream>`
- `connect_timeout(host, port, ms) -> Result<TcpStream>`

Write and read:

| Method | Returns | What it does |
| --- | --- | --- |
| `write(data)` | `Result<int>` | write some of `data`; returns how many bytes went |
| `write_all(data)` | `Result<int>` | write all of `data` |
| `write_text(text)` | `Result<int>` | write a string |
| `read(max)` | `Result<Bytes>` | read up to `max` bytes; empty means peer closed |
| `read_exact(count)` | `Result<Bytes>` | read exactly `count` bytes |
| `read_to_end(limit)` | `Result<Bytes>` | read until close, up to `limit` bytes |

Info and control:

| Method | Returns | What it does |
| --- | --- | --- |
| `peer_address()` | `Result<Address>` | the far end's address |
| `local_address()` | `Result<Address>` | this end's address |
| `set_timeouts(read_ms, write_ms)` | `Result<bool>` | set read/write timeouts |
| `set_nonblocking(on)` | `Result<bool>` | switch non-blocking mode |
| `shutdown_write()` | `Result<bool>` | close the writing half |
| `shutdown_read()` | `Result<bool>` | close the reading half |
| `close()` | `Result<bool>` | close now |
| `poll_handle()` | `int` | the descriptor, for use with a poller or the async helpers |

```beans
import std.io
import std.net

fn main() {
    let stream: net.TcpStream = net.TcpStream.connect("example.com", 80).expect("connect")
    stream.write_text("GET / HTTP/1.0\r\n\r\n").expect("write")
    let reply: Bytes = stream.read(1024).expect("read")
    io.println(reply.to_string())
}
```

## unique class TcpListener

A listening TCP socket.

Bind (static):

- `bind(host, port) -> Result<TcpListener>` — backlog is 128; port `0` lets the
  system pick a free port.
- `bind_with_backlog(host, port, depth) -> Result<TcpListener>`.

| Method | Returns | What it does |
| --- | --- | --- |
| `accept()` | `Result<TcpStream>` | wait for and take the next connection |
| `accept_timeout(ms)` | `Result<TcpStream>` | accept with a timeout |
| `local_address()` | `Result<Address>` | the bound address |
| `port()` | `Result<int>` | the bound port |
| `set_nonblocking(on)` | `Result<bool>` | switch non-blocking mode |
| `close()` | `Result<bool>` | close the listener |
| `poll_handle()` | `int` | the descriptor |

## unique class UdpSocket

A UDP socket.

- `bind(host, port) -> Result<UdpSocket>` (static).

| Method | Returns | What it does |
| --- | --- | --- |
| `send_to(data, to: Address)` | `Result<int>` | send a packet to `to` |
| `recv_from(max)` | `Result<Datagram>` | receive a packet, up to `max` bytes |
| `local_address()` | `Result<Address>` | the bound address |
| `port()` | `Result<int>` | the bound port |
| `set_timeouts(read_ms, write_ms)` | `Result<bool>` | set read/write timeouts |
| `set_nonblocking(on)` | `Result<bool>` | switch non-blocking mode |
| `close()` | `Result<bool>` | close the socket |
| `poll_handle()` | `int` | the descriptor |

## Async readiness

Two `async` functions let an async task wait for a socket to be ready without
blocking a whole thread. Pass the descriptor from `poll_handle()`:

- `async fn readable(handle: int) -> bool` — suspend until the descriptor can be
  read.
- `async fn writable(handle: int) -> bool` — suspend until it can be written.

See the [async guide](/guide/async/) for how async functions run.

## See also

- [std.poll](/reference/stdlib/poll/) — wait on many sockets at once.
- [Concurrency guide](/guide/concurrency/) — threads and how sockets cannot cross
  them.

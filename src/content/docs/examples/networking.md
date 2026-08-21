---
title: Networking
description: A walk through examples/net.b, which runs TCP and UDP on loopback in one process, and a look at examples/poller.b.
---

Beans' networking lives in `std.net`.
[`net.b`](https://github.com/beans-lang/beans/blob/main/examples/net.b) covers
TCP and UDP, and
[`poller.b`](https://github.com/beans-lang/beans/blob/main/examples/poller.b)
shows how one thread waits on many sockets at once. The current stack also has
[`http.b`](https://github.com/beans-lang/beans/blob/main/examples/http.b),
[`http2.b`](https://github.com/beans-lang/beans/blob/main/examples/http2.b), and
[`websocket.b`](https://github.com/beans-lang/beans/blob/main/examples/websocket.b).

Both run entirely on loopback (`127.0.0.1`) inside **one process**. That is what
makes them deterministic tests rather than demos that need a server somewhere: a
`connect` to a listening socket on loopback finishes as soon as the kernel
queues it, so a single thread can be both ends without a race.

## The API shape

Two rules from the file's header explain the whole API:

- **Making a socket is named construction on the class it produces**, because it
  can fail and so cannot be a plain constructor. You call `TcpListener.bind`,
  `TcpStream.connect`, `UdpSocket.bind`, and `Address.resolve`, the same shape as
  `File.open`. There are no module-level functions in `std.net`.
- **Sockets are move-only `Send` owners:** closed by `deinit`, and transferable
  to one worker with an explicit move capture. One owner, one close.

## Binding to any free port

```beans
fn ephemeral() -> Result<int> {
    let server: net.TcpListener = net.TcpListener.bind("127.0.0.1", 0)?
    let port: int = server.port()?
    io.println("bound to a system-chosen port {port > 0}")
    io.println("listener is loopback {server.local_address()?.is_loopback()}")
    return ok(port)
}
```

Port `0` means "any free port". Reading it back with `server.port()` is how a
program binds without picking a number and hoping nothing else has it. Every
line prints a *derived fact* (`port > 0`), not the port itself, because the
number differs every run but the fact does not.

## A TCP round trip

```beans
let server: net.TcpListener = net.TcpListener.bind("127.0.0.1", 0)?
let port: int = server.port()?

let client: net.TcpStream = net.TcpStream.connect("127.0.0.1", port)?
let session: net.TcpStream = server.accept_timeout(2000)?

client.write_text("hello")?
client.shutdown_write()?

let asked: Bytes = session.read_to_end(64)?
io.println("server read [{asked.to_string()}]")
```

The client connects and the server accepts (with a 2-second timeout, so a stuck
test fails instead of hanging). `write_text` sends. `shutdown_write` says
"nothing more from me" without closing the half we still read from. The peer's
next read returns empty, which is how EOF arrives. `read_to_end` reads until
that EOF.

## Short writes and partial reads

```beans
let sent: int = client.write_all(payload)?
client.shutdown_write()?

let got: Bytes = session.read_exact(4096)?
```

A short write and a partial read are both normal on a real socket, so there are
looping forms. `write_all` keeps writing until everything is sent. `read_exact`
keeps reading until it has the exact count you asked for, and fails with kind
`eof` if the peer stops early, which is what code reading a fixed-size header
needs.

## Reuse one read buffer

For a long-lived connection, allocate the buffer once:

```beans
let scratch: Bytes = Bytes.filled(16 * 1024, 0)
let count: int = session.read_into(scratch)?
if count > 0 {
    let events: List<http.RequestEvent> =
        parser.feed_range(scratch, 0, count)?
}
```

`read_into` keeps `scratch.len()` unchanged and writes only `0..count`. Zero is
EOF. `feed_range` parses that checked range without making a slice. This is the
same allocation-free input path used by `http.ServerConn`.

## Move a connection to a worker

Socket and HTTP owners implement `Send`. The move must be clear in the closure:

```beans
let worker: Thread<Result<int>> = thread.spawn(
    fn() move(session) -> Result<int> {
        let scratch: Bytes = Bytes.filled(16 * 1024, 0)
        return session.read_into(scratch)
    })
let count: int = worker.join()?
```

A plain capture is refused. `Error` and `Result` are sendable when their payloads
are, so the worker can use `?` and return the failure.

For independent accept loops, share one port at the OS level:

```beans
let first: net.TcpListener =
    net.TcpListener.bind_reuse_port("127.0.0.1", 8080)?
let second: net.TcpListener =
    net.TcpListener.bind_reuse_port("127.0.0.1", 8080)?
```

macOS and Linux distribute new connections between the listeners. Windows
returns kind `unsupported`. `http.Server.bind_reuse_port` exposes the same
shape for HTTP/1.1 servers.

## UDP datagrams

```beans
let listener: net.UdpSocket = net.UdpSocket.bind("127.0.0.1", 0)?
let sender: net.UdpSocket = net.UdpSocket.bind("127.0.0.1", 0)?
listener.set_timeouts(2000, 2000)?

let to: net.Address = new net.Address("127.0.0.1", listener.port()?)
let sent: int = sender.send_to(Bytes.from("ping"), to)?
let note: net.Datagram = listener.recv_from(64)?
io.println("and knows who sent it {note.from.port == sender.port()?}")
```

UDP is message-based. `send_to` sends one datagram to an `Address`. `recv_from`
returns a `Datagram` that carries both the `data` and the sender's address in
`from`, so you can reply. `set_timeouts` bounds the read, so a lost datagram is
a reported timeout, never a hang.

## Names and addresses

```beans
let found: List<net.Address> = net.Address.resolve("localhost", 7000)?
// ...
let six: net.Address = new net.Address("::1", 80)
io.println("v6 text {six.to_string()}")
io.println("v6 is detected {six.is_ipv6()} and v4 is not {four.is_ipv6()}")
```

`Address.resolve` turns a name into a list of addresses (`localhost` is in every
hosts file, so this needs no network). An `Address` is an ordinary value with a
readable `to_string()`, where IPv6 gets brackets so the port stays readable, and
`is_ipv6()` / `is_loopback()` to inspect it.

## Failures are Results, never panics

The `failures()` function shows every error path returning a `Result` with a
specific `kind`: connecting to a port nobody listens on, resolving an illegal
name like `"a..b"`, binding an empty host, a port out of range, and using a
socket after `close()`. None of them panic and none hang.

```beans
match net.TcpStream.connect_timeout("127.0.0.1", dead, 1000) {
    ok(surprise) => io.println("unexpected connection"),
    err(e) => io.println("connect to nothing: {e.kind}"),
}
```

Run it:

```bash
beansc run examples/net.b
```

## poller.b: waiting on many descriptors

`poller.b` is the shape a server has: one thread, many connections, and a call
that sleeps until something needs attention. The poller is `epoll` on Linux and
`kqueue` on macOS behind one API, in `std.poll`.

Two design decisions from the file's header:

- **Level-triggered.** While a socket has data, every `wait` reports it. A
  handler that reads only some of what arrived is still correct; it just gets
  told again.
- **Events carry your token, not a descriptor.** A descriptor number is reused
  the instant it is closed, so an event holding one could name something else by
  the time you look. The token is a number you choose and it means whatever you
  decide.

```beans
let watch: poll.Poller = poll.Poller.open()?
let server: net.TcpListener = net.TcpListener.bind("127.0.0.1", 0)?
watch.add(server.poll_handle(), 100, poll.Interest.read_only())?

let quiet: List<poll.Event> = watch.wait(8, 50)?
io.println("nothing ready yet {quiet.len() == 0}")

let client: net.TcpStream = net.TcpStream.connect("127.0.0.1", server.port()?)?
let woken: List<poll.Event> = watch.wait(8, 2000)?
io.println("one thing became ready {woken.len() == 1}")
let first: poll.Event = woken.get(0).or(new poll.Event())
io.println("it is our token {first.token == 100}, readable {first.readable}")
```

`watch.add` registers a descriptor with a token (`100`) and an interest
(`read_only`). `wait(max, timeout_ms)` returns the events that are ready; an
empty list is an ordinary "nothing is ready" answer, not an error. Each `Event`
carries the token you set and flags like `readable`.

Run it:

```bash
beansc run examples/poller.b
```

[std.net](/reference/stdlib/net/) is the networking reference and
[std.poll](/reference/stdlib/poll/) is the poller reference.
[Files and a KV store](/examples/files-kv/) shows the same error and resource
style on disk.

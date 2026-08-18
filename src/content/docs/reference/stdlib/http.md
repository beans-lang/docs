---
title: std.http
description: HTTP/1.1 and HTTP/2 — a strict push-based parser, a client, a server, and streams.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 17 types · 5 constructors · 6 static methods · 35 instance methods · 36 public fields · 13 enum variants.
<!-- coverage:summary:end -->

`std.http` provides HTTP/1.1 parsing and exchanges over llhttp, and HTTP/2 over
nghttp2, behind one message model. The source is
[`stdlib/std/http/`](https://github.com/beans-lang/beans/tree/main/stdlib/std/http).

```beans
import std.http
```

## Rules that shape the package

- **The parser is push-based and cannot block.** `feed` hands the parser whatever
  arrived and returns the events it completed. **Any byte-split of the same input
  yields the identical event stream**, so the shape of your read loop can never
  change what it parses. The property is tested against llhttp's own corpus split
  at every byte.
- **Strict mode is the only mode.** The lenient flags that exist for ancient
  peers and request-smuggling papers are not exposed. What llhttp rejects, this
  package rejects: a malformed message is kind `protocol`, and the connection it
  came from is finished. A parse failure does not throw away the events that
  arrived before it, so a pipelined buffer whose third message is malformed still
  yields the first two.
- **The limits llhttp does not own live here.** `Limits` bounds header count,
  total header bytes and target length; crossing one is kind `too_large`, never a
  truncation. `Client` and `ServerConn` bound the buffered body the same way.
- **Header order and case are preserved.** `Headers` is an ordered list, not a
  map: repeated fields combine in order, and a proxy that reorders them changes
  the message. Lookups are ASCII-case-insensitive and `get` answers the first
  match, which is what a compliant reader must do.
- **HTTP/2 is a property of the connection, not a different API.** Streams carry
  the same `Headers`, pseudo-headers included in arrival order.

Error kinds you may see: `protocol` (malformed message), `too_large` (a bound was
crossed), `eof` (cut short), `closed` (this connection is finished), plus the
transport's own kinds.

## Headers

An ordered, case-preserving collection of header fields.

```beans
new Headers()
pub fn add(name: string, value: string)
pub fn count() -> int
pub fn name_at(index: int) -> string
pub fn value_at(index: int) -> string
pub fn get(name: string) -> Option<string>
pub fn all(name: string) -> List<string>
pub fn has(name: string) -> bool
```

One field, exactly as it arrived:

```beans
new Field(name: string, value: string)
```

`Field` exposes `name` and `value`.

## Messages

A parsed request head. The body is not here — bodies stream as events.

```beans
pub class Request {
    pub method: string
    pub target: string
    pub major: int
    pub minor: int
    pub headers: Headers
    pub content_length: int   // -1 when chunked or absent
    pub chunked: bool
    pub keep_alive: bool
    pub upgrade: bool
}
```

The response mirror:

```beans
pub class Response {
    pub status: int
    pub reason: string
    pub major: int
    pub minor: int
    pub headers: Headers
    pub content_length: int
    pub chunked: bool
    pub keep_alive: bool
    pub upgrade: bool
}
```

The bounds this layer owns:

```beans
new Limits()
pub class Limits {
    pub max_header_count: int    // 128
    pub max_header_bytes: int    // 65536
    pub max_target_bytes: int    // 8192
}
```

## Parser events

In message order: exactly one `head`, any number of `body` chunks, optional
`trailers`, then `done`. An upgrade surfaces as `upgraded` with the bytes that
arrived after the message — the parser is finished and the connection belongs to
the next protocol.

```beans
pub enum RequestEvent {
    head(request: Request)
    body(data: Bytes)
    trailers(fields: Headers)
    done(keep_alive: bool)
    upgraded(request: Request, remainder: Bytes)
}

pub enum ResponseEvent {
    head(response: Response)
    body(data: Bytes)
    trailers(fields: Headers)
    done(keep_alive: bool)
    upgraded(response: Response, remainder: Bytes)
}
```

## RequestParser and ResponseParser

```beans
new RequestParser()
pub static fn with_limits(limits: Limits) -> RequestParser
pub fn feed(data: Bytes) -> Result<List<RequestEvent>>
pub fn finish() -> Result<List<RequestEvent>>
```

```beans
new ResponseParser()
pub static fn with_limits(limits: Limits) -> ResponseParser
pub fn feed(data: Bytes) -> Result<List<ResponseEvent>>
pub fn finish() -> Result<List<ResponseEvent>>
```

`finish` signals end-of-stream: a message that needed EOF to end produces its
final events there, and a message cut short becomes a `protocol` error.

```beans
let parser: http.RequestParser = new http.RequestParser()
for event: http.RequestEvent in parser.feed(arrived)? {
    match event {
        head(request) => { io.println("{request.method} {request.target}") }
        body(chunk) => { collected.append(chunk) }
        trailers(fields) => {}
        done(keep_alive) => {}
        upgraded(request, remainder) => {}
    }
}
```

## Client

One TCP connection speaking HTTP/1.1, with keep-alive by default. Move-only.
There is deliberately no connection pool: a pool is a policy, and this is the
mechanism it would pool.

```beans
pub static fn connect(host: string, port: int) -> Result<Client>
pub static fn connect_timeout(host: string, port: int, ms: int) -> Result<Client>
pub fn get(target: string) -> Result<ClientResponse>
pub fn request(method: string, target: string, headers: Headers, body: Bytes) -> Result<ClientResponse>
pub fn set_max_body(limit: int)
pub fn is_alive() -> bool
pub fn close() -> Result<bool>
```

A buffered response:

```beans
pub class ClientResponse {
    pub status: int
    pub reason: string
    pub headers: Headers
    pub body: Bytes
    pub keep_alive: bool
}
```

A `Host` header is added when you did not set one, because HTTP/1.1 requires it
and forgetting it produces confusing 400s. Responses carrying
`Content-Encoding: gzip` or `deflate` are decompressed through
[`std.compress`](/reference/stdlib/compress/) under the same `max_body` bound, so
a compressed bomb is an error rather than an allocation.

```beans
let client: http.Client = http.Client.connect("127.0.0.1", port)?
let answer: http.ClientResponse = client.get("/hello")?
io.println("{answer.status} {answer.body.len()}")
```

## Server and ServerConn

```beans
pub static fn bind(host: string, port: int) -> Result<Server>
pub fn port() -> Result<int>
pub fn set_read_timeout(ms: int)
pub fn accept() -> Result<ServerConn>
pub fn accept_timeout(ms: int) -> Result<ServerConn>
```

```beans
pub fn read_request() -> Result<Option<ServedRequest>>
pub fn respond(status: int, reason: string, headers: Headers, body: Bytes, keep_alive: bool) -> Result<bool>
pub fn set_max_body(limit: int)
pub fn is_alive() -> bool
pub fn close() -> Result<bool>
```

One buffered request, head and body and trailers together:

```beans
pub class ServedRequest {
    pub head: Request
    pub body: Bytes
    pub trailer_fields: Headers
    pub keep_alive: bool
}
```

`read_request` returns `ok(none)` when the client finished cleanly — the
connection closed between messages. Pipelined requests are queued and handed out
one at a time. Concurrency is your decision: accept on one thread and spawn per
connection, or run single-threaded in a test.

```beans
let server: http.Server = http.Server.bind("127.0.0.1", 0)?
let conn: http.ServerConn = server.accept()?
match conn.read_request()? {
    some(request) => {
        conn.respond(200, "OK", new http.Headers(),
                     Bytes.from("hello"), request.keep_alive)?
    }
    none => {}
}
```

## HTTP/2

One exchange on one stream:

```beans
pub class Stream {
    pub id: int
    pub headers: Headers
    pub body: Bytes
    pub complete: bool
}
pub fn method() -> string
pub fn path() -> string
pub fn status() -> int
```

What a connection reports as it runs:

```beans
pub enum Http2Event {
    message(stream: Stream)
    stream_closed(id: int, error_code: int)
    goaway(last_stream: int, error_code: int)
}
```

The connection itself, for both roles. Move-only.

```beans
pub static fn adopt(move stream: net.TcpStream, server: bool) -> Result<Http2Connection>
pub fn run() -> Result<List<Http2Event>>
pub fn request(method: string, scheme: string, authority: string, path: string, fields: Headers, body: Bytes) -> Result<int>
pub fn respond(stream_id: int, status: int, fields: Headers, body: Bytes) -> Result<bool>
pub fn windows() -> List<int>
pub fn poll_handle() -> int
pub fn is_open() -> bool
pub fn close() -> Result<bool>
```

`adopt` takes over a socket that already speaks HTTP/2 — because TLS ALPN agreed
on `h2`, or because both sides knew in advance. There is no h2c upgrade dance;
that mechanism is deprecated and browsers never shipped it.

`run` drives one round of IO and returns whatever completed. `request` opens a
stream and returns its id, adding the four pseudo-headers HTTP/2 requires;
`respond` answers one stream by id, adding `:status`. `windows()` reports the
connection-level flow-control windows — how much this side may still receive and
send — which is the accounting a flow-control bug breaks. `poll_handle()` gives
the borrowed descriptor so one thread can drive many connections.

```beans
let session: http.Http2Connection =
    http.Http2Connection.adopt(move socket, true)?
for event: http.Http2Event in session.run()? {
    match event {
        message(exchange) => {
            session.respond(exchange.id, 200, new http.Headers(),
                            Bytes.from("answer for {exchange.path()}"))?
        }
        stream_closed(id, code) => {}
        goaway(last, code) => {}
    }
}
```

## Conformance

HTTP/1.1 parsing is held to llhttp's own markdown corpus — every case, with the
upstream expectations unmodified, replayed whole and split in two at every byte —
plus a request-smuggling corpus that must be refused end to end. HTTP/2 is held
to h2spec, with the bar set by measurement: nghttp2's own reference server is run
through the identical suite first, and this implementation must fail no case that
server passes.

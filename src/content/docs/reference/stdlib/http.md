---
title: std.http
description: HTTP/1.1 and HTTP/2 — a strict push-based parser, a client, a server, and streams.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 10 package functions · 19 types · 6 constructors · 8 static methods · 68 instance methods · 44 public fields · 13 enum variants.
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
- **The read buffer can be reused.** `feed_range` parses a checked range of an
  existing `Bytes`. Pair it with `TcpStream.read_into` to avoid allocating one
  input buffer per socket read.
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
pub fn clear()
```

`clear` removes every field while keeping the backing storage, so one
collection can serve a whole keep-alive connection.

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
    pub max_header_count: int      // 128
    pub max_header_bytes: int      // 65536
    pub max_target_bytes: int      // 8192
    pub max_head_span_bytes: int   // 16384
}
```

`max_head_span_bytes` covers every other head field llhttp leaves unbounded —
the status reason phrase and the chunk-extension name and value. Without it a
peer sending `1;` and then token bytes forever grows the parser's buffer until
the process dies.

## Writing headers safely

A header name or value carrying CR, LF or NUL is refused with kind `invalid`
before anything reaches the socket. Those bytes would splice extra headers — or
a whole extra response — into the wire format, which is reachable the moment an
application puts user input in a `Location`. Names may not carry `:` over
HTTP/1.1; over HTTP/2 a leading one is the pseudo-header form and is allowed.

```beans
pub fn field_is_safe(text: string) -> bool
```

Answers the same question for a caller that wants to check before building a
message rather than at send time.

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
pub fn feed_range(data: Bytes, from: int, to: int) -> Result<List<RequestEvent>>
pub fn finish() -> Result<List<RequestEvent>>
pub fn feed_range_into(data: Bytes, from: int, to: int, events: List<RequestEvent>) -> Result<bool>
pub fn finish_into(events: List<RequestEvent>) -> Result<bool>
pub fn recycle(done: Request)
```

```beans
new ResponseParser()
pub static fn with_limits(limits: Limits) -> ResponseParser
pub fn feed(data: Bytes) -> Result<List<ResponseEvent>>
pub fn feed_range(data: Bytes, from: int, to: int) -> Result<List<ResponseEvent>>
pub fn finish() -> Result<List<ResponseEvent>>
```

`finish` signals end-of-stream: a message that needed EOF to end produces its
final events there, and a message cut short becomes a `protocol` error.
`feed_range(data, from, to)` checks the bounds and parses only that range
without allocating a slice.

The `_into` pair is the allocation-free form for a server's read loop:
`feed_range_into` appends events into a caller-owned list, and `finish_into`
signals end-of-stream the same way. The caller clears the list between feeds;
events are valid until then. `recycle` hands a delivered request head back for
reuse — the next message fills that shell instead of allocating one, and reuses
its target and header strings when the peer repeats them byte-for-byte, the
shape of every keep-alive connection. Only recycle a request nothing will read
again: the parser rewrites every field in place.

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

One TCP connection speaking HTTP/1.1, with keep-alive by default. Move-only and
`Send`.
There is deliberately no connection pool: a pool is a policy, and this is the
mechanism it would pool.

```beans
pub unique class Client implements Send
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
pub unique class Server implements Send
pub static fn bind(host: string, port: int) -> Result<Server>
pub static fn bind_reuse_port(host: string, port: int) -> Result<Server>
pub fn port() -> Result<int>
pub fn set_read_timeout(ms: int)
pub fn accept() -> Result<ServerConn>
pub fn accept_timeout(ms: int) -> Result<ServerConn>
```

```beans
pub unique class ServerConn implements Send
pub fn read_request() -> Result<Option<ServedRequest>>
pub fn respond(status: int, reason: string, headers: Headers, body: Bytes, keep_alive: bool) -> Result<bool>
pub fn begin_chunked(status: int, reason: string, headers: Headers, keep_alive: bool) -> Result<bool>
pub fn write_chunk(data: Bytes) -> Result<bool>
pub fn finish_chunked() -> Result<bool>
pub fn finish_chunked_trailers(trailers: Headers) -> Result<bool>
pub fn is_streaming() -> bool
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

`bind_reuse_port` creates an independent accept loop on a shared port. One
listener per worker spreads load on Linux, where the kernel hashes each
connection across the listening sockets. It does not on macOS, where the last
socket to bind receives every connection and the rest stay idle — there, accept
on one listener and hand the connections to workers. Windows returns kind
`unsupported`. `net.TcpListener.bind_reuse_port` has the full rule.

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

### Streaming a response

`respond` needs the whole body in hand, because the head carries its length.
When you do not know that length yet — a file being generated, a query still
running — begin a chunked response instead:

```beans
conn.begin_chunked(200, "OK", new http.Headers(), request.keep_alive)?
for row: string in rows {
    conn.write_chunk(Bytes.from(row))?
}
conn.finish_chunked()?
```

- `begin_chunked` sends a head framed `Transfer-Encoding: chunked`. The
  connection then **belongs to that response** until it is finished: `respond`
  and a second `begin_chunked` are refused, because a second response written
  into the middle of a chunked body is read by the peer as that body's content.
  A status that forbids a body (`1xx`, `204`, `304`) is refused outright.
- `write_chunk` refuses an empty `data`. A zero-length chunk is not an empty
  write — it *is* the terminator, so writing one mid-body would end the
  response there and everything after it would be read as a trailer section,
  silently, with a `200` already on the wire.
- `finish_chunked` writes the terminator. `finish_chunked_trailers` carries
  trailer fields with it, held to the head's CR/LF/NUL rule.
- `is_streaming` answers whether a chunked response is open.
- Closing without finishing leaves the body unterminated. That is the honest
  report of a handler that failed after its status was already sent: the peer
  sees a truncated message rather than a complete one that lost content.

A response to a HEAD request is answered with `respond`, not begun here — a
streamed HEAD response would either never be finished, or be finished with a
terminating chunk, which is a body.

### Framing responses yourself

A server that owns its sockets — nonblocking writes, an output queue per
connection — still wants `std.http` to own the wire format. Two package
functions encode one complete HTTP/1.1 response into caller-owned storage:

```beans
pub fn encode_response_into(target: Bytes, status: int, reason: string, headers: Headers, body: Bytes, keep_alive: bool) -> Result<bool>
pub fn encode_response_append(target: Bytes, status: int, reason: string, headers: Headers, body: Bytes, keep_alive: bool) -> Result<bool>
```

`encode_response_into` resets `target` first, so one buffer is reused across
responses. `encode_response_append` writes after whatever `target` already
holds — the form for a server that frames each response straight into its
connection's output queue instead of staging it in a side buffer. Both apply
the same header-safety validation as `respond`, and a validation failure
leaves `target` untouched.

```beans
pub fn encode_response_head_append(target: Bytes, status: int, reason: string, headers: Headers, body_len: int, keep_alive: bool) -> Result<bool>
pub fn encode_chunked_head_append(target: Bytes, status: int, reason: string, headers: Headers, keep_alive: bool) -> Result<bool>
```

`encode_response_head_append` writes the head alone, for `body_len` bytes you
send yourself. That is what lets a head and a body go out as one vectored
write ([`TcpStream.write_vectored`](/reference/stdlib/net/)) instead of being
joined into one buffer first. It answers whether the status forbids a body, so
a caller knows not to send one.

`encode_chunked_head_append` is the same for a body whose length is not known
yet. It writes the head and nothing else — for a relay forwarding an upstream's
already-framed chunks. A caller framing its own chunks wants the writer below.

### ChunkedResponseWriter

Chunked framing is a *sequence*, and the mistakes that corrupt a streamed
response are sequencing mistakes no single function can see. This class refuses
each one at the call that makes it.

```beans
pub class ChunkedResponseWriter
new ChunkedResponseWriter()
pub fn head_append(target: Bytes, status: int, reason: string, headers: Headers, keep_alive: bool) -> Result<bool>
pub fn chunk_prefix_append(target: Bytes, length: int) -> Result<bool>
pub fn chunk_append(target: Bytes, data: Bytes) -> Result<bool>
pub fn finish_append(target: Bytes) -> Result<bool>
pub fn finish_trailers_append(target: Bytes, trailers: Headers) -> Result<bool>
pub fn is_started() -> bool
pub fn is_finished() -> bool
pub fn chunk_count() -> int
pub fn byte_count() -> int
```

Nothing here owns storage or a socket. Every method appends to a caller-owned
`Bytes`, so one writer serves a buffer, an output queue or a vectored send, and
a validation failure leaves `target` untouched. `ServerConn.begin_chunked` is
this class over a connection.

- `head_append` writes the head once; a second call is refused.
- `chunk_append` frames a chunk and appends its payload — the copying form, for
  a caller staging a whole response in one buffer.
- `chunk_prefix_append` frames a chunk of `length` bytes **without taking the
  bytes**: you send exactly `length` payload bytes immediately after what it
  appended. That is the vectored form, so a megabyte chunk is read straight out
  of your own buffer and never copied. The bytes on the wire are identical:
  `chunk_append` is `chunk_prefix_append` followed by the payload.
- A chunk before the head, a chunk after the terminator, and a zero-length
  chunk are all refused.
- `finish_append` answers `ok(true)` when it wrote the terminator and
  `ok(false)` when the response was already finished — so a connection layer
  can cover a handler that returned without finishing. Writing a *chunk* after
  the terminator is still an error.
- `chunk_count` and `byte_count` are what has been framed so far; `is_started`
  and `is_finished` are where in the sequence the writer stands.

The CRLF that closes a chunk is written at the **front** of the next size line
rather than after the payload. That is what lets `chunk_prefix_append` frame a
chunk whose payload never enters `target` at all.

A HEAD response is the head alone: write it and stop, with no chunk and no
terminator. Nothing here forces a terminator, because a HEAD response that
carried one would carry a body.

## HTTP/2

Check the native bridge and adopt any owned byte stream:

```beans
pub fn http2_available() -> bool
pub fn adopt_http2<T implements net.ByteStream>(move stream: T, server: bool) -> Result<Http2Transport<T>>
```

`http2_available` is normally true on supported native targets. It gives an
unusual target a clean `unsupported` result. `adopt_http2` is the
transport-neutral entry point for raw TCP or TLS.

One completed exchange:

```beans
pub class Stream {
    pub id: int
    pub body: Bytes
    pub request: Option<Request>
    pub response: Option<Response>
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

The generic, move-only connection owns any `net.ByteStream`:

```beans
pub unique class Http2Transport<T implements net.ByteStream> implements Send

pub max_body: int
pub max_header_count: int
pub max_header_bytes: int

pub static fn adopt(move stream: T, server: bool) -> Result<Http2Transport<T>>
pub fn run() -> Result<List<Http2Event>>
pub fn request(method: string, scheme: string, authority: string, path: string, fields: Headers, body: Bytes) -> Result<int>
pub fn request_headers(method: string, scheme: string, authority: string, path: string, fields: Headers) -> Result<int>
pub fn respond(stream_id: int, status: int, fields: Headers, body: Bytes) -> Result<bool>
pub fn respond_headers(stream_id: int, status: int, fields: Headers) -> Result<bool>
pub fn send_data(stream_id: int, body: Bytes, end_stream: bool) -> Result<bool>
pub fn windows() -> List<int>
pub fn poll_handle() -> int
pub fn is_open() -> bool
pub fn close() -> Result<bool>
```

`request` and `respond` buffer one body. For streaming, call `request_headers`
or `respond_headers`, then send chunks with `send_data`; set `end_stream` on the
last chunk. A flow-control stall returns kind `would_block`: run the connection
and retry the same chunk.

`Http2Connection` is the raw-TCP compatibility wrapper. It has the same fields
and methods with this static constructor:

```beans
pub unique class Http2Connection implements Send
pub static fn adopt(move stream: net.TcpStream, server: bool) -> Result<Http2Connection>
pub fn respond_headers(stream_id: int, status: int, fields: Headers) -> Result<bool>
pub fn request_headers(method: string, scheme: string, authority: string, path: string, fields: Headers) -> Result<int>
pub fn send_data(stream_id: int, body: Bytes, end_stream: bool) -> Result<bool>
```

`adopt` takes over a socket that already speaks HTTP/2 by prior knowledge.
`run` drives one round of IO. `windows()` reports the receive and send
flow-control windows. `poll_handle()` is borrowed so one thread can drive many
connections.

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

## HTTP/2 over TLS

`std.http_tls` is a separate package so that importing plain `std.http` never
pulls a TLS backend into an HTTP/1-only program. Import it only when you want
`https`.

```beans
import std.http_tls

pub fn connect(host: string, port: int, ms: int = 30000) -> Result<http.Http2Transport<tls.TlsStream>>
pub fn connect_with_roots(address: string, server_name: string, port: int, extra_roots: Bytes, ms: int = 30000) -> Result<http.Http2Transport<tls.TlsStream>>
pub fn adopt(move stream: tls.TlsStream, server: bool) -> Result<http.Http2Transport<tls.TlsStream>>
```

- `connect` dials the host, asks for HTTP/2 through ALPN, checks the peer
  actually selected it, and hands the secure stream to the same HTTP/2
  connection logic as plain TCP. `ms` is the connect timeout.
- `connect_with_roots` is the same with the certificate verification spelled
  out: `address` is what to dial, `server_name` what to verify and send as SNI
  (they differ behind a proxy or an IP literal), and `extra_roots` is extra
  trust anchors in PEM form on top of the system store.
- `adopt` takes a `tls.TlsStream` you already have — one you accepted as a
  server, say — and runs HTTP/2 over it. `server` says which side of the
  connection you are.

The transport you get back is the ordinary `Http2Transport`, so everything in
[HTTP/2](#http2) above applies unchanged.

## Conformance

HTTP/1.1 parsing is held to llhttp's own markdown corpus — every case, with the
upstream expectations unmodified, replayed whole and split in two at every byte —
plus a request-smuggling corpus that must be refused end to end. HTTP/2 is held
to h2spec, with the bar set by measurement: nghttp2's own reference server is run
through the identical suite first, and this implementation must fail no case that
server passes.

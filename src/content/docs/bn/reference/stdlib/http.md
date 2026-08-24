---
title: std.http
description: HTTP/1.1 আর HTTP/2 — কড়া push-based parser, একটা client, একটা server, আর stream।
---

`std.http` llhttp-র উপরে HTTP/1.1 parsing আর exchange দেয়, আর nghttp2-র উপরে HTTP/2 — সবই একটাই message model-এর নিচে। source আছে এখানে: [`stdlib/std/http/`](https://github.com/beans-lang/beans/tree/main/stdlib/std/http)।

```beans
import std.http
```

## যে নিয়মগুলো এই package-টাকে গড়ে তুলেছে

- **parser push-based, আর সে কখনো block করে না।** `feed` যা এসেছে তা parser-কে দেয় আর যে event-গুলো সম্পূর্ণ হলো সেগুলো ফেরত দেয়। **একই input যেভাবেই byte-এ ভাগ করুন, event-এর ধারা হুবহু এক থাকে**, তাই আপনার read loop-এর গড়ন কখনো বদলে দিতে পারে না কী parse হলো। এই ধর্মটা llhttp-র নিজের corpus-কে প্রতিটা byte-এ ভাগ করে পরীক্ষা করা হয়।
- **একই read buffer আবার ব্যবহার করা যায়।** `feed_range` একটা existing `Bytes`-এর
  checked range parse করে। `TcpStream.read_into`-র সাথে ব্যবহার করলে প্রতি read-এ
  নতুন input buffer লাগে না।
- **কড়া mode-ই একমাত্র mode।** পুরোনো peer আর request-smuggling গবেষণাপত্রের জন্য যেসব lenient flag আছে, সেগুলো খোলা হয় না। llhttp যা ফিরিয়ে দেয়, এই package-ও তা ফিরিয়ে দেয়: ভাঙা message মানে `protocol` kind, আর যে connection থেকে সেটা এসেছে সে শেষ। parse fail করলে তার আগে আসা event-গুলো ফেলে দেওয়া হয় না, তাই pipeline করা buffer-এর তৃতীয় message ভাঙা হলেও প্রথম দুটো পাওয়া যায়।
- **llhttp যেসব সীমার মালিক নয়, সেগুলো এখানে।** `Limits` header-এর সংখ্যা, মোট header byte আর target-এর দৈর্ঘ্য বাঁধে; সীমা ছাড়ালে `too_large`, কখনো কেটে ছোট করা নয়। `Client` আর `ServerConn` জমানো body-কে একইভাবে বাঁধে।
- **header-এর ক্রম আর case অক্ষত থাকে।** `Headers` একটা ক্রমযুক্ত list, map নয়: একই নামের field ক্রম মেনে জোড়া লাগে, আর যে proxy সেগুলো এলোমেলো করে সে message-ই বদলে দেয়। খোঁজা হয় ASCII-case না মেনে, আর `get` প্রথম মিলটা দেয় — নিয়ম-মানা reader-কে ঠিক এটাই করতে হয়।
- **HTTP/2 connection-এর একটা ধর্ম, আলাদা API নয়।** stream-গুলো সেই একই `Headers` বয়ে আনে, pseudo-header-সহ, আসার ক্রমেই।

যেসব error kind দেখা যেতে পারে: `protocol` (ভাঙা message), `too_large` (সীমা ছাড়ানো), `eof` (আগেই কেটে যাওয়া), `closed` (এই connection শেষ), আর transport-এর নিজের kind-গুলো।

## Headers

header field-এর ক্রমযুক্ত, case-রক্ষাকারী সংগ্রহ।

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

`clear` প্রতিটা field মুছে দেয় কিন্তু পেছনের storage রেখে দেয়, তাই একটাই
collection একটা গোটা keep-alive connection-কে serve করতে পারে।

একটা field, যেমনটি এসেছিল ঠিক তেমন:

```beans
new Field(name: string, value: string)
```

`Field`-এ আছে `name` আর `value`।

## Message

parse করা request head। body এখানে নেই — body event হয়ে stream হয়।

```beans
pub class Request {
    pub method: string
    pub target: string
    pub major: int
    pub minor: int
    pub headers: Headers
    pub content_length: int   // chunked হলে বা না থাকলে -1
    pub chunked: bool
    pub keep_alive: bool
    pub upgrade: bool
}
```

response-এর প্রতিরূপ:

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

এই layer যেসব সীমার মালিক:

```beans
new Limits()
pub class Limits {
    pub max_header_count: int      // 128
    pub max_header_bytes: int      // 65536
    pub max_target_bytes: int      // 8192
    pub max_head_span_bytes: int   // 16384
}
```

`max_head_span_bytes` llhttp-এর বাকি unbounded head field-গুলো বাঁধে — status
reason phrase, আর chunk-extension-এর name ও value। এটা না থাকলে peer `1;` পাঠিয়ে
অনন্ত token byte পাঠিয়ে parser buffer বাড়াতে পারে।

## Writing headers safely

Header name বা value-তে CR, LF বা NUL থাকলে socket-এ যাওয়ার আগেই `invalid`
ফেরত আসে। এই byte-গুলো wire format-এ extra header বা পুরো response ঢুকিয়ে দিতে
পারে। HTTP/1.1 name-এ `:` চলে না; HTTP/2-এ শুরুতে `:` pseudo-header হিসেবে চলে।

```beans
pub fn field_is_safe(text: string) -> bool
```

Message বানানোর আগে একই safety check করতে এই function ব্যবহার করুন।

## Parser event

message-এর ক্রমে: ঠিক একটা `head`, যত খুশি `body` টুকরো, ইচ্ছেমতো `trailers`, তারপর `done`। upgrade এলে `upgraded` আসে, সঙ্গে message-এর পরে আসা byte-গুলো — parser-এর কাজ সেখানেই শেষ, connection এখন পরের protocol-এর।

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

## RequestParser আর ResponseParser

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

`finish` জানায় stream শেষ: যে message শেষ হতে EOF-এর দরকার ছিল সে তার শেষ event-গুলো ওখানে দেয়, আর আগেই কেটে যাওয়া message `protocol` error হয়।
`feed_range(data, from, to)` bounds check করে slice allocate না করেই ওই range parse করে।

`_into` জোড়াটা server-এর read loop-এর allocation-free form: `feed_range_into`
caller-এর নিজের list-এ event append করে, আর `finish_into` একইভাবে stream-এর
শেষ জানায়। feed-এর ফাঁকে list-টা caller-ই clear করে; ততক্ষণ পর্যন্ত event-গুলো
valid। `recycle` একটা deliver-হওয়া request head ফেরত দিয়ে দেয় আবার ব্যবহারের
জন্য — পরের message নতুন allocate না করে ওই খোলটাই ভরে, আর peer byte-for-byte
একই target বা header পাঠালে string-গুলোও reuse করে (প্রতিটা keep-alive
connection-এর চেহারাই এমন)। শুধু এমন request recycle করবে যেটা আর কেউ পড়বে
না: parser প্রতিটা field জায়গায় বসেই নতুন করে লেখে।

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

HTTP/1.1 বলা একটাই TCP connection, keep-alive default। move-only এবং `Send`। ইচ্ছে করেই কোনো connection pool নেই: pool একটা নীতি, আর এটা সেই যন্ত্র যাকে pool করা হতো।

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

জমানো response:

```beans
pub class ClientResponse {
    pub status: int
    pub reason: string
    pub headers: Headers
    pub body: Bytes
    pub keep_alive: bool
}
```

আপনি `Host` header না দিলে সেটা যোগ করে দেওয়া হয়, কারণ HTTP/1.1-এ ওটা লাগেই আর ভুলে গেলে বিভ্রান্তিকর 400 আসে। `Content-Encoding: gzip` বা `deflate` বয়ে আনা response [`std.compress`](/bn/reference/stdlib/compress/) দিয়ে খোলা হয়, সেই একই `max_body` সীমার নিচে — তাই compress করা bomb allocation না হয়ে error হয়।

```beans
let client: http.Client = http.Client.connect("127.0.0.1", port)?
let answer: http.ClientResponse = client.get("/hello")?
io.println("{answer.status} {answer.body.len()}")
```

## Server আর ServerConn

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
pub fn set_max_body(limit: int)
pub fn is_alive() -> bool
pub fn close() -> Result<bool>
```

একটা জমানো request — head, body আর trailer একসঙ্গে:

```beans
pub class ServedRequest {
    pub head: Request
    pub body: Bytes
    pub trailer_fields: Headers
    pub keep_alive: bool
}
```

client পরিষ্কারভাবে শেষ করলে — অর্থাৎ দুই message-এর মাঝে connection বন্ধ করলে — `read_request` `ok(none)` দেয়। pipeline করা request সারিতে রেখে একটা একটা করে দেওয়া হয়। concurrency আপনার সিদ্ধান্ত: এক thread-এ accept করে connection-প্রতি spawn করুন, বা test-এ single-threaded চালান।

`bind_reuse_port` shared port-এ independent accept loop বানায়। macOS আর Linux
নতুন connection ভাগ করে দেয়; Windows `unsupported` ফেরত দেয়।

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

### Response-এর framing নিজে করা

যে server নিজের socket নিজে চালায় — nonblocking write, connection-প্রতি একটা
output queue — সে-ও wire format-টা `std.http`-এর হাতেই রাখতে চায়। দুটো package
function একটা সম্পূর্ণ HTTP/1.1 response caller-এর storage-এ encode করে দেয়:

```beans
pub fn encode_response_into(target: Bytes, status: int, reason: string, headers: Headers, body: Bytes, keep_alive: bool) -> Result<bool>
pub fn encode_response_append(target: Bytes, status: int, reason: string, headers: Headers, body: Bytes, keep_alive: bool) -> Result<bool>
```

`encode_response_into` আগে `target` reset করে, তাই একই buffer response-এর পর
response-এ reuse হয়। `encode_response_append` `target`-এ যা আছে তার পরে লেখে —
যে server প্রতিটা response side buffer-এ না রেখে সরাসরি connection-এর output
queue-তে frame করে, এটা তার form। দুটোই `respond`-এর মতো একই header-safety
validation চালায়, আর validation fail করলে `target` অক্ষত থাকে।

## HTTP/2

Native bridge check করে যেকোনো owned byte stream নিন:

```beans
pub fn http2_available() -> bool
pub fn adopt_http2<T implements net.ByteStream>(move stream: T, server: bool) -> Result<Http2Transport<T>>
```

একটা completed exchange:

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

pub enum Http2Event {
    message(stream: Stream)
    stream_closed(id: int, error_code: int)
    goaway(last_stream: int, error_code: int)
}
```

Generic move-only connection যেকোনো `net.ByteStream` own করে:

```beans
pub unique class Http2Transport<T implements net.ByteStream> implements Send
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

`request` আর `respond` body buffer করে। stream করতে `request_headers` বা
`respond_headers` দিয়ে শুরু করুন, তারপর `send_data` দিয়ে chunk পাঠান। শেষ chunk-এ
`end_stream` true দিন। flow control আটকালে `would_block` আসে; connection run করে
একই chunk আবার দিন।

Raw TCP wrapper:

```beans
pub unique class Http2Connection implements Send
pub static fn adopt(move stream: net.TcpStream, server: bool) -> Result<Http2Connection>
pub fn respond_headers(stream_id: int, status: int, fields: Headers) -> Result<bool>
pub fn request_headers(method: string, scheme: string, authority: string, path: string, fields: Headers) -> Result<int>
pub fn send_data(stream_id: int, body: Bytes, end_stream: bool) -> Result<bool>
```

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

HTTP/1.1 parsing-কে ধরা হয় llhttp-র নিজের markdown corpus-এর কাছে — প্রতিটা case, উপরের প্রত্যাশা অবিকৃত রেখে, গোটা এবং প্রতিটা byte-এ দু-ভাগ করে চালিয়ে — সঙ্গে একটা request-smuggling corpus, যা শুরু থেকে শেষ পর্যন্ত ফিরিয়ে দিতেই হবে। HTTP/2-কে ধরা হয় h2spec-এর কাছে, আর মানদণ্ড ঠিক হয় মেপে: nghttp2-র নিজের reference server-কে আগে ওই একই suite-এ চালানো হয়, আর সে যে case পাশ করে এই implementation-এর সেটায় fail করা চলবে না।

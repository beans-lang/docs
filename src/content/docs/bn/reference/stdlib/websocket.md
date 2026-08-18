---
title: std.websocket
description: std.http-র upgrade-এর উপরে RFC 6455 WebSocket — frame নয়, গোটা message দেয়।
---

`std.websocket` [`std.http`](/bn/reference/stdlib/http/)-এর upgrade handshake-এর উপরে RFC 6455 বলে, আর framing-এর কাজটা করে wslay। source আছে এখানে: [`stdlib/std/websocket/websocket.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/websocket/websocket.b)।

```beans
import std.websocket
```

## যে নিয়মগুলো এই package-টাকে গড়ে তুলেছে

- **frame নয়, message।** `receive` গোটা message দেয়; fragmentation, continuation frame আর মাঝে ঢুকে পড়া control frame — সব ভিতরে সামলানো হয়, কারণ WebSocket-এর উপরে বানানো প্রতিটা protocol message নিয়ে ভাবে, frame নিয়ে কেউ ভাবে না।
- **text মানে বৈধ UTF-8**, আর যাচাইটা হয় জোড়া লাগানো গোটা message-এর উপরে, frame ধরে ধরে নয় — কারণ একটা code point দুই fragment-এর সীমানার উপর ছড়িয়ে থাকতে পারে। যে text message ঠিক UTF-8 নয়, সেটা protocol error।
- **ping-এর উত্তর নিজে থেকেই যায়।** `ping` আপনার loop-এ পৌঁছানোর আগেই pong তারে চলে গেছে, কারণ যে library মনে রাখার দায় আপনার উপর চাপায় সে মৃত connection বানায়। তবু আসা ping জানানো হয়, যাঁরা গোনেন তাঁদের জন্য।
- **close একটা handshake, ফোন কেটে দেওয়া নয়।** `close` close frame পাঠায় আর peer-এরটার জন্য সীমিত সময় অপেক্ষা করে। protocol ভাঙলে RFC যে close frame চায় সেটা পাঠিয়ে সঙ্গে সঙ্গে TCP connection বন্ধ করা হয়, যেমনটা 7.1.1 বলে।
- **message-এর একটা সীমা connection-এরই অংশ।** `max_message` জোড়া লাগানো message-এর আকার বাঁধে; সীমা ছাড়ালে `too_large`। কোনো peer অনন্তকাল fragment পাঠিয়ে server-কে দিয়ে সীমাহীন allocation করাতে পারে না।

যেসব error kind দেখা যেতে পারে: `protocol` (framing বা UTF-8 লঙ্ঘন), `too_large`, `handshake` (upgrade ফিরিয়ে দেওয়া হয়েছে বা accept মান মেলেনি), `eof` (close frame ছাড়াই connection শেষ), `closed`।

## Module function

```beans
pub fn accept_for_key(key: string) -> Result<string>
```

client-এর `Sec-WebSocket-Key`-এর জন্য `Sec-WebSocket-Accept` মান: key আর একটা নির্দিষ্ট UUID জোড়া দিয়ে তার SHA-1-এর base64। যে server এটা ভুল করে তাকে প্রতিটা browser ফিরিয়ে দেয় — এ কারণেই এটা protocol-এর সবচেয়ে বেশি পরীক্ষিত লাইন।

## Message

কী এসেছে। `text` আর `binary` গোটা message; `ping` আর `pong` control frame; `closed` peer-এর code আর কারণ বয়ে আনে, যার পরে connection শেষ।

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

তৈরি হয়ে যাওয়া TCP stream-এর উপরে একটা WebSocket connection। move-only: socket-এর মালিক সে-ই, আর সে-ই বন্ধ করে।

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

`connect` TCP connect, HTTP upgrade আর accept-মান যাচাই — তিনটেই করে। `target` হলো request target (`"/chat"`), গোটা URL নয় — host আর port আগেই ঠিক হয়ে আছে। close handshake শেষ হলে `receive` `ok(none)` দেয়; `peer_close_code()` peer-এর পাঠানো code, নয়তো 0।

`accept` `std.http`-র parse করা request-এর জন্য server দিকের upgrade সেরে নেয় আর 101 response নিজেই লেখে, তাই caller এমন একটা socket দেয় যার উত্তর এখনো দেওয়া হয়নি। `wrap` আগেই upgrade হয়ে যাওয়া socket নেয়, যিনি handshake নিজে সেরেছেন তাঁর জন্য।

## একটা client

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

## একটা server

upgrade সাধারণ HTTP, তাই `std.http` সেটা parse করে আর এই package socket-টা সেখান থেকে নেয় — এ কারণেই handshake-ও অন্য যেকোনো HTTP message-এর মতো একই কড়া parser পায়।

```beans
let parser: http.RequestParser = new http.RequestParser()
// ... head আসা পর্যন্ত feed করুন ...
let live: websocket.Connection =
    websocket.Connection.accept(move stream, request)?
```

## Conformance

framing-কে ধরা হয় Autobahn TestSuite-এর কাছে, container-এ চালিয়ে, echo server আর echo client দুয়ের বিরুদ্ধেই, আর মানদণ্ড কড়া: একটাও fail করা case নয়, একটাও fail করা close behavior নয়। ওই suite-ই কারণ যে এই package এক সপ্তাহান্তে নিজে লেখার বদলে wslay-কে মুড়েছে — ও এমন implementation ফেল করায় যেগুলো দেখতে সম্পূর্ণ মনে হয়।

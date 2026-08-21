---
title: std.net
description: TCP আর UDP socket, address resolve করা, আর async readiness helper।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 2টা package function · 6টা type · 1টা constructor · 8টা static method · 31টা instance method · 4টা public field।
<!-- coverage:summary:end -->

`std.net` দেয় TCP আর UDP socket, name resolve করার সুবিধা, আর দুটো async readiness helper। এটা `std.sock`-এর raw socket syscall-গুলোর উপর একটা সহজে-পড়া layer। source আছে এখানে: [`stdlib/std/net/net.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/net/net.b)।

```beans
import std.net
```

## যে নিয়মগুলো এই package-টাকে গড়ে তুলেছে

- **socket বানাতে constructor না, একটা named static লাগে।** যে construction fail করতে পারে সেটা `Result` ফেরত দেয়, তাই লেখা হয় `TcpStream.connect(...)`, `TcpListener.bind(...)`, আর `UdpSocket.bind(...)` — একদম `File.open`-এর মতো গড়ন।
- **প্রতিটা socket move-only এবং `Send`।** scope থেকে বেরিয়ে গেলে `deinit`-এ নিজেই বন্ধ হয়ে যায়। একটা worker-কে ownership দিতে `fn() move(socket)` ব্যবহার করুন। close-এর error দেখতে চাইলে `close()` আছে; না দেখলে scope শেষ হলেই কাজটা হয়ে যায়।
- **address family বাছা হয় না, resolve হয়।** প্রতিটা entry point host-টাকে `getaddrinfo` দিয়ে চালায়, তাই `"localhost"`, `"127.0.0.1"`, আর `"::1"` — সবই কোনো family flag ছাড়াই চলে।
- **read আর write নিয়ম করেই partial।** `read` যা এসেছে তা-ই ফেরত দেয়, আর `write` কতটা গেল সেটা জানায়। `read` থেকে খালি `Bytes` বলতে বোঝায় peer connection বন্ধ করে দিয়েছে। `write_all` আর `read_exact` নিজে থেকে loop করে নেয়।
- **blocking call EINTR-এ আবার চেষ্টা করে।** timeout হলে `timeout` kind-এর একটা `err` আসে, কখনো hang হয় না।

যেসব error kind দেখা যেতে পারে: `refused`, `in_use`, `timeout`, `reset`, `unreachable`, `not_found`, `closed`, `eof`, `invalid`, `permission`, `io`।

## Address

একটা সাধারণ value: একটা numeric host আর একটা port। ইচ্ছেমতো copy করা যায়।

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

- `resolve` একটা নাম যত distinct numeric address-এ map করে সবগুলো ফেরত দেয়, resolver যে order-এ দেয় সেই order-এই। যে নাম resolve হয় না সেটা `not_found` kind-এর একটা `err`।
- `to_string` `host:port` ছাপে, আর IPv6-এর জন্য `[host]:port`।

## Datagram

একটা এসে পৌঁছানো UDP message: পাঠানোর address আর বাইটগুলো।

```beans
pub class Datagram
pub from: Address
pub data: Bytes
```

## ByteStream

Raw TCP আর TLS-এর common transport interface। HTTP/2 আর WebSocket এই interface
ব্যবহার করে।

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

একটা connected TCP socket। move-only; `move` দিয়ে পাস করা হয়, `?` দিয়ে `Result` থেকে বের করে নেওয়া হয়।

```beans
pub unique class TcpStream implements ByteStream, Send

pub static fn connect(host: string, port: int) -> Result<TcpStream>
pub static fn connect_timeout(host: string, port: int, ms: int) -> Result<TcpStream>

pub fn write(data: Bytes) -> Result<int>
pub fn write_all(data: Bytes) -> Result<int>
pub fn write_text(text: string) -> Result<int>
pub fn read(max: int) -> Result<Bytes>
pub fn read_into(buffer: Bytes) -> Result<int>
pub fn read_exact(count: int) -> Result<Bytes>
pub fn read_to_end(limit: int) -> Result<Bytes>
pub fn peer_address() -> Result<Address>
pub fn local_address() -> Result<Address>
pub fn set_timeouts(read_ms: int, write_ms: int) -> Result<bool>
pub fn set_nonblocking(on: bool) -> Result<bool>
pub fn into_raw() -> Result<int>
pub fn shutdown_write() -> Result<bool>
pub fn shutdown_read() -> Result<bool>
pub fn close() -> Result<bool>
pub fn poll_handle() -> int
```

- `connect` OS যতক্ষণ অপেক্ষা করে ততক্ষণ অপেক্ষা করে; `connect_timeout` `ms` মিলিসেকেন্ড পরে হাল ছেড়ে `timeout` kind দেয়।
- `write` হয়তো `data`-র পুরোটা না পাঠিয়ে count ফেরত দেয়। `write_all` সব পাঠানো শেষ না হওয়া পর্যন্ত loop করে। `read` বড়জোর `max` বাইট ফেরত দেয়; খালি result বলতে বোঝায় peer বন্ধ করে দিয়েছে। `read_exact` `count` বাইট আসার আগেই peer বন্ধ করলে `eof` kind-এ fail করে। `read_exact` আর `read_to_end` copy-করা chunk জোড়া না দিয়ে একটাই result buffer বড় করে। `write_text` string storage সরাসরি পাঠিয়ে দেয়।
- `shutdown_write` peer-কে EOF পাঠায়, কিন্তু read half খোলা রাখে।
- `read_into` আগে থেকে বানানো non-empty `Bytes`-এ লেখে এবং count দেয়। zero মানে
  EOF। buffer-এর length বদলায় না; শুধু `0..count` এই read-এর data।
- `into_raw` descriptor-এর ownership lower-level transport-কে দেয়। এরপর নতুন
  owner-ই সেটা close করবে।
- `poll_handle` descriptor-টা **borrow করে** ফেরত দেয়, যাতে একটা poller বা async helper-এ register করা যায়। এটা ownership হস্তান্তর করে না; ওটা close করা যাবে না।

loopback-এর উপর ছোট্ট একটা request আর reply:

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

একটা socket যেটা আসা TCP connection accept করে।

```beans
pub unique class TcpListener implements Send

pub static fn bind(host: string, port: int) -> Result<TcpListener>
pub static fn bind_with_backlog(host: string, port: int, depth: int) -> Result<TcpListener>
pub static fn bind_reuse_port(host: string, port: int) -> Result<TcpListener>
pub static fn bind_reuse_port_with_backlog(host: string, port: int, depth: int) -> Result<TcpListener>

pub fn accept() -> Result<TcpStream>
pub fn accept_timeout(ms: int) -> Result<TcpStream>
pub fn local_address() -> Result<Address>
pub fn port() -> Result<int>
pub fn set_nonblocking(on: bool) -> Result<bool>
pub fn close() -> Result<bool>
pub fn poll_handle() -> int
```

- `bind` 128-এর backlog ব্যবহার করে; `bind_with_backlog` দিয়ে accept-queue-র depth নিজে ঠিক করা যায়।
- `bind_reuse_port` দিয়ে আলাদা listener একই port share করে; macOS আর Linux নতুন
  connection ভাগ করে দেয়। Windows `unsupported` ফেরত দেয়।
- port `0` দিলে system একটা খালি port দিয়ে দেয়। `port()` দিয়ে সেটা পড়ে নেওয়া যায় — একটা test এভাবেই কোনো নম্বর আন্দাজ না করে bind করে।
- `accept` connection আসা পর্যন্ত block করে। `accept_timeout(0)` হলো একটা non-blocking check; positive timeout শেষ হয়ে গেলে `timeout` kind।

## UdpSocket

একটা bound UDP socket। প্রতিটা send একটা message, আর প্রতিটা receive একটা message ফেরত দেয়, সাথে পাঠানোর address জুড়ে।

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

- `send_to` জানায় কত বাইট গেল। একটা datagram হয় পুরোটা যায় না হলে একেবারেই যায় না, তাই কম count বলতে বোঝায় message-টা বড্ড বড় ছিল।
- `recv_from` একটা datagram বড়জোর `max` বাইট পড়ে; একটা datagram-এ `max`-এর পরে যা থাকে সেটা OS ফেলে দেয়, তাই `max`-কে protocol অনুযায়ী মাপতে হবে। ফেরত-আসা `Datagram` এসে-পৌঁছানো payload-এর ownership নিয়ে নেয়, একটা জোড়া-লাগানো runtime buffer জোড়া দিয়ে-কেটে না নিয়েই।

loopback-এ দুটো UDP socket, একটা আরেকটাকে পাঠাচ্ছে:

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

দুটো `async` function দিয়ে একটা async task একটা thread না ধরে রেখেই socket-এর জন্য অপেক্ষা করতে পারে। `poll_handle()` থেকে পাওয়া descriptor-টা পাস করা হয়। এগুলো level-triggered: socket যদি আগে থেকেই ready থাকে, তবে সাথে সাথেই complete হয়ে যায়।

```beans
pub async fn readable(handle: int) -> bool
pub async fn writable(handle: int) -> bool
```

async function কীভাবে চলে সেটা [async guide](/bn/guide/async/)-এ বোঝানো আছে। একটা thread থেকে একসাথে অনেক socket-এর জন্য অপেক্ষা করতে চাইলে বরং [std.poll](/bn/reference/stdlib/poll/) ব্যবহার করুন।

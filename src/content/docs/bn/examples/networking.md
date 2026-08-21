---
title: Networking
description: examples/net.b ঘুরে দেখা — এক process-এই loopback-এর উপর TCP আর UDP চালানো — সাথে examples/poller.b-এর একটা ঝলক।
---

Beans-এর networking থাকে `std.net`-এ।
[`net.b`](https://github.com/beans-lang/beans/blob/main/examples/net.b) TCP আর UDP
দেখায়, আর
[`poller.b`](https://github.com/beans-lang/beans/blob/main/examples/poller.b) দেখায়
একটা thread কীভাবে একসাথে অনেক socket-এর জন্য wait করে। আরও আছে
[`http.b`](https://github.com/beans-lang/beans/blob/main/examples/http.b),
[`http2.b`](https://github.com/beans-lang/beans/blob/main/examples/http2.b), আর
[`websocket.b`](https://github.com/beans-lang/beans/blob/main/examples/websocket.b)।

দুইটাই পুরোপুরি loopback-এ (`127.0.0.1`) চলে, তা-ও **একটাই process**-এর ভেতরে। এই
জন্যই এগুলো কোনো সার্ভার-লাগে-এমন demo না, বরং deterministic test: loopback-এ একটা
listening socket-এ `connect` করলে kernel সেটা queue করার সাথে সাথেই শেষ হয়ে যায়,
তাই একটা thread-ই কোনো race ছাড়া দুই মাথা সামলাতে পারে।

## API-টার গড়ন

ফাইলের header থেকে দুইটা নিয়মই পুরো API-টা বুঝিয়ে দেয়:

- **একটা socket তৈরি হয় যেই class সেটা বানায় তার উপর একটা named construction দিয়ে**,
  কারণ এটা fail করতে পারে, তাই সাধারণ constructor হতে পারে না। এই জন্য call করা হয়
  `TcpListener.bind`, `TcpStream.connect`, `UdpSocket.bind`, আর `Address.resolve`
  — ঠিক `File.open`-এর মতোই গড়ন। `std.net`-এ কোনো module-level function নেই।
- **Socket move-only `Send` owner:** `deinit` দিয়ে বন্ধ হয়, আর explicit move
  capture দিয়ে এক worker-এ পাঠানো যায়। এক মালিক, এক বার close।

## যেকোনো ফাঁকা port-এ bind করা

```beans
fn ephemeral() -> Result<int> {
    let server: net.TcpListener = net.TcpListener.bind("127.0.0.1", 0)?
    let port: int = server.port()?
    io.println("bound to a system-chosen port {port > 0}")
    io.println("listener is loopback {server.local_address()?.is_loopback()}")
    return ok(port)
}
```

port `0` বোঝায় "যেকোনো ফাঁকা port"। সেটা `server.port()` দিয়ে আবার পড়ে নেওয়াটাই হলো
একটা program-এর একটা number না বেছেই bind করার উপায় — নইলে একটা number বেছে আশা
করতে হয় যে সেটা আর কেউ নেয়নি। প্রতিটা লাইন একটা *derived fact* প্রিন্ট করে
(`port > 0`), port-টা নিজে না — কারণ number-টা প্রতিবার বদলায়, কিন্তু fact-টা বদলায় না।

## একটা TCP round trip

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

client connect করে আর server accept করে (একটা ২-সেকেন্ডের timeout সহ, যাতে আটকে
যাওয়া test ঝুলে না থেকে fail করে)। `write_text` পাঠায়। `shutdown_write` বলে "আমার
দিক থেকে আর কিছু নেই" — কিন্তু যেই অর্ধেক থেকে আমরা এখনো পড়ছি সেটা বন্ধ না করেই।
তখন peer-এর পরের read একটা খালি ফলাফল দেয়, আর এভাবেই EOF আসে। `read_to_end` ওই
EOF পর্যন্ত পড়ে।

## Short write আর partial read

```beans
let sent: int = client.write_all(payload)?
client.shutdown_write()?

let got: Bytes = session.read_exact(4096)?
```

আসল socket-এ short write আর partial read — দুইটাই স্বাভাবিক, তাই এদের জন্য loop-করা
রূপ আছে। `write_all` সব পাঠানো শেষ না হওয়া পর্যন্ত লিখতেই থাকে। `read_exact` যত
চাওয়া হয়েছে ঠিক তত না পড়া পর্যন্ত পড়তেই থাকে, আর peer আগেভাগে থেমে গেলে `eof` kind
দিয়ে fail করে — একটা fixed-size header পড়া কোডের ঠিক এটাই দরকার।

## একই read buffer আবার ব্যবহার করা

Long-lived connection-এর buffer একবার allocate করুন:

```beans
let scratch: Bytes = Bytes.filled(16 * 1024, 0)
let count: int = session.read_into(scratch)?
if count > 0 {
    let events: List<http.RequestEvent> =
        parser.feed_range(scratch, 0, count)?
}
```

`read_into` buffer length বদলায় না; শুধু `0..count` লেখে। zero মানে EOF।
`feed_range` slice allocate না করে ওই checked range parse করে। `http.ServerConn`
এই allocation-free input path ব্যবহার করে।

## Connection worker-এ move করা

Socket আর HTTP owner `Send`। closure-এ move স্পষ্ট করে লিখতে হবে:

```beans
let worker: Thread<Result<int>> = thread.spawn(
    fn() move(session) -> Result<int> {
        let scratch: Bytes = Bytes.filled(16 * 1024, 0)
        return session.read_into(scratch)
    })
let count: int = worker.join()?
```

Plain capture refuse হয়। `Error` আর matching `Result` sendable, তাই worker `?`
ব্যবহার করে failure return করতে পারে।

Independent accept loop-এর জন্য OS level-এ port share করুন:

```beans
let first: net.TcpListener =
    net.TcpListener.bind_reuse_port("127.0.0.1", 8080)?
let second: net.TcpListener =
    net.TcpListener.bind_reuse_port("127.0.0.1", 8080)?
```

macOS আর Linux নতুন connection listener-গুলোর মধ্যে ভাগ করে। Windows
`unsupported` দেয়। HTTP server-এর জন্য একই shape হলো
`http.Server.bind_reuse_port`।

## UDP datagram

```beans
let listener: net.UdpSocket = net.UdpSocket.bind("127.0.0.1", 0)?
let sender: net.UdpSocket = net.UdpSocket.bind("127.0.0.1", 0)?
listener.set_timeouts(2000, 2000)?

let to: net.Address = new net.Address("127.0.0.1", listener.port()?)
let sent: int = sender.send_to(Bytes.from("ping"), to)?
let note: net.Datagram = listener.recv_from(64)?
io.println("and knows who sent it {note.from.port == sender.port()?}")
```

UDP হলো message-ভিত্তিক। `send_to` একটা `Address`-এ একটা datagram পাঠায়।
`recv_from` একটা `Datagram` ফেরত দেয়, যেটা `data`-টাও বহন করে আর পাঠানেওয়ালার
address-টাও (`from`-এ), তাই জবাব দেওয়া যায়। `set_timeouts` read-এর একটা সীমা
বেঁধে দেয়, তাই একটা হারানো datagram হয় একটা reported timeout — কখনো একটা hang না।

## Name আর address

```beans
let found: List<net.Address> = net.Address.resolve("localhost", 7000)?
// ...
let six: net.Address = new net.Address("::1", 80)
io.println("v6 text {six.to_string()}")
io.println("v6 is detected {six.is_ipv6()} and v4 is not {four.is_ipv6()}")
```

`Address.resolve` একটা name-কে address-এর একটা list-এ বদলে দেয় (`localhost` তো
প্রতিটা hosts file-এই থাকে, তাই এর জন্য কোনো network লাগে না)। একটা `Address` হলো
সাধারণ একটা value, যার একটা পড়ার-মতো `to_string()` আছে — যেখানে IPv6 bracket পায়
যাতে port-টা পড়তে সুবিধা হয় — আর সেটাকে দেখতে `is_ipv6()` / `is_loopback()` আছে।

## Failure হলো Result, panic না

`failures()` function-টা দেখায় প্রতিটা error-এর পথ কীভাবে একটা নির্দিষ্ট `kind`
সহ একটা `Result` ফেরত দেয়: কেউ শোনে না এমন port-এ connect করা, `"a..b"`-র মতো একটা
অবৈধ name resolve করা, একটা খালি host-এ bind করা, range-এর বাইরের একটা port, আর
`close()`-এর পরে একটা socket ব্যবহার করা। এদের একটাও panic করে না, একটাও ঝুলে থাকে না।

```beans
match net.TcpStream.connect_timeout("127.0.0.1", dead, 1000) {
    ok(surprise) => io.println("unexpected connection"),
    err(e) => io.println("connect to nothing: {e.kind}"),
}
```

চালান:

```bash
beansc run examples/net.b
```

## poller.b: অনেক descriptor-এর জন্য wait করা

`poller.b`-এর গড়নটা ঠিক একটা server-এর মতো: একটা thread, অনেক connection, আর এমন
একটা call যেটা কিছুর নজর দরকার না হওয়া পর্যন্ত ঘুমিয়ে থাকে। poller-টা এক API-র
পেছনে Linux-এ `epoll` আর macOS-এ `kqueue` — সব `std.poll`-এ।

ফাইলের header থেকে দুইটা design সিদ্ধান্ত:

- **Level-triggered।** একটা socket-এ যতক্ষণ data থাকে, প্রতিটা `wait` সেটা জানায়।
  যেই handler এসে-পড়া data-র শুধু কিছুটা পড়ে সে-ও ঠিক আছে; শুধু তাকে আবার জানানো হবে।
- **Event আপনার token বহন করে, কোনো descriptor না।** একটা descriptor number বন্ধ
  হওয়ার সাথে সাথেই আবার ব্যবহার হয়ে যায়, তাই একটা event সেটা ধরে রাখলে পরে দেখার
  সময় হয়তো সেটা অন্য কিছুকে নির্দেশ করছে। token হলো নিজের বাছাই করা একটা
  number, আর সেটার অর্থ যা ঠিক করা হয় তা-ই।

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

`watch.add` একটা descriptor-কে একটা token (`100`) আর একটা interest (`read_only`)
সহ register করে। `wait(max, timeout_ms)` যেই event-গুলো ready সেগুলো ফেরত দেয়;
একটা খালি list হলো সাধারণ একটা "কিছুই ready না" জবাব, error না। প্রতিটা `Event`
যেই token দেওয়া হয়েছিল সেটা বহন করে, সাথে `readable`-এর মতো flag।

চালান:

```bash
beansc run examples/poller.b
```

[std.net](/bn/reference/stdlib/net/) হলো networking-এর reference আর
[std.poll](/bn/reference/stdlib/poll/) হলো poller-এর reference।
[File আর একটা KV store](/bn/examples/files-kv/) disk-এ ঠিক এই একই error আর resource
স্টাইলটাই দেখায়।

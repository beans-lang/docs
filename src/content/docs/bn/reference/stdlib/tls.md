---
title: std.tls
description: platform-এর নিজের TLS stack, একটা TcpStream-কে filter হিসেবে মুড়ে।
---

`std.tls` একটা connect করা `TcpStream`-কে TLS দিয়ে মুড়ে দেয়, operating system-এর নিজের implementation ব্যবহার করে — macOS-এ SecureTransport, Windows-এ SChannel, Linux/BSD-তে runtime-এ load করা OpenSSL 3 — আর API কোথাও বলে না কোনটা চলছে। source আছে এখানে: [`stdlib/std/tls/tls.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/tls/tls.b)।

```beans
import std.tls
```

## যে নিয়মগুলো এই package-টাকে গড়ে তুলেছে

- **cryptography আর trust-এর সিদ্ধান্ত — দুটোরই মালিক platform।** certificate chain বানানো আর hostname যাচাই করা সবসময় platform verifier-এর কাজ; এই package কোনোটাই আবার লেখে না। এটা সুবিধার জন্য না — OS-এর revocation, policy আর root update উত্তরাধিকার পাওয়ার এটাই একমাত্র পথ।
- **বাড়তি root যোগ হয়, বদলায় না।** `connect_with_roots` একটা connection-এর জন্য কোন anchor গ্রহণযোগ্য সেটা বাড়ায়, private CA বা pin করা root-এর জন্য। system store তবু কাজ করে, তাই সাধারণ public chain-ও আগের মতোই verify হয়।
- **`close_notify` ছাড়া কেটে যাওয়া stream একটা error।** খালি `read` মানে peer শেষ ঘোষণা করেছে; তার আগে transport মরে গেলে সেটা `eof` kind — FIN-এ শেষ হোক বা RST-এ। এটাই truncation attack-কে লুকিয়ে না রেখে সামনে আনা — যে stack একে "data শেষ" বলে চালায়, সে আক্রমণকারীকে যেকোনো response নিজের পছন্দমতো জায়গায় কেটে দেওয়ার সুযোগ দেয়।
- **stream তার socket-এর মালিক**, আর encryption-এর উপরে `TcpStream`-এর মতোই ব্যবহার হয়: partial read আর write, আর সবটুকু চাইলে `write_all` ও `read_exact`।

যেসব error kind দেখা যেতে পারে: `handshake` (certificate, hostname বা protocol), `eof` (truncation, বা handshake-এর মাঝে peer চলে যাওয়া), `protocol` (record layer), `unsupported` (এই platform-এ backend নেই), `closed`, আর transport-এর নিজের kind-গুলো।

## backend-এর একটা পার্থক্য জেনে রাখা ভালো

macOS-এর SecureTransport **বড়জোর TLS 1.2** পর্যন্ত যায়। Apple ওতে কখনো 1.3 যোগ করেনি; উত্তরসূরি আছে Network.framework-এ। তাই কেবল-1.3 peer macOS-এ `handshake` kind দিয়ে ফিরিয়ে দেওয়া হয় আর অন্য সব জায়গায় গ্রহণ করা হয় — পরিষ্কার প্রত্যাখ্যান, চুপচাপ downgrade কখনো নয়। API এমনভাবে গড়া যে পরে macOS-কে Network.framework-এ সরালে caller-এর চোখে কিছুই বদলাবে না।

## Module function

```beans
pub fn available() -> bool
```

TLS backend আছে কি না। macOS-এ সবসময় আছে; Linux-এ runtime-এ একটা libssl থাকার উপর নির্ভর করে।

## TlsStream

একটা `TcpStream`-এর উপরে TLS connection। move-only: socket-এর মালিক সে-ই, আর বন্ধ করার সময় socket বন্ধ করার আগে `close_notify` পাঠায়।

```beans
pub static fn connect(host: string, port: int, alpn: string) -> Result<TlsStream>
pub static fn connect_timeout(host: string, port: int, alpn: string, ms: int) -> Result<TlsStream>
pub static fn connect_with_roots(host: string, port: int, alpn: string, extra_roots: Bytes, ms: int) -> Result<TlsStream>
pub fn protocol() -> string
pub fn write(data: Bytes) -> Result<int>
pub fn write_all(data: Bytes) -> Result<int>
pub fn read(max: int) -> Result<Bytes>
pub fn read_exact(count: int) -> Result<Bytes>
pub fn close() -> Result<bool>
```

`alpn` হলো comma দিয়ে আলাদা করা protocol তালিকা — `"h2,http/1.1"` — বা কিছু না চাইলে খালি। `protocol()` বলে কোনটা ঠিক হলো, কিছু ঠিক না হলে খালি string। `extra_roots` একটা PEM bundle; খালি bundle দিলে `connect_with_roots` হুবহু `connect`।

```beans
let secure: tls.TlsStream =
    tls.TlsStream.connect("example.test", 443, "h2,http/1.1")?
io.println(secure.protocol())
secure.write_all(Bytes.from(request))?
let reply: Bytes = secure.read(16384)?    // খালি মানে close_notify এসেছে
secure.close()?
```

## private CA-র সঙ্গে কথা

test server, internal service বা pin করা root-এর গড়নটা এ রকম:

```beans
let roots: Bytes = fs.read_bytes("ca.pem")?
let secure: tls.TlsStream =
    tls.TlsStream.connect_with_roots("localhost", port, "", roots, 8000)?
```

certificate-এর মেয়াদ, hostname আর chain — সবই তবু যাচাই হয়। anchor যোগ করা মানে কে sign করতে পারবে সেটা বলা, verification বাদ দেওয়া নয়।

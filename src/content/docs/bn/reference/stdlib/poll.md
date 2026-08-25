---
title: std.poll
description: epoll বা kqueue দিয়ে একসাথে অনেক file descriptor-এর জন্য অপেক্ষা করা, level-triggered মোডে।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 1টা package function · 3টা type · 1টা constructor · 4টা static method · 7টা instance method · 7টা public field।
<!-- coverage:summary:end -->

`std.poll` দিয়ে একটা thread একসাথে অনেক descriptor-এর জন্য অপেক্ষা করতে পারে, আর জানতে পারে কোনগুলো ready হলো। Linux-এ এটা `epoll` ব্যবহার করে, macOS-এ `kqueue`, দুটোই level-triggered মোডে। source দেখুন এখানে:
[`stdlib/std/poll/poll.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/poll/poll.b)।

```beans
import std.poll
```

প্রতিটা descriptor-কে poller-এ register করা হয় একটা **token**-এর নিচে, token-টা নিজে বেছে নেওয়া হয়। wait করার সময় প্রতিটা ready descriptor তার token নিয়ে ফিরে আসে। token নিজের বেছে নেওয়া value, কখনোই raw descriptor না, তাই ওটাকে নিজের data-র index বা id হিসেবে ব্যবহার করা যায়। এটা জরুরি, কারণ একটা descriptor number বন্ধ হওয়ার সঙ্গে সঙ্গেই আবার নতুন করে ব্যবহার হয়ে যায় — তাই ওটার উপর keyed কোনো event handle করার সময়ে হয়তো অন্য কোনো জিনিসকে নির্দেশ করছে।

## Interest

একটা descriptor-এ কী জন্য নজর রাখতে চাওয়া হচ্ছে সেটা। সাধারণ একটা value, তাই একটা তৈরি করে বারবার ব্যবহার করা যায়।

```beans
pub class Interest
new Interest(read: bool, write: bool)

pub read: bool
pub write: bool

pub static fn read_only() -> Interest
pub static fn write_only() -> Interest
pub static fn both() -> Interest
```

- `read_only` incoming data-র জন্য নজর রাখে, কিংবা একটা listener-এ connection আসার জন্য। `write_only` লেখার জায়গার জন্য নজর রাখে। `both` দুটোর জন্যই।

## Event

একটা descriptor যেটা ready হলো, যেভাবে `wait` ফেরত দেয়।

```beans
pub class Event
pub token: int
pub readable: bool
pub writable: bool
pub hangup: bool
pub error: bool
```

- `token` হলো `add`-এ যে value দেওয়া হয়েছিল, যা caller-এর নিজের হিসেবেই বোঝার। `readable` বলতে বোঝায় data এসেছে বা একটা listener-এ connection অপেক্ষা করছে। `writable` বলতে বোঝায় লেখার জায়গা আছে। `hangup` বলতে বোঝায় peer চলে গেছে; একটা socket একইসাথে readable **আর** hung up হতে পারে, আর তখন buffer-এ জমে থাকা data-টা পড়া কিন্তু এখনো দরকারি। `error` বলতে বোঝায় descriptor-টা নিজেই fail করেছে।

## Poller

যে descriptor-গুলোর জন্য অপেক্ষা করা হবে তাদের set। এটা move-only, `Send`, আর drop হলে নিজেই বন্ধ হয়ে যায়।

```beans
pub unique class Poller implements Send

pub static fn open() -> Result<Poller>

pub fn add(fd: int, token: int, want: Interest) -> Result<bool>
pub fn modify(fd: int, token: int, want: Interest) -> Result<bool>
pub fn remove(fd: int) -> Result<bool>
pub fn wait(max_events: int, timeout_ms: int) -> Result<List<Event>>
pub fn wait_into(max_events: int, timeout_ms: int, events: List<Event>) -> Result<int>
pub fn wake() -> Result<bool>
pub fn wake_handle() -> int
pub fn close() -> Result<bool>
```

- `open` constructor না হয়ে fail করতে পারে, কারণ একটা poller ভেতরে একটা pipe বহন করে যাতে `wake()` কাজ করে।
- `add` `fd`-এর উপর নজর রাখা শুরু করে, আর ready হলে `token` জানায়। একই descriptor দুবার register করলে আগেরটাকে replace করে দেয়, fail করে না।
- `modify` একটা descriptor কী জন্য দেখা হচ্ছে সেটা বদলায়, আর তার token-ও।
- `remove` একটা descriptor-এর উপর নজর রাখা বন্ধ করে। **descriptor বন্ধ করার আগে এটা করতে হবে।** বন্ধ করলে ঠিকই kernel-এর সেট থেকে ওটা বাদ পড়ে যায়, কিন্তু এই batch-এ যে event-গুলো এর মধ্যেই আছে সেগুলো এখনো ওই token বহন করে, আর ততক্ষণে number-টা হয়তো অন্য কিছুর দখলে চলে গেছে।
- `wait` ready descriptor-গুলো ফেরত দেয়, বড়জোর `max_events`-টা, যেটা allocation-এর সীমা বেঁধে দেয়। negative `timeout_ms` অনন্তকাল অপেক্ষা করে, `0` হলো non-blocking check, আর বাকি যেকোনো value বড়জোর তত মিলিসেকেন্ড অপেক্ষা করে। সময় ফুরিয়ে গেলে **একটা খালি list, error না**।
- `wait_into` হলো `wait`-ই, কিন্তু caller-এর রেখে দেওয়া list-এ — জায়গায় বসে ভরে
  দেয় আর ready count ফেরত দেয়। প্রথম `count`-টা entry নতুন করে লেখা হয়; count-এর
  পরের entry-গুলোয় আগের call-এর বাসি data থেকে যায়, তাই শুধু `0..count` পড়বে।
  যে event loop প্রতিবার একই list পাঠায় সে প্রতি wake-এ কিছুই allocate করে না।
- `wake` একটা block হয়ে থাকা `wait`-কে চটপট ফিরিয়ে আনে। বারবার wake করলে সেগুলো একটাতেই মিশে যায়, আর একটা wake কখনো event হিসেবে জানানো হয় না।
- `wake_handle` একটা `int` ফেরত দেয় যেটা **thread boundary পার হতে পারে**। এটা descriptor না: এটা একটা slot আর একটা generation-কে নির্দেশ করে, তাই এই poller বন্ধ হওয়ার পর দেওয়া কোনো wake সেই descriptor number-এর দখল নেওয়া জিনিসে না লিখে বরং `closed` kind জানায়।
- poller একবার বন্ধ হলে প্রতিটা method `closed` kind ফেরত দেয়।

## অন্য thread থেকে wake করা

কোনো block হয়ে থাকা poller-কে অন্য একটা thread থেকে wake করতে হলে, সেই thread poller-এর `wake_handle()` দিয়ে module-level function-টা ডাকে। এটা method না হয়ে একটা free function, কারণ পুরো ব্যাপারটাই এই — caller-এর হাতে `Poller`-টা নেই। যে poller ইতিমধ্যে বন্ধ হয়ে গেছে তার একটা বাসি handle হলে `closed` kind-এর একটা `err`।

```beans
pub fn wake(signal: int) -> Result<bool>
```

একটা listener register করে একটা connection আসার জন্য অপেক্ষা করা:

<!-- beans:compile -->
```beans
import std.io
import std.poll
import std.net

fn main() {
    let listener: net.TcpListener = net.TcpListener.bind("127.0.0.1", 0).expect("bind")
    let poller: poll.Poller = poll.Poller.open().expect("open")
    poller.add(listener.poll_handle(), 1, poll.Interest.read_only()).expect("add")
    let events: List<poll.Event> = poller.wait(8, 1000).expect("wait")
    for e in events {
        if e.token == 1 && e.readable {
            io.println("a connection is waiting")
        }
    }
}
```

## আরও দেখুন

- [std.net](/bn/reference/stdlib/net/), socket-গুলো একটা `poll_handle()` দেয়।
- [std.signal](/bn/reference/stdlib/signal/), একটা `Signals`-এরও একটা `poll_handle()` আছে।

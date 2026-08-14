---
title: std.signal
description: OS signal-কে একটা descriptor দিয়ে data হিসেবে receive করা, কোনো async signal handler ছাড়া।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 2টা type · 15টা static method · 3টা instance method।
<!-- coverage:summary:end -->

`std.signal` দিয়ে Unix signal-কে নিছক data হিসেবে receive করা যায়। কোনো callback নেই, কোনো async handler নেই। বদলে, যে signal-গুলো দরকারি সেগুলো block করে একটা descriptor-এ পাঠানো হয়, আর প্রস্তুত হলে সেখান থেকে পড়া হয়। Linux-এ এটা `signalfd` ব্যবহার করে; macOS-এ একটা private `kqueue` `EVFILT_SIGNAL`। source দেখুন এখানে:
[`stdlib/std/signal/signal.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/signal/signal.b)।

```beans
import std.signal
```

Windows-এ প্রতিটা operation একটা stub, যেটা refuse করে, কারণ Windows এই model প্রকাশ করতে পারে না।

সব signal-এ নজর রাখা যায় না। `kill` আর `stop` block করা যায় না, আর fault signal-গুলো — `segv`, `bus`, `fpe`, আর `ill`ও বাদ। বাদ-দেওয়া বা অচেনা কোনো নামের number জানতে চাইলে `not_found` kind-এর একটা `err`।

**thread spawn করার আগেই watch করতে হবে।** block করার ব্যাপারটা যে thread ডাকছে সেটার উপর খাটে, আর তার পরে বানানো thread-গুলো সেটা inherit করে। যে thread-গুলো আগে থেকেই ছিল সেগুলো করে না, আর তাদের একটাতে পাঠানো signal এখনো default action চালায়।

## Signal

signal number-এর জন্য static helper। একটা signal-এর number platform-ভেদে আলাদা, তাই নাম দিয়ে জিজ্ঞেস করা হয়। এদের প্রতিটা `Result<int>` ফেরত দেয়, এই platform-এ number-টা সহ।

```beans
pub class Signal

pub static fn interrupt() -> Result<int>
pub static fn terminate() -> Result<int>
pub static fn hangup() -> Result<int>
pub static fn quit() -> Result<int>
pub static fn user1() -> Result<int>
pub static fn user2() -> Result<int>
pub static fn child() -> Result<int>
pub static fn pipe() -> Result<int>
pub static fn alarm() -> Result<int>
pub static fn window_change() -> Result<int>

pub static fn number(name: string) -> Result<int>
pub static fn name(number: int) -> Result<string>
pub static fn send_to_self(number: int) -> Result<bool>
```

- `interrupt` হলো Ctrl-C। `terminate` হলো `kill` default-এ যে ভদ্র exit request পাঠায় সেটা। `hangup` তখন fire করে যখন controlling terminal চলে যায়। `quit` হলো Ctrl-\। `user1` আর `user2` নিজের সংজ্ঞা দেওয়ার জন্য। `child` fire করে যখন একটা child process-এর অবস্থা বদলায়। `pipe` fire করে যখন এমন একটা pipe বা socket-এ লেখা হয় যেটার কোনো reader নেই। `alarm` fire করে যখন একটা alarm timer-এর সময় শেষ হয়। `window_change` fire করে যখন terminal-এর size বদলায়।
- `number` যেকোনো watchable signal-এর নাম খুঁজে দেয়, আর বাকি সবের জন্য `not_found` ফেরত দেয় — যেসব signal ইচ্ছে করে বাদ দেওয়া হয়েছে সেগুলো সহ। `name` হলো তার উল্টোটা, print করার জন্য।
- `send_to_self` current process-এ একটা signal পাঠায়। এটা আছে যাতে দ্বিতীয় একটা process ছাড়াই signal handling test করা যায়, আর এটা একই table দিয়ে যায়, তাই watch করা যায় না এমন কিছু এটা deliver করতে পারে না।

## Signals

যে value থেকে signal পড়া হয়। এটা একটা `unique class`: move-only, আর drop হলে নিজেই বন্ধ হয়ে যায়।

```beans
pub unique class Signals

pub static fn watch(numbers: List<int>) -> Result<Signals>
pub static fn watch_signal(number: int) -> Result<Signals>

pub fn drain() -> Result<List<int>>
pub fn poll_handle() -> int
pub fn close() -> Result<bool>
```

- `watch` list-এর প্রতিটা signal block করে জমানো শুরু করে। খালি list হলে `invalid` kind-এর একটা `err`। `watch_signal` হলো এক-signal-এর সংক্ষিপ্ত রূপ।
- `drain` কখনো block করে না। শেষ call-এর পর থেকে যে signal-গুলো এসেছে সেগুলো ফিরিয়ে দেয় আর সেগুলো নিয়ে নেয়; কিছু না এলে খালি list, যেটা error না। একটা signal যতবারই deliver হোক না কেন, per call বড়জোর একবার দেখা দেয়।
- `poll_handle` descriptor-টা **borrow করে** ফেরত দেয়, একটা [poller](/bn/reference/stdlib/poll/)-এ register করার জন্য। এটা ownership হস্তান্তর করে না; ওটা close করা যাবে না।
- `close` watch করা থামায় আর signal-গুলো unblock করে দেয় যাতে default handling ফিরে আসে। ইতিমধ্যে বন্ধ হওয়া source-এ `drain` বা `close` করলে `closed` kind ফেরত।

কোনো thread spawn করার **আগেই** watch-টা সেট করতে হবে, যাতে block করার ব্যাপারটা পুরো process-এ খাটে:

<!-- beans:compile -->
```beans
import std.io
import std.signal

fn main() {
    let sigint: int = signal.Signal.interrupt().expect("interrupt")
    let signals: signal.Signals = signal.Signals.watch_signal(sigint).expect("watch")
    // ... later, after work or a poll wakeup:
    let numbers: List<int> = signals.drain().expect("drain")
    for number in numbers {
        io.println("got signal {number}")
    }
}
```

## আরও দেখুন

- [std.poll](/bn/reference/stdlib/poll/), অন্য descriptor-গুলোর পাশাপাশি `poll_handle()`-এর জন্য অপেক্ষা করা।
- [std.process](/bn/reference/stdlib/process/), child process-এ signal পাঠানো।

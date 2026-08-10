---
title: std.poll
description: Wait on many file descriptors at once with epoll or kqueue, level-triggered.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 1 package function · 3 types · 1 constructor · 4 static methods · 7 instance methods · 7 public fields.
<!-- coverage:summary:end -->

`std.poll` lets one thread wait on many descriptors at once and learn which ones
are ready. It uses `epoll` on Linux and `kqueue` on macOS, in level-triggered
mode. Read the source at
[`stdlib/std/poll/poll.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/poll/poll.b).

```beans
import std.poll
```

You register descriptors with a poller, each under a **token** you choose. When
you wait, each ready descriptor comes back carrying its token. The token is your
own value, never a raw descriptor, so you can use it as an index or an id into
your own data. That matters because a descriptor number is reused the moment it is
closed, so an event keyed on one could name a different thing by the time you
handle it.

## Interest

What you want to watch a descriptor for. An ordinary value, so build one and reuse
it.

```beans
pub class Interest
new Interest(read: bool, write: bool)

pub read: bool
pub write: bool

pub static fn read_only() -> Interest
pub static fn write_only() -> Interest
pub static fn both() -> Interest
```

- `read_only` watches for incoming data, or for a connection on a listener.
  `write_only` watches for room to write. `both` watches for both.

## Event

One descriptor that became ready, as returned by `wait`.

```beans
pub class Event
pub token: int
pub readable: bool
pub writable: bool
pub hangup: bool
pub error: bool
```

- `token` is the value you gave to `add`, yours to interpret. `readable` means data
  has arrived or a listener has a connection waiting. `writable` means there is
  room to write. `hangup` means the peer is gone; a socket can be readable **and**
  hung up, and the buffered data is still worth reading. `error` means the
  descriptor itself failed.

## Poller

The set of descriptors to wait on. It is a `unique class`: move-only, and it
closes itself on drop.

```beans
pub unique class Poller

pub static fn open() -> Result<Poller>

pub fn add(fd: int, token: int, want: Interest) -> Result<bool>
pub fn modify(fd: int, token: int, want: Interest) -> Result<bool>
pub fn remove(fd: int) -> Result<bool>
pub fn wait(max_events: int, timeout_ms: int) -> Result<List<Event>>
pub fn wake() -> Result<bool>
pub fn wake_handle() -> int
pub fn close() -> Result<bool>
```

- `open` can fail rather than being a constructor because a poller carries an
  internal pipe so `wake()` works.
- `add` starts watching `fd` and reports `token` when it is ready. Registering the
  same descriptor twice replaces the earlier registration rather than failing.
- `modify` changes what a descriptor is watched for, and its token.
- `remove` stops watching a descriptor. **Do this before closing the descriptor.**
  Closing does drop it from the kernel's set, but events already in the current
  batch still carry its token, and by then the number may belong to something else.
- `wait` returns the ready descriptors, at most `max_events` of them, which bounds
  the allocation. A negative `timeout_ms` waits indefinitely, `0` is a non-blocking
  check, and any other value waits up to that many milliseconds. Running out of
  time gives an **empty list, not an error**.
- `wake` makes a blocked `wait` return promptly. Repeated wakes collapse into one,
  and a wake is never reported as an event.
- `wake_handle` returns an `int` that **can cross a thread boundary**. It is not the
  descriptor: it names a slot and a generation, so a wake issued after this poller
  closes reports kind `closed` instead of writing into whatever inherited the
  descriptor number.
- Every method returns kind `closed` once the poller is closed.

## Waking from another thread

If another thread needs to wake a blocked poller, it calls the module-level
function with the poller's `wake_handle()`. It is a free function rather than a
method because the whole point is that the caller does not hold the `Poller`. A
stale handle, from a poller that has since closed, is an `err` with kind `closed`.

```beans
pub fn wake(signal: int) -> Result<bool>
```

Register a listener and wait for a connection to arrive:

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

## See also

- [std.net](/reference/stdlib/net/), sockets expose a `poll_handle()`.
- [std.signal](/reference/stdlib/signal/), a `Signals` also has a `poll_handle()`.

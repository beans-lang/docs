---
title: std.poll
description: Wait on many file descriptors at once with epoll or kqueue, level-triggered.
---

`std.poll` lets one thread wait on many descriptors at once and learn which ones
are ready. It uses `epoll` on Linux and `kqueue` on macOS, in level-triggered
mode. Read the source at
[`stdlib/std/poll/poll.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/poll/poll.b).

```beans
import std.poll
```

You register descriptors with a poller, each under a **token** you choose. When
you wait, each ready descriptor comes back carrying its token. The token is your
own value, never a raw descriptor — so you can use it as an index or an id into
your own data.

## class Interest

What you want to watch a descriptor for.

- `pub read: bool`, `pub write: bool`.
- `new poll.Interest(read, write)`.
- `Interest.read_only()` (static) — readable only.
- `Interest.write_only()` (static) — writable only.
- `Interest.both()` (static) — both.

## class Event

One ready descriptor, reported by `wait`.

- `pub token: int` — the token you registered.
- `pub readable: bool`, `pub writable: bool` — what it is ready for.
- `pub hangup: bool` — the peer hung up.
- `pub error: bool` — an error condition.

## unique class Poller

The poller itself. Move-only; closes on drop.

- `Poller.open() -> Result<Poller>` (static) — make one.

| Method | Returns | What it does |
| --- | --- | --- |
| `add(fd: int, token: int, want: Interest)` | `Result<bool>` | start watching `fd` under `token` |
| `modify(fd, token, want)` | `Result<bool>` | change what you watch `fd` for |
| `remove(fd)` | `Result<bool>` | stop watching `fd` (do this before closing it) |
| `wait(max_events, timeout_ms)` | `Result<List<Event>>` | wait for ready descriptors |
| `wake()` | `Result<bool>` | wake this poller from its own thread |
| `wake_handle()` | `int` | a handle other threads can use to wake it |
| `close()` | `Result<bool>` | close the poller |

For `wait`: a negative `timeout_ms` waits forever, `0` returns right away, and any
other value waits up to that many milliseconds. An empty list means nothing was
ready in time — that is not an error.

Always `remove` a descriptor before you close it. Removing first keeps the poller
consistent.

## Waking from another thread

If another thread needs to wake a blocked poller, it calls the module-level
function with the poller's `wake_handle()`:

- `wake(signal: int) -> Result<bool>` — wake the poller whose handle is `signal`.

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

- [std.net](/reference/stdlib/net/) — sockets expose a `poll_handle()`.
- [std.signal](/reference/stdlib/signal/) — a `Signals` also has a `poll_handle()`.

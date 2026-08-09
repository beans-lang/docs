---
title: std.signal
description: Receive OS signals as data through a descriptor, with no async signal handler.
---

`std.signal` lets you receive Unix signals as plain data. There is no callback and
no async handler. Instead, the signals you care about are blocked and delivered to
a descriptor you read from when you are ready. On Linux this uses `signalfd`; on
macOS a private `kqueue` `EVFILT_SIGNAL`. Read the source at
[`stdlib/std/signal/signal.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/signal/signal.b).

```beans
import std.signal
```

On Windows every operation is a stub that refuses, because Windows cannot express
this model.

You cannot watch every signal. `kill` and `stop` are unblockable, and the fault
signals `segv`, `bus`, `fpe`, and `ill` are excluded too.

## class Signal

Static helpers for signal numbers. The actual number differs by platform, so ask
by name. Each of these returns `Result<int>` with the number on this platform:

`interrupt()`, `terminate()`, `hangup()`, `quit()`, `user1()`, `user2()`,
`child()`, `pipe()`, `alarm()`, `window_change()`.

More static helpers:

| Function | Returns | What it does |
| --- | --- | --- |
| `number(name)` | `Result<int>` | look up a signal number by name |
| `name(number)` | `Result<string>` | look up a signal name by number |
| `send_to_self(number)` | `Result<bool>` | send a signal to your own process |

## unique class Signals

The thing you read signals from. Move-only; closes on drop.

Create (static):

- `Signals.watch(numbers: List<int>) -> Result<Signals>` — watch several signals.
- `Signals.watch_signal(number) -> Result<Signals>` — watch one.

Set this up **before** you spawn any threads, so the blocking applies to the whole
process.

| Method | Returns | What it does |
| --- | --- | --- |
| `drain()` | `Result<List<int>>` | take the signals delivered so far |
| `poll_handle()` | `int` | the descriptor, for use with a poller |
| `close()` | `Result<bool>` | close it |

`drain` never blocks. It hands back the signals delivered since the last call,
each one at most once per call, and consumes them.

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

## See also

- [std.poll](/reference/stdlib/poll/) — wait on the `poll_handle()` alongside
  other descriptors.
- [std.process](/reference/stdlib/process/) — send signals to child processes.

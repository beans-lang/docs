---
title: std.signal
description: Receive OS signals as data through a descriptor, with no async signal handler.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 2 types · 15 static methods · 3 instance methods.
<!-- coverage:summary:end -->

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
signals `segv`, `bus`, `fpe`, and `ill` are excluded too. Asking for the number of
an excluded or unknown name is an `err` with kind `not_found`.

**Watch before spawning threads.** Blocking applies to the calling thread, and
threads created afterwards inherit it. Threads that already exist do not, and a
signal delivered to one of those still runs the default action.

## Signal

Static helpers for signal numbers. The number for a signal differs by platform, so
you ask by name. Each of these returns `Result<int>` with the number on this
platform.

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

- `interrupt` is Ctrl-C. `terminate` is the polite exit request `kill` sends by
  default. `hangup` fires when the controlling terminal goes away.  `quit` is
  Ctrl-\. `user1` and `user2` are yours to define. `child` fires when a child
  process changes state. `pipe` fires on a write to a pipe or socket with no
  reader. `alarm` fires when an alarm timer expires. `window_change` fires when
  the terminal is resized.
- `number` looks up any watchable signal by name and returns `not_found` for
  anything else, including the deliberately excluded signals. `name` is the
  reverse, for printing.
- `send_to_self` sends a signal to the current process. It exists so signal
  handling can be tested without a second process, and it goes through the same
  table, so it cannot deliver something unwatchable.

## Signals

The value you read signals from. It is a `unique class`: move-only, and it closes
itself on drop.

```beans
pub unique class Signals

pub static fn watch(numbers: List<int>) -> Result<Signals>
pub static fn watch_signal(number: int) -> Result<Signals>

pub fn drain() -> Result<List<int>>
pub fn poll_handle() -> int
pub fn close() -> Result<bool>
```

- `watch` blocks each listed signal and starts collecting it. An empty list is an
  `err` with kind `invalid`. `watch_signal` is the one-signal short form.
- `drain` never blocks. It hands back the signals delivered since the last call and
  consumes them; nothing having arrived gives an empty list, which is not an error.
  A signal appears at most once per call however many times it was delivered.
- `poll_handle` returns the descriptor **borrowed**, for registering with a
  [poller](/reference/stdlib/poll/). It does not transfer ownership; do not close
  it.
- `close` stops watching and unblocks the signals so default handling returns.
  `drain` and `close` on an already-closed source return kind `closed`.

Set the watch up **before** you spawn any threads, so the blocking applies to the
whole process:

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

## See also

- [std.poll](/reference/stdlib/poll/), wait on the `poll_handle()` alongside
  other descriptors.
- [std.process](/reference/stdlib/process/), send signals to child processes.

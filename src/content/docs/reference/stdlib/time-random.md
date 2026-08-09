---
title: std.time and std.random
description: Clocks and sleeping, plus secure random bytes and numbers from the OS.
---

These two native modules cover time and randomness. Both are built into the
compiler and runtime.

## std.time

```beans
import std.time
```

There are two clocks. The **monotonic** clock only ever moves forward; use it to
measure how long something took. The **wall** clock is the real calendar time; it
can jump backward or forward when the system clock is adjusted.

| Function | Returns | What it does |
| --- | --- | --- |
| `time.monotonic_nanos()` | `int` | monotonic time in nanoseconds |
| `time.wall_nanos()` | `int` | nanoseconds since 1970 (the Unix epoch) |
| `time.sleep_nanos(n)` | (nothing) | sleep at least `n` nanoseconds |
| `time.monotonic_millis()` | `int` | monotonic time in milliseconds |
| `time.wall_millis()` | `int` | milliseconds since 1970 |
| `time.sleep_millis(n)` | (nothing) | sleep at least `n` milliseconds |

Only differences of the monotonic clock are meaningful; a single reading is just a
count from an arbitrary start. `wall_nanos` can jump, so do not use it to measure
durations. Sleeping is a floor: you get at least the time you asked for, and the
sleep retries itself if a signal interrupts it.

```beans
import std.io
import std.time

fn main() {
    let start: int = time.monotonic_nanos()
    time.sleep_millis(10)
    let elapsed: int = time.monotonic_nanos() - start
    io.println("waited {elapsed} ns")
}
```

## std.random

```beans
import std.random
```

`std.random` gives you cryptographically secure random data from the operating
system only. There is no pseudo-random fallback. The source is `arc4random_buf`
on macOS and `getrandom` on Linux.

| Function | Returns | What it does |
| --- | --- | --- |
| `random.bytes(n)` | `Result<Bytes>` | `n` random bytes |
| `random.u64()` | `Result<int>` | a random 64-bit value |
| `random.below(limit)` | `Result<int>` | a uniform value in `[0, limit)` |

`below` is uniform by rejection sampling, not by taking a remainder, so it has no
modulo bias. Bad input — a negative count, or a non-positive bound — comes back as
an error with kind `invalid`.

```beans
import std.io
import std.random

fn main() {
    let roll: int = random.below(6).expect("random") + 1
    io.println("you rolled {roll}")
}
```

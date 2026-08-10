---
title: std.time and std.random
description: Clocks and sleeping, plus secure random bytes and numbers from the OS.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 9 package functions.
<!-- coverage:summary:end -->

These two native modules cover time and randomness. Both are built into the
compiler and runtime, so their functions are typed in the checker with positional
parameters that carry no names.

## std.time

```beans
import std.time
```

There are two clocks. The **monotonic** clock only ever moves forward; use it to
measure how long something took. The **wall** clock is the real calendar time; it
can jump backward or forward when the system clock is adjusted.

```beans
monotonic_nanos() -> int
monotonic_millis() -> int
wall_nanos() -> int
wall_millis() -> int
sleep_nanos(int)
sleep_millis(int)
```

- `monotonic_nanos` and `monotonic_millis` read the monotonic clock. Only
  differences are meaningful; a single reading is just a count from an arbitrary
  start.
- `wall_nanos` returns nanoseconds since 1970 (the Unix epoch), and `wall_millis`
  returns milliseconds since 1970. The wall clock can jump, so do not use it to
  measure durations.
- `sleep_nanos` and `sleep_millis` sleep for at least the time you ask for, and
  the sleep retries itself if a signal interrupts it.

<!-- beans:compile -->
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

```beans
bytes(int) -> Result<Bytes>
u64() -> Result<int>
below(int) -> Result<int>
```

- `bytes(n)` returns `n` random bytes.
- `u64()` returns a random 64-bit value.
- `below(limit)` returns a uniform value in `[0, limit)`. It is uniform by
  rejection sampling, not by taking a remainder, so it has no modulo bias.

Bad input (a negative count, or a non-positive bound) comes back as an error with
kind `invalid`.

<!-- beans:compile -->
```beans
import std.io
import std.random

fn main() {
    let roll: int = random.below(6).expect("random") + 1
    io.println("you rolled {roll}")
}
```

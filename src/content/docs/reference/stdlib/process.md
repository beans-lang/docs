---
title: std.process
description: Run other programs directly, with no shell, capture output, feed input, and control a running child.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 4 types · 1 constructor · 28 instance methods · 7 public fields.
<!-- coverage:summary:end -->

`std.process` runs other programs. There is no shell: the program name and each
argument reach `execvp` untouched, so a filename with a space, a quote, or a
semicolon is just a filename. There is nothing to escape and no shell injection
to worry about. Read the source at
[`stdlib/std/process/process.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/process/process.b).

```beans
import std.process
```

A command that names a program with a NUL byte in it, or any argument,
environment entry, or working directory containing one, is refused before it runs
with an error of kind `invalid`.

## class Output

What a program that ran to completion left behind.

```beans
pub class Output

pub status: int
pub out: Bytes
pub err: Bytes

pub fn succeeded() -> bool
pub fn terminated_by_signal() -> bool
pub fn stdout_text() -> string
pub fn stderr_text() -> string
```

- `status` is the exit code, or the negative of the signal number when a signal
  killed the program.
- `out` and `err` are the raw captured bytes; output is not always text.
- `succeeded()` is true only for exit code 0. Anything else, including a signal,
  is a failure.
- `terminated_by_signal()` is true when `status` is negative.
- `stdout_text()` and `stderr_text()` decode the bytes as a string, stopping at
  an embedded NUL like any other Beans string.

## class Command

Build a command with chained calls, then run it. Each builder method returns the
command, so you can chain, and the same command can be described once and run
more than once.

```beans
new Command(program: string)
```

Builder methods:

```beans
pub fn arg(value: string) -> Command
pub fn cwd(path: string) -> Command
pub fn env(name: string, value: string) -> Command
pub fn stdin_bytes(data: Bytes) -> Command
pub fn stdin_text(data: string) -> Command
pub fn capture_limit(bytes: int) -> Command
```

- `arg` adds one argument. It is never parsed, split, or passed through a shell.
- `cwd` runs the child in that directory instead of the current one.
- `env` sets one environment variable. The first call switches the child from
  inheriting this process's environment to a fresh one holding only what you set,
  so once you name any variable you start from empty and add only what you name.
- `stdin_bytes` / `stdin_text` set what to write to the child's stdin. Its stdin
  is closed once those bytes are written, so a program that reads to EOF finishes.
- `capture_limit` caps how much of each stream is kept. The default is 8 MiB
  (8388608 bytes), so a program that prints forever cannot exhaust memory.

Run it:

```beans
pub fn run() -> Result<Output>
pub fn start() -> Result<Child>
```

- `run()` does the whole job in one call: spawn, feed stdin, drain both output
  streams, wait, and reap. Draining both at once is what makes the classic
  deadlock impossible, where a parent reading stdout to EOF hangs while the child
  blocks writing stderr.
- `start()` spawns and returns straight away, handing back a live [`Child`](#unique-class-child)
  to watch, talk to, and stop. `stdin_bytes`, `stdin_text`, and `capture_limit`
  do not apply to `start()`, because its streams stay open for you to use;
  everything else does.

For `run()`, note the split. A program that **could not start** (not found, not
executable, a bad working directory) is an `err`. A program that **ran and then
failed** is `ok` with a non-zero `status`. So check `status` even on `ok`.

<!-- beans:compile -->
```beans
import std.io
import std.process

fn main() {
    let out: process.Output = new process.Command("echo").arg("hello").run().expect("run")
    io.print(out.stdout_text())              // hello
    io.println("exit {out.status}")
}
```

## class Stream

One of a child's three pipes: stdin, stdout, or stderr.

```beans
pub class Stream

pub name: string

pub fn write(data: Bytes) -> Result<int>
pub fn write_all(data: Bytes) -> Result<int>
pub fn write_text(text: string) -> Result<int>
pub fn read(max: int) -> Result<Bytes>
pub fn read_to_end(limit: int) -> Result<Bytes>
pub fn close() -> Result<bool>
pub fn is_open() -> bool
pub fn poll_handle() -> int
```

- `name` says which stream this is.
- `write` writes some of `data` and reports how much went; short writes are
  normal. `write_all` loops over short writes until everything is sent, and fails
  with kind `reset` if the stream accepts nothing. `write_text` writes a string.
- `read` reads up to `max` bytes; an empty result means the other end closed, so
  for a child's stdout it has stopped writing. `read_to_end` reads until the
  writer closes, up to `limit` bytes.
- `close` closes this stream. For a child's stdin this is how a program that
  reads to EOF is told to finish. A read, write, or close on an already-closed
  stream is an error with kind `closed`.
- `is_open` is true while the stream is open. `poll_handle` returns the raw
  descriptor, borrowed, for registering with a poller.

## unique class Child

A running child process. It is move-only and cleans up on drop.

```beans
pub unique class Child

pub stdin: Stream
pub stdout: Stream
pub stderr: Stream

pub fn process_id() -> int
pub fn is_finished() -> Result<bool>
pub fn wait() -> Result<int>
pub fn wait_timeout(ms: int) -> Result<Option<int>>
pub fn terminate() -> Result<bool>
pub fn kill() -> Result<bool>
pub fn send_signal(number: int) -> Result<bool>
pub fn stop(grace_ms: int) -> Result<int>
```

- `stdin`, `stdout`, and `stderr` are the child's three pipes.
- `process_id()` is the OS process id, for logging.
- `is_finished()` is true once the child has exited, and reaps it when it has, so
  it is safe to call in a loop without leaving a zombie.
- `wait()` waits for exit and returns the status: the exit code, or the negative
  signal number if a signal ended it.
- `wait_timeout(ms)` waits at most `ms` milliseconds; `none` means it is still
  running, which is not an error. A negative `ms` is kind `invalid`.
- `terminate()` sends SIGTERM, `kill()` sends SIGKILL, and `send_signal(number)`
  sends any signal by number.
- `stop(grace_ms)` sends SIGTERM, waits up to `grace_ms`, then sends SIGKILL if
  the child is still there, and returns its status. This is the shape most callers
  want.
- Calling `wait`, `wait_timeout`, `terminate`, `kill`, `send_signal`, or `stop`
  after the child has been waited for or has finished is an error with kind
  `closed`.

If you drop a `Child` without waiting, it is stopped for you: SIGTERM, a 200 ms
grace period, then SIGKILL, and it is reaped so it does not linger as a zombie.
Call `wait()` when you want it to finish on its own terms.

<!-- beans:compile -->
```beans
import std.io
import std.process

fn main() {
    let child: process.Child = new process.Command("cat").start().expect("start")
    child.stdin.write_text("hi\n").expect("write")
    child.stdin.close().expect("close")
    let text: Bytes = child.stdout.read_to_end(4096).expect("read")
    io.print(text.to_string())               // hi
    child.wait().expect("wait")
}
```

## See also

- [std.signal](/reference/stdlib/signal/), receive signals in your own program.
- [Concurrency guide](/guide/concurrency/).

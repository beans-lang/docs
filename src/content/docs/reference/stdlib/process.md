---
title: std.process
description: Run other programs directly, with no shell — capture output, feed input, and control a running child.
---

`std.process` runs other programs. There is no shell: the program name and each
argument are passed straight through, so there is no quoting to get wrong and no
shell injection to worry about. Read the source at
[`stdlib/std/process/process.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/process/process.b).

```beans
import std.process
```

## class Output

The result of a program that ran to completion.

- `pub status: int` — the exit code, or a negative signal number if it was killed
  by a signal.
- `pub out: Bytes` — captured stdout.
- `pub err: Bytes` — captured stderr.

| Method | Returns | What it does |
| --- | --- | --- |
| `succeeded()` | `bool` | true if the exit code was 0 |
| `terminated_by_signal()` | `bool` | true if a signal killed it |
| `stdout_text()` | `string` | stdout as text |
| `stderr_text()` | `string` | stderr as text |

## class Command

You build up a command with chained calls, then run it. Each builder method
returns the command, so you can chain.

Start with:

```beans
new process.Command(program: string)
```

Builder methods:

| Method | What it does |
| --- | --- |
| `arg(value) -> Command` | add one argument |
| `cwd(path) -> Command` | run in this working directory |
| `env(name, value) -> Command` | set an environment variable |
| `stdin_bytes(data) -> Command` | feed these bytes to the child's stdin |
| `stdin_text(data) -> Command` | feed this text to the child's stdin |
| `capture_limit(bytes) -> Command` | cap captured output (default 8 MiB) |

The first `env` call switches the child to a fresh environment, so if you set any
variable, you start from empty and add only what you name.

Run it:

| Method | Returns | What it does |
| --- | --- | --- |
| `run()` | `Result<Output>` | spawn, feed stdin, drain both streams, wait, reap |
| `start()` | `Result<Child>` | spawn and hand back a live child to control |

For `run`, note the split: a program that **could not start** is an error. A
program that **ran and then failed** is `ok` with a non-zero `status`. So check
`status` even on `ok`.

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

One of a child's pipes (stdin, stdout, or stderr).

- `pub name: string` — which stream this is.

| Method | Returns | What it does |
| --- | --- | --- |
| `write(data)` | `Result<int>` | write some bytes |
| `write_all(data)` | `Result<int>` | write all the bytes |
| `write_text(text)` | `Result<int>` | write a string |
| `read(max)` | `Result<Bytes>` | read up to `max` bytes |
| `read_to_end(limit)` | `Result<Bytes>` | read until end, up to `limit` bytes |
| `close()` | `Result<bool>` | close this stream |
| `is_open()` | `bool` | whether it is still open |
| `poll_handle()` | `int` | the descriptor |

## unique class Child

A running child process. It is move-only and cleans up on drop.

- `pub stdin: Stream`, `pub stdout: Stream`, `pub stderr: Stream` — its pipes.

| Method | Returns | What it does |
| --- | --- | --- |
| `process_id()` | `int` | the OS process id |
| `is_finished()` | `Result<bool>` | whether it has exited |
| `wait()` | `Result<int>` | wait for exit, return the status |
| `wait_timeout(ms)` | `Result<Option<int>>` | wait up to `ms`; `none` means still running |
| `terminate()` | `Result<bool>` | send SIGTERM |
| `kill()` | `Result<bool>` | send SIGKILL |
| `send_signal(number)` | `Result<bool>` | send any signal by number |
| `stop(grace_ms)` | `Result<int>` | SIGTERM, wait up to `grace_ms`, then SIGKILL |

If you drop a `Child` without waiting, it is stopped for you: SIGTERM, a 200 ms
grace period, then SIGKILL, and it is reaped so it does not linger as a zombie.

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

- [std.signal](/reference/stdlib/signal/) — receive signals in your own program.
- [Concurrency guide](/guide/concurrency/).

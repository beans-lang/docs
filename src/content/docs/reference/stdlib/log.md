---
title: std.log
description: Fast asynchronous structured logging with console, file, rotating, NDJSON and pull-based export sinks.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 15 package functions · 9 types · 1 constructor · 12 static methods · 21 instance methods · 14 public fields · 13 enum variants.
<!-- coverage:summary:end -->

`std.log` is the standard asynchronous logger. It is available from Beans
`0.1.30` on hosted targets and uses the pinned Quill 12.1.0 C++17 engine behind
a Beans API. A program that does not import `std.log` links no logging bridge or
Quill code.

```beans
import std.log
```

## Quick start

The module-level logger is created on first use. It writes `info` and higher to
stderr with automatic terminal colours.

<!-- beans:compile -->
```beans
import std.log

fn run() -> Result<bool> {
    log.info("service ready")
    log.write_fields(
        log.Level.info, "request complete",
        [new log.Field("request_id", "42")])?
    log.flush()?
    return ok(true)
}

fn main() {
    match run() {
        ok(_) => {}
        err(problem) => { panic(problem.msg) }
    }
}
```

`trace`, `debug`, `info`, `warn`, `error` and `fatal` return `true` when the
record entered the producer queue. They return `false` when the level is
disabled or that queue is full. Ordinary writes do not throw an I/O error into
application control flow.

## Levels and the default logger

```beans
pub enum Level {
    trace
    debug
    info
    warn
    error
    fatal
    off
}

pub fn set_default(logger: Logger)
pub fn enabled(level: Level) -> bool
pub fn trace(message: string) -> bool
pub fn debug(message: string) -> bool
pub fn info(message: string) -> bool
pub fn warn(message: string) -> bool
pub fn error(message: string) -> bool
pub fn fatal(message: string) -> bool
pub fn write_fields(level: Level, message: string, fields: List<Field>) -> Result<bool>
pub fn write_at_fields(level: Level, message: string, fields: List<Field>, file: string, function: string, line: int, column: int) -> Result<bool>
pub fn flush() -> Result<bool>
pub fn dropped() -> int
pub fn backend_error_count() -> int
pub fn backend_error() -> string
pub fn shutdown() -> Result<bool>
```

`Level.off` is a filter value; it is not a record severity. `set_default`
replaces the module-level destination with a named `Logger`.

For the six short level methods, the compiler checks the level before it
evaluates the message in interpreted and native programs:

```beans
logger.debug(expensive_message()) // expensive_message is skipped when disabled
```

Calls whose level is only known at run time follow normal argument evaluation.
Use `enabled` before expensive work in that case. Field lists are also evaluated
before `write_fields` or `log_fields` is called.

```beans
if logger.enabled(level) {
    logger.log(level, expensive_message())
}
```

## Sinks

A named logger writes each accepted record to every sink supplied at creation.

```beans
pub enum Colour {
    automatic
    always
    never
}

pub class Sink
pub static fn console(stderr: bool = true) -> Result<Sink>
pub static fn console_with(level: Level, colour: Colour, stderr: bool = true) -> Result<Sink>
pub static fn file(path: string, append: bool = true, fsync: bool = false) -> Result<Sink>
pub static fn file_with(path: string, level: Level, append: bool = true, fsync: bool = false) -> Result<Sink>
pub static fn rotating_file(path: string, max_bytes: int, max_backups: int = 5, append: bool = true) -> Result<Sink>
pub static fn rotating_file_with(path: string, max_bytes: int, level: Level, max_backups: int = 5, append: bool = true) -> Result<Sink>
pub static fn json_file(path: string, append: bool = true, fsync: bool = false) -> Result<Sink>
pub static fn json_file_with(path: string, level: Level, append: bool = true, fsync: bool = false) -> Result<Sink>
```

| Sink | Behaviour |
| --- | --- |
| `console` | stderr by default; automatic, forced or disabled colours |
| `file` | plain text; append by default; optional fsync |
| `rotating_file` | rotate by size and retain `max_backups`; `max_bytes` is at least 512 |
| `json_file` | one escaped JSON object per line; string fields included |
| `ExportSink` | bounded queue pulled as safe Beans `Record` values |

The `_with` forms add a per-sink minimum level. File, rotating and NDJSON sinks
need the full runtime profile. Console and export sinks also work in the minimal
hosted profile. Freestanding targets have no threads and reject `std.log`.

## Named loggers

```beans
pub class Logger
pub static fn create(name: string, sinks: List<Sink>, pattern: string = "") -> Result<Logger>
pub static fn create_with_level(name: string, sinks: List<Sink>, level: Level, pattern: string = "") -> Result<Logger>
pub fn enabled(level: Level) -> bool
pub fn set_level(level: Level) -> Result<bool>
pub fn log_at(level: Level, message: string, file: string, function: string, line: int, column: int) -> bool
pub fn log(level: Level, message: string) -> bool
pub fn log_fields(level: Level, message: string, fields: List<Field>) -> Result<bool>
pub fn log_at_fields(level: Level, message: string, fields: List<Field>, file: string, function: string, line: int, column: int) -> Result<bool>
pub fn trace(message: string) -> bool
pub fn debug(message: string) -> bool
pub fn info(message: string) -> bool
pub fn warn(message: string) -> bool
pub fn error(message: string) -> bool
pub fn fatal(message: string) -> bool
pub fn flush() -> Result<bool>
```

`create` accepts all levels by default. `create_with_level` sets the logger's
minimum level, while each sink may have a stricter filter. The optional pattern
applies to that logger's text output.

The six short methods carry the Beans source file, function, line and column.
Logging wrappers can use `log_at` or `log_at_fields` to supply their caller's
location explicitly.

```beans
let console: log.Sink = log.Sink.console()?
let events: log.Sink = log.Sink.json_file("events.ndjson")?
let logger: log.Logger = log.Logger.create_with_level(
    "api", [console, events], log.Level.debug)?

logger.info("listening")
logger.log_fields(
    log.Level.info, "request complete",
    [new log.Field("status", "200")])?
logger.flush()?
```

## Fields and exported records

Fields are string key/value pairs. Keys must be non-empty and unique within a
record; a record may contain at most 1,024 fields.

```beans
pub class Field {
    pub key: string
    pub value: string
}
new Field(key: string, value: string)

pub class Record {
    pub timestamp_nanos: int
    pub level: Level
    pub logger: string
    pub message: string
    pub file: string
    pub function: string
    pub line: int
    pub column: int
    pub thread_id: string
    pub thread_name: string
    pub process_id: string
    pub fields: List<Field>
}
```

`timestamp_nanos` uses the system clock and is captured on the producer thread.
The thread and process fields are strings so exported records stay portable.

## Export sinks

Export is pull-based. Beans code never runs on Quill's backend thread. Pull a
batch when sending records to another system; one batch takes one queue lock and
one bridge call.

```beans
pub enum Overflow {
    drop_newest
    drop_oldest
    block
}

pub class ExportSink
pub static fn open(capacity: int = 1024) -> Result<ExportSink>
pub static fn open_with(capacity: int, overflow: Overflow, level: Level) -> Result<ExportSink>
pub fn sink() -> Sink
pub fn reader() -> ExportReader
pub fn next(timeout_millis: int = 0) -> Result<Option<Record>>
pub fn next_batch(max_records: int = 64, timeout_millis: int = 0) -> Result<List<Record>>
pub fn dropped() -> int

pub unique class ExportReader implements Send
pub fn next(timeout_millis: int = 0) -> Result<Option<Record>>
pub fn next_batch(max_records: int = 64, timeout_millis: int = 0) -> Result<List<Record>>
pub fn dropped() -> int
```

`open` uses `drop_oldest`, accepts every record level and defaults to 1,024
records. A timeout of zero polls without waiting. Batch size must be from 1 to
4,096.

`reader` returns a move-only, `Send` consumer handle. Move it into a dedicated
worker thread when export should run continuously. Do not also consume through
the original `ExportSink` unless you intentionally want multiple consumers to
split the queue.

Overflow policies:

- `drop_newest` keeps queued records and rejects the arriving record.
- `drop_oldest` removes the oldest record and keeps the arriving record.
- `block` waits for consumer space. It can stall the single logging backend and
  should be used only when that backpressure is required.

`ExportSink.dropped()` and `ExportReader.dropped()` count export-queue loss.
This is separate from producer loss reported by the module-level `dropped()`.

## Producer queues and overload

Every logging producer thread owns a fixed 256 KiB dropping queue. This keeps a
burst from growing process memory without a bound. When producers outrun the
backend, a write returns `false` and `dropped()` increases.

The two counters answer different questions:

- `log.dropped()` — the record never reached the backend.
- `exported.dropped()` — the backend reached the export sink, but its bounded
  queue overflowed.

Monitor both when an exporter is part of the logging path. Flush by batch or at
shutdown; flushing every record removes most of the benefit of asynchronous
logging.

## Errors and shutdown

Sink and logger creation, structured writes, export reads, flush and shutdown
return `Result`. Backend file or console errors happen asynchronously; inspect
`backend_error_count()` and the latest `backend_error()` string.

`flush()` waits for all loggers. `Logger.flush()` waits for one logger.
`shutdown()` closes export waits, drains and stops the backend. Logging cannot
restart in that process after explicit shutdown. Normal process exit also stops
the backend safely.

## Current limits

- Structured fields are strings; typed numeric and boolean fields are not yet
  part of the API.
- Rotation is size-based, not time-based.
- Producer queue capacity and policy are fixed; only export queues are
  configurable.
- Runtime-level and field calls evaluate arguments before checking the level.
- There is no synchronous logger, scoped context, backtrace API or call-site
  rate-limiting API yet.

The vendored source, checksum, license and upstream portability patch are
recorded in
[`runtime/log/vendor/VENDOR.md`](https://github.com/beans-lang/beans/blob/main/runtime/log/vendor/VENDOR.md).
The runnable source example is
[`examples/logging.b`](https://github.com/beans-lang/beans/blob/main/examples/logging.b).


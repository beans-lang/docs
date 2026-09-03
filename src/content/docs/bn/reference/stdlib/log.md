---
title: std.log
description: Console, file, rotating, NDJSON আর pull-based export sink-সহ দ্রুত asynchronous structured logging।
---

`std.log` হলো Beans-এর standard asynchronous logger। এটা
hosted target-এ পাওয়া যায়। ভেতরে pinned Quill 12.1.0 C++17 engine চলে, কিন্তু
public API পুরোটা Beans। কোনো program `std.log` import না করলে logging bridge বা
Quill code link হয় না।

```beans
import std.log
```

## দ্রুত শুরু

Module-level logger প্রথম call-এ তৈরি হয়। এটা default-এ stderr-এ `info` আর তার
চেয়ে বেশি level লেখে, terminal হলে colour নিজে ঠিক করে।

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
```

`trace`, `debug`, `info`, `warn`, `error` আর `fatal` record producer queue-তে
ঢুকলে `true` দেয়। Level বন্ধ থাকলে বা queue ভরা থাকলে `false` দেয়।

## Level আর default logger

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

`Level.off` শুধু filter-এর জন্য। `set_default` module-level destination-কে একটা
named `Logger` দিয়ে বদলে দেয়।

ছয়টা short level method-এর ক্ষেত্রে interpreter আর native build দুটোতেই
compiler message বানানোর আগে level check করে:

```beans
logger.debug(expensive_message()) // disabled হলে function-টা call হবে না
```

Run time-এ level ঠিক হলে normal argument evaluation হয়। তখন দামি কাজের আগে
`enabled` check করুন। Field list-ও call-এর আগে তৈরি হয়।

## Sink

একটা named logger একই record তার সব sink-এ পাঠায়।

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

| Sink | কী করে |
| --- | --- |
| `console` | default-এ stderr; automatic, always বা never colour |
| `file` | plain text; default-এ append; চাইলে fsync |
| `rotating_file` | size পার হলে rotate করে, `max_backups`-টা পুরোনো file রাখে |
| `json_file` | প্রতি line-এ একটা escaped JSON object |
| `ExportSink` | bounded queue থেকে safe Beans `Record` pull করা যায় |

`_with` form-এ sink-এর minimum level দেওয়া যায়। File, rotating আর NDJSON sink
full runtime profile চায়। Console আর export sink minimal hosted profile-এও চলে।
Freestanding target-এ thread নেই, তাই সেখানে `std.log` reject হয়।

## Named logger

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

`create` default-এ সব level নেয়। `create_with_level` logger-এর minimum level
ঠিক করে; প্রতিটা sink তার চেয়ে কড়া filter রাখতে পারে। Short method-গুলো Beans
source file, function, line আর column record-এ দেয়। Wrapper লিখলে `log_at` বা
`log_at_fields` দিয়ে caller-এর location নিজে পাঠানো যায়।

## Field আর Record

Field হলো string key/value। Key খালি বা duplicate হতে পারে না; এক record-এ
সর্বোচ্চ 1,024টা field।

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

## Export sink

Export pull-based। Beans code কখনো Quill backend thread-এ চলে না। অন্য system-এ
পাঠাতে batch pull করুন; এক batch-এ একবার queue lock আর একবার bridge call লাগে।

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

`open` default-এ 1,024 record, `drop_oldest`, আর সব level নেয়। Timeout zero হলে
অপেক্ষা না করে poll করে। Batch size 1 থেকে 4,096। `reader` move-only আর `Send`,
তাই dedicated worker thread-এ move করা যায়।

- `drop_newest` নতুন record বাদ দেয়।
- `drop_oldest` সবচেয়ে পুরোনো record বাদ দিয়ে নতুনটা রাখে।
- `block` consumer-এর জায়গার জন্য অপেক্ষা করে। এতে একমাত্র logging backend
  আটকে যেতে পারে, তাই backpressure সত্যি দরকার হলেই ব্যবহার করুন।

`ExportSink.dropped()` export queue-এর loss গোনে। Module-এর `dropped()` producer
queue-এর loss গোনে। দুটো আলাদা।

## Overload, error আর shutdown

প্রতি producer thread-এর fixed 256 KiB dropping queue আছে। এতে burst হলেও memory
সীমাহীন বাড়ে না। Backend পিছিয়ে গেলে write `false` দেয় আর `log.dropped()` বাড়ে।
প্রতি record flush করবেন না; batch শেষে বা shutdown-এ flush করুন।

Sink/logger তৈরি, structured write, export read, flush আর shutdown `Result` দেয়।
Asynchronous file বা console error দেখতে `backend_error_count()` আর
`backend_error()` ব্যবহার করুন।

`flush()` সব logger-এর জন্য অপেক্ষা করে; `Logger.flush()` একটার জন্য।
`shutdown()` export wait বন্ধ করে, pending record drain করে backend থামায়। Explicit
shutdown-এর পরে একই process-এ logging আবার start করা যায় না।

## এখনকার সীমা

- Structured field এখন শুধু string; typed number বা bool field নেই।
- Rotation size দিয়ে হয়, time দিয়ে না।
- Producer queue capacity/policy fixed; শুধু export queue configure করা যায়।
- Runtime-level আর field call argument বানানোর পরে level check করে।
- Synchronous logger, scoped context, backtrace আর call-site rate limit এখনো নেই।

Vendored source, checksum, license আর upstream patch আছে
[`runtime/log/vendor/VENDOR.md`](https://github.com/beans-lang/beans/blob/main/runtime/log/vendor/VENDOR.md)-তে।
চলানো যায় এমন example হলো
[`examples/logging.b`](https://github.com/beans-lang/beans/blob/main/examples/logging.b)।


---
title: std.process
description: অন্য program সরাসরি চালানো — কোনো shell ছাড়া, output ধরা, input খাওয়ানো, আর চলন্ত child নিয়ন্ত্রণ করা।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 4টা type · 1টা constructor · 28টা instance method · 7টা public field।
<!-- coverage:summary:end -->

`std.process` অন্য program চালায়। এখানে কোনো shell নেই: program-এর নাম আর প্রতিটা argument হুবহু `execvp`-এ পৌঁছায়, তাই space, quote বা semicolon-ওয়ালা একটা filename নেহাত একটা filename-ই। কিছু escape করার নেই, shell injection নিয়েও ভাবার নেই। source দেখুন এখানে:
[`stdlib/std/process/process.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/process/process.b)।

```beans
import std.process
```

program-এর নামে যদি একটা NUL বাইট থাকে, কিংবা কোনো argument, environment entry বা working directory-তে একটা NUL থাকে, তাহলে সেটা চলার আগেই `invalid` kind-এর error দিয়ে আটকে দেওয়া হয়।

## class Output

একটা program পুরোপুরি চলে শেষ হলে যা রেখে গেল।

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

- `status` হলো exit code, আর signal মেরে ফেললে সেই signal number-এর negative।
- `out` আর `err` হলো ধরে রাখা raw বাইট; output সবসময় text না-ও হতে পারে।
- `succeeded()` শুধু exit code 0-এর জন্য true। বাকি সব, signal সহ, failure।
- `terminated_by_signal()` true হয় যখন `status` negative।
- `stdout_text()` আর `stderr_text()` বাইটগুলোকে string হিসেবে decode করে, আর বাকি সব Beans string-এর মতো একটা এম্বেড করা NUL-এ গিয়ে থামে।

## class Command

chain করে করে একটা command গড়া হয়, তারপর চালানো হয়। প্রতিটা builder method command-টাই ফেরত দেয়, তাই chain করা যায়, আর একই command একবার লিখে একাধিকবার চালানো যায়।

```beans
new Command(program: string)
```

Builder method-গুলো:

```beans
pub fn arg(value: string) -> Command
pub fn cwd(path: string) -> Command
pub fn env(name: string, value: string) -> Command
pub fn stdin_bytes(data: Bytes) -> Command
pub fn stdin_text(data: string) -> Command
pub fn capture_limit(bytes: int) -> Command
```

- `arg` একটা argument যোগ করে। এটা কখনো parse হয় না, ভাগ হয় না, shell দিয়েও যায় না।
- `cwd` child-কে current directory-র বদলে সেই directory-তে চালায়।
- `env` একটা environment variable সেট করে। প্রথম call-টাই child-কে এই process-এর environment inherit করা থেকে সরিয়ে একটা নতুন খালি environment-এ নিয়ে যায়, যেখানে শুধু যা সেট করা হয় তা-ই থাকে। অর্থাৎ একবার কোনো variable-এর নাম বললেই খালি থেকে শুরু হয়, আর শুধু যেগুলোর নাম বলা হয় সেগুলোই যোগ হয়।
- `stdin_bytes` / `stdin_text` ঠিক করে child-এর stdin-এ কী লেখা হবে। সেই বাইটগুলো লেখা হয়ে গেলেই তার stdin বন্ধ হয়ে যায়, তাই যে program EOF পর্যন্ত পড়ে সেটা শেষ হতে পারে।
- `capture_limit` প্রতিটা stream-এর কতটা রাখা হবে তার সীমা বাঁধে। default হলো 8 MiB (8388608 বাইট), তাই যে program অনন্তকাল ধরে print করে সেটা memory শেষ করে দিতে পারে না।

চালানো:

```beans
pub fn run() -> Result<Output>
pub fn start() -> Result<Child>
```

- `run()` পুরো কাজটা এক call-এই করে: spawn করা, stdin খাওয়ানো, দুটো output stream-ই টেনে নেওয়া, wait করা, আর reap করা। দুটো stream একসাথে টেনে নেওয়াটাই সেই ক্লাসিক deadlock-কে অসম্ভব করে দেয় — যেখানে parent stdout-কে EOF পর্যন্ত পড়তে গিয়ে ঝুলে থাকে, আর এদিকে child stderr লিখতে গিয়ে আটকে থাকে।
- `start()` spawn করে সাথে সাথেই ফিরে আসে, হাতে একটা জ্যান্ত [`Child`](#unique-class-child) তুলে দেয় — যেটাকে দেখা, তার সাথে কথা বলা, আর থামানো যায়। `stdin_bytes`, `stdin_text`, আর `capture_limit` `start()`-এ খাটে না, কারণ এর stream-গুলো ব্যবহারের জন্য খোলা থাকে; বাকি সব খাটে।

`run()`-এর একটা ভাগাভাগি খেয়াল রাখতে হবে। যে program **শুরুই হতে পারল না** (পাওয়া যায়নি, executable না, working directory খারাপ) সেটা একটা `err`। আর যে program **চলল, তারপর fail করল** সেটা `ok`, তবে non-zero `status` নিয়ে। তাই `ok` হলেও `status` চেক করতে হবে।

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

একটা child-এর তিনটা pipe-এর একটা: stdin, stdout, বা stderr।

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

- `name` বলে দেয় এটা কোন stream।
- `write` `data`-র কিছুটা লেখে আর কতটা গেল জানায়; কম লেখা স্বাভাবিক। `write_all` কম-কম-লেখাগুলোর উপর loop করে সব পাঠানো শেষ করে, আর stream কিছুই না নিলে `reset` kind-এ fail করে। `write_text` একটা string লেখে।
- `read` বড়জোর `max` বাইট পড়ে; খালি result বলতে বোঝায় অন্য প্রান্ত বন্ধ করে দিয়েছে, তাই child-এর stdout-এর বেলায় ওটা আর লিখছে না। `read_to_end` writer বন্ধ না করা পর্যন্ত পড়ে, বড়জোর `limit` বাইট। এটা chunk-এর একটা list জোড়া না দিয়ে একটাই result buffer বড় করে।
- `close` এই stream বন্ধ করে। child-এর stdin-এর বেলায় এটাই সেই উপায় — যে program EOF পর্যন্ত পড়ে তাকে শেষ হতে বলা। ইতিমধ্যে বন্ধ হওয়া stream-এ read, write বা close করলে `closed` kind-এর error।
- `is_open` stream খোলা থাকা পর্যন্ত true। `poll_handle` raw descriptor-টা borrow করে ফেরত দেয়, একটা poller-এ register করার জন্য।

## unique class Child

একটা চলন্ত child process। এটা move-only, আর drop হওয়ার সময় নিজেই পরিষ্কার হয়ে যায়।

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

- `stdin`, `stdout`, আর `stderr` হলো child-এর তিনটা pipe।
- `process_id()` হলো OS process id, logging-এর জন্য।
- `is_finished()` child বেরিয়ে গেলে true হয়, আর তখনই তাকে reap করে ফেলে, তাই zombie না রেখে একে loop-এ ডাকা নিরাপদ।
- `wait()` exit-এর জন্য অপেক্ষা করে status ফেরত দেয়: exit code, আর signal শেষ করলে সেই signal number-এর negative।
- `wait_timeout(ms)` বড়জোর `ms` মিলিসেকেন্ড অপেক্ষা করে; `none` বলতে বোঝায় এখনো চলছে, যেটা error না। negative `ms` হলো `invalid` kind।
- `terminate()` SIGTERM পাঠায়, `kill()` SIGKILL পাঠায়, আর `send_signal(number)` number দিয়ে যেকোনো signal পাঠায়।
- `stop(grace_ms)` SIGTERM পাঠায়, বড়জোর `grace_ms` অপেক্ষা করে, child তখনো থাকলে SIGKILL পাঠায়, আর তার status ফেরত দেয়। বেশিরভাগ caller-এর ঠিক এই গড়নটাই দরকার হয়।
- child-কে একবার wait করা বা শেষ হয়ে যাওয়ার পর `wait`, `wait_timeout`, `terminate`, `kill`, `send_signal`, বা `stop` ডাকলে `closed` kind-এর error।

একটা `Child`-কে wait না করেই drop করলে সেটা নিজে থেকে থামানো হয়: SIGTERM, 200 ms grace period, তারপর SIGKILL, আর reap-ও করা হয় যাতে ওটা zombie হয়ে না থাকে। child-কে নিজের মতো করে শেষ হতে দিতে চাইলে `wait()` ডাকতে হবে।

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

## আরও দেখুন

- [std.signal](/bn/reference/stdlib/signal/), নিজের program-এ signal receive করা।
- [Concurrency guide](/bn/guide/concurrency/)।

---
title: Running the tests
description: make test-এর target গুলো, কোনটা কী check করে, আর একটা behavior change-এর change loop।
---

Beans-এর test গুলো চলে project-এর Makefile দিয়ে, যখন [source থেকে
build](/bn/project/building/) করা হয়। কোনো `beansc test` নেই, কোনো `make fmt`-ও নেই।

## test target গুলো

| Target | যা চালায় |
| --- | --- |
| `make test` | সব behavioural suite, interpreter/native self-host check, আর compiler fixed point। |
| `make test-core` | পুরো behavioural suite। |
| `make test-quick` | মোটামুটি ৫-মিনিটের diagnostics, parity, determinism আর fuzz smoke gate। |
| `make test-frontend` | parser, checker, package, annotation, LSP, DAP আর source API। |
| `make test-semantics` | interpreter/native language semantics আর MIR ownership। |
| `make test-runtime` | runtime, concurrency, filesystem, process আর networking। |
| `make test-sanitize` | ASan, UBSan, TSan আর macOS leak check। |
| `make test-linux` | পুরো gate-টা একটা Linux container-এর ভেতরে। |
| `make test-fixpoint` | release mode-এর দুই self-build byte-identical হতে হবে। |
| `make test-ffi` | Layout, C ABI, bindgen, callback, আর library output। |
| `make fuzz-oop-smoke` | Generate করা class graph, package visibility, generic struct, হুবহু checker error, interpreter, আর debug native output। |
| `make fuzz-oop` | interpreter, debug, release, আর LTO-র উপর OOP generator। |
| `make fuzz-oop-long` | ১,০০০-case-এর একটা OOP run; size বদলানো যায় `OOP_FUZZ_CASES` দিয়ে। |
| `make fuzz-net` | deterministic failure injection-সহ seeded socket আর poller operation। |
| `make fuzz-net-soak` | wall-clock network fuzz lane। |
| `make fuzz-differential` | independent evaluator, interpreter, debug, release আর LTO দিয়ে generated program check। |
| `make access-score` | systems-access scorecard। |
| `make bench-verify` | output parity-র জন্য check করা ৩৯টা workload। |
| `make bench-full` | claim-eligible benchmark run। |

Network test-এ deterministic syscall failure inject করা যায়:

```bash
BEANS_SOCK_FAILPOINTS=42:10 ./build/beansc run examples/net.b
BEANS_SOCK_FAILPOINTS=42:10:eintr BEANS_SOCK_FAILPOINTS_LOG=1 \
  ./build/beansc run examples/net.b
```

Value হলো `<seed>[:<rate>[:eintr]]`। শেষ form শুধু interrupt inject করে; retry
loop সেটা absorb করবে। log দিয়ে run replay করা যায়।

## change loop

behavior বদলানোর সময় এই order-এ test চালান:

1. যেটা ছোঁয়া হয়েছে তার জন্য **সবচেয়ে ছোট focused test**।
2. `make test`।
3. `make test-sanitize`, ownership, runtime, concurrency, FFI, বা codegen বদলালে।
4. `make test-fixpoint`, frontend, MIR, বা compiler বদলালে।

একটা OOP বা generic-struct change হলে, পুরো gate-এর আগে `make fuzz-oop` চালান।
Generate করা প্রতিটা valid program-এর নিজস্ব একটা independent expected-output
oracle থাকে। Generate করা প্রতিটা invalid program-কে হুবহু expected checker error
দিতে হবে। Fail গুলো জমা থাকে `build/oop-fuzz/failures/`-এর নিচে — সাথে generate
করা সব source, lane output, আর হুবহু ওই seed আর case-এর জন্য একটা `replay.txt`
command।

## এখানে যা নেই

- **কোনো `make fmt` নেই**। Beans-এ কোনো formatter নেই। দেখুন [Exit code আর
  troubleshooting](/bn/tools/exit-codes/)।
- **কোনো `beansc test` subcommand নেই**। এই Makefile target গুলো compiler-এর উপর
  কাজ করার জন্য, project-প্রতি test runner নয়।

চারপাশের workflow-এর জন্য দেখুন [compiler build করা](/bn/project/building/) আর
[Contributing](/bn/project/contributing/)।

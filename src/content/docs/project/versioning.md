---
title: Versioning
description: The single version source, SemVer, the 0.1.x preview line, and what 1.0 requires.
---

Beans has one place that says which version it is, follows SemVer, and is
currently on a preview line leading up to 1.0.

## One source of version truth

All version numbers come from one file:
[`VERSION`](https://github.com/beans-lang/beans/blob/main/VERSION).
The current release is `0.1.52`, with the contract below.
Released contracts are preserved in dated
[`CHANGELOG.md`](https://github.com/beans-lang/beans/blob/main/CHANGELOG.md) entries.

```text
compiler=0.1.52
language=1.0
runtime_abi=22
```

- **compiler**: the compiler version (`0.1.52`).
- **language**: the language version (`1.0`).
- **runtime_abi**: the runtime ABI number (`22`).

`src/version.b` is generated from that file. `test/version.sh` fails when the
generated file differs from `VERSION`.

`beansc --version` prints all three.

## SemVer

Beans follows [Semantic Versioning](https://semver.org/).

- **Before 1.0**, the language, standard library, CLI, module format, and ABI
  may change between minor releases. Pin the compiler and commit `beans.lock`
  for serious projects. See [Compatibility](/project/compatibility/).
- **After 1.0**, a breaking public change needs a new major version, and both
  the current and previous minor lines get fixes.

The **runtime ABI number** changes whenever generated code and the shipped
runtime stop being compatible with each other.

## The 0.1.x preview line

The `0.1.x` line is a **preview on the 1.0 stabilization line**. Pilot work needs
pinned versions and workload-specific checks. It is not yet a production 1.0
release.

Reaching 1.0 requires every release gate in the roadmap to pass:

- the performance gates pass
- a 24-hour fuzz campaign
- a 30-clean-day beta, then a 14-clean-day release candidate
- no open critical or high correctness bugs
- the full 26-target release manifest published

See [Maturity and platforms](/intro/maturity/) for the wider picture, and the
[release process](/project/release/) for how a version is built and published.

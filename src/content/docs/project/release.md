---
title: Release process
description: How Beans releases are built, tested, and published.
---

This page describes how the release workflow builds, tests, and publishes
Beans packages.

## What a release builds

The release workflow builds and install-tests all **26 required host packages**.
Each package is installed and smoke-tested on its target before publication.

## What a release publishes

Alongside the packages, a release publishes:

- **SHA-256 checksums** for every artifact.
- An **SPDX SBOM** (software bill of materials).
- **GitHub attestations**.
- The one-line installers, `beans-install.sh` and `beans-install.ps1`.

## Full and slim packages

- A **full package** bundles Clang, LLD, and llvm-ar, so a native build needs
  nothing else installed.
- A **slim package** does not; a native build then needs Clang on `PATH`.

Which targets get which is covered on [Cross-compiling and
targets](/tools/targets/).

## An archive is not the same as production-tier

A published archive proves the compiler was built and smoke-tested for that
target. It does **not**, by itself, make the target production-tier. Support
tiers are tracked separately in `targets/support.tsv`. See [Maturity and
platforms](/intro/maturity/) for what production-tier means, and
[Versioning](/project/versioning/) for the 1.0 release gates.

See [Compatibility](/project/compatibility/) and [Install Beans](/start/install/)
for related detail.

## Rehearsal before publishing

The [build and release rehearsal](https://github.com/beans-lang/beans/blob/main/CONTRIBUTING.md#independent-build-and-release-rehearsal)
lets another contributor run the compiler, package, install, release, and docs
checks without publishing. They record their environment and any help they
needed. The project still needs another maintainer who has completed the
rehearsal and agreed to take responsibility.

The release owner can use the existing workflow's manual candidate mode with
`publish=false` and `skip_autobahn=false` when a full target rehearsal is
authorized. A candidate build is separate from a published release and from
performance, long fuzz, beta/RC soak, and application acceptance. `VERSION`
describes the checkout; the latest dated changelog entry records the installed
release contract. An unreleased ABI change must not appear as a released
installer or a completed package gate.

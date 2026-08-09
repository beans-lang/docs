---
title: Release process
description: A safe overview of how Beans releases are built, verified, and published.
---

This is an overview of how a Beans release is produced. It describes the shape
of the process; it does not include any secrets.

## What a release builds

The release workflow builds and install-tests all **26 required host packages**.
Each package is built and then smoke-tested by actually installing and running
it, so a published archive proves the compiler was built and worked for that
target.

## What a release publishes

Alongside the packages, a release publishes:

- **SHA-256 checksums** for every artifact.
- An **SPDX SBOM** (software bill of materials).
- **GitHub attestations**.
- The one-line installers, `beans-install.sh` and `beans-install.ps1`.

## Full and slim packages

- A **full package** bundles Clang, LLD, and llvm-ar, so a native build works
  out of the box.
- A **slim package** does not; a native build then needs Clang on `PATH`.

Which targets get which is covered on [Cross-compiling and
targets](/tools/targets/).

## An archive is not the same as production-tier

A published archive proves the compiler was built and smoke-tested for that
target. It does **not**, by itself, make the target production-tier. Support
tiers are tracked separately in `targets/support.tsv`. See [Maturity and
platforms](/intro/maturity/) for what production-tier means, and
[Versioning](/project/versioning/) for the 1.0 release gates.

## See also

- [Versioning](/project/versioning/)
- [Compatibility](/project/compatibility/)
- [Install Beans](/start/install/)

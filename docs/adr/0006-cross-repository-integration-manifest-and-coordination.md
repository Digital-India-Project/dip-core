# ADR-0006: Cross-Repository Integration Manifest & Shared Contract Vectors

**Status:** Accepted  
**Date:** 2026-11-27  
**Scope:** `integration/manifest.json`, `tests/fixtures/contract-vectors.json`, `tests/contract/manifest-and-vectors.test.ts`

## Context

Ten repositories in the Digital India Project ecosystem are developed in parallel by independent engineers/agents. Without a machine-readable contract manifest and automated synchronization checks, exported symbol lists, package versions, and documentation can drift from actual TypeScript code.

## Decision

1. Maintain `integration/manifest.json` as the single machine-readable declaration of `@dip/core` exports, runtime/framework requirements, ownership boundaries, environment variable names, and sibling repository compatibility.
2. Maintain `tests/fixtures/contract-vectors.json` as deterministic synthetic golden vectors shareable with `DIPINDIA`, `dip-api`, `dip-sdk`, and `dip-ui`.
3. Enforce synchronization automatically in `tests/contract/manifest-and-vectors.test.ts`, which fails `npm test` if `integration/manifest.json` diverges from `package.json`, `.env.example`, `CORE_CONTRACT_VERSION`, or the actual runtime exports of `src/core/index.ts`.

## Consequences

- Manifest drift is caught immediately in CI (`npm test`).
- Sibling repositories can verify compatibility against `integration/manifest.json` and `contract-vectors.json` without importing `dip-core` internals or accessing production data.

# ADR-0001: Pure Domain Core Boundaries & Framework Independence

**Status:** Accepted  
**Date:** 2026-11-27  
**Scope:** `src/core/**`

## Context

`dip-core` is the shared domain foundation for the Digital India Project ecosystem (`DIPINDIA`, `dip-api`, `dip-ui`, `dip-sdk`, `dip-automation`, `dip-security`). Importing UI frameworks (React), HTTP servers (Express, Hono), cloud SDKs (Cloudflare, Firebase), or payment gateway SDKs (Cashfree) into core modules would couple every consumer to runtime-specific dependencies and make deterministic testing difficult.

## Decision

1. All domain modules live under `src/core/` and must have **zero external npm dependencies** and **zero Node/browser runtime globals** (`window.*`, `document.*`, `fetch()`, `process.env`, `Date.now()`, `Math.random()`).
2. Dependency direction is strictly acyclic: consumers import `dip-core`; `dip-core` never imports consumers.
3. Enforcement is automated via `scripts/check-boundaries.mjs` (`npm run check:boundaries`), which parses every module under `src/core/`, rejects forbidden imports/globals, and fails on circular dependencies.

## Consequences

- Every domain rule is pure, deterministic, and testable without mocks or network access.
- Time-sensitive rules (e.g. document expiration, audit timestamps) accept explicit `UtcInstant` parameters rather than reading system clocks.
- Persistence and provider execution remain owned by `DIPINDIA`, `dip-api`, and `dip-infrastructure`.

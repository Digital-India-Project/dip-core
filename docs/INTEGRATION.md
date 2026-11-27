# DIP Core — Ecosystem Integration Contract

## 1. Purpose

DIP Core publishes shared domain contracts and deterministic business rules. DIPINDIA is the first consumer and remains the current product and data authority. Core adoption must be gradual and backwards-compatible.

## 2. Consumer responsibilities

| Consumer | Uses core for | Must retain responsibility for |
|---|---|---|
| DIPINDIA | Shared schemas, types, calculations, workflow rules | UI, persistence, authentication, APIs and current user journeys |
| dip-security | Shared identifiers/errors where appropriate | Security policy and enforcement |
| dip-ui | UI-safe domain enums/types | Rendering, accessibility and interaction |
| dip-api | Request/response and normalized domain types | HTTP, provider clients, webhooks, authorization |
| dip-sdk | Public API data types | Network client, auth token handling and retries |
| dip-automation | Job payload and event types | Queue execution, retries and scheduling |
| dip-infrastructure | Config metadata types if needed | Infrastructure schema and CI governance |
| dip-docs | Domain vocabulary and generated references | Documentation publication |
| dip-status | Service/incident domain enums if appropriate | Health checks and status operations |

## 3. Import/dependency rules

- Core must not import consuming repositories.
- Pure modules must not import React, Express, Hono, Firebase, Cloudflare SDKs, Cashfree or API Sathi clients.
- No circular dependencies.
- Public exports must be explicit.
- Consumers must pin compatible package versions.
- No private internal file imports across package boundaries.

## 4. Contract lifecycle

1. Identify existing DIPINDIA source and feature inventory ID.
2. Capture current behaviour with tests.
3. Propose a stable domain contract.
4. Review semantics with consuming repository owners.
5. Implement pure module and fixtures.
6. Add DIPINDIA adapter.
7. Run parity and consumer contract tests.
8. Release a versioned package only after approval.
9. Update consumers independently through review branches.
10. Retire duplicate old code only after verified adoption and explicit approval.

## 5. Compatibility rules

- Preserve existing field meaning and calculations.
- Prefer additive optional fields.
- Use major versions for breaking changes.
- Provide migrations and deprecation periods.
- Do not change workflow transitions, pricing or payment status semantics without business approval.
- Keep legacy adapters during migration.

## 6. Data ownership

Core types do not confer data ownership. DIPINDIA remains authoritative for current customer, application, payment, document and partner records until a separate decision is approved. Core packages must not connect to production databases or copy records.

## 7. Testing requirements

- Unit tests for each domain rule.
- Golden fixtures for current DIPINDIA results.
- Schema compatibility tests.
- Consumer contract tests.
- Edge-case tests for money, time, IDs and state transitions.
- No production data in test fixtures.

## 8. Prohibited integration patterns

- Direct imports from another repository's source tree.
- Shared mutable global state.
- Database writes from core.
- Provider network calls from core.
- Unversioned schema changes.
- Duplicate business logic with different semantics.
- Production cutover without explicit approval.

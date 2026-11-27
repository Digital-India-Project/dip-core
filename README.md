# DIP Core

**Role:** Shared domain contracts, schemas and deterministic business logic  
**Status:** Planning foundation; no implementation package verified  
**Primary consumer:** Existing DIPINDIA application

## Mission

DIP Core will provide stable, framework-independent domain types, validation schemas, business rules and shared result/error contracts for the Digital India Project ecosystem.

DIPINDIA is the existing developed platform and remains the continuity anchor. This repository must help extract duplicated or reusable domain logic gradually. It must not become a second application, a second database, or a competing business platform.

## Current baseline

The repository currently contains only a minimal README. No package, source tree, build configuration or tests have been verified. The documents define the intended design, not existing implementation.

## Responsibilities

- Canonical domain types and schemas.
- Pure business rules and deterministic calculations.
- Application and workflow state contracts.
- Service catalogue and pricing contracts.
- Form and document requirement schemas.
- Payment status and order domain contracts (not payment gateway execution).
- Stable errors, results, identifiers and pagination contracts.
- Contract versioning and compatibility tests.

## Out of scope

- UI components and rendering.
- Direct database access or ownership of production data.
- Authentication provider implementation or authorization enforcement.
- Payment credentials, provider network clients and webhook runtime.
- Background job execution.
- Infrastructure provisioning or deployment.
- Copying or migrating DIPINDIA data.

## DIPINDIA-first rule

All extraction begins with a source audit and characterization tests in DIPINDIA. New domain modules must be introduced behind adapters. Existing service names, forms, application states, pricing, payment calculations and customer-facing behaviour remain unchanged until parity is demonstrated and cutover is separately approved.

## Target structure

```text
.
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── common/
│   ├── identity/
│   ├── services/
│   ├── forms/
│   ├── applications/
│   ├── payments/
│   ├── documents/
│   ├── partners/
│   └── errors/
├── schemas/
├── tests/
│   ├── unit/
│   └── contract/
└── docs/
    ├── PROJECT_PLAN.md
    ├── ARCHITECTURE.md
    ├── ROADMAP.md
    ├── SECURITY.md
    └── INTEGRATION.md
```

Target layout only. Choose package tooling after reviewing ecosystem constraints; do not introduce a monorepo/workspace assumption prematurely.

## Design rules

1. Keep core modules deterministic and side-effect free wherever possible.
2. No React, Express, Hono, Firebase, Cloudflare or provider-specific imports in pure domain packages.
3. Use explicit schemas and runtime validation at trust boundaries.
4. Model money in integer minor units (for INR, paise) and avoid floating-point arithmetic.
5. Define state transitions explicitly; reject invalid transitions.
6. Version contracts and document breaking changes.
7. Keep domain logic separate from persistence and transport.
8. Use synthetic fixtures only.

## Documents

- [Project plan](docs/PROJECT_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Security](docs/SECURITY.md)
- [Integration](docs/INTEGRATION.md)

## Governance

Review branches only. Never push to main, merge, deploy, migrate production data or change DIPINDIA behaviour without explicit approval.

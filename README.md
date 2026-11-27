# DIP Core

**Role:** Shared domain contracts, schemas and deterministic business logic  
**Status:** Core domain library & interactive workbench implemented (`v0.2.0`); DIPINDIA parity audit pending  
**Primary consumer:** Existing DIPINDIA application

## Mission

DIP Core provides stable, framework-independent domain types, validation schemas, business rules, and shared result/error contracts for the Digital India Project ecosystem.

DIPINDIA is the existing developed platform and remains the continuity anchor. This repository extracts reusable domain logic gradually behind compatibility adapters. It must not become a second application, a second database, or a competing business platform.

## Current baseline

- **Implemented (`src/core/`):** Pure TypeScript domain modules (`errors`, `common`, `identity`, `events`, `services`, `forms`, `documents`, `applications`, `payments`, `partners`, `compatibility`, `fixtures`), ESM + `.d.ts` library build (`dist-lib/`), automated dependency boundary verification (`scripts/check-boundaries.mjs`), Node.js unit and contract tests (`tests/`), and an interactive React/Vite workbench (`src/App.tsx`).
- **Provisional:** `src/core/compatibility/dipindiaAdapters.ts` provides anti-corruption adapter examples awaiting source-level characterization against `DIPINDIA`.
- **Blocked / Pending:** Read-only source inspection of `DIPINDIA` (not accessible from this workspace) and production adoption approval.

## Responsibilities

- Canonical domain types and schemas.
- Pure business rules and deterministic calculations.
- Application and workflow state contracts.
- Service catalogue and pricing contracts.
- Form and document requirement schemas.
- Payment status, order, refund, and reconciliation domain contracts (not payment gateway execution).
- Versioned event envelopes, audit metadata, and notification request contracts.
- Stable errors, results, identifiers, and pagination/filter contracts.
- Contract versioning and compatibility tests.

## Out of scope

- UI components and rendering for end-user portals (belongs in `DIPINDIA` / `dip-ui`).
- Direct database access or ownership of production data.
- Authentication provider implementation or authorization enforcement (belongs in `dip-security` / `DIPINDIA`).
- Payment credentials, provider network clients, and webhook runtime.
- Background job execution (belongs in `dip-automation`).
- Infrastructure provisioning or deployment (belongs in `dip-infrastructure`).
- Copying or migrating DIPINDIA data.

## DIPINDIA-first rule

All extraction requires a source audit and characterization tests in DIPINDIA. New domain modules are introduced behind compatibility adapters (`src/core/compatibility/dipindiaAdapters.ts`). Existing service names, forms, application states, pricing, payment calculations, and customer-facing behaviour remain authoritative in DIPINDIA until parity is demonstrated and cutover is separately approved.

## Repository layout

```text
.
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.test.json
├── scripts/
│   └── check-boundaries.mjs
├── src/
│   ├── core/
│   │   ├── errors/
│   │   ├── common/
│   │   ├── identity/
│   │   ├── events/
│   │   ├── services/
│   │   ├── forms/
│   │   ├── documents/
│   │   ├── applications/
│   │   ├── payments/
│   │   ├── partners/
│   │   ├── compatibility/
│   │   ├── contracts/
│   │   ├── fixtures/
│   │   └── index.ts
│   └── ... (interactive workbench SPA)
├── tests/
│   ├── unit/
│   └── contract/
└── docs/
    ├── PROJECT_PLAN.md
    ├── ARCHITECTURE.md
    ├── DOMAIN_MODEL.md
    ├── CONTRACTS.md
    ├── COMPATIBILITY.md
    ├── INTEGRATION.md
    ├── ROADMAP.md
    ├── SECURITY.md
    ├── TESTING.md
    ├── VERSIONING.md
    └── adr/
```

## Design rules

1. Keep core modules deterministic and side-effect free wherever possible.
2. No React, Express, Hono, Firebase, Cloudflare, or provider-specific imports in `src/core/`.
3. Use explicit schemas and runtime validation at trust boundaries.
4. Model money in integer minor units (for INR, paise) and avoid floating-point arithmetic.
5. Define state transitions explicitly; reject invalid transitions.
6. Version contracts and document breaking changes.
7. Keep domain logic separate from persistence and transport.
8. Use synthetic fixtures only.

## Verification

```bash
npm run check   # lint + boundary check + node --test + library build + workbench build
```

## Documents

- [Project plan](docs/PROJECT_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Domain model](docs/DOMAIN_MODEL.md)
- [Contracts reference](docs/CONTRACTS.md)
- [DIPINDIA compatibility](docs/COMPATIBILITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Versioning](docs/VERSIONING.md)
- [Integration](docs/INTEGRATION.md)

## Governance

Review branches only (`development/*`). Never push to main, merge, deploy, migrate production data, or change DIPINDIA behaviour without explicit approval.

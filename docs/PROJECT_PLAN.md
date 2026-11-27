# DIP Core — Project Plan

**Status:** Proposed; package implementation requires review  
**Primary migration consumer:** DIPINDIA  
**Strategy:** Extract stable, pure domain logic incrementally without replacing the existing platform

## 1. Objective

Establish a shared domain foundation for Digital India Project: canonical schemas, domain types, deterministic business rules, state transitions and error/result contracts. DIPINDIA remains the product and data authority while selected logic is extracted.

## 2. Goals

- Reduce duplicated business logic across repositories.
- Define stable domain vocabulary and identifiers.
- Make business rules testable without UI, database or provider dependencies.
- Standardize validation schemas and error handling.
- Preserve existing DIPINDIA calculations and workflow semantics.
- Version shared contracts and prevent accidental breaking changes.
- Support future API and SDK generation from stable contracts.

## 3. Non-goals

- No replacement application or portal.
- No database or production data ownership.
- No authentication provider or authorization engine.
- No direct Cloudflare, Firebase, PostgreSQL or provider SDK dependencies in pure domain packages.
- No payment execution, webhook runtime or job orchestration.
- No automatic schema/data migration.
- No production deployment or package publishing without approval.

## 4. Current baseline

The repository contains only a minimal README; no package manifest, source tree or tests were verified. Initial domain candidates are inferred from the existing DIPINDIA source inspection and must be confirmed through a complete inventory.

## 5. Workstreams

### WS1 — Domain discovery and vocabulary
- Inspect DIPINDIA service catalogue, pricing, form engine, application types, workflow stages, payment status helpers, document rules, partner/operator data and error conventions.
- Identify duplicate or conflicting definitions.
- Record canonical names, identifiers, units, lifecycle and ownership.
- Mark uncertain, legacy and deprecated fields explicitly.
- Avoid copying implementation before behaviour is characterized.

Deliverables: domain glossary, entity catalogue, source map, duplication report.

### WS2 — Shared primitives
- Define identifiers and branded ID types where useful.
- Define Result/Option and error code conventions.
- Define date/time and currency handling.
- Define pagination and sorting contracts.
- Define schema version metadata.
- Define safe serialization rules.

Deliverables: common types and tests.

### WS3 — Service catalogue and pricing
- Define service identifiers, categories, availability and localization contracts.
- Define price components, taxes/fees/discounts and totals.
- Represent INR monetary values in integer paise.
- Define rounding rules and authoritative calculation boundaries.
- Keep provider-specific and customer-specific pricing decisions outside generic primitives unless explicitly modelled.
- Compare calculations against DIPINDIA characterization fixtures.

Deliverables: catalogue schemas, price model, calculation tests and compatibility adapter.

### WS4 — Forms and document requirements
- Define field types, validation rules, conditional visibility and repeatable groups.
- Define form schema versioning and submission validation results.
- Define document requirement metadata, file constraints and verification state.
- Do not store file bytes or customer documents in this package.
- Preserve existing form builder and submission behaviour.

Deliverables: form schema, document requirement schema, validation contract and fixtures.

### WS5 — Application and workflow domain
- Define application identity and lifecycle states.
- Define allowed state transitions and transition preconditions.
- Define assignment, resubmission, cancellation and completion semantics after source audit.
- Define stage event and audit metadata.
- Do not execute jobs or persist records in core.

Deliverables: state machine, transition tests, event contracts.

### WS6 — Payment domain contracts
- Define order, payment, refund and reconciliation domain types.
- Define normalized payment states and allowed transitions.
- Use integer minor units and currency codes.
- Keep Cashfree API calls, signature verification and webhook delivery in dip-api.
- Preserve current DIPINDIA payment status semantics.

Deliverables: payment domain schemas and compatibility tests.

### WS7 — Contract quality and release
- Add unit and contract tests.
- Generate schema documentation where useful.
- Apply semantic versioning.
- Add compatibility checks for downstream consumers.
- Publish packages only after approval.
- Maintain changelog and migration guide.

Deliverables: test suite, release workflow proposal and compatibility matrix.

## 6. Delivery phases

### Phase 0 — Discover
Map current DIPINDIA domain logic and identify stable candidates. Exit: source map and characterization tests.

### Phase 1 — Establish package foundation
Select TypeScript/package format, module system, build/test tooling and export conventions. Exit: minimal package passes CI and has no runtime service dependencies.

### Phase 2 — Common primitives
Implement IDs, errors, result types, money/date primitives and schema versioning. Exit: deterministic tests.

### Phase 3 — Low-risk domain extraction
Extract pure functions such as status normalization, calculations and validators only after parity tests. Exit: DIPINDIA adapter returns equivalent results.

### Phase 4 — Core business contracts
Add catalogue, form, document and workflow schemas. Exit: consumer contract tests pass.

### Phase 5 — Payment and integration contracts
Add normalized order/payment/refund domain models. Keep network calls and webhook verification outside core.

### Phase 6 — Adoption and release
Pin versions in DIPINDIA and other consumers through reviewed changes. Maintain old adapters until all consumers migrate.

## 7. Priorities

**P0:** Domain inventory, package standards, errors/results, identifiers, money rules, application state contracts, regression fixtures.

**P1:** Catalogue, pricing, forms, document requirements, payment status contracts, schema versioning.

**P2:** Advanced policy composition, localization metadata, code generation, cross-language schema consumers.

## 8. Acceptance criteria

- Pure domain modules have no UI, storage, network or provider dependencies.
- Existing DIPINDIA behaviour has characterization fixtures.
- Money uses integer minor units and explicit rounding.
- State transitions are explicit and tested.
- Runtime schemas reject invalid/untrusted input.
- Errors are stable and documented.
- Contract changes are versioned and tested against consumers.
- No data migration or production write is performed.
- DIPINDIA retains compatibility adapters until approved cutover.

## 9. Governance

Every extracted module must identify its original DIPINDIA source, feature ID, tests, consumers and rollback. Work on review branches only. No main push, merge, deployment or package publication without explicit approval.

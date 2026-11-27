# DIP Core — Architecture

## 1. Role

DIP Core is the framework-independent domain contract and deterministic business logic layer. It should not become a backend server or database abstraction. DIPINDIA remains the current application host and system of record.

## 2. Target dependency direction

```text
           DIPINDIA / dip-api / dip-automation
                         |
                         v
                      dip-core
          +--------------+--------------+
          |              |              |
          v              v              v
       Schemas       Domain rules    State models
          |              |              |
          +--------------+--------------+
                         |
                  Pure deterministic code

  UI, database, network, provider SDKs and job runners stay outside core.
```

Consumers depend on core contracts. Core must not import consumers or their runtime frameworks.

## 3. Proposed modules

- `common`: identifiers, result/error types, schema version and shared primitives.
- `services`: service catalogue entities and pricing rules.
- `forms`: field definitions, conditional logic and validation result contracts.
- `applications`: application lifecycle and state transitions.
- `documents`: document requirement metadata and verification state.
- `payments`: normalized order/payment/refund domain types and status transitions.
- `partners`: partner/operator relationship contracts where domain ownership is confirmed.

Module boundaries are provisional and should be adjusted after DIPINDIA discovery.

## 4. Runtime and build architecture

Prefer TypeScript with a package format compatible with the existing Vite/Node consumers. Before choosing ESM/CJS exports, build target, test runner or workspace structure, inspect consumer requirements and existing repository conventions.

Target quality properties:
- No side effects during import.
- Deterministic pure functions.
- Explicit public exports.
- No reliance on process globals.
- No runtime network or filesystem access in domain logic.
- Stable serialization.
- Small dependency footprint.

## 5. Domain modelling rules

### Money
Represent monetary amounts as integer minor units plus ISO currency code. For INR, use paise. Define rounding and tax/discount order explicitly. Never rely on binary floating-point for authoritative totals.

### Time
Use explicit UTC instants for event timestamps and explicit timezone context for business-local dates. Avoid implicit machine-local timezone conversions.

### State machines
Define valid states and allowed transitions. A transition function should return a structured result and must not persist, send notifications or enqueue jobs.

### Identifiers
Distinguish user, application, service, order, document and provider IDs. Do not assume every ID is interchangeable or use provider IDs as internal primary keys.

### Validation
Separate schema validation from business invariants. Runtime validation is required at external trust boundaries; compile-time types alone are insufficient.

## 6. Error model

Errors should have stable machine-readable codes, safe user-facing messages, optional field paths and non-sensitive metadata. Do not embed secrets, raw provider payloads or customer documents in errors.

## 7. Persistence boundary

Core defines entity contracts and domain operations. Repositories and services own persistence. Do not place Firestore, D1, R2, PostgreSQL or ORM queries in core.

A repository interface may be introduced only where a consumer requires a stable abstraction; it must not conceal transaction or consistency requirements.

## 8. Provider boundary

Cashfree and API Sathi clients belong in dip-api/provider adapters. Core may define normalized domain representations but cannot import provider SDKs or own credentials, HTTP retries or webhook signature verification.

## 9. Compatibility architecture

DIPINDIA retains adapter functions that map existing structures to/from core types. During extraction:
- Preserve old public function signatures where possible.
- Convert data at module boundaries.
- Compare results against characterization fixtures.
- Keep legacy implementation until parity and rollout approval.
- Avoid circular dependencies.

## 10. Versioning

Use semantic versioning for published packages. Additive optional fields may be minor changes if they do not change behaviour. Removing/renaming fields, changing calculations or transition semantics is breaking and requires a major version and migration guide.

## 11. Testing

- Unit tests for deterministic rules.
- Property-based tests for calculations and state transitions where useful.
- Schema fixtures for valid/invalid data.
- Golden tests for existing DIPINDIA behaviour.
- Consumer contract tests.
- Compatibility tests across supported runtime targets.

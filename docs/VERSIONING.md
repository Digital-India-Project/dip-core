# DIP Core — Versioning & Contract Evolution Policy

**Current Contract Version:** `0.2.0` (`CORE_CONTRACT_VERSION`)  
**Package Status:** `private: true` (not published to npm without explicit approval)

## 1. Semantic Versioning Rules

`dip-core` follows Semantic Versioning (`MAJOR.MINOR.PATCH`) tracked both in `package.json` and `CORE_CONTRACT_VERSION` (`src/core/common/identifiers.ts`):

- **MAJOR (`X.0.0`):** Removing or renaming public exports, changing `ErrorCode` values, altering pricing/GST rounding semantics, tightening existing required fields, or changing state transition rules in an incompatible way. Requires a migration guide and consumer compatibility approval.
- **MINOR (`0.X.0`):** Adding new domain modules, optional fields on existing interfaces, new `ErrorCode` members, or new additive helper functions without breaking existing callers.
- **PATCH (`0.0.X`):** Bug fixes that restore documented invariants (e.g., rejecting invalid Feb 30 timestamps or `NaN` pagination inputs), documentation updates, and internal test additions.

## 2. Schema Version Compatibility

- Form schemas (`FormSchemaContract.version`) and event envelopes (`DomainEventEnvelope.eventVersion`) carry explicit `MAJOR.MINOR.PATCH` strings.
- `isCompatibleSchemaVersion(consumerExpected, producerActual)` enforces same `MAJOR` version and `producerActual.minor >= consumerExpected.minor`.
- `checkFormSchemaCompatibility()` allows callers to verify incoming payloads against expected schema versions before processing.

## 3. Changelog Summary

- **`0.1.0`:** Initial workbench prototype with errors, common primitives, pricing, forms, documents, applications, payments, partners, and synthetic fixtures.
- **`0.2.0`:** Added identity/tenant references, versioned event/audit/notification contracts, optimistic concurrency on applications, document expiration & checklist evaluation, payment reconciliation, provisional DIPINDIA compatibility adapters, `tsconfig.lib.json` (`dist-lib/`), automated boundary checks, ADRs, CI workflow, and Node.js unit/contract test suite.

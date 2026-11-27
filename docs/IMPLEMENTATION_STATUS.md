# DIP Core — Implementation Status

**Version:** `0.2.0` (`@dip/core`)  
**Last Verified:** 2026-11-27

## 1. Implemented & Verified

- **Errors & Metadata Scrubbing (`src/core/errors/domainError.ts`):** 20 `ErrorCode` values, `ErrorCategory` classification, prototype-key blocking, sensitive key stripping, secret-value redaction (`serializeDomainError`).
- **Common Primitives (`src/core/common/`):** `Result`/`Option` combinators, 21 branded `EntityPrefix` ID parsers, semver compatibility helpers, integer paise `Money` with `BigInt` basis-point rounding, strict UTC & `BusinessDate` calendar parsing (`Asia/Kolkata`), `NaN`-safe pagination, and allowlisted sort/filter validation.
- **Identity & Tenant References (`src/core/identity/identityAndTenant.ts`):** `TenantContext`, `ActorReference`, `CustomerReference`, `BusinessReference` (zero PII/auth logic).
- **Events, Audit & Notifications (`src/core/events/eventEnvelope.ts`):** `DomainEventEnvelope`, `AuditEventContract`, `NotificationRequestContract` with runtime validation.
- **Services & Pricing (`src/core/services/catalogueAndPricing.ts`):** `ServiceDefinition`, `ProductDefinition`, `PriceComponent`, `validateServiceDefinition()`, `calculateServiceQuote()`.
- **Applications Workflow (`src/core/applications/applicationLifecycle.ts`):** 9-state lifecycle, precondition guards, actor-role rules, optimistic concurrency (`expectedVersion`), stage definitions.
- **Forms (`src/core/forms/formSchema.ts`):** Conditional visibility, strict prototype/unknown-key filtering, `validateFormSchemaDefinition()`, serializable `patternSource` with nested-quantifier ReDoS guard, schema semver compatibility.
- **Documents (`src/core/documents/documentRequirements.ts`):** MIME/size checks, verification transitions, deterministic expiration checks, mandatory checklist evaluation.
- **Payments (`src/core/payments/paymentLifecycle.ts`):** Order/payment/refund transitions, cumulative refund invariant checks, `validatePaymentOrder()`, `reconcilePaymentOrder()`.
- **Partners (`src/core/partners/partnerContract.ts`):** `PartnerContract`, `OperatorAssignmentContract`, `validatePartnerContract()`.
- **Tooling & CI:** `tsconfig.lib.json` (`dist-lib/` ESM + `.d.ts`), `scripts/check-boundaries.mjs`, `.github/workflows/ci.yml`, `integration/manifest.json`, and 3 test suites under `tests/`.
- **Interactive Workbench (`src/App.tsx`, `src/components/*`):** React + Vite workbench executing live core modules on synthetic fixtures.

## 2. Mocked / Provisional

- **Synthetic Fixtures (`src/core/fixtures/syntheticFixtures.ts`, `tests/fixtures/contract-vectors.json`):** Non-production synthetic samples only.
- **DIPINDIA Adapters (`src/core/compatibility/dipindiaAdapters.ts`):** Provisional boundary adapters (`adaptLegacyApplicationToCore`, `adaptLegacyPaymentOrderToCore`, `convertRupeesToPaise`) awaiting source audit.

## 3. Blocked

- **DIPINDIA Source Audit & Golden Characterization:** `DIPINDIA` repository is unavailable in this environment.
- **Cross-Repository Integration Verification:** Sibling repos (`dip-api`, `dip-ui`, `dip-sdk`, `dip-security`, `dip-automation`) are not accessible here.
- **Git Review Branch / PR Delivery:** Workspace snapshot has no `.git` repository or GitHub remote credentials.
- **Lockfile Vulnerability Scan (`npm audit`):** Blocked by absence of `package-lock.json` (`ENOLOCK`).

## 4. Untested / Out of Scope

- Live database persistence, Cashfree/API Sathi HTTP/webhook execution, Firebase/Cloudflare adapters, and end-to-end production flows (all intentionally outside `dip-core`).

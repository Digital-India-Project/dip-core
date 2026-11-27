# DIP Core — Public Contracts & API Reference

**Contract Version:** `0.2.0` (`CORE_CONTRACT_VERSION`)  
**Package Entry:** `@dip/core` (`dist-lib/index.js`, `dist-lib/index.d.ts`)

## 1. Public Entry Point Policy

- Consumers must import only from the package root (`@dip/core` or `src/core/index.ts`).
- Internal workbench helpers such as `src/core/contracts/selfCheckSuite.ts` are **not** exported from `src/core/index.ts` and are excluded from `tsconfig.lib.json`.
- Zero external runtime dependencies; zero side effects on import (`"sideEffects": false`).

## 2. Shared Primitives

### `Result<T, E>` & `Option<T>` (`common/result.ts`)
- `ok(value)`, `err(error)`, `some(value)`, `none()`
- Combinators: `mapResult`, `flatMapResult`, `mapError`, `unwrapOr`, `combineResults`

### `DomainError` & `ErrorCode` (`errors/domainError.ts`)
- Codes: `ERR_INVALID_IDENTIFIER`, `ERR_INVALID_MONEY_AMOUNT`, `ERR_CURRENCY_MISMATCH`, `ERR_INVALID_TIMESTAMP`, `ERR_SCHEMA_VALIDATION_FAILED`, `ERR_UNKNOWN_FIELD_REJECTED`, `ERR_PROTOTYPE_KEY_REJECTED`, `ERR_INVALID_STATE_TRANSITION`, `ERR_PRECONDITION_FAILED`, `ERR_SERVICE_UNAVAILABLE`, `ERR_DOCUMENT_CONSTRAINT_FAILED`, `ERR_REFUND_EXCEEDS_CAPTURED`, `ERR_NOT_FOUND`, `ERR_CONFLICT`, `ERR_CONCURRENCY_CONFLICT`, `ERR_PERMISSION_DENIED`, `ERR_INTEGRATION_FAILURE`, `ERR_IDEMPOTENCY_CONFLICT`, `ERR_EXPIRED`, `ERR_INVALID_FILTER_OR_SORT`.
- Helpers: `createDomainError()`, `classifyErrorCode()`, `sanitizeMetadata()`, `serializeDomainError()`.

### `Money` (`common/money.ts`)
- `createMoney(minorUnits, currency?)`
- `addMoney(a, b)`, `subtractMoney(a, b)`, `sumMoney(items, currency?)`, `equalsMoney(a, b)`
- `multiplyBasisPoints(amount, basisPoints, rounding)`
- `formatInrFromPaise(minorUnits)`

### `UtcInstant` & `BusinessDate` (`common/time.ts`)
- `parseUtcInstant(raw)` — strict UTC ISO-8601 (`Z`), verifies calendar validity (rejects rollovers like Feb 30).
- `parseBusinessDate(raw)` — strict `YYYY-MM-DD` calendar validation.
- `compareUtcInstants(a, b)`, `isInstantExpired(expiresAt, referenceNow)`.

### Pagination, Sorting & Filtering (`common/pagination.ts`)
- `createPageRequest(raw, allowedSortFields?)`
- `paginateArray(items, request)`

## 3. Domain Contracts

- **Identity & Tenant (`identity/identityAndTenant.ts`):** `TenantContext`, `ActorReference`, `CustomerReference`, `BusinessReference`, `validateTenantContext()`, `validateBusinessReference()`.
- **Events, Audit & Notifications (`events/eventEnvelope.ts`):** `DomainEventEnvelope`, `AuditEventContract`, `NotificationRequestContract`, `createEventEnvelope()`, `createAuditEvent()`, `createNotificationRequest()`.
- **Services & Pricing (`services/catalogueAndPricing.ts`):** `ServiceDefinition`, `ProductDefinition`, `PriceComponent`, `PricingQuoteInput`, `PricingQuoteBreakdown`, `validateServiceDefinition()`, `calculateServiceQuote()`.
- **Forms (`forms/formSchema.ts`):** `FormSchemaContract`, `FormSectionSchema`, `FormFieldSchema`, `isFieldVisible()`, `validateFormSubmission()`, `checkFormSchemaCompatibility()`.
- **Documents (`documents/documentRequirements.ts`):** `DocumentRequirement`, `DocumentRecord`, `VerificationEventContract`, `DocumentChecklistEvaluation`, `validateDocumentMetadata()`, `transitionDocumentState()`, `isDocumentExpired()`, `evaluateDocumentChecklist()`.
- **Applications (`applications/applicationLifecycle.ts`):** `ApplicationContract`, `ApplicationTransitionRequest`, `ApplicationStageEvent`, `WorkflowStageDefinition`, `WorkflowTransitionRule`, `transitionApplicationState()`, `isTerminalApplicationState()`.
- **Payments (`payments/paymentLifecycle.ts`):** `PaymentOrderContract`, `OrderReference`, `IdempotencyReference`, `RefundRequestContract`, `ReconciliationResult`, `validatePaymentOrder()`, `transitionPaymentState()`, `reconcilePaymentOrder()`.
- **Partners (`partners/partnerContract.ts`):** `PartnerContract`, `OperatorAssignmentContract`, `validatePartnerContract()`.
- **Compatibility (`compatibility/dipindiaAdapters.ts`):** Provisional DIPINDIA adapters (`adaptLegacyApplicationToCore()`, `adaptLegacyPaymentOrderToCore()`, `convertRupeesToPaise()`, `mapLegacyApplicationStatus()`, `mapCoreApplicationStatusToLegacy()`, `mapLegacyPaymentStatus()`).

# DIP Core — Domain Model

**Status:** Implemented in `src/core/` (Synthetic fixtures only; DIPINDIA source parity audit pending)

## 1. Bounded Modules

| Module | Path | Implementation Status | Authority / Ownership |
|---|---|---|---|
| Errors | `src/core/errors/domainError.ts` | Implemented | `dip-core` (codes, categories, metadata scrubbing) |
| Common Primitives | `src/core/common/*` | Implemented | `dip-core` (`Result`, `Option`, branded IDs, `Money`, `UtcInstant`, pagination/filtering) |
| Identity & Tenant | `src/core/identity/identityAndTenant.ts` | Implemented (reference contracts) | `dip-core` (references only; auth enforcement stays in `dip-security` / `DIPINDIA`) |
| Events & Audit | `src/core/events/eventEnvelope.ts` | Implemented | `dip-core` (event envelopes, audit & notification DTOs) |
| Services & Pricing | `src/core/services/catalogueAndPricing.ts` | Implemented | `dip-core` (contracts); `DIPINDIA` remains pricing authority until parity proven |
| Forms | `src/core/forms/formSchema.ts` | Implemented | `dip-core` (schema & validation); `dip-ui` owns rendering |
| Documents | `src/core/documents/documentRequirements.ts` | Implemented | `dip-core` (metadata, expiration, verification states); storage outside core |
| Applications | `src/core/applications/applicationLifecycle.ts` | Implemented | `dip-core` (state machine & optimistic concurrency); `DIPINDIA` owns persistence |
| Payments | `src/core/payments/paymentLifecycle.ts` | Implemented | `dip-core` (normalized order/refund/reconciliation); Cashfree runtime stays in `DIPINDIA`/`dip-api` |
| Partners | `src/core/partners/partnerContract.ts` | Implemented | `dip-core` (partner & operator assignment contracts) |
| Compatibility | `src/core/compatibility/dipindiaAdapters.ts` | Provisional | `dip-core` (example anti-corruption adapters pending `DIPINDIA` audit) |

## 2. Core Aggregates & Value Objects

### Money (`src/core/common/money.ts`)
- **Value object:** `Money { minorUnits: number; currency: 'INR' }`.
- **Invariants:** Integer paise only (`0 <= minorUnits <= 100_000_000_000`). Floating-point inputs are rejected with `ERR_INVALID_MONEY_AMOUNT`.
- **Calculations:** `multiplyBasisPoints()` uses `BigInt` arithmetic and explicit `RoundingMode` (`HALF_UP`, `FLOOR`, `CEIL`).

### Branded Identifiers (`src/core/common/identifiers.ts`)
Every domain entity has a distinct branded type and 3-letter prefix:
- `usr_` (`UserId`), `cus_` (`CustomerId`), `biz_` (`BusinessId`), `ten_` (`TenantId`)
- `app_` (`ApplicationId`), `svc_` (`ServiceId`), `prd_` (`ProductId`)
- `ord_` (`OrderId`), `pay_` (`PaymentId`), `ref_` (`RefundId`), `prv_` (`ProviderReferenceId`)
- `doc_` (`DocumentId`), `ver_` (`VerificationId`), `frm_` (`FormSchemaId`), `sub_` (`SubmissionId`)
- `ptr_` (`PartnerId`), `evt_` (`EventId`), `aud_` (`AuditEventId`), `cor_` (`CorrelationId`), `idp_` (`IdempotencyKey`), `ntf_` (`NotificationId`)

### Application Lifecycle (`src/core/applications/applicationLifecycle.ts`)
- **States:** `DRAFT`, `SUBMITTED`, `PAYMENT_PENDING`, `IN_REVIEW`, `RESUBMISSION_REQUIRED`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`.
- **Invariants:**
  - Explicit transition graph (`APPLICATION_ALLOWED_TRANSITIONS`).
  - `IN_REVIEW` requires `paymentCaptured === true`.
  - `APPROVED` requires `requiredDocumentsVerified === true`.
  - `RESUBMISSION_REQUIRED`, `REJECTED`, and `CANCELLED` require a reason of at least 5 characters.
  - `APPLICANT` cannot transition to `APPROVED`, `REJECTED`, or `RESUBMISSION_REQUIRED`.
  - Optional optimistic concurrency check via `expectedVersion` (`ERR_CONCURRENCY_CONFLICT`).

### Payment & Refund Lifecycle (`src/core/payments/paymentLifecycle.ts`)
- **States:** `CREATED`, `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED`.
- **Invariants:**
  - `capturedPaise <= amount.minorUnits`.
  - `refundedPaise <= capturedPaise`.
  - `PARTIALLY_REFUNDED` requires `nextRefundTotal < capturedPaise`; `REFUNDED` requires `nextRefundTotal === capturedPaise`.
  - Reconciliation (`reconcilePaymentOrder()`) detects `MATCHED`, `AMOUNT_MISMATCH`, `STATE_MISMATCH`, `MISSING_LOCAL`, and `MISSING_PROVIDER`.

### Document Verification & Expiration (`src/core/documents/documentRequirements.ts`)
- **States:** `REQUIRED`, `UPLOADED`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`.
- **Invariants:**
  - MIME allowlist and positive integer byte bounds enforced by `validateDocumentMetadata()`.
  - Expired documents cannot be transitioned to `VERIFIED` (`ERR_EXPIRED`).
  - `evaluateDocumentChecklist()` verifies mandatory document coverage, expirations, and rejections without touching file bytes.

## 3. Deliberate Omissions

- No customer PII fields (Aadhaar, PAN numbers, passwords, auth tokens, raw contact lists).
- No database schemas, ORM models, HTTP handlers, or payment gateway clients.
- No fixed workflow stage count assumption (`WorkflowStageDefinition` is data-driven).

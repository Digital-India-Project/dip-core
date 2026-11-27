# DIP Core — Cross-Repository Compatibility Matrix

**Package:** `@dip/core@0.2.0`  
**Contract Version:** `0.2.0` (`CORE_CONTRACT_VERSION`)

## 1. Ecosystem Repository Matrix

| Repository | Direction | Consumes from `dip-core` | Provides to `dip-core` | Compatible Version Range | Synchronization Status |
|---|---|---|---|---|---|
| `DIPINDIA` | `DIPINDIA -> dip-core` | Contracts, pricing rules, state machines, provisional adapters | Functional authority & golden characterization fixtures | Unverified (audit pending) | Blocked on source access |
| `dip-api` | `dip-api -> dip-core` | DTOs, trust-boundary validators, `DomainError`, `PaymentOrderContract` | None (transport stays outside core) | `>=0.2.0 <1.0.0` | Ready for consumer contract check |
| `dip-ui` | `dip-ui -> dip-core` | Enums, `FormSchemaContract`, `ErrorCode`, localized labels | None (UI stays outside core) | `>=0.2.0 <1.0.0` | Ready for consumer contract check |
| `dip-sdk` | `dip-sdk -> dip-core` | Public DTO types, `Result`, `PageRequest`/`PageResult` | None | `>=0.2.0 <1.0.0` | Ready for consumer contract check |
| `dip-security` | `dip-security -> dip-core` | `ActorRole`, `ActorReference`, `TenantContext`, `ErrorCode.PERMISSION_DENIED` | Authn/authz enforcement authority | `>=0.2.0 <1.0.0` | Ready for coordination |
| `dip-automation` | `dip-automation -> dip-core` | `DomainEventEnvelope`, `ApplicationStageEvent`, `NotificationRequestContract` | None | `>=0.2.0 <1.0.0` | Ready for event schema review |
| `dip-infrastructure` | Independent | Optional `integration/manifest.json` metadata | CI/deployment governance outside core | `N/A` (no runtime link) | Boundary compliant |
| `dip-docs` | `dip-docs -> dip-core` | Architecture, ADRs, domain glossary, contract specs | Central docs portal | `>=0.2.0 <1.0.0` | Synchronized |
| `dip-status` | `dip-status -> dip-core` | Optional `ServiceAvailability`, `ErrorCode` | Operational health checks | `>=0.2.0 <1.0.0` | Optional / awaiting review |

## 2. Shared Contract Vectors (`tests/fixtures/contract-vectors.json`)

Other repositories can consume `tests/fixtures/contract-vectors.json` directly in CI to verify parity on:
- Pricing quote calculations (`statutorySubtotalPaise`, `facilitationTaxablePaise`, `gstAmountPaise`, `totalPayablePaise`)
- Legacy rupee-to-paise conversions (`19.99 -> 1999`, `0.01 -> 1`, `284 -> 28400`)
- Legacy `DIPINDIA` application status mappings
- Legacy Cashfree payment status mappings

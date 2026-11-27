# DIP Core — DIPINDIA Compatibility & Migration Readiness

## 1. Access & Discovery Status

In this environment, direct read-only source access to the `DIPINDIA` repository is **unavailable** (only the `dip-core` repository snapshot exists in the workspace). In accordance with safety rules, no unverified `DIPINDIA` internal fields or business rules were fabricated.

All compatibility mappings in `src/core/compatibility/dipindiaAdapters.ts` are therefore marked **Provisional** and must undergo source verification and characterization testing inside `DIPINDIA` before adoption.

## 2. Domain Inventory & Extraction Readiness

| Domain Area | Expected DIPINDIA Responsibility | Proposed `dip-core` Module | Readiness Classification | Notes / Concerns |
|---|---|---|---|---|
| Common Result, IDs, Errors | Ad-hoc error objects / plain string IDs | `errors/domainError`, `common/result`, `common/identifiers` | **Ready for reuse** | Wrap legacy string IDs via boundary parsers (`asApplicationId`, etc.) |
| Money & Time Parsing | Rupee floats / Date strings | `common/money`, `common/time` | **Requires an adapter** | Use `convertRupeesToPaise()` at trust boundaries to avoid IEEE-754 drift |
| Service Catalogue & Pricing | Service pricing & tax logic in `DIPINDIA` | `services/catalogueAndPricing` | **Requires further investigation** | Must characterize actual `DIPINDIA` GST/fee/concession rounding rules first |
| Application Lifecycle | Existing workflow states & handlers in `DIPINDIA` | `applications/applicationLifecycle` | **Requires an adapter** | Status names (`under_review`, `action_required`) require mapping via `mapLegacyApplicationStatus()` |
| Forms & Submissions | Existing `DIPINDIA` form builder & payloads | `forms/formSchema` | **Requires further investigation** | Verify legacy repeatable groups, field names, and conditional expressions in `DIPINDIA` |
| Payment & Cashfree Integration | Live Cashfree SDK, orders, webhooks | `payments/paymentLifecycle` | **Requires an adapter** | Cashfree SDK & webhook verification remain in `DIPINDIA`/`dip-api`; core normalizes statuses only |
| Document Requirements & Uploads | Storage & verification handlers | `documents/documentRequirements` | **Ready for reuse (metadata)** | Storage/R2/Firebase blobs remain outside core |
| Identity / Auth / Roles | Auth provider & RBAC enforcement | `identity/identityAndTenant` (refs only) | **Not suitable for extraction** | Authentication and authorization enforcement belong in `DIPINDIA` / `dip-security` |

## 3. Compatibility & Rollback Strategy

1. **Source Audit (`DIPINDIA`):** Capture golden fixtures of existing pricing totals, form validation errors, application state transitions, and Cashfree webhook status mappings.
2. **Shadow / Dual-Run Validation:** Call `dip-core` behind an anti-corruption adapter in `DIPINDIA` alongside existing logic and assert zero behavioural diff before switching authority.
3. **Incremental Cutover:** Adopt module-by-module (`common` -> `documents` -> `applications` -> `pricing` -> `payments`).
4. **Rollback:** Because `DIPINDIA` retains legacy functions and adapters during migration, rolling back any module requires only toggling the adapter boundary without database or schema rollbacks.

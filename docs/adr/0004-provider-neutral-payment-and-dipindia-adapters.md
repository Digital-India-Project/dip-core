# ADR-0004: Provider-Neutral Payment Contracts & Anti-Corruption Adapters for DIPINDIA

**Status:** Accepted (Provisional Adapters Pending DIPINDIA Source Audit)  
**Date:** 2026-11-27  
**Scope:** `src/core/payments/paymentLifecycle.ts`, `src/core/compatibility/dipindiaAdapters.ts`

## Context

`DIPINDIA` currently owns live Cashfree integration, webhook verification, and customer records. Source access to the `DIPINDIA` repository was unavailable in the `dip-core` workspace, so exact legacy field names and edge-case behaviors in `DIPINDIA` cannot be assumed as identical.

## Decision

1. `dip-core` defines provider-neutral payment contracts (`PaymentOrderContract`, `OrderReference`, `RefundRequestContract`, `ReconciliationResult`) and isolates external provider references behind branded `ProviderReferenceId` (`prv_`).
2. `src/core/compatibility/dipindiaAdapters.ts` provides explicit anti-corruption adapters (`adaptLegacyApplicationToCore`, `adaptLegacyPaymentOrderToCore`, `mapLegacyApplicationStatus`, `mapLegacyPaymentStatus`, `convertRupeesToPaise`) marked clearly as provisional until verified against `DIPINDIA` characterization tests.
3. No Cashfree SDK, HTTP client, webhook signature verification, or live transaction logic is permitted inside `dip-core`.

## Consequences

- `DIPINDIA` can adopt `dip-core` incrementally behind adapters without changing customer-facing behavior or breaking existing webhook flows.
- Any semantic difference discovered during a future `DIPINDIA` source audit can be resolved inside the adapter layer without mutating `dip-core` invariants prematurely.

# ADR-0002: Integer Minor Units (INR Paise) & Basis-Point Arithmetic

**Status:** Accepted  
**Date:** 2026-11-27  
**Scope:** `src/core/common/money.ts`, `src/core/services/catalogueAndPricing.ts`

## Context

IEEE-754 floating-point numbers cannot represent decimal fractions such as `₹19.99` or `18%` GST without binary rounding drift (e.g., `19.99 * 100 === 1998.9999999999998`). In financial quotes and payment/refund ledgers, silent 1-paise discrepancies cause reconciliation failures.

## Decision

1. All monetary values in `dip-core` are represented by `Money { minorUnits: number; currency: 'INR' }`, where `minorUnits` is a validated non-negative integer in paise (`1 INR = 100 paise`), bounded by `0 <= minorUnits <= 100_000_000_000`.
2. Percentage rates (GST, concessions) are expressed as integer basis points (`100 bps = 1%`, `10000 bps = 100%`) and computed via `BigInt` division in `multiplyBasisPoints()` with explicit `RoundingMode` (`HALF_UP`, `FLOOR`, `CEIL`).
3. Legacy rupee numbers entering from unmigrated boundaries are converted using string-fixed decimal parsing in `convertRupeesToPaise()` (`src/core/compatibility/dipindiaAdapters.ts`).

## Consequences

- Zero binary floating-point drift in pricing, GST, or refund calculations.
- Authoritative totals remain deterministic across browsers, Node.js, and edge runtimes.
- Existing `DIPINDIA` rupee-based callers must adapt amounts at the boundary before invoking core calculations.

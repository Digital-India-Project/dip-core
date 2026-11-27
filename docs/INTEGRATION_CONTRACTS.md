# DIP Core — Shared Integration Contracts & Coordination Decisions

**Repository:** `dip-core` (`@dip/core@0.2.0`)  
**Machine-Readable Manifest:** `integration/manifest.json`  
**Contract Vectors:** `tests/fixtures/contract-vectors.json`

## 1. Decisions Made (Verified in Code)

1. **Zero-dependency pure core (`src/core/`):** `@dip/core` (`dist-lib/index.js`) has zero runtime npm dependencies and zero browser, Node.js I/O, database, or payment SDK imports, verified on every run by `npm run check:boundaries`.
2. **Authoritative money units:** Monetary values cross repository boundaries as `Money { minorUnits: number; currency: 'INR' }` in integer paise. Legacy rupee decimals must convert via `convertRupeesToPaise()` at consumer adapters.
3. **Strict branded IDs:** All 21 entity prefixes (`usr_`, `cus_`, `biz_`, `ten_`, `app_`, `svc_`, `prd_`, `ord_`, `pay_`, `ref_`, `doc_`, `ver_`, `frm_`, `sub_`, `ptr_`, `prv_`, `evt_`, `aud_`, `cor_`, `idp_`, `ntf_`) prevent provider IDs (`prv_`) from being passed as internal primary IDs.
4. **Sanitized error envelope:** `DomainError` + `serializeDomainError()` strip prototype keys and sensitive metadata keys/values before errors reach `dip-api` responses or `dip-ui` components.
5. **Versioned event & form contracts:** `DomainEventEnvelope` and `FormSchemaContract` carry explicit `MAJOR.MINOR.PATCH` semver strings validated by `isCompatibleSchemaVersion()`.

## 2. Decisions Requiring Cross-Repository Coordination

| Decision | Repositories Involved | Current Status | Coordination Needed |
|---|---|---|---|
| Authoritative GST & concession rounding parity | `DIPINDIA`, `dip-core`, `dip-api` | Provisional (`HALF_UP`, facilitation-only GST) | Confirm against `DIPINDIA` production/characterization fixtures |
| Legacy application status mapping | `DIPINDIA`, `dip-core`, `dip-automation` | Provisional (`mapLegacyApplicationStatus`) | Verify all historical status strings in `DIPINDIA` |
| Cashfree webhook status normalization | `DIPINDIA`, `dip-api`, `dip-core` | Provisional (`mapLegacyPaymentStatus`) | Confirm exact Cashfree webhook statuses (`PAID`, `SUCCESS`, `USER_DROPPED`, etc.) |
| Form schema repeatable section payload shape | `DIPINDIA`, `dip-ui`, `dip-core` | Partial (`FormSectionSchema` metadata exists) | Align nested repeatable array validation shape with `dip-ui` & `DIPINDIA` |
| Event topic naming (`dip.<module>.<verb>`) | `dip-automation`, `dip-api`, `dip-core` | Proposed (`createEventEnvelope`) | Confirm event catalog with `dip-automation` |
| Package distribution registry / workspace linking | `dip-infrastructure`, `dip-core`, consumers | Private (`"private": true`) | Decide workspace vs private npm registry release gate |

## 3. Assumptions & Compatibility Risks

- **Assumption 1:** Consumers run Node.js `>=22.0.0` (ESM) or TypeScript `>=5.0` with `moduleResolution: "bundler" | "NodeNext"`.
- **Assumption 2:** `DIPINDIA` remains the system of record for customer, payment, and application records until cutover is approved.
- **Risk — Unverified Legacy Edge Cases:** Because `DIPINDIA` source code is unavailable in this environment, edge cases in legacy form payloads, partial refunds, or multi-stage workflows could require adapter updates in `src/core/compatibility/dipindiaAdapters.ts`.
- **Risk — Deep Subpath Imports:** Consumers importing internal files instead of `@dip/core` (`dist-lib/index.js`) could break on internal refactoring. `package.json` `"exports"` restricts entry to `"."`.

## 4. Breaking Changes Policy

- Current `0.2.0` contracts are additive over `0.1.0`; no existing `0.1.0` public export signatures were removed or broken.
- Any future change removing exports, altering `ErrorCode` names, changing paise rounding, or tightening state transitions requires a major version bump (`1.0.0+`) and migration notes in `docs/VERSIONING.md`.

## 5. Dependencies on Other Repositories

- `dip-core` has **zero code/package dependencies** on any of the other 9 repositories.
- `dip-core` has an **audit/verification dependency** on `DIPINDIA` for golden characterization parity before any consumer cutover.

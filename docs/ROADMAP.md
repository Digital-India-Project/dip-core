# DIP Core — Roadmap

## Milestones

| Milestone | Priority | Result | Depends on | Status |
|---|---|---|---|---|
| C0 — DIPINDIA domain discovery | P0 | Source map and glossary | DIPINDIA audit | Blocked (DIPINDIA source unavailable here) |
| C1 — Package foundation | P0 | Typed package, build and test standards | C0 | Implemented (`tsconfig.lib.json`, CI, boundary checks) |
| C2 — Common primitives | P0 | IDs, errors, money/time, results | C1 | Implemented (`src/core/common/`, `errors/`) |
| C3 — Workflow contracts | P0 | Application state and transitions | C0–C2 | Implemented (`src/core/applications/`) |
| C4 — Catalogue and forms | P1 | Service, pricing and form schemas | C2 | Implemented (`src/core/services/`, `forms/`) |
| C5 — Documents and payments | P1 | Requirement and payment domain models | C2 | Implemented (`src/core/documents/`, `payments/`) |
| C6 — Consumer adapters | P1 | DIPINDIA compatibility layer | C3–C5 | Provisional (`src/core/compatibility/`) |
| C7 — Versioned release | P1 | Changelog and consumer contract checks | C6 | Partially implemented (`docs/VERSIONING.md`, contract tests; publish gated) |
| C8 — Advanced domain tooling | P2 | Schema generation and property tests | C7 | Planned |

## P0
- [ ] Map existing DIPINDIA domain modules and data shapes (requires DIPINDIA source access).
- [ ] Identify duplicated definitions and conflicting semantics in DIPINDIA.
- [ ] Capture current DIPINDIA calculations and workflow transitions as golden tests.
- [x] Define package/module format (`dist-lib/` ESM + `.d.ts`, `"exports"` map).
- [x] Define stable identifiers and error/result contracts.
- [x] Define money and time representation (integer paise + strict UTC instants).
- [x] Define application state machine with optimistic concurrency and precondition guards.
- [x] Ensure no framework/storage/provider imports in core (`npm run check:boundaries`).

## P1
- [x] Service catalogue and localization schemas.
- [x] Pricing and tax calculation contracts.
- [x] Form schema and conditional validation.
- [x] Document requirement, expiration, and verification state.
- [x] Order/payment/refund/reconciliation normalized domain models.
- [ ] DIPINDIA adapters verified against live source and consumer contract tests (provisional adapters implemented).
- [x] Semantic versioning and migration notes (`docs/VERSIONING.md`).

## P2
- [ ] Property-based testing.
- [ ] JSON Schema generation.
- [ ] Typed client/code generation.
- [ ] Multi-language schema consumers.
- [x] Core domain event envelopes (`src/core/events/eventEnvelope.ts`).

## Release gates
- Characterization tests prove current behaviour.
- No hidden persistence or network side effects.
- Contract tests pass for all consumers.
- Breaking changes have migration guides.
- No production data or state has been modified.
- Explicit approval before publishing or adopting releases in production.

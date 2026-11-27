# DIP Core — Roadmap

## Milestones

| Milestone | Priority | Result | Depends on |
|---|---|---|---|
| C0 — DIPINDIA domain discovery | P0 | Source map and glossary | DIPINDIA audit |
| C1 — Package foundation | P0 | Typed package, build and test standards | C0 |
| C2 — Common primitives | P0 | IDs, errors, money/time, results | C1 |
| C3 — Workflow contracts | P0 | Application state and transitions | C0–C2 |
| C4 — Catalogue and forms | P1 | Service, pricing and form schemas | C2 |
| C5 — Documents and payments | P1 | Requirement and payment domain models | C2 |
| C6 — Consumer adapters | P1 | DIPINDIA compatibility layer | C3–C5 |
| C7 — Versioned release | P1 | Changelog and consumer contract checks | C6 |
| C8 — Advanced domain tooling | P2 | Schema generation and property tests | C7 |

## P0
- [ ] Map existing DIPINDIA domain modules and data shapes.
- [ ] Identify duplicated definitions and conflicting semantics.
- [ ] Capture current calculations and workflow transitions as tests.
- [ ] Define package/module format.
- [ ] Define stable identifiers and error/result contracts.
- [ ] Define money and time representation.
- [ ] Define application state machine.
- [ ] Ensure no framework/storage/provider imports in core.

## P1
- [ ] Service catalogue and localization schemas.
- [ ] Pricing and tax calculation contracts.
- [ ] Form schema and conditional validation.
- [ ] Document requirement and verification state.
- [ ] Order/payment/refund normalized domain models.
- [ ] DIPINDIA adapters and consumer contract tests.
- [ ] Semantic versioning and migration notes.

## P2
- [ ] Property-based testing.
- [ ] JSON Schema generation.
- [ ] Typed client/code generation.
- [ ] Multi-language schema consumers.
- [ ] Advanced domain event contracts.

## Release gates
- Characterization tests prove current behaviour.
- No hidden persistence or network side effects.
- Contract tests pass for all consumers.
- Breaking changes have migration guides.
- No production data or state has been modified.
- Explicit approval before publishing or adopting releases in production.

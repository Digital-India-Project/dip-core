# DIP Core — Testing & Quality Engineering

## 1. Test Strategy

All automated tests run deterministically on Node.js 22 (`node --test`) against TypeScript compiled via `tsconfig.test.json`, using **synthetic fixtures only**.

- **No production data:** Zero real customer records, Aadhaar/PAN numbers, or live documents.
- **No external calls:** Zero network requests, databases, or payment gateway sandboxes.
- **No framework coupling:** Boundary checks verify `src/core/` remains pure and acyclic.

## 2. Commands

| Script | Command | Purpose |
|---|---|---|
| Type check | `npm run lint` | Runs `tsc --noEmit` across workbench + core |
| Boundary check | `npm run check:boundaries` | Scans `src/core/` for forbidden imports, globals, and circular dependencies |
| Automated tests | `npm test` | Compiles `tsconfig.test.json` and runs unit + contract tests via `node --test` |
| Library build | `npm run build:lib` | Compiles `src/core/` into `dist-lib/` (`NodeNext` ESM + `.d.ts`) |
| Workbench build | `npm run build` | Builds the interactive React/Vite workbench into `dist/` |
| Full verification | `npm run check` | Runs `lint`, `check:boundaries`, `test`, `build:lib`, and `build` sequentially |

## 3. Test Suites

- `tests/unit/common.test.ts`: Tests `Result`/`Option`, all branded ID prefixes, semver checks, integer paise `Money` bounds and `BigInt` rounding (`HALF_UP`, `FLOOR`, `CEIL`), UTC calendar rollover rejection, and `NaN`-safe pagination/sorting.
- `tests/unit/domain-workflows.test.ts`: Tests service pricing quotes, application state transitions + optimistic concurrency, payment/refund invariants + reconciliation, document metadata/expiration/checklist evaluation, conditional form validation + ReDoS pattern guards, identity/partner validation, event envelopes, and sensitive metadata scrubbing.
- `tests/contract/public-api-and-adapters.test.ts`: Verifies public barrel exports, confirms `runContractSelfChecks` is excluded from public exports, validates provisional `DIPINDIA` adapters (`convertRupeesToPaise`, status maps), and checks JSON round-trip serialization.
- `src/core/contracts/selfCheckSuite.ts`: Powers the live in-browser Contract Suite workbench tab.

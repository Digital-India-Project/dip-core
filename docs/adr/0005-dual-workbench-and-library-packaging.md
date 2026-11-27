# ADR-0005: Dual Workbench App & Zero-Dependency Library Packaging

**Status:** Accepted  
**Date:** 2026-11-27  
**Scope:** `package.json`, `tsconfig.lib.json`, `tsconfig.test.json`, `vite.config.ts`

## Context

The repository hosts both an interactive React/Vite workbench (`src/App.tsx`, `src/components/*`) for exploring contracts and the reusable `@dip/core` TypeScript domain library (`src/core/**`). Consumers need standard ESM + `.d.ts` declarations without bundling React or Vite into `dist-lib/`, while the workbench needs Vite to continue building and serving on port 3000.

## Decision

1. Keep a single repository package (`@dip/core`, `"private": true`) rather than introducing a premature monorepo.
2. Separate compilation targets:
   - `tsconfig.lib.json` compiles `src/core/**` (excluding UI-only `selfCheckSuite.ts`) into `dist-lib/` using `NodeNext` ESM + `.d.ts` declarations.
   - `package.json` exposes `exports["."]` pointing to `./dist-lib/index.js` and `./dist-lib/index.d.ts`, with `"sideEffects": false`.
   - `vite build` (`npm run build`) continues to build the interactive workbench into `dist/`.
3. Relative imports inside `src/core/` use `.js` specifiers so both `NodeNext` ESM and Vite/bundler TypeScript resolution work seamlessly.
4. Automated tests compile with `tsconfig.test.json` and run on Node.js 22's built-in `node --test` runner, avoiding extra test framework dependencies.

## Consequences

- Downstream Node/Vite/TypeScript consumers can consume `dist-lib` with full type declarations and zero React/UI leakage.
- The interactive workbench continues to run unchanged via `npm run dev`.

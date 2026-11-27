# ADR-0003: Explicit Result Types & Sanitized Domain Errors

**Status:** Accepted  
**Date:** 2026-11-27  
**Scope:** `src/core/common/result.ts`, `src/core/errors/domainError.ts`

## Context

Throwing untyped exceptions across domain boundaries hides failure modes from callers and risks leaking raw provider payloads, stack traces, or personal/secret metadata into logs or UI responses.

## Decision

1. Domain validation, parsing, and state-transition functions return `Result<T, DomainError>` (or `Result<T, readonly DomainError[]>` for multi-field form validation) instead of throwing exceptions for expected domain failures.
2. `DomainError` uses stable `ErrorCode` string enums (`ERR_*`), optional `fieldPath`, and sanitized `metadata`.
3. `createDomainError()` and `serializeDomainError()` strip prototype-pollution keys (`__proto__`, `constructor`, `prototype`), omit sensitive metadata keys matching `/(token|secret|password|passwd|credential|key|aadhaar|pan|phone|mobile|email|payload|auth|bearer|cookie|session)/i`, and redact secret-like values (e.g. `Bearer ...`, `sk_live_...`, `cfsk_...`).

## Consequences

- Callers must explicitly handle failure branches (`result.ok`).
- Errors are safe to serialize across API and UI boundaries without exposing PII or credentials.
- `dip-security` remains authoritative for authentication and authorization enforcement; `ERR_PERMISSION_DENIED` is a domain contract reference only.

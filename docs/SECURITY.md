# DIP Core — Security Requirements

## 1. Security role

Core is not an authorization authority or secret store. It supplies domain contracts and deterministic validation logic. Enforcement remains at trusted application/API/database boundaries.

## 2. Input trust

- Treat all external data as untrusted.
- Provide runtime schemas for data crossing trust boundaries.
- Enforce size, range, enum and format constraints.
- Reject unknown or malformed critical fields according to documented policy.
- Avoid unsafe regular expressions and unbounded recursion.
- Never evaluate input as code.

## 3. Sensitive data

- Do not store credentials, tokens, private keys or customer records in core.
- Avoid including sensitive values in error objects.
- Use synthetic test fixtures.
- Do not log payloads from identity, payment or verification providers.
- Avoid modelling sensitive personal fields unless the domain requires them and ownership is documented.

## 4. Authorization boundaries

- Core may describe roles, permission names or domain invariants, but it must not be treated as enforcement by itself.
- UI checks are not security controls.
- Every API/database operation must enforce authorization.
- Resource ownership and tenant boundaries must be checked by trusted consumers.

## 5. Financial correctness

- Use integer minor units for money.
- Validate currency and amount ranges.
- Define rounding rules.
- Avoid implicit float conversion.
- Test edge cases, large values, negative values and precision.
- Keep authoritative payment calculations server-side.

## 6. Dependency and supply chain

- Prefer small, maintained dependencies.
- Review lockfile changes.
- Avoid unnecessary runtime packages.
- Run dependency and static checks in CI.
- Use least-privilege workflows.
- No release/publish automation without approval.

## 7. Serialization and errors

- Do not serialize internal secrets or private attributes.
- Use explicit public DTOs.
- Keep error codes stable and messages safe.
- Prevent prototype pollution and unsafe object merging.
- Avoid accepting arbitrary object keys where not required.

## 8. Review checklist

- [ ] Runtime schema exists for untrusted inputs.
- [ ] No secrets or personal records in source/fixtures.
- [ ] No database/network side effects in pure domain modules.
- [ ] Money/time edge cases tested.
- [ ] Authorization enforcement remains in trusted consumers.
- [ ] Errors and serialized outputs are sanitized.
- [ ] Dependencies and workflows reviewed.
- [ ] No production state changed.

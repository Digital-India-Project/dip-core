import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMoney,
  asApplicationId,
  asCorrelationId,
  asCustomerId,
  asEventId,
  asOrderId,
  asProviderReferenceId,
  asTenantId,
  asUserId,
  combineResults,
  compareUtcInstants,
  createMoney,
  createPageRequest,
  equalsMoney,
  err,
  ErrorCode,
  flatMapResult,
  formatInrFromPaise,
  formatSchemaVersion,
  isCompatibleSchemaVersion,
  isInstantExpired,
  mapError,
  mapResult,
  multiplyBasisPoints,
  none,
  ok,
  paginateArray,
  parseBusinessDate,
  parseSchemaVersion,
  parseUtcInstant,
  Result,
  RoundingMode,
  some,
  subtractMoney,
  sumMoney,
  unwrapOr,
} from '../../src/core/index.js';

function expectOk<T, E>(res: Result<T, E>): T {
  if (!res.ok) {
    assert.fail(`Expected ok result, got error: ${JSON.stringify(res.error)}`);
  }
  return res.value;
}

describe('Common Primitives: Result & Option', () => {
  it('supports ok, err, mapResult, flatMapResult, mapError, unwrapOr, and combineResults', () => {
    const r1 = ok(10);
    const r2 = mapResult(r1, (n) => n * 2);
    const r3 = flatMapResult(r2, (n) => (n > 15 ? ok(n + 1) : err('too small')));
    assert.deepEqual(r3, { ok: true, value: 21 });
    assert.equal(unwrapOr(err('boom'), 99), 99);

    const mappedErr = mapError(err('low'), (e) => `wrapped:${e}`);
    assert.deepEqual(mappedErr, { ok: false, error: 'wrapped:low' });

    const combinedOk = combineResults([ok(1), ok(2), ok(3)]);
    assert.deepEqual(combinedOk, { ok: true, value: [1, 2, 3] });

    const combinedErr = combineResults([ok(1), err('e1'), err('e2')]);
    assert.deepEqual(combinedErr, { ok: false, error: ['e1', 'e2'] });

    assert.deepEqual(some('abc'), { some: true, value: 'abc' });
    assert.deepEqual(none(), { some: false });
  });
});

describe('Common Primitives: Branded Identifiers & Semver', () => {
  it('enforces distinct prefixes and rejects cross-entity IDs', () => {
    assert.equal(asApplicationId('app_synth_1001').ok, true);
    assert.equal(asUserId('usr_synth_001').ok, true);
    assert.equal(asCustomerId('cus_synth_001').ok, true);
    assert.equal(asTenantId('ten_synth_dl_01').ok, true);
    assert.equal(asOrderId('ord_synth_5001').ok, true);
    assert.equal(asEventId('evt_synth_001').ok, true);
    assert.equal(asCorrelationId('cor_synth_001').ok, true);

    const bad = asApplicationId('prv_cashfree_123');
    assert.equal(bad.ok, false);
    if (!bad.ok) {
      assert.equal(bad.error.code, ErrorCode.INVALID_IDENTIFIER);
    }
    assert.equal(asProviderReferenceId('prv_cashfree_123').ok, true);
    assert.equal(asUserId(12345).ok, false);
    assert.equal(asUserId('usr_!invalid').ok, false);
  });

  it('validates semver strings and checks backward compatibility', () => {
    const v1 = expectOk(parseSchemaVersion('0.2.0'));
    assert.equal(formatSchemaVersion(v1), '0.2.0');
    assert.equal(isCompatibleSchemaVersion({ major: 0, minor: 1, patch: 0 }, v1), true);
    assert.equal(isCompatibleSchemaVersion({ major: 1, minor: 0, patch: 0 }, v1), false);
    assert.equal(isCompatibleSchemaVersion({ major: 0, minor: 3, patch: 0 }, v1), false);
    assert.equal(parseSchemaVersion('v1.0').ok, false);
  });
});

describe('Common Primitives: Money (Integer Paise)', () => {
  it('rejects floating-point, NaN, negative, and out-of-bounds values', () => {
    for (const bad of [10.5, Number.NaN, Infinity, -1, 1_000_000_000_01, '100']) {
      const res = createMoney(bad);
      assert.equal(res.ok, false);
      if (!res.ok) assert.equal(res.error.code, ErrorCode.INVALID_MONEY_AMOUNT);
    }
  });

  it('performs deterministic BigInt basis-point rounding across HALF_UP, FLOOR, CEIL', () => {
    const m105 = expectOk(createMoney(105));
    assert.equal(expectOk(multiplyBasisPoints(m105, 500, RoundingMode.FLOOR)).minorUnits, 5);
    assert.equal(expectOk(multiplyBasisPoints(m105, 500, RoundingMode.HALF_UP)).minorUnits, 5);
    assert.equal(expectOk(multiplyBasisPoints(m105, 500, RoundingMode.CEIL)).minorUnits, 6);

    const m110 = expectOk(createMoney(110));
    assert.equal(expectOk(multiplyBasisPoints(m110, 500, RoundingMode.FLOOR)).minorUnits, 5);
    assert.equal(expectOk(multiplyBasisPoints(m110, 500, RoundingMode.HALF_UP)).minorUnits, 6);
    assert.equal(expectOk(multiplyBasisPoints(m110, 500, RoundingMode.CEIL)).minorUnits, 6);
  });

  it('supports add, subtract, sumMoney, equalsMoney, and INR formatting', () => {
    const a = expectOk(createMoney(15000));
    const b = expectOk(createMoney(2700));
    const sum = expectOk(addMoney(a, b));
    assert.equal(sum.minorUnits, 17700);

    const diff = subtractMoney(b, a);
    assert.equal(diff.ok, false);

    const listSum = expectOk(sumMoney([a, b]));
    assert.equal(equalsMoney(listSum, sum), true);
    assert.equal(formatInrFromPaise(28400), '₹284.00');
  });
});

describe('Common Primitives: Time & Pagination', () => {
  it('enforces explicit UTC instants and rejects calendar rollovers', () => {
    assert.equal(parseUtcInstant('2026-11-27T09:00:00.000Z').ok, true);
    assert.equal(parseUtcInstant('2026-02-30T00:00:00.000Z').ok, false);
    assert.equal(parseUtcInstant('2026-11-27T09:00:00+05:30').ok, false);
    assert.equal(parseBusinessDate('2024-02-29').ok, true);
    assert.equal(parseBusinessDate('2025-02-29').ok, false);

    const t1 = expectOk(parseUtcInstant('2026-11-27T09:00:00.000Z'));
    const t2 = expectOk(parseUtcInstant('2026-11-27T10:00:00.000Z'));
    assert.equal(compareUtcInstants(t1, t2), -1);
    assert.equal(isInstantExpired(t1, t2), true);
    assert.equal(isInstantExpired(t2, t1), false);
  });

  it('guards paginateArray against NaN and validates sort fields against allowlists', () => {
    const page = paginateArray([1, 2, 3, 4, 5], { page: Number.NaN, pageSize: Number.NaN });
    assert.equal(page.page, 1);
    assert.equal(page.pageSize, 20);
    assert.equal(page.items.length, 5);

    const badSort = createPageRequest({ page: 1, pageSize: 10, sortBy: '__proto__' });
    assert.equal(badSort.ok, false);

    const disallowedSort = createPageRequest(
      { page: 1, pageSize: 10, sortBy: 'secretColumn' },
      ['updatedAt', 'createdAt']
    );
    assert.equal(disallowedSort.ok, false);

    const okSort = createPageRequest(
      { page: 1, pageSize: 10, sortBy: 'updatedAt', sortDirection: 'desc' },
      ['updatedAt', 'createdAt']
    );
    assert.equal(okSort.ok, true);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../src/core/index.js';

import { runContractSelfChecks } from '../../src/core/contracts/selfCheckSuite.js';

describe('Public API & DIPINDIA Compatibility Contract Tests', () => {
  it('exposes expected canonical exports and excludes UI self-check suite from public barrel', () => {
    const exportedKeys = Object.keys(core);
    for (const requiredSymbol of [
      'CORE_CONTRACT_VERSION',
      'ErrorCode',
      'createDomainError',
      'serializeDomainError',
      'createMoney',
      'calculateServiceQuote',
      'transitionApplicationState',
      'transitionPaymentState',
      'reconcilePaymentOrder',
      'transitionDocumentState',
      'evaluateDocumentChecklist',
      'validateFormSubmission',
      'createEventEnvelope',
      'adaptLegacyApplicationToCore',
      'adaptLegacyPaymentOrderToCore',
    ]) {
      assert.ok(exportedKeys.includes(requiredSymbol), `Missing public export: ${requiredSymbol}`);
    }
    assert.equal(exportedKeys.includes('runContractSelfChecks'), false);
  });

  it('converts legacy rupee decimals to integer paise without floating-point drift', () => {
    for (const [rupees, expectedPaise] of [
      [19.99, 1999],
      [0.01, 1],
      [284.0, 28400],
      [100.55, 10055],
    ] as const) {
      const res = core.convertRupeesToPaise(rupees);
      assert.equal(res.ok, true);
      if (res.ok) assert.equal(res.value.minorUnits, expectedPaise);
    }
  });

  it('adapts provisional DIPINDIA application & Cashfree payment shapes cleanly', () => {
    const appRes = core.adaptLegacyApplicationToCore({
      id: '1001',
      userId: 'user_55',
      serviceCodeOrId: 'pan_corr_01',
      legacyStatus: 'action_required',
      isPaid: true,
      docsApproved: false,
      updatedAtIso: '2026-11-27T09:00:00.000Z',
    });
    assert.equal(appRes.ok, true);
    if (appRes.ok) {
      assert.equal(appRes.value.id, 'app_1001');
      assert.equal(appRes.value.state, 'RESUBMISSION_REQUIRED');
      assert.equal(
        core.mapCoreApplicationStatusToLegacy(appRes.value.state),
        'action_required'
      );
    }

    const payRes = core.adaptLegacyPaymentOrderToCore({
      orderId: '5001',
      paymentId: '5001',
      applicationId: '1001',
      cfPaymentId: 'cf_99001',
      orderAmountInr: 284,
      capturedAmountInr: 284,
      refundedAmountInr: 0,
      cfStatus: 'SUCCESS',
      updatedAtIso: '2026-11-27T09:00:00.000Z',
    });
    assert.equal(payRes.ok, true);
    if (payRes.ok) {
      assert.equal(payRes.value.state, 'CAPTURED');
      assert.equal(payRes.value.capturedPaise, 28400);
      assert.equal(payRes.value.providerReferenceId, 'prv_cf_99001');
    }
  });

  it('round-trips serialized DomainDTO objects via JSON without losing contract semantics', () => {
    const serialized = JSON.stringify(core.SYNTHETIC_APPLICATIONS[0]);
    const parsed = JSON.parse(serialized) as core.ApplicationContract;
    const transitioned = core.transitionApplicationState(parsed, {
      targetState: 'SUBMITTED',
      actorRole: 'APPLICANT',
      timestamp: '2026-11-27T09:15:00.000Z' as core.UtcInstant,
    });
    assert.equal(transitioned.ok, true);
    if (transitioned.ok) {
      assert.equal(transitioned.value.application.state, 'SUBMITTED');
    }
  });

  it('passes all workbench contract self-checks', () => {
    const checks = runContractSelfChecks();
    assert.equal(checks.length, 14);
    for (const chk of checks) {
      assert.equal(chk.passed, true, `${chk.id} failed: expected ${chk.expected}, got ${chk.actual}`);
    }
  });
});

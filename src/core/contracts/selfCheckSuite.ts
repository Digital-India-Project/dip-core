import {
  adaptLegacyApplicationToCore,
  adaptLegacyPaymentOrderToCore,
  asApplicationId,
  asCorrelationId,
  asEventId,
  asProviderReferenceId,
  calculateServiceQuote,
  createEventEnvelope,
  createMoney,
  evaluateDocumentChecklist,
  multiplyBasisPoints,
  parseUtcInstant,
  reconcilePaymentOrder,
  RoundingMode,
  serializeDomainError,
  SYNTHETIC_APPLICATIONS,
  SYNTHETIC_DOCUMENT_REQUIREMENTS,
  SYNTHETIC_DOCUMENTS,
  SYNTHETIC_FORM_SCHEMA,
  SYNTHETIC_PAYMENT_ORDERS,
  SYNTHETIC_SERVICES,
  transitionApplicationState,
  transitionDocumentState,
  transitionPaymentState,
  UtcInstant,
  validateFormSubmission,
  createDomainError,
  ErrorCode,
} from '../index.js';

export interface ContractCheckResult {
  readonly id: string;
  readonly module: string;
  readonly name: string;
  readonly passed: boolean;
  readonly expected: string;
  readonly actual: string;
}

const CHECK_TS = '2026-11-27T09:30:00.000Z' as UtcInstant;

export function runContractSelfChecks(): readonly ContractCheckResult[] {
  const results: ContractCheckResult[] = [];

  // 1. Money rejects floating-point inputs
  const floatMoney = createMoney(107.5);
  results.push({
    id: 'CHK-MONEY-01',
    module: 'common/money',
    name: 'Reject non-integer paise amount',
    passed: !floatMoney.ok && floatMoney.error.code === 'ERR_INVALID_MONEY_AMOUNT',
    expected: 'ERR_INVALID_MONEY_AMOUNT',
    actual: floatMoney.ok ? `ok(${floatMoney.value.minorUnits})` : floatMoney.error.code,
  });

  // 2. Deterministic integer basis-point GST calculation
  const panSvc = SYNTHETIC_SERVICES[0];
  const quoteRes = calculateServiceQuote({
    service: panSvc,
    quantity: 1,
    concession: 'NONE',
    roundingMode: RoundingMode.HALF_UP,
  });
  results.push({
    id: 'CHK-PRICE-01',
    module: 'services/pricing',
    name: 'PAN service quote integer paise calculation (10700 + 15000 + 18% GST)',
    passed: quoteRes.ok && quoteRes.value.totalPayable.minorUnits === 28400,
    expected: '28400 paise (₹284.00)',
    actual: quoteRes.ok ? `${quoteRes.value.totalPayable.minorUnits} paise` : quoteRes.error.code,
  });

  // 3. Odd paise HALF_UP vs FLOOR rounding determinism
  const oddAmount = createMoney(101);
  const halfUp = oddAmount.ok
    ? multiplyBasisPoints(oddAmount.value, 500, RoundingMode.HALF_UP)
    : oddAmount;
  const floored = oddAmount.ok
    ? multiplyBasisPoints(oddAmount.value, 500, RoundingMode.FLOOR)
    : oddAmount;
  results.push({
    id: 'CHK-MONEY-02',
    module: 'common/money',
    name: '5% of 101 paise rounds to 5 paise under HALF_UP and FLOOR',
    passed:
      halfUp.ok &&
      floored.ok &&
      halfUp.value.minorUnits === 5 &&
      floored.value.minorUnits === 5,
    expected: '5 paise / 5 paise',
    actual:
      halfUp.ok && floored.ok
        ? `${halfUp.value.minorUnits} paise / ${floored.value.minorUnits} paise`
        : 'error',
  });

  // 4. Distinct branded ID enforcement
  const wrongPrefix = asApplicationId('prv_cashfree_999');
  const rightPrefix = asProviderReferenceId('prv_cashfree_999');
  results.push({
    id: 'CHK-ID-01',
    module: 'common/identifiers',
    name: 'Reject provider ID supplied as ApplicationId',
    passed: !wrongPrefix.ok && wrongPrefix.error.code === 'ERR_INVALID_IDENTIFIER' && rightPrefix.ok,
    expected: 'ERR_INVALID_IDENTIFIER for appId; ok for providerReferenceId',
    actual: wrongPrefix.ok ? 'accepted' : wrongPrefix.error.code,
  });

  // 5. Reject invalid calendar rollover timestamps
  const feb30 = parseUtcInstant('2026-02-30T00:00:00.000Z');
  results.push({
    id: 'CHK-TIME-01',
    module: 'common/time',
    name: 'Reject calendar-rollover UTC instant (Feb 30)',
    passed: !feb30.ok && feb30.error.code === 'ERR_INVALID_TIMESTAMP',
    expected: 'ERR_INVALID_TIMESTAMP',
    actual: feb30.ok ? 'accepted' : feb30.error.code,
  });

  // 6. Application state machine rejects invalid jump DRAFT -> COMPLETED
  const draftApp = SYNTHETIC_APPLICATIONS[0];
  const invalidJump = transitionApplicationState(draftApp, {
    targetState: 'COMPLETED',
    actorRole: 'OPERATOR',
    timestamp: CHECK_TS,
  });
  results.push({
    id: 'CHK-APP-01',
    module: 'applications',
    name: 'Reject direct DRAFT -> COMPLETED state jump',
    passed: !invalidJump.ok && invalidJump.error.code === 'ERR_INVALID_STATE_TRANSITION',
    expected: 'ERR_INVALID_STATE_TRANSITION',
    actual: invalidJump.ok ? 'allowed' : invalidJump.error.code,
  });

  // 7. Application precondition guard on IN_REVIEW without payment
  const unpaidSubmitted = { ...draftApp, state: 'SUBMITTED' as const, paymentCaptured: false };
  const unpaidReview = transitionApplicationState(unpaidSubmitted, {
    targetState: 'IN_REVIEW',
    actorRole: 'SYSTEM',
    timestamp: CHECK_TS,
  });
  results.push({
    id: 'CHK-APP-02',
    module: 'applications',
    name: 'Block IN_REVIEW transition when paymentCaptured is false',
    passed: !unpaidReview.ok && unpaidReview.error.code === 'ERR_PRECONDITION_FAILED',
    expected: 'ERR_PRECONDITION_FAILED',
    actual: unpaidReview.ok ? 'allowed' : unpaidReview.error.code,
  });

  // 8. Optimistic concurrency conflict guard
  const staleVersion = transitionApplicationState(draftApp, {
    targetState: 'SUBMITTED',
    actorRole: 'APPLICANT',
    timestamp: CHECK_TS,
    expectedVersion: 99,
  });
  results.push({
    id: 'CHK-APP-03',
    module: 'applications',
    name: 'Reject stale expectedVersion with ERR_CONCURRENCY_CONFLICT',
    passed: !staleVersion.ok && staleVersion.error.code === 'ERR_CONCURRENCY_CONFLICT',
    expected: 'ERR_CONCURRENCY_CONFLICT',
    actual: staleVersion.ok ? 'allowed' : staleVersion.error.code,
  });

  // 9. Payment refund overflow guard
  const capturedOrder = SYNTHETIC_PAYMENT_ORDERS[1];
  const refundPending = transitionPaymentState(capturedOrder, 'REFUND_PENDING', CHECK_TS);
  const overRefund = refundPending.ok
    ? transitionPaymentState(refundPending.value, 'REFUNDED', CHECK_TS, {
        refundId: 'ref_synth_01' as never,
        amountPaise: capturedOrder.capturedPaise + 100,
        reason: 'Over-refund test',
      })
    : refundPending;
  results.push({
    id: 'CHK-PAY-01',
    module: 'payments',
    name: 'Reject cumulative refund exceeding capturedPaise',
    passed: !overRefund.ok && overRefund.error.code === 'ERR_REFUND_EXCEEDS_CAPTURED',
    expected: 'ERR_REFUND_EXCEEDS_CAPTURED',
    actual: overRefund.ok ? 'allowed' : overRefund.error.code,
  });

  // 10. Payment reconciliation detects amount mismatch
  const reconMismatch = reconcilePaymentOrder({
    localOrder: capturedOrder,
    providerState: 'CAPTURED',
    providerCapturedPaise: capturedOrder.capturedPaise - 100,
    checkedAt: CHECK_TS,
  });
  results.push({
    id: 'CHK-PAY-02',
    module: 'payments',
    name: 'Reconciliation flags AMOUNT_MISMATCH on captured paise discrepancy',
    passed: reconMismatch.status === 'AMOUNT_MISMATCH',
    expected: 'AMOUNT_MISMATCH',
    actual: reconMismatch.status,
  });

  // 11. Form schema rejects unknown fields and prototype pollution keys
  const maliciousPayload = JSON.parse(
    '{"applicantCategory":"INDIVIDUAL","fullName":"Aarav Sample","stateCode":"DL","pinCode":"110001","declaredAnnualIncomeInr":250000,"consentAccepted":true,"unexpectedAdminFlag":true,"__proto__":{"polluted":true}}'
  );
  const formRes = validateFormSubmission(SYNTHETIC_FORM_SCHEMA, maliciousPayload);
  results.push({
    id: 'CHK-FORM-01',
    module: 'forms/security',
    name: 'Reject unknown field and __proto__ key at trust boundary',
    passed:
      !formRes.ok &&
      formRes.error.some((e) => e.code === 'ERR_UNKNOWN_FIELD_REJECTED') &&
      formRes.error.some((e) => e.code === 'ERR_PROTOTYPE_KEY_REJECTED'),
    expected: 'ERR_UNKNOWN_FIELD_REJECTED + ERR_PROTOTYPE_KEY_REJECTED',
    actual: formRes.ok ? 'accepted' : formRes.error.map((e) => e.code).join(' + '),
  });

  // 12. Document rejection requires reason + checklist catches incomplete docs
  const uploadedDoc = SYNTHETIC_DOCUMENTS[0];
  const underReview = transitionDocumentState(uploadedDoc, 'UNDER_REVIEW', CHECK_TS);
  const rejectedWithoutReason = underReview.ok
    ? transitionDocumentState(underReview.value, 'REJECTED', CHECK_TS, '')
    : underReview;
  const checklist = evaluateDocumentChecklist(
    SYNTHETIC_DOCUMENT_REQUIREMENTS,
    SYNTHETIC_DOCUMENTS,
    CHECK_TS
  );
  results.push({
    id: 'CHK-DOC-01',
    module: 'documents',
    name: 'Require rejectionReason and flag incomplete mandatory document checklist',
    passed:
      !rejectedWithoutReason.ok &&
      rejectedWithoutReason.error.code === 'ERR_PRECONDITION_FAILED' &&
      !checklist.complete &&
      checklist.missingMandatoryCodes.length === 2,
    expected: 'ERR_PRECONDITION_FAILED + 2 missing mandatory docs',
    actual: rejectedWithoutReason.ok
      ? 'allowed'
      : `${rejectedWithoutReason.error.code} + ${checklist.missingMandatoryCodes.length} missing`,
  });

  // 13. Event envelope + error metadata scrubbing
  const evtId = asEventId('evt_synth_001');
  const corId = asCorrelationId('cor_synth_001');
  const evtRes =
    evtId.ok && corId.ok
      ? createEventEnvelope({
          eventId: evtId.value,
          eventType: 'dip.application.transitioned',
          eventVersion: '0.2.0',
          occurredAt: CHECK_TS,
          correlationId: corId.value,
          sourceModule: 'applications',
          payload: { state: 'SUBMITTED' },
        })
      : null;
  const scrubbedErr = serializeDomainError(
    createDomainError(ErrorCode.SCHEMA_VALIDATION_FAILED, 'Check', 'field', {
      safeCount: 3,
      accessToken: 'should_strip',
      debugDetail: 'Bearer secret_xyz',
    })
  );
  results.push({
    id: 'CHK-EVT-01',
    module: 'events/security',
    name: 'Validate event envelope and scrub sensitive error metadata keys/values',
    passed:
      Boolean(evtRes?.ok) &&
      scrubbedErr.metadata?.safeCount === 3 &&
      scrubbedErr.metadata?.accessToken === undefined &&
      scrubbedErr.metadata?.debugDetail === '[REDACTED]',
    expected: 'valid envelope + scrubbed secret metadata',
    actual: `evt=${Boolean(evtRes?.ok)}, debugDetail=${String(scrubbedErr.metadata?.debugDetail)}`,
  });

  // 14. Provisional DIPINDIA compatibility adapters (rupees -> paise + status map)
  const adaptedApp = adaptLegacyApplicationToCore({
    id: 'legacy_901',
    userId: 'user_77',
    serviceCodeOrId: 'pan_corr',
    legacyStatus: 'under_review',
    isPaid: true,
    docsApproved: false,
    updatedAtIso: CHECK_TS,
  });
  const adaptedPay = adaptLegacyPaymentOrderToCore({
    orderId: 'order_19',
    paymentId: 'pay_legacy_19',
    applicationId: 'app_legacy_901',
    orderAmountInr: 19.99,
    capturedAmountInr: 19.99,
    refundedAmountInr: 0,
    cfStatus: 'PAID',
    updatedAtIso: CHECK_TS,
  });
  results.push({
    id: 'CHK-ADAPT-01',
    module: 'compatibility/adapters',
    name: 'Adapt legacy DIPINDIA shapes and convert ₹19.99 -> 1999 paise without float drift',
    passed:
      adaptedApp.ok &&
      adaptedApp.value.state === 'IN_REVIEW' &&
      adaptedPay.ok &&
      adaptedPay.value.amount.minorUnits === 1999 &&
      adaptedPay.value.state === 'CAPTURED',
    expected: 'IN_REVIEW + 1999 paise + CAPTURED',
    actual:
      adaptedApp.ok && adaptedPay.ok
        ? `${adaptedApp.value.state} + ${adaptedPay.value.amount.minorUnits} paise + ${adaptedPay.value.state}`
        : 'error',
  });

  return results;
}

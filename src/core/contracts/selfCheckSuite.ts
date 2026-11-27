import {
  asApplicationId,
  asProviderReferenceId,
  calculateServiceQuote,
  createMoney,
  multiplyBasisPoints,
  RoundingMode,
  SYNTHETIC_APPLICATIONS,
  SYNTHETIC_DOCUMENTS,
  SYNTHETIC_FORM_SCHEMA,
  SYNTHETIC_PAYMENT_ORDERS,
  SYNTHETIC_SERVICES,
  transitionApplicationState,
  transitionDocumentState,
  transitionPaymentState,
  UtcInstant,
  validateFormSubmission,
} from '../index';

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

  // 5. Application state machine rejects invalid jump DRAFT -> COMPLETED
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

  // 6. Application precondition guard on IN_REVIEW without payment
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

  // 7. Payment refund overflow guard
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

  // 8. Form schema rejects unknown fields and prototype pollution keys
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

  // 9. Document rejection requires reason
  const uploadedDoc = SYNTHETIC_DOCUMENTS[0];
  const underReview = transitionDocumentState(uploadedDoc, 'UNDER_REVIEW', CHECK_TS);
  const rejectedWithoutReason = underReview.ok
    ? transitionDocumentState(underReview.value, 'REJECTED', CHECK_TS, '')
    : underReview;
  results.push({
    id: 'CHK-DOC-01',
    module: 'documents',
    name: 'Require rejectionReason when rejecting uploaded document',
    passed:
      !rejectedWithoutReason.ok &&
      rejectedWithoutReason.error.code === 'ERR_PRECONDITION_FAILED',
    expected: 'ERR_PRECONDITION_FAILED',
    actual: rejectedWithoutReason.ok ? 'allowed' : rejectedWithoutReason.error.code,
  });

  return results;
}

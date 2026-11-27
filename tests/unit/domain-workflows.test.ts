import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  asAuditEventId,
  asCorrelationId,
  asEventId,
  asNotificationId,
  asRefundId,
  calculateServiceQuote,
  checkFormSchemaCompatibility,
  createAuditEvent,
  createDomainError,
  createEventEnvelope,
  createNotificationRequest,
  ErrorCode,
  evaluateDocumentChecklist,
  FormSchemaContract,
  isDocumentExpired,
  isTerminalApplicationState,
  reconcilePaymentOrder,
  Result,
  RoundingMode,
  serializeDomainError,
  SYNTHETIC_APPLICATIONS,
  SYNTHETIC_BUSINESS_REF,
  SYNTHETIC_DOCUMENT_REQUIREMENTS,
  SYNTHETIC_DOCUMENTS,
  SYNTHETIC_FORM_SCHEMA,
  SYNTHETIC_PARTNERS,
  SYNTHETIC_PAYMENT_ORDERS,
  SYNTHETIC_SERVICES,
  SYNTHETIC_TENANT_CONTEXT,
  transitionApplicationState,
  transitionDocumentState,
  transitionPaymentState,
  UtcInstant,
  validateBusinessReference,
  validateDocumentMetadata,
  validateFormSubmission,
  validatePartnerContract,
  validateTenantContext,
} from '../../src/core/index.js';

function expectOk<T, E>(res: Result<T, E>): T {
  if (!res.ok) {
    assert.fail(`Expected ok result, got error: ${JSON.stringify(res.error)}`);
  }
  return res.value;
}

const TS = '2026-11-27T10:00:00.000Z' as UtcInstant;
const PAST_TS = '2025-01-01T00:00:00.000Z' as UtcInstant;
const FUTURE_TS = '2027-01-01T00:00:00.000Z' as UtcInstant;

describe('Services & Pricing Domain', () => {
  it('computes deterministic GST and concession quotes on ACTIVE services', () => {
    const pan = SYNTHETIC_SERVICES[0];
    const quote = expectOk(
      calculateServiceQuote({
        service: pan,
        quantity: 2,
        concession: 'SENIOR_CITIZEN_10',
        roundingMode: RoundingMode.HALF_UP,
      })
    );
    assert.equal(quote.statutorySubtotal.minorUnits, 21400);
    assert.equal(quote.concessionDiscount.minorUnits, 3000);
    assert.equal(quote.facilitationTaxable.minorUnits, 27000);
    assert.equal(quote.gstAmount.minorUnits, 4860);
    assert.equal(quote.totalPayable.minorUnits, 53260);
  });

  it('rejects services in MAINTENANCE state and invalid quantities', () => {
    const maintSvc = SYNTHETIC_SERVICES[3];
    const r1 = calculateServiceQuote({
      service: maintSvc,
      quantity: 1,
      concession: 'NONE',
      roundingMode: RoundingMode.HALF_UP,
    });
    assert.equal(r1.ok, false);
    if (!r1.ok) assert.equal(r1.error.code, ErrorCode.SERVICE_UNAVAILABLE);

    const r2 = calculateServiceQuote({
      service: SYNTHETIC_SERVICES[0],
      quantity: 51,
      concession: 'NONE',
      roundingMode: RoundingMode.HALF_UP,
    });
    assert.equal(r2.ok, false);
    if (!r2.ok) assert.equal(r2.error.code, ErrorCode.SCHEMA_VALIDATION_FAILED);
  });
});

describe('Application Lifecycle State Machine', () => {
  it('enforces valid transitions, preconditions, role restrictions, and optimistic locking', () => {
    const draft = SYNTHETIC_APPLICATIONS[0];
    const submitted = expectOk(
      transitionApplicationState(draft, {
        targetState: 'SUBMITTED',
        actorRole: 'APPLICANT',
        timestamp: TS,
        expectedVersion: 1,
      })
    );
    assert.equal(submitted.application.version, 2);

    const stale = transitionApplicationState(submitted.application, {
      targetState: 'PAYMENT_PENDING',
      actorRole: 'SYSTEM',
      timestamp: TS,
      expectedVersion: 1,
    });
    assert.equal(stale.ok, false);
    if (!stale.ok) assert.equal(stale.error.code, ErrorCode.CONCURRENCY_CONFLICT);

    const paidDocsApp = {
      ...submitted.application,
      state: 'IN_REVIEW' as const,
      paymentCaptured: true,
      requiredDocumentsVerified: true,
    };
    const applicantApprove = transitionApplicationState(paidDocsApp, {
      targetState: 'APPROVED',
      actorRole: 'APPLICANT',
      timestamp: TS,
    });
    assert.equal(applicantApprove.ok, false);

    const approved = expectOk(
      transitionApplicationState(paidDocsApp, {
        targetState: 'APPROVED',
        actorRole: 'VERIFIER',
        timestamp: TS,
      })
    );
    const completed = expectOk(
      transitionApplicationState(approved.application, {
        targetState: 'COMPLETED',
        actorRole: 'SYSTEM',
        timestamp: TS,
      })
    );
    assert.equal(isTerminalApplicationState(completed.application.state), true);
  });
});

describe('Payment & Reconciliation Contracts', () => {
  it('tracks partial and full refunds without exceeding capturedPaise', () => {
    const captured = SYNTHETIC_PAYMENT_ORDERS[1];
    const rp1 = expectOk(transitionPaymentState(captured, 'REFUND_PENDING', TS));
    const refundId = expectOk(asRefundId('ref_synth_01'));

    const partial = expectOk(
      transitionPaymentState(rp1, 'PARTIALLY_REFUNDED', TS, {
        refundId,
        amountPaise: 4300,
        reason: 'Partial fee adjustment',
      })
    );
    assert.equal(partial.refundedPaise, 4300);

    const rp2 = expectOk(transitionPaymentState(partial, 'REFUND_PENDING', TS));
    const full = expectOk(
      transitionPaymentState(rp2, 'REFUNDED', TS, {
        refundId,
        amountPaise: 10000,
        reason: 'Final remaining balance',
      })
    );
    assert.equal(full.refundedPaise, 14300);
  });

  it('reconciles local orders against provider snapshots', () => {
    const captured = SYNTHETIC_PAYMENT_ORDERS[1];
    assert.equal(
      reconcilePaymentOrder({
        localOrder: captured,
        providerState: 'CAPTURED',
        providerCapturedPaise: 14300,
        checkedAt: TS,
      }).status,
      'MATCHED'
    );
    assert.equal(
      reconcilePaymentOrder({
        localOrder: captured,
        providerState: 'PENDING',
        providerCapturedPaise: 14300,
        checkedAt: TS,
      }).status,
      'STATE_MISMATCH'
    );
    assert.equal(
      reconcilePaymentOrder({
        providerState: 'CAPTURED',
        providerCapturedPaise: 14300,
        checkedAt: TS,
      }).status,
      'MISSING_LOCAL'
    );
  });
});

describe('Document & Verification Contracts', () => {
  it('validates MIME/size constraints, expiration, and mandatory checklist completeness', () => {
    const req = SYNTHETIC_DOCUMENT_REQUIREMENTS[0];
    assert.equal(validateDocumentMetadata(req, 'application/pdf', 1024).ok, true);
    assert.equal(validateDocumentMetadata(req, 'application/zip', 1024).ok, false);
    assert.equal(validateDocumentMetadata(req, 'application/pdf', req.maxSizeBytes + 1).ok, false);

    const expiredDoc = {
      ...SYNTHETIC_DOCUMENTS[0],
      state: 'UNDER_REVIEW' as const,
      expiration: { expiresAt: PAST_TS },
    };
    assert.equal(isDocumentExpired(expiredDoc, TS), true);
    const verifyExpired = transitionDocumentState(expiredDoc, 'VERIFIED', TS);
    assert.equal(verifyExpired.ok, false);
    if (!verifyExpired.ok) assert.equal(verifyExpired.error.code, ErrorCode.EXPIRED);

    const validDocs = [
      {
        ...SYNTHETIC_DOCUMENTS[0],
        state: 'VERIFIED' as const,
        expiration: { expiresAt: FUTURE_TS },
      },
      {
        ...SYNTHETIC_DOCUMENTS[1],
        state: 'VERIFIED' as const,
      },
    ];
    const evalRes = evaluateDocumentChecklist(SYNTHETIC_DOCUMENT_REQUIREMENTS, validDocs, TS);
    assert.equal(evalRes.complete, true);
    assert.equal(evalRes.missingMandatoryCodes.length, 0);
  });
});

describe('Forms, Identity, Partners, Events & Error Sanitization', () => {
  it('validates conditional forms, serializable patternSource, and schema compatibility', () => {
    const validIndividual = validateFormSubmission(SYNTHETIC_FORM_SCHEMA, {
      applicantCategory: 'INDIVIDUAL',
      fullName: 'Meera Sample',
      stateCode: 'DL',
      pinCode: '110001',
      declaredAnnualIncomeInr: 320000,
      consentAccepted: true,
    });
    assert.equal(validIndividual.ok, true);

    const serializableSchema: FormSchemaContract = {
      schemaId: 'dip.contact.v1',
      version: '1.0.0',
      allowUnknownKeys: false,
      fields: [
        { key: 'email', label: 'Email', kind: 'email', required: true },
        { key: 'mobile', label: 'Mobile', kind: 'phone', required: true },
        { key: 'pin', label: 'PIN', kind: 'pin', required: true },
        {
          key: 'code',
          label: 'Code',
          kind: 'text',
          required: true,
          patternSource: '^[A-Z]{3}-[0-9]{3}$',
        },
      ],
    };
    const contactOk = validateFormSubmission(serializableSchema, {
      email: 'citizen@example.invalid',
      mobile: '9876543210',
      pin: '560001',
      code: 'DIP-101',
    });
    assert.equal(contactOk.ok, true);

    assert.equal(checkFormSchemaCompatibility(serializableSchema, '1.2.0').compatible, true);
    assert.equal(checkFormSchemaCompatibility(serializableSchema, '2.0.0').compatible, false);
  });

  it('validates identity, tenant, partner, event, audit, notification, and scrubbed errors', () => {
    assert.equal(validateTenantContext(SYNTHETIC_TENANT_CONTEXT).ok, true);
    assert.equal(validateBusinessReference(SYNTHETIC_BUSINESS_REF).ok, true);
    assert.equal(validatePartnerContract(SYNTHETIC_PARTNERS[0]).ok, true);

    const evtId = expectOk(asEventId('evt_synth_100'));
    const audId = expectOk(asAuditEventId('aud_synth_100'));
    const ntfId = expectOk(asNotificationId('ntf_synth_100'));
    const corId = expectOk(asCorrelationId('cor_synth_100'));

    const env = createEventEnvelope({
      eventId: evtId,
      eventType: 'dip.application.submitted',
      eventVersion: '0.2.0',
      occurredAt: TS,
      correlationId: corId,
      sourceModule: 'applications',
      payload: { applicationId: 'app_synth_1001' },
    });
    assert.equal(env.ok, true);

    const aud = expectOk(
      createAuditEvent({
        auditId: audId,
        correlationId: corId,
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        action: 'APPLICATION_SUBMITTED',
        targetEntityType: 'Application',
        targetEntityId: 'app_synth_1001',
        outcome: 'SUCCESS',
        occurredAt: TS,
        summary: 'Application moved to submitted state.',
        metadata: { aadhaarNumber: 'should_not_appear', stage: 'SUBMITTED' },
      })
    );
    assert.equal(aud.metadata?.aadhaarNumber, undefined);
    assert.equal(aud.metadata?.stage, 'SUBMITTED');

    const ntf = createNotificationRequest({
      notificationId: ntfId,
      correlationId: corId,
      recipientRef: SYNTHETIC_APPLICATIONS[0].applicantId,
      channel: 'IN_APP',
      templateCode: 'APP_SUBMITTED_ACK',
      locale: 'hi',
      requestedAt: TS,
      templateVariables: { applicationRef: 'app_synth_1001' },
    });
    assert.equal(ntf.ok, true);

    const serializedErr = serializeDomainError(
      createDomainError(ErrorCode.CONFLICT, 'Duplicate order', 'orderId', {
        secretToken: 'hidden',
        authHeader: 'Bearer abc123',
        debugDetail: 'Bearer abc123',
        retryCount: 1,
      })
    );
    assert.equal(serializedErr.category, 'CONFLICT');
    assert.equal(serializedErr.metadata?.secretToken, undefined);
    assert.equal(serializedErr.metadata?.authHeader, undefined);
    assert.equal(serializedErr.metadata?.debugDetail, '[REDACTED]');
    assert.equal(serializedErr.metadata?.retryCount, 1);
  });
});

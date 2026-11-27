import { ApplicationContract, ApplicationState } from '../applications/applicationLifecycle.js';
import {
  ApplicationId,
  asApplicationId,
  asOrderId,
  asPaymentId,
  asProviderReferenceId,
  asServiceId,
  asUserId,
  OrderId,
  PaymentId,
  ProviderReferenceId,
  ServiceId,
  UserId,
} from '../common/identifiers.js';
import { createMoney, Money } from '../common/money.js';
import { err, ok, Result } from '../common/result.js';
import { parseUtcInstant, UtcInstant } from '../common/time.js';
import { createDomainError, DomainError, ErrorCode } from '../errors/domainError.js';
import { PaymentOrderContract, PaymentState } from '../payments/paymentLifecycle.js';

/**
 * PROVISIONAL ANTI-CORRUPTION ADAPTERS FOR DIPINDIA INTEGRATION READINESS
 *
 * Notice: Source access to the DIPINDIA repository was unavailable in this environment.
 * These adapters define safe, reversible boundary mappings and must be validated
 * against actual DIPINDIA source files and characterization fixtures before cutover.
 */

export interface LegacyDipindiaApplicationShape {
  readonly id: string;
  readonly userId: string;
  readonly serviceCodeOrId: string;
  readonly legacyStatus: string;
  readonly isPaid: boolean;
  readonly docsApproved: boolean;
  readonly updatedAtIso: string;
}

export interface LegacyCashfreeOrderShape {
  readonly orderId: string;
  readonly paymentId: string;
  readonly applicationId: string;
  readonly cfPaymentId?: string;
  readonly orderAmountInr: number; // Legacy rupee float or decimal
  readonly capturedAmountInr: number;
  readonly refundedAmountInr: number;
  readonly cfStatus: string;
  readonly updatedAtIso: string;
}

const LEGACY_APP_STATUS_MAP: Readonly<Record<string, ApplicationState>> = {
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  pending_payment: 'PAYMENT_PENDING',
  payment_pending: 'PAYMENT_PENDING',
  under_review: 'IN_REVIEW',
  in_review: 'IN_REVIEW',
  action_required: 'RESUBMISSION_REQUIRED',
  resubmission_required: 'RESUBMISSION_REQUIRED',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  cancelled: 'CANCELLED',
  completed: 'COMPLETED',
};

const CORE_TO_LEGACY_APP_STATUS_MAP: Readonly<Record<ApplicationState, string>> = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PAYMENT_PENDING: 'pending_payment',
  IN_REVIEW: 'under_review',
  RESUBMISSION_REQUIRED: 'action_required',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

const LEGACY_PAYMENT_STATUS_MAP: Readonly<Record<string, PaymentState>> = {
  ACTIVE: 'CREATED',
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  PAID: 'CAPTURED',
  SUCCESS: 'CAPTURED',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  USER_DROPPED: 'FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
};

function normalizeBrandedOrPrefix(
  raw: string,
  expectedPrefix: 'app' | 'usr' | 'svc' | 'ord' | 'pay' | 'prv'
): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith(`${expectedPrefix}_`)) {
    return trimmed;
  }
  return `${expectedPrefix}_${trimmed}`;
}

export function mapLegacyApplicationStatus(legacyStatus: string): Result<ApplicationState, DomainError> {
  const key = legacyStatus.trim().toLowerCase();
  const mapped = LEGACY_APP_STATUS_MAP[key];
  if (!mapped) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        `Unmapped legacy DIPINDIA application status "${legacyStatus}".`,
        'legacyStatus'
      )
    );
  }
  return ok(mapped);
}

export function mapCoreApplicationStatusToLegacy(state: ApplicationState): string {
  return CORE_TO_LEGACY_APP_STATUS_MAP[state];
}

export function adaptLegacyApplicationToCore(
  legacy: LegacyDipindiaApplicationShape
): Result<ApplicationContract, DomainError> {
  const appIdRes = asApplicationId(normalizeBrandedOrPrefix(legacy.id, 'app'), 'id');
  if (!appIdRes.ok) return appIdRes;

  const userIdRes = asUserId(normalizeBrandedOrPrefix(legacy.userId, 'usr'), 'userId');
  if (!userIdRes.ok) return userIdRes;

  const svcIdRes = asServiceId(
    normalizeBrandedOrPrefix(legacy.serviceCodeOrId, 'svc'),
    'serviceCodeOrId'
  );
  if (!svcIdRes.ok) return svcIdRes;

  const statusRes = mapLegacyApplicationStatus(legacy.legacyStatus);
  if (!statusRes.ok) return statusRes;

  const tsRes = parseUtcInstant(legacy.updatedAtIso, 'updatedAtIso');
  if (!tsRes.ok) return tsRes;

  return ok({
    id: appIdRes.value as ApplicationId,
    applicantId: userIdRes.value as UserId,
    serviceId: svcIdRes.value as ServiceId,
    state: statusRes.value,
    version: 1,
    paymentCaptured: legacy.isPaid,
    requiredDocumentsVerified: legacy.docsApproved,
    updatedAt: tsRes.value as UtcInstant,
  });
}

export function convertRupeesToPaise(
  rupees: number,
  fieldPath = 'amountInr'
): Result<Money, DomainError> {
  if (typeof rupees !== 'number' || !Number.isFinite(rupees) || rupees < 0) {
    return err(
      createDomainError(
        ErrorCode.INVALID_MONEY_AMOUNT,
        'Legacy rupee amount must be a finite non-negative number.',
        fieldPath
      )
    );
  }
  // Convert to integer paise at trust boundary via decimal string rounding
  // to avoid binary floating-point drift (e.g., 19.99 * 100 = 1998.9999999999998).
  const fixed = rupees.toFixed(2);
  const [wholePart, fracPart] = fixed.split('.');
  const paise = Number(wholePart) * 100 + Number(fracPart);
  return createMoney(paise, 'INR', fieldPath);
}

export function mapLegacyPaymentStatus(cfStatus: string): Result<PaymentState, DomainError> {
  const key = cfStatus.trim().toUpperCase();
  const mapped = LEGACY_PAYMENT_STATUS_MAP[key];
  if (!mapped) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        `Unmapped provider payment status "${cfStatus}".`,
        'cfStatus'
      )
    );
  }
  return ok(mapped);
}

export function adaptLegacyPaymentOrderToCore(
  legacy: LegacyCashfreeOrderShape
): Result<PaymentOrderContract, DomainError> {
  const ordRes = asOrderId(normalizeBrandedOrPrefix(legacy.orderId, 'ord'), 'orderId');
  if (!ordRes.ok) return ordRes;

  const payRes = asPaymentId(normalizeBrandedOrPrefix(legacy.paymentId, 'pay'), 'paymentId');
  if (!payRes.ok) return payRes;

  const appRes = asApplicationId(
    normalizeBrandedOrPrefix(legacy.applicationId, 'app'),
    'applicationId'
  );
  if (!appRes.ok) return appRes;

  let prvId: ProviderReferenceId | undefined;
  if (legacy.cfPaymentId) {
    const prvRes = asProviderReferenceId(
      normalizeBrandedOrPrefix(legacy.cfPaymentId, 'prv'),
      'cfPaymentId'
    );
    if (!prvRes.ok) return prvRes;
    prvId = prvRes.value;
  }

  const orderMoneyRes = convertRupeesToPaise(legacy.orderAmountInr, 'orderAmountInr');
  if (!orderMoneyRes.ok) return orderMoneyRes;

  const capturedMoneyRes = convertRupeesToPaise(legacy.capturedAmountInr, 'capturedAmountInr');
  if (!capturedMoneyRes.ok) return capturedMoneyRes;

  const refundedMoneyRes = convertRupeesToPaise(legacy.refundedAmountInr, 'refundedAmountInr');
  if (!refundedMoneyRes.ok) return refundedMoneyRes;

  const stateRes = mapLegacyPaymentStatus(legacy.cfStatus);
  if (!stateRes.ok) return stateRes;

  const tsRes = parseUtcInstant(legacy.updatedAtIso, 'updatedAtIso');
  if (!tsRes.ok) return tsRes;

  return ok({
    orderId: ordRes.value as OrderId,
    paymentId: payRes.value as PaymentId,
    applicationId: appRes.value as ApplicationId,
    ...(prvId !== undefined ? { providerReferenceId: prvId } : {}),
    amount: orderMoneyRes.value,
    capturedPaise: capturedMoneyRes.value.minorUnits,
    refundedPaise: refundedMoneyRes.value.minorUnits,
    state: stateRes.value,
    updatedAt: tsRes.value,
  });
}

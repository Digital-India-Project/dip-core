import {
  ApplicationId,
  IdempotencyKey,
  OrderId,
  PaymentId,
  ProviderReferenceId,
  RefundId,
} from '../common/identifiers.js';
import { createMoney, Money } from '../common/money.js';
import { err, ok, Result } from '../common/result.js';
import { UtcInstant } from '../common/time.js';
import { createDomainError, DomainError, ErrorCode } from '../errors/domainError.js';

export type PaymentState =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type PaymentFailureCategory =
  | 'USER_ABORTED'
  | 'GATEWAY_DECLINED'
  | 'INSUFFICIENT_FUNDS'
  | 'TIMEOUT'
  | 'BANK_SYSTEM_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export interface OrderReference {
  readonly orderId: OrderId;
  readonly applicationId: ApplicationId;
  readonly amount: Money;
}

export interface IdempotencyReference {
  readonly key: IdempotencyKey;
  readonly operation: 'CREATE_ORDER' | 'CAPTURE_PAYMENT' | 'INITIATE_REFUND';
  readonly createdAt: UtcInstant;
}

export interface PaymentOrderContract {
  readonly orderId: OrderId;
  readonly paymentId: PaymentId;
  readonly applicationId: ApplicationId;
  readonly providerReferenceId?: ProviderReferenceId;
  readonly idempotencyKey?: IdempotencyKey;
  readonly amount: Money;
  readonly capturedPaise: number;
  readonly refundedPaise: number;
  readonly state: PaymentState;
  readonly failureCategory?: PaymentFailureCategory;
  readonly updatedAt: UtcInstant;
}

export interface RefundRequestContract {
  readonly refundId: RefundId;
  readonly amountPaise: number;
  readonly reason: string;
}

export interface PaymentLifecycleEvent {
  readonly orderId: OrderId;
  readonly paymentId: PaymentId;
  readonly previousState: PaymentState;
  readonly nextState: PaymentState;
  readonly capturedPaise: number;
  readonly refundedPaise: number;
  readonly occurredAt: UtcInstant;
}

export type ReconciliationStatus =
  | 'MATCHED'
  | 'AMOUNT_MISMATCH'
  | 'STATE_MISMATCH'
  | 'MISSING_LOCAL'
  | 'MISSING_PROVIDER';

export interface ReconciliationInput {
  readonly localOrder?: PaymentOrderContract;
  readonly providerState?: PaymentState;
  readonly providerCapturedPaise?: number;
  readonly checkedAt: UtcInstant;
}

export interface ReconciliationResult {
  readonly status: ReconciliationStatus;
  readonly checkedAt: UtcInstant;
  readonly orderId?: OrderId;
  readonly discrepancies: readonly string[];
}

export const PAYMENT_ALLOWED_TRANSITIONS: Readonly<
  Record<PaymentState, readonly PaymentState[]>
> = {
  CREATED: ['PENDING', 'FAILED'],
  PENDING: ['AUTHORIZED', 'CAPTURED', 'FAILED'],
  AUTHORIZED: ['CAPTURED', 'FAILED'],
  CAPTURED: ['REFUND_PENDING'],
  FAILED: [],
  REFUND_PENDING: ['PARTIALLY_REFUNDED', 'REFUNDED', 'CAPTURED'],
  PARTIALLY_REFUNDED: ['REFUND_PENDING'],
  REFUNDED: [],
};

export function validatePaymentOrder(
  order: PaymentOrderContract
): Result<PaymentOrderContract, DomainError> {
  const validAmount = createMoney(order.amount.minorUnits, order.amount.currency, 'amount');
  if (!validAmount.ok) return validAmount;

  if (!Number.isInteger(order.capturedPaise) || order.capturedPaise < 0) {
    return err(
      createDomainError(
        ErrorCode.INVALID_MONEY_AMOUNT,
        'capturedPaise must be a non-negative integer.',
        'capturedPaise'
      )
    );
  }
  if (order.capturedPaise > order.amount.minorUnits) {
    return err(
      createDomainError(
        ErrorCode.INVALID_MONEY_AMOUNT,
        'capturedPaise cannot exceed order amount.',
        'capturedPaise'
      )
    );
  }
  if (!Number.isInteger(order.refundedPaise) || order.refundedPaise < 0) {
    return err(
      createDomainError(
        ErrorCode.INVALID_MONEY_AMOUNT,
        'refundedPaise must be a non-negative integer.',
        'refundedPaise'
      )
    );
  }
  if (order.refundedPaise > order.capturedPaise) {
    return err(
      createDomainError(
        ErrorCode.REFUND_EXCEEDS_CAPTURED,
        'refundedPaise cannot exceed capturedPaise.',
        'refundedPaise'
      )
    );
  }
  return ok(order);
}

export function transitionPaymentState(
  current: PaymentOrderContract,
  nextState: PaymentState,
  timestamp: UtcInstant,
  refund?: RefundRequestContract
): Result<PaymentOrderContract, DomainError> {
  const validCurrent = validatePaymentOrder(current);
  if (!validCurrent.ok) return validCurrent;

  const allowed = PAYMENT_ALLOWED_TRANSITIONS[current.state];
  if (!allowed.includes(nextState)) {
    return err(
      createDomainError(
        ErrorCode.INVALID_STATE_TRANSITION,
        `Payment transition ${current.state} -> ${nextState} is not allowed.`,
        'state',
        { from: current.state, to: nextState }
      )
    );
  }

  let capturedPaise = current.capturedPaise;
  let refundedPaise = current.refundedPaise;

  if (nextState === 'CAPTURED' && current.state !== 'REFUND_PENDING') {
    capturedPaise = current.amount.minorUnits;
  }

  if (nextState === 'PARTIALLY_REFUNDED' || nextState === 'REFUNDED') {
    if (!refund || !Number.isInteger(refund.amountPaise) || refund.amountPaise <= 0) {
      return err(
        createDomainError(
          ErrorCode.INVALID_MONEY_AMOUNT,
          'Refund requires a positive integer minor-unit amount.',
          'refund.amountPaise'
        )
      );
    }
    if (!refund.reason || refund.reason.trim().length < 5) {
      return err(
        createDomainError(
          ErrorCode.PRECONDITION_FAILED,
          'Refund requires a reason (minimum 5 characters).',
          'refund.reason'
        )
      );
    }
    const nextRefundTotal = current.refundedPaise + refund.amountPaise;
    if (nextRefundTotal > current.capturedPaise) {
      return err(
        createDomainError(
          ErrorCode.REFUND_EXCEEDS_CAPTURED,
          'Cumulative refund cannot exceed captured paise.',
          'refund.amountPaise',
          { capturedPaise: current.capturedPaise, attemptedRefundTotal: nextRefundTotal }
        )
      );
    }
    if (nextState === 'REFUNDED' && nextRefundTotal !== current.capturedPaise) {
      return err(
        createDomainError(
          ErrorCode.PRECONDITION_FAILED,
          'Full REFUNDED state requires cumulative refunds to equal capturedPaise.',
          'state'
        )
      );
    }
    if (nextState === 'PARTIALLY_REFUNDED' && nextRefundTotal === current.capturedPaise) {
      return err(
        createDomainError(
          ErrorCode.PRECONDITION_FAILED,
          'Use REFUNDED when the entire captured amount has been refunded.',
          'state'
        )
      );
    }
    refundedPaise = nextRefundTotal;
  }

  return ok({
    ...current,
    capturedPaise,
    refundedPaise,
    state: nextState,
    updatedAt: timestamp,
  });
}

export function reconcilePaymentOrder(input: ReconciliationInput): ReconciliationResult {
  if (!input.localOrder) {
    return {
      status: 'MISSING_LOCAL',
      checkedAt: input.checkedAt,
      discrepancies: ['Provider payment reference exists without a local PaymentOrderContract.'],
    };
  }
  if (input.providerState === undefined || input.providerCapturedPaise === undefined) {
    return {
      status: 'MISSING_PROVIDER',
      checkedAt: input.checkedAt,
      orderId: input.localOrder.orderId,
      discrepancies: ['Local order has no corresponding provider snapshot to reconcile against.'],
    };
  }

  const discrepancies: string[] = [];
  if (input.localOrder.capturedPaise !== input.providerCapturedPaise) {
    discrepancies.push(
      `Captured amount mismatch: local=${input.localOrder.capturedPaise}p, provider=${input.providerCapturedPaise}p.`
    );
    return {
      status: 'AMOUNT_MISMATCH',
      checkedAt: input.checkedAt,
      orderId: input.localOrder.orderId,
      discrepancies,
    };
  }

  if (input.localOrder.state !== input.providerState) {
    discrepancies.push(
      `State mismatch: local=${input.localOrder.state}, provider=${input.providerState}.`
    );
    return {
      status: 'STATE_MISMATCH',
      checkedAt: input.checkedAt,
      orderId: input.localOrder.orderId,
      discrepancies,
    };
  }

  return {
    status: 'MATCHED',
    checkedAt: input.checkedAt,
    orderId: input.localOrder.orderId,
    discrepancies: [],
  };
}

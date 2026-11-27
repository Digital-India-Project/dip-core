import { ApplicationId, OrderId, PaymentId, ProviderReferenceId, RefundId } from '../common/identifiers';
import { Money } from '../common/money';
import { err, ok, Result } from '../common/result';
import { UtcInstant } from '../common/time';
import { createDomainError, DomainError, ErrorCode } from '../errors/domainError';

export type PaymentState =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export interface PaymentOrderContract {
  readonly orderId: OrderId;
  readonly paymentId: PaymentId;
  readonly applicationId: ApplicationId;
  readonly providerReferenceId?: ProviderReferenceId;
  readonly amount: Money;
  readonly capturedPaise: number;
  readonly refundedPaise: number;
  readonly state: PaymentState;
  readonly updatedAt: UtcInstant;
}

export interface RefundRequestContract {
  readonly refundId: RefundId;
  readonly amountPaise: number;
  readonly reason: string;
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

export function transitionPaymentState(
  current: PaymentOrderContract,
  nextState: PaymentState,
  timestamp: UtcInstant,
  refund?: RefundRequestContract
): Result<PaymentOrderContract, DomainError> {
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

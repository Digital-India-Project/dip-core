import { ApplicationId, PartnerId, ServiceId, UserId } from '../common/identifiers';
import { err, ok, Result } from '../common/result';
import { UtcInstant } from '../common/time';
import { createDomainError, DomainError, ErrorCode } from '../errors/domainError';

export type ApplicationState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PAYMENT_PENDING'
  | 'IN_REVIEW'
  | 'RESUBMISSION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export type ActorRole = 'APPLICANT' | 'OPERATOR' | 'VERIFIER' | 'SYSTEM';

export interface ApplicationContract {
  readonly id: ApplicationId;
  readonly applicantId: UserId;
  readonly serviceId: ServiceId;
  readonly assignedPartnerId?: PartnerId;
  readonly state: ApplicationState;
  readonly paymentCaptured: boolean;
  readonly requiredDocumentsVerified: boolean;
  readonly updatedAt: UtcInstant;
}

export interface ApplicationTransitionRequest {
  readonly targetState: ApplicationState;
  readonly actorRole: ActorRole;
  readonly timestamp: UtcInstant;
  readonly reason?: string;
}

export interface ApplicationStageEvent {
  readonly applicationId: ApplicationId;
  readonly fromState: ApplicationState;
  readonly toState: ApplicationState;
  readonly actorRole: ActorRole;
  readonly occurredAt: UtcInstant;
  readonly reason?: string;
}

export interface ApplicationTransitionOutput {
  readonly application: ApplicationContract;
  readonly event: ApplicationStageEvent;
}

export const APPLICATION_ALLOWED_TRANSITIONS: Readonly<
  Record<ApplicationState, readonly ApplicationState[]>
> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['PAYMENT_PENDING', 'IN_REVIEW', 'CANCELLED'],
  PAYMENT_PENDING: ['IN_REVIEW', 'CANCELLED'],
  IN_REVIEW: ['RESUBMISSION_REQUIRED', 'APPROVED', 'REJECTED'],
  RESUBMISSION_REQUIRED: ['SUBMITTED', 'CANCELLED'],
  APPROVED: ['COMPLETED'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
};

export function transitionApplicationState(
  current: ApplicationContract,
  request: ApplicationTransitionRequest
): Result<ApplicationTransitionOutput, DomainError> {
  const allowedTargets = APPLICATION_ALLOWED_TRANSITIONS[current.state];
  if (!allowedTargets.includes(request.targetState)) {
    return err(
      createDomainError(
        ErrorCode.INVALID_STATE_TRANSITION,
        `Transition from ${current.state} to ${request.targetState} is not allowed.`,
        'state',
        { from: current.state, to: request.targetState }
      )
    );
  }

  if (request.targetState === 'IN_REVIEW' && !current.paymentCaptured) {
    return err(
      createDomainError(
        ErrorCode.PRECONDITION_FAILED,
        'Cannot enter IN_REVIEW until payment is captured.',
        'paymentCaptured'
      )
    );
  }

  if (request.targetState === 'APPROVED' && !current.requiredDocumentsVerified) {
    return err(
      createDomainError(
        ErrorCode.PRECONDITION_FAILED,
        'Cannot approve application until all mandatory documents are verified.',
        'requiredDocumentsVerified'
      )
    );
  }

  if (
    (request.targetState === 'RESUBMISSION_REQUIRED' ||
      request.targetState === 'REJECTED' ||
      request.targetState === 'CANCELLED') &&
    (!request.reason || request.reason.trim().length < 5)
  ) {
    return err(
      createDomainError(
        ErrorCode.PRECONDITION_FAILED,
        `Transition to ${request.targetState} requires a reason (minimum 5 characters).`,
        'reason'
      )
    );
  }

  if (
    (request.targetState === 'APPROVED' ||
      request.targetState === 'REJECTED' ||
      request.targetState === 'RESUBMISSION_REQUIRED') &&
    request.actorRole === 'APPLICANT'
  ) {
    return err(
      createDomainError(
        ErrorCode.PRECONDITION_FAILED,
        `Applicants cannot transition an application to ${request.targetState}.`,
        'actorRole'
      )
    );
  }

  const updated: ApplicationContract = {
    ...current,
    state: request.targetState,
    updatedAt: request.timestamp,
  };

  return ok({
    application: updated,
    event: {
      applicationId: current.id,
      fromState: current.state,
      toState: request.targetState,
      actorRole: request.actorRole,
      occurredAt: request.timestamp,
      ...(request.reason ? { reason: request.reason.trim() } : {}),
    },
  });
}

import {
  ApplicationId,
  BusinessId,
  CorrelationId,
  CustomerId,
  PartnerId,
  ServiceId,
  TenantId,
  UserId,
} from '../common/identifiers.js';
import { err, ok, Result } from '../common/result.js';
import { UtcInstant } from '../common/time.js';
import { createDomainError, DomainError, ErrorCode } from '../errors/domainError.js';
import { ActorRole } from '../identity/identityAndTenant.js';

export type { ActorRole } from '../identity/identityAndTenant.js';

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

export interface WorkflowStageDefinition {
  readonly stageCode: string;
  readonly label: string;
  readonly state: ApplicationState;
  readonly terminal: boolean;
}

export interface WorkflowTransitionRule {
  readonly from: ApplicationState;
  readonly to: ApplicationState;
  readonly allowedRoles: readonly ActorRole[];
  readonly requiresReason: boolean;
}

export interface ApplicationContract {
  readonly id: ApplicationId;
  readonly applicantId: UserId;
  readonly customerId?: CustomerId;
  readonly businessId?: BusinessId;
  readonly tenantId?: TenantId;
  readonly serviceId: ServiceId;
  readonly assignedPartnerId?: PartnerId;
  readonly state: ApplicationState;
  readonly currentStageCode?: string;
  readonly version?: number;
  readonly paymentCaptured: boolean;
  readonly requiredDocumentsVerified: boolean;
  readonly updatedAt: UtcInstant;
}

export interface ApplicationTransitionRequest {
  readonly targetState: ApplicationState;
  readonly actorRole: ActorRole;
  readonly actorId?: UserId | PartnerId | 'SYSTEM';
  readonly timestamp: UtcInstant;
  readonly reason?: string;
  readonly expectedVersion?: number;
  readonly correlationId?: CorrelationId;
  readonly targetStageCode?: string;
}

export interface ApplicationStageEvent {
  readonly applicationId: ApplicationId;
  readonly fromState: ApplicationState;
  readonly toState: ApplicationState;
  readonly actorRole: ActorRole;
  readonly actorId?: UserId | PartnerId | 'SYSTEM';
  readonly occurredAt: UtcInstant;
  readonly version: number;
  readonly correlationId?: CorrelationId;
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

export const TERMINAL_APPLICATION_STATES: readonly ApplicationState[] = [
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
];

export function isTerminalApplicationState(state: ApplicationState): boolean {
  return TERMINAL_APPLICATION_STATES.includes(state);
}

export function transitionApplicationState(
  current: ApplicationContract,
  request: ApplicationTransitionRequest
): Result<ApplicationTransitionOutput, DomainError> {
  const currentVersion = current.version ?? 1;
  if (request.expectedVersion !== undefined && request.expectedVersion !== currentVersion) {
    return err(
      createDomainError(
        ErrorCode.CONCURRENCY_CONFLICT,
        `Application version conflict: expected ${request.expectedVersion}, actual ${currentVersion}.`,
        'version',
        { expectedVersion: request.expectedVersion, actualVersion: currentVersion }
      )
    );
  }

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

  const nextVersion = currentVersion + 1;
  const updated: ApplicationContract = {
    ...current,
    state: request.targetState,
    version: nextVersion,
    ...(request.targetStageCode !== undefined ? { currentStageCode: request.targetStageCode } : {}),
    updatedAt: request.timestamp,
  };

  return ok({
    application: updated,
    event: {
      applicationId: current.id,
      fromState: current.state,
      toState: request.targetState,
      actorRole: request.actorRole,
      ...(request.actorId !== undefined ? { actorId: request.actorId } : {}),
      occurredAt: request.timestamp,
      version: nextVersion,
      ...(request.correlationId !== undefined ? { correlationId: request.correlationId } : {}),
      ...(request.reason ? { reason: request.reason.trim() } : {}),
    },
  });
}

import {
  AuditEventId,
  CorrelationId,
  CustomerId,
  EventId,
  NotificationId,
  PartnerId,
  TenantId,
  UserId,
} from '../common/identifiers.js';
import { MetadataContract } from '../common/pagination.js';
import { err, ok, Result } from '../common/result.js';
import { parseUtcInstant, UtcInstant } from '../common/time.js';
import {
  createDomainError,
  DomainError,
  ErrorCode,
  sanitizeMetadata,
} from '../errors/domainError.js';
import { ActorRole, SupportedLocale } from '../identity/identityAndTenant.js';

export interface DomainEventEnvelope<
  TType extends string = string,
  TPayload = Readonly<Record<string, unknown>>,
> {
  readonly eventId: EventId;
  readonly eventType: TType;
  readonly eventVersion: string;
  readonly occurredAt: UtcInstant;
  readonly correlationId: CorrelationId;
  readonly causationId?: EventId;
  readonly tenantId?: TenantId;
  readonly sourceModule: string;
  readonly payload: TPayload;
}

export type AuditOutcome = 'SUCCESS' | 'REJECTED' | 'FAILURE';

export interface AuditEventContract {
  readonly auditId: AuditEventId;
  readonly correlationId: CorrelationId;
  readonly tenantId?: TenantId;
  readonly actorId: UserId | PartnerId | 'SYSTEM';
  readonly actorRole: ActorRole;
  readonly action: string;
  readonly targetEntityType: string;
  readonly targetEntityId: string;
  readonly outcome: AuditOutcome;
  readonly occurredAt: UtcInstant;
  readonly summary: string;
  readonly metadata?: MetadataContract;
}

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';

export interface NotificationRequestContract {
  readonly notificationId: NotificationId;
  readonly correlationId: CorrelationId;
  readonly recipientRef: UserId | CustomerId | PartnerId;
  readonly channel: NotificationChannel;
  readonly templateCode: string;
  readonly locale: SupportedLocale;
  readonly requestedAt: UtcInstant;
  readonly templateVariables: MetadataContract;
}

const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.-]{2,95}$/;
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function createEventEnvelope<TType extends string, TPayload>(
  input: DomainEventEnvelope<TType, TPayload>
): Result<DomainEventEnvelope<TType, TPayload>, DomainError> {
  if (!EVENT_TYPE_PATTERN.test(input.eventType)) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Event type must use lowercase dot-delimited naming (e.g. "dip.application.transitioned").',
        'eventType'
      )
    );
  }
  if (!SEMVER_PATTERN.test(input.eventVersion)) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Event version must follow MAJOR.MINOR.PATCH semver format.',
        'eventVersion'
      )
    );
  }
  const tsCheck = parseUtcInstant(input.occurredAt, 'occurredAt');
  if (!tsCheck.ok) return tsCheck;

  if (!input.sourceModule || input.sourceModule.trim().length < 2) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'sourceModule is required on event envelopes.',
        'sourceModule'
      )
    );
  }

  return ok({
    ...input,
    occurredAt: tsCheck.value,
    sourceModule: input.sourceModule.trim(),
  });
}

export function createAuditEvent(input: AuditEventContract): Result<AuditEventContract, DomainError> {
  if (!input.action.trim() || !input.targetEntityType.trim() || !input.targetEntityId.trim()) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Audit events require non-empty action, targetEntityType, and targetEntityId.',
        'action'
      )
    );
  }
  const tsCheck = parseUtcInstant(input.occurredAt, 'occurredAt');
  if (!tsCheck.ok) return tsCheck;

  const cleanMeta = sanitizeMetadata(input.metadata);
  return ok({
    ...input,
    occurredAt: tsCheck.value,
    action: input.action.trim(),
    targetEntityType: input.targetEntityType.trim(),
    targetEntityId: input.targetEntityId.trim(),
    summary: input.summary.trim(),
    ...(cleanMeta ? { metadata: cleanMeta } : { metadata: undefined }),
  });
}

export function createNotificationRequest(
  input: NotificationRequestContract
): Result<NotificationRequestContract, DomainError> {
  if (!/^[A-Z0-9_]{3,64}$/.test(input.templateCode)) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Notification templateCode must be 3-64 uppercase alphanumeric/underscore characters.',
        'templateCode'
      )
    );
  }
  const tsCheck = parseUtcInstant(input.requestedAt, 'requestedAt');
  if (!tsCheck.ok) return tsCheck;

  const safeVars = sanitizeMetadata(input.templateVariables) ?? {};
  return ok({
    ...input,
    requestedAt: tsCheck.value,
    templateVariables: safeVars,
  });
}

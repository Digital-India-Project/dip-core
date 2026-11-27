import { createDomainError, DomainError, ErrorCode } from '../errors/domainError.js';
import { err, ok, Result } from './result.js';

declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type CustomerId = Brand<string, 'CustomerId'>;
export type BusinessId = Brand<string, 'BusinessId'>;
export type TenantId = Brand<string, 'TenantId'>;
export type ApplicationId = Brand<string, 'ApplicationId'>;
export type ServiceId = Brand<string, 'ServiceId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type PaymentId = Brand<string, 'PaymentId'>;
export type RefundId = Brand<string, 'RefundId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type VerificationId = Brand<string, 'VerificationId'>;
export type FormSchemaId = Brand<string, 'FormSchemaId'>;
export type SubmissionId = Brand<string, 'SubmissionId'>;
export type PartnerId = Brand<string, 'PartnerId'>;
export type ProviderReferenceId = Brand<string, 'ProviderReferenceId'>;
export type EventId = Brand<string, 'EventId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;
export type IdempotencyKey = Brand<string, 'IdempotencyKey'>;
export type NotificationId = Brand<string, 'NotificationId'>;

export type EntityPrefix =
  | 'usr'
  | 'cus'
  | 'biz'
  | 'ten'
  | 'app'
  | 'svc'
  | 'prd'
  | 'ord'
  | 'pay'
  | 'ref'
  | 'doc'
  | 'ver'
  | 'frm'
  | 'sub'
  | 'ptr'
  | 'prv'
  | 'evt'
  | 'aud'
  | 'cor'
  | 'idp'
  | 'ntf';

const ID_PATTERN = /^[a-z]{3}_[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;

function parseBrandedId<T extends string>(
  raw: unknown,
  prefix: EntityPrefix,
  fieldPath: string
): Result<T, DomainError> {
  if (typeof raw !== 'string') {
    return err(
      createDomainError(
        ErrorCode.INVALID_IDENTIFIER,
        `Identifier at ${fieldPath} must be a string.`,
        fieldPath
      )
    );
  }
  const trimmed = raw.trim();
  if (!ID_PATTERN.test(trimmed) || !trimmed.startsWith(`${prefix}_`)) {
    return err(
      createDomainError(
        ErrorCode.INVALID_IDENTIFIER,
        `Identifier must start with "${prefix}_" and contain 3-64 safe alphanumeric characters.`,
        fieldPath,
        { expectedPrefix: prefix }
      )
    );
  }
  return ok(trimmed as T);
}

export const asUserId = (raw: unknown, fieldPath = 'userId') =>
  parseBrandedId<UserId>(raw, 'usr', fieldPath);

export const asCustomerId = (raw: unknown, fieldPath = 'customerId') =>
  parseBrandedId<CustomerId>(raw, 'cus', fieldPath);

export const asBusinessId = (raw: unknown, fieldPath = 'businessId') =>
  parseBrandedId<BusinessId>(raw, 'biz', fieldPath);

export const asTenantId = (raw: unknown, fieldPath = 'tenantId') =>
  parseBrandedId<TenantId>(raw, 'ten', fieldPath);

export const asApplicationId = (raw: unknown, fieldPath = 'applicationId') =>
  parseBrandedId<ApplicationId>(raw, 'app', fieldPath);

export const asServiceId = (raw: unknown, fieldPath = 'serviceId') =>
  parseBrandedId<ServiceId>(raw, 'svc', fieldPath);

export const asProductId = (raw: unknown, fieldPath = 'productId') =>
  parseBrandedId<ProductId>(raw, 'prd', fieldPath);

export const asOrderId = (raw: unknown, fieldPath = 'orderId') =>
  parseBrandedId<OrderId>(raw, 'ord', fieldPath);

export const asPaymentId = (raw: unknown, fieldPath = 'paymentId') =>
  parseBrandedId<PaymentId>(raw, 'pay', fieldPath);

export const asRefundId = (raw: unknown, fieldPath = 'refundId') =>
  parseBrandedId<RefundId>(raw, 'ref', fieldPath);

export const asDocumentId = (raw: unknown, fieldPath = 'documentId') =>
  parseBrandedId<DocumentId>(raw, 'doc', fieldPath);

export const asVerificationId = (raw: unknown, fieldPath = 'verificationId') =>
  parseBrandedId<VerificationId>(raw, 'ver', fieldPath);

export const asFormSchemaId = (raw: unknown, fieldPath = 'formSchemaId') =>
  parseBrandedId<FormSchemaId>(raw, 'frm', fieldPath);

export const asSubmissionId = (raw: unknown, fieldPath = 'submissionId') =>
  parseBrandedId<SubmissionId>(raw, 'sub', fieldPath);

export const asPartnerId = (raw: unknown, fieldPath = 'partnerId') =>
  parseBrandedId<PartnerId>(raw, 'ptr', fieldPath);

export const asProviderReferenceId = (raw: unknown, fieldPath = 'providerReferenceId') =>
  parseBrandedId<ProviderReferenceId>(raw, 'prv', fieldPath);

export const asEventId = (raw: unknown, fieldPath = 'eventId') =>
  parseBrandedId<EventId>(raw, 'evt', fieldPath);

export const asAuditEventId = (raw: unknown, fieldPath = 'auditEventId') =>
  parseBrandedId<AuditEventId>(raw, 'aud', fieldPath);

export const asCorrelationId = (raw: unknown, fieldPath = 'correlationId') =>
  parseBrandedId<CorrelationId>(raw, 'cor', fieldPath);

export const asIdempotencyKey = (raw: unknown, fieldPath = 'idempotencyKey') =>
  parseBrandedId<IdempotencyKey>(raw, 'idp', fieldPath);

export const asNotificationId = (raw: unknown, fieldPath = 'notificationId') =>
  parseBrandedId<NotificationId>(raw, 'ntf', fieldPath);

export interface SchemaVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export interface VersionedContractMetadata {
  readonly contractName: string;
  readonly schemaVersion: SchemaVersion;
}

export const CORE_CONTRACT_VERSION: SchemaVersion = {
  major: 0,
  minor: 2,
  patch: 0,
};

export function formatSchemaVersion(version: SchemaVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function parseSchemaVersion(
  raw: unknown,
  fieldPath = 'schemaVersion'
): Result<SchemaVersion, DomainError> {
  if (typeof raw !== 'string') {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Schema version must be a semver string (e.g. "0.2.0").',
        fieldPath
      )
    );
  }
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(raw.trim());
  if (!match) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Schema version must follow MAJOR.MINOR.PATCH semver format.',
        fieldPath
      )
    );
  }
  return ok({
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  });
}

export function isCompatibleSchemaVersion(
  consumerExpected: SchemaVersion,
  producerActual: SchemaVersion
): boolean {
  if (consumerExpected.major !== producerActual.major) return false;
  return producerActual.minor >= consumerExpected.minor;
}

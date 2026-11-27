import { createDomainError, DomainError, ErrorCode } from '../errors/domainError';
import { err, ok, Result } from './result';

declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type ApplicationId = Brand<string, 'ApplicationId'>;
export type ServiceId = Brand<string, 'ServiceId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type PaymentId = Brand<string, 'PaymentId'>;
export type RefundId = Brand<string, 'RefundId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type PartnerId = Brand<string, 'PartnerId'>;
export type ProviderReferenceId = Brand<string, 'ProviderReferenceId'>;

export type EntityPrefix =
  | 'usr'
  | 'app'
  | 'svc'
  | 'ord'
  | 'pay'
  | 'ref'
  | 'doc'
  | 'ptr'
  | 'prv';

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

export const asApplicationId = (raw: unknown, fieldPath = 'applicationId') =>
  parseBrandedId<ApplicationId>(raw, 'app', fieldPath);

export const asServiceId = (raw: unknown, fieldPath = 'serviceId') =>
  parseBrandedId<ServiceId>(raw, 'svc', fieldPath);

export const asOrderId = (raw: unknown, fieldPath = 'orderId') =>
  parseBrandedId<OrderId>(raw, 'ord', fieldPath);

export const asPaymentId = (raw: unknown, fieldPath = 'paymentId') =>
  parseBrandedId<PaymentId>(raw, 'pay', fieldPath);

export const asRefundId = (raw: unknown, fieldPath = 'refundId') =>
  parseBrandedId<RefundId>(raw, 'ref', fieldPath);

export const asDocumentId = (raw: unknown, fieldPath = 'documentId') =>
  parseBrandedId<DocumentId>(raw, 'doc', fieldPath);

export const asPartnerId = (raw: unknown, fieldPath = 'partnerId') =>
  parseBrandedId<PartnerId>(raw, 'ptr', fieldPath);

export const asProviderReferenceId = (raw: unknown, fieldPath = 'providerReferenceId') =>
  parseBrandedId<ProviderReferenceId>(raw, 'prv', fieldPath);

export interface SchemaVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export const CORE_CONTRACT_VERSION: SchemaVersion = {
  major: 0,
  minor: 1,
  patch: 0,
};

export function formatSchemaVersion(version: SchemaVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

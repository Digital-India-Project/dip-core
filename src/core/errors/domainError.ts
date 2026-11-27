export enum ErrorCode {
  INVALID_IDENTIFIER = 'ERR_INVALID_IDENTIFIER',
  INVALID_MONEY_AMOUNT = 'ERR_INVALID_MONEY_AMOUNT',
  CURRENCY_MISMATCH = 'ERR_CURRENCY_MISMATCH',
  INVALID_TIMESTAMP = 'ERR_INVALID_TIMESTAMP',
  SCHEMA_VALIDATION_FAILED = 'ERR_SCHEMA_VALIDATION_FAILED',
  UNKNOWN_FIELD_REJECTED = 'ERR_UNKNOWN_FIELD_REJECTED',
  PROTOTYPE_KEY_REJECTED = 'ERR_PROTOTYPE_KEY_REJECTED',
  INVALID_STATE_TRANSITION = 'ERR_INVALID_STATE_TRANSITION',
  PRECONDITION_FAILED = 'ERR_PRECONDITION_FAILED',
  SERVICE_UNAVAILABLE = 'ERR_SERVICE_UNAVAILABLE',
  DOCUMENT_CONSTRAINT_FAILED = 'ERR_DOCUMENT_CONSTRAINT_FAILED',
  REFUND_EXCEEDS_CAPTURED = 'ERR_REFUND_EXCEEDS_CAPTURED',
}

export interface DomainError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly fieldPath?: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

const SENSITIVE_META_PATTERN = /(token|secret|password|key|aadhaar|pan|phone|email|payload|auth)/i;

export function createDomainError(
  code: ErrorCode,
  message: string,
  fieldPath?: string,
  metadata?: Record<string, string | number | boolean>
): DomainError {
  let sanitizedMeta: Record<string, string | number | boolean> | undefined;
  if (metadata) {
    sanitizedMeta = {};
    for (const [k, v] of Object.entries(metadata)) {
      if (
        k !== '__proto__' &&
        k !== 'constructor' &&
        k !== 'prototype' &&
        !SENSITIVE_META_PATTERN.test(k)
      ) {
        sanitizedMeta[k] = v;
      }
    }
  }
  return {
    code,
    message,
    ...(fieldPath ? { fieldPath } : {}),
    ...(sanitizedMeta && Object.keys(sanitizedMeta).length > 0 ? { metadata: sanitizedMeta } : {}),
  };
}

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
  NOT_FOUND = 'ERR_NOT_FOUND',
  CONFLICT = 'ERR_CONFLICT',
  CONCURRENCY_CONFLICT = 'ERR_CONCURRENCY_CONFLICT',
  PERMISSION_DENIED = 'ERR_PERMISSION_DENIED',
  INTEGRATION_FAILURE = 'ERR_INTEGRATION_FAILURE',
  IDEMPOTENCY_CONFLICT = 'ERR_IDEMPOTENCY_CONFLICT',
  EXPIRED = 'ERR_EXPIRED',
  INVALID_FILTER_OR_SORT = 'ERR_INVALID_FILTER_OR_SORT',
}

export type ErrorCategory =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PRECONDITION'
  | 'TRANSITION'
  | 'PERMISSION'
  | 'INTEGRATION'
  | 'UNAVAILABLE';

export type SafeMetadataPrimitive = string | number | boolean;

export interface DomainError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly fieldPath?: string;
  readonly metadata?: Readonly<Record<string, SafeMetadataPrimitive>>;
}

export interface SerializedDomainError {
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly message: string;
  readonly fieldPath?: string;
  readonly metadata?: Readonly<Record<string, SafeMetadataPrimitive>>;
}

const SENSITIVE_META_KEY_PATTERN =
  /(token|secret|password|passwd|credential|key|aadhaar|pan|phone|mobile|email|payload|auth|bearer|cookie|session)/i;
const SENSITIVE_META_VALUE_PATTERN =
  /(bearer\s+[a-z0-9._-]+|-----begin\s+|sk_(live|test)_|cfsk_)/i;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function classifyErrorCode(code: ErrorCode): ErrorCategory {
  switch (code) {
    case ErrorCode.INVALID_IDENTIFIER:
    case ErrorCode.INVALID_MONEY_AMOUNT:
    case ErrorCode.CURRENCY_MISMATCH:
    case ErrorCode.INVALID_TIMESTAMP:
    case ErrorCode.SCHEMA_VALIDATION_FAILED:
    case ErrorCode.UNKNOWN_FIELD_REJECTED:
    case ErrorCode.PROTOTYPE_KEY_REJECTED:
    case ErrorCode.DOCUMENT_CONSTRAINT_FAILED:
    case ErrorCode.INVALID_FILTER_OR_SORT:
      return 'VALIDATION';
    case ErrorCode.NOT_FOUND:
      return 'NOT_FOUND';
    case ErrorCode.CONFLICT:
    case ErrorCode.CONCURRENCY_CONFLICT:
    case ErrorCode.IDEMPOTENCY_CONFLICT:
      return 'CONFLICT';
    case ErrorCode.INVALID_STATE_TRANSITION:
      return 'TRANSITION';
    case ErrorCode.PRECONDITION_FAILED:
    case ErrorCode.REFUND_EXCEEDS_CAPTURED:
    case ErrorCode.EXPIRED:
      return 'PRECONDITION';
    case ErrorCode.PERMISSION_DENIED:
      return 'PERMISSION';
    case ErrorCode.INTEGRATION_FAILURE:
      return 'INTEGRATION';
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 'UNAVAILABLE';
  }
}

export function sanitizeMetadata(
  metadata?: Readonly<Record<string, unknown>>
): Readonly<Record<string, SafeMetadataPrimitive>> | undefined {
  if (!metadata) return undefined;
  const sanitized: Record<string, SafeMetadataPrimitive> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (UNSAFE_OBJECT_KEYS.has(k) || SENSITIVE_META_KEY_PATTERN.test(k)) {
      continue;
    }
    if (typeof v === 'string') {
      if (SENSITIVE_META_VALUE_PATTERN.test(v)) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = v.length > 256 ? `${v.slice(0, 253)}...` : v;
      }
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      sanitized[k] = v;
    } else if (typeof v === 'boolean') {
      sanitized[k] = v;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function createDomainError(
  code: ErrorCode,
  message: string,
  fieldPath?: string,
  metadata?: Record<string, SafeMetadataPrimitive>
): DomainError {
  const sanitizedMeta = sanitizeMetadata(metadata);
  return {
    code,
    message,
    ...(fieldPath ? { fieldPath } : {}),
    ...(sanitizedMeta ? { metadata: sanitizedMeta } : {}),
  };
}

export function serializeDomainError(error: DomainError): SerializedDomainError {
  const sanitizedMeta = sanitizeMetadata(error.metadata);
  return {
    code: error.code,
    category: classifyErrorCode(error.code),
    message: error.message,
    ...(error.fieldPath ? { fieldPath: error.fieldPath } : {}),
    ...(sanitizedMeta ? { metadata: sanitizedMeta } : {}),
  };
}

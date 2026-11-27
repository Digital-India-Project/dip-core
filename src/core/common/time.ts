import { createDomainError, DomainError, ErrorCode } from '../errors/domainError';
import { err, ok, Result } from './result';

declare const timeBrand: unique symbol;
export type UtcInstant = string & { readonly [timeBrand]: 'UtcInstant' };
export type BusinessDate = string & { readonly [timeBrand]: 'BusinessDate' };

const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseUtcInstant(raw: unknown, fieldPath = 'timestamp'): Result<UtcInstant, DomainError> {
  if (typeof raw !== 'string' || !UTC_ISO_PATTERN.test(raw.trim())) {
    return err(
      createDomainError(
        ErrorCode.INVALID_TIMESTAMP,
        'Timestamp must be an explicit UTC ISO-8601 instant ending in Z.',
        fieldPath
      )
    );
  }
  const parsed = Date.parse(raw.trim());
  if (Number.isNaN(parsed)) {
    return err(
      createDomainError(
        ErrorCode.INVALID_TIMESTAMP,
        'Timestamp is not a valid calendar instant.',
        fieldPath
      )
    );
  }
  return ok(raw.trim() as UtcInstant);
}

export function parseBusinessDate(raw: unknown, fieldPath = 'businessDate'): Result<BusinessDate, DomainError> {
  if (typeof raw !== 'string' || !BUSINESS_DATE_PATTERN.test(raw.trim())) {
    return err(
      createDomainError(
        ErrorCode.INVALID_TIMESTAMP,
        'Business date must use YYYY-MM-DD format.',
        fieldPath
      )
    );
  }
  const [y, m, d] = raw.trim().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return err(
      createDomainError(
        ErrorCode.INVALID_TIMESTAMP,
        'Business date is not a valid calendar day.',
        fieldPath
      )
    );
  }
  return ok(raw.trim() as BusinessDate);
}

export const BUSINESS_TIMEZONE = 'Asia/Kolkata' as const;

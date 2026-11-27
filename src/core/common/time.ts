import { createDomainError, DomainError, ErrorCode } from '../errors/domainError.js';
import { err, ok, Result } from './result.js';

declare const timeBrand: unique symbol;
export type UtcInstant = string & { readonly [timeBrand]: 'UtcInstant' };
export type BusinessDate = string & { readonly [timeBrand]: 'BusinessDate' };

const UTC_ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;
const BUSINESS_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseUtcInstant(raw: unknown, fieldPath = 'timestamp'): Result<UtcInstant, DomainError> {
  if (typeof raw !== 'string') {
    return err(
      createDomainError(
        ErrorCode.INVALID_TIMESTAMP,
        'Timestamp must be an explicit UTC ISO-8601 instant ending in Z.',
        fieldPath
      )
    );
  }
  const trimmed = raw.trim();
  const match = UTC_ISO_PATTERN.exec(trimmed);
  if (!match) {
    return err(
      createDomainError(
        ErrorCode.INVALID_TIMESTAMP,
        'Timestamp must be an explicit UTC ISO-8601 instant ending in Z.',
        fieldPath
      )
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const ms = match[7] ? Number(match[7]) : 0;

  const dt = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day ||
    dt.getUTCHours() !== hour ||
    dt.getUTCMinutes() !== minute ||
    dt.getUTCSeconds() !== second ||
    dt.getUTCMilliseconds() !== ms
  ) {
    return err(
      createDomainError(
        ErrorCode.INVALID_TIMESTAMP,
        'Timestamp is not a valid calendar instant.',
        fieldPath
      )
    );
  }
  return ok(trimmed as UtcInstant);
}

export function parseBusinessDate(raw: unknown, fieldPath = 'businessDate'): Result<BusinessDate, DomainError> {
  if (typeof raw !== 'string') {
    return err(
      createDomainError(
        ErrorCode.INVALID_TIMESTAMP,
        'Business date must use YYYY-MM-DD format.',
        fieldPath
      )
    );
  }
  const trimmed = raw.trim();
  const match = BUSINESS_DATE_PATTERN.exec(trimmed);
  if (!match) {
    return err(
      createDomainError(
        ErrorCode.INVALID_TIMESTAMP,
        'Business date must use YYYY-MM-DD format.',
        fieldPath
      )
    );
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
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
  return ok(trimmed as BusinessDate);
}

export function compareUtcInstants(a: UtcInstant, b: UtcInstant): -1 | 0 | 1 {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (ta < tb) return -1;
  if (ta > tb) return 1;
  return 0;
}

export function isInstantExpired(expiresAt: UtcInstant, referenceNow: UtcInstant): boolean {
  return Date.parse(expiresAt) <= Date.parse(referenceNow);
}

export const BUSINESS_TIMEZONE = 'Asia/Kolkata' as const;

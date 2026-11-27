import {
  BusinessId,
  CorrelationId,
  CustomerId,
  PartnerId,
  TenantId,
  UserId,
} from '../common/identifiers.js';
import { err, ok, Result } from '../common/result.js';
import { UtcInstant } from '../common/time.js';
import { createDomainError, DomainError, ErrorCode } from '../errors/domainError.js';

export type SupportedLocale = 'en' | 'hi';

export type ActorRole = 'APPLICANT' | 'OPERATOR' | 'VERIFIER' | 'SYSTEM';

export type CustomerKycState = 'UNVERIFIED' | 'PARTIAL' | 'VERIFIED';

export type BusinessEntityType =
  | 'PROPRIETORSHIP'
  | 'PARTNERSHIP'
  | 'LLP'
  | 'PRIVATE_LIMITED'
  | 'TRUST_OR_SOCIETY';

export interface TenantContext {
  readonly tenantId: TenantId;
  readonly organizationCode: string;
  readonly stateCode?: string;
}

export interface ActorReference {
  readonly actorId: UserId | PartnerId | 'SYSTEM';
  readonly actorRole: ActorRole;
  readonly tenantId?: TenantId;
  readonly correlationId?: CorrelationId;
}

/**
 * Provider-neutral customer domain reference.
 * Deliberately excludes raw PII (Aadhaar, PAN, passwords, tokens, full contact payloads).
 */
export interface CustomerReference {
  readonly id: CustomerId;
  readonly userId?: UserId;
  readonly tenantId?: TenantId;
  readonly preferredLocale: SupportedLocale;
  readonly stateCode?: string;
  readonly kycState: CustomerKycState;
  readonly createdAt: UtcInstant;
}

/**
 * Business / organization domain reference for commercial and MSME services.
 * Stores compliance flags rather than raw tax credentials.
 */
export interface BusinessReference {
  readonly id: BusinessId;
  readonly customerId: CustomerId;
  readonly legalName: string;
  readonly entityType: BusinessEntityType;
  readonly stateCode: string;
  readonly gstinRegistered: boolean;
  readonly udyamRegistered: boolean;
}

const STATE_CODE_PATTERN = /^[A-Z]{2}$/;
const ORG_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;

export function validateTenantContext(
  context: TenantContext
): Result<TenantContext, DomainError> {
  if (!ORG_CODE_PATTERN.test(context.organizationCode)) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Organization code must be 2-32 uppercase alphanumeric characters.',
        'organizationCode'
      )
    );
  }
  if (context.stateCode !== undefined && !STATE_CODE_PATTERN.test(context.stateCode)) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'State code must be a 2-letter uppercase Indian state/UT code.',
        'stateCode'
      )
    );
  }
  return ok(context);
}

export function validateBusinessReference(
  business: BusinessReference
): Result<BusinessReference, DomainError> {
  if (business.legalName.trim().length < 2 || business.legalName.trim().length > 120) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Business legalName must be between 2 and 120 characters.',
        'legalName'
      )
    );
  }
  if (!STATE_CODE_PATTERN.test(business.stateCode)) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Business stateCode must be a 2-letter uppercase code.',
        'stateCode'
      )
    );
  }
  return ok({
    ...business,
    legalName: business.legalName.trim(),
  });
}

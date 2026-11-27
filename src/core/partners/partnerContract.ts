import { PartnerId, UserId } from '../common/identifiers.js';
import { err, ok, Result } from '../common/result.js';
import { createDomainError, DomainError, ErrorCode } from '../errors/domainError.js';

export type PartnerTier = 'CSC_CENTER' | 'FACILITATION_DESK' | 'STATE_NODAL';

export type PartnerStatus = 'ACTIVE' | 'SUSPENDED' | 'ONBOARDING';

export interface PartnerContract {
  readonly id: PartnerId;
  readonly code: string;
  readonly displayName: string;
  readonly tier: PartnerTier;
  readonly status: PartnerStatus;
  readonly stateCode: string;
}

export interface OperatorAssignmentContract {
  readonly partnerId: PartnerId;
  readonly operatorUserId: UserId;
  readonly active: boolean;
}

const PARTNER_CODE_PATTERN = /^[A-Z0-9-]{3,32}$/;
const STATE_CODE_PATTERN = /^[A-Z]{2}$/;

export function validatePartnerContract(
  partner: PartnerContract
): Result<PartnerContract, DomainError> {
  if (!PARTNER_CODE_PATTERN.test(partner.code)) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Partner code must be 3-32 uppercase alphanumeric or hyphen characters.',
        'code'
      )
    );
  }
  if (partner.displayName.trim().length < 2) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Partner displayName must be at least 2 characters.',
        'displayName'
      )
    );
  }
  if (!STATE_CODE_PATTERN.test(partner.stateCode)) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Partner stateCode must be a 2-letter uppercase Indian state/UT code.',
        'stateCode'
      )
    );
  }
  return ok({
    ...partner,
    displayName: partner.displayName.trim(),
  });
}

import { PartnerId } from '../common/identifiers';

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

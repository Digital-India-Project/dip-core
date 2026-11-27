import { ServiceId } from '../common/identifiers';
import {
  addMoney,
  createMoney,
  Money,
  multiplyBasisPoints,
  RoundingMode,
  subtractMoney,
} from '../common/money';
import { err, ok, Result } from '../common/result';
import { createDomainError, DomainError, ErrorCode } from '../errors/domainError';

export type ServiceCategory =
  | 'IDENTITY'
  | 'CERTIFICATES'
  | 'TAX_COMPLIANCE'
  | 'BUSINESS_REGISTRATION'
  | 'WELFARE';

export type ServiceAvailability = 'ACTIVE' | 'MAINTENANCE' | 'DEPRECATED';

export interface LocalizedLabel {
  readonly en: string;
  readonly hi: string;
}

export interface ServiceDefinition {
  readonly id: ServiceId;
  readonly code: string;
  readonly category: ServiceCategory;
  readonly availability: ServiceAvailability;
  readonly title: LocalizedLabel;
  readonly summary: string;
  readonly statutoryFeePaise: number;
  readonly facilitationFeePaise: number;
  readonly gstBasisPoints: number; // e.g., 1800 = 18% GST on facilitation fee only
  readonly estimatedTurnaroundDays: number;
  readonly contractVersion: string;
}

export type ConcessionTier = 'NONE' | 'SENIOR_CITIZEN_10' | 'BPL_SUBSIDY_50' | 'CSC_BULK_15';

const CONCESSION_BPS: Record<ConcessionTier, number> = {
  NONE: 0,
  SENIOR_CITIZEN_10: 1000,
  BPL_SUBSIDY_50: 5000,
  CSC_BULK_15: 1500,
};

export interface PricingQuoteInput {
  readonly service: ServiceDefinition;
  readonly quantity: number;
  readonly concession: ConcessionTier;
  readonly roundingMode: RoundingMode;
}

export interface PricingQuoteBreakdown {
  readonly serviceId: ServiceId;
  readonly quantity: number;
  readonly concession: ConcessionTier;
  readonly roundingMode: RoundingMode;
  readonly statutorySubtotal: Money;
  readonly facilitationGross: Money;
  readonly concessionDiscount: Money;
  readonly facilitationTaxable: Money;
  readonly gstAmount: Money;
  readonly totalPayable: Money;
  readonly calculationSteps: readonly string[];
}

export function calculateServiceQuote(
  input: PricingQuoteInput
): Result<PricingQuoteBreakdown, DomainError> {
  if (input.service.availability !== 'ACTIVE') {
    return err(
      createDomainError(
        ErrorCode.SERVICE_UNAVAILABLE,
        `Service "${input.service.code}" is currently ${input.service.availability.toLowerCase()}.`,
        'serviceId',
        { availability: input.service.availability }
      )
    );
  }

  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 50) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Quantity must be an integer between 1 and 50.',
        'quantity',
        { min: 1, max: 50 }
      )
    );
  }

  const statutoryRes = createMoney(
    input.service.statutoryFeePaise * input.quantity,
    'INR',
    'statutoryFeePaise'
  );
  if (!statutoryRes.ok) return statutoryRes;

  const facilitationGrossRes = createMoney(
    input.service.facilitationFeePaise * input.quantity,
    'INR',
    'facilitationFeePaise'
  );
  if (!facilitationGrossRes.ok) return facilitationGrossRes;

  const discountBps = CONCESSION_BPS[input.concession];
  const discountRes = multiplyBasisPoints(
    facilitationGrossRes.value,
    discountBps,
    input.roundingMode
  );
  if (!discountRes.ok) return discountRes;

  const taxableRes = subtractMoney(facilitationGrossRes.value, discountRes.value);
  if (!taxableRes.ok) return taxableRes;

  const gstRes = multiplyBasisPoints(
    taxableRes.value,
    input.service.gstBasisPoints,
    input.roundingMode
  );
  if (!gstRes.ok) return gstRes;

  const facilitationWithGstRes = addMoney(taxableRes.value, gstRes.value);
  if (!facilitationWithGstRes.ok) return facilitationWithGstRes;

  const totalRes = addMoney(statutoryRes.value, facilitationWithGstRes.value);
  if (!totalRes.ok) return totalRes;

  return ok({
    serviceId: input.service.id,
    quantity: input.quantity,
    concession: input.concession,
    roundingMode: input.roundingMode,
    statutorySubtotal: statutoryRes.value,
    facilitationGross: facilitationGrossRes.value,
    concessionDiscount: discountRes.value,
    facilitationTaxable: taxableRes.value,
    gstAmount: gstRes.value,
    totalPayable: totalRes.value,
    calculationSteps: [
      `1. Statutory fee (GST-exempt): ${input.service.statutoryFeePaise} paise × ${input.quantity} = ${statutoryRes.value.minorUnits} paise`,
      `2. Facilitation gross: ${input.service.facilitationFeePaise} paise × ${input.quantity} = ${facilitationGrossRes.value.minorUnits} paise`,
      `3. Concession (${input.concession}, ${discountBps} bps, ${input.roundingMode}): -${discountRes.value.minorUnits} paise`,
      `4. Taxable facilitation subtotal: ${taxableRes.value.minorUnits} paise`,
      `5. GST (${input.service.gstBasisPoints} bps, ${input.roundingMode}): +${gstRes.value.minorUnits} paise`,
      `6. Authoritative total payable: ${totalRes.value.minorUnits} paise`,
    ],
  });
}

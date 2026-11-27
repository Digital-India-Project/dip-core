import { createDomainError, DomainError, ErrorCode } from '../errors/domainError.js';
import { err, ok, Result } from './result.js';

export type CurrencyCode = 'INR';

export enum RoundingMode {
  HALF_UP = 'HALF_UP',
  FLOOR = 'FLOOR',
  CEIL = 'CEIL',
}

export interface Money {
  readonly minorUnits: number; // INR paise (1 INR = 100 paise)
  readonly currency: CurrencyCode;
}

const MAX_SAFE_MINOR_UNITS = 1_000_000_000_00; // 1000 crore INR in paise

export function createMoney(
  minorUnits: unknown,
  currency: CurrencyCode = 'INR',
  fieldPath = 'amount'
): Result<Money, DomainError> {
  if (currency !== 'INR') {
    return err(
      createDomainError(
        ErrorCode.CURRENCY_MISMATCH,
        `Unsupported currency "${String(currency)}". Only INR minor units are currently supported.`,
        fieldPath
      )
    );
  }
  if (typeof minorUnits !== 'number' || !Number.isInteger(minorUnits)) {
    return err(
      createDomainError(
        ErrorCode.INVALID_MONEY_AMOUNT,
        'Money amount must be an integer in minor units (paise).',
        fieldPath
      )
    );
  }
  if (minorUnits < 0 || minorUnits > MAX_SAFE_MINOR_UNITS) {
    return err(
      createDomainError(
        ErrorCode.INVALID_MONEY_AMOUNT,
        'Money amount is outside allowed non-negative bounds.',
        fieldPath,
        { min: 0, max: MAX_SAFE_MINOR_UNITS }
      )
    );
  }
  return ok({ minorUnits, currency });
}

function validateMoneyOperand(amount: Money, fieldPath: string): Result<Money, DomainError> {
  return createMoney(amount.minorUnits, amount.currency, fieldPath);
}

export function addMoney(a: Money, b: Money): Result<Money, DomainError> {
  const validA = validateMoneyOperand(a, 'a');
  if (!validA.ok) return validA;
  const validB = validateMoneyOperand(b, 'b');
  if (!validB.ok) return validB;

  if (a.currency !== b.currency) {
    return err(
      createDomainError(
        ErrorCode.CURRENCY_MISMATCH,
        `Cannot add ${a.currency} and ${b.currency}.`
      )
    );
  }
  return createMoney(a.minorUnits + b.minorUnits, a.currency);
}

export function subtractMoney(a: Money, b: Money): Result<Money, DomainError> {
  const validA = validateMoneyOperand(a, 'a');
  if (!validA.ok) return validA;
  const validB = validateMoneyOperand(b, 'b');
  if (!validB.ok) return validB;

  if (a.currency !== b.currency) {
    return err(
      createDomainError(
        ErrorCode.CURRENCY_MISMATCH,
        `Cannot subtract ${b.currency} from ${a.currency}.`
      )
    );
  }
  return createMoney(a.minorUnits - b.minorUnits, a.currency);
}

export function sumMoney(
  items: readonly Money[],
  currency: CurrencyCode = 'INR'
): Result<Money, DomainError> {
  let acc = createMoney(0, currency);
  if (!acc.ok) return acc;
  for (const item of items) {
    acc = addMoney(acc.value, item);
    if (!acc.ok) return acc;
  }
  return acc;
}

export function equalsMoney(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.minorUnits === b.minorUnits;
}

/**
 * Pure integer basis-point multiplication (100 bps = 1%, 10000 bps = 100%).
 * Avoids binary floating-point arithmetic entirely.
 */
export function multiplyBasisPoints(
  amount: Money,
  basisPoints: number,
  rounding: RoundingMode = RoundingMode.HALF_UP
): Result<Money, DomainError> {
  const validAmount = validateMoneyOperand(amount, 'amount');
  if (!validAmount.ok) return validAmount;

  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 100_000) {
    return err(
      createDomainError(
        ErrorCode.INVALID_MONEY_AMOUNT,
        'Basis points must be an integer between 0 and 100000.',
        'basisPoints'
      )
    );
  }

  const numerator = BigInt(amount.minorUnits) * BigInt(basisPoints);
  const denominator = 10_000n;
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;

  let rounded = quotient;
  if (remainder > 0n) {
    if (rounding === RoundingMode.CEIL) {
      rounded = quotient + 1n;
    } else if (rounding === RoundingMode.HALF_UP && remainder * 2n >= denominator) {
      rounded = quotient + 1n;
    }
  }

  return createMoney(Number(rounded), amount.currency);
}

export function formatInrFromPaise(minorUnits: number): string {
  const isNegative = minorUnits < 0;
  const abs = Math.abs(Math.trunc(minorUnits));
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;
  const rupeeStr = rupees.toLocaleString('en-IN');
  const paiseStr = paise.toString().padStart(2, '0');
  return `${isNegative ? '-' : ''}₹${rupeeStr}.${paiseStr}`;
}

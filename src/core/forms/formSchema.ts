import { createDomainError, DomainError, ErrorCode } from '../errors/domainError.js';
import { err, ok, Result } from '../common/result.js';
import { isCompatibleSchemaVersion, parseSchemaVersion } from '../common/identifiers.js';

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'boolean'
  | 'email'
  | 'phone'
  | 'pin';

export interface VisibilityCondition {
  readonly dependsOnField: string;
  readonly equalsValue: string | boolean | number;
}

export interface FieldLocalizationMetadata {
  readonly en: string;
  readonly hi?: string;
}

export interface FormFieldSchema {
  readonly key: string;
  readonly label: string;
  readonly localizedLabel?: FieldLocalizationMetadata;
  readonly kind: FieldKind;
  readonly required: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly enumOptions?: readonly string[];
  /** Optional RegExp for in-memory schemas (not JSON-serializable). Prefer patternSource for serialized contracts. */
  readonly pattern?: RegExp;
  /** JSON-serializable regex pattern string, compiled with safety bounds at validation time. */
  readonly patternSource?: string;
  readonly patternDescription?: string;
  readonly visibleWhen?: VisibilityCondition;
}

export interface FormSectionSchema {
  readonly sectionId: string;
  readonly title: string;
  readonly localizedTitle?: FieldLocalizationMetadata;
  readonly fieldKeys: readonly string[];
  readonly repeatable?: boolean;
  readonly minItems?: number;
  readonly maxItems?: number;
}

export interface FormSchemaContract {
  readonly schemaId: string;
  readonly version: string;
  readonly allowUnknownKeys: boolean;
  readonly sections?: readonly FormSectionSchema[];
  readonly fields: readonly FormFieldSchema[];
}

export interface FormValidationSummary {
  readonly schemaId: string;
  readonly schemaVersion: string;
  readonly normalizedValues: Readonly<Record<string, string | number | boolean | readonly string[]>>;
  readonly visibleFieldKeys: readonly string[];
}

export interface FormSchemaCompatibilityResult {
  readonly compatible: boolean;
  readonly reason?: string;
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_PATTERN_LENGTH = 160;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INDIAN_PHONE_PATTERN = /^[6-9][0-9]{9}$/;
const INDIAN_PIN_PATTERN = /^[1-9][0-9]{5}$/;

export function isFieldVisible(
  field: FormFieldSchema,
  rawInput: Readonly<Record<string, unknown>>
): boolean {
  if (!field.visibleWhen) return true;
  const actual = Object.prototype.hasOwnProperty.call(rawInput, field.visibleWhen.dependsOnField)
    ? rawInput[field.visibleWhen.dependsOnField]
    : undefined;
  return actual === field.visibleWhen.equalsValue;
}

function resolvePattern(field: FormFieldSchema): Result<RegExp | undefined, DomainError> {
  if (field.pattern) return ok(field.pattern);
  if (field.patternSource === undefined) return ok(undefined);
  if (field.patternSource.length > MAX_PATTERN_LENGTH) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        `Pattern on field "${field.key}" exceeds safe length limit (${MAX_PATTERN_LENGTH}).`,
        field.key
      )
    );
  }
  // Reject nested quantifiers that risk catastrophic backtracking.
  if (/\([^)]*[+*][^)]*\)[+*]/.test(field.patternSource)) {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        `Pattern on field "${field.key}" uses an unsafe nested quantifier.`,
        field.key
      )
    );
  }
  try {
    return ok(new RegExp(field.patternSource));
  } catch {
    return err(
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        `Pattern on field "${field.key}" is not a valid regular expression.`,
        field.key
      )
    );
  }
}

export function checkFormSchemaCompatibility(
  expectedSchema: FormSchemaContract,
  incomingVersion: string
): FormSchemaCompatibilityResult {
  const expectedVer = parseSchemaVersion(expectedSchema.version, 'expectedVersion');
  if (!expectedVer.ok) {
    return { compatible: false, reason: expectedVer.error.message };
  }
  const actualVer = parseSchemaVersion(incomingVersion, 'incomingVersion');
  if (!actualVer.ok) {
    return { compatible: false, reason: actualVer.error.message };
  }
  if (!isCompatibleSchemaVersion(expectedVer.value, actualVer.value)) {
    return {
      compatible: false,
      reason: `Schema version ${incomingVersion} is incompatible with expected ${expectedSchema.version}.`,
    };
  }
  return { compatible: true };
}

export function validateFormSubmission(
  schema: FormSchemaContract,
  rawPayload: unknown
): Result<FormValidationSummary, readonly DomainError[]> {
  if (rawPayload === null || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return err([
      createDomainError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Submission payload must be a plain JSON object.',
        '$'
      ),
    ]);
  }

  const record = rawPayload as Record<string, unknown>;
  const errors: DomainError[] = [];

  for (const key of Object.keys(record)) {
    if (UNSAFE_KEYS.has(key)) {
      errors.push(
        createDomainError(
          ErrorCode.PROTOTYPE_KEY_REJECTED,
          `Disallowed prototype property key "${key}" rejected at trust boundary.`,
          key
        )
      );
    }
  }

  const knownKeys = new Set(schema.fields.map((f) => f.key));
  if (!schema.allowUnknownKeys) {
    for (const key of Object.keys(record)) {
      if (!UNSAFE_KEYS.has(key) && !knownKeys.has(key)) {
        errors.push(
          createDomainError(
            ErrorCode.UNKNOWN_FIELD_REJECTED,
            `Unknown field "${key}" is not allowed by schema ${schema.schemaId} v${schema.version}.`,
            key
          )
        );
      }
    }
  }

  const normalized: Record<string, string | number | boolean | readonly string[]> = {};
  const visibleFieldKeys: string[] = [];

  for (const field of schema.fields) {
    if (!isFieldVisible(field, record)) {
      continue;
    }
    visibleFieldKeys.push(field.key);

    const hasOwn = Object.prototype.hasOwnProperty.call(record, field.key);
    const val = hasOwn ? record[field.key] : undefined;

    const isEmpty =
      val === undefined ||
      val === null ||
      (typeof val === 'string' && val.trim().length === 0) ||
      (Array.isArray(val) && val.length === 0);

    if (isEmpty) {
      if (field.required) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" is required.`,
            field.key
          )
        );
      }
      continue;
    }

    if (
      field.kind === 'text' ||
      field.kind === 'textarea' ||
      field.kind === 'date' ||
      field.kind === 'select' ||
      field.kind === 'email' ||
      field.kind === 'phone' ||
      field.kind === 'pin'
    ) {
      if (typeof val !== 'string') {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" must be a string.`,
            field.key
          )
        );
        continue;
      }
      const trimmed = val.trim();
      if (field.minLength !== undefined && trimmed.length < field.minLength) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" must be at least ${field.minLength} characters.`,
            field.key
          )
        );
      }
      if (field.maxLength !== undefined && trimmed.length > field.maxLength) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" cannot exceed ${field.maxLength} characters.`,
            field.key
          )
        );
      }
      if (field.enumOptions && !field.enumOptions.includes(trimmed)) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" must be one of: ${field.enumOptions.join(', ')}.`,
            field.key
          )
        );
      }
      if (field.kind === 'email' && !EMAIL_PATTERN.test(trimmed)) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" must be a valid email address.`,
            field.key
          )
        );
      }
      if (field.kind === 'phone' && !INDIAN_PHONE_PATTERN.test(trimmed)) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" must be a 10-digit Indian mobile number.`,
            field.key
          )
        );
      }
      if (field.kind === 'pin' && !INDIAN_PIN_PATTERN.test(trimmed)) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" must be a 6-digit Indian postal PIN code.`,
            field.key
          )
        );
      }
      const patternRes = resolvePattern(field);
      if (!patternRes.ok) {
        errors.push(patternRes.error);
      } else if (patternRes.value && !patternRes.value.test(trimmed)) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            field.patternDescription || `Field "${field.label}" format is invalid.`,
            field.key
          )
        );
      }
      normalized[field.key] = trimmed;
    } else if (field.kind === 'multiselect') {
      if (!Array.isArray(val) || val.some((item) => typeof item !== 'string')) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" must be an array of strings.`,
            field.key
          )
        );
        continue;
      }
      const cleaned = val.map((item) => item.trim()).filter((item) => item.length > 0);
      if (field.enumOptions) {
        for (const option of cleaned) {
          if (!field.enumOptions.includes(option)) {
            errors.push(
              createDomainError(
                ErrorCode.SCHEMA_VALIDATION_FAILED,
                `Option "${option}" on "${field.label}" is not in allowed values.`,
                field.key
              )
            );
          }
        }
      }
      normalized[field.key] = cleaned;
    } else if (field.kind === 'number') {
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" must be a finite number.`,
            field.key
          )
        );
        continue;
      }
      if (field.minValue !== undefined && val < field.minValue) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" must be at least ${field.minValue}.`,
            field.key
          )
        );
      }
      if (field.maxValue !== undefined && val > field.maxValue) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" cannot exceed ${field.maxValue}.`,
            field.key
          )
        );
      }
      normalized[field.key] = val;
    } else if (field.kind === 'boolean') {
      if (typeof val !== 'boolean') {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            `Field "${field.label}" must be a boolean.`,
            field.key
          )
        );
        continue;
      }
      normalized[field.key] = val;
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    schemaId: schema.schemaId,
    schemaVersion: schema.version,
    normalizedValues: normalized,
    visibleFieldKeys,
  });
}

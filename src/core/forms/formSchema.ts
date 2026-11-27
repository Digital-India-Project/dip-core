import { createDomainError, DomainError, ErrorCode } from '../errors/domainError';
import { err, ok, Result } from '../common/result';

export type FieldKind = 'text' | 'number' | 'select' | 'date' | 'boolean';

export interface VisibilityCondition {
  readonly dependsOnField: string;
  readonly equalsValue: string | boolean | number;
}

export interface FormFieldSchema {
  readonly key: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly required: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly enumOptions?: readonly string[];
  readonly pattern?: RegExp;
  readonly patternDescription?: string;
  readonly visibleWhen?: VisibilityCondition;
}

export interface FormSchemaContract {
  readonly schemaId: string;
  readonly version: string;
  readonly allowUnknownKeys: boolean;
  readonly fields: readonly FormFieldSchema[];
}

export interface FormValidationSummary {
  readonly schemaId: string;
  readonly schemaVersion: string;
  readonly normalizedValues: Readonly<Record<string, string | number | boolean>>;
  readonly visibleFieldKeys: readonly string[];
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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

  const normalized: Record<string, string | number | boolean> = {};
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
      (typeof val === 'string' && val.trim().length === 0);

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

    if (field.kind === 'text' || field.kind === 'date' || field.kind === 'select') {
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
      if (field.pattern && !field.pattern.test(trimmed)) {
        errors.push(
          createDomainError(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            field.patternDescription || `Field "${field.label}" format is invalid.`,
            field.key
          )
        );
      }
      normalized[field.key] = trimmed;
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

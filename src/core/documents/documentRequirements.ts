import { ApplicationId, DocumentId, VerificationId } from '../common/identifiers.js';
import { err, ok, Result } from '../common/result.js';
import { isInstantExpired, UtcInstant } from '../common/time.js';
import { createDomainError, DomainError, ErrorCode } from '../errors/domainError.js';

export type AllowedMimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

export type DocumentCategory =
  | 'IDENTITY'
  | 'ADDRESS'
  | 'INCOME'
  | 'BUSINESS'
  | 'TAX'
  | 'OTHER';

export type DocumentVerificationState =
  | 'REQUIRED'
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED';

export type VerificationOutcome = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export interface ExpirationMetadata {
  readonly issuedAt?: UtcInstant;
  readonly expiresAt?: UtcInstant;
}

export interface DocumentRequirement {
  readonly code: string;
  readonly title: string;
  readonly category?: DocumentCategory;
  readonly mandatory: boolean;
  readonly maxSizeBytes: number;
  readonly allowedMimeTypes: readonly AllowedMimeType[];
}

export interface DocumentRecord {
  readonly id: DocumentId;
  readonly requirementCode: string;
  readonly category?: DocumentCategory;
  readonly state: DocumentVerificationState;
  readonly mimeType?: AllowedMimeType;
  readonly sizeBytes?: number;
  readonly updatedAt: UtcInstant;
  readonly expiration?: ExpirationMetadata;
  readonly rejectionReason?: string;
}

export interface VerificationEventContract {
  readonly verificationId: VerificationId;
  readonly applicationId: ApplicationId;
  readonly documentId: DocumentId;
  readonly previousState: DocumentVerificationState;
  readonly nextState: DocumentVerificationState;
  readonly outcome: VerificationOutcome;
  readonly occurredAt: UtcInstant;
  readonly reason?: string;
}

export interface DocumentChecklistEvaluation {
  readonly complete: boolean;
  readonly missingMandatoryCodes: readonly string[];
  readonly expiredDocumentIds: readonly DocumentId[];
  readonly rejectedDocumentIds: readonly DocumentId[];
}

export const DOCUMENT_ALLOWED_TRANSITIONS: Readonly<
  Record<DocumentVerificationState, readonly DocumentVerificationState[]>
> = {
  REQUIRED: ['UPLOADED'],
  UPLOADED: ['UNDER_REVIEW', 'UPLOADED'],
  UNDER_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED: [],
  REJECTED: ['UPLOADED'],
};

export function isDocumentExpired(record: DocumentRecord, referenceNow: UtcInstant): boolean {
  if (!record.expiration?.expiresAt) return false;
  return isInstantExpired(record.expiration.expiresAt, referenceNow);
}

export function validateDocumentMetadata(
  requirement: DocumentRequirement,
  mimeType: string,
  sizeBytes: number
): Result<{ readonly mimeType: AllowedMimeType; readonly sizeBytes: number }, DomainError> {
  if (!requirement.allowedMimeTypes.includes(mimeType as AllowedMimeType)) {
    return err(
      createDomainError(
        ErrorCode.DOCUMENT_CONSTRAINT_FAILED,
        `Unsupported MIME type "${mimeType}". Allowed: ${requirement.allowedMimeTypes.join(', ')}.`,
        'mimeType'
      )
    );
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > requirement.maxSizeBytes) {
    return err(
      createDomainError(
        ErrorCode.DOCUMENT_CONSTRAINT_FAILED,
        `File size must be between 1 byte and ${requirement.maxSizeBytes} bytes.`,
        'sizeBytes',
        { maxSizeBytes: requirement.maxSizeBytes }
      )
    );
  }
  return ok({ mimeType: mimeType as AllowedMimeType, sizeBytes });
}

export function transitionDocumentState(
  record: DocumentRecord,
  nextState: DocumentVerificationState,
  timestamp: UtcInstant,
  rejectionReason?: string
): Result<DocumentRecord, DomainError> {
  const allowed = DOCUMENT_ALLOWED_TRANSITIONS[record.state];
  if (!allowed.includes(nextState)) {
    return err(
      createDomainError(
        ErrorCode.INVALID_STATE_TRANSITION,
        `Document transition ${record.state} -> ${nextState} is not permitted.`,
        'state',
        { from: record.state, to: nextState }
      )
    );
  }
  if (nextState === 'VERIFIED' && isDocumentExpired(record, timestamp)) {
    return err(
      createDomainError(
        ErrorCode.EXPIRED,
        'Cannot verify an expired document.',
        'expiration.expiresAt'
      )
    );
  }
  if (nextState === 'REJECTED' && (!rejectionReason || rejectionReason.trim().length < 5)) {
    return err(
      createDomainError(
        ErrorCode.PRECONDITION_FAILED,
        'Rejecting a document requires a clear reason (minimum 5 characters).',
        'rejectionReason'
      )
    );
  }
  return ok({
    ...record,
    state: nextState,
    updatedAt: timestamp,
    rejectionReason: nextState === 'REJECTED' ? rejectionReason?.trim() : undefined,
  });
}

export function evaluateDocumentChecklist(
  requirements: readonly DocumentRequirement[],
  records: readonly DocumentRecord[],
  referenceNow: UtcInstant
): DocumentChecklistEvaluation {
  const missingMandatoryCodes: string[] = [];
  const expiredDocumentIds: DocumentId[] = [];
  const rejectedDocumentIds: DocumentId[] = [];

  for (const doc of records) {
    if (isDocumentExpired(doc, referenceNow)) {
      expiredDocumentIds.push(doc.id);
    }
    if (doc.state === 'REJECTED') {
      rejectedDocumentIds.push(doc.id);
    }
  }

  for (const req of requirements) {
    if (!req.mandatory) continue;
    const matching = records.filter((r) => r.requirementCode === req.code);
    const hasActiveVerified = matching.some(
      (r) => r.state === 'VERIFIED' && !isDocumentExpired(r, referenceNow)
    );
    if (!hasActiveVerified) {
      missingMandatoryCodes.push(req.code);
    }
  }

  return {
    complete:
      missingMandatoryCodes.length === 0 &&
      expiredDocumentIds.length === 0 &&
      rejectedDocumentIds.length === 0,
    missingMandatoryCodes,
    expiredDocumentIds,
    rejectedDocumentIds,
  };
}

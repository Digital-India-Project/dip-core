import { DocumentId } from '../common/identifiers';
import { err, ok, Result } from '../common/result';
import { UtcInstant } from '../common/time';
import { createDomainError, DomainError, ErrorCode } from '../errors/domainError';

export type AllowedMimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

export type DocumentVerificationState =
  | 'REQUIRED'
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED';

export interface DocumentRequirement {
  readonly code: string;
  readonly title: string;
  readonly mandatory: boolean;
  readonly maxSizeBytes: number;
  readonly allowedMimeTypes: readonly AllowedMimeType[];
}

export interface DocumentRecord {
  readonly id: DocumentId;
  readonly requirementCode: string;
  readonly state: DocumentVerificationState;
  readonly mimeType?: AllowedMimeType;
  readonly sizeBytes?: number;
  readonly updatedAt: UtcInstant;
  readonly rejectionReason?: string;
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

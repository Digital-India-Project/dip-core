import { ApplicationContract } from '../applications/applicationLifecycle';
import {
  ApplicationId,
  DocumentId,
  OrderId,
  PartnerId,
  PaymentId,
  ServiceId,
  UserId,
} from '../common/identifiers';
import { UtcInstant } from '../common/time';
import { DocumentRecord, DocumentRequirement } from '../documents/documentRequirements';
import { FormSchemaContract } from '../forms/formSchema';
import { PartnerContract } from '../partners/partnerContract';
import { PaymentOrderContract } from '../payments/paymentLifecycle';
import { ServiceDefinition } from '../services/catalogueAndPricing';

const SYNTH_TS = '2026-11-27T09:00:00.000Z' as UtcInstant;

export const SYNTHETIC_SERVICES: readonly ServiceDefinition[] = [
  {
    id: 'svc_pan_correction_01' as ServiceId,
    code: 'DIP-PAN-CORR',
    category: 'TAX_COMPLIANCE',
    availability: 'ACTIVE',
    title: {
      en: 'PAN Card Correction & Reprint Facilitation',
      hi: 'पैन कार्ड सुधार एवं पुनर्मुद्रण सहायता',
    },
    summary: 'Demographic correction filing with statutory NSDL/UTIITSL fee separation.',
    statutoryFeePaise: 10700,
    facilitationFeePaise: 15000,
    gstBasisPoints: 1800,
    estimatedTurnaroundDays: 10,
    contractVersion: '0.1.0',
  },
  {
    id: 'svc_income_cert_02' as ServiceId,
    code: 'DIP-INC-CERT',
    category: 'CERTIFICATES',
    availability: 'ACTIVE',
    title: {
      en: 'State Income Certificate Filing',
      hi: 'राज्य आय प्रमाण पत्र आवेदन',
    },
    summary: 'Tehsil-level income verification workflow with mandatory residence proof.',
    statutoryFeePaise: 2500,
    facilitationFeePaise: 10000,
    gstBasisPoints: 1800,
    estimatedTurnaroundDays: 7,
    contractVersion: '0.1.0',
  },
  {
    id: 'svc_udyam_reg_03' as ServiceId,
    code: 'DIP-MSME-UDYAM',
    category: 'BUSINESS_REGISTRATION',
    availability: 'ACTIVE',
    title: {
      en: 'MSME Udyam Registration Assistance',
      hi: 'एमएसएमई उद्यम पंजीकरण सहायता',
    },
    summary: 'Zero statutory government fee; facilitation and GST apply to assisted filing.',
    statutoryFeePaise: 0,
    facilitationFeePaise: 24900,
    gstBasisPoints: 1800,
    estimatedTurnaroundDays: 2,
    contractVersion: '0.1.0',
  },
  {
    id: 'svc_ration_legacy_04' as ServiceId,
    code: 'DIP-PDS-LEGACY',
    category: 'WELFARE',
    availability: 'MAINTENANCE',
    title: {
      en: 'PDS Ration Card Split (State Portal Maintenance)',
      hi: 'राशन कार्ड विभाजन (रखरखाव में)',
    },
    summary: 'Temporarily paused pending state e-District schema alignment.',
    statutoryFeePaise: 1500,
    facilitationFeePaise: 8000,
    gstBasisPoints: 1800,
    estimatedTurnaroundDays: 14,
    contractVersion: '0.1.0',
  },
];

export const SYNTHETIC_PARTNERS: readonly PartnerContract[] = [
  {
    id: 'ptr_synth_csc_01' as PartnerId,
    code: 'CSC-DL-014',
    displayName: 'Synthetic Seva Kendra (Sample District 01)',
    tier: 'CSC_CENTER',
    status: 'ACTIVE',
    stateCode: 'DL',
  },
];

export const SYNTHETIC_APPLICATIONS: readonly ApplicationContract[] = [
  {
    id: 'app_synth_1001' as ApplicationId,
    applicantId: 'usr_synth_001' as UserId,
    serviceId: 'svc_pan_correction_01' as ServiceId,
    assignedPartnerId: 'ptr_synth_csc_01' as PartnerId,
    state: 'DRAFT',
    paymentCaptured: false,
    requiredDocumentsVerified: false,
    updatedAt: SYNTH_TS,
  },
  {
    id: 'app_synth_1002' as ApplicationId,
    applicantId: 'usr_synth_002' as UserId,
    serviceId: 'svc_income_cert_02' as ServiceId,
    assignedPartnerId: 'ptr_synth_csc_01' as PartnerId,
    state: 'PAYMENT_PENDING',
    paymentCaptured: true,
    requiredDocumentsVerified: true,
    updatedAt: SYNTH_TS,
  },
  {
    id: 'app_synth_1003' as ApplicationId,
    applicantId: 'usr_synth_003' as UserId,
    serviceId: 'svc_udyam_reg_03' as ServiceId,
    state: 'IN_REVIEW',
    paymentCaptured: true,
    requiredDocumentsVerified: false,
    updatedAt: SYNTH_TS,
  },
];

export const SYNTHETIC_PAYMENT_ORDERS: readonly PaymentOrderContract[] = [
  {
    orderId: 'ord_synth_5001' as OrderId,
    paymentId: 'pay_synth_5001' as PaymentId,
    applicationId: 'app_synth_1001' as ApplicationId,
    amount: { minorUnits: 28400, currency: 'INR' },
    capturedPaise: 0,
    refundedPaise: 0,
    state: 'CREATED',
    updatedAt: SYNTH_TS,
  },
  {
    orderId: 'ord_synth_5002' as OrderId,
    paymentId: 'pay_synth_5002' as PaymentId,
    applicationId: 'app_synth_1002' as ApplicationId,
    amount: { minorUnits: 14300, currency: 'INR' },
    capturedPaise: 14300,
    refundedPaise: 0,
    state: 'CAPTURED',
    updatedAt: SYNTH_TS,
  },
];

export const SYNTHETIC_DOCUMENT_REQUIREMENTS: readonly DocumentRequirement[] = [
  {
    code: 'DOC_IDENTITY_PROOF',
    title: 'Government Photo Identity Proof (Synthetic Sample)',
    mandatory: true,
    maxSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    code: 'DOC_ADDRESS_PROOF',
    title: 'Residential Address Proof (Synthetic Sample)',
    mandatory: true,
    maxSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg'],
  },
];

export const SYNTHETIC_DOCUMENTS: readonly DocumentRecord[] = [
  {
    id: 'doc_synth_9001' as DocumentId,
    requirementCode: 'DOC_IDENTITY_PROOF',
    state: 'UPLOADED',
    mimeType: 'application/pdf',
    sizeBytes: 428_500,
    updatedAt: SYNTH_TS,
  },
  {
    id: 'doc_synth_9002' as DocumentId,
    requirementCode: 'DOC_ADDRESS_PROOF',
    state: 'REQUIRED',
    updatedAt: SYNTH_TS,
  },
];

export const SYNTHETIC_FORM_SCHEMA: FormSchemaContract = {
  schemaId: 'dip.service.intake.v1',
  version: '0.1.0',
  allowUnknownKeys: false,
  fields: [
    {
      key: 'applicantCategory',
      label: 'Applicant Category',
      kind: 'select',
      required: true,
      enumOptions: ['INDIVIDUAL', 'ENTERPRISE'],
    },
    {
      key: 'fullName',
      label: 'Applicant Name (Synthetic)',
      kind: 'text',
      required: true,
      minLength: 3,
      maxLength: 80,
    },
    {
      key: 'stateCode',
      label: 'State / UT Code',
      kind: 'select',
      required: true,
      enumOptions: ['DL', 'MH', 'KA', 'TN', 'UP', 'GJ'],
    },
    {
      key: 'pinCode',
      label: 'Postal PIN Code',
      kind: 'text',
      required: true,
      pattern: /^[1-9][0-9]{5}$/,
      patternDescription: 'Postal PIN Code must be a 6-digit Indian PIN starting with 1-9.',
    },
    {
      key: 'declaredAnnualIncomeInr',
      label: 'Declared Annual Income (INR)',
      kind: 'number',
      required: true,
      minValue: 0,
      maxValue: 50_000_000,
      visibleWhen: { dependsOnField: 'applicantCategory', equalsValue: 'INDIVIDUAL' },
    },
    {
      key: 'enterpriseGstin',
      label: 'Enterprise GSTIN (15-char)',
      kind: 'text',
      required: true,
      pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      patternDescription: 'GSTIN must follow the 15-character Indian GST format.',
      visibleWhen: { dependsOnField: 'applicantCategory', equalsValue: 'ENTERPRISE' },
    },
    {
      key: 'consentAccepted',
      label: 'Synthetic Processing Consent',
      kind: 'boolean',
      required: true,
    },
  ],
};

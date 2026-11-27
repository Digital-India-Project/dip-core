import { useMemo, useState } from 'react';
import {
  isFieldVisible,
  SYNTHETIC_DOCUMENT_REQUIREMENTS,
  SYNTHETIC_FORM_SCHEMA,
  validateDocumentMetadata,
  validateFormSubmission,
} from '../core';

export function FormsValidationView() {
  const [applicantCategory, setApplicantCategory] = useState<string>('INDIVIDUAL');
  const [fullName, setFullName] = useState<string>('Meera Sample');
  const [stateCode, setStateCode] = useState<string>('DL');
  const [pinCode, setPinCode] = useState<string>('110001');
  const [declaredAnnualIncomeInr, setDeclaredAnnualIncomeInr] = useState<string>('320000');
  const [enterpriseGstin, setEnterpriseGstin] = useState<string>('07AABCS1429B1Z5');
  const [consentAccepted, setConsentAccepted] = useState<boolean>(true);
  const [injectUnknownKey, setInjectUnknownKey] = useState<boolean>(false);
  const [injectProtoKey, setInjectProtoKey] = useState<boolean>(false);

  const [docMime, setDocMime] = useState<string>('application/pdf');
  const [docSizeBytes, setDocSizeBytes] = useState<number>(428_500);

  const rawPayload = useMemo(() => {
    const base: Record<string, unknown> = {
      applicantCategory,
      fullName,
      stateCode,
      pinCode,
      declaredAnnualIncomeInr:
        declaredAnnualIncomeInr.trim() === '' ? undefined : Number(declaredAnnualIncomeInr),
      enterpriseGstin,
      consentAccepted,
    };
    if (injectUnknownKey) {
      base.adminBypassFlag = true;
    }
    if (injectProtoKey) {
      Object.defineProperty(base, '__proto__', {
        value: { polluted: true },
        enumerable: true,
        configurable: true,
      });
    }
    return base;
  }, [
    applicantCategory,
    fullName,
    stateCode,
    pinCode,
    declaredAnnualIncomeInr,
    enterpriseGstin,
    consentAccepted,
    injectUnknownKey,
    injectProtoKey,
  ]);

  const formValidationResult = useMemo(
    () => validateFormSubmission(SYNTHETIC_FORM_SCHEMA, rawPayload),
    [rawPayload]
  );

  const docRequirement = SYNTHETIC_DOCUMENT_REQUIREMENTS[0];
  const docValidationResult = useMemo(
    () => validateDocumentMetadata(docRequirement, docMime, docSizeBytes),
    [docRequirement, docMime, docSizeBytes]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Synthetic Form Trust-Boundary Input
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Schema {SYNTHETIC_FORM_SCHEMA.schemaId} v{SYNTHETIC_FORM_SCHEMA.version} · Conditional
            visibility &amp; strict key filtering
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">Applicant Category</span>
              <select
                value={applicantCategory}
                onChange={(e) => setApplicantCategory(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
              >
                <option value="INDIVIDUAL">INDIVIDUAL</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">State / UT Code</span>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
              >
                {['DL', 'MH', 'KA', 'TN', 'UP', 'GJ'].map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">Applicant Name (Synthetic)</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Postal PIN Code</span>
              <input
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md"
              />
            </label>
          </div>

          {isFieldVisible(SYNTHETIC_FORM_SCHEMA.fields[4], rawPayload) && (
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Declared Annual Income (INR) — Conditional on INDIVIDUAL
              </span>
              <input
                type="number"
                value={declaredAnnualIncomeInr}
                onChange={(e) => setDeclaredAnnualIncomeInr(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md"
              />
            </label>
          )}

          {isFieldVisible(SYNTHETIC_FORM_SCHEMA.fields[5], rawPayload) && (
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Enterprise GSTIN (15-char) — Conditional on ENTERPRISE
              </span>
              <input
                type="text"
                value={enterpriseGstin}
                onChange={(e) => setEnterpriseGstin(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md"
              />
            </label>
          )}

          <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-slate-700">Synthetic Processing Consent</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={injectUnknownKey}
                onChange={(e) => setInjectUnknownKey(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="font-mono text-amber-800">
                Inject unknown key (&quot;adminBypassFlag&quot;)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={injectProtoKey}
                onChange={(e) => setInjectProtoKey(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="font-mono text-red-800">
                Inject prototype pollution key (&quot;__proto__&quot;)
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="text-xs font-semibold text-slate-800">
              Document Metadata Constraint Check ({docRequirement.code})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-700">MIME Type</span>
                <select
                  value={docMime}
                  onChange={(e) => setDocMime(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md"
                >
                  <option value="application/pdf">application/pdf</option>
                  <option value="image/jpeg">image/jpeg</option>
                  <option value="image/png">image/png</option>
                  <option value="application/x-msdownload">application/x-msdownload (invalid)</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-700">
                  Size (Bytes, max {docRequirement.maxSizeBytes})
                </span>
                <input
                  type="number"
                  value={docSizeBytes}
                  onChange={(e) => setDocSizeBytes(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="lg:col-span-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900">
              Runtime Form Validation Output
            </h2>
            <span
              className={`text-xs font-mono font-medium whitespace-nowrap shrink-0 ${
                formValidationResult.ok ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {formValidationResult.ok
                ? 'VALID'
                : `${formValidationResult.error.length} ERROR(S)`}
            </span>
          </div>

          <div className="p-6">
            {formValidationResult.ok ? (
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-md text-xs overflow-x-auto leading-relaxed">
                {JSON.stringify(formValidationResult.value, null, 2)}
              </pre>
            ) : (
              <div className="space-y-2">
                {formValidationResult.error.map((errItem, idx) => (
                  <div
                    key={`${errItem.code}-${idx}`}
                    className="p-3 bg-red-50 border border-red-200 rounded-md text-xs space-y-0.5"
                  >
                    <div className="font-mono font-semibold text-red-800">
                      {errItem.code} {errItem.fieldPath ? `(${errItem.fieldPath})` : ''}
                    </div>
                    <div className="text-red-900">{errItem.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900">
              Document Metadata Validation Output
            </h2>
            <span
              className={`text-xs font-mono font-medium whitespace-nowrap shrink-0 ${
                docValidationResult.ok ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {docValidationResult.ok ? 'VALID' : docValidationResult.error.code}
            </span>
          </div>

          <div className="p-6">
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-md text-xs overflow-x-auto leading-relaxed">
              {JSON.stringify(
                docValidationResult.ok ? docValidationResult.value : docValidationResult.error,
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useState } from 'react';
import {
  ActorRole,
  APPLICATION_ALLOWED_TRANSITIONS,
  ApplicationContract,
  ApplicationState,
  DOCUMENT_ALLOWED_TRANSITIONS,
  DocumentRecord,
  DocumentVerificationState,
  DomainError,
  formatInrFromPaise,
  PAYMENT_ALLOWED_TRANSITIONS,
  PaymentOrderContract,
  PaymentState,
  RefundId,
  SYNTHETIC_APPLICATIONS,
  SYNTHETIC_DOCUMENTS,
  SYNTHETIC_PAYMENT_ORDERS,
  transitionApplicationState,
  transitionDocumentState,
  transitionPaymentState,
  UtcInstant,
} from '../core';

type MachineTab = 'application' | 'payment' | 'document';

const ALL_APP_STATES: readonly ApplicationState[] = [
  'DRAFT',
  'SUBMITTED',
  'PAYMENT_PENDING',
  'IN_REVIEW',
  'RESUBMISSION_REQUIRED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
];

const ALL_PAYMENT_STATES: readonly PaymentState[] = [
  'CREATED',
  'PENDING',
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
];

const ALL_DOC_STATES: readonly DocumentVerificationState[] = [
  'REQUIRED',
  'UPLOADED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
];

const TEST_TIMESTAMP = '2026-11-27T09:45:00.000Z' as UtcInstant;

export function StateMachinesView() {
  const [machineTab, setMachineTab] = useState<MachineTab>('application');

  const [applications, setApplications] = useState<readonly ApplicationContract[]>(
    SYNTHETIC_APPLICATIONS
  );
  const [selectedAppIdx, setSelectedAppIdx] = useState<number>(0);
  const [actorRole, setActorRole] = useState<ActorRole>('OPERATOR');
  const [transitionReason, setTransitionReason] = useState<string>(
    'Verified synthetic checklist'
  );

  const [payments, setPayments] = useState<readonly PaymentOrderContract[]>(
    SYNTHETIC_PAYMENT_ORDERS
  );
  const [selectedPayIdx, setSelectedPayIdx] = useState<number>(0);
  const [refundAmountPaise, setRefundAmountPaise] = useState<number>(5000);

  const [documents, setDocuments] = useState<readonly DocumentRecord[]>(SYNTHETIC_DOCUMENTS);
  const [selectedDocIdx, setSelectedDocIdx] = useState<number>(0);
  const [docReason, setDocReason] = useState<string>('Blurry scan on synthetic sample');

  const [lastOutcome, setLastOutcome] = useState<{
    ok: boolean;
    summary: string;
    payload: unknown;
    error?: DomainError;
  } | null>(null);

  const currentApp = applications[selectedAppIdx];
  const currentPayment = payments[selectedPayIdx];
  const currentDoc = documents[selectedDocIdx];

  const handleApplicationTransition = (targetState: ApplicationState) => {
    const res = transitionApplicationState(currentApp, {
      targetState,
      actorRole,
      timestamp: TEST_TIMESTAMP,
      reason: transitionReason,
    });
    if (res.ok) {
      setApplications((prev) =>
        prev.map((a, idx) => (idx === selectedAppIdx ? res.value.application : a))
      );
      setLastOutcome({
        ok: true,
        summary: `Application transitioned ${res.value.event.fromState} -> ${res.value.event.toState}`,
        payload: res.value.event,
      });
    } else {
      setLastOutcome({
        ok: false,
        summary: `Rejected transition ${currentApp.state} -> ${targetState}`,
        payload: res.error,
        error: res.error,
      });
    }
  };

  const handleToggleAppFlag = (field: 'paymentCaptured' | 'requiredDocumentsVerified') => {
    setApplications((prev) =>
      prev.map((a, idx) => (idx === selectedAppIdx ? { ...a, [field]: !a[field] } : a))
    );
  };

  const handlePaymentTransition = (targetState: PaymentState) => {
    const res = transitionPaymentState(
      currentPayment,
      targetState,
      TEST_TIMESTAMP,
      targetState === 'PARTIALLY_REFUNDED' || targetState === 'REFUNDED'
        ? {
            refundId: 'ref_synth_01' as RefundId,
            amountPaise: refundAmountPaise,
            reason: 'Synthetic refund verification',
          }
        : undefined
    );
    if (res.ok) {
      setPayments((prev) => prev.map((p, idx) => (idx === selectedPayIdx ? res.value : p)));
      setLastOutcome({
        ok: true,
        summary: `Payment transitioned ${currentPayment.state} -> ${res.value.state}`,
        payload: res.value,
      });
    } else {
      setLastOutcome({
        ok: false,
        summary: `Rejected payment transition ${currentPayment.state} -> ${targetState}`,
        payload: res.error,
        error: res.error,
      });
    }
  };

  const handleDocumentTransition = (targetState: DocumentVerificationState) => {
    const res = transitionDocumentState(currentDoc, targetState, TEST_TIMESTAMP, docReason);
    if (res.ok) {
      setDocuments((prev) => prev.map((d, idx) => (idx === selectedDocIdx ? res.value : d)));
      setLastOutcome({
        ok: true,
        summary: `Document transitioned ${currentDoc.state} -> ${res.value.state}`,
        payload: res.value,
      });
    } else {
      setLastOutcome({
        ok: false,
        summary: `Rejected document transition ${currentDoc.state} -> ${targetState}`,
        payload: res.error,
        error: res.error,
      });
    }
  };

  const handleResetLocal = () => {
    setApplications(SYNTHETIC_APPLICATIONS);
    setPayments(SYNTHETIC_PAYMENT_ORDERS);
    setDocuments(SYNTHETIC_DOCUMENTS);
    setLastOutcome(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-md self-start"
          role="tablist"
        >
          {(
            [
              { id: 'application', label: 'Application Lifecycle' },
              { id: 'payment', label: 'Payment & Refund' },
              { id: 'document', label: 'Document Verification' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMachineTab(tab.id);
                setLastOutcome(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                machineTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleResetLocal}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          Restore Synthetic States
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          {machineTab === 'application' && (
            <>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Application State Transitions
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any target state below to test allowed transitions and precondition guards
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap shrink-0">
                  {currentApp.state}
                </span>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {applications.map((app, idx) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedAppIdx(idx)}
                      className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                        idx === selectedAppIdx
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {app.id} · {app.state}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">Actor Role</span>
                    <select
                      value={actorRole}
                      onChange={(e) => setActorRole(e.target.value as ActorRole)}
                      className="mt-1 w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md"
                    >
                      <option value="APPLICANT">APPLICANT</option>
                      <option value="OPERATOR">OPERATOR</option>
                      <option value="VERIFIER">VERIFIER</option>
                      <option value="SYSTEM">SYSTEM</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">
                      Transition Reason (min 5 chars for rejections/resubmits)
                    </span>
                    <input
                      type="text"
                      value={transitionReason}
                      onChange={(e) => setTransitionReason(e.target.value)}
                      className="mt-1 w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-6 py-2 border-y border-slate-200 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentApp.paymentCaptured}
                      onChange={() => handleToggleAppFlag('paymentCaptured')}
                      className="rounded border-slate-300"
                    />
                    <span className="font-mono text-slate-700">paymentCaptured</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentApp.requiredDocumentsVerified}
                      onChange={() => handleToggleAppFlag('requiredDocumentsVerified')}
                      className="rounded border-slate-300"
                    />
                    <span className="font-mono text-slate-700">requiredDocumentsVerified</span>
                  </label>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-600 mb-2">
                    Attempt Target State (Allowed targets highlighted in slate; invalid targets
                    remain clickable to verify rejection)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_APP_STATES.map((target) => {
                      const isAllowed =
                        APPLICATION_ALLOWED_TRANSITIONS[currentApp.state].includes(target);
                      const isCurrent = currentApp.state === target;
                      return (
                        <button
                          key={target}
                          type="button"
                          onClick={() => handleApplicationTransition(target)}
                          disabled={isCurrent}
                          className={`px-3 py-2 text-xs font-mono rounded-md border text-left transition-colors truncate ${
                            isCurrent
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : isAllowed
                                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-700'
                          }`}
                        >
                          {target}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {machineTab === 'payment' && (
            <>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Payment &amp; Refund State Transitions
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Normalized order/payment/refund domain rules without Cashfree SDK calls
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap shrink-0">
                  {currentPayment.state}
                </span>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {payments.map((pay, idx) => (
                    <button
                      key={pay.orderId}
                      type="button"
                      onClick={() => setSelectedPayIdx(idx)}
                      className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                        idx === selectedPayIdx
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pay.orderId} · {pay.state}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 py-3 border-y border-slate-200 text-xs font-mono tabular-nums">
                  <div>
                    <div className="text-slate-500 font-sans">Order Amount</div>
                    <div className="text-slate-900 font-semibold mt-0.5">
                      {formatInrFromPaise(currentPayment.amount.minorUnits)} (
                      {currentPayment.amount.minorUnits}p)
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-sans">Captured</div>
                    <div className="text-slate-900 font-semibold mt-0.5">
                      {currentPayment.capturedPaise}p
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-sans">Refunded</div>
                    <div className="text-slate-900 font-semibold mt-0.5">
                      {currentPayment.refundedPaise}p
                    </div>
                  </div>
                </div>

                <label className="block max-w-xs">
                  <span className="text-xs font-medium text-slate-700">
                    Refund Amount (paise)
                  </span>
                  <input
                    type="number"
                    value={refundAmountPaise}
                    onChange={(e) => setRefundAmountPaise(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                  />
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_PAYMENT_STATES.map((target) => {
                    const isAllowed =
                      PAYMENT_ALLOWED_TRANSITIONS[currentPayment.state].includes(target);
                    const isCurrent = currentPayment.state === target;
                    return (
                      <button
                        key={target}
                        type="button"
                        onClick={() => handlePaymentTransition(target)}
                        disabled={isCurrent}
                        className={`px-3 py-2 text-xs font-mono rounded-md border text-left transition-colors truncate ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : isAllowed
                              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-700'
                        }`}
                      >
                        {target}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {machineTab === 'document' && (
            <>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Document Verification State Machine
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Metadata and verification transitions without storing file bytes in core
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap shrink-0">
                  {currentDoc.state}
                </span>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {documents.map((doc, idx) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDocIdx(idx)}
                      className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                        idx === selectedDocIdx
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {doc.id} · {doc.state}
                    </button>
                  ))}
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-slate-700">
                    Rejection Reason (required for REJECTED state)
                  </span>
                  <input
                    type="text"
                    value={docReason}
                    onChange={(e) => setDocReason(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_DOC_STATES.map((target) => {
                    const isAllowed =
                      DOCUMENT_ALLOWED_TRANSITIONS[currentDoc.state].includes(target);
                    const isCurrent = currentDoc.state === target;
                    return (
                      <button
                        key={target}
                        type="button"
                        onClick={() => handleDocumentTransition(target)}
                        disabled={isCurrent}
                        className={`px-3 py-2 text-xs font-mono rounded-md border text-left transition-colors truncate ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : isAllowed
                              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-700'
                        }`}
                      >
                        {target}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900">Structured Transition Result</h2>
            {lastOutcome && (
              <span
                className={`text-xs font-mono font-medium whitespace-nowrap shrink-0 ${
                  lastOutcome.ok ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {lastOutcome.ok ? 'ALLOWED' : 'REJECTED'}
              </span>
            )}
          </div>

          <div className="p-6">
            {!lastOutcome ? (
              <div className="text-sm text-slate-600 space-y-2">
                <p>
                  Select any target state button on the left to invoke the pure state machine
                  function and inspect its returned <code className="text-xs">Result</code>.
                </p>
                <p className="text-xs text-slate-500">
                  Invalid transitions and unmet preconditions return a structured{' '}
                  <code className="text-xs">DomainError</code> without mutating state.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`p-3 rounded-md border text-xs ${
                    lastOutcome.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <div className="font-medium">{lastOutcome.summary}</div>
                  {lastOutcome.error && (
                    <div className="mt-1 font-mono">{lastOutcome.error.code}</div>
                  )}
                </div>

                <pre className="p-3 bg-slate-900 text-slate-100 rounded-md text-xs overflow-x-auto leading-relaxed">
                  {JSON.stringify(lastOutcome.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

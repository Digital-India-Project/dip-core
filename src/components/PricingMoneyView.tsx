import { useMemo, useState } from 'react';
import {
  calculateServiceQuote,
  ConcessionTier,
  formatInrFromPaise,
  RoundingMode,
  SYNTHETIC_SERVICES,
} from '../core';

export function PricingMoneyView() {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(SYNTHETIC_SERVICES[0].id);
  const [quantity, setQuantity] = useState<number>(1);
  const [concession, setConcession] = useState<ConcessionTier>('NONE');
  const [roundingMode, setRoundingMode] = useState<RoundingMode>(RoundingMode.HALF_UP);

  const selectedService = useMemo(
    () => SYNTHETIC_SERVICES.find((s) => s.id === selectedServiceId) ?? SYNTHETIC_SERVICES[0],
    [selectedServiceId]
  );

  const quoteResult = useMemo(
    () =>
      calculateServiceQuote({
        service: selectedService,
        quantity,
        concession,
        roundingMode,
      }),
    [selectedService, quantity, concession, roundingMode]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Synthetic Service Catalogue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a service contract and calculation parameters
            </p>
          </div>

          <div className="divide-y divide-slate-200">
            {SYNTHETIC_SERVICES.map((svc) => {
              const isSelected = svc.id === selectedService.id;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setSelectedServiceId(svc.id)}
                  className={`w-full text-left px-6 py-3.5 transition-colors ${
                    isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">{svc.title.en}</span>
                    <span
                      className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                        svc.availability === 'ACTIVE' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {svc.availability}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                    <span>{svc.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>Statutory {svc.statutoryFeePaise}p</span>
                    <span aria-hidden="true">·</span>
                    <span>Facilitation {svc.facilitationFeePaise}p</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-6 border-t border-slate-200 space-y-4 bg-slate-50/50">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-700">Quantity (1–50)</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="mt-1.5 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-700">Rounding Mode</span>
                <select
                  value={roundingMode}
                  onChange={(e) => setRoundingMode(e.target.value as RoundingMode)}
                  className="mt-1.5 w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value={RoundingMode.HALF_UP}>HALF_UP</option>
                  <option value={RoundingMode.FLOOR}>FLOOR</option>
                  <option value={RoundingMode.CEIL}>CEIL</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Concession Tier</span>
              <select
                value={concession}
                onChange={(e) => setConcession(e.target.value as ConcessionTier)}
                className="mt-1.5 w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="NONE">NONE (0 bps)</option>
                <option value="SENIOR_CITIZEN_10">SENIOR_CITIZEN_10 (1000 bps / 10%)</option>
                <option value="CSC_BULK_15">CSC_BULK_15 (1500 bps / 15%)</option>
                <option value="BPL_SUBSIDY_50">BPL_SUBSIDY_50 (5000 bps / 50%)</option>
              </select>
            </label>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Deterministic Paise Quote Output
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Computed via calculateServiceQuote() using BigInt basis-point arithmetic
              </p>
            </div>
            <span
              className={`text-xs font-mono font-medium whitespace-nowrap shrink-0 ${
                quoteResult.ok ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {quoteResult.ok ? 'RESULT: OK' : `RESULT: ${quoteResult.error.code}`}
            </span>
          </div>

          {!quoteResult.ok ? (
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md space-y-1">
                <div className="text-xs font-mono font-semibold text-red-800">
                  {quoteResult.error.code}
                </div>
                <div className="text-sm text-red-900">{quoteResult.error.message}</div>
                {quoteResult.error.fieldPath && (
                  <div className="text-xs font-mono text-red-700">
                    fieldPath: {quoteResult.error.fieldPath}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600">
                Try adjusting quantity into 1–50 or selecting an ACTIVE service contract.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs text-slate-500">Statutory Subtotal</div>
                  <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                    {formatInrFromPaise(quoteResult.value.statutorySubtotal.minorUnits)}
                  </div>
                  <div className="text-xs font-mono text-slate-500 tabular-nums">
                    {quoteResult.value.statutorySubtotal.minorUnits} paise
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Taxable Facilitation</div>
                  <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                    {formatInrFromPaise(quoteResult.value.facilitationTaxable.minorUnits)}
                  </div>
                  <div className="text-xs font-mono text-slate-500 tabular-nums">
                    {quoteResult.value.facilitationTaxable.minorUnits} paise
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Total Payable</div>
                  <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                    {formatInrFromPaise(quoteResult.value.totalPayable.minorUnits)}
                  </div>
                  <div className="text-xs font-mono text-slate-500 tabular-nums">
                    {quoteResult.value.totalPayable.minorUnits} paise
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xs font-semibold text-slate-700 mb-3">
                  Authoritative Calculation Ledger
                </h3>
                <div className="space-y-2 font-mono text-xs text-slate-700 tabular-nums">
                  {quoteResult.value.calculationSteps.map((step) => (
                    <div key={step} className="py-1 border-b border-slate-100 last:border-b-0">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50/60">
                <h3 className="text-xs font-semibold text-slate-700 mb-2">
                  Serialized Domain DTO (Minor Units + ISO Currency)
                </h3>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-md text-xs overflow-x-auto leading-relaxed">
                  {JSON.stringify(
                    {
                      serviceId: quoteResult.value.serviceId,
                      localizedTitleHi: selectedService.title.hi,
                      quantity: quoteResult.value.quantity,
                      concession: quoteResult.value.concession,
                      roundingMode: quoteResult.value.roundingMode,
                      statutorySubtotal: quoteResult.value.statutorySubtotal,
                      concessionDiscount: quoteResult.value.concessionDiscount,
                      gstAmount: quoteResult.value.gstAmount,
                      totalPayable: quoteResult.value.totalPayable,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  asApplicationId,
  asOrderId,
  asProviderReferenceId,
  asServiceId,
  asUserId,
} from '../core';
import { ContractCheckResult, runContractSelfChecks } from '../core/contracts/selfCheckSuite';

type IdTarget = 'applicationId' | 'orderId' | 'serviceId' | 'userId' | 'providerReferenceId';

export function ContractSuiteView() {
  const [checks, setChecks] = useState<readonly ContractCheckResult[]>(() =>
    runContractSelfChecks()
  );
  const [idTarget, setIdTarget] = useState<IdTarget>('applicationId');
  const [rawId, setRawId] = useState<string>('app_synth_1001');

  const passedCount = checks.filter((c) => c.passed).length;

  const idValidation = useMemo(() => {
    switch (idTarget) {
      case 'applicationId':
        return asApplicationId(rawId);
      case 'orderId':
        return asOrderId(rawId);
      case 'serviceId':
        return asServiceId(rawId);
      case 'userId':
        return asUserId(rawId);
      case 'providerReferenceId':
        return asProviderReferenceId(rawId);
    }
  }, [idTarget, rawId]);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Deterministic Contract &amp; Invariant Checks
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live execution of pure domain assertions ({passedCount}/{checks.length} passed)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setChecks(runContractSelfChecks())}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            Re-run Contract Suite
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-6">Check ID</th>
                <th className="py-2.5 px-4">Module</th>
                <th className="py-2.5 px-4">Invariant</th>
                <th className="py-2.5 px-4">Actual Result</th>
                <th className="py-2.5 px-6 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {checks.map((chk) => (
                <tr key={chk.id} className="hover:bg-slate-50/75">
                  <td className="py-3 px-6 font-mono text-slate-600 whitespace-nowrap">
                    {chk.id}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                    {chk.module}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">{chk.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{chk.actual}</td>
                  <td className="py-3 px-6 text-right font-mono font-semibold whitespace-nowrap">
                    <span className={chk.passed ? 'text-emerald-700' : 'text-red-700'}>
                      {chk.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Branded Identifier Boundary Tester
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verifies prefix isolation so provider IDs cannot masquerade as internal primary IDs
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <label className="md:col-span-4 block">
            <span className="text-xs font-medium text-slate-700">Expected Identifier Type</span>
            <select
              value={idTarget}
              onChange={(e) => setIdTarget(e.target.value as IdTarget)}
              className="mt-1 w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md"
            >
              <option value="applicationId">ApplicationId (app_)</option>
              <option value="orderId">OrderId (ord_)</option>
              <option value="serviceId">ServiceId (svc_)</option>
              <option value="userId">UserId (usr_)</option>
              <option value="providerReferenceId">ProviderReferenceId (prv_)</option>
            </select>
          </label>

          <label className="md:col-span-5 block">
            <span className="text-xs font-medium text-slate-700">Candidate Raw Identifier</span>
            <input
              type="text"
              value={rawId}
              onChange={(e) => setRawId(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md"
            />
          </label>

          <div className="md:col-span-3 flex items-center justify-end h-9">
            <span
              className={`text-xs font-mono font-semibold ${
                idValidation.ok ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {idValidation.ok ? 'VALID BRANDED ID' : idValidation.error.code}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6">
          <pre className="p-3 bg-slate-900 text-slate-100 rounded-md text-xs overflow-x-auto">
            {JSON.stringify(idValidation, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
}

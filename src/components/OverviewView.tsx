import { useState } from 'react';
import { ROADMAP_MILESTONES } from '../data/repoDocs';
import { CORE_CONTRACT_VERSION, formatSchemaVersion } from '../core';

type PriorityFilter = 'ALL' | 'P0' | 'P1' | 'P2';

interface OverviewViewProps {
  onNavigate: (tab: 'pricing' | 'states' | 'forms' | 'suite' | 'docs') => void;
}

const DESIGN_RULES = [
  {
    index: '01',
    title: 'Deterministic & Side-Effect Free',
    detail: 'All modules under src/core/ run purely in memory without I/O, timers, or global state.',
  },
  {
    index: '02',
    title: 'Zero Framework & Provider Imports',
    detail: 'No React, Express, Firebase, Cloudflare, Cashfree, or API Sathi dependencies in core.',
  },
  {
    index: '03',
    title: 'Explicit Runtime Schemas',
    detail: 'Compile-time TypeScript types are paired with trust-boundary runtime validators.',
  },
  {
    index: '04',
    title: 'Integer Minor Units (INR Paise)',
    detail: 'Monetary totals use integer paise and explicit basis-point rounding without floats.',
  },
  {
    index: '05',
    title: 'Explicit State Machines',
    detail: 'Application, payment, and document transitions return structured Result contracts.',
  },
  {
    index: '06',
    title: 'Distinct Branded Identifiers',
    detail: 'User, application, service, order, document, and provider IDs are strictly separated.',
  },
  {
    index: '07',
    title: 'Persistence & Transport Separation',
    detail: 'Core defines contracts and invariants while DIPINDIA and dip-api own storage and HTTP.',
  },
  {
    index: '08',
    title: 'Synthetic Fixtures Only',
    detail: 'No production credentials, customer documents, or personal data appear in core fixtures.',
  },
];

const ECOSYSTEM_CONSUMERS = [
  {
    consumer: 'DIPINDIA',
    usesCoreFor: 'Shared schemas, types, calculations, workflow rules',
    retains: 'UI, persistence, authentication, APIs, customer journeys',
  },
  {
    consumer: 'dip-api',
    usesCoreFor: 'Request/response and normalized domain types',
    retains: 'HTTP routing, Cashfree/API Sathi clients, webhooks, auth',
  },
  {
    consumer: 'dip-ui',
    usesCoreFor: 'UI-safe domain enums and contract types',
    retains: 'Rendering, accessibility, component interaction',
  },
  {
    consumer: 'dip-sdk',
    usesCoreFor: 'Public API data contracts',
    retains: 'Network client, token handling, retries',
  },
  {
    consumer: 'dip-automation',
    usesCoreFor: 'Job payload and stage event contracts',
    retains: 'Queue execution, scheduling, retries',
  },
  {
    consumer: 'dip-security',
    usesCoreFor: 'Shared identifiers and sanitized error codes',
    retains: 'Security policy and runtime enforcement',
  },
];

export function OverviewView({ onNavigate }: OverviewViewProps) {
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');

  const filteredMilestones = ROADMAP_MILESTONES.filter((m) =>
    priorityFilter === 'ALL' ? true : m.priority === priorityFilter
  );

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Digital India Project</span>
              <span aria-hidden="true">·</span>
              <span>Contract v{formatSchemaVersion(CORE_CONTRACT_VERSION)}</span>
              <span aria-hidden="true">·</span>
              <span>Primary Consumer: DIPINDIA</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 text-balance">
              Framework-independent domain contracts and deterministic rules
            </h1>
            <p className="text-sm leading-relaxed text-slate-600">
              DIP Core extracts canonical schemas, integer-paise pricing math, state machines, and
              sanitized error contracts from the DIPINDIA ecosystem without owning persistence,
              authentication, or payment provider execution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('pricing')}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Test Pricing Engine
            </button>
            <button
              type="button"
              onClick={() => onNavigate('states')}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Inspect State Machines
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs font-medium text-slate-500">Upstream Consumers</div>
            <div className="mt-1 text-sm font-medium text-slate-900">
              DIPINDIA / dip-api / dip-automation
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Own UI, database persistence, webhooks, and provider SDKs.
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Pure Core Layer</div>
            <div className="mt-1 text-sm font-medium text-slate-900">
              Schemas / Domain Rules / State Models
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Zero framework imports, deterministic outputs, runtime validation.
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Continuity Authority</div>
            <div className="mt-1 text-sm font-medium text-slate-900">
              DIPINDIA Parity First
            </div>
            <div className="mt-1 text-xs text-slate-500">
              All modules sit behind compatibility adapters until parity is proven.
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Roadmap Milestones (C0–C8)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Extraction sequence from docs/ROADMAP.md with priority filtering
            </p>
          </div>

          <div
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start"
            role="group"
            aria-label="Filter milestones by priority"
          >
            {(['ALL', 'P0', 'P1', 'P2'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  priorityFilter === p
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'ALL' ? 'All Priorities' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-6">Milestone</th>
                <th className="py-2.5 px-4">Priority</th>
                <th className="py-2.5 px-4">Deliverable</th>
                <th className="py-2.5 px-4">Depends On</th>
                <th className="py-2.5 px-6 text-right">Workbench Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredMilestones.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                  <td className="py-3 px-6 font-medium text-slate-900 whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-500 mr-2">{m.id}</span>
                    {m.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">
                    {m.priority}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{m.deliverable}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500">{m.dependsOn}</td>
                  <td className="py-3 px-6 text-right text-xs font-medium whitespace-nowrap">
                    <span
                      className={
                        m.statusInWorkbench === 'Prototyped in Core'
                          ? 'text-emerald-700'
                          : m.statusInWorkbench === 'Pending DIPINDIA Audit'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                      }
                    >
                      {m.statusInWorkbench}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Core Design Rules</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforced invariants across every module in src/core/
            </p>
          </div>
          <div className="divide-y divide-slate-200">
            {DESIGN_RULES.map((rule) => (
              <div key={rule.index} className="px-6 py-3.5 flex items-baseline gap-4">
                <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                  {rule.index}
                </span>
                <div>
                  <div className="text-sm font-medium text-slate-900">{rule.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{rule.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Ecosystem Consumer Boundaries
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Responsibility split from docs/INTEGRATION.md
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('docs')}
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              Read Full Contract
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {ECOSYSTEM_CONSUMERS.map((row) => (
              <div key={row.consumer} className="px-6 py-3.5 space-y-1">
                <div className="font-mono text-xs font-semibold text-slate-900">
                  {row.consumer}
                </div>
                <div className="text-xs text-slate-700">
                  <span className="text-slate-500">Uses core: </span>
                  {row.usesCoreFor}
                </div>
                <div className="text-xs text-slate-600">
                  <span className="text-slate-500">Retains: </span>
                  {row.retains}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

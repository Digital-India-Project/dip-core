import { useState } from 'react';
import {
  BookOpen,
  Calculator,
  CheckSquare,
  FileCheck2,
  GitBranch,
  Layers,
  Menu,
  X,
} from 'lucide-react';
import { OverviewView } from './components/OverviewView';
import { PricingMoneyView } from './components/PricingMoneyView';
import { StateMachinesView } from './components/StateMachinesView';
import { FormsValidationView } from './components/FormsValidationView';
import { ContractSuiteView } from './components/ContractSuiteView';
import { DocsReaderView } from './components/DocsReaderView';

type NavSection = 'overview' | 'pricing' | 'states' | 'forms' | 'suite' | 'docs';

const NAV_ITEMS: readonly {
  readonly id: NavSection;
  readonly label: string;
  readonly breadcrumb: string;
  readonly icon: typeof Layers;
}[] = [
  { id: 'overview', label: 'Overview', breadcrumb: 'Overview & Boundaries', icon: Layers },
  { id: 'pricing', label: 'Pricing & Money', breadcrumb: 'Pricing & Paise Engine', icon: Calculator },
  { id: 'states', label: 'State Machines', breadcrumb: 'Lifecycle & Payments', icon: GitBranch },
  { id: 'forms', label: 'Forms & Validation', breadcrumb: 'Trust-Boundary Schemas', icon: FileCheck2 },
  { id: 'suite', label: 'Contract Suite', breadcrumb: 'Invariant Checks', icon: CheckSquare },
  { id: 'docs', label: 'Specifications', breadcrumb: 'Repository Docs', icon: BookOpen },
];

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [resetEpoch, setResetEpoch] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];

  const handleSelectSection = (section: NavSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            DIP Core
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1" aria-label="Domain modules">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeSection;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-700">Synthetic Fixtures Only</div>
          <div>Pure domain contracts · No DB</div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-full bg-white border-r border-slate-200 flex flex-col z-50">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="font-display text-base font-bold tracking-tight text-slate-900">
                DIP Core
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-md"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeSection;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-medium text-slate-500 whitespace-nowrap">DIP Core</span>
              <span className="text-slate-400" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">{currentNav.breadcrumb}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setResetEpoch((n) => n + 1)}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Reset Workbench
          </button>
        </header>

        <main key={resetEpoch} className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewView onNavigate={(tab) => handleSelectSection(tab)} />
          )}
          {activeSection === 'pricing' && <PricingMoneyView />}
          {activeSection === 'states' && <StateMachinesView />}
          {activeSection === 'forms' && <FormsValidationView />}
          {activeSection === 'suite' && <ContractSuiteView />}
          {activeSection === 'docs' && <DocsReaderView />}
        </main>
      </div>
    </div>
  );
}

export default App;

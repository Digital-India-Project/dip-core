import { useMemo, useState } from 'react';
import { REPO_DOCS } from '../data/repoDocs';

export function DocsReaderView() {
  const [selectedDocId, setSelectedDocId] = useState<string>(REPO_DOCS[0].id);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const matchingDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return REPO_DOCS;
    return REPO_DOCS.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.filename.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeDoc =
    matchingDocs.find((d) => d.id === selectedDocId) ?? matchingDocs[0] ?? REPO_DOCS[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <label className="block">
            <span className="sr-only">Filter repository specifications</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search specifications..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
        </div>

        <div className="divide-y divide-slate-200">
          {matchingDocs.length === 0 ? (
            <div className="p-6 text-xs text-slate-500">
              No specification files match &quot;{searchQuery}&quot;.
            </div>
          ) : (
            matchingDocs.map((doc) => {
              const isSelected = doc.id === activeDoc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full text-left px-4 py-3.5 transition-colors ${
                    isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="font-mono text-xs text-slate-500">{doc.filename}</div>
                  <div className="text-sm font-medium text-slate-900 mt-0.5">{doc.title}</div>
                  <div className="text-xs text-slate-600 mt-1 line-clamp-2">{doc.summary}</div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <div className="font-mono text-xs text-slate-500">{activeDoc.filename}</div>
            <h2 className="text-base font-semibold text-slate-900 mt-0.5">{activeDoc.title}</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap shrink-0">
            {activeDoc.content.split('\n').length} lines
          </span>
        </div>

        <div className="p-6">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-md p-5 overflow-x-auto">
            {activeDoc.content}
          </pre>
        </div>
      </section>
    </div>
  );
}

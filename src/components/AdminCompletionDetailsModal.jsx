import React, { useMemo, useState } from 'react';
import useStore, { WORKFLOW_STATES } from '../store/useStore';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function AdminCompletionDetailsModal({ onClose }) {
  const { t } = useI18n();
  const clothItems = useStore((s) => s.clothItems);
  const [ym, setYm] = useState(() => monthKey(new Date()));
  const [tailorPage, setTailorPage] = useState(1);
  const [tailorsPerPage, setTailorsPerPage] = useState(5);
  const [expandedTailors, setExpandedTailors] = useState(new Set());

  const data = useMemo(() => {
    const [y, m] = ym.split('-').map((n) => parseInt(n, 10));
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    const groups = new Map(); // tailorName -> { count, items: [] }

    for (const it of clothItems) {
      if (!Array.isArray(it.history)) continue;
      // Find when item became READY
      const readyEntry = [...it.history].reverse().find((h) => h.status === WORKFLOW_STATES.READY);
      if (!readyEntry) continue;
      const ts = new Date(readyEntry.timestamp || it.updatedAt || it.createdAt || Date.now());
      if (!(ts >= start && ts < end)) continue;
      // Find the tailor who stitched it: status AWAITING_STITCHING entry has assignedTo = tailor
      const tailorEntry = it.history.find((h) => h.status === WORKFLOW_STATES.AWAITING_STITCHING && h.assignedTo);
      const tailor = tailorEntry?.assignedTo || t('analytics.details.unknown_tailor');

      const rec = groups.get(tailor) || { count: 0, items: [] };
      rec.count += 1;
      rec.items.push({
        id: it.id,
        bill: it.billNumber,
        type: it.type,
        assignedAt: new Date(tailorEntry?.timestamp || it.updatedAt || it.createdAt || ts),
        completedAt: ts,
      });
      groups.set(tailor, rec);
    }

    const total = Array.from(groups.values()).reduce((s, g) => s + g.count, 0);

    const rows = Array.from(groups.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([tailor, info]) => ({ tailor, ...info }));

    return { total, rows };
  }, [clothItems, ym, t]);

  // Reset pagination when month changes
  React.useEffect(() => {
    setTailorPage(1);
    setExpandedTailors(new Set());
  }, [ym]);

  // Paginated tailors
  const paginatedData = useMemo(() => {
    const startIdx = (tailorPage - 1) * tailorsPerPage;
    const endIdx = startIdx + tailorsPerPage;
    const paginatedRows = data.rows.slice(startIdx, endIdx);
    const totalPages = Math.ceil(data.rows.length / tailorsPerPage);
    return { rows: paginatedRows, totalPages, totalTailors: data.rows.length };
  }, [data.rows, tailorPage, tailorsPerPage]);

  const toggleTailorExpansion = (tailor) => {
    const newExpanded = new Set(expandedTailors);
    if (newExpanded.has(tailor)) {
      newExpanded.delete(tailor);
    } else {
      newExpanded.add(tailor);
    }
    setExpandedTailors(newExpanded);
  };

  const getVisibleItems = (items, tailor) => {
    const isExpanded = expandedTailors.has(tailor);
    const itemsPerPage = 10;
    return isExpanded ? items : items.slice(0, itemsPerPage);
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white w-full max-w-3xl rounded-lg shadow-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('analytics.details.title')}</h2>
          <button aria-label={t('analytics.details.close')} onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <label className="text-sm text-gray-600" htmlFor="details-month">{t('analytics.details.select_month')}</label>
            <input id="details-month" type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="input h-9 py-1 text-sm w-[12rem]" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="tailors-per-page">{t('analytics.details.per_page')}</label>
              <select
                id="tailors-per-page"
                value={tailorsPerPage}
                onChange={(e) => { setTailorsPerPage(Number(e.target.value)); setTailorPage(1); }}
                className="input h-9 py-1 text-sm w-16"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
            <div className="ml-auto text-sm text-gray-700">
              {t('analytics.details.total')}: <span className="font-medium">{data.total}</span>
            </div>
          </div>

          {/* Pagination info */}
          {paginatedData.totalTailors > 0 && (
            <div className="text-sm text-gray-600 mb-4">
              {t('analytics.details.showing_tailors', {
                from: (tailorPage - 1) * tailorsPerPage + 1,
                to: Math.min(tailorPage * tailorsPerPage, paginatedData.totalTailors),
                total: paginatedData.totalTailors
              })}
            </div>
          )}

          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
            {paginatedData.rows.map((row) => {
              const visibleItems = getVisibleItems(row.items, row.tailor);
              const hasMore = row.items.length > 10 && !expandedTailors.has(row.tailor);
              const isExpanded = expandedTailors.has(row.tailor);

              return (
                <section key={row.tailor} className="">
                  <header className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{row.tailor}</h3>
                    <span className="text-sm text-gray-600">{row.count}</span>
                  </header>
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                    {visibleItems.map((it) => (
                      <li key={it.id} className="p-3 text-sm flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">{t('common.bill')}: {it.bill}</span>
                          <span className="text-gray-600">{t('common.type')}: {String(it.type || '')}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{t('analytics.details.assigned_on')}: {it.assignedAt ? new Date(it.assignedAt).toLocaleString() : '—'}</div>
                          <div className="text-xs text-gray-500">{t('analytics.details.completed_on')}: {new Date(it.completedAt).toLocaleString()}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {(hasMore || isExpanded) && (
                    <div className="mt-2 text-center">
                      <button
                        onClick={() => toggleTailorExpansion(row.tailor)}
                        className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                      >
                        {isExpanded
                          ? t('analytics.details.show_less')
                          : t('analytics.details.show_more', { count: row.items.length - 10 })
                        }
                      </button>
                    </div>
                  )}
                </section>
              );
            })}

            {paginatedData.rows.length === 0 && data.rows.length === 0 && (
              <p className="text-sm text-gray-600">{t('analytics.details.empty')}</p>
            )}
          </div>

          {/* Tailor pagination controls */}
          {paginatedData.totalPages > 1 && (
            <div className="pt-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {t('analytics.details.page_info', { current: tailorPage, total: paginatedData.totalPages })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTailorPage(p => Math.max(1, p - 1))}
                  disabled={tailorPage === 1}
                  className="btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t('analytics.details.prev')}
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, paginatedData.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    const isActive = pageNum === tailorPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setTailorPage(pageNum)}
                        className={`px-3 py-2 text-sm rounded ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {paginatedData.totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-500">...</span>
                      <button
                        onClick={() => setTailorPage(paginatedData.totalPages)}
                        className={`px-3 py-2 text-sm rounded ${
                          tailorPage === paginatedData.totalPages
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {paginatedData.totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setTailorPage(p => Math.min(paginatedData.totalPages, p + 1))}
                  disabled={tailorPage === paginatedData.totalPages}
                  className="btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('analytics.details.next')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button onClick={onClose} className="btn-secondary px-4 py-2">{t('analytics.details.close')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}


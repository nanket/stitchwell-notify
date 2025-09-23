import React, { useMemo, useState } from 'react';
import useStore, { WORKFLOW_STATES } from '../store/useStore';
import { useI18n } from '../i18n';
import { CalendarCheck } from 'lucide-react';

function isSameMonth(d, year, month /* 1-12 */) {
  try {
    const date = typeof d?.toDate === 'function' ? d.toDate() : new Date(d);
    if (isNaN(date.getTime())) return false;
    return date.getFullYear() === year && (date.getMonth() + 1) === month;
  } catch {
    return false;
  }
}

const MonthlyCompletionCard = () => {
  const { t } = useI18n();
  const clothItems = useStore(s => s.clothItems);

  const [ym, setYm] = useState(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${m}`; // yyyy-MM
  });

  const stats = useMemo(() => {
    const [yy, mm] = ym.split('-').map(Number);
    let count = 0;
    for (const item of clothItems || []) {
      if (!Array.isArray(item.history)) continue;
      const readyEntry = item.history.find(h => h.status === WORKFLOW_STATES.READY);
      if (readyEntry && isSameMonth(readyEntry.timestamp, yy, mm)) {
        count += 1;
      }
    }
    return { count };
  }, [clothItems, ym]);

  return (
    <div className="card">
      <div className="flex items-center">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <CalendarCheck className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 truncate">{t('analytics.monthly_completion.title')}</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.count}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <label className="text-xs text-gray-600">{t('analytics.monthly_completion.select_month')}</label>
        <input
          type="month"
          value={ym}
          onChange={(e) => setYm(e.target.value)}
          className="input inline-block w-full sm:w-[12rem] max-w-full h-9 py-1 text-sm align-middle flex-1 min-w-[8rem]"
        />
      </div>
    </div>
  );
};

export default MonthlyCompletionCard;


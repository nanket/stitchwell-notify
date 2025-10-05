import React, { useMemo, useState } from 'react';
import { TrendingUp, Users, Package, Clock, Award, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '../i18n';
import useStore from '../store/useStore';
import {
  StatCard,
  ItemTypeBreakdown,
  CompletedItemsList,
  formatDuration,
  WeekSelector,
  DateRangePicker,
  startOfWeek,
  endOfWeek,
} from './MonthlyAnalytics';


const AdminAnalytics = () => {
  const { t, trType, currentLanguage } = useI18n();
  const {
    getCompletionsInRange,
    getWorkerStatsInRange,
    getWorkerStageStatsInRange,
    getItemTypeBreakdownInRange
  } = useStore();
  const clothItems = useStore(state => state.clothItems);

  // Filter mode and time range
  const [mode, setMode] = useState('week'); // 'week' | 'range'
  const today = new Date();
  const initialStart = startOfWeek(today, 1);
  const initialEnd = endOfWeek(today, 1);

  const [weekStart, setWeekStart] = useState(initialStart);
  const [weekEnd, setWeekEnd] = useState(initialEnd);
  const [rangeStart, setRangeStart] = useState(initialStart);
  const [rangeEnd, setRangeEnd] = useState(initialEnd);

  const activeStart = mode === 'week' ? weekStart : rangeStart;
  const activeEnd = mode === 'week' ? weekEnd : rangeEnd;

  const handleWeekChange = (start, end) => { setWeekStart(start); setWeekEnd(end); };
  const handleRangeChange = (start, end) => { setRangeStart(start); setRangeEnd(end); };

  // Data for the active range
  const completions = useMemo(() => getCompletionsInRange(activeStart, activeEnd), [activeStart, activeEnd, getCompletionsInRange]);
  const workerStats = useMemo(() => getWorkerStatsInRange(activeStart, activeEnd), [activeStart, activeEnd, getWorkerStatsInRange]);
  const workerStageStats = useMemo(() => getWorkerStageStatsInRange(activeStart, activeEnd), [activeStart, activeEnd, getWorkerStageStatsInRange]);
  const itemTypeBreakdown = useMemo(() => getItemTypeBreakdownInRange(activeStart, activeEnd), [activeStart, activeEnd, getItemTypeBreakdownInRange]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const totalCompleted = completions.length;
    const totalAssigned = Object.values(workerStats).reduce((sum, w) => sum + (w.assigned || 0), 0);
    const overallCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
    const totalStageCompletions = Object.values(workerStageStats).reduce((sum, w) => sum + (w.stageCompleted || 0), 0);

    const completionTimes = completions
      .filter(item => item.createdAt && item.completedAt)
      .map(item => {
        const created = new Date(item.createdAt);
        const completed = new Date(item.completedAt);
        return completed.getTime() - created.getTime();
      });
    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
      : 0;

    return {
      totalCompleted,
      totalAssigned,
      overallCompletionRate,
      totalStageCompletions,
      avgCompletionTime,
      activeWorkers: Object.values(workerStats).filter(w => (w.completed || 0) > 0).length
    };
  }, [completions, workerStats, workerStageStats]);

  // Top performers
  const topPerformers = useMemo(() => {
    return Object.values(workerStats)
      .filter(w => (w.completed || 0) > 0)
      .sort((a, b) => (b.completed || 0) - (a.completed || 0))
      .slice(0, 5);
  }, [workerStats]);

  // Union of worker names across final and stage stats
  const workerNames = useMemo(() => {
    const set = new Set([...Object.keys(workerStats), ...Object.keys(workerStageStats)]);
    return Array.from(set);
  }, [workerStats, workerStageStats]);

  const [expanded, setExpanded] = useState({});
  const toggleWorker = (name) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));


  // Build assignment events from item history: includes both explicit 'assigned_for_stage' and
  // implicit assignments that happen at stage completion (entry.actionCode === 'completed_stage' with entry.assignedTo)
  const assignmentEventsInRange = useMemo(() => {
    const events = [];
    const items = clothItems || [];
    for (const item of items) {
      const hist = Array.isArray(item.history) ? item.history : [];
      for (const entry of hist) {
        const ts = entry?.timestamp;
        if (!ts) continue;
        const d = new Date(ts);
        if (d < activeStart || d > activeEnd) continue;
        const isExplicitAssign = entry?.actionCode === 'assigned_for_stage';
        const isImplicitAssign = entry?.actionCode === 'completed_stage' && !!entry?.assignedTo;
        if (!isExplicitAssign && !isImplicitAssign) continue;
        const recipient = entry?.assignedTo || entry?.actionParams?.name;
        if (!recipient) continue;
        events.push({
          assignedTo: recipient,
          timestamp: ts,
          billNumber: item.billNumber,
          type: item.type,
          quantity: item.quantity || 1,
        });
      }
    }
    return events;
  }, [clothItems, activeStart, activeEnd]);

  const groupDaily = (items, dateField) => {
    const map = {};
    (items || []).forEach((it) => {
      const iso = it[dateField];
      if (!iso) return;
      const d = new Date(iso);
      d.setHours(0,0,0,0);
      const key = d.toISOString().slice(0,10);
      const day = map[key] || { date: new Date(d), types: {}, billsByType: {} };
      const type = it.type || 'Unknown';
      const qty = it.quantity || 1;
      day.types[type] = (day.types[type] || 0) + qty;
      day.billsByType[type] = day.billsByType[type] || new Set();
      if (it.billNumber) day.billsByType[type].add(String(it.billNumber));
      map[key] = day;
    });
    return Object.values(map)
      .map(d => ({ ...d, billsByType: Object.fromEntries(Object.entries(d.billsByType).map(([k, v]) => [k, Array.from(v)])) }))
      .sort((a, b) => a.date - b.date);
  };

  const formatDay = (d) => new Date(d).toLocaleDateString(currentLanguage || 'en', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('week')}
            className={`px-3 py-1.5 rounded-md text-sm border ${mode === 'week' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
          >Week</button>
          <button
            onClick={() => setMode('range')}
            className={`px-3 py-1.5 rounded-md text-sm border ${mode === 'range' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
          >Custom Range</button>

        </div>
        {mode === 'week' ? (
          <WeekSelector currentStart={weekStart} currentEnd={weekEnd} onChange={handleWeekChange} />
        ) : (
          <DateRangePicker startDate={rangeStart} endDate={rangeEnd} onChange={handleRangeChange} />
        )}
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <StatCard icon={Package} title={t('analytics.final_completions')} value={overallStats.totalCompleted} subtitle={`${t('analytics.completion_rate')}: ${overallStats.overallCompletionRate}%`} color="green" />
        <StatCard icon={BarChart3} title={t('analytics.stage_completions')} value={overallStats.totalStageCompletions} color="purple" />
        <StatCard icon={Users} title={t('analytics.active_workers')} value={overallStats.activeWorkers} subtitle={`${t('analytics.items_assigned')}: ${overallStats.totalAssigned}`} color="blue" />
        <StatCard icon={Clock} title={t('analytics.avg_completion_time')} value={formatDuration(overallStats.avgCompletionTime)} color="yellow" />
        <StatCard icon={TrendingUp} title={t('analytics.overall_stats')} value={`${overallStats.overallCompletionRate}%`} subtitle={t('analytics.completion_rate')} color="teal" />
      </div>

      {/* Worker Performance Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          {t('analytics.worker_performance')}
        </h3>

        {Object.keys(workerStats).length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t('analytics.no_completions')}</p>
        ) : (
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('worker.name_label')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('analytics.items_assigned')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('analytics.stage_completions')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('analytics.stage_breakdown')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('analytics.details.view')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workerNames
                  .map((name) => ({
                    name,
                    w: workerStats[name] || { name, assigned: 0, completed: 0, completionRate: 0, completedItems: [], itemTypeBreakdown: {} },
                    s: workerStageStats[name] || { stageCompleted: 0, stages: {} }
                  }))
                  .filter(row => row.w.assigned > 0 || row.w.completed > 0 || row.s.stageCompleted > 0)
                  .sort((a, b) => (b.s.stageCompleted || 0) - (a.s.stageCompleted || 0))
                  .map(({ name, w, s }) => (
                    <React.Fragment key={name}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">{name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{w.assigned}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.stageCompleted}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(s.stages).map(([stage, count]) => (
                                <span key={stage} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {t(`history.stage.${String(stage).replace(/\s+/g, '_')}`)}: {count}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button onClick={() => toggleWorker(name)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
                              {expanded[name] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <span>{t('analytics.details.view')}</span>
                            </button>
                          </td>
                        </tr>
                        {expanded[name] && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-gray-50">


                              {/* Daily summaries: assignments and completions */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                                {/* Daily Assignment Summary */}
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900 mb-2">{t('analytics.daily_assignments')}</h5>
                                  {(() => {
                                    const workerAssignments = (assignmentEventsInRange || []).filter(ev => ev.assignedTo === name);
                                    const dailyAssign = groupDaily(workerAssignments, 'timestamp');
                                    if (dailyAssign.length === 0) return <p className="text-xs text-gray-500">{t('analytics.no_items')}</p>;
                                    return (
                                      <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 overflow-hidden">
                                        {dailyAssign.map((day, idx) => (
                                          <li key={idx} className="p-2 text-sm">
                                            <div className="font-medium text-gray-900">{formatDay(day.date)}</div>
                                            <div className="text-xs text-gray-600">
                                              {Object.entries(day.types).map(([type, qty], i, arr) => (
                                                <span key={type}>
                                                  {qty} {trType(type)}{day.billsByType[type]?.length ? ` (${day.billsByType[type].join(', ')})` : ''}{i < arr.length - 1 ? ', ' : ''}
                                                </span>
                                              ))} {t('analytics.assigned_label')}
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    );
                                  })()}
                                </div>

                                {/* Daily Completion Summary */}
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900 mb-2">{t('analytics.daily_completions')}</h5>
                                  {(() => {
                                    // Stage completions: count when the worker clicks Mark Complete on their stage
                                    const stageCompletions = s.completedStages || [];
                                    const dailyComplete = groupDaily(stageCompletions, 'timestamp');
                                    if (dailyComplete.length === 0) return <p className="text-xs text-gray-500">{t('analytics.no_completions')}</p>;
                                    return (
                                      <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 overflow-hidden">
                                        {dailyComplete.map((day, idx) => (
                                          <li key={idx} className="p-2 text-sm">
                                            <div className="font-medium text-gray-900">{formatDay(day.date)}</div>
                                            <div className="text-xs text-gray-600">
                                              {Object.entries(day.types).map(([type, qty], i, arr) => (
                                                <span key={type}>
                                                  {qty} {trType(type)}{day.billsByType[type]?.length ? ` (${day.billsByType[type].join(', ')})` : ''}{i < arr.length - 1 ? ', ' : ''}
                                                </span>
                                              ))} {t('analytics.completed_label')}
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                      </React.Fragment>
                    )
                  )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Item Type Breakdown and Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ItemTypeBreakdown breakdown={itemTypeBreakdown} title={t('analytics.item_type_breakdown')} />
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2" />
            {t('analytics.performance_trends')}
          </h4>
          {topPerformers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('analytics.no_completions')}</p>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((worker, index) => (
                <div key={worker.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                      <div className="text-xs text-gray-500">{worker.completed} {t('analytics.items_completed')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{worker.completionRate}%</div>
                    <div className="text-xs text-gray-500">{t('analytics.completion_rate')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Completion List */}
      <CompletedItemsList
        items={completions.map(item => ({ ...item, completedBy: item.completedBy || 'Unknown' }))}
        title={t('analytics.completion_details')}
        showWorker={true}
      />
    </div>
  );
};

export default AdminAnalytics;


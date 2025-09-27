import React, { useMemo, useState } from 'react';
import { TrendingUp, Users, Package, Clock, Award, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '../i18n';
import useStore from '../store/useStore';
import {
  MonthSelector,
  StatCard,
  ItemTypeBreakdown,
  CompletedItemsList,
  useMonthSelector,
  formatDuration,
  formatTimestamp
} from './MonthlyAnalytics';

const AdminMonthlyAnalytics = () => {
  const { t, trType } = useI18n();
  const { selectedMonth, selectedYear, handleMonthChange } = useMonthSelector();

  const {
    getMonthlyCompletions,
    getWorkerMonthlyStats,
    getWorkerStageMonthlyStats,
    getMonthlyItemTypeBreakdown
  } = useStore();

  // Get analytics data for selected month
  const monthlyCompletions = useMemo(() =>
    getMonthlyCompletions(selectedYear, selectedMonth),
    [selectedYear, selectedMonth, getMonthlyCompletions]
  );

  const workerStats = useMemo(() =>
    getWorkerMonthlyStats(selectedYear, selectedMonth),
    [selectedYear, selectedMonth, getWorkerMonthlyStats]
  );

  const workerStageStats = useMemo(() =>
    getWorkerStageMonthlyStats(selectedYear, selectedMonth),
    [selectedYear, selectedMonth, getWorkerStageMonthlyStats]
  );

  const itemTypeBreakdown = useMemo(() =>
    getMonthlyItemTypeBreakdown(selectedYear, selectedMonth),
    [selectedYear, selectedMonth, getMonthlyItemTypeBreakdown]
  );

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalCompleted = monthlyCompletions.length; // final Ready
    const totalAssigned = Object.values(workerStats).reduce((sum, worker) => sum + worker.assigned, 0);
    const overallCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
    const totalStageCompletions = Object.values(workerStageStats).reduce((sum, w) => sum + (w.stageCompleted || 0), 0);

    // Calculate average completion time (final Ready)
    const completionTimes = monthlyCompletions
      .filter(item => item.createdAt && item.completedAt)
      .map(item => {
        const created = typeof item.createdAt?.toDate === 'function' ? item.createdAt.toDate() : new Date(item.createdAt);
        const completed = typeof item.completedAt?.toDate === 'function' ? item.completedAt.toDate() : new Date(item.completedAt);
        return completed.getTime() - created.getTime();
      });

    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
      : 0;

    return {
      totalCompleted,
      totalAssigned,
      overallCompletionRate,
      avgCompletionTime,
      totalStageCompletions,
      activeWorkers: Object.values(workerStats).filter(worker => worker.completed > 0).length
    };
  }, [monthlyCompletions, workerStats, workerStageStats]);

  // Get top performers (by final Ready completions)
  const topPerformers = useMemo(() => {
    return Object.values(workerStats)
      .filter(worker => worker.completed > 0)
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5);
  }, [workerStats]);

  // Union of worker names across final and stage stats
  const workerNames = useMemo(() => {
    const set = new Set([...Object.keys(workerStats), ...Object.keys(workerStageStats)]);
    return Array.from(set);
  }, [workerStats, workerStageStats]);


  const [expanded, setExpanded] = useState({});
  const toggleWorker = (name) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));


  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <MonthSelector
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        onMonthChange={handleMonthChange}
      />

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <StatCard
          icon={Package}
          title={t('analytics.final_completions')}
          value={overallStats.totalCompleted}
          subtitle={`${t('analytics.completion_rate')}: ${overallStats.overallCompletionRate}%`}
          color="green"
        />
        <StatCard
          icon={BarChart3}
          title={t('analytics.stage_completions')}
          value={overallStats.totalStageCompletions}
          color="purple"
        />
        <StatCard
          icon={Users}
          title={t('analytics.active_workers')}
          value={overallStats.activeWorkers}
          subtitle={`${t('analytics.items_assigned')}: ${overallStats.totalAssigned}`}
          color="blue"
        />
        <StatCard
          icon={Clock}
          title={t('analytics.avg_completion_time')}
          value={formatDuration(overallStats.avgCompletionTime)}
          color="yellow"
        />
        <StatCard
          icon={TrendingUp}
          title={t('analytics.overall_stats')}
          value={`${overallStats.overallCompletionRate}%`}
          subtitle={t('analytics.completion_rate')}
          color="teal"
        />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('worker.name_label')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.items_assigned')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.stage_completions')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.final_completions')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.completion_rate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.stage_breakdown')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.item_type_breakdown')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.details.view')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workerNames
                  .map((name) => ({
                    name,
                    w: workerStats[name] || { name, assigned: 0, completed: 0, completionRate: 0, itemTypeBreakdown: {} },
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
                              <span className="text-sm font-medium text-gray-600">
                                {name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{w.assigned}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.stageCompleted}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{w.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(w.completionRate, 100)}%` }}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{w.completionRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(s.stages).map(([stage, count]) => (
                              <span key={stage} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {t(`history.stage.${String(stage).replace(/\s+/g, '_')}`)}: {count}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(w.itemTypeBreakdown).map(([type, count]) => (
                              <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {trType(type)}: {count}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => toggleWorker(name)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            {expanded[name] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span>{t('analytics.details.view')}</span>
                          </button>
                        </td>
                      </tr>
                      {expanded[name] && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gray-50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Stage completions */}
                              <div>
                                <h5 className="text-sm font-semibold text-gray-900 mb-2">{t('analytics.stage_completions')}</h5>
                                {((s.completedStages || []).length === 0) ? (
                                  <p className="text-xs text-gray-500">{t('analytics.no_items')}</p>
                                ) : (
                                  <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 overflow-hidden">
                                    {(s.completedStages || []).map((ci, idx) => (
                                      <li key={idx} className="p-2 text-sm flex items-center justify-between">
                                        <div className="min-w-0">
                                          <div className="font-medium text-gray-900 truncate">
                                            {t('table.bill')}: {ci.billNumber}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {t('table.type')}: {trType(ci.type)}{ci.customerName ? ` • ${t('table.customer')}: ${ci.customerName}` : ''}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800">
                                            {t(`history.stage.${String(ci.stage).replace(/\s+/g, '_')}`)}
                                          </span>
                                          <span className="text-xs text-gray-500">{formatTimestamp(ci.timestamp)}</span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              {/* Final completions */}
                              <div>
                                <h5 className="text-sm font-semibold text-gray-900 mb-2">{t('analytics.final_completions')}</h5>
                                {((w.completedItems || []).length === 0) ? (
                                  <p className="text-xs text-gray-500">{t('analytics.no_items')}</p>
                                ) : (
                                  <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 overflow-hidden">
                                    {(w.completedItems || []).map((ci, idx) => (
                                      <li key={idx} className="p-2 text-sm flex items-center justify-between">
                                        <div className="min-w-0">
                                          <div className="font-medium text-gray-900 truncate">
                                            {t('table.bill')}: {ci.billNumber}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {t('table.type')}: {trType(ci.type)}{ci.customerName ? ` • ${t('table.customer')}: ${ci.customerName}` : ''}
                                          </div>
                                        </div>
                                        <span className="text-xs text-gray-500 flex-shrink-0">{formatTimestamp(ci.completedAt)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Item Type Breakdown and Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ItemTypeBreakdown
          breakdown={itemTypeBreakdown}
          title={t('analytics.item_type_breakdown')}
        />

        {/* Top Performers */}
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
                      <div className="text-xs text-gray-500">
                        {worker.completed} {t('analytics.items_completed')}
                      </div>
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
        items={monthlyCompletions.map(item => ({
          ...item,
          completedBy: item.completedBy || 'Unknown'
        }))}
        title={t('analytics.completion_details')}
        showWorker={true}
      />
    </div>
  );
};

export default AdminMonthlyAnalytics;

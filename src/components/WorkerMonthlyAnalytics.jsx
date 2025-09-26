import React, { useMemo } from 'react';
import { TrendingUp, Package, Clock, CheckCircle, Target, Calendar } from 'lucide-react';
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

const WorkerMonthlyAnalytics = () => {
  const { t, trType } = useI18n();
  const { selectedMonth, selectedYear, handleMonthChange } = useMonthSelector();
  const { currentUser, getWorkerPersonalStats } = useStore();

  // Get personal analytics data for selected month
  const personalStats = useMemo(() => {
    if (!currentUser) return null;
    return getWorkerPersonalStats(currentUser, selectedYear, selectedMonth);
  }, [currentUser, selectedYear, selectedMonth, getWorkerPersonalStats]);

  if (!currentUser || !personalStats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500 text-center">{t('analytics.no_items')}</p>
      </div>
    );
  }

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    const completionRate = personalStats.completionRate;
    let performanceLevel = 'average';
    let performanceColor = 'yellow';
    
    if (completionRate >= 90) {
      performanceLevel = 'excellent';
      performanceColor = 'green';
    } else if (completionRate >= 75) {
      performanceLevel = 'good';
      performanceColor = 'blue';
    } else if (completionRate >= 50) {
      performanceLevel = 'average';
      performanceColor = 'yellow';
    } else {
      performanceLevel = 'needs_improvement';
      performanceColor = 'red';
    }

    return {
      level: performanceLevel,
      color: performanceColor,
      completionRate
    };
  }, [personalStats]);

  // Sort completed items by completion date (newest first)
  const sortedCompletedItems = useMemo(() => {
    return [...personalStats.completedItems].sort((a, b) => {
      const dateA = typeof a.completedAt?.toDate === 'function' ? a.completedAt.toDate() : new Date(a.completedAt);
      const dateB = typeof b.completedAt?.toDate === 'function' ? b.completedAt.toDate() : new Date(b.completedAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [personalStats.completedItems]);

  // Calculate productivity insights
  const productivityInsights = useMemo(() => {
    const totalQuantity = Object.values(personalStats.itemTypeBreakdown).reduce((sum, count) => sum + count, 0);
    const avgItemsPerDay = personalStats.completed > 0 ? (totalQuantity / 30).toFixed(1) : 0; // Rough estimate for month
    
    return {
      totalQuantity,
      avgItemsPerDay,
      mostProductiveType: Object.entries(personalStats.itemTypeBreakdown).length > 0 
        ? Object.entries(personalStats.itemTypeBreakdown).reduce((a, b) => a[1] > b[1] ? a : b)[0]
        : null
    };
  }, [personalStats]);

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <MonthSelector
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        onMonthChange={handleMonthChange}
      />

      {/* Personal Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          icon={Target}
          title={t('analytics.items_assigned')}
          value={personalStats.assigned}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          title={t('analytics.items_completed')}
          value={personalStats.completed}
          subtitle={`${productivityInsights.totalQuantity} ${t('common.total')} pieces`}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          title={t('analytics.completion_rate')}
          value={`${personalStats.completionRate}%`}
          subtitle={t(`analytics.performance_${performanceMetrics.level}`) || performanceMetrics.level}
          color={performanceMetrics.color}
        />
        <StatCard
          icon={Clock}
          title={t('analytics.avg_completion_time')}
          value={formatDuration(personalStats.avgCompletionTimeMs)}
          color="purple"
        />
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          {t('analytics.monthly_performance')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Completion Rate Visualization */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-3">
              <svg className="w-20 h-20 sm:w-24 sm:h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={performanceMetrics.color === 'green' ? '#10b981' :
                         performanceMetrics.color === 'blue' ? '#3b82f6' :
                         performanceMetrics.color === 'yellow' ? '#f59e0b' :
                         performanceMetrics.color === 'red' ? '#ef4444' : '#8b5cf6'}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - personalStats.completionRate / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg sm:text-xl font-bold text-gray-900">{personalStats.completionRate}%</span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">{t('analytics.completion_rate')}</p>
          </div>

          {/* Productivity Metrics */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('analytics.total_completed')}:</span>
              <span className="font-semibold text-gray-900">{personalStats.completed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('analytics.total_pieces')}:</span>
              <span className="font-semibold text-gray-900">{productivityInsights.totalQuantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('analytics.avg_per_day')}:</span>
              <span className="font-semibold text-gray-900">{productivityInsights.avgItemsPerDay}</span>
            </div>
            {productivityInsights.mostProductiveType && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('analytics.top_category')}:</span>
                <span className="font-semibold text-gray-900">{trType(productivityInsights.mostProductiveType)}</span>
              </div>
            )}
          </div>

          {/* Performance Badge */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full mb-3 ${
              performanceMetrics.color === 'green' ? 'bg-green-100' :
              performanceMetrics.color === 'blue' ? 'bg-blue-100' :
              performanceMetrics.color === 'yellow' ? 'bg-yellow-100' :
              performanceMetrics.color === 'red' ? 'bg-red-100' : 'bg-purple-100'
            }`}>
              <TrendingUp className={`h-6 w-6 sm:h-8 sm:w-8 ${
                performanceMetrics.color === 'green' ? 'text-green-600' :
                performanceMetrics.color === 'blue' ? 'text-blue-600' :
                performanceMetrics.color === 'yellow' ? 'text-yellow-600' :
                performanceMetrics.color === 'red' ? 'text-red-600' : 'text-purple-600'
              }`} />
            </div>
            <p className="text-sm font-medium text-gray-900 capitalize">
              {t(`analytics.performance_${performanceMetrics.level}`) || performanceMetrics.level}
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('analytics.performance_level')}</p>
          </div>
        </div>
      </div>

      {/* Item Type Breakdown and Recent Completions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ItemTypeBreakdown
          breakdown={personalStats.itemTypeBreakdown}
          title={t('analytics.item_type_breakdown')}
        />
        
        {/* Recent Completions Preview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            {t('analytics.recent_completions')}
          </h4>
          {sortedCompletedItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('analytics.no_completions')}</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {sortedCompletedItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {t('card.bill')}: {item.billNumber}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {item.quantity > 1 ? `${item.quantity}x ${trType(item.type)}` : trType(item.type)}
                      </span>
                    </div>
                    {item.customerName && (
                      <div className="text-sm text-gray-500 mt-1">
                        {t('table.customer')}: {item.customerName}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatTimestamp(item.completedAt)}
                    </div>
                  </div>
                </div>
              ))}
              {sortedCompletedItems.length > 5 && (
                <div className="text-center pt-2">
                  <span className="text-sm text-gray-500">
                    +{sortedCompletedItems.length - 5} {t('analytics.more_items')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Complete Completion History */}
      <CompletedItemsList
        items={sortedCompletedItems}
        title={t('analytics.completion_history')}
        showWorker={false}
      />
    </div>
  );
};

export default WorkerMonthlyAnalytics;

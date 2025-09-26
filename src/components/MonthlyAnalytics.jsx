import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Users, Package, Clock } from 'lucide-react';
import { useI18n } from '../i18n';

// Utility functions for date handling
export const getCurrentMonth = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1 // 1-12
  };
};

export const getMonthName = (month, year, locale = 'en') => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};

export const formatTimestamp = (timestamp, locale = 'en') => {
  if (!timestamp) return '—';
  try {
    const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(locale, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return '—';
  }
};

export const formatDuration = (milliseconds) => {
  if (!milliseconds || milliseconds <= 0) return '—';
  
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m`;
  }
};

// Month selector component
export const MonthSelector = ({ currentMonth, currentYear, onMonthChange, className = '' }) => {
  const { t, currentLanguage } = useI18n();

  const navigateMonth = (direction) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    onMonthChange(newYear, newMonth);
  };

  const monthName = getMonthName(currentMonth, currentYear, currentLanguage);

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-lg border border-gray-200 p-4 gap-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
        <h3 className="text-lg font-semibold text-gray-900">
          {t('analytics.monthly_report')}
        </h3>
      </div>

      <div className="flex items-center justify-center sm:justify-end space-x-2">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          aria-label={t('analytics.previous_month')}
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>

        <div className="px-3 sm:px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium min-w-[120px] sm:min-w-[140px] text-center text-sm sm:text-base">
          {monthName}
        </div>

        <button
          onClick={() => navigateMonth(1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          aria-label={t('analytics.next_month')}
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

// Statistics card component
export const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue', className = '' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 sm:p-6 ${className}`}>
      <div className="flex items-center">
        <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="ml-3 sm:ml-4 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Item type breakdown component
export const ItemTypeBreakdown = ({ breakdown, title, className = '' }) => {
  const { t, trType } = useI18n();
  
  const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
  
  if (total === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
        <p className="text-gray-500 text-center py-8">{t('analytics.no_items')}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 sm:p-6 ${className}`}>
      <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
      <div className="space-y-3">
        {Object.entries(breakdown).map(([type, count]) => (
          <div key={type} className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate">
                {trType(type)}
              </span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-900">{count}</span>
              <span className="text-xs text-gray-500">
                ({Math.round((count / total) * 100)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Completed items list component
export const CompletedItemsList = ({ items, title, showWorker = false, className = '' }) => {
  const { t, trType } = useI18n();

  if (items.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
        <p className="text-gray-500 text-center py-8">{t('analytics.no_completions')}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 sm:p-6 ${className}`}>
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        {title} ({items.length})
      </h4>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2 sm:gap-0">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="font-medium text-gray-900 text-sm sm:text-base">
                  {t('card.bill')}: {item.billNumber}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full self-start">
                  {item.quantity > 1 ? `${item.quantity}x ${trType(item.type)}` : trType(item.type)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-sm text-gray-500">
                {item.customerName && (
                  <span className="truncate">{t('table.customer')}: {item.customerName}</span>
                )}
                {showWorker && item.completedBy && (
                  <span className="truncate">{t('analytics.completed_by')}: {item.completedBy}</span>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <div className="text-sm font-medium text-gray-900">
                {formatTimestamp(item.completedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Hook for managing month state
export const useMonthSelector = (initialMonth = null, initialYear = null) => {
  const current = getCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || current.month);
  const [selectedYear, setSelectedYear] = useState(initialYear || current.year);

  const handleMonthChange = (year, month) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  return {
    selectedMonth,
    selectedYear,
    handleMonthChange,
    isCurrentMonth: selectedMonth === current.month && selectedYear === current.year
  };
};

import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  User, 
  ChevronDown, 
  ChevronUp,
  History
} from 'lucide-react';

const TaskCard = ({ task, onComplete }) => {
  const { t, trStatus, trType } = useI18n();
  const [showHistory, setShowHistory] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const getTypeColor = (type) => {
    switch (type) {
      case 'Shirt':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Kurta':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Safari':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'ready') return 'text-emerald-700';
    if (s.includes('thread')) return 'text-blue-600';
    if (s.includes('cutting')) return 'text-yellow-600';
    if (s.includes('stitch')) return 'text-orange-600';
    if (s.includes('kaach') || s.includes('button')) return 'text-indigo-600';
    if (s.includes('iron')) return 'text-green-600';
    if (s.includes('pack')) return 'text-fuchsia-700';
    return 'text-gray-600';
  };

  const formatDate = (value) => {
    if (!value) return '\u2014';
    try {
      const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
      if (isNaN(d.getTime())) return '\u2014';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '\u2014';
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete(task.id);
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Main Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Package className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {t('card.bill')}: {task.billNumber}
              </h3>
              <p className="text-sm text-gray-600">
                {trType(task.type)}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(task.type)}`}>
            {trType(task.type)}
          </span>
        </div>

        {/* Status and Assignment */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
              {trStatus(task.status)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {t('table.assigned_to')}: {task.assignedTo}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {t('table.updated')}: {formatDate(task.updatedAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <History className="h-4 w-4" />
            <span>{t('card.history')}</span>
            {showHistory ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="btn-success px-4 py-2 text-sm"
          >
            {isCompleting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t('card.completing')}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>{t('card.mark_complete')}</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* History Section */}
      {showHistory && (
        <div className="border-t border-gray-100 bg-gray-50 p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {t('card.task_history')}
          </h4>
          <div className="space-y-3">
            {task.history.map((entry, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-900">
                      {entry.action}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatDate(entry.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-gray-600">
                      {t('table.status')}: {trStatus(entry.status)}
                    </span>
                    {entry.assignedTo && (
                      <span className="text-xs text-gray-600">
                        {t('table.assigned_to')}: {entry.assignedTo}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;

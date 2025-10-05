import React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n';
import AdminAnalytics from './AdminAnalytics';

export default function AdminCompletionDetailsModal({ onClose }) {
  const { t } = useI18n();

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white w-full max-w-7xl rounded-lg shadow-xl border border-gray-200 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('analytics.monthly_report')}</h2>
          <button
            aria-label={t('common.close')}
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <AdminAnalytics />
        </div>
      </div>
    </div>
  );
}


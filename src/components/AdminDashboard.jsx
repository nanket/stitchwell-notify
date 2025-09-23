import React, { useState } from 'react';
import {
  Plus,
  LogOut,
  Bell,
  User,
  Scissors,
  Clock,
  CheckCircle,
  AlertCircle,
  Database
} from 'lucide-react';
import useStore, { WORKFLOW_STATES } from '../store/useStore';
import AdminListView from './AdminListView';
import CreateItemModal from './CreateItemModal';
import NotificationPanel from './NotificationPanel';
import AdminManageWorkers from './AdminManageWorkers';
import { loadDemoData } from '../utils/demoData';
import { useI18n } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';
import MonthlyCompletionCard from './MonthlyCompletionCard';

const AdminDashboard = () => {
  const {
    currentUser,
    logout,
    getAllItems,
    getMyNotifications,
    assignItemToWorker
  } = useStore();
  const { t } = useI18n();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showManageWorkers, setShowManageWorkers] = useState(false);

  const allItems = getAllItems();
  const notifications = getMyNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  // Get statistics for dashboard
  const stats = {
    total: allItems.length,
    inProgress: allItems.filter(item =>
      item.status !== WORKFLOW_STATES.READY
    ).length,
    completed: allItems.filter(item =>
      item.status === WORKFLOW_STATES.READY
    ).length,
    pending: allItems.filter(item =>
      item.status === WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT
    ).length
  };

  const handleAssignToTailor = (itemId, tailorName) => {
    assignItemToWorker(itemId, tailorName);
  };

  const handleLoadDemoData = () => {
    loadDemoData(useStore);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-auto py-3 gap-3 flex-wrap">
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Scissors className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {t('admin.title')}
                </h1>
                <p className="text-sm text-gray-500">
                  {t('admin.subtitle')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center flex-wrap gap-2 sm:gap-4">
              {/* Demo Data Button */}
              {allItems.length === 0 && (
                <button
                  onClick={handleLoadDemoData}
                  className="btn-secondary px-4 py-2"
                >
                  <Database className="w-4 h-4 mr-2" />
                  {t('admin.load_demo')}
                </button>
              )}

              {/* Manage Workers */}
              <button onClick={() => setShowManageWorkers(true)} className="btn-secondary px-4 py-2">
                {t('admin.manage_workers')}
              </button>

              <LanguageSwitcher />


              {/* Create Item Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary px-4 py-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('admin.new_item')}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-3 touch-target text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <NotificationPanel
                    onClose={() => setShowNotifications(false)}
                  />
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {currentUser}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="btn-secondary px-3 py-2"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('common.logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Scissors className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('admin.stats_total')}</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('admin.stats_in_progress')}</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('admin.stats_completed')}</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('admin.stats_pending')}</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
            </div>

          <MonthlyCompletionCard />
          </div>
        </div>

        {/* Table Only */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('admin.table_title')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('admin.table_subtitle')}
            </p>
          </div>
          <div className="p-6">
            <AdminListView items={allItems} onAssignToTailor={handleAssignToTailor} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateItemModal onClose={() => setShowCreateModal(false)} />
      )}
      {showManageWorkers && (
        <AdminManageWorkers onClose={() => setShowManageWorkers(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;

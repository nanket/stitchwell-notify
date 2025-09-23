import React, { useEffect, useMemo, useState } from 'react';
import {
  LogOut,
  Bell,
  User,
  Scissors,
  CheckCircle,
  Clock,
  Package,
  Menu,
  X
} from 'lucide-react';
import useStore from '../store/useStore';
import TaskCard from './TaskCard';
import NotificationPanel from './NotificationPanel';
import { useI18n } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';

const WorkerDashboard = () => {
  const currentUser = useStore(s => s.currentUser);
  const currentUserRole = useStore(s => s.currentUserRole);
  const logout = useStore(s => s.logout);
  const completeTask = useStore(s => s.completeTask);
  const clothItems = useStore(s => s.clothItems);
  const notifications = useStore(s => s.notifications);
  const markAllMyNotificationsAsRead = useStore(s => s.markAllMyNotificationsAsRead);

  const { t } = useI18n();

  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    return (clothItems || []).filter(item => item.assignedTo === currentUser);
  }, [clothItems, currentUser]);
  const unreadCount = useMemo(() => (notifications || []).filter(n => n.userName === currentUser && !n.read).length, [notifications, currentUser]);

  const handleCompleteTask = (itemId) => {
    completeTask(itemId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-auto py-3 gap-2 flex-wrap">
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <Scissors className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {t('worker.my_tasks')}
                </h1>
                <p className="text-sm text-gray-600">
                  {t('worker.dashboard', { role: currentUserRole })} • {t('worker.name_label')}: <span className="font-medium text-gray-900">{currentUser}</span>
                </p>
              </div>
            </div>

            {/* Mobile actions (bell + hamburger) */}
            <div className="flex items-center gap-2 md:hidden">
              {/* Notifications (mobile) */}
              <div className="relative">
                <button
                  onClick={() => { markAllMyNotificationsAsRead(); setShowNotifications(v => !v); }}
                  className="relative p-2 touch-target text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg"
                  aria-label="Notifications"
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
                    align="left"
                    onClose={() => setShowNotifications(false)}
                  />
                )}
              </div>

              {/* Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(v => !v)}
                className="p-2 touch-target text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg"
                aria-label="Menu"
                aria-controls="worker-mobile-menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Actions (desktop) */}
            <div className="hidden md:flex items-center flex-wrap gap-2 sm:gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => { markAllMyNotificationsAsRead(); setShowNotifications(v => !v); }}
                  className="relative p-3 touch-target text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg"
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

              <LanguageSwitcher />

              {/* User Menu */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 truncate max-w-[140px] sm:max-w-none">
                    {currentUser}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="btn-secondary px-3 py-2 whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  {t('common.logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <nav id="worker-mobile-menu" aria-label="Mobile menu" className="md:hidden bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
            <div className="relative">
              <button onClick={() => { markAllMyNotificationsAsRead(); setShowNotifications(!showNotifications); setMobileMenuOpen(false); }} className="btn-secondary w-full justify-start relative">
                <Bell className="w-4 h-4 mr-2" /> {t('notif_panel.title')}
                {unreadCount > 0 && (
                  <span className="absolute right-3 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs">{unreadCount}</span>
                )}
              </button>
            </div>
            <div className="flex items-center">
              <LanguageSwitcher />
            </div>
            <button onClick={logout} className="btn-secondary w-full justify-start">{t('common.logout')}</button>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('worker.stats_assigned')}</p>
                <p className="text-2xl font-semibold text-gray-900">{myTasks.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('worker.stats_in_progress')}</p>
                <p className="text-2xl font-semibold text-gray-900">{myTasks.length}</p>
              </div>
            </div>
          </div>



        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('worker.section_title')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('worker.section_subtitle')}
            </p>
          </div>

          <div className="p-6">
            {myTasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('worker.no_tasks_title')}
                </h3>
                <p className="text-gray-600">
                  {t('worker.no_tasks_body')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;

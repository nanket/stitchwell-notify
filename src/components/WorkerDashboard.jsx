import React, { useMemo, useState } from 'react';
import {
  LogOut,
  Bell,
  User,
  Scissors,
  CheckCircle,
  Clock,
  Package
} from 'lucide-react';
import useStore from '../store/useStore';
import TaskCard from './TaskCard';
import NotificationPanel from './NotificationPanel';

const WorkerDashboard = () => {
  const currentUser = useStore(s => s.currentUser);
  const currentUserRole = useStore(s => s.currentUserRole);
  const logout = useStore(s => s.logout);
  const completeTask = useStore(s => s.completeTask);
  const clothItems = useStore(s => s.clothItems);
  const notifications = useStore(s => s.notifications);

  const [showNotifications, setShowNotifications] = useState(false);

  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    return (clothItems || []).filter(item => item.assignedTo === currentUser);
  }, [clothItems, currentUser]);
  const unreadCount = useMemo(() => (notifications || []).filter(n => !n.read).length, [notifications]);

  const handleCompleteTask = (itemId) => {
    completeTask(itemId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-auto py-3 gap-2 flex-wrap">
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <Scissors className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  My Tasks
                </h1>
                <p className="text-sm text-gray-500">
                  {currentUserRole} Dashboard
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center flex-wrap gap-2 sm:gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg"
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
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Assigned Tasks</p>
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
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{myTasks.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Bell className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Notifications</p>
                <p className="text-2xl font-semibold text-gray-900">{unreadCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              My Assigned Tasks
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Complete your assigned tasks to move items through the workflow
            </p>
          </div>
          
          <div className="p-6">
            {myTasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tasks assigned
                </h3>
                <p className="text-gray-600">
                  You don't have any tasks assigned at the moment. 
                  Check back later or contact your supervisor.
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

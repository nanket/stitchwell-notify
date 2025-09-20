import React, { useEffect, useRef } from 'react';
import { Bell, X, Clock, CheckCircle } from 'lucide-react';
import useStore from '../store/useStore';

const NotificationPanel = ({ onClose }) => {
  const panelRef = useRef(null);
  const { getMyNotifications, markNotificationAsRead } = useStore();
  const notifications = getMyNotifications();

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const formatDate = (value) => {
    let date;
    try {
      date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    } catch {
      date = null;
    }
    if (!date || isNaN(date.getTime())) return 'Just now';

    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 sm:absolute sm:right-0 sm:top-12 sm:w-96 bg-white sm:rounded-lg shadow-xl border border-gray-200 z-50 max-h-[90vh] sm:max-h-96 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              No notifications
            </h4>
            <p className="text-sm text-gray-500">
              You're all caught up! New notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Notification Icon */}
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    !notification.read 
                      ? 'bg-blue-100' 
                      : 'bg-gray-100'
                  }`}>
                    {!notification.read ? (
                      <Bell className="h-4 w-4 text-blue-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-gray-600" />
                    )}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                      !notification.read 
                        ? 'text-gray-900 font-medium' 
                        : 'text-gray-700'
                    }`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatDate(notification.timestamp)}
                      </span>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              notifications
                .filter(n => !n.read)
                .forEach(n => markNotificationAsRead(n.id));
            }}
            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;

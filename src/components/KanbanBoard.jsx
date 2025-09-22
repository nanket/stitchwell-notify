import React from 'react';
import { Clock, User, Package } from 'lucide-react';
import useStore, { WORKFLOW_STATES, USER_ROLES } from '../store/useStore';

const KanbanBoard = ({ items, onAssignToTailor, isAdmin }) => {
  const { workers } = useStore();
  // Define columns for the Kanban board (updated workflow)
  const columns = [
    {
      id: WORKFLOW_STATES.AWAITING_CUTTING,
      title: 'Cutting',
      color: 'bg-yellow-50 border-yellow-200',
      headerColor: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: WORKFLOW_STATES.AWAITING_THREAD_MATCHING,
      title: 'Thread Matching',
      color: 'bg-blue-50 border-blue-200',
      headerColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT,
      title: 'Tailor Assignment',
      color: 'bg-purple-50 border-purple-200',
      headerColor: 'bg-purple-100 text-purple-800'
    },
    {
      id: WORKFLOW_STATES.AWAITING_STITCHING,
      title: 'Stitching',
      color: 'bg-orange-50 border-orange-200',
      headerColor: 'bg-orange-100 text-orange-800'
    },
    {
      id: WORKFLOW_STATES.AWAITING_KAACH,
      title: 'Kaach',
      color: 'bg-indigo-50 border-indigo-200',
      headerColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      id: WORKFLOW_STATES.AWAITING_IRONING,
      title: 'Ironing',
      color: 'bg-green-50 border-green-200',
      headerColor: 'bg-green-100 text-green-800'
    },
    {
      id: WORKFLOW_STATES.AWAITING_PACKAGING,
      title: 'Packaging',
      color: 'bg-fuchsia-50 border-fuchsia-200',
      headerColor: 'bg-fuchsia-100 text-fuchsia-800'
    },
    {
      id: WORKFLOW_STATES.READY,
      title: 'Ready',
      color: 'bg-emerald-50 border-emerald-200',
      headerColor: 'bg-emerald-100 text-emerald-800'
    }
  ];

  // Group items by status
  const itemsByStatus = items.reduce((acc, item) => {
    if (!acc[item.status]) {
      acc[item.status] = [];
    }
    acc[item.status].push(item);
    return acc;
  }, {});

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Shirt':
        return 'bg-blue-100 text-blue-800';
      case 'Pant':
        return 'bg-green-100 text-green-800';
      case 'Kurta':
        return 'bg-purple-100 text-purple-800';
      case 'Safari':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex space-x-6 min-w-max pb-4">
        {columns.map((column) => {
          const columnItems = itemsByStatus[column.id] || [];
          
          return (
            <div key={column.id} className="flex-shrink-0 w-80">
              {/* Column Header */}
              <div className={`${column.headerColor} px-4 py-3 rounded-t-lg border-b`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <span className="text-xs font-medium bg-white bg-opacity-50 px-2 py-1 rounded-full">
                    {columnItems.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className={`${column.color} border-l border-r border-b rounded-b-lg min-h-96 p-4 space-y-3`}>
                {columnItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Item Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900 text-sm">
                          {item.billNumber}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                    </div>

                    {/* Assigned To */}
                    <div className="flex items-center space-x-2 mb-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {item.assignedTo || 'Unassigned'}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center space-x-2 mb-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Updated: {formatDate(item.updatedAt)}
                      </span>
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && item.status === WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Assign to Tailor:
                        </label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              onAssignToTailor(item.id, e.target.value);
                            }
                          }}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          defaultValue=""
                        >
                          <option value="">Select tailor...</option>
                          {(workers[USER_ROLES.TAILOR] || []).map((tailor) => (
                            <option key={tailor} value={tailor}>
                              {tailor}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Status Indicator */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Status: {item.status}
                        </span>
                        {item.status === WORKFLOW_STATES.READY && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600 font-medium">
                              Complete
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {columnItems.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-sm">
                      No items in this stage
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;

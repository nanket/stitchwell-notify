import React, { useState, useMemo } from 'react';
import { Search, CheckCircle, Clock, Hash, User, Trash2 } from 'lucide-react';
import useStore from '../store/useStore';
import { useI18n } from '../i18n';
import ConfirmDialog from './ConfirmDialog';

const SUIT_WORKERS = ['Abdullah Master', 'Aman', 'Rafiqu'];

const AdminSuitTracking = () => {
  const { t } = useI18n();
  const { clothItems, suitAssignments, assignSuitToWorker, markSuitAsReady, deleteSuitAssignment } = useStore();
  
  const [billNumber, setBillNumber] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'all', 'pending', 'ready'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Get all bill numbers from cloth items
  const availableBills = useMemo(() => {
    return Array.from(new Set(clothItems.map(item => item.billNumber))).sort();
  }, [clothItems]);

  // Filter suit assignments based on search and status
  const filteredAssignments = useMemo(() => {
    let assignments = suitAssignments || [];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const digitsOnly = /^[0-9]+$/.test(q);
      assignments = assignments.filter(a => {
        const bill = String(a.billNumber ?? '').toLowerCase();
        if (digitsOnly) return bill.startsWith(q);
        return (
          bill.startsWith(q) ||
          a.workerName.toLowerCase().includes(q) ||
          (a.customerName || '').toLowerCase().includes(q)
        );
      });
    }
    
    if (filterStatus === 'pending') {
      assignments = assignments.filter(a => !a.isReady);
    } else if (filterStatus === 'ready') {
      assignments = assignments.filter(a => a.isReady);
    }
    
    return assignments.sort((a, b) => {
      // Sort by ready status first (pending first), then by date
      if (a.isReady !== b.isReady) {
        return a.isReady ? 1 : -1;
      }
      return new Date(b.assignedAt) - new Date(a.assignedAt);
    });
  }, [suitAssignments, searchQuery, filterStatus]);

  const handleAssign = async (e) => {
    e.preventDefault();
    
    if (!billNumber.trim() || !selectedWorker) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Find customer name from cloth items
      const item = clothItems.find(i => i.billNumber === billNumber);
      const customerName = item?.customerName || null;
      
      await assignSuitToWorker(billNumber.trim(), selectedWorker, customerName);
      
      // Reset form
      setBillNumber('');
      setSelectedWorker('');
    } catch (error) {
      console.error('Error assigning suit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkReady = async (assignmentId) => {
    try {
      await markSuitAsReady(assignmentId);
    } catch (error) {
      console.error('Error marking suit as ready:', error);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      await deleteSuitAssignment(assignmentId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting suit assignment:', error);
    }
  };

  const stats = useMemo(() => {
    const all = suitAssignments || [];
    return {
      total: all.length,
      pending: all.filter(a => !a.isReady).length,
      ready: all.filter(a => a.isReady).length
    };
  }, [suitAssignments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('suit.tracking')}</h2>
        <p className="text-sm text-gray-600 mt-1">
          {t('suit.tracking_subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Hash className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">{t('suit.total_suits')}</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card ring-1 ring-yellow-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">{t('suit.pending')}</p>
              <p className="text-2xl font-semibold text-yellow-700">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="card ring-1 ring-green-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">{t('suit.ready')}</p>
              <p className="text-2xl font-semibold text-green-700">{stats.ready}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('suit.assign_form_title')}</h3>
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bill Number Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('suit.bill_number')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder={t('suit.bill_placeholder')}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Worker Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('suit.select_worker')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  className="select pl-10"
                  required
                >
                  <option value="">{t('suit.choose_worker')}</option>
                  {SUIT_WORKERS.map(worker => (
                    <option key={worker} value={worker}>{worker}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !billNumber.trim() || !selectedWorker}
              className="btn-primary px-6 py-2"
            >
              {isSubmitting ? t('suit.assigning') : t('suit.assign_suit')}
            </button>
          </div>
        </form>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('suit.search_placeholder')}
                className="input pl-9 w-full"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select w-full"
            >
              <option value="">{t('suit.all_status')}</option>
              <option value="pending">{t('suit.pending')}</option>
              <option value="ready">{t('suit.ready')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('suit.assignments_title')}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('suit.assignments_count', { 
              count: filteredAssignments.length, 
              plural: filteredAssignments.length !== 1 ? 's' : '' 
            })}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('common.bill')} #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('table.customer')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('suit.worker')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('suit.assigned')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('common.status')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">
                    {t('suit.no_assignments')}
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {assignment.billNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {assignment.customerName || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {assignment.workerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(assignment.assignedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {assignment.isReady ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('suit.ready')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          {t('suit.pending')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!assignment.isReady && (
                          <button
                            onClick={() => handleMarkReady(assignment.id)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {t('suit.mark_ready')}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(assignment)}
                          className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t('suit.delete_assignment')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title={t('suit.delete_assignment')}
          message={t('suit.confirm_delete')}
          onConfirm={() => handleDeleteAssignment(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default AdminSuitTracking;


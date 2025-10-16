import React, { useMemo, useState } from 'react';
import { Search, Filter, ArrowUpDown, User, Package, Trash2, ChevronDown, ChevronUp, X, Pencil } from 'lucide-react';
import useStore, { WORKFLOW_STATES, USER_ROLES } from '../store/useStore';
import ConfirmDialog from './ConfirmDialog';
import { useI18n } from '../i18n';
import ImageLightbox from './ImageLightbox';
import EditItemModal from './EditItemModal';


const STATUSES = Object.values(WORKFLOW_STATES);
const TYPES = ['Shirt', 'Pant', 'Kurta', 'Safari'];

const SortHeader = ({ label, sortKey, activeKey, direction, onSort }) => (
  <button
    onClick={() => onSort(sortKey)}
    className={`flex items-center gap-1 text-left font-medium ${activeKey === sortKey ? 'text-blue-700' : 'text-gray-700'}`}
  >
    {label}
    <ArrowUpDown className={`h-4 w-4 ${activeKey === sortKey ? 'text-blue-500' : 'text-gray-400'}`} />
    {activeKey === sortKey && (
      <span className="text-xs text-gray-500">{direction === 'asc' ? '▲' : '▼'}</span>
    )}
  </button>
);

const AdminListView = ({ items, onAssignToTailor }) => {
  const { t, trStatus, trType } = useI18n();
  const { workers, deleteClothItem, currentUserRole, assignItemToWorker, deleteItemImage } = useStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [assignee, setAssignee] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState('updatedAt');
  const [editDialog, setEditDialog] = useState({ isOpen: false, item: null });

  const [sortDir, setSortDir] = useState('desc');
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, item: null });

  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
  const [expanded, setExpanded] = useState({});
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));


  const assignees = useMemo(() => {
    const set = new Set(items.map(i => i.assignedTo).filter(Boolean));
    return Array.from(set);
  }, [items]);

  const allWorkers = useMemo(() => {
    try {
      return Array.from(new Set(Object.values(workers || {}).flat()));
    } catch {
      return [];
    }
  }, [workers]);

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const digitsOnly = /^[0-9]+$/.test(q);
      list = list.filter(i => {
        const bill = String(i.billNumber ?? '').toLowerCase();
        if (digitsOnly) {
          // For pure numeric queries, restrict to bill number prefix only
          return bill.startsWith(q);
        }
        return (
          bill.startsWith(q) ||
          i.type.toLowerCase().includes(q) ||
          (i.assignedTo || '').toLowerCase().includes(q) ||
          (i.customerName || '').toLowerCase().includes(q)
        );
      });
    }
    if (status) list = list.filter(i => i.status === status);
    if (type) list = list.filter(i => i.type === type);
    if (assignee) list = list.filter(i => i.assignedTo === assignee);

    list = [...list].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (sortKey === 'updatedAt' || sortKey === 'createdAt') {
        const toMs = (v) => {
          if (!v) return 0;
          try {
            const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          } catch { return 0; }
        };
        return (toMs(va) - toMs(vb)) * (sortDir === 'asc' ? 1 : -1);
      }
      // Convert to strings for comparison (handles both string and number types)
      const strA = String(va || '').toLowerCase();
      const strB = String(vb || '').toLowerCase();
      return strA.localeCompare(strB) * (sortDir === 'asc' ? 1 : -1);
    });


    return list;
  }, [items, search, status, type, assignee, sortKey, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      const date = typeof d?.toDate === 'function' ? d.toDate() : new Date(d);
      return isNaN(date.getTime()) ? '—' : date.toLocaleString();
    } catch { return '—'; }
  };


  const trHistoryAction = (h) => {
    try {
      if (h?.actionCode === 'created_by_admin') return t('history.actions.created_by_admin');
      if (h?.actionCode === 'assigned_for_stage') {
        const stageKey = h?.actionParams?.stage;
        const stageLabel = stageKey ? t(`history.stage.${stageKey}`) : '';
        const name = h?.actionParams?.name || h?.assignedTo || '';
        return t('history.actions.assigned_for_stage', { name, stage: stageLabel });
      }
      if (h?.actionCode === 'completed_stage') {
        const stageKey = h?.actionParams?.stage;
        const stageLabel = stageKey ? t(`history.stage.${stageKey}`) : trStatus(h?.status);
        return t('history.actions.completed_stage', { stage: stageLabel });
      }
    } catch { /* empty */ }
    return h?.action || '';
  };




  const handleDeleteClick = (item) => {
    setDeleteDialog({ isOpen: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.item) {
      await deleteClothItem(deleteDialog.item.id);
    }
    setDeleteDialog({ isOpen: false, item: null });
  };

  const isAdmin = currentUserRole === USER_ROLES.ADMIN;

  // Check if any items have customer names to determine if we should show the customer column
  const hasCustomerNames = useMemo(() => {
    return items.some(item => item.customerName && item.customerName.trim());
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-gray-700">{t('filters.search')}</label>
          <div className="relative mt-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('filters.search_placeholder')}
              className="input pl-9 w-full"
            />

          </div>
        </div>
        <div className="min-w-[150px]">
          <label className="text-sm font-medium text-gray-700">{t('filters.status')}</label>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="select mt-1 w-full">
            <option value="">{t('common.all')}</option>
            {STATUSES.map(s => <option key={s} value={s}>{trStatus(s)}</option>)}
          </select>
        </div>
        <div className="min-w-[120px]">
          <label className="text-sm font-medium text-gray-700">{t('filters.type')}</label>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="select mt-1 w-full">
            <option value="">{t('common.all')}</option>
            {TYPES.map(t => <option key={t} value={t}>{trType(t)}</option>)}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="text-sm font-medium text-gray-700">{t('filters.assignee')}</label>
          <select value={assignee} onChange={(e) => { setAssignee(e.target.value); setPage(1); }} className="select mt-1 w-full">
            <option value="">{t('common.all')}</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="min-w-[100px]">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('filters.page_size')}</label>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="select mt-1 w-full">
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr className="border-b">
              <th className="px-2 sm:px-3 py-2 text-left w-24 sm:w-36"><SortHeader label={t('table.bill')} sortKey="billNumber" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
              <th className="px-2 sm:px-3 py-2 text-left w-20 sm:w-28"><SortHeader label={t('table.type')} sortKey="type" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
              {hasCustomerNames && <th className="px-2 sm:px-3 py-2 text-left w-20 sm:w-40"><SortHeader label={t('table.customer') || 'Customer'} sortKey="customerName" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>}
              <th className="px-2 sm:px-3 py-2 text-left hidden sm:table-cell"><SortHeader label={t('table.status')} sortKey="status" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
              <th className="px-2 sm:px-3 py-2 text-left w-24 sm:w-48"><SortHeader label={t('table.assigned_to')} sortKey="assignedTo" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
              <th className="px-2 sm:px-3 py-2 text-left w-32 sm:w-56 hidden sm:table-cell"><SortHeader label={t('table.updated')} sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
              <th className="px-2 sm:px-3 py-2 text-left w-32 sm:w-64">{t('table.actions')}</th>
              {isAdmin && <th className="px-2 sm:px-3 py-2 text-left w-12 sm:w-20">{t('table.delete')}</th>}
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? (hasCustomerNames ? 8 : 7) : (hasCustomerNames ? 7 : 6)} className="text-center py-10 text-gray-500 text-sm">{t('table.empty')}</td>
              </tr>
            ) : pageItems.map(item => (
              <React.Fragment key={item.id}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="px-2 sm:px-3 py-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Package className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900 text-xs sm:text-sm truncate">{item.billNumber}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">
                    <div className="truncate">
                      {((Number(item?.quantity) || 1) > 1) ? `${Number(item.quantity)}x ${trType(item.type)}` : trType(item.type)}
                    </div>
                  </td>
                  {hasCustomerNames && (
                    <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">
                      <span className="truncate">{item.customerName || '—'}</span>
                    </td>
                  )}
                  <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm hidden sm:table-cell">{trStatus(item.status)}</td>
                  <td className="px-2 sm:px-3 py-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-xs sm:text-sm truncate">{item.assignedTo || '—'}</span>
                    </div>
                  </td>

                  <td className="px-2 sm:px-3 py-2 text-gray-600 text-xs sm:text-sm hidden sm:table-cell">{formatDate(item.updatedAt)}</td>
                  <td className="px-2 sm:px-3 py-2 align-top">
                    <div className="flex flex-col gap-1 sm:gap-2 min-w-0">
                      {isAdmin && (
                        <button
                          onClick={() => setEditDialog({ isOpen: true, item })}
                          className="btn-secondary min-h-0 h-8 px-2 py-1 text-xs w-full sm:w-auto"
                          title={t('table.edit') || 'Edit'}
                        >
                          <span className="inline-flex items-center gap-1 justify-center">
                            <Pencil className="h-3 w-3" />
                            <span className="hidden sm:inline text-xs">{t('table.edit') || 'Edit'}</span>
                          </span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="btn-secondary min-h-0 h-8 px-2 py-1 text-xs w-full sm:w-auto"
                          aria-expanded={!!expanded[item.id]}
                          aria-controls={`history-${item.id}`}
                          title={t('table.history') || 'History'}
                        >
                          {expanded[item.id] ? (
                            <span className="inline-flex items-center gap-1 justify-center">
                              <ChevronUp className="h-3 w-3" />
                              <span className="hidden sm:inline text-xs">{t('table.history') || 'History'}</span>

                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 justify-center">
                              <ChevronDown className="h-3 w-3" />
                              <span className="hidden sm:inline text-xs">{t('table.history') || 'History'}</span>
                            </span>
                          )}
                        </button>
                      )}

                      {item.status === WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT ? (
                        <select
                          defaultValue=""
                          onChange={(e) => e.target.value && onAssignToTailor(item.id, e.target.value)}
                          className="select w-full min-w-[120px] max-w-[14rem] text-xs h-8"
                        >
                          <option value="">{t('table.assign_tailor')}</option>
                          {(workers[USER_ROLES.TAILOR] || []).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-400 text-xs text-center sm:text-left">{t('table.no_action')}</span>
                      )}

                      {/* Photo thumbnails - responsive grid */}
                      {(() => {
                        const imgs = Array.isArray(item.images) && item.images.length > 0 ? item.images : (Array.isArray(item.photoUrls) ? item.photoUrls.map(u => ({ fullUrl: u, thumbUrl: u })) : []);
                        if (!imgs.length) return null;
                        return (
                          <div className="mt-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                              {imgs.slice(0, 3).map((im, idx) => (
                                <div key={idx} className="relative group">
                                  <button
                                    onClick={() => setLightbox({ open: true, images: imgs, index: idx })}
                                    className="block aspect-square overflow-hidden rounded border w-full h-12 sm:h-16"
                                  >
                                    <img
                                      src={im.thumbUrl || im.fullUrl}
                                      alt={`thumb ${idx+1}`}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      title={t('photos.delete') || 'Delete photo'}
                                      className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded p-0.5 opacity-0 group-hover:opacity-100"
                                      onClick={async (e) => { e.stopPropagation(); await deleteItemImage(item.id, im); }}
                                    >
                                      <X className="h-2 w-2 sm:h-3 sm:w-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {imgs.length > 3 && (
                              <div className="text-[10px] sm:text-[11px] text-gray-500 mt-1 text-center">+{imgs.length - 3} more</div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Override assignment (Admin can reassign anytime) */}
                      {isAdmin && (
                        <select
                          defaultValue=""
                          onChange={(e) => e.target.value && assignItemToWorker(item.id, e.target.value)}
                          className="select w-full min-w-[120px] max-w-[14rem] text-xs h-8"
                        >
                          <option value="">{t('table.override_assign')}</option>
                          {allWorkers.map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-2 sm:px-3 py-2">
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="p-1 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('dialog.delete_title')}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </td>
                  )}
                </tr>

                {isAdmin && expanded[item.id] && (
                  <tr className="bg-gray-50" id={`history-${item.id}`}>
                    <td colSpan={isAdmin ? (hasCustomerNames ? 8 : 7) : (hasCustomerNames ? 7 : 6)} className="px-2 sm:px-3 py-3">
                      <div className="rounded-lg border bg-white p-3 sm:p-4">
                        <div className="mb-2 text-sm font-medium text-gray-700">{t('table.history') || 'History'}</div>
                        <ol className="relative pl-4 sm:pl-5 before:absolute before:left-1 before:top-1 before:bottom-1 before:w-px before:bg-gray-200">
                          {Array.isArray(item.history) && item.history.length > 0 ? (
                            [...item.history]
                              .sort((a, b) => new Date(b?.timestamp || 0) - new Date(a?.timestamp || 0))
                              .map((h, idx) => (
                                <li key={idx} className="relative mb-3 pl-2 sm:pl-3">
                                  <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-blue-500"></span>
                                  <div className="text-[13px] sm:text-sm text-gray-900 font-medium break-words">{trHistoryAction(h)}</div>
                                  <div className="text-[11px] text-gray-600 break-words">
                                    {h?.status ? trStatus(h.status) : ''}{h?.assignedTo ? ` • ${h.assignedTo}` : ''}
                                  </div>
                                  <div className="text-[11px] text-gray-500">{formatDate(h?.timestamp)}</div>
                                </li>
                              ))
                          ) : (
                            <li className="text-xs text-gray-500">{t('table.no_history') || 'No history'}</li>
                          )}
                        </ol>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
        <div className="text-gray-600 text-xs sm:text-sm text-center sm:text-left">
          {t('common.showing', { from: (currentPage - 1) * pageSize + 1, to: Math.min(currentPage * pageSize, total), total })}
        </div>
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <button
            className="btn-secondary min-h-0 h-9 px-2 py-1 text-xs sm:h-11 sm:min-h-[44px] sm:px-3 sm:py-2 sm:text-sm"
            onClick={() => setPage(1)}
            disabled={currentPage === 1}
          >{t('table.first')}</button>
          <button
            className="btn-secondary min-h-0 h-9 px-2 py-1 text-xs sm:h-11 sm:min-h-[44px] sm:px-3 sm:py-2 sm:text-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >{t('table.prev')}</button>
          <span className="px-2 text-xs sm:text-sm text-center min-w-[80px]">{t('common.page', { n: currentPage, m: totalPages })}</span>
          <button
            className="btn-secondary min-h-0 h-9 px-2 py-1 text-xs sm:h-11 sm:min-h-[44px] sm:px-3 sm:py-2 sm:text-sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >{t('table.next')}</button>
          <button
            className="btn-secondary min-h-0 h-9 px-2 py-1 text-xs sm:h-11 sm:min-h-[44px] sm:px-3 sm:py-2 sm:text-sm"
            onClick={() => setPage(totalPages)}
            disabled={currentPage === totalPages}
          >{t('table.last')}</button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {/* Edit Item Modal */}
      {editDialog.isOpen && (
        <EditItemModal
          item={editDialog.item}
          onClose={() => setEditDialog({ isOpen: false, item: null })}
        />
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, item: null })}
        onConfirm={handleDeleteConfirm}
        title={t('dialog.delete_title')}
        message={t('dialog.delete_msg', { bill: deleteDialog.item?.billNumber || '' })}
        confirmText={t('table.delete')}
        cancelText={t('common.cancel')}
        type="danger"
      />

      {/* Lightbox */}
      {lightbox.open && (
        <ImageLightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox({ open: false, images: [], index: 0 })} />
      )}
    </div>
  );
};

export default AdminListView;


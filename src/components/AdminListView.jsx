import React, { useMemo, useState } from 'react';
import { Search, Filter, ArrowUpDown, User, Package } from 'lucide-react';
import useStore, { WORKFLOW_STATES, USER_ROLES } from '../store/useStore';

const STATUSES = Object.values(WORKFLOW_STATES);
const TYPES = ['Shirt', 'Pant', 'Kurta'];

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
  const { completeTask, workers } = useStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [assignee, setAssignee] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');

  const assignees = useMemo(() => {
    const set = new Set(items.map(i => i.assignedTo).filter(Boolean));
    return Array.from(set);
  }, [items]);

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
      list = list.filter(i =>
        i.billNumber.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        (i.assignedTo || '').toLowerCase().includes(q)
      );
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
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb) * (sortDir === 'asc' ? 1 : -1);
      }
      return 0;
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

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">Search</label>
          <div className="relative mt-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Bill #, Type or Assignee"
              className="input pl-9"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="select mt-1 w-52">
            <option value="">All</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Type</label>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="select mt-1 w-40">
            <option value="">All</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Assignee</label>
          <select value={assignee} onChange={(e) => { setAssignee(e.target.value); setPage(1); }} className="select mt-1 w-48">
            <option value="">All</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Page size</label>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="select mt-1 w-28">
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr className="border-b">
              <th className="px-3 py-2 w-36"><SortHeader label="Bill #" sortKey="billNumber" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
              <th className="px-3 py-2 w-28"><SortHeader label="Type" sortKey="type" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
              <th className="px-3 py-2"><SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
              <th className="px-3 py-2 w-48"><SortHeader label="Assigned To" sortKey="assignedTo" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
              <th className="px-3 py-2 w-56"><SortHeader label="Updated" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={handleSort} /></th>
              <th className="px-3 py-2 w-64">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">No items found</td>
              </tr>
            ) : pageItems.map(item => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{item.billNumber}</span>
                  </div>
                </td>
                <td className="px-3 py-2">{item.type}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{item.assignedTo || '—'}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-600">{formatDate(item.updatedAt)}</td>
                <td className="px-3 py-2">
                  {item.status === WORKFLOW_STATES.AWAITING_STITCHING_ASSIGNMENT ? (
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue=""
                        onChange={(e) => e.target.value && onAssignToTailor(item.id, e.target.value)}
                        className="select w-44"
                      >
                        <option value="">Assign tailor...</option>
                        {(workers[USER_ROLES.TAILOR] || []).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">No action</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-600">Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)} of {total}</div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setPage(1)} disabled={currentPage === 1}>First</button>
          <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
          <span className="px-2">Page {currentPage} / {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
          <button className="btn-secondary" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>Last</button>
        </div>
      </div>
    </div>
  );
};

export default AdminListView;


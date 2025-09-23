import React, { useState } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import useStore, { USER_ROLES } from '../store/useStore';
import { useI18n } from '../i18n';

const ROLE_ORDER = [
  USER_ROLES.CUTTING_WORKER,
  USER_ROLES.THREADING_WORKER, // Thread matching
  USER_ROLES.TAILOR,
  USER_ROLES.BUTTONING_WORKER, // Kaach
  USER_ROLES.IRONING_WORKER,
  USER_ROLES.PACKAGING_WORKER,
  USER_ROLES.ADMIN,
];

const AdminManageWorkers = ({ onClose }) => {
  const { t, trRole } = useI18n();
  const { workers, addWorker, removeWorker, setDefaultWorker } = useStore();
  const [inputs, setInputs] = useState({});

  const handleAdd = (role) => {
    const name = (inputs[role] || '').trim();
    if (!name) return;
    addWorker(role, name);
    setInputs((s) => ({ ...s, [role]: '' }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-2xl md:max-w-3xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('workers.manage_title')}</h2>
          <button className="p-2 hover:bg-gray-100 rounded-lg" onClick={onClose}><X className="h-5 w-5 text-gray-500"/></button>
        </div>

        <div className="p-6 space-y-6">
          {ROLE_ORDER.map((role) => (
            <div key={role} className="border rounded-lg">
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{trRole(role)}</h3>
                <div className="flex items-center gap-2">
                  <input
                    value={inputs[role] || ''}
                    onChange={(e) => setInputs((s) => ({ ...s, [role]: e.target.value }))}
                    placeholder={t('workers.add_placeholder', { role: trRole(role) })}
                    className="input h-9 w-64"
                  />
                  <button className="btn-primary h-9 px-3 flex items-center" onClick={() => handleAdd(role)}>
                    <UserPlus className="h-4 w-4 mr-1"/> {t('common.add')}
                  </button>
                </div>
              </div>
              <div className="p-4">
                {(workers[role] || []).length === 0 ? (
                  <p className="text-sm text-gray-500">{t('workers.none_yet')}</p>
                ) : (
                  <ul className="divide-y">
                    {workers[role].map((name) => (
                      <li key={name} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-800">{name}</span>
                          {workers[role]?.[0] === name && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">{t('workers.default')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {workers[role]?.[0] !== name && (
                            <button className="btn-secondary h-8 px-3" onClick={() => setDefaultWorker(role, name)}>
                              {t('workers.make_default')}
                            </button>
                          )}
                          <button className="btn-secondary h-8 px-3 flex items-center" onClick={() => removeWorker(role, name)}>
                            <Trash2 className="h-4 w-4 mr-1"/> {t('common.remove')}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminManageWorkers;


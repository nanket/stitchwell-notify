import React, { useState } from 'react';
import { User, LogIn, Scissors } from 'lucide-react';
import useStore, { USER_ROLES } from '../store/useStore';

const LoginScreen = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const { setCurrentUser, workers } = useStore();

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setSelectedWorker(''); // Reset worker selection when role changes
  };

  const handleLogin = () => {
    if (!selectedRole) return;
    if (selectedRole === USER_ROLES.ADMIN) {
      const adminUser = workers[USER_ROLES.ADMIN]?.[0] || 'Admin';
      setCurrentUser(adminUser, selectedRole);
      return;
    }
    if (!selectedWorker) return;
    setCurrentUser(selectedWorker, selectedRole);
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return 'Admin';
      case USER_ROLES.THREADING_WORKER:
        return 'Threading Worker';
      case USER_ROLES.CUTTING_WORKER:
        return 'Cutting Worker';
      case USER_ROLES.TAILOR:
        return 'Tailor';
      case USER_ROLES.BUTTONING_WORKER:
        return 'Buttoning Worker';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Scissors className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            StitchWell Tracking
          </h2>
          <p className="text-gray-600">
            Tailoring Business Workflow Management
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <User className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Select Your Role
            </h3>
            <p className="text-gray-600 text-sm">
              Choose your role to access your dashboard
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              User Role
            </label>
            <div className="space-y-2">
              {Object.values(USER_ROLES).map((role) => (
                <label
                  key={role}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedRole === role
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    selectedRole === role
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedRole === role && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {getRoleDisplayName(role)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Worker Selection (hidden for Admin) */}
          {selectedRole && selectedRole !== USER_ROLES.ADMIN && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Worker
              </label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="select w-full"
              >
                <option value="">Choose a worker...</option>
                {(workers[selectedRole] || []).map((worker) => (
                  <option key={worker} value={worker}>
                    {worker}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={!selectedRole || (selectedRole !== USER_ROLES.ADMIN && !selectedWorker)}
            className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
              selectedRole && (selectedRole === USER_ROLES.ADMIN || selectedWorker)
                ? 'btn-primary'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <LogIn className="w-5 h-5 mr-2" />
            Login to Dashboard
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2024 StitchWell Tracking System</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

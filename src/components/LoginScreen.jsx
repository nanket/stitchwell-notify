import React, { useState } from 'react';
import { User, LogIn, Scissors, Lock } from 'lucide-react';
import useStore from '../store/useStore';
import { useI18n } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const loginWithCredentials = useStore(s => s.loginWithCredentials);
  const { t } = useI18n();

  const handleSubmit = (e) => {
    e.preventDefault();
    loginWithCredentials(username, password);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="absolute top-3 right-3">
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Scissors className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t('common.app_name')}
          </h2>
          <p className="text-gray-600">
            {t('admin.subtitle')}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <User className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('auth.heading')}
            </h3>
            <p className="text-gray-600 text-sm">
              {t('auth.subtitle')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.username')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.username_placeholder')}
                className="input w-full"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input w-full pr-10"
                  autoComplete="current-password"
                  required
                />
                <Lock className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('auth.password_hint')}</p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium btn-primary"
          >
            <LogIn className="w-5 h-5 mr-2" />
            {t('auth.sign_in')}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>{t('common.app_name')}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

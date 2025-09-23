import React from 'react';
import { useI18n } from '../i18n';

const LanguageSwitcher = () => {
  const { lang, setLanguage } = useI18n();

  return (
    <div className="flex items-center gap-1">
      <button
        className={`px-2 py-1 text-xs rounded ${lang === 'hi' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        onClick={() => setLanguage('hi')}
        aria-label="Switch to Hindi"
      >
        हिंदी
      </button>
      <button
        className={`px-2 py-1 text-xs rounded ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        onClick={() => setLanguage('en')}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;


import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'en' ? 'id' : 'en';
    i18n.changeLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
      title={`Current language: ${i18n.language === 'en' ? 'English' : 'Bahasa Indonesia'}`}
    >
      <Globe size={18} />
      <span>{i18n.language.toUpperCase()}</span>
    </button>
  );
}

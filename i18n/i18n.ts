import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEN from '../locales/en/common.json';
import dashboardEN from '../locales/en/dashboard.json';
import formsEN from '../locales/en/forms.json';
import tablesEN from '../locales/en/tables.json';

import commonID from '../locales/id/common.json';
import dashboardID from '../locales/id/dashboard.json';
import formsID from '../locales/id/forms.json';
import tablesID from '../locales/id/tables.json';

const resources = {
  en: {
    common: commonEN,
    dashboard: dashboardEN,
    forms: formsEN,
    tables: tablesEN,
  },
  id: {
    common: commonID,
    dashboard: dashboardID,
    forms: formsID,
    tables: tablesID,
  },
};

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'id',
    lng: 'id',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18next;

import React from 'react';
import { Filter, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../context/FilterContext';
import { LanguageSwitcher } from './LanguageSwitcher';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const { filters, updateFilter } = useFilters();

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{t('dashboard:title')}</h1>
          <p className="text-xs text-slate-500">{t('dashboard:subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Location Filter */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
            <Filter size={14} className="text-slate-400 mr-2" />
            <select 
              className="bg-transparent text-sm text-slate-700 focus:outline-none w-32"
              value={filters.provinsi}
              onChange={(e) => updateFilter('provinsi', e.target.value)}
            >
              <option value="">{t('dashboard:filters.allProvinces')}</option>
              <option value="Jawa Timur">{t('dashboard:filters.provinces.jawaTImur')}</option>
              <option value="Riau">{t('dashboard:filters.provinces.riau')}</option>
              <option value="Kalimantan Tengah">{t('dashboard:filters.provinces.kalimantan')}</option>
              <option value="Jambi">{t('dashboard:filters.provinces.jambi')}</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
            <select 
              className="bg-transparent text-sm text-slate-700 focus:outline-none w-32"
              value={filters.kabupaten}
              onChange={(e) => updateFilter('kabupaten', e.target.value)}
            >
              <option value="">{t('dashboard:filters.allRegencies')}</option>
              <option value="Surabaya">{t('dashboard:filters.regencies.surabaya')}</option>
              <option value="Pekanbaru">{t('dashboard:filters.regencies.pekanbaru')}</option>
              <option value="Palangka">{t('dashboard:filters.regencies.palangka')}</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
            <select 
              className="bg-transparent text-sm text-slate-700 focus:outline-none w-28"
              value={filters.jenis_perusahaan}
              onChange={(e) => updateFilter('jenis_perusahaan', e.target.value)}
            >
              <option value="">{t('dashboard:filters.allTypes')}</option>
              <option value="PBPH">{t('dashboard:filters.types.pbph')}</option>
              <option value="Perkebunan">{t('dashboard:filters.types.perkebunan')}</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 gap-2">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date" 
              className="bg-transparent text-xs text-slate-700 focus:outline-none w-28"
              value={filters.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              title={t('dashboard:filters.startDate') || 'Start Date'}
            />
            <span className="text-slate-400 text-xs">-</span>
            <input 
              type="date" 
              className="bg-transparent text-xs text-slate-700 focus:outline-none w-28"
              value={filters.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              title={t('dashboard:filters.endDate') || 'End Date'}
            />
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};

export default Header;
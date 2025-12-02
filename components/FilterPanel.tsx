import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../context/FilterContext';

const FilterPanel: React.FC = () => {
  const { t } = useTranslation();
  const { filters, setTimePeriod, updateFilter, resetFilters } = useFilters();
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePresetClick = (period: 'today' | '7d' | '14d' | '30d') => {
    setTimePeriod(period);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimePeriod('custom');
    updateFilter('startDate', e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimePeriod('custom');
    updateFilter('endDate', e.target.value);
  };

  const presetButtons = [
    { label: t('forms:dateFilter.today'), value: 'today' as const },
    { label: t('forms:dateFilter.7days'), value: '7d' as const },
    { label: t('forms:dateFilter.14days'), value: '14d' as const },
    { label: t('forms:dateFilter.30days'), value: '30d' as const },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Mobile Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full lg:hidden flex items-center justify-between p-4 hover:bg-slate-50 transition"
      >
        <h3 className="font-semibold text-slate-700">{t('forms:dateFilter.title')}</h3>
        <svg
          className={`w-5 h-5 text-slate-600 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {/* Desktop Header */}
      <div className="hidden lg:block p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-700">{t('forms:dateFilter.title')}</h3>
      </div>

      {/* Content */}
      <div className={`${isExpanded ? 'block' : 'hidden'} lg:block p-4 space-y-4`}>
        {/* Preset Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600">{t('forms:dateFilter.quickSelect')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {presetButtons.map(btn => (
              <button
                key={btn.value}
                onClick={() => handlePresetClick(btn.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  filters.timePeriod === btn.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600">{t('forms:dateFilter.customRange')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('forms:dateFilter.startDate')}</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={handleStartDateChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('forms:dateFilter.endDate')}</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={handleEndDateChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetFilters}
          className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
        >
          {t('forms:dateFilter.reset')}
        </button>

        {/* Current Filter Display */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600">
            <span className="font-medium">Active Range:</span> {filters.startDate} to {filters.endDate}
            {filters.timePeriod && filters.timePeriod !== 'custom' && (
              <span className="ml-2 inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {presetButtons.find(b => b.value === filters.timePeriod)?.label}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;

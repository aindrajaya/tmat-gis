import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../context/FilterContext';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

const AdvancedFilterPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';
  const { filters, updateFilter, setTimePeriod, resetFilters, enforcedProvinsi } = useFilters();
  const [activeTab, setActiveTab] = useState<'location' | 'date' | 'search'>('location');

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilter('searchText', e.target.value);
  };

  const activeFiltersCount = [
    filters.provinsi,
    filters.kabupaten,
    filters.kecamatan,
    filters.desa,
    filters.jenis_perusahaan,
    filters.searchText
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-20">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Filter Panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl m-4 max-h-[80vh] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800">
              {isIndonesian ? 'Filter Lanjutan' : 'Advanced Filters'}
            </h2>
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 sticky top-[73px] z-10">
          <button
            onClick={() => setActiveTab('location')}
            className={`flex-1 py-3 px-4 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'location'
                ? 'border-emerald-500 text-emerald-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            {isIndonesian ? 'Lokasi' : 'Location'}
          </button>
          <button
            onClick={() => setActiveTab('date')}
            className={`flex-1 py-3 px-4 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'date'
                ? 'border-emerald-500 text-emerald-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            {isIndonesian ? 'Tanggal' : 'Date Range'}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 px-4 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'search'
                ? 'border-emerald-500 text-emerald-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            {isIndonesian ? 'Pencarian' : 'Search'}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              {/* Province Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isIndonesian ? 'Provinsi' : 'Province'}
                </label>
                <select
                  value={filters.provinsi}
                  onChange={(e) => {
                    updateFilter('provinsi', e.target.value);
                    // Reset child filters when province changes
                    updateFilter('kabupaten', '');
                    updateFilter('kecamatan', '');
                    updateFilter('desa', '');
                  }}
                  disabled={!!enforcedProvinsi}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-700 disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                  <option value="">{isIndonesian ? 'Semua Provinsi' : 'All Provinces'}</option>
                  <option value="Jawa Timur">Jawa Timur</option>
                  <option value="Riau">Riau</option>
                  <option value="Kalimantan Tengah">Kalimantan Tengah</option>
                  <option value="Jambi">Jambi</option>
                </select>
                {enforcedProvinsi && (
                  <p className="text-xs text-emerald-600 font-medium mt-2">
                    ℹ️ {isIndonesian
                      ? `Akun Anda dibatasi ke provinsi ${enforcedProvinsi}`
                      : `Your account is restricted to ${enforcedProvinsi} province`}
                  </p>
                )}
              </div>

              {/* Regency Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isIndonesian ? 'Kabupaten/Kota' : 'Regency/City'}
                </label>
                <select
                  value={filters.kabupaten}
                  onChange={(e) => {
                    updateFilter('kabupaten', e.target.value);
                    // Reset child filters when kabupaten changes
                    updateFilter('kecamatan', '');
                    updateFilter('desa', '');
                  }}
                  disabled={!filters.provinsi && !enforcedProvinsi}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-700 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">{isIndonesian ? 'Semua Kabupaten/Kota' : 'All Regencies/Cities'}</option>
                  <option value="Surabaya">Surabaya</option>
                  <option value="Pekanbaru">Pekanbaru</option>
                  <option value="Palangka">Palangka</option>
                  <option value="Jambi">Jambi</option>
                </select>
              </div>

              {/* Kecamatan Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isIndonesian ? 'Kecamatan' : 'District'}
                </label>
                <select
                  value={filters.kecamatan}
                  onChange={(e) => {
                    updateFilter('kecamatan', e.target.value);
                    // Reset desa when kecamatan changes
                    updateFilter('desa', '');
                  }}
                  disabled={!filters.kabupaten}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-700 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">{isIndonesian ? 'Semua Kecamatan' : 'All Districts'}</option>
                  <option value="Kecamatan 1">Kecamatan 1</option>
                  <option value="Kecamatan 2">Kecamatan 2</option>
                  <option value="Kecamatan 3">Kecamatan 3</option>
                </select>
                {!filters.kabupaten && (
                  <p className="text-xs text-slate-500 mt-1">
                    {isIndonesian ? 'Pilih Kabupaten/Kota terlebih dahulu' : 'Select Regency/City first'}
                  </p>
                )}
              </div>

              {/* Desa Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isIndonesian ? 'Desa/Kelurahan' : 'Village'}
                </label>
                <input
                  type="text"
                  placeholder={isIndonesian ? 'Ketik nama desa...' : 'Type village name...'}
                  value={filters.desa}
                  onChange={(e) => updateFilter('desa', e.target.value)}
                  disabled={!filters.kecamatan}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-700 disabled:bg-slate-100 disabled:cursor-not-allowed placeholder-slate-400"
                />
                {!filters.kecamatan && (
                  <p className="text-xs text-slate-500 mt-1">
                    {isIndonesian ? 'Pilih Kecamatan terlebih dahulu' : 'Select District first'}
                  </p>
                )}
              </div>

              {/* Company Type Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isIndonesian ? 'Jenis Perusahaan' : 'Company Type'}
                </label>
                <select
                  value={filters.jenis_perusahaan}
                  onChange={(e) => updateFilter('jenis_perusahaan', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-700"
                >
                  <option value="">{isIndonesian ? 'Semua Jenis' : 'All Types'}</option>
                  <option value="PBPH">PBPH</option>
                  <option value="Perkebunan">Perkebunan</option>
                  <option value="Sawit">Sawit</option>
                </select>
              </div>
            </div>
          )}

          {/* Date Range Tab */}
          {activeTab === 'date' && (
            <div className="space-y-4">
              {/* Preset Buttons */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  {isIndonesian ? 'Rentang Cepat' : 'Quick Range'}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => handlePresetClick('today')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.timePeriod === 'today'
                        ? 'bg-emerald-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isIndonesian ? 'Hari Ini' : 'Today'}
                  </button>
                  <button
                    onClick={() => handlePresetClick('7d')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.timePeriod === '7d'
                        ? 'bg-emerald-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isIndonesian ? '7 Hari' : '7 Days'}
                  </button>
                  <button
                    onClick={() => handlePresetClick('14d')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.timePeriod === '14d'
                        ? 'bg-emerald-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isIndonesian ? '14 Hari' : '14 Days'}
                  </button>
                  <button
                    onClick={() => handlePresetClick('30d')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.timePeriod === '30d'
                        ? 'bg-emerald-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isIndonesian ? '30 Hari' : '30 Days'}
                  </button>
                </div>
              </div>

              {/* Custom Date Range */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  {isIndonesian ? 'Rentang Kustom' : 'Custom Range'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {isIndonesian ? 'Tanggal Mulai' : 'Start Date'}
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={handleStartDateChange}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {isIndonesian ? 'Tanggal Akhir' : 'End Date'}
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={handleEndDateChange}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Date Info */}
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-700">
                  <span className="font-semibold">{isIndonesian ? 'Periode Aktif:' : 'Active Period:'}</span> {filters.startDate} - {filters.endDate}
                  {filters.timePeriod !== 'custom' && (
                    <span className="ml-2 inline-block px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded text-xs font-medium">
                      {filters.timePeriod.toUpperCase()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isIndonesian ? 'Cari Perangkat' : 'Search Device'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isIndonesian ? 'Cari ID perangkat, nama, lokasi...' : 'Search device ID, name, location...'}
                    value={filters.searchText || ''}
                    onChange={handleSearchChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-700 placeholder-slate-400"
                  />
                  {filters.searchText && (
                    <button
                      onClick={() => updateFilter('searchText', '')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {isIndonesian 
                    ? 'Cari berdasarkan ID perangkat, nama lokasi, atau nama perusahaan'
                    : 'Search by device ID, location name, or company name'}
                </p>
              </div>

              {/* Search Tips */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                <p className="text-xs font-semibold text-blue-800">
                  {isIndonesian ? 'Tips Pencarian:' : 'Search Tips:'}
                </p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>{isIndonesian ? 'Gunakan kata kunci lengkap untuk hasil yang lebih akurat' : 'Use complete keywords for better results'}</li>
                  <li>{isIndonesian ? 'Pencarian tidak peka huruf besar/kecil' : 'Search is case-insensitive'}</li>
                  <li>{isIndonesian ? 'Kombinasikan dengan filter lokasi untuk hasil spesifik' : 'Combine with location filters for specific results'}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Action Buttons */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4 flex gap-2 justify-end z-10">
          <button
            onClick={() => {
              resetFilters();
            }}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {isIndonesian ? 'Reset Semua' : 'Reset All'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            {isIndonesian ? 'Terapkan' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilterPanel;

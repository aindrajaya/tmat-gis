import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePerusahaan } from '../services/useApi';
import { Perusahaan } from '../types';
import { Building2, Phone, Mail, User, Calendar, MapPin, Hash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Companies: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';
  const { user } = useAuth();
  const { data: companies, loading, error } = usePerusahaan(user?.perusahaanId || undefined);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filteredCompanies, setFilteredCompanies] = useState<Perusahaan[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter companies based on search and type
  useEffect(() => {
    if (!companies) {
      setFilteredCompanies([]);
      return;
    }

    let filtered = companies;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.jenis_perusahaan === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.nama_perusahaan.toLowerCase().includes(search) ||
        c.kode_perusahaan.toLowerCase().includes(search) ||
        c.pic_kontak.toLowerCase().includes(search) ||
        c.email_kontak.toLowerCase().includes(search) ||
        c.alamat.toLowerCase().includes(search)
      );
    }

    setFilteredCompanies(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [companies, searchTerm, filterType]);

  // Pagination
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCompanies = filteredCompanies.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    const isActive = status.toLowerCase() === 'active' || status.toLowerCase() === 'aktif';
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          isActive
            ? 'bg-green-100 text-green-700'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {isActive ? (isIndonesian ? 'Aktif' : 'Active') : status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          type === 'PBPH'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-purple-100 text-purple-700'
        }`}
      >
        {type}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(isIndonesian ? 'id-ID' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {isIndonesian ? 'Data Perusahaan' : 'Company Data'}
          </h1>
          <p className="text-slate-600 mt-1">
            {isIndonesian
              ? 'Kelola dan lihat informasi perusahaan yang terdaftar'
              : 'Manage and view registered company information'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder={isIndonesian ? 'Cari perusahaan...' : 'Search companies...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">{isIndonesian ? 'Semua Jenis' : 'All Types'}</option>
            <option value="PBPH">PBPH</option>
            <option value="Perkebunan">{isIndonesian ? 'Perkebunan' : 'Plantation'}</option>
          </select>
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center gap-6 text-sm text-slate-600">
          <span>
            <strong className="text-slate-800">{filteredCompanies.length}</strong>{' '}
            {isIndonesian ? 'perusahaan ditemukan' : 'companies found'}
          </span>
          {companies && (
            <>
              <span>
                <strong className="text-blue-600">
                  {companies.filter(c => c.jenis_perusahaan === 'PBPH').length}
                </strong>{' '}
                PBPH
              </span>
              <span>
                <strong className="text-purple-600">
                  {companies.filter(c => c.jenis_perusahaan === 'Perkebunan').length}
                </strong>{' '}
                {isIndonesian ? 'Perkebunan' : 'Plantation'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <strong>{isIndonesian ? 'Error:' : 'Error:'}</strong> {error.message}
        </div>
      )}

      {/* Companies Grid */}
      {!loading && !error && currentCompanies.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {currentCompanies.map((company) => (
            <div
              key={company.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800 mb-1">
                        {company.nama_perusahaan}
                      </h3>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(company.jenis_perusahaan)}
                        {getStatusBadge(company.status)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <Hash className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">
                      {isIndonesian ? 'Kode Perusahaan' : 'Company Code'}
                    </p>
                    <p className="text-slate-700 font-medium">{company.kode_perusahaan}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">
                      {isIndonesian ? 'PIC Kontak' : 'Contact Person'}
                    </p>
                    <p className="text-slate-700 font-medium">{company.pic_kontak}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Email</p>
                    <a
                      href={`mailto:${company.email_kontak}`}
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {company.email_kontak}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">
                      {isIndonesian ? 'Telepon' : 'Phone'}
                    </p>
                    <a
                      href={`tel:${company.telepon}`}
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {company.telepon}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">
                      {isIndonesian ? 'Alamat' : 'Address'}
                    </p>
                    <p className="text-slate-700">{company.alamat}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm pt-2 border-t border-slate-100">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">
                      {isIndonesian ? 'Terdaftar' : 'Registered'}
                    </p>
                    <p className="text-slate-700">{formatDate(company.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredCompanies.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            {isIndonesian ? 'Tidak ada perusahaan ditemukan' : 'No companies found'}
          </h3>
          <p className="text-slate-500">
            {isIndonesian
              ? 'Coba ubah filter atau pencarian Anda'
              : 'Try adjusting your filters or search term'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filteredCompanies.length > itemsPerPage && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-sm text-slate-600">
            {isIndonesian ? 'Menampilkan' : 'Showing'} {startIndex + 1}-
            {Math.min(endIndex, filteredCompanies.length)} {isIndonesian ? 'dari' : 'of'}{' '}
            {filteredCompanies.length} {isIndonesian ? 'perusahaan' : 'companies'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isIndonesian ? 'Sebelumnya' : 'Previous'}
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg ${
                    currentPage === page
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isIndonesian ? 'Berikutnya' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;

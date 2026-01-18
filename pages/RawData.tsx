import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, FileSpreadsheet, ChevronDown, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useRealtimeAll, useDevices } from '../services/useApi';
import { useFilters } from '../context/FilterContext';
import { useAuth } from '../context/AuthContext';
import AdvancedFilterPanel from '../components/AdvancedFilterPanel';

// Memoized table row component to prevent unnecessary re-renders
interface TableRowProps {
  row: any;
  t: any;
}

const TableRow = memo(({ row, t }: TableRowProps) => (
  <tr className="hover:bg-slate-50 transition-colors">
    <td className="px-6 py-3 font-medium">{row.timestamp_data}</td>
    <td className="px-6 py-3 text-emerald-700">{row.device_id_unik}</td>
    <td className="px-6 py-3">{row.location}</td>
    <td className={`px-6 py-3 text-right font-bold ${row.tmat_value < -0.4 ? 'text-red-600' : 'text-slate-700'}`}>
      {row.tmat_value}
    </td>
    <td className="px-6 py-3 text-right">{row.suhu_value}</td>
    <td className="px-6 py-3 text-right">{row.ph_value}</td>
  </tr>
));

const RawData: React.FC = () => {
  const { t } = useTranslation();
  const { filters, enforcedProvinsi } = useFilters();
  const { user } = useAuth();
  
  // Fetch data from API
  const { data: realtimeData, loading, error, refetch } = useRealtimeAll(user?.perusahaanId || undefined);
  const { data: devices } = useDevices(user?.perusahaanId || undefined);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const pageSize = 50;

  // Prepare table data: Join realtime with device info (memoized for performance)
  const tableData = useMemo(() => {
    if (!realtimeData || !devices) return [];

    // Create device lookup map for O(1) lookups instead of O(n) array searches
    const deviceById = new Map(devices.map(d => [d.device_id_unik, d]));

    // Province gate: drop records outside enforced or selected province
    const targetProv = enforcedProvinsi || filters.provinsi;
    
    return realtimeData
      // Province filter
      .filter(rt => {
        if (!targetProv) return true;
        const device = deviceById.get(rt.device_id_unik);
        return device ? device.provinsi === targetProv : false;
      })
      // Date range filter
      .filter(rt => {
        if (!filters.startDate && !filters.endDate) return true;
        const dataDate = rt.timestamp_data.split(' ')[0]; // Extract YYYY-MM-DD
        const matchesStart = !filters.startDate || dataDate >= filters.startDate;
        const matchesEnd = !filters.endDate || dataDate <= filters.endDate;
        return matchesStart && matchesEnd;
      })
      // Enrich with device data
      .map(rt => {
        const device = deviceById.get(rt.device_id_unik);
        return {
          ...rt,
          device: device,
          location: device ? `${device.kota}, ${device.provinsi}` : 'Unknown'
        };
      });
  }, [realtimeData, devices, filters.startDate, filters.endDate, enforcedProvinsi, filters.provinsi]);

  // Reset to first page when base table data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tableData]);

  // Apply local filters from context (memoized to only recompute when filters change)
  const filteredData = useMemo(() => {
    // Early exit if no base data
    if (!tableData || tableData.length === 0) return [];

    return tableData.filter(row => {
      // Filter by kabupaten (city)
      if (filters.kabupaten && row.device?.kabupaten !== filters.kabupaten) {
        return false;
      }

      // Filter by kecamatan
      if (filters.kecamatan && row.device?.kota !== filters.kecamatan) {
        return false;
      }

      // Filter by desa
      if (filters.desa && !(row.device?.alamat?.toLowerCase().includes(filters.desa.toLowerCase()))) {
        return false;
      }

      // Filter by company type
      if (filters.jenis_perusahaan && row.device?.id_perusahaan.toString() !== filters.jenis_perusahaan) {
        return false;
      }

      // Apply search filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesId = row.device_id_unik.toLowerCase().includes(searchLower);
        const matchesLocation = row.location.toLowerCase().includes(searchLower);
        const matchesKota = row.device?.kota?.toLowerCase().includes(searchLower);
        const matchesProvinsi = row.device?.provinsi?.toLowerCase().includes(searchLower);
        const matchesAlamat = row.device?.alamat?.toLowerCase().includes(searchLower);
        
        if (!(matchesId || matchesLocation || matchesKota || matchesProvinsi || matchesAlamat)) {
          return false;
        }
      }

      return true;
    });
  }, [tableData, filters.kabupaten, filters.kecamatan, filters.desa, filters.jenis_perusahaan, filters.searchText]);

  // Paginate table data (memoized to avoid unnecessary slice operations)
  const paginatedData = useMemo(() => {
    return filteredData.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredData, currentPage, pageSize]);

  // Calculate total pages (memoized)
  const totalPages = useMemo(() => {
    return Math.ceil(filteredData.length / pageSize);
  }, [filteredData.length, pageSize]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoized export handlers to prevent unnecessary function recreation
  const exportToCSV = useCallback(() => {
    if (filteredData.length === 0) return;

    const headers = ['Timestamp', 'Device ID', 'Location', 'TMAT (m)', 'Temperature (°C)', 'pH'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.timestamp_data,
        row.device_id_unik,
        row.location,
        row.tmat_value,
        row.suhu_value,
        row.ph_value
      ].map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `raw-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [filteredData]);

  // Export to PDF
  const exportToPDF = useCallback(() => {
    if (filteredData.length === 0) return;

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Add title
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Raw Data Export', margin, 15);

    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 22);

    // Add filter info if applied
    let filterY = 28;
    if (filters.provinsi || filters.kabupaten || filters.kecamatan || filters.desa || filters.jenis_perusahaan || filters.searchText || filters.startDate || filters.endDate) {
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      const filterInfo = [
        filters.provinsi ? `Province: ${filters.provinsi}` : null,
        filters.kabupaten ? `Regency: ${filters.kabupaten}` : null,
        filters.kecamatan ? `District: ${filters.kecamatan}` : null,
        filters.desa ? `Village: ${filters.desa}` : null,
        filters.jenis_perusahaan ? `Type: ${filters.jenis_perusahaan}` : null,
        filters.searchText ? `Search: ${filters.searchText}` : null,
        filters.startDate ? `From: ${filters.startDate}` : null,
        filters.endDate ? `To: ${filters.endDate}` : null
      ].filter(Boolean).join(' | ');
      doc.text(`Filters: ${filterInfo}`, margin, filterY);
      filterY += 6;
    }

    // Prepare table data
    const headers = [['Timestamp', 'Device ID', 'Location', 'TMAT (m)', 'Temperature (°C)', 'pH']];
    const rows = filteredData.map(row => [
      row.timestamp_data,
      row.device_id_unik,
      row.location,
      row.tmat_value.toString(),
      row.suhu_value.toString(),
      row.ph_value.toString()
    ]);

    // Add table
    autoTable(doc, {
      head: headers,
      body: rows,
      startY: filterY + 2,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 45 },
        1: { halign: 'left', cellWidth: 35 },
        2: { halign: 'left', cellWidth: 40 }
      }
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${i} of ${pageCount} | Raw Data Export`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    doc.save(`raw-data-${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportMenu(false);
  }, [filteredData, filters]);

  // Export to Excel
  const exportToExcel = useCallback(() => {
    if (filteredData.length === 0) return;

    const excelData = filteredData.map(row => ({
      'Timestamp': row.timestamp_data,
      'Device ID': row.device_id_unik,
      'Location': row.location,
      'TMAT (m)': row.tmat_value,
      'Temperature (°C)': row.suhu_value,
      'pH': row.ph_value
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Timestamp
      { wch: 18 }, // Device ID
      { wch: 25 }, // Location
      { wch: 15 }, // TMAT
      { wch: 18 }, // Temperature
      { wch: 12 }, // pH
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Data');
    XLSX.writeFile(workbook, `raw-data-${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  }, [filteredData]);

  // Handle loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
          <p className="mt-4 text-slate-600">Loading raw data...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-bold text-red-800 mb-2">Error loading data</h3>
          <p className="text-red-600 mb-4">{error.message}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">{t('tables:rawData.title')}</h2>
          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition"
            >
              <Download size={16} />
              {t('common:buttons.exportCsv')}
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                <button
                  onClick={exportToCSV}
                  disabled={filteredData.length === 0}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileText size={16} className="text-blue-500" />
                  Export CSV
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={filteredData.length === 0}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileText size={16} className="text-red-500" />
                  Export PDF
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={filteredData.length === 0}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileSpreadsheet size={16} className="text-green-600" />
                  Export Excel
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Filter Section */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-2 rounded-lg transition"
          >
            <Filter size={18} />
            {t('common:buttons.filter', 'Filters')}
            {(filters.provinsi || filters.kabupaten || filters.kecamatan || filters.desa || filters.jenis_perusahaan || filters.searchText) && (
              <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold">
                {[filters.provinsi, filters.kabupaten, filters.kecamatan, filters.desa, filters.jenis_perusahaan, filters.searchText].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Advanced Filter Panel Modal */}
        <AdvancedFilterPanel isOpen={filterOpen} onClose={() => setFilterOpen(false)} />
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-3">{t('tables:rawData.headers.timestamp')}</th>
                <th className="px-6 py-3">{t('tables:rawData.headers.deviceId')}</th>
                <th className="px-6 py-3">{t('tables:rawData.headers.location')}</th>
                <th className="px-6 py-3 text-right">{t('tables:rawData.headers.tmat')}</th>
                <th className="px-6 py-3 text-right">{t('tables:rawData.headers.temperature')}</th>
                <th className="px-6 py-3 text-right">{t('tables:rawData.headers.ph')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <TableRow key={row.id} row={row} t={t} />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            Showing {paginatedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} records
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-slate-600">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RawData;

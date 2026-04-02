import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, FileSpreadsheet, ChevronDown, Filter, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useRealtimeAll, useDevices, usePerusahaan, useHistoricalDataAllChunks } from '../services/useApi';
import { useFilters } from '../context/FilterContext';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import AdvancedFilterPanel from '../components/AdvancedFilterPanel';

// Memoized table row component to prevent unnecessary re-renders
interface TableRowProps {
  row: any;
  t: any;
}

const formatMetric = (value: unknown, digits: number, suffix = ''): string => {
  const num = Number(value);
  return Number.isFinite(num) ? `${num.toFixed(digits)}${suffix}` : '—';
};

const TableRow = memo(({ row, t }: TableRowProps) => (
  <tr className="hover:bg-slate-50 transition-colors">
    <td className="px-6 py-3 font-medium">{row.timestamp_data}</td>
    <td className="px-6 py-3 text-emerald-700">{row.device_id_unik}</td>
    <td className="px-6 py-3">{row.location}</td>
    <td className={`px-6 py-3 text-right font-bold ${row.tmat_value < -0.4 ? 'text-red-600' : 'text-slate-700'}`}>
      {formatMetric(row.tmat_value, 2, ' cm')}
    </td>
    <td className="px-6 py-3 text-right">{formatMetric(row.suhu_value, 1, '°C')}</td>
    <td className="px-6 py-3 text-right">{formatMetric(row.curah_hujan, 1, ' mm')}</td>
    <td className="px-6 py-3 text-right">{formatMetric(row.kelembapan, 1, '%')}</td>
  </tr>
));

const RawData: React.FC = () => {
  const { t } = useTranslation();
  const { filters, enforcedProvinsi, updateFilter } = useFilters();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const visibleFilterTabs = useMemo(() => {
    if (user?.role === 'perusahaan') return ['date'] as const;
    if (user?.role === 'pemda') return ['location', 'date'] as const;
    return ['location', 'date', 'search'] as const;
  }, [user?.role]);
  
  // Fetch realtime snapshot (latest data)
  const {
    data: realtimeData,
    loading: realtimeLoading,
    error: realtimeError,
    refetch,
  } = useRealtimeAll(user?.perusahaanId || undefined);
  
  // Fetch device and company master data
  const {
    data: devices,
    loading: devicesLoading,
    error: devicesError,
  } = useDevices(user?.perusahaanId || undefined);
  const {
    data: companies,
    loading: companiesLoading,
    error: companiesError,
  } = usePerusahaan(user?.perusahaanId || undefined);

  // Determine if we should use historical mode
  const isHistoricalMode = !!(filters.startDate && filters.endDate);

  // Filter devices before fetching historical data
  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    
    let filtered = devices;
    
    // Company user filter: only show devices owned by user's company
    if (user?.role === 'perusahaan' && user?.perusahaanId) {
      filtered = filtered.filter(device => device.id_perusahaan === user.perusahaanId);
    }
    
    const targetProv = enforcedProvinsi || filters.provinsi;
    
    return filtered.filter(device => {
      // Province filter
      if (targetProv && device.provinsi_id !== targetProv) {
        return false;
      }
      
      // Kabupaten filter
      if (filters.kabupaten && device.kabupaten_id !== filters.kabupaten) {
        return false;
      }
      
      // Kecamatan filter
      if (filters.kecamatan && device.kecamatan_id !== filters.kecamatan) {
        return false;
      }
      
      return true;
    });
  }, [devices, enforcedProvinsi, filters.provinsi, filters.kabupaten, filters.kecamatan, user]);

  // Fetch historical data for all chunks (sequential)
  const historicalData = useHistoricalDataAllChunks(
    filteredDevices,
    filters.startDate || '',
    filters.endDate || '',
    user?.perusahaanId,
    isHistoricalMode
  );
  
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const lastAppliedRoleRef = useRef<string | undefined>(undefined);
  const pageSize = 50;

  useEffect(() => {
    if (lastAppliedRoleRef.current === user?.role) {
      return;
    }
    lastAppliedRoleRef.current = user?.role;

    if (user?.role === 'perusahaan') {
      updateFilter('provinsi', '');
      updateFilter('kabupaten', '');
      updateFilter('kecamatan', '');
      updateFilter('desa', '');
      updateFilter('jenis_perusahaan', '');
      updateFilter('searchText', '');
      return;
    }

    if (user?.role === 'pemda') {
      updateFilter('searchText', '');
    }
  }, [user?.role]);

  // Manual refresh function to invalidate cache
  const handleRefresh = useCallback(() => {
    if (isHistoricalMode) {
      // Invalidate all historical chunk queries
      queryClient.invalidateQueries({ queryKey: ['historical-chunk'] });
    } else {
      // Refresh realtime data
      refetch();
    }
  }, [isHistoricalMode, queryClient, refetch]);

  const extractDatePart = (timestamp: unknown): string | null => {
    if (typeof timestamp !== 'string') return null;
    const value = timestamp.trim();
    if (!value) return null;
    if (value.includes(' ')) return value.split(' ')[0] || null;
    if (value.includes('T')) return value.split('T')[0] || null;
    return value.length >= 10 ? value.slice(0, 10) : null;
  };

  const toDayEpoch = (value: string): number | null => {
    const parsed = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  };

  const pickText = (record: Record<string, unknown>, keys: string[]): string => {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null) {
        const normalized = String(value).trim();
        if (normalized) return normalized;
      }
    }
    return '';
  };

  const companyTypeById = useMemo(() => {
    const map = new Map<number, string>();
    (companies || []).forEach((company) => {
      map.set(company.id, company.jenis_perusahaan);
    });
    return map;
  }, [companies]);

  // Prepare table data: Join realtime/historical with device info (memoized for performance)
  const tableData = useMemo(() => {
    // Choose data source based on mode
    const sourceData = isHistoricalMode ? historicalData.data : (realtimeData || []);
    
    if (!sourceData || sourceData.length === 0) return [];

    // Create device lookup map for O(1) lookups instead of O(n) array searches
    const normalizeDeviceKey = (value: unknown) =>
      String(value || '').trim().toUpperCase();
    const deviceById = new Map(
      (devices || []).map(d => [normalizeDeviceKey(d.device_id_unik), d])
    );

    // Province gate: drop records outside enforced or selected province
    const targetProv = enforcedProvinsi || filters.provinsi;
    
    return sourceData
      // Province filter (only for realtime mode - historical already filtered via devices)
      .filter(rt => {
        if (isHistoricalMode) return true; // Already filtered by device selection
        if (!targetProv) return true;
        const device = deviceById.get(normalizeDeviceKey(rt.device_id_unik));
        const rtRaw = rt as unknown as Record<string, unknown>;
        const realtimeProvinsi = pickText(rtRaw, ['provinsi', 'province', 'nama_provinsi', 'provinsi_id']);
        return device
          ? String(device.provinsi_id || '') === String(targetProv)
          : realtimeProvinsi === targetProv;
      })
      // Date range filter (only for realtime mode - historical fetch already handles this)
      .filter(rt => {
        if (isHistoricalMode) return true; // Historical data already filtered by date range
        if (!filters.startDate && !filters.endDate) return true;
        const dataDate = extractDatePart(rt.timestamp_data);
        if (!dataDate) return true;

        const dataEpoch = toDayEpoch(dataDate);
        const startEpoch = filters.startDate ? toDayEpoch(filters.startDate) : null;
        const endEpoch = filters.endDate ? toDayEpoch(filters.endDate) : null;

        if (dataEpoch === null) return true;

        const matchesStart = startEpoch === null || dataEpoch >= startEpoch;
        const matchesEnd = endEpoch === null || dataEpoch <= endEpoch;
        return matchesStart && matchesEnd;
      })
      // Enrich with device data
      .map(rt => {
        const device = deviceById.get(normalizeDeviceKey(rt.device_id_unik));
        const rtRaw = rt as unknown as Record<string, unknown>;
        const realtimeProvinsi = pickText(rtRaw, ['provinsi', 'province', 'nama_provinsi', 'provinsi_id']);
        const realtimeKabupaten = pickText(rtRaw, ['kabupaten', 'regency', 'nama_kabupaten', 'kabupaten_id']);
        const realtimeKecamatan = pickText(rtRaw, ['kecamatan', 'district', 'nama_kecamatan', 'kecamatan_id', 'kota', 'city']);
        const realtimeDesa = pickText(rtRaw, ['desa', 'kelurahan', 'village', 'village_name', 'kelurahan_id']);
        const resolvedProvinsi = String(device?.provinsi_id || realtimeProvinsi || '-');
        const resolvedKabupaten = String(device?.kabupaten_id || realtimeKabupaten || '-');
        const resolvedKecamatan = String(device?.kecamatan_id || realtimeKecamatan || '-');
        const resolvedDesa = device?.desa || realtimeDesa || '';
        const resolvedAlamat = device?.alamat || pickText(rtRaw, ['alamat', 'address']) || '';
        const resolvedLocation = [resolvedDesa || resolvedKecamatan, resolvedKabupaten, resolvedProvinsi]
          .filter(Boolean)
          .join(', ');

        return {
          ...rt,
          device: device,
          resolvedProvinsi,
          resolvedKabupaten,
          resolvedKecamatan,
          resolvedDesa,
          resolvedAlamat,
          location: resolvedLocation,
        };
      });
  }, [isHistoricalMode, historicalData.data, realtimeData, devices, filters.startDate, filters.endDate, enforcedProvinsi, filters.provinsi]);

  // Reset to first page when base table data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tableData]);

  // Apply local filters from context (memoized to only recompute when filters change)
  const filteredData = useMemo(() => {
    // Early exit if no base data
    if (!tableData || tableData.length === 0) return [];

    return tableData.filter(row => {
      // Company user filter: only show data from user's company devices (defense-in-depth)
      if (user?.role === 'perusahaan' && user?.perusahaanId) {
        if (row.device?.id_perusahaan !== user.perusahaanId) {
          return false;
        }
      }

      // Filter by kabupaten (city)
      if (filters.kabupaten && row.resolvedKabupaten !== filters.kabupaten) {
        return false;
      }

      // Filter by kecamatan
      if (filters.kecamatan && row.resolvedKecamatan !== filters.kecamatan) {
        return false;
      }

      // Filter by desa
      if (
        filters.desa &&
        !(
          row.resolvedDesa?.toLowerCase().includes(filters.desa.toLowerCase()) ||
          row.resolvedAlamat?.toLowerCase().includes(filters.desa.toLowerCase())
        )
      ) {
        return false;
      }

      // Filter by company type
      if (filters.jenis_perusahaan) {
        if (companyTypeById.size === 0) {
          // Company master not ready yet; don't drop all rows.
          return true;
        }
        const companyType = row.device?.id_perusahaan
          ? companyTypeById.get(Number(row.device.id_perusahaan))
          : undefined;
        if (!companyType || companyType !== filters.jenis_perusahaan) {
          return false;
        }
      }

      // Apply search filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesId = row.device_id_unik.toLowerCase().includes(searchLower);
        const matchesLocation = row.location.toLowerCase().includes(searchLower);
        const matchesKota = row.resolvedKecamatan?.toLowerCase().includes(searchLower);
        const matchesProvinsi = row.resolvedProvinsi?.toLowerCase().includes(searchLower);
        const matchesAlamat = row.resolvedAlamat?.toLowerCase().includes(searchLower);
        
        if (!(matchesId || matchesLocation || matchesKota || matchesProvinsi || matchesAlamat)) {
          return false;
        }
      }

      return true;
    });
  }, [tableData, filters.kabupaten, filters.kecamatan, filters.desa, filters.jenis_perusahaan, filters.searchText, companyTypeById, user]);

  // Display limit: max 10,000 rows in table (full data available via export)
  const MAX_DISPLAY_ROWS = 10000;
  const displayData = useMemo(() => {
    return filteredData.slice(0, MAX_DISPLAY_ROWS);
  }, [filteredData]);

  const isDataLimited = filteredData.length > MAX_DISPLAY_ROWS;

  // Paginate table data (memoized to avoid unnecessary slice operations)
  const paginatedData = useMemo(() => {
    return displayData.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [displayData, currentPage, pageSize]);

  // Calculate total pages (memoized) - based on display data, not full filtered data
  const totalPages = useMemo(() => {
    return Math.ceil(displayData.length / pageSize);
  }, [displayData.length, pageSize]);

  useEffect(() => {
    const sampleDates = (realtimeData || []).slice(0, 5).map((r) => r.timestamp_data);
    console.log('[RawData] data pipeline', {
      realtimeRows: realtimeData?.length || 0,
      devices: devices?.length || 0,
      companies: companies?.length || 0,
      tableData: tableData.length,
      filteredData: filteredData.length,
      sampleRealtimeDates: sampleDates,
      activeFilters: {
        provinsi: filters.provinsi,
        kabupaten: filters.kabupaten,
        kecamatan: filters.kecamatan,
        desa: filters.desa,
        jenis_perusahaan: filters.jenis_perusahaan,
        searchText: filters.searchText,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
  }, [realtimeData, devices, companies, tableData.length, filteredData.length, filters]);

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

    const headers = ['Timestamp', 'Device ID', 'Location', 'TMAT (cm)', 'Temperature (°C)', 'Curah Hujan (mm)', 'Kelembapan (%)'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.timestamp_data,
        row.device_id_unik,
        row.location,
        formatMetric(row.tmat_value, 2, ' cm'),
        formatMetric(row.suhu_value, 1, '°C'),
        formatMetric(row.curah_hujan, 1, ' mm'),
        formatMetric(row.kelembapan, 1, '%')
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
    const headers = [['Timestamp', 'Device ID', 'Location', 'TMAT (cm)', 'Temperature (°C)', 'Curah Hujan (mm)', 'Kelembapan (%)']];
    const rows = filteredData.map(row => [
      row.timestamp_data,
      row.device_id_unik,
      row.location,
      formatMetric(row.tmat_value, 2, ' cm'),
      formatMetric(row.suhu_value, 1, '°C'),
      formatMetric(row.curah_hujan, 1, ' mm'),
      formatMetric(row.kelembapan, 1, '%')
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
      'TMAT (cm)': formatMetric(row.tmat_value, 2, ' cm'),
      'Temperature (°C)': formatMetric(row.suhu_value, 1, '°C'),
      'Curah Hujan (mm)': formatMetric(row.curah_hujan, 1, ' mm'),
      'Kelembapan (%)': formatMetric(row.kelembapan, 1, '%')
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
      { wch: 18 }, // Rainfall
      { wch: 15 }, // Humidity
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Data');
    XLSX.writeFile(workbook, `raw-data-${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  }, [filteredData]);

  const loading = isHistoricalMode ? historicalData.isLoading : realtimeLoading;
  const error = isHistoricalMode ? historicalData.error : realtimeError;
  const nonFatalWarnings = [devicesError?.message, companiesError?.message].filter(Boolean);

  // Handle loading state
  if (loading && !isHistoricalMode) {
    // Only show full-page loading for realtime mode initial load
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

  // Handle error state (only for critical errors in realtime mode)
  if (error && !isHistoricalMode) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-bold text-red-800 mb-2">Error loading data</h3>
          <p className="text-red-600 mb-4">{error.message}</p>
          <button 
            onClick={handleRefresh}
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
      {nonFatalWarnings.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 mb-1">Sebagian data referensi gagal dimuat</h3>
          <p className="text-sm text-amber-700">
            Telemetri tetap ditampilkan dari endpoint realtime. Detail lokasi/perusahaan mungkin belum lengkap.
          </p>
        </div>
      )}

      {/* Historical Mode Progress Indicator */}
      {isHistoricalMode && historicalData.isLoading && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900">
                Loading chunk {historicalData.chunkProgress.current}/{historicalData.chunkProgress.total}
                {historicalData.currentChunkRange && (
                  <span className="font-normal text-blue-700 ml-2">
                    ({historicalData.currentChunkRange.start} to {historicalData.currentChunkRange.end})
                  </span>
                )}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {historicalData.data.length.toLocaleString()} records loaded so far...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Historical Mode Error (non-blocking) */}
      {isHistoricalMode && historicalData.error && !historicalData.isLoading && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="font-semibold text-orange-800 mb-1">Partial Data Loaded</h3>
          <p className="text-sm text-orange-700">
            Some chunks failed to load. Showing {historicalData.data.length.toLocaleString()} records from successful chunks.
          </p>
        </div>
      )}

      {/* 10K Row Display Limit Warning */}
      {isDataLimited && (
        <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h3 className="font-semibold text-purple-800 mb-1">
            {t('tables:rawData.displayLimit.title', {
              displayed: MAX_DISPLAY_ROWS.toLocaleString(),
              total: filteredData.length.toLocaleString()
            })}
          </h3>
          <p className="text-sm text-purple-700" dangerouslySetInnerHTML={{
            __html: t('tables:rawData.displayLimit.description', {
              limit: MAX_DISPLAY_ROWS.toLocaleString(),
              total: filteredData.length.toLocaleString()
            })
          }} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-800">{t('tables:rawData.title')}</h2>
            
            {/* Data Mode Badge */}
            {isHistoricalMode ? (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                Historical Mode ({historicalData.chunkProgress.total} chunks)
              </span>
            ) : (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                Realtime Snapshot
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Export Menu */}
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
        <AdvancedFilterPanel
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          devices={filteredDevices}
          visibleTabs={[...visibleFilterTabs]}
        />
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-3">{t('tables:rawData.headers.timestamp')}</th>
                <th className="px-6 py-3">{t('tables:rawData.headers.deviceId')}</th>
                <th className="px-6 py-3">{t('tables:rawData.headers.location')}</th>
                <th className="px-6 py-3 text-right">{t('tables:rawData.headers.tmat')}</th>
                <th className="px-6 py-3 text-right">{t('tables:rawData.headers.temperature')}</th>
                <th className="px-6 py-3 text-right">{t('tables:rawData.headers.rainfall', 'Curah Hujan (mm)')}</th>
                <th className="px-6 py-3 text-right">{t('tables:rawData.headers.humidity', 'Kelembapan (%)')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <TableRow key={row.id} row={row} t={t} />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
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
            Showing {paginatedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, displayData.length)} of {displayData.length.toLocaleString()} records
            {isDataLimited && (
              <span className="text-purple-600 font-semibold ml-1">
                (limited from {filteredData.length.toLocaleString()} total)
              </span>
            )}
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

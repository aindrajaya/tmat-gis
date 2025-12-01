import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRealtimeAll, useDevices } from '../services/useApi';
import { useFilters } from '../context/FilterContext';

const RawData: React.FC = () => {
  const { t } = useTranslation();
  const { filters } = useFilters();
  
  // Fetch data from API
  const { data: realtimeData, loading, error, refetch } = useRealtimeAll(undefined);
  const { data: devices } = useDevices();
  
  const [tableData, setTableData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Prepare table data: Join realtime with device info
  useEffect(() => {
    if (!realtimeData || !devices) return;

    let filteredData = realtimeData;

    // Apply date filters if set
    if (filters.startDate || filters.endDate) {
      filteredData = filteredData.filter(rt => {
        const dataDate = rt.timestamp_data.split(' ')[0]; // Extract YYYY-MM-DD
        const matchesStart = !filters.startDate || dataDate >= filters.startDate;
        const matchesEnd = !filters.endDate || dataDate <= filters.endDate;
        return matchesStart && matchesEnd;
      });
    }

    const data = filteredData.map(rt => {
      const device = devices.find(d => d.device_id_unik === rt.device_id_unik);
      return {
        ...rt,
        location: device ? `${device.kota}, ${device.provinsi}` : 'Unknown'
      };
    });

    setTableData(data);
    setCurrentPage(1); // Reset to first page when data changes
  }, [realtimeData, devices, filters.startDate, filters.endDate]);

  // Paginate table data
  const paginatedData = tableData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(tableData.length / pageSize);

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
          <button className="text-sm text-emerald-600 font-medium hover:underline">{t('common:buttons.exportCsv')}</button>
        </div>
        
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
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium">{row.timestamp_data}</td>
                    <td className="px-6 py-3 text-emerald-700">{row.device_id_unik}</td>
                    <td className="px-6 py-3">{row.location}</td>
                    <td className={`px-6 py-3 text-right font-bold ${row.tmat_value < -0.4 ? 'text-red-600' : 'text-slate-700'}`}>
                      {row.tmat_value}
                    </td>
                    <td className="px-6 py-3 text-right">{row.suhu_value}</td>
                    <td className="px-6 py-3 text-right">{row.ph_value}</td>
                  </tr>
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
        
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            Showing {paginatedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, tableData.length)} of {tableData.length} records
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
/**
 * Example Component - API Integration
 * Shows how to use API hooks and handle data fetching
 * 
 * This is a reference example. Adapt as needed for your use case.
 */

import React, { useEffect, useState } from 'react';
import { useDevices, useRealtimeDevice } from '../services/useApi';
import { useFilters } from '../context/FilterContext';
import { useTranslation } from 'react-i18next';

/**
 * Example: Device List with Real API Data
 */
export function DeviceListExample() {
  const { t } = useTranslation();
  const { data: devices, loading, error, refetch } = useDevices();

  useEffect(() => {
    // Fetch devices on component mount
    refetch();
  }, [refetch]);

  if (loading) {
    return <div className="text-center p-4">Loading devices...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <p className="text-red-700 font-semibold">Error loading devices</p>
        <p className="text-red-600 text-sm">{error.message}</p>
        <button 
          onClick={refetch}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{t('forms:registeredDevices.title')}</h2>
      
      {!devices || devices.length === 0 ? (
        <p className="text-slate-500">No devices found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-2">{t('forms:registeredDevices.headers.deviceId')}</th>
                <th className="text-left p-2">{t('forms:registeredDevices.headers.location')}</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-b hover:bg-slate-50">
                  <td className="p-2 font-medium text-emerald-700">{device.device_id_unik}</td>
                  <td className="p-2">{device.kota}, {device.provinsi}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      device.status === 'aktif' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {device.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <p className="text-xs text-slate-500">
        Total devices: {devices?.length || 0}
      </p>
    </div>
  );
}

/**
 * Example: Realtime Data Viewer with Date Range
 */
export function RealtimeDataViewerExample() {
  const { t } = useTranslation();
  const { filters } = useFilters();
  const [selectedDeviceId, setSelectedDeviceId] = useState('DEV-GLJ-001');
  const [pageOffset, setPageOffset] = useState(0);
  const pageLimit = 50;

  const { 
    data: realtimeData, 
    loading, 
    error,
    fetch: fetchData 
  } = useRealtimeDevice(
    selectedDeviceId,
    filters.startDate,
    filters.endDate,
    pageLimit,
    pageOffset
  );

  useEffect(() => {
    // Fetch data when device or date range changes
    if (selectedDeviceId && filters.startDate && filters.endDate) {
      fetchData();
    }
  }, [selectedDeviceId, filters.startDate, filters.endDate, pageOffset, fetchData]);

  if (loading) {
    return <div className="text-center p-4">Loading realtime data...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <p className="text-red-700 font-semibold">Error loading realtime data</p>
        <p className="text-red-600 text-sm">{error.message}</p>
        <button 
          onClick={fetchData}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Device ID</label>
          <select 
            value={selectedDeviceId}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              setPageOffset(0); // Reset to first page
            }}
            className="px-3 py-2 border rounded"
          >
            <option value="DEV-GLJ-001">DEV-GLJ-001</option>
            <option value="DEV-GLJ-002">DEV-GLJ-002</option>
            <option value="DEV-PDG-001">DEV-PDG-001</option>
          </select>
        </div>

        <div>
          <p className="text-sm text-slate-600">
            Date Range: {filters.startDate} to {filters.endDate}
          </p>
        </div>
      </div>

      {!realtimeData || realtimeData.length === 0 ? (
        <p className="text-slate-500">No data found for selected date range</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-2">Timestamp</th>
                <th className="text-right p-2">TMAT (m)</th>
                <th className="text-right p-2">Temp (°C)</th>
                <th className="text-right p-2">pH</th>
              </tr>
            </thead>
            <tbody>
              {realtimeData.map((row) => (
                <tr key={row.id} className="border-b hover:bg-slate-50">
                  <td className="p-2 font-medium text-slate-700">{row.timestamp_data}</td>
                  <td className={`p-2 text-right font-bold ${
                    row.tmat_value < -0.4 ? 'text-red-600' : 'text-slate-700'
                  }`}>
                    {row.tmat_value}
                  </td>
                  <td className="p-2 text-right">{row.suhu_value}</td>
                  <td className="p-2 text-right">{row.ph_value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">
          Showing {realtimeData?.length || 0} records
        </p>
        <div className="flex gap-2">
          <button 
            onClick={() => setPageOffset(Math.max(0, pageOffset - pageLimit))}
            disabled={pageOffset === 0}
            className="px-3 py-1 bg-slate-200 rounded text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button 
            onClick={() => setPageOffset(pageOffset + pageLimit)}
            disabled={!realtimeData || realtimeData.length < pageLimit}
            className="px-3 py-1 bg-slate-200 rounded text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Example: Error Boundary Component
 */
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handler = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  if (hasError) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 m-4">
        <h3 className="text-red-800 font-bold">Something went wrong</h3>
        <p className="text-red-600 text-sm mt-2">{error?.message}</p>
        <button 
          onClick={() => {
            setHasError(false);
            setError(null);
          }}
          className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export default {
  DeviceListExample,
  RealtimeDataViewerExample,
  ErrorBoundary,
};

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardMap from '../components/DashboardMap';
import { useDevices, usePerusahaan, useRealtimeAll } from '../services/useApi';
import { useFilters } from '../context/FilterContext';
import { useAuth } from '../context/AuthContext';

const MapView: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { filters } = useFilters();
  const { data: allDevices, loading: devicesLoading, error: devicesError, refetch } = useDevices(user?.perusahaanId || undefined);
  const { data: allPerusahaan, loading: perusahaanLoading } = usePerusahaan(user?.perusahaanId || undefined);
  const { data: realtimeData, loading: realtimeLoading } = useRealtimeAll(user?.perusahaanId || undefined);

  const normalizeRegionValue = (value?: string | null): string => {
    return (value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const matchesRegionFilter = (filterValue: string, ...candidates: Array<string | null | undefined>): boolean => {
    if (!filterValue) return true;
    const target = normalizeRegionValue(filterValue);
    return candidates.some((candidate) => normalizeRegionValue(candidate || '') === target);
  };

  // Apply filters to device list
  const filteredDevices = useMemo(() => {
    if (!allDevices) return [];

    let filtered = allDevices;
    if (filters.provinsi) {
      filtered = filtered.filter((d) =>
        matchesRegionFilter(filters.provinsi, d.provinsi_nama, d.provinsi_id, (d as any).provinsi)
      );
    }
    if (filters.kabupaten) {
      filtered = filtered.filter((d) =>
        matchesRegionFilter(filters.kabupaten, d.kabupaten_nama, d.kabupaten_id, (d as any).kabupaten)
      );
    }
    if (filters.jenis_perusahaan && allPerusahaan) {
      const companyIds = allPerusahaan
        .filter((p) => p.jenis_perusahaan === filters.jenis_perusahaan)
        .map((p) => p.id);
      filtered = filtered.filter((d) => companyIds.includes(d.id_perusahaan));
    }
    return filtered;
  }, [allDevices, allPerusahaan, filters]);

  // Critical TMAT count based on unique devices
  const criticalCount = useMemo(() => {
    if (!realtimeData || filteredDevices.length === 0) return 0;
    const deviceIds = filteredDevices.map(d => d.device_id_unik);
    const criticalDevices = new Set<string>();
    
    realtimeData.forEach(r => {
      if (deviceIds.includes(r.device_id_unik) && r.tmat_value < -0.4) {
        criticalDevices.add(r.device_id_unik);
      }
    });
    
    return criticalDevices.size;
  }, [realtimeData, filteredDevices]);

  const loading = devicesLoading || perusahaanLoading || realtimeLoading;
  const error = devicesError;

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
          <p className="mt-4 text-slate-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-bold text-red-800 mb-2">Error loading map</h3>
          <p className="text-red-600">
            {error.message}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Map</h1>
          <p className="text-sm text-slate-500">Map-only view with filters, stats, and legend inside the map.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"
        >
          Refresh devices
        </button>
      </div>

      {/* Location Filter Display */}
      {(filters.provinsi || filters.kabupaten) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
          <p className="text-sm text-blue-700 font-medium">
            {t('dashboard:metrics.filteredLocation')}: {filters.provinsi}{filters.kabupaten ? ` > ${filters.kabupaten}` : ''}
          </p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">{t('dashboard:metrics.totalStations')}</p>
          <p className="text-2xl font-bold text-slate-800">{filteredDevices.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">{t('dashboard:metrics.active')}</p>
          <p className="text-2xl font-bold text-emerald-600">
            {filteredDevices.filter(d => d.status === 'aktif').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">{t('dashboard:metrics.criticalLowTmat')}</p>
          <p className="text-2xl font-bold text-rose-600">{criticalCount}</p>
        </div>
      </div>

      <div className="h-[calc(100vh-350px)]">
        <DashboardMap
          devices={filteredDevices}
          realtimeData={realtimeData}
          realtimeLoading={realtimeLoading}
        />
      </div>
    </div>
  );
};

export default MapView;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import DashboardMap from '../components/DashboardMap';
import ChartContainer from '../components/charts/ChartContainer';
import { useHistoricalDataAllChunks, usePublicMapDevices, usePublicMapSummary } from '../services/useApi';
import { PublicMapDeviceFilters } from '../services/apiClient';
import { useFilters } from '../context/FilterContext';
import { Device } from '../types';
import { buildTmatChartSeries } from '../utils/tmatChartAggregation';

const normalizeRegionValue = (value?: string | null): string => {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const FullMap: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { filters, updateFilter } = useFilters();
  const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');
  const publicFilterInitializedRef = useRef(false);

  const getSelectedCityValue = (device: Device): string => {
    return (
      (typeof device.desa === 'string' && device.desa.trim()) ||
      (typeof device.kabupaten_id === 'string' && device.kabupaten_id.trim()) ||
      (typeof device.provinsi_id === 'string' && device.provinsi_id.trim()) ||
      ''
    );
  };

  const isPublicMapRoute = typeof window !== 'undefined' && (
    window.location.hash === '#/map' ||
    window.location.hash.startsWith('#/map?') ||
    window.location.hash.startsWith('#/map/')
  );

  const mapScopeFromQuery = useMemo((): Pick<PublicMapDeviceFilters, 'email' | 'role'> | null => {
    const hashQuery = typeof window !== 'undefined' ? window.location.hash.split('?')[1] || '' : '';
    const queryInput = location.search || hashQuery;
    const query = new URLSearchParams(queryInput.startsWith('?') ? queryInput : '?' + queryInput);
    const email = (query.get('email') || '').trim();
    const roleParam = (query.get('role') || '').trim().toLowerCase();

    if (!email || !roleParam) {
      return null;
    }

    if (roleParam !== 'admin' && roleParam !== 'perusahaan' && roleParam !== 'pemda') {
      return null;
    }

    return { email, role: roleParam };
  }, [location.search]);

  const publicLocationFilters = useMemo((): PublicMapDeviceFilters | null => {
    if (!mapScopeFromQuery) {
      return null;
    }

    return {
      ...mapScopeFromQuery,
      provinsi: filters.provinsi || '',
      kabupaten: filters.kabupaten || '',
      kecamatan: filters.kecamatan || '',
      desa: filters.desa || '',
      jenis_perusahaan: filters.jenis_perusahaan || '',
    };
  }, [mapScopeFromQuery, filters.provinsi, filters.kabupaten, filters.kecamatan, filters.desa, filters.jenis_perusahaan]);

  const {
    data: publicSummary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = usePublicMapSummary();
  const {
    data: publicDevices,
    loading: devicesLoading,
    error: devicesError,
    refetch: refetchDevices,
  } = usePublicMapDevices(publicLocationFilters);

  useEffect(() => {
    if (!isPublicMapRoute || publicFilterInitializedRef.current) {
      return;
    }

    publicFilterInitializedRef.current = true;

    if (filters.selectedCity) {
      updateFilter('selectedCity', null);
    }
  }, [isPublicMapRoute, filters.selectedCity, updateFilter]);

  const filteredDevices = useMemo(() => {
    if (!publicDevices) return [];

    const selectedCityValue = normalizeRegionValue(filters.selectedCity);

    const visibleDevices = !selectedCityValue
      ? publicDevices
      : publicDevices.filter((device) => {
          const deviceCity = normalizeRegionValue(device.desa);
          const deviceKabupaten = normalizeRegionValue(device.kabupaten_nama || device.kabupaten_id);
          const deviceProvinsi = normalizeRegionValue(device.provinsi_nama || device.provinsi_id);

          return (
            deviceCity === selectedCityValue ||
            deviceKabupaten === selectedCityValue ||
            deviceProvinsi === selectedCityValue
          );
        });

    return visibleDevices.map((device, index) => ({
      id: index + 1,
      device_id_unik: device.device_id_unik,
      id_perusahaan: device.id_perusahaan || 0,
      tipe_alat: device.tipe_alat || '',
      alamat: device.desa || null,
      provinsi_id: device.provinsi_id || null,
      kabupaten_id: device.kabupaten_id || null,
      kecamatan_id: device.kecamatan_id || null,
      desa: device.desa || null,
      latitude: Number(device.latitude),
      longitude: Number(device.longitude),
      status: device.status,
      last_online: device.latest_realtime?.timestamp_data || null,
      created_at: device.latest_realtime?.timestamp_data || new Date().toISOString(),
      kode_titik: device.kode_titik || undefined,
      kode_blok: '',
      provinsi_nama: device.provinsi_nama || null,
      kabupaten_nama: device.kabupaten_nama || null,
      kecamatan_nama: device.kecamatan_nama || null,
    }));
  }, [publicDevices, filters.selectedCity]);

  const latestRealtimeData = useMemo(() => {
    if (!publicDevices) return [];

    const selectedCityValue = normalizeRegionValue(filters.selectedCity);
    const visibleDevices = !selectedCityValue
      ? publicDevices
      : publicDevices.filter((device) => {
          const deviceCity = normalizeRegionValue(device.desa);
          const deviceKabupaten = normalizeRegionValue(device.kabupaten_nama || device.kabupaten_id);
          const deviceProvinsi = normalizeRegionValue(device.provinsi_nama || device.provinsi_id);

          return (
            deviceCity === selectedCityValue ||
            deviceKabupaten === selectedCityValue ||
            deviceProvinsi === selectedCityValue
          );
        });

    return visibleDevices
      .filter((device) => !!device.latest_realtime?.timestamp_data)
      .map((device, index) => ({
        id: index + 1,
        device_id_unik: device.device_id_unik,
        timestamp_data: device.latest_realtime.timestamp_data || '',
        tmat_value: device.latest_realtime.tmat_value ?? Number.NaN,
        suhu_value: device.latest_realtime.suhu_value ?? Number.NaN,
        ph_value: Number.NaN,
        curah_hujan: device.latest_realtime.curah_hujan ?? Number.NaN,
        kelembapan: device.latest_realtime.kelembapan ?? Number.NaN,
      }));
  }, [publicDevices, filters.selectedCity]);

  const historicalData = useHistoricalDataAllChunks(
    filteredDevices,
    filters.startDate || '',
    filters.endDate || '',
    undefined,
    filteredDevices.length > 0 && !!filters.startDate && !!filters.endDate
  );

  // DEBUG: Log data flow
  useEffect(() => {
    console.log('[FullMap] Public Devices:', {
      count: publicDevices?.length || 0,
      aktifCount: publicDevices?.filter(d => d.status === 'aktif').length || 0,
      sample: publicDevices?.[0],
    });
  }, [publicDevices]);

  useEffect(() => {
    console.log('[FullMap] Filtered Devices:', {
      count: filteredDevices.length,
      sample: filteredDevices[0],
    });
  }, [filteredDevices]);

  useEffect(() => {
    console.log('[FullMap] Historical Data:', {
      recordCount: historicalData.data?.length || 0,
      isLoading: historicalData.isLoading,
      error: historicalData.error?.message,
      sample: historicalData.data?.[0],
      dateRange: `${filters.startDate} to ${filters.endDate}`,
    });
  }, [historicalData.data, historicalData.isLoading, historicalData.error, filters.startDate, filters.endDate]);

  const chartData = useMemo(() => {
    const result = buildTmatChartSeries(
      historicalData.data,
      filteredDevices,
      filters.startDate,
      filters.endDate,
      filters.selectedCity
    );
    console.log('[FullMap] Chart Data Result:', {
      daily: result.daily.length,
      weekly: result.weekly.length,
      trend: result.trend.length,
      dailySample: result.daily?.[0],
    });
    return result;
  }, [filters.endDate, filters.selectedCity, filters.startDate, filteredDevices, historicalData.data]);

  useEffect(() => {
    if (!filters.selectedCity || filteredDevices.length === 0) {
      return;
    }

    const hasMatchingCity = filteredDevices.some((device) => getSelectedCityValue(device) === filters.selectedCity);
    if (!hasMatchingCity) {
      updateFilter('selectedCity', null);
    }
  }, [filteredDevices, filters.selectedCity, updateFilter]);

  const criticalCount = useMemo(() => {
    if (!latestRealtimeData.length || !filteredDevices.length) {
      return publicSummary?.critical_devices || 0;
    }

    const deviceIds = new Set(filteredDevices.map((device) => device.device_id_unik));
    return latestRealtimeData.reduce((count, item) => {
      if (!deviceIds.has(item.device_id_unik)) return count;
      return Number.isFinite(item.tmat_value) && item.tmat_value <= -80 ? count + 1 : count;
    }, 0);
  }, [filteredDevices, latestRealtimeData, publicSummary?.critical_devices]);

  const isLoading = summaryLoading || devicesLoading || historicalData.isLoading;
  const hasError = summaryError || devicesError || historicalData.error;

  if (!mapScopeFromQuery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-amber-200 rounded-xl p-6 shadow-sm space-y-2 max-w-lg">
          <h3 className="font-bold text-amber-800">Parameter map tidak valid</h3>
          <p className="text-amber-700">
            Gunakan format URL `#/map?email=user@email.com&role=admin|perusahaan|pemda`.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
          <p className="text-slate-600">Loading map and analytics...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm space-y-3 max-w-md">
          <h3 className="font-bold text-red-800">Error loading data</h3>
          <p className="text-red-600">
            {summaryError?.message || devicesError?.message || historicalData.error?.message}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                refetchSummary();
                refetchDevices();
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">{t('dashboard:map.stationDistribution')}</h1>
          <p className="text-sm text-slate-600">
            {t('dashboard:charts.analyticsTitle')} · {t('dashboard:metrics.totalStations')}
          </p>
        </div>

        {(filters.provinsi || filters.kabupaten) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <p className="text-sm text-blue-700 font-medium">
              {t('dashboard:metrics.filteredLocation')}: {filters.provinsi}{filters.kabupaten ? ` > ${filters.kabupaten}` : ''}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">{t('dashboard:metrics.totalStations')}</p>
            <p className="text-2xl font-bold text-slate-800">{filteredDevices.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">{t('dashboard:metrics.active')}</p>
            <p className="text-2xl font-bold text-emerald-600">
              {filteredDevices.filter((d) => d.status === 'aktif').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">{t('dashboard:metrics.criticalLowTmat')}</p>
            <p className="text-2xl font-bold text-rose-600">{criticalCount}</p>
          </div>
        </div>

        {filters.selectedCity && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-600 font-semibold mb-1">
              {t('dashboard:analytics.viewingLocation') || 'Viewing Location'}
            </p>
            <p className="text-lg font-bold text-emerald-700">
              {filters.selectedCity}
            </p>
          </div>
        )}

        <section className="space-y-3">
          <DashboardMap
            devices={filteredDevices}
            heightClass="h-[70vh]"
            realtimeData={latestRealtimeData}
            realtimeLoading={devicesLoading}
          />
        </section>

        <ChartContainer
          chartView={chartView}
          setChartView={setChartView}
          dailyData={chartData.daily}
          weeklyData={chartData.weekly}
          trendData={chartData.trend}
          isLoading={historicalData.isLoading}
          selectedCity={filters.selectedCity || undefined}
        />
      </div>
    </div>
  );
};

export default FullMap;
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardMap from '../components/DashboardMap';
import ChartContainer from '../components/charts/ChartContainer';
import { usePublicMapAnalytics, usePublicMapDevices, usePublicMapSummary } from '../services/useApi';
import { useFilters } from '../context/FilterContext';
import { Device } from '../types';

// Helper to create readable week labels
const formatWeekLabel = (startDate: string): string => {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(startDate + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-CA')} - ${end.toLocaleDateString('en-CA')}`;
};

const FullMap: React.FC = () => {
  const { t } = useTranslation();
  const { filters, updateFilter, setTimePeriod } = useFilters();
  const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');
  const publicDateInitializedRef = useRef(false);
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

  const publicLocationFilters = useMemo(() => ({
    provinsi: filters.provinsi || '',
    kabupaten: filters.kabupaten || '',
    kecamatan: filters.kecamatan || '',
    desa: filters.desa || '',
    jenis_perusahaan: filters.jenis_perusahaan || '',
  }), [filters.provinsi, filters.kabupaten, filters.kecamatan, filters.desa, filters.jenis_perusahaan]);

  const publicAnalyticsFilters = useMemo(() => ({
    ...publicLocationFilters,
    start_date: filters.startDate || '',
    end_date: filters.endDate || '',
  }), [publicLocationFilters, filters.startDate, filters.endDate]);

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
  const {
    data: publicAnalytics,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = usePublicMapAnalytics(publicAnalyticsFilters);

  useEffect(() => {
    if (!isPublicMapRoute || publicFilterInitializedRef.current) {
      return;
    }

    publicFilterInitializedRef.current = true;

    if (filters.selectedCity) {
      updateFilter('selectedCity', null);
    }
  }, [isPublicMapRoute, filters.selectedCity, updateFilter]);

  useEffect(() => {
    if (!isPublicMapRoute || publicDateInitializedRef.current || !publicSummary) {
      return;
    }

    if (!publicSummary.default_start_date || !publicSummary.default_end_date) {
      return;
    }

    publicDateInitializedRef.current = true;
    setTimePeriod('custom');
    updateFilter('startDate', publicSummary.default_start_date);
    updateFilter('endDate', publicSummary.default_end_date);
  }, [publicSummary, isPublicMapRoute, setTimePeriod, updateFilter]);

  const filteredDevices = useMemo(() => {
    if (!publicDevices) return [];

    return publicDevices.map((device, index) => ({
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
  }, [publicDevices]);

  const latestRealtimeData = useMemo(() => {
    if (!publicDevices) return [];

    return publicDevices
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
  }, [publicDevices]);

  useEffect(() => {
    if (!filters.selectedCity || filteredDevices.length === 0) {
      return;
    }

    const hasMatchingCity = filteredDevices.some((device) => getSelectedCityValue(device) === filters.selectedCity);
    if (!hasMatchingCity) {
      updateFilter('selectedCity', null);
    }
  }, [filteredDevices, filters.selectedCity, updateFilter]);

  const dailyChartData = useMemo(() => {
    return publicAnalytics?.daily || [];
  }, [publicAnalytics]);

  const weeklyChartData = useMemo(() => {
    return (publicAnalytics?.weekly || []).map((item) => ({
      ...item,
      date: formatWeekLabel(item.week),
      dateKey: item.week,
    }));
  }, [publicAnalytics]);

  const trendData = useMemo(() => {
    return (publicAnalytics?.trend || []).map((item) => ({
      time: item.time,
      tmat: item.tmat,
    }));
  }, [publicAnalytics]);

  const criticalCount = useMemo(() => {
    return publicSummary?.critical_devices || 0;
  }, [publicSummary]);

  const isLoading = summaryLoading || devicesLoading || analyticsLoading;
  const hasError = summaryError || devicesError || analyticsError;

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
            {summaryError?.message || devicesError?.message || analyticsError?.message}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                refetchSummary();
                refetchDevices();
                refetchAnalytics();
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
              {filteredDevices.filter((d) => d.status === 'aktif').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">{t('dashboard:metrics.criticalLowTmat')}</p>
            <p className="text-2xl font-bold text-rose-600">{criticalCount}</p>
          </div>
        </div>

        {/* Selected City Banner */}
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

        {/* Charts */}
        <ChartContainer
          chartView={chartView}
          setChartView={setChartView}
          dailyData={dailyChartData}
          weeklyData={weeklyChartData}
          trendData={trendData}
          selectedCity={filters.selectedCity || undefined}
        />
      </div>
    </div>
  );
};

export default FullMap;

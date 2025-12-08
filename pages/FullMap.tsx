import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardMap from '../components/DashboardMap';
import ChartContainer from '../components/charts/ChartContainer';
import { useDevices, usePerusahaan, useRealtimeAll } from '../services/useApi';
import { useFilters } from '../context/FilterContext';
import { Device, RealtimeData } from '../types';

// Helper to normalize dates by week (Monday start)
const getWeekStart = (date: string): string => {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};

// Helper to create readable week labels
const formatWeekLabel = (startDate: string): string => {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(startDate + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-CA')} - ${end.toLocaleDateString('en-CA')}`;
};

const FullMap: React.FC = () => {
  const { t } = useTranslation();
  const { filters } = useFilters();
  const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');

  const {
    data: allDevices,
    loading: devicesLoading,
    error: devicesError,
    refetch: refetchDevices,
  } = useDevices();
  const {
    data: allPerusahaan,
    loading: perusahaanLoading,
    error: perusahaanError,
    refetch: refetchPerusahaan,
  } = usePerusahaan();
  const {
    data: realtimeData,
    loading: realtimeLoading,
    error: realtimeError,
    refetch: refetchRealtime,
  } = useRealtimeAll(undefined);

  // Apply filters to device list
  const filteredDevices = useMemo(() => {
    if (!allDevices) return [];

    let filtered = allDevices;
    if (filters.provinsi) {
      filtered = filtered.filter((d) => d.provinsi === filters.provinsi);
    }
    if (filters.kabupaten) {
      filtered = filtered.filter((d) => d.kabupaten === filters.kabupaten);
    }
    if (filters.jenis_perusahaan && allPerusahaan) {
      const companyIds = allPerusahaan
        .filter((p) => p.jenis_perusahaan === filters.jenis_perusahaan)
        .map((p) => p.id);
      filtered = filtered.filter((d) => companyIds.includes(d.id_perusahaan));
    }
    return filtered;
  }, [allDevices, allPerusahaan, filters]);

  // Realtime data scoped to filtered devices and date range
  const relevantRealtimeData = useMemo(() => {
    if (!realtimeData || filteredDevices.length === 0) return [];
    const deviceIds = new Set(filteredDevices.map((d) => d.device_id_unik));

    return realtimeData.filter((r) => {
      if (!deviceIds.has(r.device_id_unik)) return false;
      const dataDate = r.timestamp_data.split(' ')[0];
      const matchesStart = !filters.startDate || dataDate >= filters.startDate;
      const matchesEnd = !filters.endDate || dataDate <= filters.endDate;
      return matchesStart && matchesEnd;
    });
  }, [realtimeData, filteredDevices, filters.startDate, filters.endDate]);

  // Daily chart data
  const dailyChartData = useMemo(() => {
    if (relevantRealtimeData.length === 0) return [];
    const dailyAggregation: Record<string, { safe: number; warning: number; danger: number }> = {};

    relevantRealtimeData.forEach((r: RealtimeData) => {
      const date = r.timestamp_data.split(' ')[0];
      if (!dailyAggregation[date]) {
        dailyAggregation[date] = { safe: 0, warning: 0, danger: 0 };
      }

      if (r.tmat_value < -0.4) {
        dailyAggregation[date].danger++;
      } else if (r.tmat_value < -0.2) {
        dailyAggregation[date].warning++;
      } else {
        dailyAggregation[date].safe++;
      }
    });

    return Object.entries(dailyAggregation)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [relevantRealtimeData]);

  // Weekly chart data
  const weeklyChartData = useMemo(() => {
    if (relevantRealtimeData.length === 0) return [];
    const weeklyAggregation: Record<string, { safe: number; warning: number; danger: number }> = {};

    relevantRealtimeData.forEach((r: RealtimeData) => {
      const date = r.timestamp_data.split(' ')[0];
      const weekStart = getWeekStart(date);
      if (!weeklyAggregation[weekStart]) {
        weeklyAggregation[weekStart] = { safe: 0, warning: 0, danger: 0 };
      }

      if (r.tmat_value < -0.4) {
        weeklyAggregation[weekStart].danger++;
      } else if (r.tmat_value < -0.2) {
        weeklyAggregation[weekStart].warning++;
      } else {
        weeklyAggregation[weekStart].safe++;
      }
    });

    return Object.entries(weeklyAggregation)
      .map(([weekStart, counts]) => ({
        date: formatWeekLabel(weekStart),
        dateKey: weekStart,
        ...counts,
      }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [relevantRealtimeData]);

  // TMAT trend data (last 10 readings)
  const trendData = useMemo(() => {
    if (relevantRealtimeData.length === 0) return [];
    const sorted = [...relevantRealtimeData].sort(
      (a, b) => new Date(a.timestamp_data).getTime() - new Date(b.timestamp_data).getTime()
    );
    return sorted.slice(-10).map((d) => ({
      time: d.timestamp_data.split(' ')[1] || d.timestamp_data,
      tmat: d.tmat_value,
    }));
  }, [relevantRealtimeData]);

  // Metrics values
  const criticalCount = useMemo(
    () => relevantRealtimeData.filter((r) => r.tmat_value < -0.4).length,
    [relevantRealtimeData]
  );
  const averageTemperature = useMemo(() => {
    if (!relevantRealtimeData.length) return '0';
    const total = relevantRealtimeData.reduce((sum, r) => sum + (r.suhu_value || 0), 0);
    return (total / relevantRealtimeData.length).toFixed(1);
  }, [relevantRealtimeData]);

  const isLoading = devicesLoading || perusahaanLoading || realtimeLoading;
  const hasError = devicesError || perusahaanError || realtimeError;

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
            {devicesError?.message || perusahaanError?.message || realtimeError?.message}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                refetchDevices();
                refetchPerusahaan();
                refetchRealtime();
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

        <section className="space-y-3">
          <DashboardMap devices={filteredDevices} heightClass="h-[70vh]" />
        </section>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">{t('dashboard:metrics.avgTemperature')}</p>
            <p className="text-2xl font-bold text-amber-500">{averageTemperature}°C</p>
          </div>
        </div>

        {/* Charts */}
        <ChartContainer
          chartView={chartView}
          setChartView={setChartView}
          dailyData={dailyChartData}
          weeklyData={weeklyChartData}
          trendData={trendData}
        />
      </div>
    </div>
  );
};

export default FullMap;

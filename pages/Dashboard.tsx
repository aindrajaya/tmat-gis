import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../context/FilterContext';
import { useDevices, usePerusahaan, useRealtimeAll } from '../services/useApi';
import DashboardMap from '../components/DashboardMap';
import FilterPanel from '../components/FilterPanel';
import ChartContainer from '../components/charts/ChartContainer';
import { Device, RealtimeData } from '../types';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { filters } = useFilters();
  const { user } = useAuth();
  const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');
  
  // Fetch data from API
  const { data: allDevices, loading: devicesLoading, error: devicesError, refetch: refetchDevices } = useDevices(user?.perusahaanId || undefined);
  const { data: allPerusahaan, loading: perusahaanLoading, error: perusahaanError } = usePerusahaan(user?.perusahaanId || undefined);
  const { data: realtimeData, loading: realtimeLoading, error: realtimeError, refetch: refetchRealtime } = useRealtimeAll(user?.perusahaanId || undefined);
  
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  // Helper function to get week start date (Monday)
  const getWeekStart = (date: string): string => {
    const d = new Date(date + 'T00:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  // Helper function to format week label
  const formatWeekLabel = (startDate: string): string => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(startDate + 'T00:00:00');
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-CA')} - ${end.toLocaleDateString('en-CA')}`;
  };

  // Filter devices and prepare chart data
  useEffect(() => {
    if (!allDevices) return;

    // 1. Filter Devices based on active filters
    let filtered = allDevices;
    if (filters.provinsi) {
      filtered = filtered.filter(d => d.provinsi === filters.provinsi);
    }
    if (filters.kabupaten) {
      filtered = filtered.filter(d => d.kabupaten === filters.kabupaten);
    }
    if (filters.jenis_perusahaan && allPerusahaan) {
      // Join logic: filter companies by type, then devices by company ID
      const companyIds = allPerusahaan
        .filter(p => p.jenis_perusahaan === filters.jenis_perusahaan)
        .map(p => p.id);
      filtered = filtered.filter(d => companyIds.includes(d.id_perusahaan));
    }
    setFilteredDevices(filtered);

    // 2. Prepare Chart Data from Real API Data
    if (realtimeData && realtimeData.length > 0) {
      const deviceIds = filtered.map(d => d.device_id_unik);
      let relevantData = realtimeData.filter(r => deviceIds.includes(r.device_id_unik));

      // Apply date filters if set
      if (filters.startDate || filters.endDate) {
        relevantData = relevantData.filter(r => {
          const dataDate = r.timestamp_data.split(' ')[0]; // Extract YYYY-MM-DD
          const matchesStart = !filters.startDate || dataDate >= filters.startDate;
          const matchesEnd = !filters.endDate || dataDate <= filters.endDate;
          return matchesStart && matchesEnd;
        });
      }

      // DAILY AGGREGATION
      const dailyAggregation: { [date: string]: { safe: number; warning: number; danger: number } } = {};
      
      relevantData.forEach(r => {
        const date = r.timestamp_data.split(' ')[0]; // Extract date
        if (!dailyAggregation[date]) {
          dailyAggregation[date] = { safe: 0, warning: 0, danger: 0 };
        }
        
        // Determine condition based on TMAT value (aligned with map classification)
        // Critical: < -0.6, Danger: -0.6 to -0.4, Warning: -0.4 to -0.2, Safe: >= -0.2
        if (r.tmat_value < -0.4) {
          dailyAggregation[date].danger++; // Includes both danger and critical
        } else if (r.tmat_value < -0.2) {
          dailyAggregation[date].warning++;
        } else {
          dailyAggregation[date].safe++;
        }
      });

      // Convert to chart format and sort by date
      const dailyChartArray = Object.entries(dailyAggregation)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      setChartData(dailyChartArray.length > 0 ? dailyChartArray : []);

      // WEEKLY AGGREGATION
      const weeklyAggregation: { [weekStart: string]: { safe: number; warning: number; danger: number } } = {};
      
      relevantData.forEach(r => {
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

      // Convert to chart format with week labels
      const weeklyChartArray = Object.entries(weeklyAggregation)
        .map(([weekStart, counts]) => ({ 
          date: formatWeekLabel(weekStart),
          dateKey: weekStart,
          ...counts 
        }))
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
      
      setWeeklyChartData(weeklyChartArray.length > 0 ? weeklyChartArray : []);

      // Line Chart: TMAT Trend (last 10 readings)
      const trendDataArray = relevantData
        .slice(-10)
        .map(d => ({
          time: d.timestamp_data.split(' ')[1] || d.timestamp_data, // Time only, fallback to full timestamp
          tmat: d.tmat_value
        }));
      
      setTrendData(trendDataArray);
    }

  }, [filters, allDevices, allPerusahaan, realtimeData]);

  // Handle loading and errors
  if (devicesLoading || perusahaanLoading || realtimeLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="mt-4 text-slate-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (devicesError || perusahaanError || realtimeError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-bold text-red-800 mb-2">Error loading dashboard</h3>
          <p className="text-red-600 mb-4">
            {devicesError?.message || perusahaanError?.message || realtimeError?.message}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                refetchDevices();
                refetchRealtime();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      
      {/* Map Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800">{t('dashboard:map.stationDistribution')}</h2>
        <DashboardMap devices={filteredDevices} />
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
            {filteredDevices.filter(d => d.status === 'aktif').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">{t('dashboard:metrics.criticalLowTmat')}</p>
          <p className="text-2xl font-bold text-rose-600">
            {realtimeData?.filter(r => r.tmat_value < -0.4).length || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">{t('dashboard:metrics.avgTemperature')}</p>
          <p className="text-2xl font-bold text-amber-500">
            {realtimeData && realtimeData.length > 0
              ? (realtimeData.reduce((sum, r) => sum + (r.suhu_value || 0), 0) / realtimeData.length).toFixed(1)
              : '0'}
            °C
          </p>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel />

      {/* Charts Section */}
      <ChartContainer 
        chartView={chartView}
        setChartView={setChartView}
        dailyData={chartData}
        weeklyData={weeklyChartData}
        trendData={trendData}
      />
    </div>
  );
};

export default Dashboard;

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../context/FilterContext';
import { useDevices, usePerusahaan, useRealtimeAll } from '../services/useApi';
import DashboardMap from '../components/DashboardMap';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Device, RealtimeData } from '../types';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { filters } = useFilters();
  
  // Fetch data from API
  const { data: allDevices, loading: devicesLoading, error: devicesError, refetch: refetchDevices } = useDevices();
  const { data: allPerusahaan, loading: perusahaanLoading, error: perusahaanError } = usePerusahaan();
  const { data: realtimeData, loading: realtimeLoading, error: realtimeError, refetch: refetchRealtime } = useRealtimeAll(undefined);
  
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

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
      const relevantData = realtimeData.filter(r => deviceIds.includes(r.device_id_unik));

      // Aggregate by date: count safe/warning/danger conditions
      const dailyAggregation: { [date: string]: { safe: number; warning: number; danger: number } } = {};
      
      relevantData.forEach(r => {
        const date = r.timestamp_data.split(' ')[0]; // Extract date
        if (!dailyAggregation[date]) {
          dailyAggregation[date] = { safe: 0, warning: 0, danger: 0 };
        }
        
        // Determine condition based on TMAT value
        if (r.tmat_value < -0.4) {
          dailyAggregation[date].danger++;
        } else if (r.tmat_value < -0.2) {
          dailyAggregation[date].warning++;
        } else {
          dailyAggregation[date].safe++;
        }
      });

      // Convert to chart format and sort by date
      const chartDataArray = Object.entries(dailyAggregation)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      setChartData(chartDataArray.length > 0 ? chartDataArray : []);

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

      {/* Map Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800">{t('dashboard:map.stationDistribution')}</h2>
        <DashboardMap devices={filteredDevices} />
      </section>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-80">
          <h3 className="font-semibold text-slate-700 mb-4">{t('dashboard:charts.dailyTmatCondition')}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="safe" stackId="a" fill="#10b981" name={t('dashboard:charts.safe')} />
              <Bar dataKey="warning" stackId="a" fill="#f59e0b" name={t('dashboard:charts.warning')} />
              <Bar dataKey="danger" stackId="a" fill="#ef4444" name={t('dashboard:charts.danger')} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-80">
          <h3 className="font-semibold text-slate-700 mb-4">{t('dashboard:charts.tmatTrend')}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" fontSize={12} />
              <YAxis fontSize={12} />
              <RechartsTooltip />
              <Line type="monotone" dataKey="tmat" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
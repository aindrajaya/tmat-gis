import React, { useEffect, useState, useRef, useMemo } from 'react';
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

  // Refs for capturing graphics in PDF export
  const mapRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const statusTrendRef = useRef<HTMLDivElement>(null);
  const tmatTrendRef = useRef<HTMLDivElement>(null);
  
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

  // Get unique devices in critical state (TMAT < -0.4)
  const criticalDevices = useMemo(() => {
    if (!realtimeData || !filteredDevices.length) return new Set();
    
    const deviceIds = filteredDevices.map(d => d.device_id_unik);
    const criticalSet = new Set<string>();
    
    realtimeData.forEach(record => {
      if (deviceIds.includes(record.device_id_unik) && record.tmat_value < -0.4) {
        criticalSet.add(record.device_id_unik);
      }
    });
    
    return criticalSet;
  }, [realtimeData, filteredDevices]);

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

      // If a city is selected, filter devices by that city first
      if (filters.selectedCity) {
        const cityDevices = filtered.filter(d => d.kota === filters.selectedCity);
        const cityDeviceIds = cityDevices.map(d => d.device_id_unik);
        relevantData = relevantData.filter(r => cityDeviceIds.includes(r.device_id_unik));
      }

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
      const dailyAggregation: { [date: string]: { safe: number; low: number; medium: number; high: number; veryhigh: number; extreme: number } } = {};
      
      relevantData.forEach(r => {
        const date = r.timestamp_data.split(' ')[0]; // Extract date
        if (!dailyAggregation[date]) {
          dailyAggregation[date] = { safe: 0, low: 0, medium: 0, high: 0, veryhigh: 0, extreme: 0 };
        }
        
        // Determine condition based on TMAT value (6-level classification)
        // Extreme: < -0.6, Very High: -0.6 to -0.5, High: -0.5 to -0.4, Medium: -0.4 to -0.2, Low: -0.2 to 0, Safe: >= 0
        if (r.tmat_value < -0.6) {
          dailyAggregation[date].extreme++;
        } else if (r.tmat_value < -0.5) {
          dailyAggregation[date].veryhigh++;
        } else if (r.tmat_value < -0.4) {
          dailyAggregation[date].high++;
        } else if (r.tmat_value < -0.2) {
          dailyAggregation[date].medium++;
        } else if (r.tmat_value < 0) {
          dailyAggregation[date].low++;
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
      const weeklyAggregation: { [weekStart: string]: { safe: number; low: number; medium: number; high: number; veryhigh: number; extreme: number } } = {};
      
      relevantData.forEach(r => {
        const date = r.timestamp_data.split(' ')[0];
        const weekStart = getWeekStart(date);
        if (!weeklyAggregation[weekStart]) {
          weeklyAggregation[weekStart] = { safe: 0, low: 0, medium: 0, high: 0, veryhigh: 0, extreme: 0 };
        }
        
        if (r.tmat_value < -0.6) {
          weeklyAggregation[weekStart].extreme++;
        } else if (r.tmat_value < -0.5) {
          weeklyAggregation[weekStart].veryhigh++;
        } else if (r.tmat_value < -0.4) {
          weeklyAggregation[weekStart].high++;
        } else if (r.tmat_value < -0.2) {
          weeklyAggregation[weekStart].medium++;
        } else if (r.tmat_value < 0) {
          weeklyAggregation[weekStart].low++;
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
        <DashboardMap ref={mapRef} devices={filteredDevices} />
      </section>

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
          <p className="text-2xl font-bold text-rose-600">
            {criticalDevices.size}
          </p>
        </div>
      </div>

      {/* Filter Panel */}
      {/* <FilterPanel /> */}

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

      {/* Charts Section */}
      <ChartContainer
        chartView={chartView}
        setChartView={setChartView}
        dailyData={chartData}
        weeklyData={weeklyChartData}
        trendData={trendData}
        selectedCity={filters.selectedCity || undefined}
        mapRef={mapRef}
        barChartRef={barChartRef}
        statusTrendRef={statusTrendRef}
        tmatTrendRef={tmatTrendRef}
      />
    </div>
  );
};

export default Dashboard;

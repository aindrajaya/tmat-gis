import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../context/FilterContext';
import { MOCK_DEVICES, MOCK_REALTIME, MOCK_PERUSAHAAN } from '../services/mockData';
import DashboardMap from '../components/DashboardMap';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Device, RealtimeData } from '../types';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { filters } = useFilters();
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    // 1. Filter Devices
    let filtered = MOCK_DEVICES;
    if (filters.provinsi) {
      filtered = filtered.filter(d => d.provinsi === filters.provinsi);
    }
    if (filters.kabupaten) {
      filtered = filtered.filter(d => d.kabupaten === filters.kabupaten);
    }
    if (filters.jenis_perusahaan) {
      // Join logic mock
      const companyIds = MOCK_PERUSAHAAN
        .filter(p => p.jenis_perusahaan === filters.jenis_perusahaan)
        .map(p => p.id);
      filtered = filtered.filter(d => companyIds.includes(d.id_perusahaan));
    }
    setFilteredDevices(filtered);

    // 2. Prepare Chart Data (Mocking Aggregation)
    const deviceIds = filtered.map(d => d.device_id_unik);
    const relevantData = MOCK_REALTIME.filter(r => deviceIds.includes(r.device_id_unik));

    // Mock Stacked Bar: Condition % per day
    const mockDailyData = [
      { date: '2025-11-20', safe: 70, warning: 20, danger: 10 },
      { date: '2025-11-21', safe: 65, warning: 25, danger: 10 },
      { date: '2025-11-22', safe: 75, warning: 15, danger: 10 },
      { date: '2025-11-23', safe: 80, warning: 15, danger: 5 },
      { date: '2025-11-24', safe: 60, warning: 30, danger: 10 },
      { date: '2025-11-25', safe: 70, warning: 20, danger: 10 }, // Corresponds to real data somewhat
    ];
    setChartData(mockDailyData);

    // Mock Line Chart: Average TMAT
    const mockTrend = relevantData.map((d, i) => ({
      time: d.timestamp_data.split(' ')[1], // Time only
      tmat: d.tmat_value
    })).slice(0, 10); // Limit points
    setTrendData(mockTrend);

  }, [filters]);

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
          <p className="text-2xl font-bold text-rose-600">3</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">{t('dashboard:metrics.avgTemperature')}</p>
          <p className="text-2xl font-bold text-amber-500">28°C</p>
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
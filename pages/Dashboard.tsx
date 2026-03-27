import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../context/FilterContext';
import { useAPIClient, useDevices, usePerusahaan, useRealtimeAll } from '../services/useApi';
import DashboardMap from '../components/DashboardMap';
import FilterPanel from '../components/FilterPanel';
import ChartContainer from '../components/charts/ChartContainer';
import { Device, RealtimeData } from '../types';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { filters } = useFilters();
  const { user } = useAuth();
  const scopeLabel =
    user?.role === 'perusahaan'
      ? `Perusahaan ${user.perusahaanName || (user.perusahaanId ? `#${user.perusahaanId}` : '')}`.trim()
      : null;
  const apiClient = useAPIClient();
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
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [chartRealtimeData, setChartRealtimeData] = useState<RealtimeData[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<Error | null>(null);

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

  const getSelectedCityValue = (device: Device): string => {
    return (
      (typeof device.desa === 'string' && device.desa.trim()) ||
      (typeof device.kabupaten_id === 'string' && device.kabupaten_id.trim()) ||
      (typeof device.provinsi_id === 'string' && device.provinsi_id.trim()) ||
      ''
    );
  };

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

  const extractDatePart = (timestamp: unknown): string | null => {
    if (typeof timestamp !== 'string') return null;
    const value = timestamp.trim();
    if (!value) return null;
    if (value.includes(' ')) return value.split(' ')[0] || null;
    if (value.includes('T')) return value.split('T')[0] || null;
    return value.length >= 10 ? value.slice(0, 10) : null;
  };

  const extractTimePart = (timestamp: unknown): string | null => {
    if (typeof timestamp !== 'string') return null;
    const value = timestamp.trim();
    if (!value) return null;
    if (value.includes(' ')) return value.split(' ')[1] || null;
    if (value.includes('T')) return value.split('T')[1] || null;
    return null;
  };

  const getTimestampSortValue = (timestamp: unknown): number => {
    if (typeof timestamp !== 'string') return Number.NEGATIVE_INFINITY;
    const normalized = timestamp.trim().replace(' ', 'T');
    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
  };

  const toDateOnly = (value: string | null | undefined): string => {
    if (!value) {
      return new Date().toISOString().split('T')[0];
    }
    return value;
  };

  const fetchHistoricalByDevices = useCallback(
    async (devicesForChart: Device[]) => {
      if (!devicesForChart.length) {
        setChartRealtimeData([]);
        setChartError(null);
        return;
      }

      const startDate = toDateOnly(filters.startDate);
      const endDate = toDateOnly(filters.endDate);
      const allowedDeviceIds = new Set(
        devicesForChart.map((device) => device.device_id_unik)
      );

      setChartLoading(true);
      setChartError(null);

      try {
        const limit = 500;

        const fetchAllPagesForDevice = async (deviceId: string): Promise<RealtimeData[]> => {
          let offset = 0;
          let keepGoing = true;
          let safety = 0;
          const allRows: RealtimeData[] = [];

          while (keepGoing && safety < 20) {
            const rows = await apiClient.getRealtimeDevice(
              deviceId,
              startDate,
              endDate,
              limit,
              offset,
              user?.perusahaanId || undefined
            );
            allRows.push(...rows);
            if (rows.length < limit) {
              keepGoing = false;
            } else {
              offset += limit;
            }
            safety += 1;
          }
          return allRows;
        };

        const settled = await Promise.allSettled(
          devicesForChart.map((device) => fetchAllPagesForDevice(device.device_id_unik))
        );

        const rows = settled
          .filter((item): item is PromiseFulfilledResult<RealtimeData[]> => item.status === 'fulfilled')
          .flatMap((item) => item.value)
          .filter(
            (item) =>
              !!item.device_id_unik &&
              allowedDeviceIds.has(item.device_id_unik) &&
              !!extractDatePart(item.timestamp_data)
          );

        setChartRealtimeData(rows);

        const failedCount = settled.filter((item) => item.status === 'rejected').length;
        if (failedCount > 0) {
          console.warn(
            `[Dashboard] ${failedCount} device history request(s) failed while building national analytics.`
          );
        }
      } catch (error) {
        setChartRealtimeData([]);
        setChartError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setChartLoading(false);
      }
    },
    [apiClient, filters.startDate, filters.endDate, user?.perusahaanId]
  );

  const filteredDevices = useMemo(() => {
    console.log('[Dashboard] useMemo filteredDevices recalculating...');
    console.log('[Dashboard] allDevices:', allDevices);
    console.log('[Dashboard] allDevices type:', typeof allDevices);
    console.log('[Dashboard] allDevices is array?:', Array.isArray(allDevices));
    
    if (!allDevices) {
      console.log('[Dashboard] allDevices is null or undefined, returning []');
      return [];
    }

    console.log('[Dashboard] Processing', allDevices.length, 'devices');
    let filtered = allDevices;
    
    if (user?.role === 'perusahaan' && user?.perusahaanId) {
      const beforeLen = filtered.length;
      filtered = filtered.filter((d) => d.id_perusahaan === user.perusahaanId);
      console.log('[Dashboard] After perusahaan filter:', beforeLen, '->', filtered.length);
    }
    if (filters.provinsi) {
      const beforeLen = filtered.length;
      filtered = filtered.filter((d) =>
        matchesRegionFilter(
          filters.provinsi,
          d.provinsi_nama,
          d.provinsi_id,
          (d as any).provinsi
        )
      );
      console.log('[Dashboard] After provinsi filter:', beforeLen, '->', filtered.length);
    }
    if (filters.kabupaten) {
      const beforeLen = filtered.length;
      filtered = filtered.filter((d) =>
        matchesRegionFilter(
          filters.kabupaten,
          d.kabupaten_nama,
          d.kabupaten_id,
          (d as any).kabupaten
        )
      );
      console.log('[Dashboard] After kabupaten filter:', beforeLen, '->', filtered.length);
    }
    if (filters.jenis_perusahaan && allPerusahaan) {
      const beforeLen = filtered.length;
      const companyIds = allPerusahaan
        .filter((p) => p.jenis_perusahaan === filters.jenis_perusahaan)
        .map((p) => p.id);
      console.log('[Dashboard] Company IDs for filter:', companyIds);
      filtered = filtered.filter((d) => companyIds.includes(d.id_perusahaan));
      console.log('[Dashboard] After jenis_perusahaan filter:', beforeLen, '->', filtered.length);
    }

    console.log('[Dashboard] Final filtered result:', filtered);
    console.log('[Dashboard] Final filtered is array?:', Array.isArray(filtered));
    return filtered;
  }, [
    allDevices,
    allPerusahaan,
    filters.provinsi,
    filters.kabupaten,
    filters.jenis_perusahaan,
    user?.role,
    user?.perusahaanId,
  ]);

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

  useEffect(() => {
    fetchHistoricalByDevices(filteredDevices);
  }, [filteredDevices, fetchHistoricalByDevices]);

  useEffect(() => {
    // 2. Prepare Chart Data from historical realtime_device data
    if (chartRealtimeData && chartRealtimeData.length > 0) {
      const deviceIds = filteredDevices.map(d => d.device_id_unik);
      let relevantData = chartRealtimeData.filter(r => deviceIds.includes(r.device_id_unik));

      // If a city is selected, filter devices by that city first
      let applicableDevices = filteredDevices; // Track which devices to use for offline calculation
      if (filters.selectedCity) {
        const cityDevices = filteredDevices.filter((d) => getSelectedCityValue(d) === filters.selectedCity);
        applicableDevices = cityDevices;
        const cityDeviceIds = cityDevices.map(d => d.device_id_unik);
        relevantData = relevantData.filter(r => cityDeviceIds.includes(r.device_id_unik));
      }

      // Only count aktif devices
      const aktifDevices = applicableDevices.filter(d => d.status === 'aktif');
      const aktifDeviceIds = aktifDevices.map(d => d.device_id_unik);

      // Apply date filters if set
      if (filters.startDate || filters.endDate) {
        relevantData = relevantData.filter(r => {
          const dataDate = extractDatePart(r.timestamp_data);
          if (!dataDate) return false;
          const matchesStart = !filters.startDate || dataDate >= filters.startDate;
          const matchesEnd = !filters.endDate || dataDate <= filters.endDate;
          return matchesStart && matchesEnd;
        });
      }

      // Charts should represent one status per active device per period.
      // Counting every reading inflates categories on pages that fetch raw history.
      relevantData = relevantData.filter((r) => aktifDeviceIds.includes(r.device_id_unik));

      const classifyTmatValue = (value: number) => {
        if (value < -0.6) return 'extreme' as const;
        if (value < -0.5) return 'veryhigh' as const;
        if (value < -0.4) return 'high' as const;
        if (value < -0.2) return 'medium' as const;
        if (value < 0) return 'low' as const;
        return 'safe' as const;
      };

      // DAILY AGGREGATION
      const dailyAggregation: { [date: string]: { safe: number; low: number; medium: number; high: number; veryhigh: number; extreme: number; offline: number } } = {};

      const latestDailyByDevice = new Map<string, RealtimeData>();
      relevantData.forEach((r) => {
        const date = extractDatePart(r.timestamp_data);
        if (!date) return;
        const key = `${date}::${r.device_id_unik}`;
        const existing = latestDailyByDevice.get(key);
        if (!existing || getTimestampSortValue(r.timestamp_data) > getTimestampSortValue(existing.timestamp_data)) {
          latestDailyByDevice.set(key, r);
        }
      });

      latestDailyByDevice.forEach((r) => {
        const date = extractDatePart(r.timestamp_data);
        if (!date) return;
        if (!dailyAggregation[date]) {
          dailyAggregation[date] = { safe: 0, low: 0, medium: 0, high: 0, veryhigh: 0, extreme: 0, offline: 0 };
        }
        dailyAggregation[date][classifyTmatValue(r.tmat_value)]++;
      });

      // Add offline devices count for each day
      Object.keys(dailyAggregation).forEach(date => {
        const devicesWithDataOnDate = new Set(
          Array.from(latestDailyByDevice.values())
            .filter(r => extractDatePart(r.timestamp_data) === date)
            .map(r => r.device_id_unik)
        );
        // Offline = aktif devices - devices that reported on this day
        dailyAggregation[date].offline = aktifDeviceIds.length - devicesWithDataOnDate.size;
      });

      // Convert to chart format and sort by date
      const dailyChartArray = Object.entries(dailyAggregation)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      setChartData(dailyChartArray.length > 0 ? dailyChartArray : []);

      // WEEKLY AGGREGATION
      const weeklyAggregation: { [weekStart: string]: { safe: number; low: number; medium: number; high: number; veryhigh: number; extreme: number; offline: number } } = {};

      const latestWeeklyByDevice = new Map<string, RealtimeData>();
      relevantData.forEach((r) => {
        const date = extractDatePart(r.timestamp_data);
        if (!date) return;
        const weekStart = getWeekStart(date);
        const key = `${weekStart}::${r.device_id_unik}`;
        const existing = latestWeeklyByDevice.get(key);
        if (!existing || getTimestampSortValue(r.timestamp_data) > getTimestampSortValue(existing.timestamp_data)) {
          latestWeeklyByDevice.set(key, r);
        }
      });

      latestWeeklyByDevice.forEach((r) => {
        const date = extractDatePart(r.timestamp_data);
        if (!date) return;
        const weekStart = getWeekStart(date);
        if (!weeklyAggregation[weekStart]) {
          weeklyAggregation[weekStart] = { safe: 0, low: 0, medium: 0, high: 0, veryhigh: 0, extreme: 0, offline: 0 };
        }
        weeklyAggregation[weekStart][classifyTmatValue(r.tmat_value)]++;
      });

      // Add offline devices count for each week
      Object.keys(weeklyAggregation).forEach(weekStart => {
        const devicesWithDataInWeek = new Set(
          Array.from(latestWeeklyByDevice.values())
            .filter(r => {
              const date = extractDatePart(r.timestamp_data);
              return date ? getWeekStart(date) === weekStart : false;
            })
            .map(r => r.device_id_unik)
        );
        // Offline = aktif devices - devices that reported in this week
        weeklyAggregation[weekStart].offline = aktifDeviceIds.length - devicesWithDataInWeek.size;
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
          time: extractTimePart(d.timestamp_data) || String(d.timestamp_data || ''), // Time only, fallback to full timestamp
          tmat: d.tmat_value
        }));
      
      setTrendData(trendDataArray);
    } else {
      setChartData([]);
      setWeeklyChartData([]);
      setTrendData([]);
    }
  }, [filters, filteredDevices, chartRealtimeData]);

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

  if (devicesError || perusahaanError || realtimeError || chartError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-bold text-red-800 mb-2">Error loading dashboard</h3>
          <p className="text-red-600 mb-4">
            {devicesError?.message || perusahaanError?.message || realtimeError?.message || chartError?.message}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                refetchDevices();
                refetchRealtime();
                fetchHistoricalByDevices(filteredDevices);
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
        <DashboardMap
          ref={mapRef}
          devices={filteredDevices}
          realtimeData={realtimeData}
          realtimeLoading={realtimeLoading}
        />
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
        isLoading={chartLoading}
        selectedCity={filters.selectedCity || undefined}
        scopeLabel={scopeLabel}
        mapRef={mapRef}
        barChartRef={barChartRef}
        statusTrendRef={statusTrendRef}
        tmatTrendRef={tmatTrendRef}
      />
    </div>
  );
};

export default Dashboard;

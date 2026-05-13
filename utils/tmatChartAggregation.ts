import { Device, RealtimeData } from '../types';

export interface TmatChartDailyPoint {
  date: string;
  tergenang: number;
  normal: number;
  rawan: number;
  sangat_rawan: number;
  offline: number;
}

export interface TmatChartWeeklyPoint extends TmatChartDailyPoint {
  dateKey: string;
}

export interface TmatChartTrendPoint {
  time: string;
  tmat: number;
}

export interface TmatChartSeries {
  daily: TmatChartDailyPoint[];
  weekly: TmatChartWeeklyPoint[];
  trend: TmatChartTrendPoint[];
}

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

const getWeekStart = (date: string): string => {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};

const formatWeekLabel = (startDate: string): string => {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(startDate + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-CA')} - ${end.toLocaleDateString('en-CA')}`;
};

const getSelectedCityValue = (device: Device): string => {
  return (
    (typeof device.desa === 'string' && device.desa.trim()) ||
    (typeof device.kabupaten_id === 'string' && device.kabupaten_id.trim()) ||
    (typeof device.provinsi_id === 'string' && device.provinsi_id.trim()) ||
    ''
  );
};

const classifyTmatValue = (value: number) => {
  if (!Number.isFinite(value)) return 'offline' as const;
  if (value > 0) return 'tergenang' as const;
  if (value >= -40) return 'normal' as const;
  if (value >= -80) return 'rawan' as const;
  return 'sangat_rawan' as const;
};

export function buildTmatChartSeries(
  historicalData: RealtimeData[],
  devices: Device[],
  startDate?: string,
  endDate?: string,
  selectedCity?: string | null
): TmatChartSeries {
  if (!historicalData.length || !devices.length) {
    return { daily: [], weekly: [], trend: [] };
  }

  const deviceIds = devices.map((device) => device.device_id_unik);
  let relevantData = historicalData.filter((record) => deviceIds.includes(record.device_id_unik));

  let applicableDevices = devices;
  if (selectedCity) {
    const cityDevices = devices.filter((device) => getSelectedCityValue(device) === selectedCity);
    applicableDevices = cityDevices;
    const cityDeviceIds = cityDevices.map((device) => device.device_id_unik);
    relevantData = relevantData.filter((record) => cityDeviceIds.includes(record.device_id_unik));
  }

  const aktifDevices = applicableDevices.filter((device) => device.status === 'aktif');
  const aktifDeviceIds = aktifDevices.map((device) => device.device_id_unik);

  if (startDate || endDate) {
    relevantData = relevantData.filter((record) => {
      const dataDate = extractDatePart(record.timestamp_data);
      if (!dataDate) return false;
      const matchesStart = !startDate || dataDate >= startDate;
      const matchesEnd = !endDate || dataDate <= endDate;
      return matchesStart && matchesEnd;
    });
  }

  relevantData = relevantData.filter((record) => aktifDeviceIds.includes(record.device_id_unik));

  const dailyAggregation: Record<string, TmatChartDailyPoint> = {};
  const latestDailyByDevice = new Map<string, RealtimeData>();
  relevantData.forEach((record) => {
    const date = extractDatePart(record.timestamp_data);
    if (!date) return;
    const key = `${date}::${record.device_id_unik}`;
    const existing = latestDailyByDevice.get(key);
    if (!existing || getTimestampSortValue(record.timestamp_data) > getTimestampSortValue(existing.timestamp_data)) {
      latestDailyByDevice.set(key, record);
    }
  });

  latestDailyByDevice.forEach((record) => {
    const date = extractDatePart(record.timestamp_data);
    if (!date) return;
    if (!dailyAggregation[date]) {
      dailyAggregation[date] = { date, tergenang: 0, normal: 0, rawan: 0, sangat_rawan: 0, offline: 0 };
    }
    dailyAggregation[date][classifyTmatValue(record.tmat_value)]++;
  });

  Object.keys(dailyAggregation).forEach((date) => {
    const devicesWithDataOnDate = new Set(
      Array.from(latestDailyByDevice.values())
        .filter((record) => extractDatePart(record.timestamp_data) === date)
        .map((record) => record.device_id_unik)
    );
    dailyAggregation[date].offline = Math.max(aktifDeviceIds.length - devicesWithDataOnDate.size, 0);
  });

  const daily = Object.values(dailyAggregation).sort((a, b) => a.date.localeCompare(b.date));

  const weeklyAggregation: Record<string, TmatChartWeeklyPoint> = {};
  const latestWeeklyByDevice = new Map<string, RealtimeData>();
  relevantData.forEach((record) => {
    const date = extractDatePart(record.timestamp_data);
    if (!date) return;
    const weekStart = getWeekStart(date);
    const key = `${weekStart}::${record.device_id_unik}`;
    const existing = latestWeeklyByDevice.get(key);
    if (!existing || getTimestampSortValue(record.timestamp_data) > getTimestampSortValue(existing.timestamp_data)) {
      latestWeeklyByDevice.set(key, record);
    }
  });

  latestWeeklyByDevice.forEach((record) => {
    const date = extractDatePart(record.timestamp_data);
    if (!date) return;
    const weekStart = getWeekStart(date);
    if (!weeklyAggregation[weekStart]) {
      weeklyAggregation[weekStart] = { date: formatWeekLabel(weekStart), dateKey: weekStart, tergenang: 0, normal: 0, rawan: 0, sangat_rawan: 0, offline: 0 };
    }
    weeklyAggregation[weekStart][classifyTmatValue(record.tmat_value)]++;
  });

  Object.keys(weeklyAggregation).forEach((weekStart) => {
    const devicesWithDataInWeek = new Set(
      Array.from(latestWeeklyByDevice.values())
        .filter((record) => {
          const date = extractDatePart(record.timestamp_data);
          return date ? getWeekStart(date) === weekStart : false;
        })
        .map((record) => record.device_id_unik)
    );
    weeklyAggregation[weekStart].offline = Math.max(aktifDeviceIds.length - devicesWithDataInWeek.size, 0);
  });

  const weekly = Object.values(weeklyAggregation).sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const trend = relevantData
    .slice(-10)
    .map((record) => ({
      time: extractTimePart(record.timestamp_data) || String(record.timestamp_data || ''),
      tmat: record.tmat_value,
    }));

  return { daily, weekly, trend };
}
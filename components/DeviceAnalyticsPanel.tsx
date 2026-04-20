import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Device, RealtimeData } from '../types';
import { useAPIClient, useRealtimeAll, usePerusahaan } from '../services/useApi';
import { useFilters } from '../context/FilterContext';
import { useAuth } from '../context/AuthContext';
import { X, ChevronUp, MapPin, Droplet, Thermometer, CloudRain, Waves } from 'lucide-react';
import { getWaterLevelStatus } from '../utils/waterLevelStatus';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  selectedDevice: Device | null;
  realtimeData?: RealtimeData | null;
  onClose: () => void;
}

const DeviceAnalyticsPanel: React.FC<Props> = ({ selectedDevice, realtimeData, onClose }) => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';
  const { filters } = useFilters();
  const { user } = useAuth();
  const apiClient = useAPIClient();
  const { data: perusahaanList } = usePerusahaan(user?.perusahaanId || undefined);
  const { data: realtimeSnapshotData } = useRealtimeAll(user?.perusahaanId || undefined);
  const [isExpanded, setIsExpanded] = useState(false);
  const [historicalData, setHistoricalData] = useState<RealtimeData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<Error | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'combined' | 'tmat' | 'rainfall' | 'humidity'>('combined');

  const resolveDate = (value?: string): string => {
    if (value && value.trim()) return value;
    return new Date().toISOString().split('T')[0];
  };
  const historyStartDate = resolveDate(filters.startDate);
  const historyEndDate = resolveDate(filters.endDate);

  const formatTimestamp = (value?: string): string => {
    if (!value || !value.trim()) return '-';

    const raw = value.trim();
    const normalized = raw.includes(' ') ? raw.replace(' ', 'T') : raw;
    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }

    return parsed.toLocaleString(isIndonesian ? 'id-ID' : 'en-US');
  };

  const formatMetric = (value: number | undefined, digits: number, suffix = ''): string => {
    return Number.isFinite(value) ? `${value!.toFixed(digits)}${suffix}` : '-';
  };

  const companyNameById = useMemo(() => {
    const map = new Map<number, string>();
    (perusahaanList || []).forEach((company: any) => {
      const companyId = Number(company?.id);
      if (Number.isFinite(companyId)) {
        map.set(companyId, String(company?.nama_perusahaan || company?.company_name || company?.name || ''));
      }
    });
    return map;
  }, [perusahaanList]);

  const selectedCompanyName = useMemo(() => {
    if (!selectedDevice?.id_perusahaan) return '-';
    return companyNameById.get(Number(selectedDevice.id_perusahaan)) || '-';
  }, [companyNameById, selectedDevice?.id_perusahaan]);

  const getDeviceDisplayLabel = (device: Device): string => {
    return `Nomor Titik ${device.kode_titik || device.device_id_unik}`;
  };

  const cleanLocationText = (value?: string | null): string => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.split(',')[0]?.trim() || trimmed;
  };

  const joinLocationParts = (...values: Array<string | null | undefined>): string => {
    const seen = new Set<string>();
    const parts: string[] = [];

    values.forEach((value) => {
      const normalized = cleanLocationText(value || '');
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      parts.push(normalized);
    });

    return parts.join(', ') || '-';
  };

  const cleanAddressText = (value?: string | null): string => {
    if (typeof value !== 'string') return '-';

    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return '-';

    const cleaned: string[] = [];
    const seen = new Set<string>();

    for (const part of parts) {
      const key = part.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push(part);

      // Keep the address readable by limiting very long breadcrumb-like strings.
      if (cleaned.length >= 4) break;
    }

    return cleaned.join(', ') || '-';
  };

  const getDeviceLocationLabel = (device: Device): string => {
    return joinLocationParts(
      device.kelurahan_nama || device.desa || device.kelurahan_id,
      device.kecamatan_nama || device.kecamatan_id,
      device.kabupaten_nama || device.kabupaten_id,
      device.provinsi_nama || device.provinsi_id,
    );
  };

  const parseTimestamp = (value?: string): Date | null => {
    if (!value || !value.trim()) return null;
    const normalized = value.trim().includes(' ') ? value.trim().replace(' ', 'T') : value.trim();
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const dailySummaryData = useMemo(() => {
    if (!historicalData.length) return [];

    const byDay = new Map<string, { date: string; rainSum: number; humiditySum: number; humidityCount: number; count: number }>();

    historicalData.forEach((row: RealtimeData) => {
      const parsed = parseTimestamp(row.timestamp_data);
      if (!parsed) return;

      const dayKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      const existing = byDay.get(dayKey) || {
        date: parsed.toLocaleDateString(isIndonesian ? 'id-ID' : 'en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        rainSum: 0,
        humiditySum: 0,
        humidityCount: 0,
        count: 0,
      };

      existing.rainSum += Number(row.curah_hujan || 0);
      if (Number.isFinite(Number(row.kelembapan))) {
        existing.humiditySum += Number(row.kelembapan);
        existing.humidityCount += 1;
      }
      existing.count += 1;
      byDay.set(dayKey, existing);
    });

    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, item]) => ({
        date: item.date,
        curah_hujan: Number(item.rainSum.toFixed(2)),
        kelembapan: item.humidityCount > 0 ? Number((item.humiditySum / item.humidityCount).toFixed(2)) : null,
        records: item.count,
      }));
  }, [historicalData, isIndonesian]);

  const chartSeriesData = useMemo(() => {
    if (!historicalData.length) return [];

    return [...historicalData]
      .sort((a, b) => new Date(a.timestamp_data).getTime() - new Date(b.timestamp_data).getTime())
      .map((item: RealtimeData) => {
        const parsed = parseTimestamp(item.timestamp_data);
        return {
          time: parsed
            ? parsed.toLocaleString(isIndonesian ? 'id-ID' : 'en-US', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : item.timestamp_data,
          tmat: item.tmat_value,
          rainfall: item.curah_hujan,
          humidity: item.kelembapan,
          fullTimestamp: item.timestamp_data,
        };
      });
  }, [historicalData, isIndonesian]);

  useEffect(() => {
    let cancelled = false;

    const fetchHistoricalData = async () => {
      if (!selectedDevice?.device_id_unik) {
        setHistoricalData([]);
        setHistoryError(null);
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const limit = 500;
        let offset = 0;
        let safety = 0;
        const rows: RealtimeData[] = [];

        while (safety < 50) {
          const page = await apiClient.getRealtimeDevice(
            selectedDevice.device_id_unik,
            historyStartDate,
            historyEndDate,
            limit,
            offset,
            user?.perusahaanId || undefined
          );

          if (!page.length) break;
          rows.push(...page);

          if (page.length < limit) break;
          offset += limit;
          safety += 1;
        }

        const seen = new Set<string>();
        const deduped = rows.filter((row: RealtimeData) => {
          const key = `${row.id ?? ''}|${row.device_id_unik}|${row.timestamp_data}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        deduped.sort(
          (a: RealtimeData, b: RealtimeData) =>
            new Date(a.timestamp_data).getTime() -
            new Date(b.timestamp_data).getTime()
        );

        if (!cancelled) {
          setHistoricalData(deduped);
        }
      } catch (error) {
        if (!cancelled) {
          setHistoricalData([]);
          setHistoryError(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    fetchHistoricalData();

    return () => {
      cancelled = true;
    };
  }, [
    apiClient,
    selectedDevice?.device_id_unik,
    historyStartDate,
    historyEndDate,
    user?.perusahaanId,
  ]);

  const selectedDeviceSnapshot = useMemo(() => {
    if (!selectedDevice?.device_id_unik || !realtimeSnapshotData?.length) return null;
    const target = selectedDevice.device_id_unik.trim();
    return (
      realtimeSnapshotData.find(
        (row) => String(row.device_id_unik || '').trim() === target
      ) || null
    );
  }, [selectedDevice?.device_id_unik, realtimeSnapshotData]);

  // Determine current reading: prefer realtime snapshot prop, otherwise latest point from device history.
  const currentRealtime: RealtimeData | null = realtimeData
    ?? selectedDeviceSnapshot
    ?? (selectedDevice
      ? historicalData
      .filter(r => r.device_id_unik === selectedDevice.device_id_unik)
      .sort((a, b) => new Date(b.timestamp_data).getTime() - new Date(a.timestamp_data).getTime())[0]
      : undefined
    ) ?? null;

  const currentStatus = currentRealtime ? getWaterLevelStatus(currentRealtime.tmat_value, isIndonesian) : null;
  const lastUpdatedValue = currentRealtime?.timestamp_data || selectedDevice?.last_online || '';

  // Only show panel when device is actually selected (clicked)
  if (!selectedDevice) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[1005] transition-all duration-300 ease-out ${
        isExpanded ? 'inset-0 bg-black/40' : 'bg-transparent'
      }`}
      onClick={isExpanded ? onClose : undefined}
    >
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-all duration-300 transform ${
          isExpanded ? 'h-full max-h-none' : 'h-96'
        } overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: isExpanded ? '100vh' : '24rem'
        }}
      >
        {/* Header with drag handle and close button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors py-1"
              title={isExpanded ? t('dashboard:analytics.minimize') : t('dashboard:analytics.expand')}
            >
              <ChevronUp
                size={20}
                className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-800 text-sm truncate">
                {getDeviceDisplayLabel(selectedDevice)}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {getDeviceLocationLabel(selectedDevice)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
            title={t('dashboard:analytics.close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content area with scroll */}
        <div className="overflow-y-auto" style={{ maxHeight: isExpanded ? 'calc(100vh - 80px)' : 'calc(24rem - 60px)' }}>
          <div className="p-4 space-y-4">
            {/* Current Status Section */}
            {selectedDevice && (
              <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg p-4 border border-emerald-200">
                <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <MapPin size={14} className="text-emerald-600" />
                  {t('dashboard:analytics.currentStatus')}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Status Badge */}
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">
                      {t('dashboard:analytics.waterLevelStatus')}
                    </p>
                    <div
                      className="inline-block text-xs px-3 py-1.5 rounded-full font-bold"
                      style={{
                        backgroundColor: `${(currentStatus?.color || '#64748b')}20`,
                        color: currentStatus?.color || '#64748b'
                      }}
                    >
                      {currentStatus?.level || (isIndonesian ? 'Belum ada data realtime' : 'No realtime data yet')}
                    </div>
                  </div>

                  {/* TMAT Value */}
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">TMAT</p>
                    <div className="flex items-center gap-2">
                      <Droplet size={14} style={{ color: currentStatus?.color || '#64748b' }} />
                      <span className="text-sm font-bold text-slate-800">
                        {formatMetric(currentRealtime?.tmat_value, 2, ' cm')}
                      </span>
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">
                      {t('dashboard:analytics.temperature')}
                    </p>
                    <div className="flex items-center gap-2">
                      <Thermometer size={14} className="text-orange-500" />
                      <span className="text-sm font-bold text-slate-800">
                        {formatMetric(currentRealtime?.suhu_value, 1, '°C')}
                      </span>
                    </div>
                  </div>

                  {/* Rainfall */}
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">
                      {isIndonesian ? 'Curah Hujan' : 'Rainfall'}
                    </p>
                    <div className="flex items-center gap-2">
                      <CloudRain size={14} className="text-blue-500" />
                      <span className="text-sm font-bold text-slate-800">
                        {formatMetric(currentRealtime?.curah_hujan, 1, ' mm')}
                      </span>
                    </div>
                  </div>

                  {/* Humidity */}
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">
                      {isIndonesian ? 'Kelembapan' : 'Humidity'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Waves size={14} className="text-cyan-500" />
                      <span className="text-sm font-bold text-slate-800">
                        {formatMetric(currentRealtime?.kelembapan, 1, '%')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="mt-3 pt-3 border-t border-emerald-100">
                  <p className="text-xs text-slate-500">
                    {t('dashboard:analytics.lastUpdated')}:
                  </p>
                  <p className="text-xs font-medium text-slate-700">
                    {formatTimestamp(lastUpdatedValue)}
                  </p>
                </div>
              </div>
            )}

            {/* Daily Rainfall and Humidity Summary */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                <CloudRain size={14} className="text-blue-600" />
                {t('dashboard:analytics.dailySummary')}
              </h4>

              {dailySummaryData.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-500 mb-1">{t('dashboard:analytics.dailyRainfall')}</p>
                      <p className="text-sm font-bold text-slate-800">
                        {formatMetric(dailySummaryData.reduce((total, item) => total + item.curah_hujan, 0), 2, ' mm')}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-500 mb-1">{t('dashboard:analytics.dailyHumidity')}</p>
                      <p className="text-sm font-bold text-slate-800">
                        {formatMetric(
                          dailySummaryData.reduce((total, item) => total + (item.kelembapan || 0), 0) / Math.max(dailySummaryData.filter((item) => item.kelembapan !== null).length, 1),
                          2,
                          ' %'
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-500 mb-1">{t('dashboard:analytics.dailyRecords')}</p>
                      <p className="text-sm font-bold text-slate-800">{historicalData.length.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="px-3 py-2 text-left">{t('dashboard:analytics.date')}</th>
                          <th className="px-3 py-2 text-right">{t('dashboard:analytics.dailyRainfall')}</th>
                          <th className="px-3 py-2 text-right">{t('dashboard:analytics.dailyHumidity')}</th>
                          <th className="px-3 py-2 text-right">{t('dashboard:analytics.dailyRecords')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dailySummaryData.slice(-7).map((item) => (
                          <tr key={item.date}>
                            <td className="px-3 py-2">{item.date}</td>
                            <td className="px-3 py-2 text-right">{formatMetric(item.curah_hujan, 2, ' mm')}</td>
                            <td className="px-3 py-2 text-right">{formatMetric(item.kelembapan ?? undefined, 2, ' %')}</td>
                            <td className="px-3 py-2 text-right">{item.records}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">{t('dashboard:analytics.noHistoricalData')}</p>
              )}
            </div>

            {/* Tabbed Chart Section */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <CloudRain size={14} className="text-blue-600" />
                  {t('dashboard:analytics.chartSection')}
                </h4>
                <span className="text-[10px] font-medium text-slate-500">
                  {historyStartDate} - {historyEndDate}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {([
                  ['combined', t('dashboard:analytics.chartTabs.combined')] as const,
                  ['tmat', t('dashboard:analytics.chartTabs.tmat')] as const,
                  ['rainfall', t('dashboard:analytics.chartTabs.rainfall')] as const,
                  ['humidity', t('dashboard:analytics.chartTabs.humidity')] as const,
                ]).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveChartTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                      activeChartTab === tab
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
                  <span className="ml-2 text-sm text-slate-600">
                    {t('dashboard:analytics.loading')}
                  </span>
                </div>
              ) : historyError ? (
                <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
                  <p className="text-xs text-red-600 font-medium">
                    {historyError.message}
                  </p>
                </div>
              ) : chartSeriesData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    {activeChartTab === 'combined' ? (
                      <ComposedChart data={chartSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" fontSize={11} />
                        <YAxis yAxisId="left" fontSize={11} label={{ value: 'TMAT (cm)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" fontSize={11} label={{ value: 'Curah Hujan / Kelembapan', angle: 90, position: 'insideRight' }} />
                        <RechartsTooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="tmat" stroke="#3b82f6" strokeWidth={2} dot={false} name="TMAT" />
                        <Bar yAxisId="right" dataKey="rainfall" fill="#10b981" name={t('dashboard:analytics.dailyRainfall')} radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#f97316" strokeWidth={2} dot={false} name={t('dashboard:analytics.dailyHumidity')} />
                      </ComposedChart>
                    ) : activeChartTab === 'tmat' ? (
                      <ComposedChart data={chartSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" fontSize={11} />
                        <YAxis fontSize={11} label={{ value: 'TMAT (cm)', angle: -90, position: 'insideLeft' }} />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="tmat" stroke="#3b82f6" strokeWidth={2} dot={false} name="TMAT" />
                      </ComposedChart>
                    ) : activeChartTab === 'rainfall' ? (
                      <ComposedChart data={chartSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" fontSize={11} />
                        <YAxis fontSize={11} label={{ value: 'Curah Hujan (mm)', angle: -90, position: 'insideLeft' }} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="rainfall" fill="#10b981" name={t('dashboard:analytics.dailyRainfall')} radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    ) : (
                      <ComposedChart data={chartSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" fontSize={11} />
                        <YAxis fontSize={11} label={{ value: 'Kelembapan (%)', angle: -90, position: 'insideLeft' }} />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="humidity" stroke="#f97316" strokeWidth={2} dot={false} name={t('dashboard:analytics.dailyHumidity')} />
                      </ComposedChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-500 italic">
                    {t('dashboard:analytics.noHistoricalData')}
                  </p>
                </div>
              )}
            </div>

            {/* Device Location Info */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 mb-2">
                {t('dashboard:analytics.deviceInfo')}
              </h4>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.deviceCode')}:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.kode_titik || selectedDevice.device_id_unik || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.technicalId')}:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.device_id_unik || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.companyName')}:</span>
                  <span className="font-medium text-slate-800 text-right">{selectedCompanyName}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.province')}:</span>
                  <span className="font-medium text-slate-800 text-right">{selectedDevice.provinsi_nama || selectedDevice.provinsi_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.city')}:</span>
                  <span className="font-medium text-slate-800 text-right">{selectedDevice.kabupaten_nama || selectedDevice.kabupaten_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.district')}:</span>
                  <span className="font-medium text-slate-800 text-right">{selectedDevice.kecamatan_nama || selectedDevice.kecamatan_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.village')}:</span>
                  <span className="font-medium text-slate-800 text-right">{cleanLocationText(selectedDevice.kelurahan_nama || selectedDevice.desa || selectedDevice.kelurahan_id || '-')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.address')}:</span>
                  <span className="font-medium text-slate-800 text-right">{cleanAddressText(selectedDevice.alamat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.companyType')}:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.jenis_perusahaan || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.coordinates')}:</span>
                  <span className="font-medium text-slate-800">
                    {selectedDevice.latitude.toFixed(4)}, {selectedDevice.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceAnalyticsPanel;

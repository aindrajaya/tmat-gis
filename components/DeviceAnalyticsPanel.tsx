import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Device, RealtimeData } from '../types';
import { useAPIClient, useRealtimeAll } from '../services/useApi';
import { useFilters } from '../context/FilterContext';
import { useAuth } from '../context/AuthContext';
import TMATTrendChart from './charts/TMATTrendChart';
import { X, ChevronUp, MapPin, Droplet, Thermometer, CloudRain, Waves } from 'lucide-react';
import { getWaterLevelStatus } from '../utils/waterLevelStatus';

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
  const { data: realtimeSnapshotData } = useRealtimeAll(user?.perusahaanId || undefined);
  const [isExpanded, setIsExpanded] = useState(false);
  const [historicalData, setHistoricalData] = useState<RealtimeData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<Error | null>(null);

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
      return raw; // show raw string instead of "Invalid Date"
    }

    return parsed.toLocaleString(isIndonesian ? 'id-ID' : 'en-US');
  };

  const formatMetric = (value: number | undefined, digits: number, suffix = ''): string => {
    return Number.isFinite(value) ? `${value!.toFixed(digits)}${suffix}` : '—';
  };

  const getDeviceDisplayLabel = (device: Device): string => {
    return `Device ${device.kode_titik || device.device_id_unik}`;
  };

  const getDeviceLocationLabel = (device: Device): string => {
    return [device.desa, device.kabupaten_id, device.provinsi_id].filter(Boolean).join(', ') || '-';
  };

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
        const deduped = rows.filter((row) => {
          const key = `${row.id ?? ''}|${row.device_id_unik}|${row.timestamp_data}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        deduped.sort(
          (a, b) =>
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

  // Format historical data for chart if available
  const trendChartData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return [];
    }

    return [...historicalData]
      .sort((a, b) => new Date(a.timestamp_data).getTime() - new Date(b.timestamp_data).getTime())
      .map(data => {
      const formattedDate = new Date(data.timestamp_data).toLocaleDateString(isIndonesian ? 'id-ID' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return {
        time: formattedDate, // Required by TMATTrendChart XAxis
        date: formattedDate,
        tmat: data.tmat_value,
        temperature: data.suhu_value,
        ph: data.ph_value,
        fullTimestamp: data.timestamp_data
      };
    });
  }, [historicalData, isIndonesian]);

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

            {/* Historical Data Section */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                {t('dashboard:analytics.historicalData')}
                <span className="ml-2 text-[10px] font-medium text-slate-500">
                  {historyStartDate} - {historyEndDate}
                </span>
              </h4>

              {!historyLoading && !historyError && (
                <div className="mb-3 text-[11px] text-slate-500">
                  Total records loaded: <span className="font-semibold text-slate-700">{historicalData.length}</span>
                </div>
              )}

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
              ) : trendChartData.length > 0 ? (
                <div className="bg-white rounded-lg border border-slate-100 p-4">
                  <TMATTrendChart data={trendChartData} selectedCity={filters.selectedCity || undefined} />
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
                  <span>{t('dashboard:analytics.deviceId')}:</span>
                  <span className="font-medium text-slate-800">{getDeviceDisplayLabel(selectedDevice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.city')}:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.desa || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.province')}:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.provinsi_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Provinsi ID:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.provinsi_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kabupaten ID:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.kabupaten_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kecamatan ID:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.kecamatan_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Desa/Kelurahan:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.desa || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kelurahan ID:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.kelurahan_id || '-'}</span>
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

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Device, RealtimeData } from '../types';
import { useRealtimeDevice } from '../services/useApi';
import { useFilters } from '../context/FilterContext';
import TMATTrendChart from './charts/TMATTrendChart';
import { X, ChevronUp, MapPin, Droplet, Thermometer, TestTube } from 'lucide-react';

interface Props {
  selectedDevice: Device | null;
  realtimeData?: RealtimeData | null;
  onClose: () => void;
}

const DeviceAnalyticsPanel: React.FC<Props> = ({ selectedDevice, realtimeData, onClose }) => {
  if (!selectedDevice) return null;

  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';
  const filters = useFilters();
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: historicalData, loading: historyLoading } = useRealtimeDevice(
    selectedDevice.device_id_unik,
    filters.startDate,
    filters.endDate
  );

  const getWaterLevelStatus = (tmatValue: number) => {
    if (tmatValue >= 400) {
      return { level: isIndonesian ? 'Ekstrim' : 'Extreme', color: '#EE0000', severity: 'extreme', range: '≥ 400 cm' };
    } else if (tmatValue >= 300) {
      return { level: isIndonesian ? 'Sangat Tinggi' : 'Very High', color: '#FFC000', severity: 'veryhigh', range: '300 - 399 cm' };
    } else if (tmatValue >= 200) {
      return { level: isIndonesian ? 'Tinggi' : 'High', color: '#FFFF00', severity: 'high', range: '200 - 299 cm' };
    } else if (tmatValue >= 100) {
      return { level: isIndonesian ? 'Sedang' : 'Medium', color: '#00B0F0', severity: 'medium', range: '100 - 199 cm' };
    } else if (tmatValue >= 50) {
      return { level: isIndonesian ? 'Rendah' : 'Low', color: '#00B050', severity: 'low', range: '50 - 99 cm' };
    } else {
      return { level: isIndonesian ? 'Tidak Beresiko' : 'No Risk', color: '#703CA0', severity: 'safe', range: '< 50 cm' };
    }
  };

  // Format historical data for chart if available
  const trendChartData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return [];
    }

    return historicalData.map(data => ({
      timestamp: new Date(data.timestamp_data).toLocaleDateString(isIndonesian ? 'id-ID' : 'en-US', {
        month: 'short',
        day: 'numeric'
      }),
      tmat: data.tmat_value,
      temperature: data.suhu_value,
      ph: data.ph_value,
      fullTimestamp: data.timestamp_data
    }));
  }, [historicalData, isIndonesian]);

  const currentStatus = realtimeData ? getWaterLevelStatus(realtimeData.tmat_value) : null;

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
                {selectedDevice.device_id_unik}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {selectedDevice.kota}, {selectedDevice.provinsi}
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
            {realtimeData && currentStatus && (
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
                        backgroundColor: `${currentStatus.color}20`,
                        color: currentStatus.color
                      }}
                    >
                      {currentStatus.level}
                    </div>
                  </div>

                  {/* TMAT Value */}
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">TMAT</p>
                    <div className="flex items-center gap-2">
                      <Droplet size={14} style={{ color: currentStatus.color }} />
                      <span className="text-sm font-bold text-slate-800">
                        {realtimeData.tmat_value.toFixed(2)} cm
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
                        {realtimeData.suhu_value.toFixed(1)}°C
                      </span>
                    </div>
                  </div>

                  {/* pH Value */}
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">pH</p>
                    <div className="flex items-center gap-2">
                      <TestTube size={14} className="text-blue-500" />
                      <span className="text-sm font-bold text-slate-800">
                        {realtimeData.ph_value.toFixed(2)}
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
                    {new Date(realtimeData.timestamp_data).toLocaleString(
                      isIndonesian ? 'id-ID' : 'en-US'
                    )}
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
              </h4>

              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
                  <span className="ml-2 text-sm text-slate-600">
                    {t('dashboard:analytics.loading')}
                  </span>
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
                  <span className="font-medium text-slate-800">{selectedDevice.device_id_unik}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.city')}:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.kota}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard:analytics.province')}:</span>
                  <span className="font-medium text-slate-800">{selectedDevice.provinsi}</span>
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

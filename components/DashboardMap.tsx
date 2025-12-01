import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Device, RealtimeData } from '../types';
import { useRealtimeAll } from '../services/useApi';
import { useFilters } from '../context/FilterContext';

// Custom water droplet marker icon with device count
const createWaterDropletIcon = (color: string = '#3b82f6', count?: number) => {
  const svgIcon = `
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path d="M16 2 C8 12, 4 18, 4 24 C4 30.627, 9.373 36, 16 36 C22.627 36, 28 30.627, 28 24 C28 18, 24 12, 16 2 Z" 
            fill="${color}" 
            stroke="white" 
            stroke-width="2" 
            filter="url(#shadow)"/>
      ${count && count > 1 ? `
        <circle cx="16" cy="20" r="8" fill="white" opacity="0.9"/>
        <text x="16" y="24" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}">${count}</text>
      ` : `
        <circle cx="20" cy="20" r="3" fill="white" opacity="0.4"/>
        <circle cx="12" cy="24" r="2" fill="white" opacity="0.3"/>
      `}
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'water-marker',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
};

// Water level status classification based on TMAT values
// TMAT value indicates water level depth (negative = below surface)
const getWaterLevelStatus = (tmatValue: number) => {
  if (tmatValue >= -0.2) {
    return { 
      level: 'Aman', 
      color: '#10b981', 
      range: '0 - 0.2 m',
      description: 'Normal water level - Safe',
      severity: 'safe'
    };
  } else if (tmatValue >= -0.4) {
    return { 
      level: 'Peringatan', 
      color: '#f59e0b', 
      range: '0.2 - 0.4 m',
      description: 'Moderate water level - Warning',
      severity: 'warning'
    };
  } else if (tmatValue >= -0.6) {
    return { 
      level: 'Bahaya', 
      color: '#f97316', 
      range: '0.4 - 0.6 m',
      description: 'High water level - Danger',
      severity: 'danger'
    };
  } else {
    return { 
      level: 'Kritis', 
      color: '#ef4444', 
      range: '> 0.6 m',
      description: 'Critical water level - Emergency',
      severity: 'critical'
    };
  }
};

interface Props {
  devices: Device[];
}

// Legend component
const WaterLevelLegend: React.FC<{ onToggle: () => void; isOpen: boolean }> = ({ onToggle, isOpen }) => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';

  return (
    <div className="absolute bottom-16 right-4 z-[1000] bg-white rounded-lg shadow-lg">
      {isOpen && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">
              {isIndonesian ? 'Status Ketinggian Air' : 'Water Level Status'}
            </h3>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 rounded-full bg-[#10b981] mt-0.5 flex-shrink-0"></div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">
                {isIndonesian ? 'Aman' : 'Safe'}
              </p>
              <p className="text-xs text-slate-500">TMAT ≥ -0.2</p>
              <p className="text-xs text-slate-600">
                {isIndonesian ? 'Tingkat air normal' : 'Normal water level'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-4 h-4 rounded-full bg-[#f59e0b] mt-0.5 flex-shrink-0"></div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">
                {isIndonesian ? 'Peringatan' : 'Warning'}
              </p>
              <p className="text-xs text-slate-500">-0.4 ≤ TMAT &lt; -0.2</p>
              <p className="text-xs text-slate-600">
                {isIndonesian ? 'Perlu perhatian' : 'Needs attention'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-4 h-4 rounded-full bg-[#f97316] mt-0.5 flex-shrink-0"></div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">
                {isIndonesian ? 'Bahaya' : 'Danger'}
              </p>
              <p className="text-xs text-slate-500">-0.6 ≤ TMAT &lt; -0.4</p>
              <p className="text-xs text-slate-600">
                {isIndonesian ? 'Tingkat air tinggi' : 'High water level'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-4 h-4 rounded-full bg-[#ef4444] mt-0.5 flex-shrink-0"></div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">
                {isIndonesian ? 'Kritis' : 'Critical'}
              </p>
              <p className="text-xs text-slate-500">TMAT &lt; -0.6</p>
              <p className="text-xs text-slate-600">
                {isIndonesian ? 'Tingkat air sangat tinggi' : 'Very high water level'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 italic">
              {isIndonesian 
                ? 'Ketinggian air dipantau secara terus-menerus dan diperbarui secara real-time'
                : 'Water levels are continuously monitored and updated in real-time'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardMap: React.FC<Props> = ({ devices }) => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';
  const { data: realtimeData, loading: realtimeLoading } = useRealtimeAll(undefined);
  const { filters } = useFilters();
  
  const [legendOpen, setLegendOpen] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  // Center on Indonesia roughly
  const center: [number, number] = [-2.5489, 118.0149];

  // Apply filters to devices
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      if (filters.provinsi && device.provinsi !== filters.provinsi) return false;
      if (filters.kabupaten && device.kabupaten !== filters.kabupaten) return false;
      if (filters.jenisPerusahaan && device.id_perusahaan.toString() !== filters.jenisPerusahaan) return false;
      return true;
    });
  }, [devices, filters]);

  // Debug logging
  useEffect(() => {
    console.log('[DashboardMap] Devices:', devices?.length);
    console.log('[DashboardMap] Filtered devices:', filteredDevices?.length);
    console.log('[DashboardMap] Realtime data:', realtimeData?.length);
    console.log('[DashboardMap] Loading:', realtimeLoading);
  }, [devices, filteredDevices, realtimeData, realtimeLoading]);

  // Create a map of device -> latest realtime data
  const deviceDataMap = useMemo(() => {
    const map = new Map<string, RealtimeData>();
    if (realtimeData) {
      realtimeData.forEach(data => {
        const existing = map.get(data.device_id_unik);
        if (!existing || new Date(data.timestamp_data) > new Date(existing.timestamp_data)) {
          map.set(data.device_id_unik, data);
        }
      });
    }
    return map;
  }, [realtimeData]);

  // Group devices by location (using lat/lng rounded to 3 decimals for clustering)
  const deviceGroups = useMemo(() => {
    const groups = new Map<string, Device[]>();
    filteredDevices.forEach(device => {
      const key = `${device.latitude.toFixed(3)},${device.longitude.toFixed(3)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(device);
    });
    return groups;
  }, [filteredDevices]);

  // Calculate statistics
  const stats = useMemo(() => {
    const statusCounts = {
      safe: 0,
      warning: 0,
      danger: 0,
      critical: 0,
      offline: 0
    };

    filteredDevices.forEach(device => {
      const rtData = deviceDataMap.get(device.device_id_unik);
      if (!rtData) {
        statusCounts.offline++;
        return;
      }
      const status = getWaterLevelStatus(rtData.tmat_value);
      statusCounts[status.severity as keyof typeof statusCounts]++;
    });

    return {
      total: filteredDevices.length,
      ...statusCounts
    };
  }, [filteredDevices, deviceDataMap]);

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 relative">
      {realtimeLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1001] bg-white/90 px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
            <span className="text-sm text-slate-700">
              {isIndonesian ? 'Memuat data...' : 'Loading data...'}
            </span>
          </div>
        </div>
      )}
      
      <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render heat zones as circle markers */}
        {filteredDevices.map((device) => {
          const rtData = deviceDataMap.get(device.device_id_unik);
          if (!rtData) {
            console.log('[DashboardMap] No realtime data for device:', device.device_id_unik);
            return null;
          }

          const status = getWaterLevelStatus(rtData.tmat_value);
          console.log('[DashboardMap] Rendering circle for:', device.device_id_unik, 'status:', status.level);
          
          return (
            <CircleMarker
              key={device.id}
              center={[device.latitude, device.longitude]}
              radius={15}
              pathOptions={{
                fillColor: status.color,
                fillOpacity: 0.6,
                color: status.color,
                weight: 2,
                opacity: 0.8
              }}
              eventHandlers={{
                click: () => setSelectedDevice(device.device_id_unik)
              }}
            >
              <Popup maxWidth={280} minWidth={240}>
                <div className="p-1">
                  <h3 className="font-bold text-slate-800 text-sm mb-2">{device.device_id_unik}</h3>
                  <p className="text-xs text-slate-600 mb-3">
                    {device.kota}, {device.provinsi}
                  </p>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">
                        {isIndonesian ? 'Status' : 'Status'}:
                      </span>
                      <div 
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ 
                          backgroundColor: `${status.color}20`, 
                          color: status.color 
                        }}
                      >
                        {status.level}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">
                        {isIndonesian ? 'Ketinggian' : 'Water Level'}:
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {status.range}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">TMAT:</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {rtData.tmat_value.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">
                        {isIndonesian ? 'Suhu' : 'Temperature'}:
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {rtData.suhu_value.toFixed(1)}°C
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">pH:</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {rtData.ph_value.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      {isIndonesian ? 'Terakhir diperbarui' : 'Last updated'}:
                    </p>
                    <p className="text-xs font-medium text-slate-700">
                      {rtData.timestamp_data}
                    </p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Render grouped device markers on top */}
        {Array.from(deviceGroups.entries()).map(([locationKey, groupDevices]) => {
          const firstDevice = groupDevices[0];
          const deviceCount = groupDevices.length;
          
          // Get the most critical status in the group
          let mostCriticalColor = '#06b6d4';
          groupDevices.forEach(device => {
            const rtData = deviceDataMap.get(device.device_id_unik);
            if (rtData) {
              const status = getWaterLevelStatus(rtData.tmat_value);
              if (status.severity === 'critical') mostCriticalColor = '#ef4444';
              else if (status.severity === 'danger' && mostCriticalColor !== '#ef4444') mostCriticalColor = '#f97316';
              else if (status.severity === 'warning' && mostCriticalColor === '#06b6d4') mostCriticalColor = '#f59e0b';
            }
          });

          return (
            <Marker 
              key={`marker-${locationKey}`}
              position={[firstDevice.latitude, firstDevice.longitude]} 
              icon={createWaterDropletIcon(mostCriticalColor, deviceCount)}
            >
              {deviceCount > 1 && (
                <Popup maxWidth={320} minWidth={280}>
                  <div className="p-2">
                    <h3 className="font-bold text-slate-800 text-sm mb-2">
                      {isIndonesian ? 'Grup Perangkat' : 'Device Group'}
                    </h3>
                    <p className="text-xs text-slate-600 mb-3">
                      {firstDevice.kota}, {firstDevice.provinsi}
                    </p>
                    <div className="mb-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                      <p className="text-xs text-emerald-700 font-semibold">
                        {deviceCount} {isIndonesian ? 'perangkat di lokasi ini' : 'devices at this location'}
                      </p>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {groupDevices.map(device => {
                        const rtData = deviceDataMap.get(device.device_id_unik);
                        const status = rtData ? getWaterLevelStatus(rtData.tmat_value) : null;
                        return (
                          <div key={device.id} className="flex items-center justify-between p-2 bg-slate-50 rounded hover:bg-slate-100 transition-colors">
                            <span className="text-xs font-medium text-slate-700">{device.device_id_unik}</span>
                            {status && (
                              <div 
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ 
                                  backgroundColor: `${status.color}20`, 
                                  color: status.color 
                                }}
                              >
                                {status.level}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      {/* Compact Statistics Button - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        {!statsOpen ? (
          <button
            onClick={() => setStatsOpen(true)}
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all border border-slate-200 p-3 flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.safe}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.warning}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#f97316]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.danger}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.critical}</span>
              </div>
            </div>
            <div className="pl-3 border-l border-slate-200">
              <span className="text-sm font-bold text-emerald-600">{stats.total}</span>
            </div>
          </button>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-4 min-w-[280px] max-w-[320px]">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {isIndonesian ? 'Statistik Perangkat' : 'Device Statistics'}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-emerald-600">{stats.total}</span>
                <button
                  onClick={() => setStatsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title={isIndonesian ? 'Tutup' : 'Close'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Aman' : 'Safe'}
                  </span>
                </div>
                <span className="text-sm font-bold text-green-700">{stats.safe}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Peringatan' : 'Warning'}
                  </span>
                </div>
                <span className="text-sm font-bold text-amber-700">{stats.warning}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Bahaya' : 'Danger'}
                  </span>
                </div>
                <span className="text-sm font-bold text-orange-700">{stats.danger}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Kritis' : 'Critical'}
                  </span>
                </div>
                <span className="text-sm font-bold text-red-700">{stats.critical}</span>
              </div>

              {stats.offline > 0 && (
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                    <span className="text-xs font-medium text-slate-700">
                      {isIndonesian ? 'Offline' : 'Offline'}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{stats.offline}</span>
                </div>
              )}
            </div>

            {(filters.provinsi || filters.kabupaten || filters.jenisPerusahaan) && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2 font-semibold">
                  {isIndonesian ? 'Filter Aktif:' : 'Active Filters:'}
                </p>
                <div className="space-y-1">
                  {filters.provinsi && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="font-medium">{filters.provinsi}</span>
                    </div>
                  )}
                  {filters.kabupaten && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="font-medium">{filters.kabupaten}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend Panel */}
      <WaterLevelLegend isOpen={legendOpen} onToggle={() => setLegendOpen(!legendOpen)} />

      {/* Info button in bottom right */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <button 
          className="bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow border border-slate-200"
          onClick={() => setLegendOpen(!legendOpen)}
          title={isIndonesian ? 'Toggle Legend' : 'Toggle Legend'}
        >
          <svg 
            className="w-5 h-5 text-slate-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DashboardMap;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Device, RealtimeData } from '../types';
import { useRealtimeAll } from '../services/useApi';

// Custom water droplet marker icon
const createWaterDropletIcon = (color: string = '#3b82f6') => {
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
      <circle cx="20" cy="20" r="3" fill="white" opacity="0.4"/>
      <circle cx="12" cy="24" r="2" fill="white" opacity="0.3"/>
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

const icon = createWaterDropletIcon('#06b6d4');

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
  
  const [legendOpen, setLegendOpen] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  // Center on Indonesia roughly
  const center: [number, number] = [-2.5489, 118.0149];

  // Debug logging
  useEffect(() => {
    console.log('[DashboardMap] Devices:', devices?.length);
    console.log('[DashboardMap] Realtime data:', realtimeData?.length);
    console.log('[DashboardMap] Loading:', realtimeLoading);
  }, [devices, realtimeData, realtimeLoading]);

  // Create a map of device -> latest realtime data
  const deviceDataMap = new Map<string, RealtimeData>();
  if (realtimeData) {
    realtimeData.forEach(data => {
      const existing = deviceDataMap.get(data.device_id_unik);
      if (!existing || new Date(data.timestamp_data) > new Date(existing.timestamp_data)) {
        deviceDataMap.set(data.device_id_unik, data);
      }
    });
  }

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
        {devices.map((device) => {
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

        {/* Render device markers on top */}
        {devices.map((device) => (
          <Marker 
            key={`marker-${device.id}`}
            position={[device.latitude, device.longitude]} 
            icon={icon}
          />
        ))}
      </MapContainer>

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
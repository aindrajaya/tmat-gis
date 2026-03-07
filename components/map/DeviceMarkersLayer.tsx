import React, { memo } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Device, RealtimeData } from '../../types';

interface DeviceMarkersLayerProps {
  deviceGroups: Map<string, Device[]>;
  deviceDataMap: Map<string, RealtimeData>;
  showMarkers: boolean;
  isLoading: boolean;
  isIndonesian: boolean;
  onDeviceSelect: (device: Device) => void;
  getWaterLevelStatus: (tmatValue: number) => {
    level: string;
    color: string;
    range: string;
    severity: string;
  };
  createWaterDropletIcon: (color: string, count?: number) => L.DivIcon;
}

/**
 * Memoized Device Markers Layer Component
 * Only re-renders when device groups data or visibility changes
 */
const DeviceMarkersLayer: React.FC<DeviceMarkersLayerProps> = memo(({ 
  deviceGroups, 
  deviceDataMap,
  showMarkers,
  isLoading,
  isIndonesian,
  onDeviceSelect,
  getWaterLevelStatus,
  createWaterDropletIcon
}) => {
  const map = useMap();
  
  const closePopup = () => {
    if (map) {
      map.closePopup();
    }
  };
  
  if (!showMarkers || isLoading) return null;

  return (
    <>
      {Array.from(deviceGroups.entries()).map(([locationKey, groupDevices]: [string, Device[]]) => {
        const firstDevice = groupDevices[0];
        const deviceCount = groupDevices.length;
        
        // Get the most critical status in the group using exact status colors
        let mostCriticalColor = '#06b6d4'; // Default cyan
        let mostCriticalSeverityLevel = -1; // Start at -1 so even 'safe' (0) can be selected

        const severityOrder = { 
          safe: 0, 
          low: 1, 
          medium: 2, 
          high: 3, 
          veryhigh: 4, 
          extreme: 5 
        };

        groupDevices.forEach(device => {
          const rtData = deviceDataMap.get(device.device_id_unik);
          if (rtData) {
            const status = getWaterLevelStatus(rtData.tmat_value, isIndonesian);
            const severityLevel = severityOrder[status.severity as keyof typeof severityOrder] || 0;
            
            // Update if this status is more critical than current (use exact color from status)
            if (severityLevel > mostCriticalSeverityLevel) {
              mostCriticalColor = status.color; // Use exact color from getWaterLevelStatus
              mostCriticalSeverityLevel = severityLevel;
            }
          }
        });

        return (
          <Marker 
            key={`marker-${locationKey}`}
            position={[firstDevice.latitude, firstDevice.longitude]} 
            icon={createWaterDropletIcon(mostCriticalColor, deviceCount)}
          >
            {deviceCount > 1 ? (
              <Popup maxWidth={320} minWidth={280} closeButton={false}>
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-800 text-sm flex-1">
                      {isIndonesian ? 'Grup Perangkat' : 'Device Group'}
                    </h3>
                    <button
                      onClick={closePopup}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors ml-2"
                      title="Close"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
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
                        <button
                          key={device.id}
                          onClick={() => onDeviceSelect(device)}
                          className="w-full flex items-center justify-between p-2 bg-slate-50 rounded hover:bg-emerald-100 transition-colors text-left peer group/item"
                        >
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
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Popup>
            ) : (
              <Popup maxWidth={320} minWidth={280} closeButton={false}>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-sm">
                        {firstDevice.device_id_unik}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        {firstDevice.kota}, {firstDevice.provinsi}
                      </p>
                    </div>
                    <button
                      onClick={closePopup}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors ml-2"
                      title="Close"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mb-3 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-700">
                        {isIndonesian ? 'Status' : 'Status'}
                      </span>
                      {deviceDataMap.has(firstDevice.device_id_unik) && (
                        <span className="text-xs font-bold text-emerald-700">
                          {getWaterLevelStatus(deviceDataMap.get(firstDevice.device_id_unik)?.tmat_value || 0).level}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {deviceDataMap.has(firstDevice.device_id_unik) ? (
                      <>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-xs text-slate-600">
                            {isIndonesian ? 'Nilai TMAT' : 'TMAT Value'}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {deviceDataMap.get(firstDevice.device_id_unik)?.tmat_value.toFixed(2)} cm
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-xs text-slate-600">
                            {isIndonesian ? 'Waktu Update' : 'Last Update'}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {new Date(deviceDataMap.get(firstDevice.device_id_unik)?.timestamp || '').toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => onDeviceSelect(firstDevice)}
                          className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:shadow-lg transition-shadow"
                        >
                          {isIndonesian ? 'Lihat Detail' : 'View Details'}
                        </button>
                      </>
                    ) : (
                      <div className="p-2 bg-slate-50 rounded text-center">
                        <p className="text-xs text-slate-500 italic">
                          {isIndonesian ? 'Data tidak tersedia' : 'No data available'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.deviceGroups === nextProps.deviceGroups &&
    prevProps.deviceDataMap === nextProps.deviceDataMap &&
    prevProps.showMarkers === nextProps.showMarkers &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isIndonesian === nextProps.isIndonesian
  );
});

DeviceMarkersLayer.displayName = 'DeviceMarkersLayer';

export default DeviceMarkersLayer;

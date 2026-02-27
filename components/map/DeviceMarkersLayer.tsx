import React, { memo } from 'react';
import { Marker, Popup } from 'react-leaflet';
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
  if (!showMarkers || isLoading) return null;

  return (
    <>
      {Array.from(deviceGroups.entries()).map(([locationKey, groupDevices]: [string, Device[]]) => {
        const firstDevice = groupDevices[0];
        const deviceCount = groupDevices.length;
        
        // Get the most critical status in the group (prioritize severity)
        let mostCriticalColor = '#06b6d4';
        groupDevices.forEach(device => {
          const rtData = deviceDataMap.get(device.device_id_unik);
          if (rtData) {
            const status = getWaterLevelStatus(rtData.tmat_value);
            if (status.severity === 'extreme') mostCriticalColor = '#EE0000';
            else if (status.severity === 'veryhigh' && mostCriticalColor !== '#EE0000') mostCriticalColor = '#FFC000';
            else if (status.severity === 'high' && !['#EE0000', '#FFC000'].includes(mostCriticalColor)) mostCriticalColor = '#FFFF00';
            else if (status.severity === 'medium' && !['#EE0000', '#FFC000', '#FFFF00'].includes(mostCriticalColor)) mostCriticalColor = '#00B0F0';
            else if (status.severity === 'low' && !['#EE0000', '#FFC000', '#FFFF00', '#00B0F0'].includes(mostCriticalColor)) mostCriticalColor = '#00B050';
          }
        });

        return (
          <Marker 
            key={`marker-${locationKey}`}
            position={[firstDevice.latitude, firstDevice.longitude]} 
            icon={createWaterDropletIcon(mostCriticalColor, deviceCount)}
          >
            {deviceCount > 1 ? (
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
              <Popup maxWidth={320} minWidth={280}>
                <div className="p-3">
                  <h3 className="font-bold text-slate-800 text-sm mb-1">
                    {firstDevice.device_id_unik}
                  </h3>
                  <p className="text-xs text-slate-600 mb-3">
                    {firstDevice.kota}, {firstDevice.provinsi}
                  </p>
                  
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

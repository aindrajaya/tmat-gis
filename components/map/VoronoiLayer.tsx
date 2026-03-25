import React, { memo } from 'react';
import { Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Device, RealtimeData } from '../../types';

interface VoronoiPolygonData {
  device: Device;
  polygon: [number, number][];
  rtData: RealtimeData | null;
  status: {
    level: string;
    color: string;
    range: string;
  };
  polygonCoords: [number, number][];
}

interface VoronoiLayerProps {
  polygons: VoronoiPolygonData[];
  isLoading: boolean;
  onPolygonClick: (device: Device) => void;
  isIndonesian: boolean;
}

const formatMetric = (value: number, digits: number, suffix = ''): string =>
  Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : '—';

const getDeviceLocationLabel = (device: Device): string => {
  return [device.desa, device.kabupaten_id, device.provinsi_id].filter(Boolean).join(', ') || 'Unknown';
};

const getDeviceDisplayLabel = (device: Device): string => {
  return `Device ${device.kode_titik || device.device_id_unik}`;
};

/**
 * Memoized Voronoi Layer Component
 * Only re-renders when polygons data actually changes
 * Prevents expensive re-renders of all polygon elements
 */
const VoronoiLayer: React.FC<VoronoiLayerProps> = memo(({ 
  polygons, 
  isLoading, 
  onPolygonClick,
  isIndonesian 
}) => {
  const map = useMap();
  
  const closePopup = () => {
    if (map) {
      map.closePopup();
    }
  };
  
  if (isLoading) return null;

  return (
    <>
      {polygons.map((data, index) => {
        if (!data) return null;
        const { device, rtData, status, polygonCoords } = data;

        return (
          <Polygon
            key={`polygon-${device.id}`}
            positions={polygonCoords as any}
            pathOptions={{
              fillColor: status.color,
              fillOpacity: 0.4,
              color: status.color,
              weight: 2,
              opacity: 0.7
            }}
            eventHandlers={{
              click: () => onPolygonClick(device)
            }}
          >
            <Popup maxWidth={280} minWidth={240} closeButton={false}>
              <div className="p-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-sm flex-1">{getDeviceDisplayLabel(device)}</h3>
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
                  {getDeviceLocationLabel(device)}
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
                  
                  {rtData ? (
                    <>
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
                          {formatMetric(rtData.tmat_value, 2, ' cm')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          {isIndonesian ? 'Suhu' : 'Temperature'}:
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {formatMetric(rtData.suhu_value, 1, '°C')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          {isIndonesian ? 'Curah Hujan' : 'Rainfall'}:
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {formatMetric(rtData.curah_hujan, 1, ' mm')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          {isIndonesian ? 'Kelembapan' : 'Humidity'}:
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {formatMetric(rtData.kelembapan, 1, '%')}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500">
                          {isIndonesian ? 'Terakhir diperbarui' : 'Last updated'}:
                        </p>
                        <p className="text-xs font-medium text-slate-700">
                          {rtData.timestamp_data}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="pt-2 pb-2">
                      <p className="text-xs text-slate-500 italic text-center">
                        {isIndonesian ? 'Tidak ada data realtime tersedia' : 'No realtime data available'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Only re-render if polygons data reference changes or loading state changes
  return (
    prevProps.polygons === nextProps.polygons &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isIndonesian === nextProps.isIndonesian
  );
});

VoronoiLayer.displayName = 'VoronoiLayer';

export default VoronoiLayer;

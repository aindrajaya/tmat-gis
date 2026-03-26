import React, { memo, useCallback } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';

interface CityStats {
  safe: number;
  low: number;
  medium: number;
  high: number;
  veryhigh: number;
  extreme: number;
  offline: number;
}

interface CityData {
  city: string;
  provinsi: string;
  centerLat: number;
  centerLng: number;
  devices: any[];
  stats: CityStats;
}

interface CityMarkersLayerProps {
  cityGroups: Map<string, CityData>;
  isLoading: boolean;
  isIndonesian: boolean;
  onCityClick: (cityName: string) => void;
}

// Individual City Marker Component with Map Access
const CityMarkerComponent: React.FC<{
  cityKey: string;
  cityData: CityData;
  markerColor: string;
  isIndonesian: boolean;
  onCityClick: (cityName: string) => void;
}> = memo(({ cityKey, cityData, markerColor, isIndonesian, onCityClick }) => {
  const map = useMap();
  const { t } = useTranslation();
  const total = cityData.devices.length;
  const { stats } = cityData;

  const handleClick = useCallback((e: L.LeafletMouseEvent) => {
    // Stop event propagation to prevent polygon clicks
    e.originalEvent?.stopPropagation();
    
    // Update selected city in context first
    onCityClick(cityData.city);
    
    // Use setTimeout to ensure zoom happens after React batching
    setTimeout(() => {
      // Offset the latitude slightly to account for UI elements at the top
      const offsetLat = cityData.centerLat + 0.015;
      
      map.setView([offsetLat, cityData.centerLng], 11, {
        animate: true
      });
    }, 100);
  }, [cityData, map, onCityClick]);

  const closePopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (map) {
      map.closePopup();
    }
  };

  return (
    <Marker
      key={`city-${cityKey}`}
      position={[cityData.centerLat, cityData.centerLng]}
      icon={L.divIcon({
        html: `
          <div style="
            background-color: rgba(255, 255, 255, 0.45);
            border: 1px solid ${markerColor};
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            font-weight: bold;
            font-size: 14px;
            color: ${markerColor};
            cursor: pointer;
            transition: all 0.2s ease;
          "
          onmouseover="this.style.transform='scale(1.1)'; this.style.backgroundColor='rgba(255, 255, 255, 0.95)';"
          onmouseout="this.style.transform='scale(1)'; this.style.backgroundColor='rgba(255, 255, 255, 0.85)';"
          >
            ${total}
          </div>
        `,
        className: 'city-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      })}
      eventHandlers={{
        click: handleClick
      }}
    >
      <Popup maxWidth={320} minWidth={280} closeButton={false}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-base">
                {cityData.city}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{cityData.provinsi}</p>
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
          
          <div className="mb-3">
            <p className="text-sm font-semibold text-slate-700 mb-2">
              {isIndonesian ? 'Total Perangkat' : 'Total Devices'}: {total}
            </p>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#703CA0' }}></div>
                <span className="text-slate-600">
                  {isIndonesian ? 'Aman' : 'Safe'}: {stats.safe}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00B050' }}></div>
                <span className="text-slate-600">
                  {isIndonesian ? 'Rendah' : 'Low'}: {stats.low}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00B0F0' }}></div>
                <span className="text-slate-600">
                  {isIndonesian ? 'Sedang' : 'Medium'}: {stats.medium}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F2D335' }}></div>
                <span className="text-slate-600">
                  {isIndonesian ? 'Tinggi' : 'High'}: {stats.high}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFC000' }}></div>
                <span className="text-slate-600">
                  {isIndonesian ? 'Sangat Tinggi' : 'Very High'}: {stats.veryhigh}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EE0000' }}></div>
                <span className="text-slate-600">
                  {isIndonesian ? 'Ekstrim' : 'Extreme'}: {stats.extreme}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                <span className="text-slate-600">
                  {isIndonesian ? 'Offline' : 'Offline'}: {stats.offline}
                </span>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 italic">
            {isIndonesian ? 'Klik untuk zoom ke lokasi' : 'Click to zoom to location'}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}, (prevProps, nextProps) => {
  // Only re-render if props actually changed
  return (
    prevProps.cityKey === nextProps.cityKey &&
    prevProps.markerColor === nextProps.markerColor &&
    prevProps.isIndonesian === nextProps.isIndonesian &&
    prevProps.cityData === nextProps.cityData
  );
});

CityMarkerComponent.displayName = 'CityMarkerComponent';

/**
 * Memoized City Markers Layer Component
 * Only re-renders when cityGroups data actually changes
 */
const CityMarkersLayer: React.FC<CityMarkersLayerProps> = memo(({ 
  cityGroups, 
  isLoading,
  isIndonesian,
  onCityClick
}) => {
  if (isLoading) return null;

  return (
    <>
      {Array.from(cityGroups.entries()).map(([cityKey, cityData]) => {
        const { stats } = cityData;
        
        // Determine color based on most dominant status (prioritize severity)
        let markerColor = '#06b6d4'; // default cyan
        const statusCounts = [
          { color: '#EE0000', count: stats.extreme },     // red - extreme
          { color: '#FFC000', count: stats.veryhigh },    // orange - very high
          { color: '#F2D335', count: stats.high },        // yellow - high
          { color: '#00B0F0', count: stats.medium },      // light blue - medium
          { color: '#00B050', count: stats.low },         // green - low
          { color: '#703CA0', count: stats.safe },        // purple - no risk
          { color: '#94a3b8', count: stats.offline }      // gray - offline
        ];
        
        // Find the status with the highest count (highest priority)
        const dominant = statusCounts.reduce((max, current) => 
          current.count > max.count ? current : max
        );
        
        if (dominant.count > 0) {
          markerColor = dominant.color;
        }

        return (
          <CityMarkerComponent
            key={`city-marker-${cityKey}`}
            cityKey={cityKey}
            cityData={cityData}
            markerColor={markerColor}
            isIndonesian={isIndonesian}
            onCityClick={onCityClick}
          />
        );
      })}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.cityGroups === nextProps.cityGroups &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isIndonesian === nextProps.isIndonesian
  );
});

CityMarkersLayer.displayName = 'CityMarkersLayer';

export default CityMarkersLayer;

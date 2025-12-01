import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Delaunay } from 'd3-delaunay';
import { Filter, Calendar, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { Device, RealtimeData } from '../types';
import { useRealtimeAll } from '../services/useApi';
import { useFilters } from '../context/FilterContext';

// Voronoi tessellation using d3-delaunay (efficient implementation)
const createVoronoiPolygons = (devices: Device[], bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => {
  if (devices.length === 0) return [];
  if (devices.length === 1) {
    // Single device - create bounding box
    return [{
      device: devices[0],
      polygon: [
        [bounds.minLat, bounds.minLng],
        [bounds.minLat, bounds.maxLng],
        [bounds.maxLat, bounds.maxLng],
        [bounds.maxLat, bounds.minLng],
      ] as [number, number][]
    }];
  }
  
  // Prepare points for Delaunay triangulation
  const points: [number, number][] = devices.map(d => [d.longitude, d.latitude]);
  
  // Create Delaunay triangulation
  const delaunay = Delaunay.from(points);
  
  // Create Voronoi diagram
  const voronoi = delaunay.voronoi([bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat]);
  
  // Extract polygons for each device
  const voronoiPolygons: Array<{ device: Device; polygon: [number, number][] }> = [];
  
  devices.forEach((device, index) => {
    const cell = voronoi.cellPolygon(index);
    if (cell) {
      // Convert from [lng, lat] to [lat, lng] for Leaflet
      const polygon = cell.map(([lng, lat]) => [lat, lng] as [number, number]);
      voronoiPolygons.push({ device, polygon });
    }
  });
  
  return voronoiPolygons;
};

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

// Component to handle automatic map bounds fitting
const MapBoundsHandler: React.FC<{ devices: Device[] }> = ({ devices }) => {
  const map = useMap();

  useEffect(() => {
    if (devices && devices.length > 0) {
      const bounds = L.latLngBounds(
        devices.map(d => [d.latitude, d.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [devices, map]);

  return null;
};

// Legend component
const WaterLevelLegend: React.FC<{ onToggle: () => void; isOpen: boolean }> = ({ onToggle, isOpen }) => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';

  return (
    <div className="absolute bottom-16 right-4 z-[1000] bg-white rounded-lg shadow-lg">
      {isOpen && (
        <div className="p-3 space-y-2 max-w-[240px]">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs">
              {isIndonesian ? 'Status Ketinggian Air' : 'Water Level Status'}
            </h3>
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title={isIndonesian ? 'Tutup' : 'Close'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#10b981] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Aman' : 'Safe'}
              </p>
              <p className="text-[10px] text-slate-500">TMAT ≥ -0.2</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Peringatan' : 'Warning'}
              </p>
              <p className="text-[10px] text-slate-500">-0.4 ≤ TMAT &lt; -0.2</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f97316] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Bahaya' : 'Danger'}
              </p>
              <p className="text-[10px] text-slate-500">-0.6 ≤ TMAT &lt; -0.4</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ef4444] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Kritis' : 'Critical'}
              </p>
              <p className="text-[10px] text-slate-500">TMAT &lt; -0.6</p>
            </div>
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
  const { filters, updateFilter } = useFilters();
  
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showMarkers, setShowMarkers] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Center on Indonesia roughly
  const center: [number, number] = [-2.5489, 118.0149];

  // Force map re-render when realtime data loads
  useEffect(() => {
    if (realtimeData && realtimeData.length > 0) {
      console.log('[DashboardMap] Realtime data loaded, forcing map update');
      setMapKey(prev => prev + 1);
    }
  }, [realtimeData]);

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

  // Create Voronoi polygons for each device
  const voronoiPolygons = useMemo(() => {
    if (filteredDevices.length === 0) return [];
    
    // Calculate bounds from devices with tighter constraints
    const lats = filteredDevices.map(d => d.latitude);
    const lngs = filteredDevices.map(d => d.longitude);
    
    // Calculate center point
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    
    // Calculate average distance between devices
    let totalDist = 0;
    let count = 0;
    for (let i = 0; i < filteredDevices.length; i++) {
      for (let j = i + 1; j < filteredDevices.length; j++) {
        const dist = Math.sqrt(
          Math.pow(filteredDevices[i].latitude - filteredDevices[j].latitude, 2) +
          Math.pow(filteredDevices[i].longitude - filteredDevices[j].longitude, 2)
        );
        totalDist += dist;
        count++;
      }
    }
    const avgDist = count > 0 ? totalDist / count : 1;
    
    // Use dynamic padding based on device density, with max limit
    const padding = Math.min(avgDist * 1.5, 1.0); // Maximum 1 degree padding
    
    const bounds = {
      minLat: Math.min(...lats) - padding,
      maxLat: Math.max(...lats) + padding,
      minLng: Math.min(...lngs) - padding,
      maxLng: Math.max(...lngs) + padding,
    };
    
    // Generate Voronoi polygons
    const voronoi = createVoronoiPolygons(filteredDevices, bounds);
    
    // Attach realtime data and status to each polygon, with size constraint
    return voronoi.map(({ device, polygon }) => {
      const rtData = deviceDataMap.get(device.device_id_unik);
      if (!rtData) return null;

      const status = getWaterLevelStatus(rtData.tmat_value);
      
      // Clip polygon to reasonable size (max 0.005 degrees from device center)
      const maxRadius = 0.005;
      const clippedPolygon = polygon.map(([lat, lng]) => {
        const distLat = lat - device.latitude;
        const distLng = lng - device.longitude;
        const dist = Math.sqrt(distLat * distLat + distLng * distLng);
        
        if (dist > maxRadius) {
          // Scale back to max radius
          const scale = maxRadius / dist;
          return [
            device.latitude + distLat * scale,
            device.longitude + distLng * scale
          ] as [number, number];
        }
        return [lat, lng] as [number, number];
      });

      return {
        device,
        rtData,
        status,
        polygonCoords: clippedPolygon
      };
    }).filter(Boolean);
  }, [filteredDevices, deviceDataMap]);

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

  // Group devices by city with center coordinates and statistics
  const cityGroups = useMemo(() => {
    const cities = new Map<string, {
      city: string;
      provinsi: string;
      devices: Device[];
      centerLat: number;
      centerLng: number;
      stats: {
        safe: number;
        warning: number;
        danger: number;
        critical: number;
        offline: number;
      };
    }>();

    filteredDevices.forEach(device => {
      const cityKey = `${device.kota}, ${device.provinsi}`;
      if (!cities.has(cityKey)) {
        cities.set(cityKey, {
          city: device.kota,
          provinsi: device.provinsi,
          devices: [],
          centerLat: 0,
          centerLng: 0,
          stats: {
            safe: 0,
            warning: 0,
            danger: 0,
            critical: 0,
            offline: 0
          }
        });
      }
      cities.get(cityKey)!.devices.push(device);
    });

    // Calculate center coordinates and statistics for each city
    cities.forEach((cityData, cityKey) => {
      const lats = cityData.devices.map(d => d.latitude);
      const lngs = cityData.devices.map(d => d.longitude);
      cityData.centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      cityData.centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

      // Calculate statistics
      cityData.devices.forEach(device => {
        const rtData = deviceDataMap.get(device.device_id_unik);
        if (!rtData) {
          cityData.stats.offline++;
          return;
        }
        const status = getWaterLevelStatus(rtData.tmat_value);
        cityData.stats[status.severity as keyof typeof cityData.stats]++;
      });
    });

    return cities;
  }, [filteredDevices, deviceDataMap]);

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
    <div className={`${isExpanded ? 'h-[800px]' : 'h-[500px]'} w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 relative transition-all duration-300`}>
      {/* Filter Panel - Top of Map */}
      <div className="absolute top-3 left-12 right-4 z-[1000]">
        {/* Filter Toggle Button */}
        {!filterOpen ? (
          <button
            onClick={() => setFilterOpen(true)}
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all border border-slate-200 px-4 py-2.5 flex items-center gap-2"
          >
            <Filter size={18} className="text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">
              {isIndonesian ? 'Filter Data' : 'Filter Data'}
            </span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>
        ) : (
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  {isIndonesian ? 'Filter Data' : 'Filter Data'}
                </h3>
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronUp size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Province Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">
                  {isIndonesian ? 'Provinsi' : 'Province'}
                </label>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={filters.provinsi}
                  onChange={(e) => updateFilter('provinsi', e.target.value)}
                >
                  <option value="">{isIndonesian ? 'Semua Provinsi' : 'All Provinces'}</option>
                  <option value="Jawa Timur">Jawa Timur</option>
                  <option value="Riau">Riau</option>
                  <option value="Kalimantan Tengah">Kalimantan Tengah</option>
                  <option value="Jambi">Jambi</option>
                </select>
              </div>

              {/* Regency Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">
                  {isIndonesian ? 'Kabupaten' : 'Regency'}
                </label>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={filters.kabupaten}
                  onChange={(e) => updateFilter('kabupaten', e.target.value)}
                >
                  <option value="">{isIndonesian ? 'Semua Kabupaten' : 'All Regencies'}</option>
                  <option value="Surabaya">Surabaya</option>
                  <option value="Pekanbaru">Pekanbaru</option>
                  <option value="Palangka">Palangka</option>
                </select>
              </div>

              {/* Company Type Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">
                  {isIndonesian ? 'Jenis Perusahaan' : 'Company Type'}
                </label>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={filters.jenis_perusahaan}
                  onChange={(e) => updateFilter('jenis_perusahaan', e.target.value)}
                >
                  <option value="">{isIndonesian ? 'Semua Jenis' : 'All Types'}</option>
                  <option value="PBPH">PBPH</option>
                  <option value="Perkebunan">Perkebunan</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">
                  {isIndonesian ? 'Rentang Tanggal' : 'Date Range'}
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    className="bg-slate-50 border border-slate-200 rounded-md px-2 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1"
                    value={filters.startDate}
                    onChange={(e) => updateFilter('startDate', e.target.value)}
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input 
                    type="date" 
                    className="bg-slate-50 border border-slate-200 rounded-md px-2 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1"
                    value={filters.endDate}
                    onChange={(e) => updateFilter('endDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
      
      <MapContainer 
        key={mapKey}
        center={center} 
        zoom={5} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsHandler devices={filteredDevices} />
        
        {/* Render Voronoi Polygons - Water Level Zones */}
        {!realtimeLoading && voronoiPolygons.map((data, index) => {
          if (!data) return null;
          const { device, rtData, status, polygonCoords } = data;
          
          console.log('[DashboardMap] Rendering polygon for:', device.device_id_unik, 'status:', status.level);
          
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
            </Polygon>
          );
        })}

        {/* Render city-level markers - Always visible */}
        {!realtimeLoading && Array.from(cityGroups.entries()).map(([cityKey, cityData]) => {
          const total = cityData.devices.length;
          const { stats } = cityData;
          
          // Determine most critical status color
          let markerColor = '#06b6d4'; // default cyan
          if (stats.critical > 0) markerColor = '#ef4444';
          else if (stats.danger > 0) markerColor = '#f97316';
          else if (stats.warning > 0) markerColor = '#f59e0b';
          else if (stats.safe > 0) markerColor = '#10b981';

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
                click: (e) => {
                  const map = e.target._map;
                  // Zoom to city location
                  map.setView([cityData.centerLat, cityData.centerLng], 12, {
                    animate: true,
                    duration: 1
                  });
                }
              }}
            >
              <Popup maxWidth={320} minWidth={280}>
                <div className="p-3">
                  <h3 className="font-bold text-slate-800 text-base mb-1">
                    {cityData.city}
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">{cityData.provinsi}</p>
                  
                  <div className="mb-3 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-800">
                        {isIndonesian ? 'Total Perangkat' : 'Total Devices'}
                      </span>
                      <span className="text-xl font-bold text-emerald-600">{total}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">
                      {isIndonesian ? 'Statistik Status:' : 'Status Statistics:'}
                    </h4>
                    
                    {stats.safe > 0 && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                          <span className="text-xs font-medium text-slate-700">
                            {isIndonesian ? 'Aman' : 'Safe'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-green-700">{stats.safe}</span>
                      </div>
                    )}

                    {stats.warning > 0 && (
                      <div className="flex items-center justify-between p-2 bg-amber-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
                          <span className="text-xs font-medium text-slate-700">
                            {isIndonesian ? 'Peringatan' : 'Warning'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-amber-700">{stats.warning}</span>
                      </div>
                    )}

                    {stats.danger > 0 && (
                      <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
                          <span className="text-xs font-medium text-slate-700">
                            {isIndonesian ? 'Bahaya' : 'Danger'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-orange-700">{stats.danger}</span>
                      </div>
                    )}

                    {stats.critical > 0 && (
                      <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                          <span className="text-xs font-medium text-slate-700">
                            {isIndonesian ? 'Kritis' : 'Critical'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-red-700">{stats.critical}</span>
                      </div>
                    )}

                    {stats.offline > 0 && (
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
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

                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-500 italic">
                      {isIndonesian 
                        ? 'Klik pada zona warna untuk detail perangkat'
                        : 'Click on colored zones for device details'}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render grouped device markers on top - Conditional */}
        {showMarkers && !realtimeLoading && Array.from(deviceGroups.entries()).map(([locationKey, groupDevices]: [string, Device[]]) => {
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

      {/* Settings Panel - Bottom Left (above stats) */}
      {settingsOpen && (
        <div className="absolute bottom-32 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 min-w-[280px]">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isIndonesian ? 'Pengaturan Peta' : 'Map Settings'}
            </h3>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title={isIndonesian ? 'Tutup' : 'Close'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium text-slate-700">
                  {isIndonesian ? 'Tampilkan Marker' : 'Show Markers'}
                </span>
              </div>
              <button
                onClick={() => setShowMarkers(!showMarkers)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showMarkers ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showMarkers ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500 italic">
                {isIndonesian 
                  ? 'Aktifkan marker untuk melihat ikon perangkat di peta'
                  : 'Enable markers to see device icons on the map'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Statistics Button - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2">
        {/* Settings Toggle Button */}
        <button
          onClick={() => {
            setSettingsOpen(!settingsOpen);
            if (!settingsOpen) setStatsOpen(false); // Close stats when opening settings
          }}
          className={`bg-white rounded-lg shadow-lg hover:shadow-xl transition-all border border-slate-200 p-2.5 flex items-center justify-center ${
            settingsOpen ? 'bg-emerald-50 border-emerald-300' : ''
          }`}
          title={isIndonesian ? 'Pengaturan' : 'Settings'}
        >
          <svg className={`w-5 h-5 ${settingsOpen ? 'text-emerald-600' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Stats Panel */}
        {!statsOpen ? (
          <button
            onClick={() => {
              setStatsOpen(true);
              setSettingsOpen(false); // Close settings when opening stats
            }}
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
                  onClick={() => {
                    setStatsOpen(false);
                    setSettingsOpen(false); // Also close settings
                  }}
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

      {/* Info and Expand buttons in bottom right */}
      <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
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
        <button 
          className="bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow border border-slate-200"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? (isIndonesian ? 'Perkecil Peta' : 'Minimize Map') : (isIndonesian ? 'Perbesar Peta' : 'Expand Map')}
        >
          {isExpanded ? (
            <Minimize2 size={20} className="text-slate-600" />
          ) : (
            <Maximize2 size={20} className="text-slate-600" />
          )}
        </button>
      </div>
    </div>
  );
};

export default DashboardMap;
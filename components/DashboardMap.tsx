import React, { useState, useEffect, useMemo, forwardRef, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.vectorgrid';
import Pbf from 'pbf';
import { VectorTile } from 'vector-tile';
import { Delaunay } from 'd3-delaunay';
import { Filter, Calendar, ChevronDown, ChevronUp, Maximize2, Minimize2, Layers } from 'lucide-react';
import { Device, RealtimeData } from '../types';
import { useRealtimeAll } from '../services/useApi';
import { useFilters } from '../context/FilterContext';
import { useAuth } from '../context/AuthContext';
import AdvancedFilterPanel from './AdvancedFilterPanel';

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
  if (tmatValue >= 0) {
    return { 
      level: 'Tidak Beresiko', 
      color: '#703CA0', 
      range: '0 cm',
      description: 'No risk - Safe',
      severity: 'safe'
    };
  } else if (tmatValue >= -0.2) {
    return { 
      level: 'Rendah', 
      color: '#00B050', 
      range: '0 - 20 cm',
      description: 'Low water level - Safe',
      severity: 'low'
    };
  } else if (tmatValue >= -0.4) {
    return { 
      level: 'Sedang', 
      color: '#00B0F0', 
      range: '20 - 40 cm',
      description: 'Moderate water level - Warning',
      severity: 'medium'
    };
  } else if (tmatValue >= -0.6) {
    return { 
      level: 'Tinggi', 
      color: '#FFFF00', 
      range: '40 - 60 cm',
      description: 'High water level - Danger',
      severity: 'high'
    };
  } else if (tmatValue >= -0.8) {
    return { 
      level: 'Sangat Tinggi', 
      color: '#FFC000', 
      range: '60 - 80 cm',
      description: 'Very high water level - Emergency',
      severity: 'veryhigh'
    };
  } else {
    return { 
      level: 'Ekstrim', 
      color: '#EE0000', 
      range: '> 80 cm',
      description: 'Extreme water level - Critical',
      severity: 'extreme'
    };
  }
};

interface Props {
  devices: Device[];
  heightClass?: string;
}

// Component to handle automatic map bounds fitting
const MapBoundsHandler: React.FC<{ devices: Device[] }> = ({ devices }) => {
  const map = useMap();

  useEffect(() => {
    if (devices && devices.length > 0) {
      const bounds = L.latLngBounds(
        devices.map(d => [d.latitude, d.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, [devices, map]);

  return null;
};

const VectorTileLayer: React.FC<{
  filters?: { provinsi?: string; kabupaten?: string; kecamatan?: string };
}> = ({ filters }) => {
  const safeFilters = {
    provinsi: filters?.provinsi || '',
    kabupaten: filters?.kabupaten || '',
    kecamatan: filters?.kecamatan || ''
  };
  const map = useMap();
  const hoverIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    const getBaseStyle = (zoom: number) => {
      const weight = zoom <= 10 ? 0.1 : zoom <= 14 ? 0.8 : 1;
      return {
        weight,
        color: '#121a64',
        fill: true,
        fillColor: '#3498db',
        fillOpacity: 0.2
      };
    };

    const getHoverStyle = (zoom: number) => {
      const weight = zoom <= 10 ? 0.8 : zoom <= 14 ? 1.2 : 1.6;
      return {
        weight,
        color: '#121a64',
        fill: true,
        fillColor: '#5dade2',
        fillOpacity: 0.2
      };
    };

    const buildIdFromProps = (props: Record<string, unknown> | undefined) => {
      const province = typeof props?.province === 'string' ? props.province : '';
      const district = typeof props?.district === 'string' ? props.district : '';
      const subDistrict = typeof props?.sub_district === 'string' ? props.sub_district : '';
      const village = typeof props?.village === 'string' ? props.village : '';
      const composite = [province, district, subDistrict, village].filter(Boolean).join('|');
      return composite || null;
    };

    const SafeVectorGrid = (L as any).VectorGrid.Protobuf.extend({
      _getVectorTilePromise: function (coords: { x: number; y: number; z: number }) {
        const maxNativeZoom = typeof this.options.maxNativeZoom === 'number' ? this.options.maxNativeZoom : coords.z;
        let x = coords.x;
        let y = coords.y;
        let z = coords.z;
        if (z > maxNativeZoom) {
          const factor = 1 << (z - maxNativeZoom);
          x = Math.floor(x / factor);
          y = Math.floor(y / factor);
          z = maxNativeZoom;
        }

        const data: Record<string, number | string> = {
          s: this._getSubdomain(coords),
          x,
          y,
          z
        };
        if (this._map && !this._map.options.crs.infinite) {
          const invertedY = this._globalTileRange.max.y - coords.y;
          if (this.options.tms) {
            data.y = invertedY;
          }
          data['-y'] = invertedY;
        }

        const tileUrl = L.Util.template(this._url, L.extend(data, this.options));
        return fetch(tileUrl, this.options.fetchOptions)
          .then((response: Response) => {
            if (!response.ok) return { layers: [] };
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('text/html')) return { layers: [] };
            return response.blob().then((blob: Blob) => {
              const reader = new FileReader();
              return new Promise((resolve) => {
                reader.addEventListener('loadend', () => {
                  try {
                    const pbf = new Pbf(reader.result as ArrayBuffer);
                    resolve(new VectorTile(pbf as any));
                  } catch {
                    resolve({ layers: [] });
                  }
                });
                reader.readAsArrayBuffer(blob);
              });
            });
          })
          .then((json: { layers: Record<string, any> }) => {
            for (const layerName in json.layers) {
              const feats = [];
              for (let i = 0; i < json.layers[layerName].length; i++) {
                const feat = json.layers[layerName].feature(i);
                feat.geometry = feat.loadGeometry();
                feats.push(feat);
              }
              json.layers[layerName].features = feats;
            }
            return json;
          });
      }
    });

    const normalize = (value: unknown) =>
      typeof value === 'string' ? value.trim().toUpperCase() : '';

    const hiddenStyle = {
      weight: 0,
      opacity: 0,
      fill: false,
      fillOpacity: 0
    };

    const vectorTileLayer = new SafeVectorGrid('https://e0ff550c.gis-desa.pages.dev/{z}/{x}/{y}.pbf', {
      vectorTileLayerStyles: {
        indonesia_districts: (properties: Record<string, unknown>, zoom: number) => {
          const province = normalize(properties?.province);
          const district = normalize(properties?.district);
          const subDistrict = normalize(properties?.sub_district);
          const filterProv = normalize(safeFilters.provinsi);
          const filterKab = normalize(safeFilters.kabupaten);
          const filterKec = normalize(safeFilters.kecamatan);

          if (filterProv && province !== filterProv) return hiddenStyle;
          if (filterKab && district !== filterKab) return hiddenStyle;
          if (filterKec && subDistrict !== filterKec) return hiddenStyle;

          return getBaseStyle(zoom);
        }
      },
      interactive: true,
      minZoom: 0,
      maxZoom: 18,
      maxNativeZoom: 10,
      bounds: L.latLngBounds(
        L.latLng(-10.9431, 95.0108),
        L.latLng(5.9072, 141.0194)
      ),
      noWrap: true,
      rendererFactory: L.canvas.tile,
      getFeatureId: (feature: { properties?: Record<string, unknown>; id?: string | number }) => {
        const props = feature?.properties;
        const explicitId = props && (props as Record<string, unknown>).id;
        if (typeof explicitId === 'string' || typeof explicitId === 'number') return explicitId;
        const compositeId = buildIdFromProps(props);
        if (compositeId) return compositeId;
        if (feature?.id !== undefined) return feature.id;
        return L.Util.stamp(feature as object);
      }
    });

    const getEventFeatureId = (event: { layer?: { properties?: Record<string, unknown> } }) => {
      const props = event?.layer?.properties;
      const explicitId = props && (props as Record<string, unknown>).id;
      if (typeof explicitId === 'string' || typeof explicitId === 'number') return explicitId;
      return buildIdFromProps(props);
    };

    vectorTileLayer.on('mouseover', (event: { layer?: { properties?: Record<string, unknown> } }) => {
      const props = event?.layer?.properties ?? {};
      const province = normalize(props.province);
      const district = normalize(props.district);
      const subDistrict = normalize(props.sub_district);
      const filterProv = normalize(safeFilters.provinsi);
      const filterKab = normalize(safeFilters.kabupaten);
      const filterKec = normalize(safeFilters.kecamatan);
      if (filterProv && province !== filterProv) return;
      if (filterKab && district !== filterKab) return;
      if (filterKec && subDistrict !== filterKec) return;
      const featureId = getEventFeatureId(event);
      if (featureId === null || featureId === undefined) return;
      if (hoverIdRef.current !== null && hoverIdRef.current !== featureId) {
        vectorTileLayer.resetFeatureStyle(hoverIdRef.current);
      }
      hoverIdRef.current = featureId;
      vectorTileLayer.setFeatureStyle(featureId, getHoverStyle(map.getZoom()));
    });

    vectorTileLayer.on('mouseout', (event: { layer?: { properties?: Record<string, unknown> } }) => {
      const featureId = getEventFeatureId(event);
      if (featureId === null || featureId === undefined) return;
      vectorTileLayer.resetFeatureStyle(featureId);
      if (hoverIdRef.current === featureId) hoverIdRef.current = null;
    });

    vectorTileLayer.on('click', (event: { layer?: { properties?: Record<string, unknown> } }) => {
      const props = event?.layer?.properties ?? {};
      const province = typeof props.province === 'string' ? props.province : undefined;
      const district = typeof props.district === 'string' ? props.district : undefined;
      const subDistrict = typeof props.sub_district === 'string' ? props.sub_district : undefined;
      const village = typeof props.village === 'string' ? props.village : undefined;
      console.log({ province, district, sub_district: subDistrict, village });
    });

    vectorTileLayer.addTo(map);

    return () => {
      vectorTileLayer.remove();
    };
  }, [map, safeFilters.provinsi, safeFilters.kabupaten, safeFilters.kecamatan]);

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
            <div className="w-3 h-3 rounded-full bg-[#703CA0] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Tidak Beresiko' : 'No Risk'}
              </p>
              <p className="text-[10px] text-slate-500">TMAT ≥ 0</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00B050] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Rendah' : 'Low'}
              </p>
              <p className="text-[10px] text-slate-500">0 - 20 cm</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00B0F0] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Sedang' : 'Medium'}
              </p>
              <p className="text-[10px] text-slate-500">20 - 40 cm</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FFFF00] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Tinggi' : 'High'}
              </p>
              <p className="text-[10px] text-slate-500">40 - 60 cm</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FFC000] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Sangat Tinggi' : 'Very High'}
              </p>
              <p className="text-[10px] text-slate-500">60 - 80 cm</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#EE0000] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Ekstrim' : 'Extreme'}
              </p>
              <p className="text-[10px] text-slate-500">{'> 80 cm'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardMap = forwardRef<HTMLDivElement, Props>(({ devices, heightClass }, ref) => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';
  const { user } = useAuth();
  const { data: realtimeData, loading: realtimeLoading } = useRealtimeAll(user?.perusahaanId || undefined);
  const { filters, updateFilter, enforcedProvinsi } = useFilters();
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);  
  const [mapKey, setMapKey] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [selectedBasemap, setSelectedBasemap] = useState<'osm' | 'satellite' | 'dark'>('osm');
  
  // Toggle settings
  const [showDistrictLayer, setShowDistrictLayer] = useState(false);
  const [showMarkers, setShowMarkers] = useState(false);

  const indonesiaBounds = L.latLngBounds(
    L.latLng(-10.9431, 95.0108),
    L.latLng(5.9072, 141.0194)
  );

  // Center on Indonesia roughly
  const center: [number, number] = [-2.5489, 118.0149];

  // Get unique provinces from devices data
  const provinceOptions = useMemo(() => {
    if (!devices) return [];
    const provinces = new Set<string>();
    devices.forEach(device => {
      if (device.provinsi) {
        provinces.add(device.provinsi);
      }
    });
    return Array.from(provinces).sort();
  }, [devices]);

  // Get kabupaten/kota - show all when no province selected, filtered when province is selected
  const kabupatenOptions = useMemo(() => {
    if (!devices) return [];
    const targetProv = enforcedProvinsi || filters.provinsi;
    
    const kabupaten = new Set<string>();
    devices.forEach(device => {
      // If there's a target province, filter by it; otherwise show all
      if (targetProv) {
        if (device.provinsi === targetProv && device.kabupaten) {
          kabupaten.add(device.kabupaten);
        }
      } else {
        if (device.kabupaten) {
          kabupaten.add(device.kabupaten);
        }
      }
    });
    return Array.from(kabupaten).sort();
  }, [devices, filters.provinsi, enforcedProvinsi]);

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
      if (filters.kecamatan && device.kota !== filters.kecamatan) return false;
      if (filters.desa && device.alamat && !device.alamat.toLowerCase().includes(filters.desa.toLowerCase())) return false;
      if (filters.jenis_perusahaan && device.id_perusahaan.toString() !== filters.jenis_perusahaan) return false;
      
      // Apply search filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesId = device.device_id_unik.toLowerCase().includes(searchLower);
        const matchesKota = device.kota.toLowerCase().includes(searchLower);
        const matchesProvinsi = device.provinsi.toLowerCase().includes(searchLower);
        const matchesKabupaten = device.kabupaten.toLowerCase().includes(searchLower);
        const matchesAlamat = device.alamat?.toLowerCase().includes(searchLower);
        
        if (!matchesId && !matchesKota && !matchesProvinsi && !matchesKabupaten && !matchesAlamat) {
          return false;
        }
      }
      
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
      
      // Handle offline devices
      const status = rtData 
        ? getWaterLevelStatus(rtData.tmat_value)
        : {
            level: isIndonesian ? 'Offline' : 'Offline',
            color: '#94a3b8',
            range: 'N/A',
            description: 'Device offline',
            severity: 'offline'
          };
      
      // Clip polygon to reasonable size (max 0.005 degrees from device center)
      const maxRadius = 0.01; //this radius in degrees (~1.11 km in real world)
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
        low: number;
        medium: number;
        high: number;
        veryhigh: number;
        extreme: number;
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
            low: 0,
            medium: 0,
            high: 0,
            veryhigh: 0,
            extreme: 0,
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
      low: 0,
      medium: 0,
      high: 0,
      veryhigh: 0,
      extreme: 0,
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

  const containerHeight = heightClass || (isExpanded ? 'h-[800px]' : 'h-[500px]');

  return (
    <div ref={ref} className={`${containerHeight} w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 relative transition-all duration-300`}>
      {/* Simple Filter Panel - Top of Map */}
      <div className="absolute top-3 left-12 right-4 z-[1000]">
        {/* Filter Toggle Button */}
        {!filterOpen ? (
          <div className="space-y-2">
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
          </div>
        ) : (
          <div className="space-y-2">
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
                    value={enforcedProvinsi || filters.provinsi}
                    onChange={(e) => {
                      updateFilter('provinsi', e.target.value);
                      // Reset kabupaten when province changes
                      updateFilter('kabupaten', '');
                    }}
                    disabled={!!enforcedProvinsi}
                  >
                    <option value="">{isIndonesian ? 'Semua Provinsi' : 'All Provinces'}</option>
                    {provinceOptions.map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                  {enforcedProvinsi && (
                    <p className="text-[11px] text-emerald-600 font-medium">
                      {isIndonesian
                        ? `Akun Anda dibatasi ke provinsi ${enforcedProvinsi}`
                        : `Your account is restricted to ${enforcedProvinsi} province`}
                    </p>
                  )}
                </div>

                {/* Regency Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    {isIndonesian ? 'Kabupaten' : 'Regency'}
                  </label>
                  <select 
                    className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={filters.kabupaten}
                    onChange={(e) => {
                      const selectedKabupaten = e.target.value;
                      updateFilter('kabupaten', selectedKabupaten);
                      
                      // Auto-update province when kabupaten is selected (if not enforced)
                      if (selectedKabupaten && !enforcedProvinsi && !filters.provinsi) {
                        const matchingDevice = devices?.find(device => device.kabupaten === selectedKabupaten);
                        if (matchingDevice?.provinsi) {
                          updateFilter('provinsi', matchingDevice.provinsi);
                        }
                      }
                    }}
                  >
                    <option value="">{isIndonesian ? 'Semua Kabupaten' : 'All Regencies'}</option>
                    {kabupatenOptions.map(kab => (
                      <option key={kab} value={kab}>{kab}</option>
                    ))}
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
            
            {/* Advanced Filter Button */}
            <button
              onClick={() => setAdvancedFilterOpen(true)}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-all"
            >
              <Filter size={18} />
              <span className="text-sm font-medium">
                {isIndonesian ? 'Filter Lanjutan' : 'Advanced Filters'}
              </span>
              {(filters.kecamatan || filters.desa || filters.searchText) && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 text-white rounded-full text-xs font-bold">
                  +{[filters.kecamatan, filters.desa, filters.searchText].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filter Panel Modal */}
      <AdvancedFilterPanel isOpen={advancedFilterOpen} onClose={() => setAdvancedFilterOpen(false)} />

      {/* Selected City Banner */}
      {filters.selectedCity && (
        <div className="absolute top-3 right-4 z-[1000] bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-lg border border-emerald-400 p-3 text-white max-w-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs font-semibold opacity-90">
                {isIndonesian ? 'Lokasi Terpilih' : 'Selected Location'}
              </p>
              <p className="text-sm font-bold truncate">
                {filters.selectedCity}
              </p>
            </div>
            <button
              onClick={() => updateFilter('selectedCity', null)}
              className="flex-shrink-0 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors"
              title={isIndonesian ? 'Bersihkan pilihan' : 'Clear selection'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
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
        minZoom={0}
        maxZoom={18}
        maxBounds={indonesiaBounds}
        maxBoundsViscosity={1.0}
        preferCanvas={true}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Dynamic Basemap Layer */}
        {selectedBasemap === 'osm' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {selectedBasemap === 'satellite' && (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        )}
        {selectedBasemap === 'dark' && (
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        )}
        
        <MapBoundsHandler devices={filteredDevices} />
        {showDistrictLayer && <VectorTileLayer filters={{ provinsi: filters.provinsi, kabupaten: filters.kabupaten, kecamatan: filters.kecamatan }} />}
        
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

        {/* Render city-level markers - Always visible */}
        {!realtimeLoading && Array.from(cityGroups.entries()).map(([cityKey, cityData]) => {
          const total = cityData.devices.length;
          const { stats } = cityData;
          
          // Determine color based on most dominant status (prioritize severity)
          let markerColor = '#06b6d4'; // default cyan
          const statusCounts = [
            { color: '#EE0000', count: stats.extreme },     // red - extreme
            { color: '#FFC000', count: stats.veryhigh },    // orange - very high
            { color: '#FFFF00', count: stats.high },        // yellow - high
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
                  // Update selected city in context
                  updateFilter('selectedCity', cityData.city);
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
                      <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#703CA0]"></div>
                          <span className="text-xs font-medium text-slate-700">
                            {isIndonesian ? 'Tidak Beresiko' : 'No Risk'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-purple-700">{stats.safe}</span>
                      </div>
                    )}

                    {stats.low > 0 && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#00B050]"></div>
                          <span className="text-xs font-medium text-slate-700">
                            {isIndonesian ? 'Rendah' : 'Low'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-green-700">{stats.low}</span>
                      </div>
                    )}

                    {stats.medium > 0 && (
                      <div className="flex items-center justify-between p-2 bg-cyan-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#00B0F0]"></div>
                          <span className="text-xs font-medium text-slate-700">
                            {isIndonesian ? 'Sedang' : 'Medium'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-cyan-700">{stats.medium}</span>
                      </div>
                    )}

                    {stats.high > 0 && (
                      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#FFFF00]"></div>
                          <span className="text-xs font-medium text-slate-700">
                            {isIndonesian ? 'Tinggi' : 'High'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-yellow-700">{stats.high}</span>
                      </div>
                    )}

                    {stats.veryhigh > 0 && (
                      <div className="flex items-center justify-between p-2 bg-amber-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#FFC000]"></div>
                          <span className="text-xs font-medium text-slate-700">
                            {isIndonesian ? 'Sangat Tinggi' : 'Very High'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-amber-700">{stats.veryhigh}</span>
                      </div>
                    )}

                    {stats.extreme > 0 && (
                      <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#EE0000]"></div>
                          <span className="text-xs font-medium text-slate-700">
                            {isIndonesian ? 'Ekstrim' : 'Extreme'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-red-700">{stats.extreme}</span>
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
                  {isIndonesian ? 'Tampilkan Marker Device' : 'Show Device Markers'}
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

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="text-sm font-medium text-slate-700">
                  {isIndonesian ? 'Layer Distrik/Desa' : 'District/Village Layer'}
                </span>
              </div>
              <button
                onClick={() => setShowDistrictLayer(!showDistrictLayer)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showDistrictLayer ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showDistrictLayer ? 'translate-x-6' : 'translate-x-1'
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
              <p className="text-xs text-slate-500 italic mt-1">
                {isIndonesian
                  ? 'Aktifkan layer untuk menampilkan batas distrik/desa'
                  : 'Enable layer to display district/village boundaries'}
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
                <div className="w-2 h-2 rounded-full bg-[#703CA0]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.safe}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#00B050]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.low}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#00B0F0]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.medium}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#FFFF00]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.high}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#FFC000]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.veryhigh}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#EE0000]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.extreme}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                <span className="text-xs font-bold text-slate-700">{stats.offline}</span>
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
              <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#703CA0]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Tidak Beresiko' : 'No Risk'}
                  </span>
                </div>
                <span className="text-sm font-bold text-purple-700">{stats.safe}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#00B050]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Rendah' : 'Low'}
                  </span>
                </div>
                <span className="text-sm font-bold text-green-700">{stats.low}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-cyan-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#00B0F0]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Sedang' : 'Medium'}
                  </span>
                </div>
                <span className="text-sm font-bold text-cyan-700">{stats.medium}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FFFF00]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Tinggi' : 'High'}
                  </span>
                </div>
                <span className="text-sm font-bold text-yellow-700">{stats.high}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FFC000]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Sangat Tinggi' : 'Very High'}
                  </span>
                </div>
                <span className="text-sm font-bold text-amber-700">{stats.veryhigh}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#EE0000]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Ekstrim' : 'Extreme'}
                  </span>
                </div>
                <span className="text-sm font-bold text-red-700">{stats.extreme}</span>
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

      {/* Basemap Switcher */}
      <div className="absolute bottom-24 right-4 z-[999]">
        <div className="bg-white rounded-lg shadow-lg border border-slate-200">
          <button
            onClick={() => setBasemapOpen(!basemapOpen)}
            className="p-3 hover:bg-slate-50 transition-colors rounded-lg flex items-center gap-2"
            title={isIndonesian ? 'Ganti Peta Dasar' : 'Change Basemap'}
          >
            <Layers size={20} className="text-slate-700" />
            <span className="text-xs font-medium text-slate-700">
              {isIndonesian ? 'Peta' : 'Map'}
            </span>
          </button>
          
          {basemapOpen && (
            <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-slate-200 p-2 min-w-[200px]">
              <p className="text-xs font-semibold text-slate-600 mb-2 px-2">
                {isIndonesian ? 'Pilih Peta Dasar' : 'Select Basemap'}
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => { setSelectedBasemap('osm'); setBasemapOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedBasemap === 'osm' 
                      ? 'bg-emerald-100 text-emerald-700 font-medium' 
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  🗺️ OpenStreetMap
                </button>
                <button
                  onClick={() => { setSelectedBasemap('satellite'); setBasemapOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedBasemap === 'satellite' 
                      ? 'bg-emerald-100 text-emerald-700 font-medium' 
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  🛰️ {isIndonesian ? 'Satelit' : 'Satellite'}
                </button>
                <button
                  onClick={() => { setSelectedBasemap('dark'); setBasemapOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedBasemap === 'dark' 
                      ? 'bg-emerald-100 text-emerald-700 font-medium' 
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  🌙 {isIndonesian ? 'Mode Gelap' : 'Dark Mode'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
});

DashboardMap.displayName = 'DashboardMap';

export default DashboardMap;

import React, { useState, useEffect, useMemo, useCallback, forwardRef, useRef } from 'react';
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
import { getWaterLevelStatus, getOfflineStatus } from '../utils/waterLevelStatus';
import AdvancedFilterPanel from './AdvancedFilterPanel';
import DeviceAnalyticsPanel from './DeviceAnalyticsPanel';
import VoronoiLayer from './map/VoronoiLayer';
import CityMarkersLayer from './map/CityMarkersLayer';
import DeviceMarkersLayer from './map/DeviceMarkersLayer';
import VillageVoronoiLayer from './map/VillageVoronoiLayer';

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

const hasValidMetric = (value: number | undefined): value is number => Number.isFinite(value);

interface Props {
  devices: Device[];
  heightClass?: string;
  realtimeData?: RealtimeData[] | null;
  realtimeLoading?: boolean;
}

interface DashboardMapInnerProps {
  devices: Device[];
  heightClass?: string;
  realtimeData: RealtimeData[] | null;
  realtimeLoading: boolean;
}

// Component to handle automatic map bounds fitting
const MapBoundsHandler: React.FC<{ devices: Device[] }> = ({ devices }) => {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    // Disabled auto-fit to preserve default zoom level (Indonesia nation view)
    // Users can manually zoom to see devices
    // if (devices && devices.length > 0 && !initializedRef.current) {
    //   const bounds = L.latLngBounds(
    //     devices.map(d => [d.latitude, d.longitude] as [number, number])
    //   );
    //   map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 });
    //   initializedRef.current = true;
    // }
  }, [devices, map]);

  return null;
};

// Component to fix map rendering issues
const MapInitializer: React.FC = () => {
  const map = useMap();
  
  useEffect(() => {
    // Small delay to ensure DOM is ready, then invalidate size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
};

// Component to auto-zoom when village layer is enabled
const VillageLayerZoomHandler: React.FC<{ showDistrictLayer: boolean }> = ({ showDistrictLayer }) => {
  const map = useMap();
  const hasZoomedRef = useRef(false);
  
  useEffect(() => {
    if (showDistrictLayer && !hasZoomedRef.current) {
      const currentZoom = map.getZoom();
      // Auto-zoom to 7 if current zoom is too low to see village layer
      if (currentZoom < 7) {
        map.setZoom(7, { animate: true });
        hasZoomedRef.current = true;
      }
    }
    if (!showDistrictLayer) {
      hasZoomedRef.current = false;
    }
  }, [showDistrictLayer, map]);
  
  return null;
};

const VectorTileLayer: React.FC<{
  filters?: { provinsi?: string; kabupaten?: string; kecamatan?: string };
}> = React.memo(({ filters }) => {
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
      minZoom: 8,
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
}, (prevProps, nextProps) => {
  // Only re-render if filters actually changed
  return prevProps.filters?.provinsi === nextProps.filters?.provinsi &&
         prevProps.filters?.kabupaten === nextProps.filters?.kabupaten &&
         prevProps.filters?.kecamatan === nextProps.filters?.kecamatan;
});

// Legend component
const WaterLevelLegend: React.FC<{ onToggle: () => void; isOpen: boolean; showDistrictLayer?: boolean }> = ({ onToggle, isOpen, showDistrictLayer }) => {
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
            <div className="w-3 h-3 rounded-full bg-[#3B82F6] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Tergenang' : 'Flooded'}
              </p>
              <p className="text-[10px] text-slate-500">TMAT &gt; 0 cm</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22C55E] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Normal' : 'Normal'}
              </p>
              <p className="text-[10px] text-slate-500">-40 cm &lt; nilai ≤ 0 cm</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F97316] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Rawan' : 'At Risk'}
              </p>
              <p className="text-[10px] text-slate-500">-80 cm &lt; nilai ≤ -40 cm</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#EF4444] flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-700 text-xs">
                {isIndonesian ? 'Sangat Rawan' : 'Very Risky'}
              </p>
              <p className="text-[10px] text-slate-500">≤ -80 cm</p>
            </div>
          </div>

          {/* Additional legend item for non-affected areas when district layer is active */}
          {showDistrictLayer && (
            <>
              <div className="border-t border-slate-200 my-2 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#94a3b8] opacity-50 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-700 text-xs">
                      {isIndonesian ? 'Tidak Terdampak' : 'Not Affected'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {isIndonesian ? 'Area tanpa perangkat' : 'No device coverage'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2 mt-2">
                <p className="text-[10px] text-emerald-800 leading-relaxed">
                  {isIndonesian 
                    ? 'Warna desa menunjukkan status air dari perangkat terdekat berdasarkan area cakupan terbesar'
                    : 'Village colors show water status from the nearest device based on largest coverage area'}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const DashboardMapInner = forwardRef<HTMLDivElement, DashboardMapInnerProps>(({ devices, heightClass, realtimeData, realtimeLoading }, ref) => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';
  const { user } = useAuth();
  const { filters, updateFilter, enforcedProvinsi } = useFilters();
  const visibleFilterTabs = useMemo(() => {
    if (user?.role === 'perusahaan') return ['date'] as const;
    if (user?.role === 'pemda') return ['location', 'date'] as const;
    return ['location', 'date', 'search'] as const;
  }, [user?.role]);
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [selectedBasemap, setSelectedBasemap] = useState<'osm' | 'satellite' | 'dark'>('osm');
  const lastAppliedRoleRef = useRef<string | undefined>(undefined);
  
  // Toggle settings
  const [showDistrictLayer, setShowDistrictLayer] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  
  // Persistent cache for village-voronoi overlap calculations
  // This persists across toggle on/off to avoid recalculation
  const villageOverlapCacheRef = useRef<Map<string | number, any>>(new Map());
  const [isCalculatingVillages, setIsCalculatingVillages] = useState(false);

  useEffect(() => {
    if (lastAppliedRoleRef.current === user?.role) {
      return;
    }
    lastAppliedRoleRef.current = user?.role;

    if (user?.role === 'perusahaan') {
      updateFilter('provinsi', '');
      updateFilter('kabupaten', '');
      updateFilter('kecamatan', '');
      updateFilter('desa', '');
      updateFilter('jenis_perusahaan', '');
      updateFilter('searchText', '');
      return;
    }

    if (user?.role === 'pemda') {
      updateFilter('searchText', '');
    }
  }, [user?.role]);

  // Memoized event handlers to prevent re-creation on every render
  const handleDeviceSelect = useCallback((device: Device | null) => {
    setSelectedDevice(device);
  }, []);

  const handlePolygonClick = useCallback((device: Device) => {
    setSelectedDevice(device);
  }, []);

  const handleCityClick = useCallback((cityName: string) => {
    updateFilter('selectedCity', cityName);
  }, [updateFilter]);

  const indonesiaBounds = L.latLngBounds(
    L.latLng(-10.9431, 95.0108),
    L.latLng(5.9072, 141.0194)
  );

  // Center on Indonesia (geographic center of archipelago)
  const center: [number, number] = [-2.5, 118.0];

  const scopedDevices = useMemo(() => {
    return user?.role === 'perusahaan' && user?.perusahaanId
      ? devices.filter((device) => device.id_perusahaan === user.perusahaanId)
      : devices;
  }, [devices, user?.role, user?.perusahaanId]);

  const getProvinceValue = (device: Device) => (device.provinsi_nama || device.provinsi_id || '').trim();
  const getKabupatenValue = (device: Device) => (device.kabupaten_nama || device.kabupaten_id || '').trim();
  const getKecamatanValue = (device: Device) => (device.kecamatan_nama || device.kecamatan_id || '').trim();

  // Get unique provinces from devices data
  const provinceOptions = useMemo(() => {
    if (!scopedDevices) return [];
    const provinces = new Set<string>();
    scopedDevices.forEach(device => {
        const province = getProvinceValue(device);
        if (province) {
          provinces.add(province);
      }
    });
    return Array.from(provinces).sort();
  }, [scopedDevices]);

  const provinceNameByValue = useMemo(() => {
    const map = new Map<string, string>();
    scopedDevices.forEach((device) => {
      const id = (device.provinsi_id || '').trim();
      const name = (device.provinsi_nama || '').trim();

      if (name) {
        map.set(name, name);
      }
      if (id) {
        map.set(id, name || id);
      }
    });
    return map;
  }, [scopedDevices]);

  const kabupatenNameByValue = useMemo(() => {
    const map = new Map<string, string>();
    scopedDevices.forEach((device) => {
      const id = (device.kabupaten_id || '').trim();
      const name = (device.kabupaten_nama || '').trim();

      if (name) {
        map.set(name, name);
      }
      if (id) {
        map.set(id, name || id);
      }
    });
    return map;
  }, [scopedDevices]);

  const kecamatanNameByValue = useMemo(() => {
    const map = new Map<string, string>();
    scopedDevices.forEach((device) => {
      const id = (device.kecamatan_id || '').trim();
      const name = (device.kecamatan_nama || '').trim();

      if (name) {
        map.set(name, name);
      }
      if (id) {
        map.set(id, name || id);
      }
    });
    return map;
  }, [scopedDevices]);

  const normalizeRegionValue = useCallback((value?: string | null) => {
    return (value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const extractDatePart = useCallback((timestamp: unknown): string | null => {
    if (typeof timestamp !== 'string') return null;
    const value = timestamp.trim();
    if (!value) return null;
    if (value.includes(' ')) return value.split(' ')[0] || null;
    if (value.includes('T')) return value.split('T')[0] || null;
    return value.length >= 10 ? value.slice(0, 10) : null;
  }, []);

  const resolveProvinceLabel = useCallback((provinceValue: string) => {
    if (!provinceValue) return '';
    return provinceNameByValue.get(provinceValue) || provinceValue;
  }, [provinceNameByValue]);

  const resolveKabupatenLabel = useCallback((kabupatenValue: string) => {
    if (!kabupatenValue) return '';
    return kabupatenNameByValue.get(kabupatenValue) || kabupatenValue;
  }, [kabupatenNameByValue]);

  const resolveKecamatanLabel = useCallback((kecamatanValue: string) => {
    if (!kecamatanValue) return '';
    return kecamatanNameByValue.get(kecamatanValue) || kecamatanValue;
  }, [kecamatanNameByValue]);

  const matchesProvinceFilter = useCallback((filterValue: string, device: Device) => {
    if (!filterValue) return true;

    const filterLabel = resolveProvinceLabel(filterValue);
    const deviceByName = resolveProvinceLabel(device.provinsi_nama || '');
    const deviceById = resolveProvinceLabel(device.provinsi_id || '');
    const target = normalizeRegionValue(filterLabel);

    return target === normalizeRegionValue(deviceByName) || target === normalizeRegionValue(deviceById);
  }, [normalizeRegionValue, resolveProvinceLabel]);

  const matchesKabupatenFilter = useCallback((filterValue: string, device: Device) => {
    if (!filterValue) return true;

    const filterLabel = resolveKabupatenLabel(filterValue);
    const deviceByName = resolveKabupatenLabel(device.kabupaten_nama || '');
    const deviceById = resolveKabupatenLabel(device.kabupaten_id || '');
    const target = normalizeRegionValue(filterLabel);

    return target === normalizeRegionValue(deviceByName) || target === normalizeRegionValue(deviceById);
  }, [normalizeRegionValue, resolveKabupatenLabel]);

  const matchesKecamatanFilter = useCallback((filterValue: string, device: Device) => {
    if (!filterValue) return true;

    const filterLabel = resolveKecamatanLabel(filterValue);
    const deviceByName = resolveKecamatanLabel(device.kecamatan_nama || '');
    const deviceById = resolveKecamatanLabel(device.kecamatan_id || '');
    const target = normalizeRegionValue(filterLabel);

    return target === normalizeRegionValue(deviceByName) || target === normalizeRegionValue(deviceById);
  }, [normalizeRegionValue, resolveKecamatanLabel]);

  const enforcedProvinceLabel = useMemo(() => {
    if (!enforcedProvinsi) return '';
    return resolveProvinceLabel(enforcedProvinsi);
  }, [enforcedProvinsi, resolveProvinceLabel]);

  const provinceSelectOptions = useMemo(() => {
    const options = new Map<string, string>();

    provinceOptions.forEach((value) => {
      options.set(value, resolveProvinceLabel(value));
    });

    if (filters.provinsi && !options.has(filters.provinsi)) {
      options.set(filters.provinsi, resolveProvinceLabel(filters.provinsi));
    }

    if (enforcedProvinsi && !options.has(enforcedProvinsi)) {
      options.set(enforcedProvinsi, enforcedProvinceLabel || enforcedProvinsi);
    }

    return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [provinceOptions, resolveProvinceLabel, filters.provinsi, enforcedProvinsi, enforcedProvinceLabel]);

  // Get kabupaten/kota - show all when no province selected, filtered when province is selected
  const kabupatenOptions = useMemo(() => {
    if (!scopedDevices) return [];
    const targetProv = enforcedProvinsi || filters.provinsi;
    
    const kabupaten = new Set<string>();
    scopedDevices.forEach(device => {
      const kab = getKabupatenValue(device);
      // If there's a target province, filter by it; otherwise show all
      if (targetProv) {
        if (matchesProvinceFilter(targetProv, device) && kab) {
          kabupaten.add(kab);
        }
      } else {
        if (kab) {
          kabupaten.add(kab);
        }
      }
    });
    return Array.from(kabupaten).sort();
  }, [scopedDevices, filters.provinsi, enforcedProvinsi, matchesProvinceFilter]);

  // Apply filters to devices
  const filteredDevices = useMemo(() => {
    const byCompanyScope = scopedDevices;

    const byUiFilter = byCompanyScope.filter(device => {
      if (!matchesProvinceFilter(filters.provinsi, device)) return false;
      if (!matchesKabupatenFilter(filters.kabupaten, device)) return false;
      if (!matchesKecamatanFilter(filters.kecamatan, device)) return false;
      if (filters.desa && device.desa && !device.desa.toLowerCase().includes(filters.desa.toLowerCase())) return false;
      // Apply search filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesId = device.device_id_unik.toLowerCase().includes(searchLower);
          const matchesDesa = device.desa?.toLowerCase().includes(searchLower);
          const matchesTipeAlat = device.tipe_alat?.toLowerCase().includes(searchLower);
        const matchesAlamat = device.alamat?.toLowerCase().includes(searchLower);
        
          if (!matchesId && !matchesDesa && !matchesTipeAlat && !matchesAlamat) {
          return false;
        }
      }
      
      return true;
    });

    // Keep only devices with valid coordinates for map rendering.
    const withValidCoords = byUiFilter.filter((device) => {
      const hasValidLat = Number.isFinite(device.latitude);
      const hasValidLng = Number.isFinite(device.longitude);
      const notZero = !(device.latitude === 0 && device.longitude === 0);

      return hasValidLat && hasValidLng && notZero;
    });

    console.log('[DashboardMap] Input devices:', devices?.length ?? 0);
    console.log('[DashboardMap] After company scope:', byCompanyScope.length);
    console.log('[DashboardMap] After UI filter:', byUiFilter.length);
    console.log('[DashboardMap] After coordinate validation:', withValidCoords.length);

    if (byUiFilter.length > 0 && withValidCoords.length === 0) {
      console.log('[DashboardMap] Coordinate validation sample:', byUiFilter.slice(0, 3).map((device) => ({
        id: device.device_id_unik,
        latitude: device.latitude,
        longitude: device.longitude,
        latitudeType: typeof device.latitude,
        longitudeType: typeof device.longitude,
      })));
    }

    return withValidCoords;
  }, [scopedDevices, filters, matchesProvinceFilter, matchesKabupatenFilter, matchesKecamatanFilter]);

  // Debug logging
  useEffect(() => {
    console.log('[DashboardMap] Input devices:', devices?.length);
    console.log('[DashboardMap] Filtered devices:', filteredDevices?.length);
    console.log('[DashboardMap] Realtime data:', realtimeData?.length);
    console.log('[DashboardMap] Loading:', realtimeLoading);
    console.log('[DashboardMap] Marker visibility:', showMarkers);
    console.log('[DashboardMap] Current filters:', filters);
    console.log(
      '[DashboardMap] Sample marker coordinates:',
      filteredDevices.slice(0, 3).map((d) => ({
        id: d.device_id_unik,
        lat: d.latitude,
        lng: d.longitude,
      }))
    );
  }, [devices, filteredDevices, realtimeData, realtimeLoading, showMarkers]);

  const filteredRealtimeData = useMemo(() => {
    if (!realtimeData) return null;

    return realtimeData.filter((data) => {
      const dataDate = extractDatePart(data.timestamp_data);
      if (!dataDate) return false;

      const matchesStart = !filters.startDate || dataDate >= filters.startDate;
      const matchesEnd = !filters.endDate || dataDate <= filters.endDate;

      return matchesStart && matchesEnd;
    });
  }, [realtimeData, filters.startDate, filters.endDate, extractDatePart]);

  // Create a map of device -> latest realtime data
  const deviceDataMap = useMemo(() => {
    const map = new Map<string, RealtimeData>();
    if (filteredRealtimeData) {
      filteredRealtimeData.forEach(data => {
        const existing = map.get(data.device_id_unik);
        if (!existing || new Date(data.timestamp_data) > new Date(existing.timestamp_data)) {
          map.set(data.device_id_unik, data);
        }
      });
    }
    return map;
  }, [filteredRealtimeData]);

  // Get realtime data for selected device
  const selectedDeviceData = useMemo(() => {
    if (!selectedDevice) return null;
    return deviceDataMap.get(selectedDevice.device_id_unik) || null;
  }, [selectedDevice, deviceDataMap]);

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
      const status = rtData && hasValidMetric(rtData.tmat_value)
        ? getWaterLevelStatus(rtData.tmat_value, isIndonesian)
        : getOfflineStatus(isIndonesian);
      
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

  // Debug voronoi polygons for village layer
  useEffect(() => {
    if (showDistrictLayer) {
      console.log('Voronoi polygons for village layer:', {
        count: voronoiPolygons.length,
        sample: voronoiPolygons.slice(0, 3).map(vp => ({
          deviceId: vp.device.device_id_unik,
          color: vp.status.color,
          level: vp.status.level,
          hasRtData: !!vp.rtData,
          polygonCoordsCount: vp.polygonCoords?.length,
          firstCoord: vp.polygonCoords?.[0]
        }))
      });
    }
  }, [showDistrictLayer, voronoiPolygons]);

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

  // Group devices by city/regency with center coordinates and statistics
  const cityGroups: Map<string, {
      city: string;
      provinsi: string;
      devices: Device[];
      centerLat: number;
      centerLng: number;
      stats: {
        tergenang: number;
        normal: number;
        rawan: number;
        sangat_rawan: number;
        offline: number;
      };
    }> = useMemo(() => {
    const cities = new Map<string, {
      city: string;
      provinsi: string;
      devices: Device[];
      centerLat: number;
      centerLng: number;
      stats: {
        tergenang: number;
        normal: number;
        rawan: number;
        sangat_rawan: number;
        offline: number;
      };
    }>();

    filteredDevices.forEach(device => {
      const normalizedCity =
        (typeof device.desa === 'string' && device.desa.trim()) ||
        (typeof device.kabupaten_id === 'string' && device.kabupaten_id.trim()) ||
        (typeof device.provinsi_id === 'string' && device.provinsi_id.trim()) ||
        'Unknown';
      const cityKey = `${normalizedCity}, ${device.provinsi_id}`;
      if (!cities.has(cityKey)) {
        cities.set(cityKey, {
          city: normalizedCity,
          provinsi: device.provinsi_id,
          devices: [],
          centerLat: 0,
          centerLng: 0,
          stats: {
            tergenang: 0,
            normal: 0,
            rawan: 0,
            sangat_rawan: 0,
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
        if (!hasValidMetric(rtData.tmat_value)) {
          cityData.stats.offline++;
          return;
        }
        const status = getWaterLevelStatus(rtData.tmat_value, isIndonesian);
        cityData.stats[status.severity as keyof typeof cityData.stats]++;
      });
    });

    return cities;
  }, [filteredDevices, deviceDataMap]);

  // Calculate statistics
  const stats = useMemo(() => {
    const statusCounts = {
      tergenang: 0,
      normal: 0,
      rawan: 0,
      sangat_rawan: 0,
      offline: 0
    };

    filteredDevices.forEach(device => {
      const rtData = deviceDataMap.get(device.device_id_unik);
      if (!rtData) {
        statusCounts.offline++;
        return;
      }
      if (!hasValidMetric(rtData.tmat_value)) {
        statusCounts.offline++;
        return;
      }
      const status = getWaterLevelStatus(rtData.tmat_value, isIndonesian);
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
                    {provinceSelectOptions.map(([provValue, provLabel]) => (
                      <option key={provValue} value={provValue}>{provLabel}</option>
                    ))}
                  </select>
                  {enforcedProvinsi && (
                    <p className="text-[11px] text-emerald-600 font-medium">
                      {isIndonesian
                        ? `Akun Anda dibatasi ke provinsi ${enforcedProvinceLabel}`
                        : `Your account is restricted to ${enforcedProvinceLabel} province`}
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
                        const matchingDevice = scopedDevices?.find(device =>
                          matchesKabupatenFilter(selectedKabupaten, device)
                        );
                        const province = matchingDevice?.provinsi_nama || matchingDevice?.provinsi_id;
                        if (province) {
                          updateFilter('provinsi', province);
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
      <AdvancedFilterPanel
        isOpen={advancedFilterOpen}
        onClose={() => setAdvancedFilterOpen(false)}
        devices={scopedDevices}
        visibleTabs={[...visibleFilterTabs]}
      />

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
        key={selectedBasemap}
        center={center} 
        zoom={5} 
        minZoom={4}
        maxZoom={18}
        worldCopyJump={true}
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
        <MapInitializer />
        <VillageLayerZoomHandler showDistrictLayer={showDistrictLayer} />
        
        {/* Conditional layer rendering: Village layer with Voronoi coloring OR standalone Voronoi */}
        {showDistrictLayer ? (
          <VillageVoronoiLayer 
            filters={{ provinsi: filters.provinsi, kabupaten: filters.kabupaten, kecamatan: filters.kecamatan }}
            voronoiPolygons={voronoiPolygons}
            isIndonesian={isIndonesian}
            filteredDevices={filteredDevices}
            overlapCache={villageOverlapCacheRef.current}
            onCalculationStart={() => setIsCalculatingVillages(true)}
            onCalculationEnd={() => setIsCalculatingVillages(false)}
          />
        ) : (
          <VoronoiLayer 
            polygons={voronoiPolygons}
            isLoading={realtimeLoading}
            onPolygonClick={handlePolygonClick}
            isIndonesian={isIndonesian}
          />
        )}

        {/* Render city-level summary markers only when device markers are hidden */}
        {!showMarkers && (
          <CityMarkersLayer
            cityGroups={cityGroups}
            isLoading={realtimeLoading}
            isIndonesian={isIndonesian}
            onCityClick={handleCityClick}
          />
        )}

        {/* Render grouped device markers on top - Conditional */}
        <DeviceMarkersLayer
          deviceGroups={deviceGroups}
          deviceDataMap={deviceDataMap}
          showMarkers={showMarkers}
          isLoading={realtimeLoading}
          isIndonesian={isIndonesian}
          onDeviceSelect={handleDeviceSelect}
          getWaterLevelStatus={getWaterLevelStatus}
          createWaterDropletIcon={createWaterDropletIcon}
        />
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
              <div className="flex items-center gap-2 flex-1">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700 block">
                    {isIndonesian ? 'Layer Distrik/Desa' : 'District/Village Layer'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5" title={isIndonesian ? 'Desa akan diwarnai sesuai status air device terdekat' : 'Villages colored by nearest device water status'}>
                    {isIndonesian ? 'Auto-pewarnaan berdasarkan status air' : 'Auto-colored by water status'}
                  </span>
                </div>
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
                  ? 'Layer desa menampilkan area terdampak dengan pewarnaan otomatis'
                  : 'Village layer shows affected areas with automatic coloring'}
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
                <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.sangat_rawan}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#F97316]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.rawan}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.normal}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
                <span className="text-xs font-bold text-slate-700">{stats.tergenang}</span>
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

              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#EE0000]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Sangat Rawan' : 'Very Risky'}
                  </span>
                </div>
                <span className="text-sm font-bold text-red-700">{stats.sangat_rawan}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#F97316]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Rawan' : 'At Risk'}
                  </span>
                </div>
                <span className="text-sm font-bold text-amber-700">{stats.rawan}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#22C55E]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Normal' : 'Normal'}
                  </span>
                </div>
                <span className="text-sm font-bold text-yellow-800">{stats.normal}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-cyan-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                  <span className="text-xs font-medium text-slate-700">
                    {isIndonesian ? 'Tergenang' : 'Flooded'}
                  </span>
                </div>
                <span className="text-sm font-bold text-cyan-700">{stats.tergenang}</span>
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

            {(filters.provinsi || filters.kabupaten || filters.kecamatan || filters.jenisPerusahaan) && (
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
                      <span className="font-medium">{resolveProvinceLabel(filters.provinsi)}</span>
                    </div>
                  )}
                  {filters.kabupaten && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="font-medium">{resolveKabupatenLabel(filters.kabupaten)}</span>
                    </div>
                  )}
                  {filters.kecamatan && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="font-medium">{resolveKecamatanLabel(filters.kecamatan)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend Panel */}
      <WaterLevelLegend isOpen={legendOpen} onToggle={() => setLegendOpen(!legendOpen)} showDistrictLayer={showDistrictLayer} />

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

      {/* Device Analytics Panel - Bottom Drawer */}
      <DeviceAnalyticsPanel
        selectedDevice={selectedDevice}
        realtimeData={selectedDeviceData}
        onClose={() => setSelectedDevice(null)}
      />
      
      {/* Village Calculation Loading Overlay */}
      {isCalculatingVillages && (
        <div className="absolute inset-0 pointer-events-none z-[1000] flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4 border-2 border-emerald-200">
            <div className="relative">
              {/* Animated spinner */}
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              {/* Pulsing circles */}
              <div className="absolute inset-0 w-16 h-16 border-4 border-emerald-300 rounded-full animate-ping opacity-20"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-800 mb-1">
                {isIndonesian ? 'Menghitung Cakupan Desa...' : 'Calculating Village Coverage...'}
              </p>
              <p className="text-sm text-slate-600">
                {isIndonesian 
                  ? 'Menganalisis overlap dengan perangkat' 
                  : 'Analyzing overlap with devices'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isIndonesian 
                  ? 'Estimasi: 1-3 detik' 
                  : 'Estimated: 1-3 seconds'}
              </p>
              <div className="mt-3 flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

const DashboardMapWithRealtime = forwardRef<HTMLDivElement, Omit<Props, 'realtimeData' | 'realtimeLoading'>>(
  ({ devices, heightClass }, ref) => {
    const { user } = useAuth();
    const { data: realtimeData, loading: realtimeLoading } = useRealtimeAll(user?.perusahaanId || undefined);

    return (
      <DashboardMapInner
        ref={ref}
        devices={devices}
        heightClass={heightClass}
        realtimeData={realtimeData}
        realtimeLoading={realtimeLoading}
      />
    );
  }
);

const DashboardMap = forwardRef<HTMLDivElement, Props>(({ realtimeData, realtimeLoading, ...rest }, ref) => {
  const hasExternalRealtime = realtimeData !== undefined || realtimeLoading !== undefined;

  if (hasExternalRealtime) {
    return (
      <DashboardMapInner
        ref={ref}
        {...rest}
        realtimeData={realtimeData ?? null}
        realtimeLoading={realtimeLoading ?? false}
      />
    );
  }

  return <DashboardMapWithRealtime ref={ref} {...rest} />;
});

DashboardMap.displayName = 'DashboardMap';
DashboardMapInner.displayName = 'DashboardMapInner';
DashboardMapWithRealtime.displayName = 'DashboardMapWithRealtime';

export default DashboardMap;

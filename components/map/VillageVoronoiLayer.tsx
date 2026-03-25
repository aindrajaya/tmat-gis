import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.vectorgrid';
import Pbf from 'pbf';
import { VectorTile } from 'vector-tile';
import { 
  VoronoiPolygonData, 
  vectorTileGeometryToTurfPolygon, 
  calculatePolygonOverlap,
  OverlapResult
} from '../../utils/geometryUtils';
import { Device } from '../../types';

interface VillageVoronoiLayerProps {
  filters?: { provinsi?: string; kabupaten?: string; kecamatan?: string };
  voronoiPolygons: VoronoiPolygonData[];
  isIndonesian: boolean;
  filteredDevices: Device[];
  overlapCache?: Map<string | number, OverlapResult>;
  onCalculationStart?: () => void;
  onCalculationEnd?: () => void;
}

/**
 * VillageVoronoiLayer Component
 * 
 * Combines village/district boundaries with Voronoi polygon data.
 * Villages are colored based on the Voronoi polygon with the largest overlap area.
 * Includes detailed statistics popup showing affected devices and water level status.
 */
const VillageVoronoiLayer: React.FC<VillageVoronoiLayerProps> = React.memo(({ 
  filters, 
  voronoiPolygons,
  isIndonesian,
  filteredDevices,
  overlapCache,
  onCalculationStart,
  onCalculationEnd
}) => {
  const safeFilters = {
    provinsi: filters?.provinsi || '',
    kabupaten: filters?.kabupaten || '',
    kecamatan: filters?.kecamatan || ''
  };
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  const hoverIdRef = useRef<string | number | null>(null);
  
  // Use provided cache from parent (persistent) or create new one (fallback)
  const overlapCacheRef = useRef<Map<string | number, OverlapResult>>(overlapCache || new Map());
  
  // Sync with provided cache if available
  useEffect(() => {
    if (overlapCache) {
      overlapCacheRef.current = overlapCache;
    }
  }, [overlapCache]);

  // Memoize device map for quick lookup
  const deviceMap = useMemo(() => {
    const map = new Map<string, Device>();
    filteredDevices.forEach(device => {
      map.set(device.device_id_unik, device);
    });
    return map;
  }, [filteredDevices]);

  // Track processed tiles to avoid re-processing
  const processedTilesRef = useRef<Set<string>>(new Set());
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Track zoom changes
    const handleZoomEnd = () => {
      setCurrentZoom(map.getZoom());
      // Clear caches when zoom changes to force re-calculation with new tile data
      processedTilesRef.current.clear();
      overlapCacheRef.current.clear();
    };
    
    map.on('zoomend', handleZoomEnd);
    
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  useEffect(() => {
    // Don't render layer at low zoom levels to prevent gray screen
    // Layer akan muncul di zoom >= 7 untuk Indonesia view
    if (currentZoom < 7) {
      return;
    }

    console.log('VillageVoronoiLayer rendering at zoom:', currentZoom);
    console.log('Voronoi polygons count:', voronoiPolygons.length);

    // Clear cache when voronoi polygons change
    overlapCacheRef.current.clear();

    const getHoverStyle = (zoom: number, fillColor: string) => {
      const weight = zoom <= 10 ? 0.8 : zoom <= 14 ? 1.2 : 1.6;
      return {
        weight,
        color: '#121a64',
        fill: true,
        fillColor,
        fillOpacity: 0.5
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

    let layersLogged = false;
    let styleCallCount = 0;

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
                    const vt = new VectorTile(pbf as any);
                    // Store tile coordinates for geometry conversion
                    (vt as any)._tileCoords = { z: coords.z, x: coords.x, y: coords.y };
                    resolve(vt);
                  } catch {
                    resolve({ layers: [] });
                  }
                });
                reader.readAsArrayBuffer(blob);
              });
            });
          })
          .then((json: any) => {
            // Log available layers from first tile
            if (!layersLogged && json && json.layers) {
              console.log('📦 Available layers in tiles:', Object.keys(json.layers));
              layersLogged = true;
            }
            
            // Process features and pre-calculate overlaps
            const tileKey = `${coords.z}/${coords.x}/${coords.y}`;
            const tileCoords = json._tileCoords || { z: coords.z, x: coords.x, y: coords.y };
            
            // Track calculation performance
            const calcStartTime = Date.now();
            let calculatedCount = 0;
            let skippedCount = 0;
            let cachedCount = 0;
            
            for (const layerName in json.layers) {
              const layer = json.layers[layerName];
              const feats = [];
              
              for (let i = 0; i < layer.length; i++) {
                const feat = layer.feature(i);
                const geometry = feat.loadGeometry();
                feat.geometry = geometry;
                
                // Pre-calculate overlap if we have voronoi polygons
                if (voronoiPolygons.length > 0 && !processedTilesRef.current.has(tileKey)) {
                  const featureId = buildIdFromProps(feat.properties);
                  
                  // Signal calculation started (only once)
                  if (overlapCacheRef.current.size === 0 && onCalculationStart) {
                    onCalculationStart();
                  }
                  
                  // Check if already in cache
                  if (featureId && overlapCacheRef.current.has(featureId)) {
                    cachedCount++;
                  } else if (featureId) {
                    // Calculate new overlap
                    try {
                      // Convert vector tile geometry to geographic coordinates
                      const villageTurf = vectorTileGeometryToTurfPolygon(
                        geometry,
                        4096, // extent
                        tileCoords.z,
                        tileCoords.x,
                        tileCoords.y
                      );
                      
                      if (villageTurf) {
                        const overlapResult = calculatePolygonOverlap(villageTurf, voronoiPolygons);
                        overlapCacheRef.current.set(featureId, overlapResult || null);
                        calculatedCount++;
                        
                        // Debug first successful calculation only
                        if (overlapResult && calculatedCount === 1) {
                          console.log('✅ First overlap calculated:', {
                            village: feat.properties.village,
                            percentage: overlapResult.overlapPercentage.toFixed(2) + '%',
                            color: overlapResult.voronoiData.status.color
                          });
                        }
                      } else {
                        skippedCount++;
                      }
                    } catch (error) {
                      skippedCount++;
                    }
                  }
                }
                
                feats.push(feat);
              }
              
              layer.features = feats;
            }
            
            // Log performance stats only if there was work done
            const calcTime = Date.now() - calcStartTime;
            if (calculatedCount > 0) {
              console.log(`⚡ Tile ${tileKey}: ${calculatedCount} new, ${cachedCount} cached, ${skippedCount} skipped | ${calcTime}ms (${(calcTime/calculatedCount).toFixed(0)}ms avg/village)`);
            }
            
            // Mark this tile as processed
            processedTilesRef.current.add(tileKey);
            
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

    // Base style for villages without device coverage
    const baseStyle = (zoom: number) => {
      const weight = zoom <= 10 ? 0.5 : zoom <= 14 ? 0.8 : 1;
      return {
        weight,
        color: '#64748b',
        fill: true,
        fillColor: '#cbd5e1',
        fillOpacity: 0.3,
        opacity: 0.6
      };
    };

    // Styling function that will work for any layer name
    const styleFunction = (properties: Record<string, unknown>, zoom: number, feature: any) => {
      // Log only first few calls to avoid console spam
      if (styleCallCount < 3) {
        console.log('🎨 Styling function called #' + (styleCallCount + 1) + ':', {
          village: properties?.village,
          props: Object.keys(properties || {})
        });
        styleCallCount++;
      }
      
      const province = normalize(properties?.province);
      const district = normalize(properties?.district);
      const subDistrict = normalize(properties?.sub_district);
      const filterProv = normalize(safeFilters.provinsi);
      const filterKab = normalize(safeFilters.kabupaten);
      const filterKec = normalize(safeFilters.kecamatan);

      // Filter check - hide if doesn't match filter
      if (filterProv && province !== filterProv) {
        if (styleCallCount <= 3) console.log('❌ Filtered by provinsi:', province, '!==', filterProv);
        return hiddenStyle;
      }
      if (filterKab && district !== filterKab) {
        if (styleCallCount <= 3) console.log('❌ Filtered by kabupaten:', district, '!==', filterKab);
        return hiddenStyle;
      }
      if (filterKec && subDistrict !== filterKec) {
        if (styleCallCount <= 3) console.log('❌ Filtered by kecamatan:', subDistrict, '!==', filterKec);
        return hiddenStyle;
      }

      // If no voronoi polygons, show all villages with base style
      if (voronoiPolygons.length === 0) {
        if (styleCallCount <= 3) console.log('⚠️ No voronoi polygons available');
        return baseStyle(zoom);
      }

      // Look up pre-calculated overlap from cache
      const featureId = buildIdFromProps(properties);
      const overlapResult = overlapCacheRef.current.get(featureId || '');
      
      if (styleCallCount <= 3) {
        console.log('🔍 Looking up pre-calculated overlap for:', properties?.village);
        console.log('   Cache hit:', overlapResult !== undefined);
        if (overlapResult) {
          console.log('   Overlap:', overlapResult.overlapPercentage.toFixed(2) + '%');
        }
      }

      // ONLY show colored if there's significant overlap (even small overlap > 0.1%)
      if (overlapResult && overlapResult.overlapPercentage > 0.1) {
            const weight = zoom <= 10 ? 0.8 : zoom <= 14 ? 1.2 : 1.6;
            const fillOpacity = Math.min(0.5 + (overlapResult.overlapPercentage / 100), 0.75);
            const color = overlapResult.voronoiData?.status?.color || '#3b82f6';
            
            return {
              weight,
              color: color,
              fill: true,
              fillColor: color,
              fillOpacity,
              opacity: 1
            };
          }

          // No overlap = show with base style (not affected)
          return baseStyle(zoom);
    };

    const vectorTileLayer = new SafeVectorGrid('https://e0ff550c.gis-desa.pages.dev/{z}/{x}/{y}.pbf', {
      vectorTileLayerStyles: {
        // Try multiple possible layer names
        indonesia_districts: styleFunction,
        districts: styleFunction,
        villages: styleFunction,
        desa: styleFunction,
        default: styleFunction
      },
      interactive: true,
      minZoom: 0, // Allow all zoom levels
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
      
      // Get color from cache
      const overlapResult = overlapCacheRef.current.get(featureId);
      const fillColor = overlapResult ? overlapResult.voronoiData.status.color : '#5dade2';
      
      if (hoverIdRef.current !== null && hoverIdRef.current !== featureId) {
        vectorTileLayer.resetFeatureStyle(hoverIdRef.current);
      }
      hoverIdRef.current = featureId;
      vectorTileLayer.setFeatureStyle(featureId, getHoverStyle(map.getZoom(), fillColor));
    });

    vectorTileLayer.on('mouseout', (event: { layer?: { properties?: Record<string, unknown> } }) => {
      const featureId = getEventFeatureId(event);
      if (featureId === null || featureId === undefined) return;
      vectorTileLayer.resetFeatureStyle(featureId);
      if (hoverIdRef.current === featureId) hoverIdRef.current = null;
    });

    vectorTileLayer.on('click', (event: { layer?: { properties?: Record<string, unknown>; } }) => {
      const props = event?.layer?.properties ?? {};
      const province = typeof props.province === 'string' ? props.province : undefined;
      const district = typeof props.district === 'string' ? props.district : undefined;
      const subDistrict = typeof props.sub_district === 'string' ? props.sub_district : undefined;
      const village = typeof props.village === 'string' ? props.village : undefined;
      
      const featureId = getEventFeatureId(event);
      const overlapResult = featureId ? overlapCacheRef.current.get(featureId) : null;

      // Build popup content with statistics
      let popupContent = `
        <div class="p-3 min-w-[280px]">
          <h3 class="font-bold text-slate-800 text-base mb-1">
            ${village || subDistrict || district || province || isIndonesian ? 'Wilayah Tidak Dikenal' : 'Unknown Area'}
          </h3>
          <p class="text-xs text-slate-500 mb-3">
            ${[subDistrict, district, province].filter(Boolean).join(', ')}
          </p>
      `;

      if (overlapResult && overlapResult.overlapPercentage > 1) {
        const { voronoiData, overlapPercentage } = overlapResult;
        const device = voronoiData.device;

        popupContent += `
          <div class="space-y-2 mb-3 border-b border-slate-200 pb-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-slate-600">
                ${isIndonesian ? 'Status Dampak' : 'Impact Status'}:
              </span>
              <div 
                class="text-xs px-2 py-1 rounded-full font-semibold"
                style="background-color: ${voronoiData.status.color}20; color: ${voronoiData.status.color};"
              >
                ${voronoiData.status.level}
              </div>
            </div>
            
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-600">
                ${isIndonesian ? 'Cakupan Area' : 'Area Coverage'}:
              </span>
              <span class="text-xs font-semibold text-slate-700">
                ${overlapPercentage.toFixed(1)}%
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-600">
                ${isIndonesian ? 'Tinggi Air' : 'Water Level'}:
              </span>
              <span class="text-xs font-semibold" style="color: ${voronoiData.status.color};">
                ${voronoiData.status.range}
              </span>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-semibold text-slate-700 mb-2">
              ${isIndonesian ? 'Perangkat Terdekat:' : 'Nearest Device:'}
            </p>
            
            <div class="bg-slate-50 rounded-lg p-2 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600">ID:</span>
                <span class="text-xs font-medium text-slate-800">Device ${device.kode_titik || device.device_id_unik}</span>
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600">
                  ${isIndonesian ? 'Lokasi' : 'Location'}:
                </span>
                <span class="text-xs font-medium text-slate-800">${[device.desa, device.kabupaten_id, device.provinsi_id].filter(Boolean).join(', ') || 'Unknown'}</span>
              </div>

              ${voronoiData.rtData ? `
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-600">TMAT:</span>
                  <span class="text-xs font-semibold text-slate-800">${voronoiData.rtData.tmat_value.toFixed(2)} cm</span>
                </div>
                
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-600">
                    ${isIndonesian ? 'Suhu' : 'Temperature'}:
                  </span>
                  <span class="text-xs font-medium text-slate-700">${voronoiData.rtData.suhu_value.toFixed(1)}°C</span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-600">
                    ${isIndonesian ? 'Curah Hujan' : 'Rainfall'}:
                  </span>
                  <span class="text-xs font-medium text-slate-700">${Number.isFinite(voronoiData.rtData.curah_hujan) ? `${voronoiData.rtData.curah_hujan.toFixed(1)} mm` : '—'}</span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-600">
                    ${isIndonesian ? 'Kelembapan' : 'Humidity'}:
                  </span>
                  <span class="text-xs font-medium text-slate-700">${Number.isFinite(voronoiData.rtData.kelembapan) ? `${voronoiData.rtData.kelembapan.toFixed(1)}%` : '—'}</span>
                </div>
              ` : `
                <p class="text-xs text-slate-500 italic text-center py-1">
                  ${isIndonesian ? 'Tidak ada data realtime' : 'No realtime data'}
                </p>
              `}
            </div>
          </div>
        `;
      } else {
        popupContent += `
          <div class="text-center py-4">
            <p class="text-sm text-slate-600 mb-1">
              ${isIndonesian ? 'Wilayah Tidak Terdampak' : 'Area Not Affected'}
            </p>
            <p class="text-xs text-slate-500">
              ${isIndonesian 
                ? 'Tidak ada perangkat pemantau di wilayah ini' 
                : 'No monitoring device in this area'}
            </p>
          </div>
        `;
      }

      popupContent += `</div>`;

      // Show popup at click location
      const popup = L.popup({
        maxWidth: 320,
        minWidth: 280,
        className: 'village-popup'
      })
        .setLatLng(map.getCenter())
        .setContent(popupContent)
        .openOn(map);
    });

    // Debug: Check tile loading
    vectorTileLayer.on('load', () => {
      console.log('✅ Vector tiles loaded successfully');
      
      // Signal calculation complete after a short delay to ensure all tiles processed
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      calculationTimeoutRef.current = setTimeout(() => {
        if (onCalculationEnd) {
          onCalculationEnd();
        }
        
        // Log final summary
        const values = Array.from(overlapCacheRef.current.values());
        const withOverlap = values.filter(
          (r): r is OverlapResult => {
            if (!r || typeof r !== 'object') return false;
            if (!('overlapPercentage' in r)) return false;
            const percentage = (r as OverlapResult).overlapPercentage;
            return typeof percentage === 'number' && percentage > 0.1;
          }
        ).length;
        console.log(`📊 Final: ${withOverlap} colored / ${overlapCacheRef.current.size} total villages`);
      }, 800); // Reduced from 1500ms to 800ms
    });

    vectorTileLayer.on('tileerror', (e: any) => {
      console.error('❌ Tile load error:', e);
    });

    vectorTileLayer.addTo(map);

    // Log overlap results after tiles load
    setTimeout(() => {
      const values = Array.from(overlapCacheRef.current.values());
      const withOverlap = values.filter(
        (r): r is OverlapResult => {
          if (!r || typeof r !== 'object' || !('overlapPercentage' in r)) return false;
          return (r as OverlapResult).overlapPercentage > 0.1;
        }
      ).length;
      const total = overlapCacheRef.current.size;
      console.log(`📊 Village overlap summary: ${withOverlap} colored / ${total} total villages`);
    }, 3000);

    return () => {
      vectorTileLayer.remove();
      // Cleanup timeout
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [map, safeFilters.provinsi, safeFilters.kabupaten, safeFilters.kecamatan, voronoiPolygons, isIndonesian, deviceMap, currentZoom, onCalculationStart, onCalculationEnd]);

  return null;
}, (prevProps, nextProps) => {
  // Only re-render if filters or voronoi data actually changed
  return prevProps.filters?.provinsi === nextProps.filters?.provinsi &&
         prevProps.filters?.kabupaten === nextProps.filters?.kabupaten &&
         prevProps.filters?.kecamatan === nextProps.filters?.kecamatan &&
         prevProps.voronoiPolygons === nextProps.voronoiPolygons &&
         prevProps.isIndonesian === nextProps.isIndonesian;
});

VillageVoronoiLayer.displayName = 'VillageVoronoiLayer';

export default VillageVoronoiLayer;

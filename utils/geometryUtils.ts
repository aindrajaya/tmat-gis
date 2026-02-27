import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';

export interface VoronoiPolygonData {
  device: any;
  rtData: any;
  status: {
    level: string;
    color: string;
    range: string;
    description: string;
    severity: string;
  };
  polygonCoords: [number, number][];
}

export interface OverlapResult {
  voronoiIndex: number;
  voronoiData: VoronoiPolygonData;
  overlapArea: number;
  overlapPercentage: number;
}

/**
 * Convert tile coordinates to geographic coordinates
 * @param tileCoords Array of [x, y] in tile pixel space (0-4096)
 * @param extent Tile extent (usually 4096)
 * @param z Zoom level
 * @param x Tile X coordinate
 * @param y Tile Y coordinate  
 */
export function tilePixelToLngLat(
  tileCoords: number[][],
  extent: number,
  z: number,
  x: number,
  y: number
): [number, number][] {
  const geoCoords: [number, number][] = [];
  
  for (const [px, py] of tileCoords) {
    // Convert from tile pixel (0-4096) to tile fraction (0-1)
    const tileX = x + px / extent;
    const tileY = y + py / extent;
    
    // Convert tile coordinates to lng/lat
    const n = Math.pow(2, z);
    const lng = (tileX / n) * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileY / n)));
    const lat = latRad * 180 / Math.PI;
    
    geoCoords.push([lng, lat]);
  }
  
  return geoCoords;
}

/**
 * Convert Leaflet polygon coordinates [lat, lng] to Turf polygon [lng, lat]
 */
export function polygonToTurfPolygon(leafletCoords: [number, number][]): Feature<Polygon> | null {
  try {
    if (!leafletCoords || leafletCoords.length < 3) {
      return null;
    }

    // Convert from [lat, lng] to [lng, lat] and close the polygon if not already closed
    const turfCoords = leafletCoords.map(([lat, lng]) => [lng, lat]);
    
    // Ensure polygon is closed (first point === last point)
    const firstPoint = turfCoords[0];
    const lastPoint = turfCoords[turfCoords.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      turfCoords.push([...firstPoint]);
    }

    return turf.polygon([turfCoords]);
  } catch (error) {
    console.warn('[geometryUtils] Error converting polygon:', error);
    return null;
  }
}

/**
 * Convert vector tile geometry to Turf polygon with tile coordinates
 * @param geometry Vector tile geometry (array of rings with {x, y} points)
 * @param extent Tile extent (usually 4096)
 * @param z Zoom level
 * @param tileX Tile X coordinate
 * @param tileY Tile Y coordinate
 */
export function vectorTileGeometryToTurfPolygon(
  geometry: any,
  extent: number = 4096,
  z: number = 0,
  tileX: number = 0,
  tileY: number = 0
): Feature<Polygon> | null {
  try {
    if (!geometry || !Array.isArray(geometry) || geometry.length === 0) {
      return null;
    }

    // Take the first ring (outer boundary)
    const ring = geometry[0];
    if (!Array.isArray(ring) || ring.length < 3) {
      return null;
    }

    // Convert tile pixel coordinates to [lng, lat]
    const tileCoords = ring.map((point: { x: number; y: number }) => [point.x, point.y]);
    const geoCoords = tilePixelToLngLat(tileCoords, extent, z, tileX, tileY);
    
    // Ensure polygon is closed
    const firstPoint = geoCoords[0];
    const lastPoint = geoCoords[geoCoords.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      geoCoords.push([...firstPoint]);
    }

    return turf.polygon([geoCoords]);
  } catch (error) {
    console.warn('[geometryUtils] Error converting vector tile geometry:', error);
    return null;
  }
}

/**
 * Fast bounding box overlap check - much faster than full polygon intersection
 * Returns true if bounding boxes overlap, false otherwise
 */
export function bboxOverlaps(
  bbox1: [number, number, number, number],
  bbox2: [number, number, number, number]
): boolean {
  // bbox format: [minX, minY, maxX, maxY] or [west, south, east, north]
  return !(
    bbox1[2] < bbox2[0] || // bbox1 east < bbox2 west
    bbox1[0] > bbox2[2] || // bbox1 west > bbox2 east
    bbox1[3] < bbox2[1] || // bbox1 north < bbox2 south
    bbox1[1] > bbox2[3]    // bbox1 south > bbox2 north
  );
}

/**
 * Calculate overlap between a village polygon and all Voronoi polygons
 * Returns the Voronoi with the largest overlap area
 * Optimized with bounding box pre-filtering
 */
export function calculatePolygonOverlap(
  villagePolygon: Feature<Polygon>,
  voronoiPolygons: VoronoiPolygonData[]
): OverlapResult | null {
  try {
    if (!villagePolygon || !voronoiPolygons || voronoiPolygons.length === 0) {
      return null;
    }

    const villageArea = turf.area(villagePolygon);
    if (villageArea === 0) {
      return null;
    }

    // Get village bounding box for fast pre-filtering
    const villageBbox = turf.bbox(villagePolygon);

    let maxOverlap: OverlapResult | null = null;
    let checkedCount = 0;
    let skippedCount = 0;

    // Use for loop instead of forEach to allow early exit
    for (let index = 0; index < voronoiPolygons.length; index++) {
      const voronoiData = voronoiPolygons[index];
      
      try {
        const voronoiTurf = polygonToTurfPolygon(voronoiData.polygonCoords);
        if (!voronoiTurf) continue;

        // OPTIMIZATION: Fast bounding box check first
        const voronoiBbox = turf.bbox(voronoiTurf);
        if (!bboxOverlaps(villageBbox as [number, number, number, number], voronoiBbox as [number, number, number, number])) {
          skippedCount++;
          continue; // Skip expensive polygon intersection if bboxes don't overlap
        }

        checkedCount++;

        // Calculate intersection only if bboxes overlap
        const intersection = turf.intersect(
          turf.featureCollection([villagePolygon, voronoiTurf])
        );

        if (intersection) {
          const overlapArea = turf.area(intersection);
          
          if (overlapArea > 0) {
            const overlapPercentage = (overlapArea / villageArea) * 100;

            // Keep track of the largest overlap
            if (!maxOverlap || overlapArea > maxOverlap.overlapArea) {
              maxOverlap = {
                voronoiIndex: index,
                voronoiData,
                overlapArea,
                overlapPercentage
              };
              
              // OPTIMIZATION: Early exit if we found nearly 100% coverage
              // No need to check other voronoi polygons
              if (overlapPercentage > 99) {
                break; // Stop checking other polygons
              }
            }
          }
        }
      } catch (error) {
        // Skip invalid polygons silently
      }
    }

    // Debug info for performance monitoring
    if (maxOverlap && checkedCount + skippedCount <= 3) {
      console.log(`⚡ Overlap calc: checked ${checkedCount}, skipped ${skippedCount} (bbox optimization)`);
    }

    return maxOverlap;
  } catch (error) {
    console.warn('[geometryUtils] Error in calculatePolygonOverlap:', error);
    return null;
  }
}

/**
 * Batch calculate overlaps for multiple village polygons
 * Returns a map of featureId -> OverlapResult for caching
 */
export function batchCalculateOverlaps(
  villageFeatures: Array<{ id: string | number; polygon: Feature<Polygon> }>,
  voronoiPolygons: VoronoiPolygonData[]
): Map<string | number, OverlapResult> {
  const results = new Map<string | number, OverlapResult>();

  villageFeatures.forEach(({ id, polygon }) => {
    const overlap = calculatePolygonOverlap(polygon, voronoiPolygons);
    if (overlap) {
      results.set(id, overlap);
    }
  });

  return results;
}

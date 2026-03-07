/**
 * Redux Custom Hooks: Map Data
 * Convenient hooks for accessing map-related Redux data in components
 */

import { useAppSelector, useAppDispatch } from '../store';
import {
  selectVoronoiPolygons,
  selectOverlapCache,
  selectDevicesArray,
  selectDevicesByStatus,
  selectLatestReadingPerDevice,
  selectShouldUpdateDeviceColors,
} from '../store/selectors';
import {
  selectDevice,
  selectCity,
  setZoom,
  setFilters,
  setShowMarkers,
  setShowDistrictLayer,
} from '../store/slices/mapSlice';
import { invalidateCache, invalidateVoronoiCache } from '../store/slices/cacheSlice';

/**
 * Hook: useMapViewport
 * Get/set map zoom level
 */
export const useMapViewport = () => {
  const dispatch = useAppDispatch();

  return {
    setZoom: (zoom: number) => {
      dispatch(setZoom(zoom));
    },
  };
};

/**
 * Hook: useMapData
 * Get map data with voronoi polygons, cache, and devices
 * CRITICAL: Uses selectOverlapCache which depends on cacheVersion
 * When realtimeData updates → invalidateCache() → cacheVersion increments → this hook recalculates
 */
export const useMapData = () => {
  const dispatch = useAppDispatch();
  const voronoiPolygons = useAppSelector(selectVoronoiPolygons);
  const overlapCache = useAppSelector(selectOverlapCache);
  const devices = useAppSelector(selectDevicesArray);
  const shouldUpdateColors = useAppSelector(selectShouldUpdateDeviceColors);

  return {
    voronoiPolygons,
    overlapCache,
    devices,
    shouldUpdateColors, // Signal to refresh colors
    invalidateCache: () => {
      dispatch(invalidateCache());
      dispatch(invalidateVoronoiCache());
    },
  };
};

/**
 * Hook: useSelectedDevice
 * Get/set selected device
 */
export const useSelectedDevice = () => {
  const dispatch = useAppDispatch();
  const selectedDevice = useAppSelector(selectLatestReadingPerDevice);

  return {
    selectDevice: (deviceId: string | null) => {
      dispatch(selectDevice(
        deviceId ? Array.from(selectedDevice.values())[0] : null
      ));
    },
  };
};

/**
 * Hook: useDevicesByStatus
 * Get devices grouped by operational status
 */
export const useDevicesByStatus = () => {
  return useAppSelector(selectDevicesByStatus);
};

/**
 * Hook: useDeviceReadings
 * Get latest readings for all devices
 */
export const useDeviceReadings = () => {
  return useAppSelector(selectLatestReadingPerDevice);
};

/**
 * Hook: useMapFilters
 * Get/set map filters
 */
export const useMapFilters = () => {
  const dispatch = useAppDispatch();

  return {
    setLocationFilters: (location: { provinsi?: string; kabupaten?: string }) => {
      dispatch(setFilters(location));
    },
  };
};

/**
 * Hook: useLayerVisibility
 * Get/set layer visibility
 */
export const useLayerVisibility = () => {
  const dispatch = useAppDispatch();

  return {
    toggleMarkers: () => {
      dispatch(setShowMarkers(true)); // Toggle logic would be in component
    },
    toggleDistrictLayer: () => {
      dispatch(setShowDistrictLayer(true)); // Toggle logic would be in component
    },
  };
};

/**
 * Hook: useCacheInvalidation
 * Manually trigger cache invalidation if needed
 * Useful for components that need to force a refresh
 */
export const useCacheInvalidation = () => {
  const dispatch = useAppDispatch();

  return {
    invalidateCache: () => {
      dispatch(invalidateCache());
    },
    invalidateVoronoiCache: () => {
      dispatch(invalidateVoronoiCache());
    },
    invalidateAll: () => {
      dispatch(invalidateCache());
      dispatch(invalidateVoronoiCache());
    },
  };
};

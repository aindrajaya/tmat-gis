/**
 * Redux Selectors: Map Data
 * Memoized selectors for map state and derived Voronoi polygons
 * CRITICAL: selectOverlapCache recalculates when voronoiPolygons OR cacheVersion changes
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { selectLatestReadingPerDevice } from './realtimeSelectors';
import { selectCacheVersion } from './cacheSelectors';

/**
 * Base selector: Get map state
 */
const selectMapState = (state: RootState) => state.map;

/**
 * Get map filters
 */
export const selectMapFilters = createSelector(
  [selectMapState],
  (map) => map.filters
);

/**
 * Get show district layer flag
 */
export const selectShowDistrictLayer = createSelector(
  [selectMapState],
  (map) => map.showDistrictLayer
);

/**
 * Get show markers flag
 */
export const selectShowMarkers = createSelector(
  [selectMapState],
  (map) => map.showMarkers
);

/**
 * Get selected device
 */
export const selectSelectedDevice = createSelector(
  [selectMapState],
  (map) => map.selectedDevice
);

/**
 * Get selected city
 */
export const selectSelectedCity = createSelector(
  [selectMapState],
  (map) => map.selectedCity
);

/**
 * Get zoom level
 */
export const selectZoom = createSelector(
  [selectMapState],
  (map) => map.zoom
);

/**
 * Get map loading status
 */
export const selectIsLoadingMap = createSelector(
  [selectMapState],
  (map) => map.isLoadingMap
);

/**
 * Get devices for voronoi calculation
 * CHANGES WHEN: selectedProvince, selectedDistrict, selectedCity, or layerVisibility changes
 */
export const selectDevicesForVoronoi = createSelector(
  [selectLatestReadingPerDevice, selectShowMarkers],
  (latestReadings, showMarkers) => {
    if (!latestReadings || latestReadings.size === 0 || !showMarkers) {
      return [];
    }

    return Array.from(latestReadings.values());
  }
);

/**
 * CRITICAL SELECTOR: Generate Voronoi polygons from device data
 * Direct dependency on selectDevicesForVoronoi
 * When voronoi polygons change, this notifies dependents
 */
export const selectVoronoiPolygons = createSelector(
  [selectDevicesForVoronoi, selectSelectedDevice],
  (devices, selectedDevice) => {
    if (!devices || devices.length < 3) {
      return [];
    }

    // Placeholder - actual implementation would use d3-delaunay
    // and convert to GeoJSON polygons
    return devices.map((device) => ({
      device,
      status: device.tmat_value > 30 ? 'critical' : 
              device.tmat_value >= 27 ? 'warning' : 'normal',
      coordinates: [], // Would be populated by Voronoi algorithm
    }));
  }
);

/**
 * Determine device status based on readings
 */
export const selectDeviceStatus = (deviceId: string) =>
  createSelector(
    [selectLatestReadingPerDevice],
    (latestReadings) => {
      const reading = latestReadings.get(deviceId);
      if (!reading) return 'unknown';

      if (reading.tmat_value > 30 || reading.suhu_value > 45) {
        return 'critical';
      }
      if (reading.tmat_value >= 27 || reading.suhu_value >= 35) {
        return 'warning';
      }
      return 'normal';
    }
  );

/**
 * Get color for device based on status
 */
export const selectDeviceColor = (deviceId: string) =>
  createSelector(
    [selectDeviceStatus(deviceId)],
    (status) => {
      switch (status) {
        case 'critical':
          return '#FF0000'; // Red
        case 'warning':
          return '#FFA500'; // Orange
        case 'normal':
          return '#00AA00'; // Green
        default:
          return '#CCCCCC'; // Gray
      }
    }
  );

/**
 * Get all devices as array (for mapping)
 */
export const selectDevicesArray = createSelector(
  [selectLatestReadingPerDevice],
  (latestReadings) => Array.from(latestReadings.values())
);

/**
 * Get device count
 */
export const selectDeviceCount = createSelector(
  [selectDevicesArray],
  (devices) => devices.length
);

/**
 * Get devices grouped by status
 */
export const selectDevicesByStatus = createSelector(
  [selectDevicesArray],
  (devices) => {
    const byStatus = {
      critical: [] as typeof devices,
      warning: [] as typeof devices,
      normal: [] as typeof devices,
    };

    devices.forEach((device) => {
      if (device.tmat_value > 30 || device.suhu_value > 45) {
        byStatus.critical.push(device);
      } else if (device.tmat_value >= 27 || device.suhu_value >= 35) {
        byStatus.warning.push(device);
      } else {
        byStatus.normal.push(device);
      }
    });

    return byStatus;
  }
);

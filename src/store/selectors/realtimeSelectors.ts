/**
 * Redux Selectors: Realtime Data
 * Memoized selectors for efficiently accessing and deriving realtime data
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import type { RealtimeData } from '../../types';

/**
 * Base selector: Get realtime state slice
 */
const selectRealtimeState = (state: RootState) => state.realtime;

/**
 * Get all realtime data records
 */
export const selectAllRealtimeData = createSelector(
  [selectRealtimeState],
  (realtime) => realtime.data
);

/**
 * Get loading status
 */
export const selectRealtimeLoading = createSelector(
  [selectRealtimeState],
  (realtime) => realtime.isLoading
);

/**
 * Get error status
 */
export const selectRealtimeError = createSelector(
  [selectRealtimeState],
  (realtime) => realtime.error
);

/**
 * Get latest timestamp of realtime data
 */
export const selectLatestTimestamp = createSelector(
  [selectAllRealtimeData],
  (data) => {
    if (!data || data.length === 0) return null;
    return data.reduce((latest, record) => {
      const recordTime = new Date(record.timestamp_data).getTime();
      return recordTime > (latest || 0) ? recordTime : latest;
    }, null as number | null);
  }
);

/**
 * Get realtime data grouped by device ID
 * Returns: Map of device_id_unik -> array of RealtimeData
 */
export const selectDeviceDataMap = createSelector(
  [selectAllRealtimeData],
  (data) => {
    const map = new Map<string, RealtimeData[]>();
    if (!data) return map;

    data.forEach((record) => {
      if (!map.has(record.device_id_unik)) {
        map.set(record.device_id_unik, []);
      }
      map.get(record.device_id_unik)!.push(record);
    });

    return map;
  }
);

/**
 * Get latest reading for each device
 * Returns: Map of device_id_unik -> most recent RealtimeData record
 */
export const selectLatestReadingPerDevice = createSelector(
  [selectDeviceDataMap],
  (deviceMap) => {
    const latestMap = new Map<string, RealtimeData>();

    deviceMap.forEach((records, deviceId) => {
      if (records.length > 0) {
        const latest = records.reduce((max, record) => {
          const maxTime = new Date(max.timestamp_data).getTime();
          const recordTime = new Date(record.timestamp_data).getTime();
          return recordTime > maxTime ? record : max;
        });
        latestMap.set(deviceId, latest);
      }
    });

    return latestMap;
  }
);

/**
 * Get average TMAT value across all devices
 */
export const selectAverageTmat = createSelector(
  [selectAllRealtimeData],
  (data) => {
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, record) => acc + (record.tmat_value || 0), 0);
    return sum / data.length;
  }
);

/**
 * Get average temperature across all devices
 */
export const selectAverageTemperature = createSelector(
  [selectAllRealtimeData],
  (data) => {
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, record) => acc + (record.suhu_value || 0), 0);
    return sum / data.length;
  }
);

/**
 * Get average pH across all devices
 */
export const selectAveragePh = createSelector(
  [selectAllRealtimeData],
  (data) => {
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, record) => acc + (record.ph_value || 0), 0);
    return sum / data.length;
  }
);

/**
 * Get count of records by status
 */
export const selectStatusCounts = createSelector(
  [selectAllRealtimeData],
  (data) => {
    const counts = { normal: 0, warning: 0, critical: 0 };
    if (!data) return counts;

    data.forEach((record) => {
      // Assume status is derived from values
      // Normal: TMAT < 27 and Temp < 35
      // Warning: TMAT 27-30 or Temp 35-45
      // Critical: TMAT > 30 or Temp > 45
      if (record.tmat_value > 30 || record.suhu_value > 45) {
        counts.critical++;
      } else if (record.tmat_value >= 27 || record.suhu_value >= 35) {
        counts.warning++;
      } else {
        counts.normal++;
      }
    });

    return counts;
  }
);

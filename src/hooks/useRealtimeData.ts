/**
 * Redux Custom Hooks: Real-time Data
 * Convenient hooks for accessing real-time device data
 */

import { useAppSelector, useAppDispatch } from '../store';
import { 
  selectAllRealtimeData,
  selectRealtimeLoading,
  selectRealtimeError,
  selectLatestReadingPerDevice,
  selectDeviceDataMap,
  selectAverageTmat,
  selectAverageTemperature,
  selectAveragePh,
  selectStatusCounts,
} from '../store/selectors';
import { realtimeApi } from '../store/api/realtimeApi';

/**
 * Hook: useRealtimeData
 * Get all real-time device data with loading/error states
 */
export const useRealtimeData = () => {
  const data = useAppSelector(selectAllRealtimeData);
  const loading = useAppSelector(selectRealtimeLoading);
  const error = useAppSelector(selectRealtimeError);

  return {
    data,
    loading,
    error,
    isEmpty: !data || data.length === 0,
  };
};

/**
 * Hook: useLatestDeviceReadings
 * Get latest reading for each device
 */
export const useLatestDeviceReadings = () => {
  return useAppSelector(selectLatestReadingPerDevice);
};

/**
 * Hook: useDeviceDataMap
 * Get real-time data grouped by device ID
 */
export const useDeviceDataMap = () => {
  return useAppSelector(selectDeviceDataMap);
};

/**
 * Hook: useAverageMetrics
 * Get average TMAT, temperature, and pH across all devices
 */
export const useAverageMetrics = () => {
  const avgTmat = useAppSelector(selectAverageTmat);
  const avgTemp = useAppSelector(selectAverageTemperature);
  const avgPh = useAppSelector(selectAveragePh);

  return {
    tmat: avgTmat,
    temperature: avgTemp,
    ph: avgPh,
  };
};

/**
 * Hook: useStatusCounts
 * Get count of devices by status (normal, warning, critical)
 */
export const useStatusCounts = () => {
  return useAppSelector(selectStatusCounts);
};

/**
 * Hook: useRefreshRealtimeData
 * Manually trigger real-time data refresh
 */
export const useRefreshRealtimeData = () => {
  const dispatch = useAppDispatch();

  return {
    refresh: () => {
      // Trigger RTK Query refetch by invalidating cache
      dispatch(realtimeApi.util.invalidateTags(['RealtimeData']));
    },
  };
};

/**
 * Hook: useDeviceStatus
 * Get status (normal, warning, critical) for a specific device
 */
export const useDeviceStatus = (deviceId: string) => {
  const latestReadings = useAppSelector(selectLatestReadingPerDevice);

  const reading = latestReadings.get(deviceId);
  if (!reading) return 'unknown' as const;

  if (reading.tmat_value > 30 || reading.suhu_value > 45) {
    return 'critical' as const;
  }
  if (reading.tmat_value >= 27 || reading.suhu_value >= 35) {
    return 'warning' as const;
  }
  return 'normal' as const;
};

/**
 * Hook: useDeviceColor
 * Get color for device based on its status
 */
export const useDeviceColor = (deviceId: string) => {
  const status = useDeviceStatus(deviceId);

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
};

/**
 * Hook: useRealtimeStats
 * Comprehensive hook for real-time statistics
 */
export const useRealtimeStats = () => {
  const data = useRealtimeData();
  const avgMetrics = useAverageMetrics();
  const statusCounts = useStatusCounts();
  const latestReadings = useLatestDeviceReadings();

  return {
    totalRecords: data.data?.length || 0,
    deviceCount: latestReadings.size,
    averageMetrics: avgMetrics,
    statusCounts,
    loading: data.loading,
    error: data.error,
  };
};

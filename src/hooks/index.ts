/**
 * Redux Custom Hooks - Root Exports
 * Central export point for all custom Redux hooks
 * Use these in components instead of directly calling useSelector/useDispatch
 */

// Map data hooks
export {
  useMapViewport,
  useMapData,
  useSelectedDevice,
  useDevicesByStatus,
  useDeviceReadings,
  useMapFilters,
  useLayerVisibility,
  useCacheInvalidation,
} from './useMapData';

// Raw data & pagination hooks
export {
  usePagination,
  useRawDataFilter,
  useRawDataSorting,
  useRawDataExport,
  usePaginatedQuery,
  useRawData,
} from './useRawData';

// UI layout hooks
export {
  useLegend,
  useStats,
  useFilterPanel,
  useNotification,
  useMapExpanded,
  usePanelManagement,
  useUILayout,
} from './useUILayout';

// Real-time data hooks
export {
  useRealtimeData,
  useLatestDeviceReadings,
  useDeviceDataMap,
  useAverageMetrics,
  useStatusCounts,
  useRefreshRealtimeData,
  useDeviceStatus,
  useDeviceColor,
  useRealtimeStats,
} from './useRealtimeData';

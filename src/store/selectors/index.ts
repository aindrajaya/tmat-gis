/**
 * Redux Selectors - Root Exports
 * Central export point for all memoized selectors
 * Selectors provide efficient, memoized access to Redux state
 */

// Realtime data selectors
export {
  selectAllRealtimeData,
  selectRealtimeLoading,
  selectRealtimeError,
  selectLatestTimestamp,
  selectDeviceDataMap,
  selectLatestReadingPerDevice,
  selectAverageTmat,
  selectAverageTemperature,
  selectAveragePh,
  selectStatusCounts,
} from './realtimeSelectors';

// Map selectors
export {
  selectMapFilters,
  selectShowDistrictLayer,
  selectShowMarkers,
  selectSelectedDevice,
  selectSelectedCity,
  selectZoom,
  selectIsLoadingMap,
  selectDevicesForVoronoi,
  selectVoronoiPolygons,
  selectDeviceStatus,
  selectDeviceColor,
  selectDevicesArray,
  selectDeviceCount,
  selectDevicesByStatus,
} from './mapSelectors';

// Cache selectors - CRITICAL FOR COLOR MISMATCH FIX
export {
  selectCacheVersion,
  selectVoronoiCacheVersion,
  selectCacheLastInvalidated,
  selectOverlapCache,
  selectTileProcessedCache,
  selectIsTileProcessed,
  selectCacheStats,
  selectCacheInvalidationReason,
  selectCacheRefreshTrigger,
  selectShouldRecomputeVillageOverlap,
  selectShouldUpdateDeviceColors,
} from './cacheSelectors';

// Raw data & pagination selectors
export {
  selectCurrentPage,
  selectPageSize,
  selectFilterParams,
  selectIsExporting,
  selectExportFormat,
  selectTotalRecords,
  selectOffset,
  selectTotalPages,
  selectHasNextPage,
  selectHasPreviousPage,
  selectHasActiveFilters,
  selectSortConfig,
} from './rawDataSelectors';

// UI state selectors
export {
  selectLegendOpen,
  selectStatsOpen,
  selectSettingsOpen,
  selectFilterOpen,
  selectAdvancedFilterOpen,
  selectBasemapOpen,
  selectSelectedBasemap,
  selectIsMapExpanded,
  selectNotification,
  selectHasNotification,
  selectOpenPanelCount,
  selectHasFilterPanelOpen,
  selectAllPanelStates,
  selectSidebarVisible,
  selectLayoutMode,
} from './uiSelectors';

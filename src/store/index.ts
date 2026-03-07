/**
 * Redux Store Root Exports
 * Central export point for all store exports, actions, and hooks
 */

// Store and hooks
export { store as default, useAppDispatch, useAppSelector } from './store';
export type { RootState, AppDispatch } from './store';

// API endpoints
export * from './api/realtimeApi';
export * from './api/devicesApi';
export * from './api/rawDataApi';

// Slice actions
export { default as realtimeSlice } from './slices/realtimeSlice';
export {
  setRealtimeData,
  addRealtimeData,
  clearRealtimeData,
} from './slices/realtimeSlice';

export { default as cacheSlice } from './slices/cacheSlice';
export {
  invalidateCache,
  invalidateVoronoiCache,
  updateCache,
  setCalculating,
  setCalculationError,
  clearCache,
} from './slices/cacheSlice';

export { default as mapSlice } from './slices/mapSlice';
export {
  setFilters as setMapFilters,
  clearFilters as clearMapFilters,
  updateFilter,
  toggleDistrictLayer,
  setShowDistrictLayer,
  toggleShowMarkers,
  setShowMarkers,
  selectDevice,
  selectCity,
  setZoom,
  setMapLoading,
  resetMap,
} from './slices/mapSlice';

export { default as rawDataSlice } from './slices/rawDataSlice';
export {
  setCurrentPage,
  setPageSize,
  setFilters as setRawDataFilters,
  clearFilters as clearRawDataFilters,
  setTotalRecords,
  startExport,
  endExport,
  setSortBy,
  resetRawData,
} from './slices/rawDataSlice';

export { default as uiSlice } from './slices/uiSlice';
export {
  toggleLegend,
  setLegendOpen,
  toggleStats,
  setStatsOpen,
  toggleSettings,
  toggleFilter,
  setFilterOpen,
  toggleAdvancedFilter,
  setAdvancedFilterOpen,
  toggleBasemap,
  selectBasemap,
  toggleMapExpanded,
  setMapExpanded,
  showNotification,
  hideNotification,
  closeAllPanels,
} from './slices/uiSlice';

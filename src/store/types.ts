/**
 * Redux Store Type Definitions
 * Central type definitions for the entire Redux store
 */

import { realtimeSlice } from './slices/realtimeSlice';
import { mapSlice } from './slices/mapSlice';
import { cacheSlice } from './slices/cacheSlice';
import { uiSlice } from './slices/uiSlice';
import { rawDataSlice } from './slices/rawDataSlice';
import { realtimeApi } from './api/realtimeApi';
import { devicesApi } from './api/devicesApi';
import { rawDataApi } from './api/rawDataApi';

/**
 * Root State Type
 * Automatically inferred from all reducers
 */
export type RootState = ReturnType<typeof rootReducer>;

/**
 * Store configuration type
 */
type StoreConfig = {
  realtime: typeof realtimeSlice.reducer;
  map: typeof mapSlice.reducer;
  cache: typeof cacheSlice.reducer;
  ui: typeof uiSlice.reducer;
  rawData: typeof rawDataSlice.reducer;
  [realtimeApi.reducerPath]: ReturnType<typeof realtimeApi.reducer>;
  [devicesApi.reducerPath]: ReturnType<typeof devicesApi.reducer>;
  [rawDataApi.reducerPath]: ReturnType<typeof rawDataApi.reducer>;
};

// This will be used in store configuration
export function rootReducer(state: any, action: any) {
  return {
    realtime: realtimeSlice.reducer(state?.realtime, action),
    map: mapSlice.reducer(state?.map, action),
    cache: cacheSlice.reducer(state?.cache, action),
    ui: uiSlice.reducer(state?.ui, action),
    rawData: rawDataSlice.reducer(state?.rawData, action),
    [realtimeApi.reducerPath]: realtimeApi.reducer(state?.[realtimeApi.reducerPath], action),
    [devicesApi.reducerPath]: devicesApi.reducer(state?.[devicesApi.reducerPath], action),
    [rawDataApi.reducerPath]: rawDataApi.reducer(state?.[rawDataApi.reducerPath], action),
  };
}

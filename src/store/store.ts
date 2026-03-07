/**
 * Redux Store Configuration
 * Combines all slices, API reducers, and middleware into a single store
 */

import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// API endpoints
import { realtimeApi } from './api/realtimeApi';
import { devicesApi } from './api/devicesApi';
import { rawDataApi } from './api/rawDataApi';

// Slices
import realtimeReducer from './slices/realtimeSlice';
import cacheReducer from './slices/cacheSlice';
import mapReducer from './slices/mapSlice';
import rawDataReducer from './slices/rawDataSlice';
import uiReducer from './slices/uiSlice';

// Middleware
import { 
  cacheInvalidationMiddleware, 
  reactiveInvalidationMiddleware,
  cachePerformanceMiddleware 
} from './middleware/cacheInvalidationMiddleware';

/**
 * Configure Redux store with:
 * - All RTK Query API reducers (automatic cache management)
 * - Domain slices (realtime, cache, map, rawData, ui)
 * - Middleware for cache invalidation and async thunk handling
 */
export const store = configureStore({
  reducer: {
    // RTK Query API cache reducers
    [realtimeApi.reducerPath]: realtimeApi.reducer,
    [devicesApi.reducerPath]: devicesApi.reducer,
    [rawDataApi.reducerPath]: rawDataApi.reducer,

    // Domain slices
    realtime: realtimeReducer,
    cache: cacheReducer,
    map: mapReducer,
    rawData: rawDataReducer,
    ui: uiReducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Exclude RTK Query actions and metadata from serialization complaints
        // RTK stores non-serializable function references which is fine
        ignoredActions: [
          'realtime/pending',
          'realtime/fulfilled',
          'realtime/rejected',
          'devices/pending',
          'devices/fulfilled',
          'devices/rejected',
          'rawData/pending',
          'rawData/fulfilled',
          'rawData/rejected',
        ],
        ignoredPaths: [
          'realtime.queries',
          'realtime.mutations',
          'devices.queries',
          'devices.mutations',
          'rawData.queries',
          'rawData.mutations',
          'realtime.provided',
          'devices.provided',
          'rawData.provided',
        ],
      },
    })
      // Add RTK Query middleware - handles cache management, refetching, etc.
      .concat(realtimeApi.middleware)
      .concat(devicesApi.middleware)
      .concat(rawDataApi.middleware)
      // Add custom cache invalidation middleware
      .concat(cacheInvalidationMiddleware)
      .concat(reactiveInvalidationMiddleware)
      .concat(cachePerformanceMiddleware),

  /**
   * Enable Redux DevTools for debugging in development
   * Shows action history, state changes, time-travel debugging
   */
  devTools: process.env.NODE_ENV !== 'production' ? {
    trace: true,
    traceLimit: 25,
    maxAge: 50, // Keep last 50 actions in history
  } : false,
});

// Export types for use throughout the app
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Pre-typed useDispatch hook
 * Use this instead of plain useDispatch for better type safety
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Pre-typed useSelector hook
 * Use this instead of plain useSelector for better type safety
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;

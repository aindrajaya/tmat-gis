/**
 * Redux Middleware: Cache Invalidation
 * Automatically invalidates cache when realtime data updates
 * This closes the loop: RTK Query data arrives → invalidateCache() dispatched → selectors recalculate → colors update
 */

import { MiddlewareAPI, isAction } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../store';
import { invalidateCache, invalidateVoronoiCache } from '../slices/cacheSlice';
import { realtimeApi } from '../api/realtimeApi';

/**
 * Create cache invalidation middleware
 * Listens for RTK Query data updates and triggers cache recalculation
 */
export const cacheInvalidationMiddleware = 
  (store: MiddlewareAPI<AppDispatch, RootState>) =>
  (next: (action: any) => any) =>
  (action: any) => {
    // Always call next to continue the middleware chain
    const result = next(action);

    /**
     * Detect RTK Query realtime data fulfillment
     * When getRealtimeData query completes successfully
     */
    if (
      realtimeApi.endpoints.getRealtimeData.matchFulfilled(action) ||
      realtimeApi.endpoints.getRealtimeDevice.matchFulfilled(action)
    ) {
      // Invalidate general cache
      // This increments cacheVersion, triggering selector recalculation
      store.dispatch(invalidateCache());

      // Also invalidate voronoi-specific cache
      // This signals village overlap calculation needs refresh
      store.dispatch(invalidateVoronoiCache());

      console.debug(
        '[Cache] Invalidated on realtime data update',
        action.payload
      );
    }

    /**
     * Detect RTK Query realtime data loading/pending
     * When query starts refetching
     */
    if (realtimeApi.endpoints.getRealtimeData.matchPending(action)) {
      // Optional: Add loading state tracking here if needed
      console.debug('[Cache] Realtime data refetch pending');
    }

    /**
     * Handle RTK Query errors
     * Could optionally add error handling logic
     */
    if (realtimeApi.endpoints.getRealtimeData.matchRejected(action)) {
      console.error('[Cache] Realtime data fetch failed:', action.payload);
    }

    return result;
  };

/**
 * Alternative middleware: Reactive cache invalidation
 * Invalidates cache based on state changes
 * More granular control but more complex
 */
export const reactiveInvalidationMiddleware =
  (store: MiddlewareAPI<AppDispatch, RootState>) =>
  (next: (action: any) => any) =>
  (action: any) => {
    const stateBefore = store.getState();
    const result = next(action);
    const stateAfter = store.getState();

    /**
     * Detect when filters change
     * If viewport or selected device changes, recalculate voronoi
     */
    if (
      stateBefore.map.viewport !== stateAfter.map.viewport ||
      stateBefore.map.selectedDevice !== stateAfter.map.selectedDevice
    ) {
      store.dispatch(invalidateVoronoiCache());
      console.debug('[Cache] Invalidated on viewport/device change');
    }

    /**
     * Detect when layer visibility changes
     * If layer visibility toggled, recalculate cache
     */
    if (
      stateBefore.map.layerVisibility !== stateAfter.map.layerVisibility
    ) {
      store.dispatch(invalidateCache());
      console.debug('[Cache] Invalidated on layer visibility change');
    }

    return result;
  };

/**
 * Logging middleware for cache operations
 * Helps debug cache invalidation chains
 */
export const cacheLoggingMiddleware =
  (store: MiddlewareAPI<AppDispatch, RootState>) =>
  (next: (action: any) => any) =>
  (action: any) => {
    // Log cache-related actions
    if (
      action.type === 'cache/invalidateCache' ||
      action.type === 'cache/invalidateVoronoiCache'
    ) {
      const state = store.getState();
      console.debug(
        '[DEBUG] Cache Action:',
        action.type,
        'Version:',
        state.cache.cacheVersion,
        'Timestamp:',
        new Date().toISOString()
      );
    }

    return next(action);
  };

/**
 * Debounced cache invalidation middleware
 * Prevents cache invalidation storms when multiple updates arrive rapidly
 */
let invalidationTimeout: ReturnType<typeof setTimeout> | null = null;
const INVALIDATION_DEBOUNCE_MS = 100;

export const debouncedInvalidationMiddleware =
  (store: MiddlewareAPI<AppDispatch, RootState>) =>
  (next: (action: any) => any) =>
  (action: any) => {
    const result = next(action);

    // Clear existing timeout
    if (invalidationTimeout) {
      clearTimeout(invalidationTimeout);
    }

    // Check if this is a data update action that should trigger cache invalidation
    if (
      realtimeApi.endpoints.getRealtimeData.matchFulfilled(action) ||
      realtimeApi.endpoints.getRealtimeDevice.matchFulfilled(action)
    ) {
      // Debounce the invalidation
      invalidationTimeout = setTimeout(() => {
        const state = store.getState();

        // Only invalidate if cache isn't already recent
        const timeSinceLastInvalidation = 
          Date.now() - state.cache.lastInvalidatedAt;

        if (timeSinceLastInvalidation > INVALIDATION_DEBOUNCE_MS) {
          store.dispatch(invalidateCache());
          store.dispatch(invalidateVoronoiCache());
          console.debug('[Cache] Debounced invalidation triggered');
        }
      }, INVALIDATION_DEBOUNCE_MS);
    }

    return result;
  };

/**
 * Combine all middleware for simplified store configuration
 * Use this in store.ts middleware chain
 */
export const cacheMiddlewareChain = [
  cacheInvalidationMiddleware,
  reactiveInvalidationMiddleware,
  cacheLoggingMiddleware,
];

/**
 * Performance monitoring middleware
 * Tracks how often cache is invalidated (useful for optimization)
 */
let invalidationCount = 0;
let lastLogTime = Date.now();

export const cachePerformanceMiddleware =
  (store: MiddlewareAPI<AppDispatch, RootState>) =>
  (next: (action: any) => any) =>
  (action: any) => {
    if (
      action.type === 'cache/invalidateCache' ||
      action.type === 'cache/invalidateVoronoiCache'
    ) {
      invalidationCount++;

      // Log stats every 10 seconds
      const now = Date.now();
      if (now - lastLogTime > 10000) {
        console.debug(
          `[PERF] Cache invalidations in last 10s: ${invalidationCount}`
        );
        invalidationCount = 0;
        lastLogTime = now;
      }
    }

    return next(action);
  };

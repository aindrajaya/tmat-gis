/**
 * Redux Slice: Cache Management
 * Manages overlap cache and cache invalidation
 * KEY: This fixes the color mismatch problem with auto-invalidation
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OverlapResult } from '../../utils/geometryUtils';

interface CacheState {
  overlapCache: Map<string | number, OverlapResult> | null;
  cacheVersion: number; // Increment to force recalculation
  voronoiCacheVersion: number; // Increment when voronoi changes
  isCalculating: boolean;
  lastCalculation: number;
  calculationError: string | null;
}

const initialState: CacheState = {
  overlapCache: null,
  cacheVersion: 0,
  voronoiCacheVersion: 0,
  isCalculating: false,
  lastCalculation: 0,
  calculationError: null,
};

export const cacheSlice = createSlice({
  name: 'cache',
  initialState,
  reducers: {
    /**
     * ✅ KEY ACTION: Invalidate cache
     * This is called when realtime data changes or filters change
     * Triggers automatic recalculation in selectors
     */
    invalidateCache: (state) => {
      state.cacheVersion += 1;
      state.overlapCache = null; // Clear for recalculation
      console.log(`🔄 Cache invalidated! Version: ${state.cacheVersion}`);
    },

    /**
     * ✅ KEY ACTION: Invalidate voronoi-specific cache
     * Called when voronoi polygons change
     */
    invalidateVoronoiCache: (state) => {
      state.voronoiCacheVersion += 1;
      state.cacheVersion += 1;
      state.overlapCache = null;
      console.log(`🔄 Voronoi cache invalidated! Version: ${state.voronoiCacheVersion}`);
    },

    /**
     * Update cache with new calculated overlaps
     */
    updateCache: (
      state,
      action: PayloadAction<Map<string | number, OverlapResult>>
    ) => {
      state.overlapCache = action.payload;
      state.lastCalculation = Date.now();
      state.isCalculating = false;
      state.calculationError = null;
    },

    /**
     * Set calculation in progress
     */
    setCalculating: (state, action: PayloadAction<boolean>) => {
      state.isCalculating = action.payload;
    },

    /**
     * Set calculation error
     */
    setCalculationError: (state, action: PayloadAction<string | null>) => {
      state.calculationError = action.payload;
      state.isCalculating = false;
    },

    /**
     * Clear entire cache
     */
    clearCache: (state) => {
      state.overlapCache = null;
      state.cacheVersion = 0;
      state.voronoiCacheVersion = 0;
      state.lastCalculation = 0;
      state.calculationError = null;
      console.log('🧹 Cache cleared completely');
    },
  },
});

export const {
  invalidateCache,
  invalidateVoronoiCache,
  updateCache,
  setCalculating,
  setCalculationError,
  clearCache,
} = cacheSlice.actions;

export default cacheSlice.reducer;

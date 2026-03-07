/**
 * Redux Slice: Real-time Data
 * Stores real-time data from API and metadata
 */

import { createSlice } from '@reduxjs/toolkit';
import { realtimeApi } from '../api/realtimeApi';
import { RealtimeData } from '../../types';

interface RealtimeState {
  data: RealtimeData[];
  lastUpdate: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: RealtimeState = {
  data: [],
  lastUpdate: 0,
  isLoading: false,
  error: null,
};

export const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    /**
     * Manually set realtime data (if needed outside RTK Query)
     */
    setRealtimeData: (state, action) => {
      state.data = action.payload;
      state.lastUpdate = Date.now();
      state.error = null;
    },

    /**
     * Add new realtime data records
     */
    addRealtimeData: (state, action) => {
      state.data = [...state.data, ...action.payload];
      state.lastUpdate = Date.now();
    },

    /**
     * Clear realtime data
     */
    clearRealtimeData: (state) => {
      state.data = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Handle RTK Query lifecycle
    builder
      .addMatcher(
        realtimeApi.endpoints.getRealtimeData.matchPending,
        (state) => {
          state.isLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        realtimeApi.endpoints.getRealtimeData.matchFulfilled,
        (state, { payload }) => {
          state.data = payload;
          state.lastUpdate = Date.now();
          state.isLoading = false;
          state.error = null;
        }
      )
      .addMatcher(
        realtimeApi.endpoints.getRealtimeData.matchRejected,
        (state, { error }) => {
          state.isLoading = false;
          state.error = error.message || 'Failed to fetch real-time data';
        }
      );
  },
});

export const { setRealtimeData, addRealtimeData, clearRealtimeData } = realtimeSlice.actions;
export default realtimeSlice.reducer;

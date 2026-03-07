/**
 * Redux Slice: Raw Data Table
 * Manages pagination and filtering for RawData table
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RawDataFilters {
  provinsi?: string;
  kabupaten?: string;
  startDate?: string;
  endDate?: string;
  searchText?: string;
  sortBy?: 'timestamp' | 'device_id' | 'tmat_value';
  sortOrder?: 'asc' | 'desc';
}

interface RawDataState {
  currentPage: number;
  pageSize: number;
  filters: RawDataFilters;
  totalRecords: number;
  isExporting: boolean;
  exportFormat?: 'csv' | 'xlsx' | 'pdf';
}

const initialState: RawDataState = {
  currentPage: 1,
  pageSize: 50,
  filters: {
    provinsi: '',
    kabupaten: '',
    startDate: '',
    endDate: '',
    searchText: '',
    sortBy: 'timestamp',
    sortOrder: 'desc',
  },
  totalRecords: 0,
  isExporting: false,
};

export const rawDataSlice = createSlice({
  name: 'rawData',
  initialState,
  reducers: {
    /**
     * Set current page (triggers new RTK query)
     */
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },

    /**
     * Update filters (reset page to 1)
     */
    setFilters: (state, action: PayloadAction<Partial<RawDataFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1; // Reset to first page on filter change
    },

    /**
     * Clear all filters
     */
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.currentPage = 1;
    },

    /**
     * Set total records (from API response)
     */
    setTotalRecords: (state, action: PayloadAction<number>) => {
      state.totalRecords = action.payload;
    },

    /**
     * Start export process
     */
    startExport: (
      state,
      action: PayloadAction<'csv' | 'xlsx' | 'pdf'>
    ) => {
      state.isExporting = true;
      state.exportFormat = action.payload;
    },

    /**
     * End export process
     */
    endExport: (state) => {
      state.isExporting = false;
      state.exportFormat = undefined;
    },

    /**
     * Set sorting
     */
    setSortBy: (
      state,
      action: PayloadAction<{
        field: 'timestamp' | 'device_id' | 'tmat_value';
        order: 'asc' | 'desc';
      }>
    ) => {
      state.filters.sortBy = action.payload.field;
      state.filters.sortOrder = action.payload.order;
      state.currentPage = 1; // Reset on sort change
    },

    /**
     * Set page size
     */
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
      state.currentPage = 1; // Reset when page size changes
    },

    /**
     * Reset raw data to initial state
     */
    resetRawData: (state) => {
      state.currentPage = 1;
      state.filters = initialState.filters;
      state.totalRecords = 0;
      state.isExporting = false;
    },
  },
});

export const {
  setCurrentPage,
  setFilters,
  clearFilters,
  setTotalRecords,
  startExport,
  endExport,
  setSortBy,
  setPageSize,
  resetRawData,
} = rawDataSlice.actions;

export default rawDataSlice.reducer;

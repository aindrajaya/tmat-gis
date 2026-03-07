/**
 * Redux Selectors: Raw Data & Pagination
 * Memoized selectors for paginated raw data state
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

/**
 * Base selector: Get raw data state
 */
const selectRawDataState = (state: RootState) => state.rawData;

/**
 * Get current page number
 */
export const selectCurrentPage = createSelector(
  [selectRawDataState],
  (rawData) => rawData.currentPage
);

/**
 * Get page size
 */
export const selectPageSize = createSelector(
  [selectRawDataState],
  (rawData) => rawData.pageSize
);

/**
 * Get filter parameters
 */
export const selectFilterParams = createSelector(
  [selectRawDataState],
  (rawData) => rawData.filters
);

/**
 * Get export status
 */
export const selectIsExporting = createSelector(
  [selectRawDataState],
  (rawData) => rawData.isExporting
);

/**
 * Get export format
 */
export const selectExportFormat = createSelector(
  [selectRawDataState],
  (rawData) => rawData.exportFormat
);

/**
 * Get total records count
 */
export const selectTotalRecords = createSelector(
  [selectRawDataState],
  (rawData) => rawData.totalRecords
);

/**
 * Calculate offset from page number
 */
export const selectOffset = createSelector(
  [selectCurrentPage, selectPageSize],
  (page, pageSize) => (page - 1) * pageSize
);

/**
 * Calculate total pages
 */
export const selectTotalPages = createSelector(
  [selectTotalRecords, selectPageSize],
  (total, pageSize) => Math.ceil(total / pageSize)
);

/**
 * Check if there's a next page
 */
export const selectHasNextPage = createSelector(
  [selectCurrentPage, selectTotalPages],
  (page, totalPages) => page < totalPages
);

/**
 * Check if there's a previous page
 */
export const selectHasPreviousPage = createSelector(
  [selectCurrentPage],
  (page) => page > 1
);

/**
 * Check if filters are active
 */
export const selectHasActiveFilters = createSelector(
  [selectFilterParams],
  (filters) => Object.values(filters).some(v => v !== undefined && v !== null && v !== '')
);

/**
 * Get sorting configuration
 */
export const selectSortConfig = createSelector(
  [selectFilterParams],
  (filters) => ({
    sortBy: filters.sortBy || 'timestamp',
    sortOrder: filters.sortOrder || 'desc',
  })
);

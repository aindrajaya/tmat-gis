/**
 * Redux Custom Hooks: Raw Data & Pagination
 * Convenient hooks for accessing paginated raw data in components
 */

import { useAppSelector, useAppDispatch } from '../store';
import {
  selectCurrentPage,
  selectPageSize,
} from '../store/selectors';
import {
  setCurrentPage,
  setPageSize,
  setFilters,
  clearFilters,
  startExport,
  endExport,
  setSortBy,
} from '../store/slices/rawDataSlice';

/**
 * Hook: usePagination
 * Get/set pagination state (current page, page size)
 */
export const usePagination = () => {
  const dispatch = useAppDispatch();
  const currentPage = useAppSelector(selectCurrentPage);
  const pageSize = useAppSelector(selectPageSize);

  return {
    currentPage,
    pageSize,
    setCurrentPage: (page: number) => {
      dispatch(setCurrentPage(page));
    },
    setPageSize: (size: number) => {
      dispatch(setPageSize(size));
    },
    nextPage: () => {
      dispatch(setCurrentPage(currentPage + 1));
    },
    previousPage: () => {
      dispatch(setCurrentPage(Math.max(1, currentPage - 1)));
    },
  };
};

/**
 * Hook: useRawDataFilter
 * Get/set raw data search and filters
 */
export const useRawDataFilter = () => {
  const dispatch = useAppDispatch();

  return {
    setFilters: (filters: Record<string, any>) => {
      dispatch(setFilters(filters));
      dispatch(setCurrentPage(1)); // Reset to first page on filter change
    },
    clearFilters: () => {
      dispatch(clearFilters());
      dispatch(setCurrentPage(1));
    },
  };
};

/**
 * Hook: useRawDataSorting
 * Get/set sorting configuration
 */
export const useRawDataSorting = () => {
  const dispatch = useAppDispatch();

  return {
    setSortBy: (field: 'timestamp' | 'device_id' | 'tmat_value', order: 'asc' | 'desc') => {
      dispatch(setSortBy({ field, order }));
    },
  };
};

/**
 * Hook: useRawDataExport
 * Get/set export status and trigger exports
 */
export const useRawDataExport = () => {
  const dispatch = useAppDispatch();

  return {
    startExport: (format: 'csv' | 'xlsx' | 'pdf') => {
      dispatch(startExport(format));
    },
    completeExport: () => {
      dispatch(endExport());
    },
  };
};

/**
 * Hook: usePaginatedQuery
 * Get all pagination parameters for API query
 */
export const usePaginatedQuery = () => {
  const dispatch = useAppDispatch();
  const currentPage = useAppSelector(selectCurrentPage);
  const pageSize = useAppSelector(selectPageSize);

  return {
    currentPage,
    pageSize,
    setPage: (page: number) => {
      dispatch(setCurrentPage(page));
    },
    setPageSize: (size: number) => {
      dispatch(setPageSize(size));
    },
  };
};

/**
 * Hook: useRawData
 * Comprehensive hook for raw data table management
 * Combines pagination, filtering, sorting, and export
 */
export const useRawData = () => {
  const pagination = usePagination();
  const filter = useRawDataFilter();
  const sorting = useRawDataSorting();
  const exportTools = useRawDataExport();

  return {
    // Pagination
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize,
    setCurrentPage: pagination.setCurrentPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Filtering
    setFilters: filter.setFilters,
    clearFilters: filter.clearFilters,

    // Sorting
    setSortBy: sorting.setSortBy,

    // Export
    startExport: exportTools.startExport,
    completeExport: exportTools.completeExport,
  };
};

/**
 * RTK Query API: Raw Data Table Endpoints
 * Handles pagination and server-side filtering for RawData table
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseFetchQuery } from './baseApi';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RawDataParams {
  page: number;
  pageSize: number;
  perusahaanId?: number;
  provinsi?: string;
  kabupaten?: string;
  startDate?: string;
  endDate?: string;
  searchText?: string;
  sortBy?: 'timestamp' | 'device_id' | 'tmat_value';
  sortOrder?: 'asc' | 'desc';
}

export const rawDataApi = createApi({
  reducerPath: 'rawDataApi',
  baseQuery: baseFetchQuery,
  tagTypes: ['RawData'],

  endpoints: (builder) => ({
    /**
     * Get paginated raw data with server-side filtering
     * Each page is cached separately
     */
    getRawDataPaginated: builder.query<
      PaginatedResponse<any>,
      RawDataParams
    >({
      query: (params) => ({
        url: '/realtime/paginated',
        params: {
          page: params.page,
          pageSize: params.pageSize,
          perusahaanId: params.perusahaanId,
          provinsi: params.provinsi,
          kabupaten: params.kabupaten,
          startDate: params.startDate,
          endDate: params.endDate,
          searchText: params.searchText,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        },
      }),
      serializeQueryArgs: ({ queryArgs }) => {
        // Cache separately per page + filter combination
        return {
          page: queryArgs.page,
          pageSize: queryArgs.pageSize,
          provinsi: queryArgs.provinsi,
          kabupaten: queryArgs.kabupaten,
          startDate: queryArgs.startDate,
          endDate: queryArgs.endDate,
          searchText: queryArgs.searchText,
          sortBy: queryArgs.sortBy,
          sortOrder: queryArgs.sortOrder,
        };
      },
      merge: (existing, incoming) => incoming,
      keepUnusedDataFor: 300, // Cache each page for 5 minutes
      providesTags: ['RawData'],
    }),

    /**
     * Export raw data (streaming from server)
     */
    exportRawData: builder.query<
      Blob,
      {
        format: 'csv' | 'xlsx' | 'pdf';
        filters: Partial<RawDataParams>;
      }
    >({
      query: ({ format, filters }) => ({
        url: '/realtime/export',
        params: {
          format,
          page: filters.page,
          pageSize: filters.pageSize,
          perusahaanId: filters.perusahaanId,
          provinsi: filters.provinsi,
          kabupaten: filters.kabupaten,
          startDate: filters.startDate,
          endDate: filters.endDate,
          searchText: filters.searchText,
        },
        responseHandler: (response) => response.blob(),
      }),
      keepUnusedDataFor: 0, // Never cache exports
    }),
  }),
});

export const {
  useGetRawDataPaginatedQuery,
  useExportRawDataQuery,
} = rawDataApi;

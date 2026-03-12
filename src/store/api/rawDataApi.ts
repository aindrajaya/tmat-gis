/**
 * RTK Query API: Raw Data Table Endpoints
 * Handles pagination and server-side filtering for RawData table
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseFetchQuery } from './baseApi';
import { getAPIClient } from '../../../services/apiClient';
import {
  filterAndPaginateRealtime,
  getScopedPerusahaanId,
  toRtkQueryError,
} from './runtimeScope';

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
      queryFn: async (params) => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId(params.perusahaanId);

          const [realtimeData, devices] = await Promise.all([
            client.getRealtimeAll(scopedPerusahaanId),
            client.getDevice(undefined, scopedPerusahaanId),
          ]);

          const result = filterAndPaginateRealtime(realtimeData, devices, {
            page: params.page,
            pageSize: params.pageSize,
            perusahaanId: scopedPerusahaanId,
            provinsi: params.provinsi,
            kabupaten: params.kabupaten,
            startDate: params.startDate,
            endDate: params.endDate,
            searchText: params.searchText,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
          });

          return { data: result };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
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
      queryFn: async ({ filters }) => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId(filters.perusahaanId);
          const [realtimeData, devices] = await Promise.all([
            client.getRealtimeAll(scopedPerusahaanId),
            client.getDevice(undefined, scopedPerusahaanId),
          ]);

          const filtered = filterAndPaginateRealtime(realtimeData, devices, {
            page: 1,
            pageSize: Math.max(realtimeData.length, 1),
            perusahaanId: scopedPerusahaanId,
            provinsi: filters.provinsi,
            kabupaten: filters.kabupaten,
            startDate: filters.startDate,
            endDate: filters.endDate,
            searchText: filters.searchText,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
          }).data;

          const csvRows = [
            'timestamp_data,device_id_unik,tmat_value,suhu_value,ph_value',
            ...filtered.map(
              (row) =>
                `${row.timestamp_data},${row.device_id_unik},${row.tmat_value},${row.suhu_value},${row.ph_value}`
            ),
          ];

          const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
          return { data: blob };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
      keepUnusedDataFor: 0, // Never cache exports
    }),
  }),
});

export const {
  useGetRawDataPaginatedQuery,
  useExportRawDataQuery,
} = rawDataApi;

/**
 * RTK Query API: Real-time Data Endpoints
 * Handles fetching real-time device data with polling
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseFetchQuery } from './baseApi';
import { RealtimeData } from '../../types';

export const realtimeApi = createApi({
  reducerPath: 'realtimeApi',
  baseQuery: baseFetchQuery,
  tagTypes: ['Realtime'],
  
  endpoints: (builder) => ({
    /**
     * Get all real-time data with polling
     * Polls every 5 seconds
     */
    getRealtimeData: builder.query<RealtimeData[], number | undefined>({
      query: (perusahaanId) => ({
        url: '/realtime',
        params: perusahaanId ? { perusahaanId } : undefined,
      }),
      pollingInterval: 5 * 1000, // Poll every 5 seconds
      keepUnusedDataFor: 30, // Keep in cache for 30 seconds after no queries
      providesTags: ['Realtime'],
    }),

    /**
     * Get real-time data for specific device with date range
     */
    getRealtimeDevice: builder.query<
      RealtimeData[],
      {
        deviceId: string;
        startDate: string;
        endDate: string;
      }
    >({
      query: ({ deviceId, startDate, endDate }) => ({
        url: `/realtime_device`,
        params: {
          device_id: deviceId,
          startDate,
          endDate,
        },
      }),
      keepUnusedDataFor: 60,
      providesTags: ['Realtime'],
    }),

    /**
     * Get paginated real-time data (for RawData table)
     * Server-side pagination and filtering
     */
    getRealtimeDataPaginated: builder.query<
      {
        data: RealtimeData[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      },
      {
        page: number;
        pageSize: number;
        perusahaanId?: number;
        provinsi?: string;
        kabupaten?: string;
        startDate?: string;
        endDate?: string;
        searchText?: string;
      }
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
        },
      }),
      serializeQueryArgs: ({ queryArgs }) => {
        const { page, pageSize, ...rest } = queryArgs;
        return { page, pageSize, ...rest };
      },
      merge: (existing, incoming) => incoming,
      keepUnusedDataFor: 300, // Cache each page for 5 minutes
      providesTags: ['Realtime'],
    }),

    /**
     * Export real-time data (streaming)
     */
    exportRealtimeData: builder.query<
      Blob,
      {
        format: 'csv' | 'xlsx' | 'pdf';
        provinsi?: string;
        kabupaten?: string;
        startDate?: string;
        endDate?: string;
        perusahaanId?: number;
      }
    >({
      query: (params) => ({
        url: '/realtime/export',
        params: {
          format: params.format,
          provinsi: params.provinsi,
          kabupaten: params.kabupaten,
          startDate: params.startDate,
          endDate: params.endDate,
          perusahaanId: params.perusahaanId,
        },
        responseHandler: (response) => response.blob(),
      }),
      keepUnusedDataFor: 0, // Never cache exports
    }),
  }),
});

export const {
  useGetRealtimeDataQuery,
  useGetRealtimeDeviceQuery,
  useGetRealtimeDataPaginatedQuery,
  useExportRealtimeDataQuery,
} = realtimeApi;

/**
 * RTK Query API: Real-time Data Endpoints
 * Handles fetching real-time device data with polling
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseFetchQuery } from './baseApi';
import { RealtimeData } from '../../types';
import { getAPIClient } from '../../../services/apiClient';
import {
  filterAndPaginateRealtime,
  getScopedPerusahaanId,
  toRtkQueryError,
} from './runtimeScope';

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
      queryFn: async (perusahaanId) => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId(perusahaanId);
          const data = await client.getRealtimeAll(scopedPerusahaanId);
          return { data };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
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
        perusahaanId?: number;
        limit?: number;
        offset?: number;
      }
    >({
      queryFn: async ({ deviceId, startDate, endDate, perusahaanId, limit, offset }) => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId(perusahaanId);
          const data = await client.getRealtimeDevice(
            deviceId,
            startDate,
            endDate,
            limit ?? 100,
            offset ?? 0,
            scopedPerusahaanId
          );
          return { data };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
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
          });

          return { data: result };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
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
      queryFn: async (params) => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId(params.perusahaanId);
          const [realtimeData, devices] = await Promise.all([
            client.getRealtimeAll(scopedPerusahaanId),
            client.getDevice(undefined, scopedPerusahaanId),
          ]);
          const filtered = filterAndPaginateRealtime(realtimeData, devices, {
            page: 1,
            pageSize: Math.max(realtimeData.length, 1),
            perusahaanId: scopedPerusahaanId,
            provinsi: params.provinsi,
            kabupaten: params.kabupaten,
            startDate: params.startDate,
            endDate: params.endDate,
            searchText: undefined,
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
  useGetRealtimeDataQuery,
  useGetRealtimeDeviceQuery,
  useGetRealtimeDataPaginatedQuery,
  useExportRealtimeDataQuery,
} = realtimeApi;

/**
 * RTK Query API: Device Master Data Endpoints
 * Handles fetching device master data (devices, perusahaan, locations)
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseFetchQuery } from './baseApi';
import { Device, Perusahaan } from '../../types';
import { getAPIClient } from '../../../services/apiClient';
import { getScopedPerusahaanId, toRtkQueryError } from './runtimeScope';

export const devicesApi = createApi({
  reducerPath: 'devicesApi',
  baseQuery: baseFetchQuery,
  tagTypes: ['Devices', 'Companies', 'Locations'],

  endpoints: (builder) => ({
    /**
     * Get all devices
     * Cache for 1 hour - master data changes rarely
     */
    getAllDevices: builder.query<Device[], number | undefined>({
      queryFn: async (perusahaanId) => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId(perusahaanId);
          const data = await client.getDevice(undefined, scopedPerusahaanId);
          return { data };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
      keepUnusedDataFor: 3600, // 1 hour
      providesTags: ['Devices'],
    }),

    /**
     * Get specific device
     */
    getDevice: builder.query<Device | null, string>({
      queryFn: async (deviceId) => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId();
          const data = await client.getDeviceById(deviceId, scopedPerusahaanId);
          return { data };
        } catch (error) {
          // Keep backward compatibility with old endpoint contract that may return null.
          if (error instanceof Error && /not found/i.test(error.message)) {
            return { data: null };
          }
          return { error: toRtkQueryError(error) };
        }
      },
      keepUnusedDataFor: 3600,
      providesTags: ['Devices'],
    }),

    /**
     * Get all companies
     */
    getAllCompanies: builder.query<Perusahaan[], number | undefined>({
      queryFn: async (perusahaanId) => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId(perusahaanId);
          const data = await client.getPerusahaan(scopedPerusahaanId);
          return { data };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
      keepUnusedDataFor: 3600,
      providesTags: ['Companies'],
    }),

    /**
     * Get location options (provinces, regencies, districts)
     */
    getLocations: builder.query<
      {
        provinsi: string[];
        kabupaten: string[];
        kecamatan: string[];
      },
      void
    >({
      queryFn: async () => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId();
          const devices = await client.getDevice(undefined, scopedPerusahaanId);
          const provinsi = [...new Set(devices.map((d) => d.provinsi).filter(Boolean))].sort();
          const kabupaten = [...new Set(devices.map((d) => d.kabupaten).filter(Boolean))].sort();
          // Existing UI maps "kecamatan" to device.kota in this codebase.
          const kecamatan = [...new Set(devices.map((d) => d.kota).filter(Boolean))].sort();

          return {
            data: {
              provinsi,
              kabupaten,
              kecamatan,
            },
          };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
      keepUnusedDataFor: 3600,
      providesTags: ['Locations'],
    }),

    /**
     * Get provinces
     */
    getProvinces: builder.query<string[], void>({
      queryFn: async () => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId();
          const devices = await client.getDevice(undefined, scopedPerusahaanId);
          const data = [...new Set(devices.map((d) => d.provinsi).filter(Boolean))].sort();
          return { data };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
      keepUnusedDataFor: 3600,
      providesTags: ['Locations'],
    }),

    /**
     * Get regencies by province
     */
    getRegencies: builder.query<string[], string>({
      queryFn: async (province) => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId();
          const devices = await client.getDevice(undefined, scopedPerusahaanId);
          const data = [
            ...new Set(
              devices
                .filter((d) => d.provinsi === province)
                .map((d) => d.kabupaten)
                .filter(Boolean)
            ),
          ].sort();
          return { data };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
      keepUnusedDataFor: 3600,
      providesTags: ['Locations'],
    }),

    /**
     * Get districts by province and regency
     */
    getDistricts: builder.query<
      string[],
      { province: string; regency: string }
    >({
      queryFn: async ({ province, regency }) => {
        try {
          const client = getAPIClient();
          const scopedPerusahaanId = getScopedPerusahaanId();
          const devices = await client.getDevice(undefined, scopedPerusahaanId);
          const data = [
            ...new Set(
              devices
                .filter(
                  (d) => d.provinsi === province && d.kabupaten === regency
                )
                .map((d) => d.kota)
                .filter(Boolean)
            ),
          ].sort();
          return { data };
        } catch (error) {
          return { error: toRtkQueryError(error) };
        }
      },
      keepUnusedDataFor: 3600,
      providesTags: ['Locations'],
    }),
  }),
});

export const {
  useGetAllDevicesQuery,
  useGetDeviceQuery,
  useGetAllCompaniesQuery,
  useGetLocationsQuery,
  useGetProvincesQuery,
  useGetRegenciesQuery,
  useGetDistrictsQuery,
} = devicesApi;

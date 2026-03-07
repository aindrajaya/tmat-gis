/**
 * RTK Query API: Device Master Data Endpoints
 * Handles fetching device master data (devices, perusahaan, locations)
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseFetchQuery } from './baseApi';
import { Device, Perusahaan } from '../../types';

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
      query: (perusahaanId) => ({
        url: '/device',
        params: perusahaanId ? { perusahaanId } : undefined,
      }),
      keepUnusedDataFor: 3600, // 1 hour
      providesTags: ['Devices'],
    }),

    /**
     * Get specific device
     */
    getDevice: builder.query<Device | null, string>({
      query: (deviceId) => ({
        url: `/device/${deviceId}`,
      }),
      keepUnusedDataFor: 3600,
      providesTags: ['Devices'],
    }),

    /**
     * Get all companies
     */
    getAllCompanies: builder.query<Perusahaan[], number | undefined>({
      query: (perusahaanId) => ({
        url: '/perusahaan',
        params: perusahaanId ? { perusahaanId } : undefined,
      }),
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
      query: () => ({
        url: '/locations',
      }),
      keepUnusedDataFor: 3600,
      providesTags: ['Locations'],
    }),

    /**
     * Get provinces
     */
    getProvinces: builder.query<string[], void>({
      query: () => ({
        url: '/locations/provinces',
      }),
      keepUnusedDataFor: 3600,
      providesTags: ['Locations'],
    }),

    /**
     * Get regencies by province
     */
    getRegencies: builder.query<string[], string>({
      query: (province) => ({
        url: `/locations/regencies`,
        params: { province },
      }),
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
      query: ({ province, regency }) => ({
        url: `/locations/districts`,
        params: { province, regency },
      }),
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

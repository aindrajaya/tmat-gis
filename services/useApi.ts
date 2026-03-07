/**
 * React hooks for API client
 * Provides easy access to API client in components with error and loading state handling
 */

import { useState, useCallback, useEffect } from 'react';
import { getAPIClient, APIClient } from './apiClient';
import { Device, Perusahaan, RealtimeData } from '../types';
import { MOCK_REALTIME } from './mockData';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Generic hook for API calls
 * Automatically fetches data on mount and provides refetch function
 */
export function useApi<T>(
  apiFunc: (client: APIClient) => Promise<T>
): UseApiState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const client = getAPIClient();
      const result = await apiFunc(client);
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [apiFunc]);

  // Auto-fetch on mount only (empty dependency array)
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, refetch };
}

/**
 * Hook to get all devices
 */
export function useDevices(perusahaanId?: number) {
  return useApi<Device[]>((client) => client.getDevice(undefined, perusahaanId));
}

/**
 * Hook to get specific device by ID
 */
export function useDeviceById(deviceId: string, perusahaanId?: number) {
  const [state, setState] = useState<UseApiState<Device>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!deviceId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState({ data: null, loading: true, error: null });
    try {
      const client = getAPIClient();
      const result = await client.getDeviceById(deviceId, perusahaanId);
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [deviceId, perusahaanId]);

  return { ...state, fetch };
}

/**
 * Hook to get all companies
 */
export function usePerusahaan(id?: number) {
  return useApi<Perusahaan[]>((client) => client.getPerusahaan(id));
}

/**
 * Hook to get specific company by ID
 */
export function usePerusahaanById(id: number) {
  const [state, setState] = useState<UseApiState<Perusahaan>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!id) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState({ data: null, loading: true, error: null });
    try {
      const client = getAPIClient();
      const result = await client.getPerusahaanById(id);
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [id]);

  return { ...state, fetch };
}

/**
 * Hook to get realtime data summary
 */
export function useRealtimeAll(idPerusahaan?: number) {
  return useApi<RealtimeData[]>((client) =>
    client.getRealtimeAll(idPerusahaan)
  );
}

/**
 * Hook to get realtime device data with date range
 * Returns November 2025 data only for display
 */
export function useRealtimeDevice(
  deviceId: string,
  startDate: string,
  endDate: string,
  limit: number = 100,
  offset: number = 0
) {
  const [state, setState] = useState<UseApiState<RealtimeData[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!deviceId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState({ data: null, loading: true, error: null });
    try {
      // Return mock data filtered by device - no date filtering for development/demo purposes
      const filtered = MOCK_REALTIME
        .filter(r => r.device_id_unik === deviceId)
        .sort((a, b) => new Date(a.timestamp_data).getTime() - new Date(b.timestamp_data).getTime()); // Ascending order for charts

      // apply offset/limit
      const result = filtered.slice(offset, offset + limit);

      // simulate async API delay
      await new Promise((res) => setTimeout(res, 200));
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [deviceId, limit, offset]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, fetch };
}

/**
 * Hook to get API client directly (for manual API calls)
 */
export function useAPIClient() {
  return getAPIClient();
}

/**
 * React hooks for API client
 * Provides easy access to API client in components with error and loading state handling
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAPIClient, APIClient, PublicMapDeviceFilters } from './apiClient';
import { Device, Perusahaan, PublicMapAnalytics, PublicMapDevice, PublicMapSummary, RealtimeData } from '../types';
import { splitDateRangeIntoChunks, DateChunk } from '../utils/dateChunking';

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
  const query = useQuery({
    queryKey: ['devices', perusahaanId ?? 'all'],
    queryFn: async () => {
      const client = getAPIClient();
      return client.getDevice(undefined, perusahaanId);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    loading: (query.isLoading || query.isFetching) && !query.data,
    error: (query.error as Error | null) ?? null,
    refetch: async () => {
      await query.refetch();
    },
  };
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
  const query = useQuery({
    queryKey: ['perusahaan', id ?? 'all'],
    queryFn: async () => {
      const client = getAPIClient();
      return client.getPerusahaan(id);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    loading: (query.isLoading || query.isFetching) && !query.data,
    error: (query.error as Error | null) ?? null,
    refetch: async () => {
      await query.refetch();
    },
  };
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
  const query = useQuery({
    queryKey: ['realtime-all', idPerusahaan ?? 'all'],
    queryFn: async () => {
      const client = getAPIClient();
      return client.getRealtimeAll(idPerusahaan);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    loading: (query.isLoading || query.isFetching) && !query.data,
    error: (query.error as Error | null) ?? null,
    refetch: async () => {
      await query.refetch();
    },
  };
}

export function usePublicMapSummary() {
  const query = useQuery({
    queryKey: ['public-map-summary'],
    queryFn: async () => {
      const client = getAPIClient();
      return client.getPublicMapSummary();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    loading: (query.isLoading || query.isFetching) && !query.data,
    error: (query.error as Error | null) ?? null,
    refetch: async () => {
      await query.refetch();
    },
  };
}

export function usePublicMapDevices(filters: PublicMapDeviceFilters | null) {
  const query = useQuery({
    queryKey: ['public-map-devices', filters],
    queryFn: async () => {
      if (!filters) {
        return [];
      }
      const client = getAPIClient();
      return client.getPublicMapDevices(filters);
    },
    enabled: !!filters,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    loading: (query.isLoading || query.isFetching) && !query.data,
    error: (query.error as Error | null) ?? null,
    refetch: async () => {
      await query.refetch();
    },
  };
}

export function usePublicMapAnalytics(filters: Record<string, string>) {
  const query = useQuery({
    queryKey: ['public-map-analytics', filters],
    queryFn: async () => {
      const client = getAPIClient();
      return client.getPublicMapAnalytics(filters);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    loading: (query.isLoading || query.isFetching) && !query.data,
    error: (query.error as Error | null) ?? null,
    refetch: async () => {
      await query.refetch();
    },
  };
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
  offset: number = 0,
  perusahaanId?: number
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
      const client = getAPIClient();
      const result = await client.getRealtimeDevice(
        deviceId,
        startDate,
        endDate,
        limit,
        offset,
        perusahaanId
      );
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [deviceId, startDate, endDate, limit, offset, perusahaanId]);

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

// ============================================================================
// React Query Hooks for Historical Data with Chunking
// ============================================================================

export interface ChunkProgress {
  completed: number;
  total: number;
  currentChunk?: number;
}

/**
 * React Query hook to fetch historical data for a single 30-day chunk
 * Fetches all devices in parallel for the specified date range
 * 
 * @param devices - Array of devices to fetch data for
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param perusahaanId - Optional company ID filter
 * @param enabled - Whether to enable the query (default: true)
 * @returns React Query result with historical data
 */
export function useSingleChunkHistoricalData(
  devices: Device[],
  startDate: string,
  endDate: string,
  perusahaanId?: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['historical-chunk', devices.map(d => d.device_id_unik).sort(), startDate, endDate],
    queryFn: async () => {
      if (!devices.length || !startDate || !endDate) {
        return [];
      }

      const apiClient = getAPIClient();
      const limit = 500; // Records per API request

      // Helper function to fetch all pages for a single device
      const fetchAllPagesForDevice = async (deviceId: string): Promise<RealtimeData[]> => {
        let offset = 0;
        let keepGoing = true;
        let safety = 0;
        const allRows: RealtimeData[] = [];

        while (keepGoing && safety < 20) {
          try {
            const rows = await apiClient.getRealtimeDevice(
              deviceId,
              startDate,
              endDate,
              limit,
              offset,
              perusahaanId
            );
            allRows.push(...rows);
            
            if (rows.length < limit) {
              keepGoing = false;
            } else {
              offset += limit;
            }
          } catch (error) {
            console.error(`[useSingleChunkHistoricalData] Failed to fetch device ${deviceId}:`, error);
            keepGoing = false; // Stop on error for this device
          }
          safety += 1;
        }
        
        return allRows;
      };

      // Fetch all devices in parallel using Promise.allSettled
      const settled = await Promise.allSettled(
        devices.map((device) => fetchAllPagesForDevice(device.device_id_unik))
      );

      // Extract successful results and flatten
      const rows = settled
        .filter((item): item is PromiseFulfilledResult<RealtimeData[]> => item.status === 'fulfilled')
        .flatMap((item) => item.value);

      const failedCount = settled.filter((item) => item.status === 'rejected').length;
      if (failedCount > 0) {
        console.warn(
          `[useSingleChunkHistoricalData] ${failedCount} device(s) failed for chunk ${startDate} to ${endDate}`
        );
      }

      return rows;
    },
    enabled: enabled && devices.length > 0 && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Orchestrator hook to fetch historical data across multiple 30-day chunks sequentially
 * Splits large date ranges into chunks and fetches them one at a time
 * 
 * @param devices - Array of devices to fetch data for
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param perusahaanId - Optional company ID filter
 * @param enabled - Whether to enable fetching (default: true)
 * @returns State with accumulated data, loading status, and progress tracking
 */
export function useHistoricalDataAllChunks(
  devices: Device[],
  startDate: string,
  endDate: string,
  perusahaanId?: number,
  enabled: boolean = true
) {
  const [state, setState] = useState<{
    data: RealtimeData[];
    isLoading: boolean;
    error: Error | null;
    chunkProgress: { current: number; total: number };
    currentChunkRange?: { start: string; end: string };
  }>({
    data: [],
    isLoading: false,
    error: null,
    chunkProgress: { current: 0, total: 0 },
  });

  const [chunks, setChunks] = useState<DateChunk[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(-1);

  // Split date range into chunks when parameters change
  useEffect(() => {
    if (!enabled || !startDate || !endDate || devices.length === 0) {
      setChunks([]);
      setCurrentChunkIndex(-1);
      setState({
        data: [],
        isLoading: false,
        error: null,
        chunkProgress: { current: 0, total: 0 },
      });
      return;
    }

    try {
      const dateChunks = splitDateRangeIntoChunks(startDate, endDate, 30);
      setChunks(dateChunks);
      setCurrentChunkIndex(0); // Start with first chunk
      setState(prev => ({
        ...prev,
        data: [], // Reset accumulated data
        isLoading: true,
        error: null,
        chunkProgress: { current: 0, total: dateChunks.length },
      }));
    } catch (error) {
      setState({
        data: [],
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
        chunkProgress: { current: 0, total: 0 },
      });
    }
  }, [devices, startDate, endDate, perusahaanId, enabled]);

  // Fetch current chunk using React Query
  const currentChunk = currentChunkIndex >= 0 && currentChunkIndex < chunks.length 
    ? chunks[currentChunkIndex] 
    : null;

  const chunkQuery = useSingleChunkHistoricalData(
    devices,
    currentChunk?.start || '',
    currentChunk?.end || '',
    perusahaanId,
    !!currentChunk && enabled
  );

  // Handle chunk query results
  useEffect(() => {
    if (!currentChunk || !enabled) return;

    if (chunkQuery.isSuccess && chunkQuery.data) {
      // Append chunk data to accumulated data
      setState(prev => {
        const newData = [...prev.data, ...chunkQuery.data];
        const newCurrent = currentChunkIndex + 1;
        const isComplete = newCurrent >= chunks.length;

        return {
          data: newData,
          isLoading: !isComplete,
          error: null,
          chunkProgress: { 
            current: newCurrent, 
            total: chunks.length 
          },
          currentChunkRange: isComplete 
            ? undefined 
            : (chunks[newCurrent] ? { start: chunks[newCurrent].start, end: chunks[newCurrent].end } : undefined),
        };
      });

      // Move to next chunk if not complete
      if (currentChunkIndex + 1 < chunks.length) {
        setCurrentChunkIndex(currentChunkIndex + 1);
      }
    } else if (chunkQuery.isError) {
      // Handle error but continue to next chunk
      console.error(
        `[useHistoricalDataAllChunks] Chunk ${currentChunkIndex + 1}/${chunks.length} failed:`,
        chunkQuery.error
      );
      
      setState(prev => ({
        ...prev,
        error: chunkQuery.error as Error,
        chunkProgress: { 
          current: currentChunkIndex + 1, 
          total: chunks.length 
        },
      }));

      // Move to next chunk even on error (partial results)
      if (currentChunkIndex + 1 < chunks.length) {
        setCurrentChunkIndex(currentChunkIndex + 1);
      } else {
        // Last chunk failed, mark as complete
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [chunkQuery.isSuccess, chunkQuery.isError, chunkQuery.data, currentChunk, currentChunkIndex, chunks.length, enabled]);

  return state;
}

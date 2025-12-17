/**
 * API Client Service for TMAT Monitoring Dashboard
 * Handles all HTTP requests to backend API (production and development)
 */

import { Device, Perusahaan, PerusahaanWithDevices, RealtimeData } from '../types';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

export class APIClient {
  private config: ApiConfig;

  constructor(baseUrl: string, apiKey: string) {
    this.config = {
      baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
      apiKey,
    };
  }

  /**
   * Make HTTP request with common headers and error handling
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-KEY': this.config.apiKey,
      ...(options?.headers || {}),
    };

    console.log(`[API] Requesting: ${url}`, {
      apiKey: this.config.apiKey ? `***${this.config.apiKey.slice(-4)}` : 'MISSING',
      headers,
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`[API] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] Error response:`, errorText);
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log(`[API] Success:`, data);
      return data;
    } catch (error) {
      console.error(`[API] Request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    return searchParams.toString();
  }

  /**
   * Normalize perusahaan + devices payload from various possible shapes
   */
  private normalizePerusahaanDevicesResponse(
    response: any
  ): PerusahaanWithDevices[] {
    const perusahaanArray =
      Array.isArray(response?.perusahaan) ? response.perusahaan : null;

    const rawList =
      (Array.isArray(response) && response) ||
      perusahaanArray ||
      response?.perusahaan_devices ||
      response?.data ||
      response?.master_perusahaan ||
      response ||
      [];

    const list = Array.isArray(rawList) ? rawList : [rawList];

    return list
      .map((entry) => {
        if (!entry) return null;

        const perusahaanData =
          entry.perusahaan ||
          entry.company ||
          entry.master_perusahaan ||
          entry;

        const devices =
          entry.devices ||
          entry.master_device ||
          entry.device ||
          entry.data_devices ||
          entry.perusahaan_devices ||
          entry.master_device_perusahaan ||
          [];

        if (!Array.isArray(devices)) return null;

        return {
          ...(perusahaanData as Perusahaan),
          devices: devices as Device[],
        };
      })
      .filter(Boolean) as PerusahaanWithDevices[];
  }

  /**
   * GET /perusahaan - Get all companies or single company by ID
   */
  async getPerusahaan(id?: number): Promise<Perusahaan[]> {
    const query = id ? `?id=${id}` : '';
    const companies = await this.request<Perusahaan[]>(`/perusahaan${query}`);
    return id ? companies.filter((company) => company.id === id) : companies;
  }

  /**
   * GET /perusahaan?id={id} - Get specific company by ID
   */
  async getPerusahaanById(id: number): Promise<Perusahaan> {
    const companies = await this.getPerusahaan(id);
    const matched = companies.find((company) => company.id === id);
    if (!matched) {
      throw new Error(`Perusahaan with ID ${id} not found`);
    }
    return matched;
  }

  /**
   * GET /perusahaan/devices - Get devices grouped by perusahaan
   * If perusahaanId is provided, API returns that perusahaan and its devices (404 if missing)
   */
  async getPerusahaanDevices(
    perusahaanId?: number
  ): Promise<PerusahaanWithDevices[]> {
    const query = perusahaanId ? `?id=${perusahaanId}` : '';
    const response = await this.request<any>(`/perusahaan/devices${query}`);
    const normalized = this.normalizePerusahaanDevicesResponse(response);

    const scoped = perusahaanId
      ? normalized
          .filter((item) => item.id === perusahaanId)
          .map((item) => ({
            ...item,
            devices: (item.devices || []).filter(
              (device) => device.id_perusahaan === perusahaanId
            ),
          }))
      : normalized;

    if (!scoped.length && perusahaanId) {
      throw new Error(
        `Perusahaan with ID ${perusahaanId} not found or has no devices`
      );
    }

    return scoped;
  }

  /**
   * GET /perusahaan/devices - Get all devices (optionally scoped by perusahaan)
   * Falls back to legacy /device when no perusahaanId is provided and new endpoint fails
   */
  async getDevice(
    deviceId?: string,
    perusahaanId?: number
  ): Promise<Device[]> {
    try {
      const perusahaanDevices = await this.getPerusahaanDevices(perusahaanId);
      const devices = perusahaanDevices.flatMap((item) => item.devices || []);
      const filteredDevices = deviceId
        ? devices.filter((d) => d.device_id_unik === deviceId)
        : devices;
      const scopedDevices = perusahaanId
        ? filteredDevices.filter((d) => d.id_perusahaan === perusahaanId)
        : filteredDevices;

      if (!perusahaanId && scopedDevices.length === 0) {
        const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
        return this.request<Device[]>(`/device${query}`);
      }

      if (perusahaanId && scopedDevices.length === 0) {
        throw new Error(
          `Perusahaan with ID ${perusahaanId} not found or has no devices`
        );
      }

      return scopedDevices;
    } catch (error) {
      // For unscoped requests, fall back to legacy /device endpoint to keep backward compatibility
      if (!perusahaanId) {
        const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
        return this.request<Device[]>(`/device${query}`);
      }
      throw error;
    }
  }

  /**
   * Get specific device by device ID (optionally scoped by perusahaan)
   */
  async getDeviceById(
    deviceId: string,
    perusahaanId?: number
  ): Promise<Device> {
    const devices = await this.getDevice(deviceId, perusahaanId);
    if (devices.length === 0) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    return devices[0];
  }

  /**
   * GET /realtime_all - Get realtime data summary for all devices
   */
  async getRealtimeAll(idPerusahaan?: number): Promise<RealtimeData[]> {
    const query = idPerusahaan ? `?id_perusahaan=${idPerusahaan}` : '';
    return this.request<RealtimeData[]>(`/realtime_all${query}`);
  }

  /**
   * GET /realtime_device - Get realtime device data with date range and pagination
   * Handles response format differences between production and development APIs
   */
  async getRealtimeDevice(
    deviceId: string,
    startDate: string,
    endDate: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<RealtimeData[]> {
    const params = {
      device_id: deviceId,
      start_date: startDate,
      end_date: endDate,
      limit,
      offset,
    };

    const query = this.buildQueryString(params);
    const response = await this.request<any>(
      `/realtime_device?${query}`
    );

    // Handle API response format differences:
    // Development API: { data: [], total, offset, limit }
    // Production API: [] (array directly)
    if (Array.isArray(response)) {
      return response;
    }

    // Handle paginated response from development API
    if (response && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error('Unexpected response format from realtime_device endpoint');
  }

  /**
   * GET /realtime_device with pagination support
   * Returns paginated response metadata along with data
   */
  async getRealtimeDevicePaginated(
    deviceId: string,
    startDate: string,
    endDate: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<PaginatedResponse<RealtimeData>> {
    const params = {
      device_id: deviceId,
      start_date: startDate,
      end_date: endDate,
      limit,
      offset,
    };

    const query = this.buildQueryString(params);
    const response = await this.request<any>(
      `/realtime_device?${query}`
    );

    // If response is array (production format), convert to pagination format
    if (Array.isArray(response)) {
      return {
        data: response,
        total: response.length,
        offset: 0,
        limit: response.length,
      };
    }

    // Return paginated response as-is
    return response;
  }

  /**
   * Update API configuration (switch between dev/production)
   */
  updateConfig(baseUrl: string, apiKey: string): void {
    this.config = {
      baseUrl: baseUrl.replace(/\/$/, ''),
      apiKey,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

/**
 * Create API client instance with environment variables
 */
export function createAPIClient(): APIClient {
  const apiMode = (import.meta.env.VITE_API_MODE || 'dev') as 'dev' | 'prod';
  
  const baseUrl =
    apiMode === 'prod'
      ? import.meta.env.VITE_PROD_API_URL ||
        'https://staging.kurmaspace.com/klhk/app/index.php/api/portal_v1'
      : import.meta.env.VITE_DEV_API_URL ||
        'https://coherent-afton-aruskoding-32476f63.koyeb.app/api/portal_v1';

  const apiKey =
    apiMode === 'prod'
      ? import.meta.env.VITE_PROD_API_KEY || ''
      : import.meta.env.VITE_DEV_API_KEY || '';

  if (!apiKey) {
    console.warn(
      `API Key not configured for ${apiMode} mode. Requests will be made without authentication.`
    );
  }

  return new APIClient(baseUrl, apiKey);
}

/**
 * Singleton instance
 */
let apiClientInstance: APIClient | null = null;

export function getAPIClient(): APIClient {
  if (!apiClientInstance) {
    apiClientInstance = createAPIClient();
  }
  return apiClientInstance;
}

/**
 * Reset API client (useful for testing or switching configurations)
 */
export function resetAPIClient(): void {
  apiClientInstance = null;
}

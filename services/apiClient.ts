/**
 * API Client Service for TMAT Monitoring Dashboard
 * Handles all HTTP requests to backend API (production and development)
 */

import { Device, Perusahaan, RealtimeData } from '../types';

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
   * GET /perusahaan - Get all companies or single company by ID
   */
  async getPerusahaan(id?: number): Promise<Perusahaan[]> {
    const query = id ? `?id=${id}` : '';
    return this.request<Perusahaan[]>(`/perusahaan${query}`);
  }

  /**
   * GET /perusahaan?id={id} - Get specific company by ID
   */
  async getPerusahaanById(id: number): Promise<Perusahaan> {
    const companies = await this.getPerusahaan(id);
    if (companies.length === 0) {
      throw new Error(`Perusahaan with ID ${id} not found`);
    }
    return companies[0];
  }

  /**
   * GET /device - Get all devices or single device by device_id
   */
  async getDevice(deviceId?: string): Promise<Device[]> {
    const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    return this.request<Device[]>(`/device${query}`);
  }

  /**
   * GET /device?device_id={deviceId} - Get specific device by device ID
   */
  async getDeviceById(deviceId: string): Promise<Device> {
    const devices = await this.getDevice(deviceId);
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

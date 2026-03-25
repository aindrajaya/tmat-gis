import { Device, Perusahaan, PerusahaanWithDevices, RealtimeData } from '../types';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export function getApiHost() {
  const apiMode = (import.meta.env.VITE_API_MODE || 'dev') as 'dev' | 'prod';
  return apiMode === 'prod'
    ? import.meta.env.VITE_PROD_API_URL || 'https://proxy.yourdomain.com'
    : import.meta.env.VITE_DEV_API_URL || 'http://localhost:4000';
}

export function getAuthBaseUrl() {
  return `${getApiHost().replace(/\/$/, '')}/auth`;
}

function normalizeDevice(raw: any): Device {
  return {
    ...raw,
    id: Number(raw.id),
    id_perusahaan: Number(raw.id_perusahaan),
    id_site: raw.id_site == null ? undefined : Number(raw.id_site),
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    provinsi_id: raw.provinsi_id ?? raw.provinsi ?? null,
    kabupaten_id: raw.kabupaten_id ?? raw.kabupaten ?? null,
    kecamatan_id: raw.kecamatan_id ?? raw.kota ?? null,
    provinsi_nama: raw.provinsi_nama ?? raw.province_name ?? null,
    kabupaten_nama: raw.kabupaten_nama ?? raw.regency_name ?? null,
    kecamatan_nama: raw.kecamatan_nama ?? raw.district_name ?? null,
    kelurahan_nama: raw.kelurahan_nama ?? raw.village_name ?? null,
    desa: raw.desa ?? raw.alamat ?? null,
  };
}

function normalizeNumericValue(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return Number.NaN;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeRealtimeData(raw: any): RealtimeData {
  return {
    ...raw,
    id: Number(raw.id),
    tmat_value: normalizeNumericValue(raw.tmat_value),
    suhu_value: normalizeNumericValue(raw.suhu_value),
    ph_value: normalizeNumericValue(raw.ph_value),
    curah_hujan: normalizeNumericValue(
      raw.curah_hujan ?? raw.curah_hujan_value ?? raw.rain_value ?? raw.rainfall ?? raw.rainfall_value
    ),
    kelembapan: normalizeNumericValue(
      raw.kelembapan ?? raw.kelembapan_value ?? raw.humidity ?? raw.humidity_value
    ),
  };
}

export class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    perusahaanId?: number
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Automatically sends HttpOnly cookie to proxy
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`[API] Request failed for ${url}:`, error);
      throw error;
    }
  }

  async getPerusahaan(id?: number): Promise<Perusahaan[]> {
    if (id) {
      const response = await this.request<any>(`/proxy/perusahaan/${id}`);
      const data = response?.data ? [response.data] : [response];
      return data;
    }
    const response = await this.request<any>('/proxy/perusahaan');
    // Extract data array from wrapped response
    return Array.isArray(response) ? response : response?.data || [];
  }

  async getPerusahaanById(id: number): Promise<Perusahaan> {
    const companies = await this.getPerusahaan(id);
    return companies[0];
  }

  async getPerusahaanDevices(perusahaanId?: number): Promise<PerusahaanWithDevices[]> {
    const query = perusahaanId ? `?id=${perusahaanId}` : '';
    const response = await this.request<any>(`/proxy/perusahaan/devices${query}`);
    return Array.isArray(response) ? response : response?.data || [];
  }

  async getDevice(deviceId?: string, perusahaanId?: number): Promise<Device[]> {
    const params = new URLSearchParams();
    params.set('include_region_names', 'true');
    if (perusahaanId) params.set('id_perusahaan', String(perusahaanId));

    const endpoint = `/proxy/device?${params.toString()}`;
    console.log('[APIClient] Fetching devices from:', endpoint);
    
    const response = await this.request<any>(endpoint);
    
    console.log('[APIClient] getDevice response:', response);
    console.log('[APIClient] getDevice response type:', typeof response);
    console.log('[APIClient] getDevice is array?:', Array.isArray(response));
    
    // Extract data array from wrapped response
    const devices = (Array.isArray(response) ? response : response?.data || []).map(normalizeDevice);
    
    console.log('[APIClient] Extracted devices:', devices);
    console.log('[APIClient] Extracted devices is array?:', Array.isArray(devices));
    console.log('[APIClient] Extracted devices length:', devices.length);
    console.log('[APIClient] First normalized device:', devices[0]);
    console.log('[APIClient] First normalized coordinate types:', devices[0] ? {
      latitude: typeof devices[0].latitude,
      longitude: typeof devices[0].longitude,
    } : 'no devices');
    
    if (deviceId) {
      console.log('[APIClient] Filtering for deviceId:', deviceId);
      return devices.filter((d: any) => d.device_id_unik === deviceId || d.kode_device === deviceId);
    }
    return devices;
  }

  async getDeviceById(deviceId: string, perusahaanId?: number): Promise<Device> {
    const devices = await this.getDevice(deviceId, perusahaanId);
    return devices[0];
  }

  async getRealtimeAll(idPerusahaan?: number): Promise<RealtimeData[]> {
    const query = idPerusahaan ? `?id_perusahaan=${idPerusahaan}` : '';
    const response = await this.request<any>(`/proxy/realtime_all${query}`);
    return (Array.isArray(response) ? response : response?.data || []).map(normalizeRealtimeData);
  }

  async getRealtimeDevice(
    deviceId: string,
    startDate: string,
    endDate: string,
    limit: number = 100,
    offset: number = 0,
    perusahaanId?: number
  ): Promise<RealtimeData[]> {
    const params = new URLSearchParams({
      device_id: deviceId,
      start_date: startDate,
      end_date: endDate,
      limit: String(limit),
      offset: String(offset),
    });
    if (perusahaanId) params.append('id_perusahaan', String(perusahaanId));

    const response = await this.request<any>(`/proxy/realtime_device?${params.toString()}`);
    return (Array.isArray(response) ? response : response?.data || []).map(normalizeRealtimeData);
  }

  async getRealtimeDevicePaginated(
    deviceId: string,
    startDate: string,
    endDate: string,
    limit: number = 100,
    offset: number = 0,
    perusahaanId?: number
  ): Promise<PaginatedResponse<RealtimeData>> {
    const params = new URLSearchParams({
      device_id: deviceId,
      start_date: startDate,
      end_date: endDate,
      limit: String(limit),
      offset: String(offset),
    });
    if (perusahaanId) params.append('id_perusahaan', String(perusahaanId));

    const response = await this.request<PaginatedResponse<RealtimeData>>(`/proxy/realtime_device?${params.toString()}`);
    return {
      ...response,
      data: (response.data || []).map(normalizeRealtimeData),
    };
  }
}

let apiClientInstance: APIClient | null = null;
export function getAPIClient(): APIClient {
  if (!apiClientInstance) {
    apiClientInstance = new APIClient(getApiHost());
  }
  return apiClientInstance;
}

export function resetAPIClient(): void {
  apiClientInstance = null;
}

import {
  Device,
  Perusahaan,
  PerusahaanWithDevices,
  PublicMapAnalytics,
  PublicMapDevice,
  PublicMapSummary,
  RealtimeData
} from '../types';
import { getApiBaseUrl, getCurrentApiMode } from './apiConfig';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export function getApiHost() {
  return getApiBaseUrl(getCurrentApiMode());
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
    desa: raw.desa ?? raw.kelurahan_nama ?? raw.village_name ?? null,
  };
}

function normalizePerusahaan(raw: any): Perusahaan {
  return {
    ...raw,
    id: Number(raw.id),
    nama_perusahaan: String(raw.nama_perusahaan ?? raw.company_name ?? ''),
    kode_perusahaan: String(raw.kode_perusahaan ?? raw.company_code ?? ''),
    jenis_perusahaan: (raw.jenis_perusahaan ?? raw.company_type ?? '') as Perusahaan['jenis_perusahaan'],
    pic_kontak: String(raw.pic_kontak ?? raw.contact_person ?? ''),
    email_kontak: String(raw.email_kontak ?? raw.contact_email ?? ''),
    telepon: String(raw.telepon ?? raw.phone ?? ''),
    alamat: String(raw.alamat ?? raw.address ?? ''),
    status: String(raw.status ?? ''),
    created_at: String(raw.created_at ?? ''),
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
      raw.curah_hujan ??
        raw.curah_hujan_value ??
        raw.hujan_value ??
        raw.rain_value ??
        raw.rainfall ??
        raw.rainfall_value
    ),
    kelembapan: normalizeNumericValue(
      raw.kelembapan ??
        raw.kelembapan_value ??
        raw.kelembapan_tanah ??
        raw.humidity ??
        raw.humidity_value
    ),
  };
}

function normalizePublicLatestRealtime(raw: any) {
  return {
    timestamp_data: raw?.timestamp_data ?? null,
    tmat_value: raw?.tmat_value == null ? null : normalizeNumericValue(raw.tmat_value),
    curah_hujan:
      raw?.curah_hujan == null
        ? (raw?.hujan_value == null ? null : normalizeNumericValue(raw.hujan_value))
        : normalizeNumericValue(raw.curah_hujan),
    kelembapan:
      raw?.kelembapan == null
        ? (raw?.kelembapan_tanah == null ? null : normalizeNumericValue(raw.kelembapan_tanah))
        : normalizeNumericValue(raw.kelembapan),
    suhu_value: raw?.suhu_value == null ? null : normalizeNumericValue(raw.suhu_value),
  };
}

function normalizePublicMapDevice(raw: any): PublicMapDevice {
  return {
    device_id_unik: String(raw.device_id_unik || ''),
    kode_titik: raw.kode_titik ?? null,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    status: raw.status || 'aktif', // Public devices default to 'aktif' for chart aggregation
    tipe_alat: raw.tipe_alat ?? null,
    provinsi_id: raw.provinsi_id ?? null,
    provinsi_nama: raw.provinsi_nama ?? null,
    kabupaten_id: raw.kabupaten_id ?? null,
    kabupaten_nama: raw.kabupaten_nama ?? null,
    kecamatan_id: raw.kecamatan_id ?? null,
    kecamatan_nama: raw.kecamatan_nama ?? null,
    desa: raw.desa ?? null,
    id_perusahaan: raw.id_perusahaan == null ? null : Number(raw.id_perusahaan),
    jenis_perusahaan: raw.jenis_perusahaan ?? null,
    perusahaan_nama: raw.perusahaan_nama ?? null,
    latest_realtime: normalizePublicLatestRealtime(raw.latest_realtime || {}),
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
      const rawSingle = response?.data ?? response?.master_perusahaan ?? response;
      const data = Array.isArray(rawSingle) ? rawSingle : [rawSingle];
      return data
        .filter(Boolean)
        .map(normalizePerusahaan)
        .filter((company) => Number.isFinite(company.id));
    }
    const response = await this.request<any>('/proxy/perusahaan');
    const rawCompanies = Array.isArray(response)
      ? response
      : response?.data || response?.master_perusahaan || [];
    return rawCompanies
      .filter(Boolean)
      .map(normalizePerusahaan)
      .filter((company) => Number.isFinite(company.id));
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
    const rawDevices = Array.isArray(response)
      ? response
      : response?.data || response?.master_device || [];
    const devices = rawDevices.map(normalizeDevice);
    
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
    const rawRealtime = Array.isArray(response)
      ? response
      : response?.data || response?.data_realtime || [];
    return rawRealtime.map(normalizeRealtimeData);
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
    const rawRealtime = Array.isArray(response)
      ? response
      : response?.data || response?.data_realtime || [];
    return rawRealtime.map(normalizeRealtimeData);
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

  async getPublicMapSummary(): Promise<PublicMapSummary> {
    return this.request<PublicMapSummary>('/public/map/summary');
  }

  async getPublicMapDevices(filters: Record<string, string>): Promise<PublicMapDevice[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    const response = await this.request<any>(`/public/map/devices${query ? `?${query}` : ''}`);
    const rawDevices = response?.data || [];
    return rawDevices.map(normalizePublicMapDevice);
  }

  async getPublicMapAnalytics(filters: Record<string, string>): Promise<PublicMapAnalytics> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    const response = await this.request<any>(`/public/map/analytics${query ? `?${query}` : ''}`);
    return {
      filters: response?.filters || {},
      daily: response?.daily || [],
      weekly: response?.weekly || [],
      trend: response?.trend || [],
      available_date_range: response?.available_date_range || { min_date: null, max_date: null },
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

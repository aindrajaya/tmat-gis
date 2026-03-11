/**
 * API Client Service for TMAT Monitoring Dashboard
 * Handles all HTTP requests to backend API (production and development)
 */

import { Device, Perusahaan, PerusahaanWithDevices, RealtimeData } from '../types';
import {
  clearRuntimeApiKeys,
  loadRuntimeApiKeys,
  removeRuntimePerusahaanApiKey,
  setRuntimeAdminApiKey,
  setRuntimePerusahaanApiKey,
} from './runtimeApiKeys';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface ApiConfig {
  baseUrl: string;
  adminApiKey: string;
  perusahaanApiKeys: Record<string, string>;
}

let temporaryAdminApiKeyOverride = '';

// Hardcoded admin API key for public /map route
const MAP_ROUTE_ADMIN_API_KEY = 'KLHK-TLL-1715779864';

/**
 * Check if current route is the public map route
 */
function isPublicMapRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  return hash === '#/map' || hash.startsWith('#/map?') || hash.startsWith('#/map/');
}

function resolveClientBootstrapConfig(): {
  apiMode: 'dev' | 'prod';
  baseUrl: string;
  adminApiKey: string;
  perusahaanApiKeys: Record<string, string>;
} {
  const apiMode = (import.meta.env.VITE_API_MODE || 'dev') as 'dev' | 'prod';

  const baseUrl =
    apiMode === 'prod'
      ? import.meta.env.VITE_PROD_API_URL ||
        'https://gambutindonesia.kemenlh.go.id/backoffice-SPAgambut/api/v1'
      : import.meta.env.VITE_DEV_API_URL ||
        'https://coloured-riannon-aruskoding-eb6d5815.koyeb.app/api/portal_v1';

  const runtimeKeys = loadRuntimeApiKeys();
  const envAdminKey =
    apiMode === 'prod'
      ? import.meta.env.VITE_PROD_API_KEY_ADMIN || import.meta.env.VITE_PROD_API_KEY || ''
      : import.meta.env.VITE_DEV_API_KEY || '';

  // If we're on the public /map route, always use the hardcoded admin key
  const resolvedAdminKey = isPublicMapRoute()
    ? MAP_ROUTE_ADMIN_API_KEY
    : (temporaryAdminApiKeyOverride || runtimeKeys.adminApiKey || envAdminKey);

  console.log('[APIClient] Config resolved:', {
    route: window.location?.hash,
    isMapRoute: isPublicMapRoute(),
    apiKey: resolvedAdminKey ? `${resolvedAdminKey.substring(0, 10)}...` : 'NONE',
  });

  return {
    apiMode,
    baseUrl,
    adminApiKey: resolvedAdminKey,
    perusahaanApiKeys: apiMode === 'prod' ? runtimeKeys.perusahaanApiKeys : {},
  };
}

export class APIClient {
  private config: ApiConfig;
  private readonly debugPrefix = '[APIClient]';

  constructor(
    baseUrl: string,
    adminApiKey: string,
    perusahaanApiKeys: Record<string, string> = {}
  ) {
    this.config = {
      baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
      adminApiKey,
      perusahaanApiKeys,
    };
  }

  private getAuthSnapshot():
    | { role?: string; perusahaanId?: number | null }
    | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem('tmat_auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.user || null;
    } catch {
      return null;
    }
  }

  private getAuthenticatedPerusahaanScope(): number | undefined {
    const auth = this.getAuthSnapshot();
    if (!auth || auth.role !== 'perusahaan') return undefined;
    const id = Number(auth.perusahaanId);
    return Number.isInteger(id) && id > 0 ? id : undefined;
  }

  private isPerusahaanSession(): boolean {
    const auth = this.getAuthSnapshot();
    return !!auth && auth.role === 'perusahaan';
  }

  private resolvePerusahaanScope(requestedId?: number): number | undefined {
    const authScope = this.getAuthenticatedPerusahaanScope();
    if (authScope) {
      if (requestedId && requestedId !== authScope) {
        console.warn(
          `${this.debugPrefix}[scope] overriding requested perusahaanId=${requestedId} with auth scope perusahaanId=${authScope}`
        );
      }
      return authScope;
    }
    return requestedId;
  }

  private getApiKeyForScope(perusahaanId?: number): string {
    const authScope = this.getAuthenticatedPerusahaanScope();

    // Company users must use their own perusahaan key and may not fallback to admin key.
    if (this.isPerusahaanSession()) {
      if (!authScope) return '';
      return this.config.perusahaanApiKeys[String(authScope)] || '';
    }

    if (!perusahaanId) return this.config.adminApiKey;
    return this.config.perusahaanApiKeys[String(perusahaanId)] || this.config.adminApiKey;
  }

  /**
   * Make HTTP request with common headers and error handling
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    perusahaanId?: number
  ): Promise<T> {
    const scopedPerusahaanId = this.resolvePerusahaanScope(perusahaanId);
    const url = `${this.config.baseUrl}${endpoint}`;
    const apiKey = this.getApiKeyForScope(scopedPerusahaanId);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-KEY': apiKey } : {}),
      ...(options?.headers || {}),
    };

    console.log(`[API] Requesting: ${url}`, {
      perusahaanId: scopedPerusahaanId || 'GLOBAL',
      apiKey: apiKey ? `***${apiKey.slice(-4)}` : 'MISSING',
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
        console.error('[API] Error response:', errorText);
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log('[API] Success:', data);
      return data;
    } catch (error) {
      console.error(`[API] Request failed for ${url}:`, error);
      throw error;
    }
  }

  private logMethod(method: string, message: string, data?: unknown): void {
    if (data !== undefined) {
      console.log(`${this.debugPrefix}[${method}] ${message}`, data);
      return;
    }
    console.log(`${this.debugPrefix}[${method}] ${message}`);
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

  private normalizeArrayResponse<T>(response: any): T[] {
    if (Array.isArray(response)) return response as T[];
    if (response && Array.isArray(response.data)) return response.data as T[];
    if (response && Array.isArray(response.results)) return response.results as T[];
    return [];
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private pickFirstValue(record: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
    return undefined;
  }

  private parsePointText(value: unknown): { lat?: number; lng?: number } {
    if (typeof value !== 'string') return {};
    const text = value.trim();
    if (!text) return {};

    // Example: "POINT(112.123 -2.456)"
    const pointMatch = /POINT\s*\(\s*([\-0-9.,]+)\s+([\-0-9.,]+)\s*\)/i.exec(text);
    if (pointMatch) {
      return {
        lng: this.toNumber(pointMatch[1]),
        lat: this.toNumber(pointMatch[2]),
      };
    }

    // Example: "-2.456,112.123" or "-2.456 112.123"
    const parts = text.split(/[,\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = this.toNumber(parts[0]);
      const second = this.toNumber(parts[1]);
      // Common order from APIs: lat,lng
      return { lat: first, lng: second };
    }

    return {};
  }

  private resolveCoordinates(device: Record<string, unknown>): { latitude: number; longitude: number } {
    const latRaw = this.pickFirstValue(device, [
      'latitude',
      'lat',
      'koordinat_lat',
      'geo_lat',
      'y',
      'lintang',
    ]);
    const lngRaw = this.pickFirstValue(device, [
      'longitude',
      'lng',
      'long',
      'lon',
      'koordinat_lng',
      'geo_lng',
      'x',
      'bujur',
    ]);

    const fromPairField = this.parsePointText(
      this.pickFirstValue(device, ['koordinat', 'coordinate', 'coordinates', 'geom', 'geometry'])
    );

    const latitude = latRaw !== undefined ? this.toNumber(latRaw) : this.toNumber(fromPairField.lat);
    const longitude = lngRaw !== undefined ? this.toNumber(lngRaw) : this.toNumber(fromPairField.lng);

    return { latitude, longitude };
  }

  private normalizeDeviceRecord(device: any): Device {
    const raw = (device || {}) as Record<string, unknown>;
    const coordinates = this.resolveCoordinates(raw);
    const normalizedDeviceId = String(
      this.pickFirstValue(raw, ['device_id_unik', 'device_id', 'kode_device']) || ''
    )
      .trim()
      .toUpperCase();
    const provinsiId = String(this.pickFirstValue(raw, ['provinsi_id']) || '').trim();
    const kabupatenId = String(this.pickFirstValue(raw, ['kabupaten_id']) || '').trim();
    const kecamatanId = String(this.pickFirstValue(raw, ['kecamatan_id']) || '').trim();
    const kelurahanId = String(this.pickFirstValue(raw, ['kelurahan_id']) || '').trim();
    const desaName = String(
      this.pickFirstValue(raw, ['desa', 'kelurahan', 'village', 'village_name']) || ''
    ).trim();
    const provinsiName = String(
      this.pickFirstValue(raw, ['provinsi', 'province', 'nama_provinsi']) || ''
    ).trim();
    const kabupatenName = String(
      this.pickFirstValue(raw, ['kabupaten', 'regency', 'nama_kabupaten']) || ''
    ).trim();
    const kotaName = String(
      this.pickFirstValue(raw, [
        'kota',
        'city',
        'kecamatan',
        'district',
        'sub_district',
        'nama_kecamatan',
      ]) || ''
    ).trim();

    return {
      ...device,
      id: this.toNumber(raw.id),
      device_id_unik: normalizedDeviceId,
      id_perusahaan: this.toNumber(
        this.pickFirstValue(raw, ['id_perusahaan', 'perusahaan_id', 'company_id'])
      ),
      id_site: this.toNumber(this.pickFirstValue(raw, ['id_site', 'site_id'])),
      provinsi: provinsiName || provinsiId || '-',
      kabupaten: kabupatenName || kabupatenId || '-',
      kota: kotaName || kecamatanId || desaName || '-',
      desa: desaName || null,
      provinsi_id: provinsiId || null,
      kabupaten_id: kabupatenId || null,
      kecamatan_id: kecamatanId || null,
      kelurahan_id: kelurahanId || null,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    } as Device;
  }

  private normalizeRealtimeRecord(row: any): RealtimeData {
    const raw = (row || {}) as Record<string, unknown>;
    const normalizedDeviceId = String(
      this.pickFirstValue(raw, ['device_id_unik', 'device_id', 'kode_device']) || ''
    )
      .trim()
      .toUpperCase();
    const timestampSource = this.pickFirstValue(raw, [
      'timestamp_data',
      'timestamp',
      'waktu',
      'created_at',
      'updated_at',
      'datetime',
    ]);

    return {
      ...row,
      id: this.toNumber(row?.id),
      device_id_unik: normalizedDeviceId,
      timestamp_data: String(timestampSource || ''),
      tmat_value: this.toNumber(row?.tmat_value),
      suhu_value: this.toNumber(row?.suhu_value),
      ph_value: this.toNumber(row?.ph_value),
    } as RealtimeData;
  }

  private normalizePerusahaanResponse(response: any): Perusahaan[] {
    if (!response) return [];

    if (Array.isArray(response)) {
      return response as Perusahaan[];
    }

    if (Array.isArray(response.data)) {
      return response.data as Perusahaan[];
    }

    if (response.id && response.nama_perusahaan) {
      return [response as Perusahaan];
    }

    return [];
  }

  /**
   * Normalize perusahaan + devices payload from various possible shapes
   */
  private normalizePerusahaanDevicesResponse(response: any): PerusahaanWithDevices[] {
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

  private async aggregateByPerusahaan<T>(
    fetcher: (perusahaanId: number) => Promise<T[]>
  ): Promise<T[]> {
    const scoped = this.getAuthenticatedPerusahaanScope();
    if (scoped) {
      return fetcher(scoped);
    }

    const companies = await this.getPerusahaan();
    const ids = companies.map((company) => company.id).filter(Boolean);

    if (!ids.length) return [];

    const settled = await Promise.allSettled(ids.map((id) => fetcher(id)));

    const results: T[] = [];
    settled.forEach((entry, index) => {
      if (entry.status === 'fulfilled') {
        results.push(...entry.value);
      } else {
        console.warn(
          `[API] Skipping perusahaan ${ids[index]} due to request failure:`,
          entry.reason
        );
      }
    });

    return results;
  }

  /**
   * GET /perusahaan - Get all companies or single company by ID
   */
  async getPerusahaan(id?: number): Promise<Perusahaan[]> {
    const scopedId = this.resolvePerusahaanScope(id);
    this.logMethod('getPerusahaan', `start id=${scopedId ?? 'ALL'}`);
    if (scopedId) {
      try {
        const bySegment = await this.request<any>(`/perusahaan/${scopedId}`, undefined, scopedId);
        const normalized = this.normalizePerusahaanResponse(bySegment);
        if (normalized.length > 0) return normalized;
      } catch {
        // Fallback to legacy query style below.
      }

      const byQuery = await this.request<any>(`/perusahaan?id=${scopedId}`, undefined, scopedId);
      const normalized = this.normalizePerusahaanResponse(byQuery);
      return normalized.filter((company) => company.id === scopedId);
    }

    const companies = await this.request<any>('/perusahaan');
    const normalized = this.normalizePerusahaanResponse(companies);
    this.logMethod('getPerusahaan', 'success', {
      id: scopedId ?? 'ALL',
      count: normalized.length,
    });
    return normalized;
  }

  /**
   * Get specific company by ID
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
   * Get devices grouped by perusahaan
   */
  async getPerusahaanDevices(perusahaanId?: number): Promise<PerusahaanWithDevices[]> {
    const scopedPerusahaanId = this.resolvePerusahaanScope(perusahaanId);
    // Prefer legacy endpoint if available for efficiency.
    try {
      const query = scopedPerusahaanId ? `?id=${scopedPerusahaanId}` : '';
      const response = await this.request<any>(
        `/perusahaan/devices${query}`,
        undefined,
        scopedPerusahaanId
      );
      const normalized = this.normalizePerusahaanDevicesResponse(response);
      if (normalized.length > 0) {
        return normalized;
      }
    } catch {
      // Fallback to composition from /perusahaan + /device.
    }

    const companies = await this.getPerusahaan(scopedPerusahaanId);
    const settled = await Promise.allSettled(
      companies.map(async (company) => {
        const devices = await this.getDevice(undefined, company.id);
        return {
          ...company,
          devices,
        } as PerusahaanWithDevices;
      })
    );

    return settled
      .filter((entry): entry is PromiseFulfilledResult<PerusahaanWithDevices> => entry.status === 'fulfilled')
      .map((entry) => entry.value);
  }

  /**
   * GET /device - Get devices (optionally scoped by perusahaan)
   */
  async getDevice(deviceId?: string, perusahaanId?: number): Promise<Device[]> {
    const scopedPerusahaanId = this.resolvePerusahaanScope(perusahaanId);
    this.logMethod('getDevice', 'start', {
      deviceId: deviceId || 'ALL',
      perusahaanId: scopedPerusahaanId ?? 'GLOBAL',
      expectedEndpoint: scopedPerusahaanId
        ? `/device?id_perusahaan=${scopedPerusahaanId}`
        : '/device (or aggregated /device?id_perusahaan=...)',
    });
    // Primary path for new production API: /device?id_perusahaan={id}
    if (scopedPerusahaanId) {
      const response = await this.request<any>(
        `/device?id_perusahaan=${scopedPerusahaanId}`,
        undefined,
        scopedPerusahaanId
      );

      const devices = this.normalizeArrayResponse<Device>(response);
      const normalizedDevices = devices.map((d) =>
        this.normalizeDeviceRecord(d)
      );
      const validCoords = normalizedDevices.filter(
        (d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude) && (d.latitude !== 0 || d.longitude !== 0)
      ).length;
        this.logMethod('getDevice', 'success scoped', {
        perusahaanId: scopedPerusahaanId,
        totalDevices: normalizedDevices.length,
        validCoordinateDevices: validCoords,
        sample: normalizedDevices.slice(0, 3).map((d) => ({
          device_id_unik: d.device_id_unik,
          latitude: d.latitude,
          longitude: d.longitude,
        })),
      });
      return deviceId
        ? normalizedDevices.filter((d) => d.device_id_unik === deviceId)
        : normalizedDevices;
    }

    // Unscoped request for admin: try direct endpoint first.
    try {
      const direct = await this.request<any>('/device');
      const devices = this.normalizeArrayResponse<Device>(direct);
      if (devices.length > 0) {
        const normalizedDevices = devices.map((d) =>
          this.normalizeDeviceRecord(d)
        );
        const validCoords = normalizedDevices.filter(
          (d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude) && (d.latitude !== 0 || d.longitude !== 0)
        ).length;
        this.logMethod('getDevice', 'success direct-global', {
          totalDevices: normalizedDevices.length,
          validCoordinateDevices: validCoords,
          sample: normalizedDevices.slice(0, 3).map((d) => ({
            device_id_unik: d.device_id_unik,
            latitude: d.latitude,
            longitude: d.longitude,
          })),
        });
        return deviceId
          ? normalizedDevices.filter((d) => d.device_id_unik === deviceId)
          : normalizedDevices;
      }
    } catch {
      // Continue with aggregation fallback.
    }

    // Fallback for APIs that require id_perusahaan even for admin data fetch.
    const aggregated = await this.aggregateByPerusahaan<Device>((id) =>
      this.request<any>(`/device?id_perusahaan=${id}`, undefined, id).then((res) =>
        this.normalizeArrayResponse<Device>(res)
      )
    );

    const normalizedAggregated = aggregated.map((d) =>
      this.normalizeDeviceRecord(d)
    );
    const validCoords = normalizedAggregated.filter(
      (d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude) && (d.latitude !== 0 || d.longitude !== 0)
    ).length;
    this.logMethod('getDevice', 'success aggregated-global', {
      totalDevices: normalizedAggregated.length,
      validCoordinateDevices: validCoords,
      sample: normalizedAggregated.slice(0, 3).map((d) => ({
        device_id_unik: d.device_id_unik,
        latitude: d.latitude,
        longitude: d.longitude,
      })),
    });
    return deviceId
      ? normalizedAggregated.filter((d) => d.device_id_unik === deviceId)
      : normalizedAggregated;
  }

  /**
   * Get specific device by device ID (optionally scoped by perusahaan)
   */
  async getDeviceById(deviceId: string, perusahaanId?: number): Promise<Device> {
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
    const scopedPerusahaanId = this.resolvePerusahaanScope(idPerusahaan);
    this.logMethod('getRealtimeAll', 'start', {
      perusahaanId: scopedPerusahaanId ?? 'GLOBAL',
      expectedEndpoint: scopedPerusahaanId
        ? `/realtime_all?id_perusahaan=${scopedPerusahaanId}`
        : '/realtime_all (or aggregated /realtime_all?id_perusahaan=...)',
    });
    if (scopedPerusahaanId) {
      const scoped = await this.request<any>(
        `/realtime_all?id_perusahaan=${scopedPerusahaanId}`,
        undefined,
        scopedPerusahaanId
      );
      const normalized = this.normalizeArrayResponse<RealtimeData>(scoped).map((item) =>
        this.normalizeRealtimeRecord(item)
      );
        this.logMethod('getRealtimeAll', 'success scoped', {
        perusahaanId: scopedPerusahaanId,
        totalRows: normalized.length,
        sample: normalized.slice(0, 3).map((r) => ({
          device_id_unik: r.device_id_unik,
          timestamp_data: r.timestamp_data,
          tmat_value: r.tmat_value,
        })),
      });
      return normalized;
    }

    // Try global access first for admin key.
    try {
      const direct = await this.request<any>('/realtime_all');
      const data = this.normalizeArrayResponse<RealtimeData>(direct);
      if (data.length > 0) {
        const normalized = data.map((item) => this.normalizeRealtimeRecord(item));
        this.logMethod('getRealtimeAll', 'success direct-global', {
          totalRows: normalized.length,
          sample: normalized.slice(0, 3).map((r) => ({
            device_id_unik: r.device_id_unik,
            timestamp_data: r.timestamp_data,
            tmat_value: r.tmat_value,
          })),
        });
        return normalized;
      }
    } catch {
      // Continue with aggregation fallback.
    }

    // Fallback: aggregate per perusahaan.
    const aggregated = await this.aggregateByPerusahaan<RealtimeData>((id) =>
      this.request<any>(`/realtime_all?id_perusahaan=${id}`, undefined, id).then(
        (res) => this.normalizeArrayResponse<RealtimeData>(res)
      )
    );
    const normalized = aggregated.map((item) => this.normalizeRealtimeRecord(item));
    this.logMethod('getRealtimeAll', 'success aggregated-global', {
      totalRows: normalized.length,
      sample: normalized.slice(0, 3).map((r) => ({
        device_id_unik: r.device_id_unik,
        timestamp_data: r.timestamp_data,
        tmat_value: r.tmat_value,
      })),
    });
    return normalized;
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
    offset: number = 0,
    perusahaanId?: number
  ): Promise<RealtimeData[]> {
    const scopedPerusahaanId = this.resolvePerusahaanScope(perusahaanId);
    const params = {
      device_id: deviceId,
      start_date: startDate,
      end_date: endDate,
      limit,
      offset,
      ...(scopedPerusahaanId ? { id_perusahaan: scopedPerusahaanId } : {}),
    };

    const query = this.buildQueryString(params);
    const response = await this.request<any>(
      `/realtime_device?${query}`,
      undefined,
      scopedPerusahaanId
    );

    if (Array.isArray(response)) {
      return response.map((item) => this.normalizeRealtimeRecord(item));
    }

    if (response && Array.isArray(response.data)) {
      return response.data.map((item: RealtimeData) =>
        this.normalizeRealtimeRecord(item)
      );
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
    offset: number = 0,
    perusahaanId?: number
  ): Promise<PaginatedResponse<RealtimeData>> {
    const scopedPerusahaanId = this.resolvePerusahaanScope(perusahaanId);
    const params = {
      device_id: deviceId,
      start_date: startDate,
      end_date: endDate,
      limit,
      offset,
      ...(scopedPerusahaanId ? { id_perusahaan: scopedPerusahaanId } : {}),
    };

    const query = this.buildQueryString(params);
    const response = await this.request<any>(
      `/realtime_device?${query}`,
      undefined,
      scopedPerusahaanId
    );

    if (Array.isArray(response)) {
      return {
        data: response.map((item) => this.normalizeRealtimeRecord(item)),
        total: response.length,
        offset: 0,
        limit: response.length,
      };
    }

    if (response && Array.isArray(response.data)) {
      return {
        ...response,
        data: response.data.map((item: RealtimeData) =>
          this.normalizeRealtimeRecord(item)
        ),
      };
    }

    return response;
  }

  /**
   * Update API configuration (switch between dev/production)
   */
  updateConfig(
    baseUrl: string,
    adminApiKey: string,
    perusahaanApiKeys: Record<string, string> = this.config.perusahaanApiKeys
  ): void {
    this.config = {
      baseUrl: baseUrl.replace(/\/$/, ''),
      adminApiKey,
      perusahaanApiKeys,
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
  const { apiMode, baseUrl, adminApiKey, perusahaanApiKeys } =
    resolveClientBootstrapConfig();

  if (!adminApiKey) {
    console.warn(
      `API Key not configured for ${apiMode} mode. Requests may fail for authenticated endpoints.`
    );
  }

  return new APIClient(baseUrl, adminApiKey, perusahaanApiKeys);
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

function syncAPIClientConfig(): void {
  if (!apiClientInstance) return;

  const { baseUrl, adminApiKey, perusahaanApiKeys } =
    resolveClientBootstrapConfig();
  apiClientInstance.updateConfig(baseUrl, adminApiKey, perusahaanApiKeys);
}

export function setTemporaryAdminApiKeyOverride(apiKey: string): void {
  temporaryAdminApiKeyOverride = apiKey.trim();
  syncAPIClientConfig();
}

export function clearTemporaryAdminApiKeyOverride(): void {
  temporaryAdminApiKeyOverride = '';
  syncAPIClientConfig();
}

export function setUserAdminApiKey(apiKey: string): void {
  setRuntimeAdminApiKey(apiKey);
  syncAPIClientConfig();
}

export function setUserPerusahaanApiKey(
  perusahaanId: number,
  apiKey: string
): void {
  setRuntimePerusahaanApiKey(perusahaanId, apiKey);
  syncAPIClientConfig();
}

export function removeUserPerusahaanApiKey(perusahaanId: number): void {
  removeRuntimePerusahaanApiKey(perusahaanId);
  syncAPIClientConfig();
}

export function clearUserApiKeys(): void {
  clearRuntimeApiKeys();
  syncAPIClientConfig();
}

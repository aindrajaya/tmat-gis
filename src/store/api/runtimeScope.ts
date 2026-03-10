import { Device, RealtimeData } from '../../../types';

type StoredUser = {
  role?: 'admin' | 'provinsi' | 'perusahaan';
  perusahaanId?: number | null;
};

type StoredAuth = {
  user?: StoredUser;
};

export interface RtkQueryError {
  message: string;
}

export interface RealtimePaginationParams {
  page: number;
  pageSize: number;
  perusahaanId?: number;
  provinsi?: string;
  kabupaten?: string;
  startDate?: string;
  endDate?: string;
  searchText?: string;
  sortBy?: 'timestamp' | 'device_id' | 'tmat_value';
  sortOrder?: 'asc' | 'desc';
}

export function getScopedPerusahaanId(explicitPerusahaanId?: number): number | undefined {
  if (explicitPerusahaanId) return explicitPerusahaanId;
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = localStorage.getItem('tmat_auth');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredAuth;
    const user = parsed.user;
    if (user?.role === 'perusahaan' && user.perusahaanId) {
      return user.perusahaanId;
    }
  } catch {
    // Ignore localStorage parse errors; default to unscoped.
  }
  return undefined;
}

export function toRtkQueryError(error: unknown): RtkQueryError {
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'Unknown API error' };
}

export function filterAndPaginateRealtime(
  realtimeData: RealtimeData[],
  devices: Device[],
  params: RealtimePaginationParams
): {
  data: RealtimeData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const deviceById = new Map(devices.map((device) => [device.device_id_unik, device]));
  const normalizedSearch = params.searchText?.trim().toLowerCase() || '';

  let filtered = realtimeData.filter((record) => {
    const device = deviceById.get(record.device_id_unik);
    if (!device) return false;

    const recordDate = record.timestamp_data.split(' ')[0];
    if (params.startDate && recordDate < params.startDate) return false;
    if (params.endDate && recordDate > params.endDate) return false;

    if (params.provinsi && device.provinsi !== params.provinsi) return false;
    if (params.kabupaten && device.kabupaten !== params.kabupaten) return false;

    if (normalizedSearch) {
      const location = `${device.kota} ${device.kabupaten} ${device.provinsi} ${device.alamat || ''}`.toLowerCase();
      const idMatch = record.device_id_unik.toLowerCase().includes(normalizedSearch);
      const locationMatch = location.includes(normalizedSearch);
      if (!idMatch && !locationMatch) return false;
    }

    return true;
  });

  const sortBy = params.sortBy || 'timestamp';
  const sortOrder = params.sortOrder || 'desc';
  filtered = [...filtered].sort((a, b) => {
    let compare = 0;
    if (sortBy === 'timestamp') {
      compare =
        new Date(a.timestamp_data).getTime() - new Date(b.timestamp_data).getTime();
    } else if (sortBy === 'device_id') {
      compare = a.device_id_unik.localeCompare(b.device_id_unik);
    } else {
      compare = (a.tmat_value || 0) - (b.tmat_value || 0);
    }

    return sortOrder === 'asc' ? compare : -compare;
  });

  const page = Math.max(params.page || 1, 1);
  const pageSize = Math.max(params.pageSize || 50, 1);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: filtered.slice(start, end),
    total,
    page,
    pageSize,
    totalPages,
  };
}

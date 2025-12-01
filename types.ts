export interface Perusahaan {
  id: number;
  nama_perusahaan: string;
  kode_perusahaan: string;
  jenis_perusahaan: 'PBPH' | 'Perkebunan';
  alamat: string;
  status: string;
}

export interface Device {
  id: number;
  device_id_unik: string;
  id_perusahaan: number;
  tipe_alat: string;
  provinsi: string;
  kabupaten: string;
  kota: string;
  latitude: number;
  longitude: number;
  status: string;
  last_online: string;
  kode_titik: string;
  kode_blok: string;
}

export interface RealtimeData {
  id: number;
  device_id_unik: string;
  timestamp_data: string;
  tmat_value: number;
  suhu_value: number;
  ph_value: number;
}

export interface DashboardSummary {
  totalDevices: number;
  activeDevices: number;
  offlineDevices: number;
  alertDevices: number;
  chartData: any[]; // Simplified for recharts
  trendData: any[];
}

export interface FilterState {
  provinsi: string;
  kabupaten: string;
  jenis_perusahaan: string;
  startDate: string;
  endDate: string;
}

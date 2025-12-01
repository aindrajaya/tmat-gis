import { Device, Perusahaan, RealtimeData } from '../types';

// Subset of Master Perusahaan
export const MOCK_PERUSAHAAN: Perusahaan[] = [
  { id: 19, nama_perusahaan: "PT. Sawit Jawa Timur 1", kode_perusahaan: "JT001", jenis_perusahaan: "Perkebunan", alamat: "Jl. Sample No. 1", status: "aktif" },
  { id: 24, nama_perusahaan: "PT. Sawit Kalimantan Tengah 1", kode_perusahaan: "KT006", jenis_perusahaan: "Perkebunan", alamat: "Jl. Sample No. 6", status: "aktif" },
  { id: 29, nama_perusahaan: "PT. Sawit Kalimantan Selatan 1", kode_perusahaan: "KS011", jenis_perusahaan: "Perkebunan", alamat: "Jl. Sample No. 11", status: "aktif" },
  { id: 34, nama_perusahaan: "PT. Sawit Riau 1", kode_perusahaan: "RI016", jenis_perusahaan: "Perkebunan", alamat: "Jl. Sample No. 16", status: "aktif" }
];

// Subset of Master Device (approx 20 devices for visualization)
export const MOCK_DEVICES: Device[] = [
  { id: 15, device_id_unik: "DEV-TI-001", id_perusahaan: 19, tipe_alat: "TMAT Logger V3", provinsi: "Jawa Timur", kabupaten: "Surabaya", kota: "Surabaya", latitude: -7.2556, longitude: 112.7497, status: "aktif", last_online: "2025-11-25 12:00:00", kode_titik: "TI001", kode_blok: "A1" },
  { id: 16, device_id_unik: "DEV-TI-002", id_perusahaan: 19, tipe_alat: "TMAT Logger V3", provinsi: "Jawa Timur", kabupaten: "Surabaya", kota: "Surabaya", latitude: -7.2537, longitude: 112.7473, status: "aktif", last_online: "2025-11-25 12:00:00", kode_titik: "TI002", kode_blok: "A2" },
  { id: 95, device_id_unik: "DEV-TE-081", id_perusahaan: 24, tipe_alat: "TMAT Logger V3", provinsi: "Kalimantan Tengah", kabupaten: "Palangka", kota: "Palangka", latitude: -2.2083, longitude: 113.9210, status: "aktif", last_online: "2025-11-25 12:00:00", kode_titik: "TE081", kode_blok: "A1" },
  { id: 96, device_id_unik: "DEV-TE-082", id_perusahaan: 24, tipe_alat: "TMAT Logger V3", provinsi: "Kalimantan Tengah", kabupaten: "Palangka", kota: "Palangka", latitude: -2.2051, longitude: 113.9254, status: "aktif", last_online: "2025-11-25 12:00:00", kode_titik: "TE082", kode_blok: "A2" },
  { id: 175, device_id_unik: "DEV-SE-161", id_perusahaan: 29, tipe_alat: "TMAT Logger V3", provinsi: "Kalimantan Selatan", kabupaten: "Banjarmasin", kota: "Banjarmasin", latitude: -3.3204, longitude: 114.5916, status: "aktif", last_online: "2025-11-25 12:00:00", kode_titik: "SE161", kode_blok: "A1" },
  { id: 255, device_id_unik: "DEV-RI-241", id_perusahaan: 34, tipe_alat: "TMAT Logger V3", provinsi: "Riau", kabupaten: "Pekanbaru", kota: "Pekanbaru", latitude: 0.5074, longitude: 101.4521, status: "aktif", last_online: "2025-11-25 12:00:00", kode_titik: "RI241", kode_blok: "A1" },
  // Adding a few inactive ones for chart variety
  { id: 256, device_id_unik: "DEV-RI-242", id_perusahaan: 34, tipe_alat: "TMAT Logger V3", provinsi: "Riau", kabupaten: "Pekanbaru", kota: "Pekanbaru", latitude: 0.5100, longitude: 101.4500, status: "non-aktif", last_online: "2025-11-20 12:00:00", kode_titik: "RI242", kode_blok: "A2" },
];

// Subset of Realtime Data linked to devices above
export const MOCK_REALTIME: RealtimeData[] = [
  { id: 17, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-25 02:59:52", tmat_value: -0.375, suhu_value: 24.12, ph_value: 4.57 },
  { id: 18, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-25 07:59:52", tmat_value: 0.711, suhu_value: 29.04, ph_value: 5.95 },
  { id: 20, device_id_unik: "DEV-TI-002", timestamp_data: "2025-11-25 04:59:52", tmat_value: 0.742, suhu_value: 28.35, ph_value: 6.09 },
  { id: 264, device_id_unik: "DEV-TE-081", timestamp_data: "2025-11-25 09:59:52", tmat_value: -0.289, suhu_value: 24.88, ph_value: 5.42 },
  { id: 268, device_id_unik: "DEV-TE-082", timestamp_data: "2025-11-25 04:59:52", tmat_value: 0.646, suhu_value: 25.8, ph_value: 5.01 },
  { id: 500, device_id_unik: "DEV-SE-161", timestamp_data: "2025-11-25 04:59:52", tmat_value: 0.416, suhu_value: 30.27, ph_value: 4.98 },
  { id: 753, device_id_unik: "DEV-RI-241", timestamp_data: "2025-11-25 11:59:52", tmat_value: -0.436, suhu_value: 25.23, ph_value: 6.18 },
  { id: 755, device_id_unik: "DEV-RI-242", timestamp_data: "2025-11-25 09:59:52", tmat_value: 0.204, suhu_value: 30.63, ph_value: 4.98 }
];

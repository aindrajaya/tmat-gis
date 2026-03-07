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

// Realtime Data - one week of data (Nov 19-25, 2025) for better chart visualization
export const MOCK_REALTIME: RealtimeData[] = [
  // DEV-TI-001 - 7 days of data
  { id: 1, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-19 02:59:52", tmat_value: 0.125, suhu_value: 22.50, ph_value: 4.80 },
  { id: 2, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-19 14:59:52", tmat_value: 0.450, suhu_value: 28.20, ph_value: 5.40 },
  { id: 3, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-20 03:59:52", tmat_value: 0.230, suhu_value: 23.80, ph_value: 4.95 },
  { id: 4, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-20 15:59:52", tmat_value: 0.520, suhu_value: 29.10, ph_value: 5.50 },
  { id: 5, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-21 02:59:52", tmat_value: 0.310, suhu_value: 24.30, ph_value: 5.10 },
  { id: 6, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-21 16:59:52", tmat_value: 0.580, suhu_value: 28.90, ph_value: 5.60 },
  { id: 7, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-22 01:59:52", tmat_value: 0.180, suhu_value: 22.10, ph_value: 4.70 },
  { id: 8, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-22 13:59:52", tmat_value: 0.640, suhu_value: 30.40, ph_value: 5.75 },
  { id: 9, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-23 04:59:52", tmat_value: 0.290, suhu_value: 25.60, ph_value: 5.20 },
  { id: 10, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-23 17:59:52", tmat_value: 0.710, suhu_value: 31.20, ph_value: 5.85 },
  { id: 11, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-24 02:59:52", tmat_value: -0.215, suhu_value: 23.40, ph_value: 4.60 },
  { id: 12, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-24 14:59:52", tmat_value: 0.485, suhu_value: 27.90, ph_value: 5.75 },
  { id: 17, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-25 02:59:52", tmat_value: -0.375, suhu_value: 24.12, ph_value: 4.57 },
  { id: 18, device_id_unik: "DEV-TI-001", timestamp_data: "2025-11-25 07:59:52", tmat_value: 0.711, suhu_value: 29.04, ph_value: 5.95 },
  
  // DEV-TI-002
  { id: 13, device_id_unik: "DEV-TI-002", timestamp_data: "2025-11-19 05:59:52", tmat_value: 0.350, suhu_value: 25.40, ph_value: 5.25 },
  { id: 14, device_id_unik: "DEV-TI-002", timestamp_data: "2025-11-20 06:59:52", tmat_value: 0.280, suhu_value: 26.10, ph_value: 5.40 },
  { id: 15, device_id_unik: "DEV-TI-002", timestamp_data: "2025-11-21 07:59:52", tmat_value: 0.420, suhu_value: 27.80, ph_value: 5.55 },
  { id: 16, device_id_unik: "DEV-TI-002", timestamp_data: "2025-11-22 08:59:52", tmat_value: 0.510, suhu_value: 28.90, ph_value: 5.70 },
  { id: 19, device_id_unik: "DEV-TI-002", timestamp_data: "2025-11-23 09:59:52", tmat_value: 0.365, suhu_value: 27.20, ph_value: 5.85 },
  { id: 20, device_id_unik: "DEV-TI-002", timestamp_data: "2025-11-24 10:59:52", tmat_value: 0.625, suhu_value: 29.15, ph_value: 5.95 },
  { id: 21, device_id_unik: "DEV-TI-002", timestamp_data: "2025-11-25 04:59:52", tmat_value: 0.742, suhu_value: 28.35, ph_value: 6.09 },
  
  // DEV-TE-081
  { id: 260, device_id_unik: "DEV-TE-081", timestamp_data: "2025-11-19 08:59:52", tmat_value: -0.105, suhu_value: 23.40, ph_value: 5.15 },
  { id: 261, device_id_unik: "DEV-TE-081", timestamp_data: "2025-11-20 09:59:52", tmat_value: 0.180, suhu_value: 24.20, ph_value: 5.30 },
  { id: 262, device_id_unik: "DEV-TE-081", timestamp_data: "2025-11-21 10:59:52", tmat_value: 0.320, suhu_value: 25.50, ph_value: 5.45 },
  { id: 263, device_id_unik: "DEV-TE-081", timestamp_data: "2025-11-22 11:59:52", tmat_value: 0.215, suhu_value: 24.80, ph_value: 5.35 },
  { id: 264, device_id_unik: "DEV-TE-081", timestamp_data: "2025-11-23 12:59:52", tmat_value: 0.450, suhu_value: 26.10, ph_value: 5.50 },
  { id: 265, device_id_unik: "DEV-TE-081", timestamp_data: "2025-11-24 09:59:52", tmat_value: -0.165, suhu_value: 23.95, ph_value: 5.25 },
  { id: 266, device_id_unik: "DEV-TE-081", timestamp_data: "2025-11-25 09:59:52", tmat_value: -0.289, suhu_value: 24.88, ph_value: 5.42 },
  
  // DEV-TE-082
  { id: 267, device_id_unik: "DEV-TE-082", timestamp_data: "2025-11-19 07:59:52", tmat_value: 0.380, suhu_value: 25.90, ph_value: 4.95 },
  { id: 268, device_id_unik: "DEV-TE-082", timestamp_data: "2025-11-20 08:59:52", tmat_value: 0.520, suhu_value: 26.70, ph_value: 5.05 },
  { id: 269, device_id_unik: "DEV-TE-082", timestamp_data: "2025-11-21 09:59:52", tmat_value: 0.285, suhu_value: 25.20, ph_value: 4.90 },
  { id: 270, device_id_unik: "DEV-TE-082", timestamp_data: "2025-11-22 07:59:52", tmat_value: 0.445, suhu_value: 26.40, ph_value: 5.10 },
  { id: 271, device_id_unik: "DEV-TE-082", timestamp_data: "2025-11-23 06:59:52", tmat_value: 0.610, suhu_value: 26.60, ph_value: 5.00 },
  { id: 272, device_id_unik: "DEV-TE-082", timestamp_data: "2025-11-24 05:59:52", tmat_value: 0.125, suhu_value: 25.00, ph_value: 4.85 },
  { id: 273, device_id_unik: "DEV-TE-082", timestamp_data: "2025-11-25 04:59:52", tmat_value: 0.646, suhu_value: 25.8, ph_value: 5.01 },
  
  // DEV-SE-161
  { id: 490, device_id_unik: "DEV-SE-161", timestamp_data: "2025-11-19 10:59:52", tmat_value: 0.225, suhu_value: 28.90, ph_value: 4.87 },
  { id: 491, device_id_unik: "DEV-SE-161", timestamp_data: "2025-11-20 11:59:52", tmat_value: 0.385, suhu_value: 29.50, ph_value: 5.02 },
  { id: 492, device_id_unik: "DEV-SE-161", timestamp_data: "2025-11-21 12:59:52", tmat_value: 0.310, suhu_value: 30.10, ph_value: 4.92 },
  { id: 493, device_id_unik: "DEV-SE-161", timestamp_data: "2025-11-22 10:59:52", tmat_value: 0.520, suhu_value: 31.20, ph_value: 5.15 },
  { id: 494, device_id_unik: "DEV-SE-161", timestamp_data: "2025-11-23 11:59:52", tmat_value: 0.190, suhu_value: 29.80, ph_value: 5.05 },
  { id: 495, device_id_unik: "DEV-SE-161", timestamp_data: "2025-11-24 12:59:52", tmat_value: 0.650, suhu_value: 30.60, ph_value: 5.12 },
  { id: 500, device_id_unik: "DEV-SE-161", timestamp_data: "2025-11-25 04:59:52", tmat_value: 0.416, suhu_value: 30.27, ph_value: 4.98 },
  
  // DEV-RI-241
  { id: 740, device_id_unik: "DEV-RI-241", timestamp_data: "2025-11-19 12:59:52", tmat_value: 0.145, suhu_value: 24.80, ph_value: 6.05 },
  { id: 741, device_id_unik: "DEV-RI-241", timestamp_data: "2025-11-20 13:59:52", tmat_value: 0.280, suhu_value: 25.40, ph_value: 6.10 },
  { id: 742, device_id_unik: "DEV-RI-241", timestamp_data: "2025-11-21 14:59:52", tmat_value: -0.325, suhu_value: 24.50, ph_value: 5.95 },
  { id: 743, device_id_unik: "DEV-RI-241", timestamp_data: "2025-11-22 12:59:52", tmat_value: 0.510, suhu_value: 26.10, ph_value: 6.20 },
  { id: 744, device_id_unik: "DEV-RI-241", timestamp_data: "2025-11-23 13:59:52", tmat_value: -0.180, suhu_value: 24.90, ph_value: 6.00 },
  { id: 745, device_id_unik: "DEV-RI-241", timestamp_data: "2025-11-24 11:59:52", tmat_value: 0.380, suhu_value: 25.80, ph_value: 6.25 },
  { id: 753, device_id_unik: "DEV-RI-241", timestamp_data: "2025-11-25 11:59:52", tmat_value: -0.436, suhu_value: 25.23, ph_value: 6.18 },
  
  // DEV-RI-242 (inactive in device list but has data)
  { id: 750, device_id_unik: "DEV-RI-242", timestamp_data: "2025-11-19 09:59:52", tmat_value: 0.065, suhu_value: 29.40, ph_value: 5.10 },
  { id: 751, device_id_unik: "DEV-RI-242", timestamp_data: "2025-11-20 10:59:52", tmat_value: 0.295, suhu_value: 30.20, ph_value: 4.95 },
  { id: 752, device_id_unik: "DEV-RI-242", timestamp_data: "2025-11-21 11:59:52", tmat_value: 0.420, suhu_value: 31.10, ph_value: 5.05 },
  { id: 753, device_id_unik: "DEV-RI-242", timestamp_data: "2025-11-22 09:59:52", tmat_value: 0.180, suhu_value: 30.50, ph_value: 5.00 },
  { id: 754, device_id_unik: "DEV-RI-242", timestamp_data: "2025-11-23 08:59:52", tmat_value: 0.335, suhu_value: 31.30, ph_value: 5.10 },
  { id: 755, device_id_unik: "DEV-RI-242", timestamp_data: "2025-11-24 10:59:52", tmat_value: 0.105, suhu_value: 30.20, ph_value: 4.92 },
  { id: 756, device_id_unik: "DEV-RI-242", timestamp_data: "2025-11-25 09:59:52", tmat_value: 0.204, suhu_value: 30.63, ph_value: 4.98 }
];

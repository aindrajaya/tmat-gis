import express from 'express';
import cors from 'cors';
import { MOCK_DEVICES, MOCK_REALTIME, MOCK_PERUSAHAAN } from '../services/mockData'; // In real usage, this would import from db.json using lowdb

const app = express();
const port = 3001;

app.use(cors());
// Fix: Cast express.json() to any to resolve overload mismatch error
app.use(express.json() as any);

// API: Get All Perusahaan
app.get('/api/portal_v1/perusahaan', (req, res) => {
  res.json({ master_perusahaan: MOCK_PERUSAHAAN });
});

// API: Get All Devices
app.get('/api/portal_v1/device', (req, res) => {
  const { device_id } = req.query;
  if (device_id) {
    const device = MOCK_DEVICES.find(d => d.device_id_unik === device_id);
    return res.json({ master_device: device ? [device] : [] });
  }
  res.json({ master_device: MOCK_DEVICES });
});

// API: Realtime Data
app.get('/api/portal_v1/realtime_all', (req, res) => {
  // In a real app, filtering logic by ID would go here
  res.json({ data_realtime: MOCK_REALTIME });
});

app.listen(port, () => {
  console.log(`Mock TMAT API running at http://localhost:${port}`);
});
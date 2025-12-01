import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Device } from '../types';

// Fix for default marker icon in React Leaflet
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  devices: Device[];
}

const DashboardMap: React.FC<Props> = ({ devices }) => {
  const { t } = useTranslation();
  // Center on Indonesia roughly
  const center: [number, number] = [-2.5489, 118.0149];

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 z-0">
      <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {devices.map((device) => (
          <Marker 
            key={device.id} 
            position={[device.latitude, device.longitude]} 
            icon={icon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-emerald-700">{device.device_id_unik}</h3>
                <p className="text-xs text-slate-600">{device.kota}, {device.provinsi}</p>
                <div className={`mt-2 text-xs px-2 py-1 rounded-full w-fit ${device.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {device.status}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default DashboardMap;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MOCK_DEVICES } from '../services/mockData';

// Sub-component to handle map flyTo logic
const MapUpdater = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 10);
  }, [lat, lng, map]);
  return null;
};

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DeviceForm: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    deviceId: '',
    lat: -2.5,
    lng: 113.0,
    provinsi: '',
    kabupaten: '',
    kodeTitik: '',
    kodeBlok: ''
  });

  // Simplified "Visual Helper" logic:
  // When user changes coords, we update state. MapUpdater updates map view.
  // User then "Looks" at the map and selects Province/City.
  
  const handleCoordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{t('forms:deviceForm.title')}</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('forms:deviceForm.deviceId')}</label>
              <input 
                type="text" 
                name="deviceId"
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={formData.deviceId}
                onChange={handleTextChange}
                placeholder={t('forms:deviceForm.deviceIdPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('forms:deviceForm.kodeTitik')}</label>
                <input 
                  type="text" 
                  name="kodeTitik"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={formData.kodeTitik}
                  onChange={handleTextChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('forms:deviceForm.kodeBlok')}</label>
                <input 
                  type="text" 
                  name="kodeBlok"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={formData.kodeBlok}
                  onChange={handleTextChange}
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-800 text-sm mb-2">{t('forms:deviceForm.locationInput')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-blue-700">{t('forms:deviceForm.latitude')}</label>
                  <input 
                    type="number" 
                    name="lat"
                    step="0.0001"
                    className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-sm"
                    value={formData.lat}
                    onChange={handleCoordChange}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700">{t('forms:deviceForm.longitude')}</label>
                  <input 
                    type="number" 
                    name="lng"
                    step="0.0001"
                    className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-sm"
                    value={formData.lng}
                    onChange={handleCoordChange}
                  />
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                {t('forms:deviceForm.coordinateHelper')}
              </p>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-700">{t('forms:deviceForm.administrativeLocation')}</label>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t('forms:deviceForm.provinsi')}</label>
                <select 
                  name="provinsi"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white"
                  value={formData.provinsi}
                  onChange={handleTextChange}
                >
                  <option value="">{t('forms:deviceForm.provinceSelect')}</option>
                  <option value="Jawa Timur">Jawa Timur</option>
                  <option value="Riau">Riau</option>
                  <option value="Kalimantan Tengah">Kalimantan Tengah</option>
                  <option value="Jambi">Jambi</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t('forms:deviceForm.kabupaten')}</label>
                <select 
                  name="kabupaten"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white"
                  value={formData.kabupaten}
                  onChange={handleTextChange}
                >
                  <option value="">{t('forms:deviceForm.citySelect')}</option>
                  <option value="Surabaya">Surabaya</option>
                  <option value="Pekanbaru">Pekanbaru</option>
                  <option value="Palangka">Palangka</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Helper Map */}
          <div className="h-full min-h-[400px] relative rounded-xl overflow-hidden border-2 border-emerald-100">
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-3 py-1 rounded-md z-[1000] text-xs font-bold text-emerald-800 shadow-sm">
              {t('forms:deviceForm.geoTaggingHelper')}
            </div>
            <MapContainer center={[formData.lat, formData.lng]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater lat={formData.lat} lng={formData.lng} />
              <Marker position={[formData.lat, formData.lng]} icon={icon}>
                <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                  Lat: {formData.lat}, Lng: {formData.lng}
                </Tooltip>
              </Marker>
              {/* Simulated SHP Overlay - Simple Rectangle to show "Region" */}
              <div className="leaflet-bottom leaflet-left p-2">
                <span className="bg-white px-2 py-1 rounded text-xs shadow">{t('forms:deviceForm.boundaryLayer')}</span>
              </div>
            </MapContainer>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md">{t('common:buttons.cancel')}</button>
          <button className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 shadow-md">
            {t('common:buttons.save')}
          </button>
        </div>

      </div>

      {/* Device List Table */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800">{t('forms:registeredDevices.title')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-3">{t('forms:registeredDevices.headers.deviceId')}</th>
                <th className="px-6 py-3">{t('forms:registeredDevices.headers.location')}</th>
                <th className="px-6 py-3">{t('forms:registeredDevices.headers.latitude')}</th>
                <th className="px-6 py-3">{t('forms:registeredDevices.headers.longitude')}</th>
                <th className="px-6 py-3">{t('forms:registeredDevices.headers.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_DEVICES.map((device) => (
                <tr 
                  key={device.id} 
                  className="hover:bg-slate-50 transition-colors"
                  title={`ID: ${device.device_id_unik} | Status: ${device.status}`}
                >
                  <td className="px-6 py-3 font-medium text-emerald-700">{device.device_id_unik}</td>
                  <td className="px-6 py-3">{device.kota}, {device.provinsi}</td>
                  <td className="px-6 py-3 font-mono text-xs">{device.latitude.toFixed(6)}</td>
                  <td className="px-6 py-3 font-mono text-xs">{device.longitude.toFixed(6)}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${device.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {device.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeviceForm;

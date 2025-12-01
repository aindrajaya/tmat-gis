import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useDevices } from '../services/useApi';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  const { data: devices, loading, error, refetch } = useDevices();
  const [expandedDeviceId, setExpandedDeviceId] = useState<number | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  
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
      
      {/* Collapsible Form Header */}
      <div 
        className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsFormVisible(!isFormVisible)}
      >
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Device Registration Form</h2>
              <p className="text-xs text-slate-500">Add new device to the monitoring system</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
              🚧 Under Development
            </span>
            {isFormVisible ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Form Content */}
      {isFormVisible && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 animate-in slide-in-from-top-2">
        
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('forms:deviceForm.deviceId')}</label>
              <input 
                type="text" 
                name="deviceId"
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 cursor-not-allowed"
                value={formData.deviceId}
                onChange={handleTextChange}
                placeholder={t('forms:deviceForm.deviceIdPlaceholder')}
                disabled
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('forms:deviceForm.kodeTitik')}</label>
                <input 
                  type="text" 
                  name="kodeTitik"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 bg-slate-50 cursor-not-allowed"
                  value={formData.kodeTitik}
                  onChange={handleTextChange}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('forms:deviceForm.kodeBlok')}</label>
                <input 
                  type="text" 
                  name="kodeBlok"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 bg-slate-50 cursor-not-allowed"
                  value={formData.kodeBlok}
                  onChange={handleTextChange}
                  disabled
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
                    className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-sm bg-blue-50 cursor-not-allowed"
                    value={formData.lat}
                    onChange={handleCoordChange}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700">{t('forms:deviceForm.longitude')}</label>
                  <input 
                    type="number" 
                    name="lng"
                    step="0.0001"
                    className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-sm bg-blue-50 cursor-not-allowed"
                    value={formData.lng}
                    onChange={handleCoordChange}
                    disabled
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
                  className="w-full border border-slate-300 rounded-md px-3 py-2 bg-slate-50 cursor-not-allowed"
                  value={formData.provinsi}
                  onChange={handleTextChange}
                  disabled
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
                  className="w-full border border-slate-300 rounded-md px-3 py-2 bg-slate-50 cursor-not-allowed"
                  value={formData.kabupaten}
                  onChange={handleTextChange}
                  disabled
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
          <button className="px-4 py-2 text-slate-400 bg-slate-100 rounded-md cursor-not-allowed" disabled>{t('common:buttons.cancel')}</button>
          <button className="px-6 py-2 bg-slate-400 text-white rounded-md shadow-md cursor-not-allowed" disabled>
            {t('common:buttons.save')}
          </button>
        </div>

        </div>
      )}

      {/* Device List Table */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">{t('forms:registeredDevices.title')}</h2>
          {loading && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b border-blue-500"></div>
              Loading...
            </div>
          )}
        </div>

        {error ? (
          <div className="px-6 py-8 text-center">
            <p className="text-red-600 mb-3">Error loading devices</p>
            <button 
              onClick={refetch}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : (
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
                {devices && devices.length > 0 ? (
                  devices.map((device) => (
                    <React.Fragment key={device.id}>
                      <tr 
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedDeviceId(expandedDeviceId === device.id ? null : device.id)}
                      >
                        <td className="px-6 py-3 font-medium text-emerald-700 flex items-center gap-2">
                          {expandedDeviceId === device.id ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                          {device.device_id_unik}
                        </td>
                        <td className="px-6 py-3">{device.kota}, {device.provinsi}</td>
                        <td className="px-6 py-3 font-mono text-xs">{device.latitude.toFixed(6)}</td>
                        <td className="px-6 py-3 font-mono text-xs">{device.longitude.toFixed(6)}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${device.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {device.status}
                          </span>
                        </td>
                      </tr>
                      {expandedDeviceId === device.id && (
                        <tr>
                          <td colSpan={5} className="bg-gradient-to-br from-emerald-50/30 via-white to-blue-50/30 p-6 border-l-4 border-emerald-500">
                            <div className="max-w-6xl mx-auto">
                              {/* Device Header */}
                              <div className="mb-6 pb-5 border-b-2 border-slate-200">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <h3 className="text-2xl font-bold text-slate-800 mb-1">{device.device_id_unik}</h3>
                                      <p className="text-sm text-slate-600 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        {device.tipe_alat}
                                      </p>
                                    </div>
                                  </div>
                                  <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-md ${device.status === 'aktif' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    ● {device.status === 'aktif' ? 'ACTIVE' : 'INACTIVE'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span><strong>Last Online:</strong> {device.last_online}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span><strong>Company ID:</strong> {device.id_perusahaan}</span>
                                  </div>
                                  {device.id_site && (
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                      </svg>
                                      <span><strong>Site ID:</strong> {device.id_site}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Information Sections */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                {/* Location Section */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                    </div>
                                    <h4 className="text-base font-bold text-slate-800">Location Information</h4>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                      <span className="text-sm text-slate-500 w-24 flex-shrink-0">Province:</span>
                                      <span className="text-sm font-semibold text-slate-800">{device.provinsi}</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                      <span className="text-sm text-slate-500 w-24 flex-shrink-0">District:</span>
                                      <span className="text-sm font-semibold text-slate-800">{device.kabupaten}</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                      <span className="text-sm text-slate-500 w-24 flex-shrink-0">City:</span>
                                      <span className="text-sm font-semibold text-slate-800">{device.kota}</span>
                                    </div>
                                    {device.alamat && (
                                      <div className="mt-3 pt-3 border-t border-slate-100">
                                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-2 font-semibold">Full Address</p>
                                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg">{device.alamat}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Technical Section */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                      </svg>
                                    </div>
                                    <h4 className="text-base font-bold text-slate-800">Technical Details</h4>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                      <span className="text-sm text-slate-500 w-32 flex-shrink-0">Point Code:</span>
                                      <span className="text-sm font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded">{device.kode_titik}</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                      <span className="text-sm text-slate-500 w-32 flex-shrink-0">Block Code:</span>
                                      <span className="text-sm font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded">{device.kode_blok}</span>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">GPS Coordinates</p>
                                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-2 mb-2">
                                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <span className="text-xs text-slate-600 font-semibold">Latitude:</span>
                                          <span className="text-sm font-mono font-bold text-emerald-700">{device.latitude.toFixed(6)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <span className="text-xs text-slate-600 font-semibold">Longitude:</span>
                                          <span className="text-sm font-mono font-bold text-emerald-700">{device.longitude.toFixed(6)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-3 pt-2">
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit Device
                                </button>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                  </svg>
                                  View on Map
                                </button>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all shadow-md hover:shadow-lg border-2 border-slate-300 transform hover:-translate-y-0.5">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  View Sensor Data
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      {loading ? 'Loading devices...' : 'No devices found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceForm;
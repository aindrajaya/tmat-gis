import React from 'react';
import { useTranslation } from 'react-i18next';
import { MOCK_REALTIME, MOCK_DEVICES } from '../services/mockData';

const RawData: React.FC = () => {
  const { t } = useTranslation();
  // Join data for the table
  const tableData = MOCK_REALTIME.map(rt => {
    const device = MOCK_DEVICES.find(d => d.device_id_unik === rt.device_id_unik);
    return {
      ...rt,
      location: device ? `${device.kota}, ${device.provinsi}` : 'Unknown'
    };
  });

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">{t('tables:rawData.title')}</h2>
          <button className="text-sm text-emerald-600 font-medium hover:underline">{t('common:buttons.exportCsv')}</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-3">{t('tables:rawData.headers.timestamp')}</th>
                <th className="px-6 py-3">{t('tables:rawData.headers.deviceId')}</th>
                <th className="px-6 py-3">{t('tables:rawData.headers.location')}</th>
                <th className="px-6 py-3 text-right">{t('tables:rawData.headers.tmat')}</th>
                <th className="px-6 py-3 text-right">{t('tables:rawData.headers.temperature')}</th>
                <th className="px-6 py-3 text-right">{t('tables:rawData.headers.ph')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium">{row.timestamp_data}</td>
                  <td className="px-6 py-3 text-emerald-700">{row.device_id_unik}</td>
                  <td className="px-6 py-3">{row.location}</td>
                  <td className={`px-6 py-3 text-right font-bold ${row.tmat_value < -0.4 ? 'text-red-600' : 'text-slate-700'}`}>
                    {row.tmat_value}
                  </td>
                  <td className="px-6 py-3 text-right">{row.suhu_value}</td>
                  <td className="px-6 py-3 text-right">{row.ph_value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-100 flex justify-center">
          <span className="text-xs text-slate-400">{t('tables:rawData.pagination')}</span>
        </div>
      </div>
    </div>
  );
};

export default RawData;
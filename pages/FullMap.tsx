import React from 'react';
import DashboardMap from '../components/DashboardMap';
import { useDevices } from '../services/useApi';

const FullMap: React.FC = () => {
  const { data: devices, loading, error, refetch } = useDevices();

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
          <p className="text-slate-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-red-800">Error loading map</h3>
          <p className="text-red-600">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-50">
      <DashboardMap devices={devices || []} heightClass="h-full" />
    </div>
  );
};

export default FullMap;

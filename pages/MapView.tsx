import React from 'react';
import DashboardMap from '../components/DashboardMap';
import { useDevices } from '../services/useApi';

const MapView: React.FC = () => {
  const { data: devices, loading, error, refetch } = useDevices();

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
          <p className="mt-4 text-slate-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-bold text-red-800 mb-2">Error loading map</h3>
          <p className="text-red-600">
            {error.message}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Map</h1>
          <p className="text-sm text-slate-500">Map-only view with filters, stats, and legend inside the map.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"
        >
          Refresh devices
        </button>
      </div>
      <div className="h-[calc(100vh-200px)]">
        <DashboardMap devices={devices || []} />
      </div>
    </div>
  );
};

export default MapView;

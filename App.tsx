import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import DeviceForm from './pages/DeviceForm';
import RawData from './pages/RawData';
import { FilterProvider } from './context/FilterContext';

const App: React.FC = () => {
  return (
    <FilterProvider>
      <Router>
        <div className="flex h-screen bg-slate-50">
          <Sidebar />
          <div className="flex-1 flex flex-col ml-64">
            <Header />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/raw-data" element={<RawData />} />
                <Route path="/master/device" element={<DeviceForm />} />
                {/* Placeholders for other routes */}
                <Route path="*" element={<div className="p-10 text-slate-400">Not implemented in this demo</div>} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </FilterProvider>
  );
};

export default App;
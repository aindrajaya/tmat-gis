import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import DeviceForm from './pages/DeviceForm';
import RawData from './pages/RawData';
import Companies from './pages/Companies';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { FilterProvider } from './context/FilterContext';
import { AuthProvider } from './context/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <FilterProvider>
        <Router>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <div className="flex h-screen bg-slate-50">
                  <Sidebar />
                  <div className="flex-1 flex flex-col ml-64">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/raw-data" element={<RawData />} />
                        <Route path="/master/device" element={<DeviceForm />} />
                        <Route path="/master/company" element={<Companies />} />
                        {/* Placeholders for other routes */}
                        <Route path="*" element={<div className="p-10 text-slate-400">Not implemented in this demo</div>} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </FilterProvider>
    </AuthProvider>
  );
};

export default App;
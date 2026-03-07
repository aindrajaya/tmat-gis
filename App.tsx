import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './src/store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import FullMap from './pages/FullMap';
import DeviceForm from './pages/DeviceForm';
import RawData from './pages/RawData';
import Companies from './pages/Companies';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { FilterProvider } from './context/FilterContext';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';

const LayoutContent: React.FC = () => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
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
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AuthProvider>
        <SidebarProvider>
          <FilterProvider>
            <Router>
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

              {/* Public map-only view */}
              <Route path="/map" element={<FullMap />} />

              {/* Full-screen map without layout */}
              <Route
                path="/map-full"
                element={
                  <ProtectedRoute>
                    <FullMap />
                  </ProtectedRoute>
                }
              />
              
              {/* Protected Routes */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <LayoutContent />
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </FilterProvider>
      </SidebarProvider>
    </AuthProvider>
    </Provider>
  );
};

export default App;

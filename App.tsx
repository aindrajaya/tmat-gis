import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './src/store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import FullMap from './pages/FullMap';
import DeviceForm from './pages/DeviceForm';
import RawData from './pages/RawData';
import Companies from './pages/Companies';
import ApiCredentialsSettings from './pages/ApiCredentialsSettings';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { FilterProvider } from './context/FilterContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { loadRuntimeApiKeys } from './services/runtimeApiKeys';

const ApiKeySetupGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const runtime = loadRuntimeApiKeys();
  const adminKeyMissing = !runtime.adminApiKey?.trim();
  const scopedPerusahaanId = user?.perusahaanId ? String(user.perusahaanId) : '';
  const perusahaanKeyMissing =
    user?.role === 'perusahaan' &&
    (!scopedPerusahaanId || !runtime.perusahaanApiKeys?.[scopedPerusahaanId]?.trim());
  const isAdmin = user?.role === 'admin';
  const isApiCredentialPage = location.pathname === '/settings/api-credentials';
  const mustRedirectToCredentials =
    !isApiCredentialPage && ((isAdmin && adminKeyMissing) || perusahaanKeyMissing);

  if (mustRedirectToCredentials) {
    return <Navigate to="/settings/api-credentials" replace />;
  }

  return <>{children}</>;
};

const LayoutContent: React.FC = () => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto">
          <ApiKeySetupGuard>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/raw-data" element={<RawData />} />
              <Route
                path="/master/device"
                element={
                  <AdminRouteGuard>
                    <DeviceForm />
                  </AdminRouteGuard>
                }
              />
              <Route
                path="/master/company"
                element={
                  <AdminRouteGuard>
                    <Companies />
                  </AdminRouteGuard>
                }
              />
              <Route path="/settings/api-credentials" element={<ApiCredentialsSettings />} />
              {/* Placeholders for other routes */}
              <Route path="*" element={<div className="p-10 text-slate-400">Not implemented in this demo</div>} />
            </Routes>
          </ApiKeySetupGuard>
        </main>
      </div>
    </div>
  );
};

const MapRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role === 'perusahaan') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
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
              <Route
                path="/map"
                element={
                  <MapRouteGuard>
                    <FullMap />
                  </MapRouteGuard>
                }
              />

              {/* Full-screen map without layout */}
              <Route
                path="/map-full"
                element={
                  <ProtectedRoute>
                    <MapRouteGuard>
                      <FullMap />
                    </MapRouteGuard>
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

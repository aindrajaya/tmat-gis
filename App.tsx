import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const runtime = loadRuntimeApiKeys();
  const adminKeyMissing = !runtime.adminApiKey?.trim();
  const isAdmin = user?.role === 'admin';
  const isApiCredentialPage = location.pathname === '/settings/api-credentials';

  React.useEffect(() => {
    if (isAdmin && adminKeyMissing && !isApiCredentialPage) {
      navigate('/settings/api-credentials', { replace: true });
    }
  }, [isAdmin, adminKeyMissing, isApiCredentialPage, navigate]);

  if (isAdmin && adminKeyMissing && !isApiCredentialPage) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">
            API key belum dikonfigurasi
          </h2>
          <p className="text-sm text-amber-700 mb-4">
            Silakan isi Admin API key terlebih dahulu di halaman API Credentials.
          </p>
          <button
            onClick={() => navigate('/settings/api-credentials')}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
          >
            Buka API Credentials
          </button>
        </div>
      </div>
    );
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
              <Route path="/master/device" element={<DeviceForm />} />
              <Route path="/master/company" element={<Companies />} />
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

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';

// Create a React Query client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Session and authorization are managed by auth proxy via HttpOnly cookie.

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
            {/* Placeholders for other routes */}
            <Route path="*" element={<div className="p-10 text-slate-400">Not implemented in this demo</div>} />
          </Routes>
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
    <QueryClientProvider client={queryClient}>
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

                {/* Protected routes with layout */}
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <LayoutContent />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </FilterProvider>
        </SidebarProvider>
      </AuthProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;

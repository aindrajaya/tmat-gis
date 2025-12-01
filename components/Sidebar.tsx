import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Database, Key, Users, FileText, ChevronRight, ChevronLeft, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const Sidebar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
    <Link
      to={to}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        isActive(to) 
          ? 'bg-emerald-600 text-white shadow-md' 
          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
      }`}
      title={isCollapsed ? label : ''}
    >
      <Icon size={20} />
      {!isCollapsed && <span className="font-medium">{label}</span>}
      {!isCollapsed && isActive(to) && <ChevronRight size={16} className="ml-auto" />}
    </Link>
  );

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-30 flex flex-col transition-all duration-300`}>
      <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
        <img 
          src="/klhk-logo.png" 
          alt="KLHK Logo" 
          className="w-10 h-10 flex-shrink-0 object-contain"
        />
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <span className="text-base font-bold text-slate-800 block leading-tight">{t('common:app.name')}</span>
            <span className="text-[10px] text-slate-500 block leading-tight">KLHK</span>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1.5 shadow-md hover:shadow-lg transition-all hover:bg-emerald-50 z-40"
        title={isCollapsed ? (isIndonesian ? 'Buka Sidebar' : 'Open Sidebar') : (isIndonesian ? 'Tutup Sidebar' : 'Close Sidebar')}
      >
        {isCollapsed ? (
          <ChevronRight size={16} className="text-slate-600" />
        ) : (
          <ChevronLeft size={16} className="text-slate-600" />
        )}
      </button>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {!isCollapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-2">{t('common:nav.main')}</div>}
        <NavItem to="/" icon={LayoutDashboard} label={t('common:nav.dashboard')} />
        <NavItem to="/raw-data" icon={FileText} label={t('common:nav.rawData')} />

        {!isCollapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-6">{t('common:nav.management')}</div>}
        <NavItem to="/master/device" icon={Database} label={t('common:nav.deviceLogger')} />
        <NavItem to="/master/company" icon={Database} label={t('common:nav.companyData')} />
        
        {!isCollapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-6">{t('common:nav.admin')}</div>}
        <NavItem to="/api-keys" icon={Key} label={t('common:nav.apiManagement')} />
        <NavItem to="/users" icon={Users} label={t('common:nav.userRoles')} />
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-3">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
            {user?.name.charAt(0) || 'A'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@example.com'}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center space-x-2'} px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors font-medium`}
          title={isIndonesian ? 'Keluar' : 'Logout'}
        >
          <LogOut size={18} />
          {!isCollapsed && <span>{isIndonesian ? 'Keluar' : 'Logout'}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, Key, Users, FileText, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
    <Link
      to={to}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        isActive(to) 
          ? 'bg-emerald-600 text-white shadow-md' 
          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {isActive(to) && <ChevronRight size={16} className="ml-auto" />}
    </Link>
  );

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-30 flex flex-col">
      <div className="p-6 border-b border-slate-100 flex items-center space-x-2">
        <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center text-white font-bold text-lg">T</div>
        <span className="text-xl font-bold text-slate-800 tracking-tight">{t('common:app.name')}</span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-2">{t('common:nav.main')}</div>
        <NavItem to="/" icon={LayoutDashboard} label={t('common:nav.dashboard')} />
        <NavItem to="/raw-data" icon={FileText} label={t('common:nav.rawData')} />

        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-6">{t('common:nav.management')}</div>
        <NavItem to="/master/device" icon={Database} label={t('common:nav.deviceLogger')} />
        <NavItem to="/master/company" icon={Database} label={t('common:nav.companyData')} />
        
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-6">{t('common:nav.admin')}</div>
        <NavItem to="/api-keys" icon={Key} label={t('common:nav.apiManagement')} />
        <NavItem to="/users" icon={Users} label={t('common:nav.userRoles')} />
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
            SA
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{t('common:user.role')}</p>
            <p className="text-xs text-slate-500">{t('common:user.permission')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
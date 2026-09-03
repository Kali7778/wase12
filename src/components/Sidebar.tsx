import React from 'react';
import { useApp, NavView } from '../context/AppContext';
import {
  LayoutDashboard,
  Truck,
  Compass,
  Users,
  Boxes,
  PackagePlus,
  Building2,
  DollarSign,
  ShieldCheck,
  Navigation,
  BarChart3,
  UserCog,
  Database,
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { currentView, setCurrentView, t, trips, warehouseItems, supplierInventory } = useApp();

  const activeTripsCount = trips.filter((t) => t.status === 'in_transit').length;
  const lowStockCount = warehouseItems.filter((i) => i.quantityOnHand <= i.minimumThreshold).length;
  const availableSupplierCount = (supplierInventory || []).filter((s) => (s.qtyAvailable || 0) > 0).length;

  const opsNavItems: {
    id: NavView;
    labelKey: any;
    icon: any;
    badge?: number;
    badgeColor?: string;
  }[] = [
    { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
    { id: 'supplierInventory', labelKey: 'supplierInventory', icon: PackagePlus, badge: availableSupplierCount > 0 ? availableSupplierCount : undefined, badgeColor: 'bg-emerald-600 text-white' },
    { id: 'dispatcher', labelKey: 'dispatcher', icon: Truck, badge: activeTripsCount > 0 ? activeTripsCount : undefined, badgeColor: 'bg-blue-600 text-white' },
    { id: 'driverPanel', labelKey: 'driverPanel', icon: UserCog, badge: 1, badgeColor: 'bg-emerald-500 text-white' },
  ];

  const commNavItems: {
    id: NavView;
    labelKey: any;
    icon: any;
    badge?: number;
    badgeColor?: string;
  }[] = [
    { id: 'warehouse', labelKey: 'warehouse', icon: Boxes, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'bg-amber-500 text-white' },
    { id: 'drivers', labelKey: 'drivers', icon: Users },
    { id: 'customers', labelKey: 'customers', icon: Building2 },
    { id: 'expenses', labelKey: 'expenses', icon: DollarSign },
    { id: 'invoices', labelKey: 'invoices', icon: ShieldCheck },
    { id: 'liveGps', labelKey: 'liveGps', icon: Navigation },
  ];

  const sysNavItems: {
    id: NavView;
    labelKey: any;
    icon: any;
  }[] = [
    { id: 'reports', labelKey: 'reports', icon: BarChart3 },
    { id: 'users', labelKey: 'users', icon: UserCog },
    { id: 'backupSync', labelKey: 'backupSync', icon: Database },
    { id: 'settings', labelKey: 'settings', icon: Settings },
  ];

  const handleNavClick = (view: NavView) => {
    setCurrentView(view);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 z-40 flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:static'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30">
              LF
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-white">LogiFlow</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-purple-500/20 text-purple-300 font-mono font-bold">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none">Fleet & Logistics System</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Logistics & Operations
          </div>

          {opsNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{t(item.labelKey)}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Commercial & Accounts
          </div>

          {commNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{t(item.labelKey)}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            System & Analytics
          </div>

          {sysNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{t(item.labelKey)}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer info & Enterprise Sync status */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-[11px] text-slate-300 font-medium">KSA Enterprise Cloud</span>
            </div>
            <span className="text-[10px] font-mono text-purple-400 font-bold">LIVE SYNCED</span>
          </div>
        </div>
      </aside>
    </>
  );
};

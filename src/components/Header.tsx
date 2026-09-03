import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Search,
  Moon,
  Sun,
  Globe,
  Bell,
  PlusCircle,
  Menu,
  Shield,
  Truck,
  Building2,
  DollarSign,
  Boxes,
  User,
  CheckCircle2,
  AlertTriangle,
  Crown,
  Briefcase,
  ShieldCheck,
  ShoppingCart
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenMobileSidebar?: () => void;
  onOpenNewTripModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenMobileSidebar, onOpenNewTripModal }) => {
  const handleToggleMenu = onOpenMobileSidebar || onToggleMobileMenu || (() => {});
  const {
    language,
    setLanguage,
    t,
    isDark,
    setIsDark,
    searchQuery,
    setSearchQuery,
    activeRole,
    setActiveRole,
    trips,
    warehouseItems,
    setCurrentView,
    setSelectedTripForDn
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Compute live notifications
  const lowStockCount = warehouseItems.filter((i) => i.quantityOnHand <= i.minimumThreshold);
  const activeTripsCount = trips.filter((tr) => tr.status === 'in_transit');
  const delayedTrips = trips.filter((tr) => tr.status === 'delayed');
  const totalAlerts = lowStockCount.length + delayedTrips.length;

  const roles: { role: UserRole; title: string; desc: string; icon: any }[] = [
    { role: 'ceo', title: 'Chief Executive Officer (CEO)', desc: 'Executive governance & Master Audit', icon: Crown },
    { role: 'gm', title: 'General Manager (GM)', desc: 'Full operational control & approvals', icon: Briefcase },
    { role: 'manager', title: 'Operations Manager', desc: 'Daily dispatch, silos & slips review', icon: ShieldCheck },
    { role: 'admin', title: 'Super Admin', desc: 'System configuration & database', icon: Shield },
    { role: 'dispatcher', title: 'Fleet Dispatcher', desc: 'Trips, GPS & driver routing', icon: Truck },
    { role: 'sales', title: 'Sales & POS Agent', desc: 'Customer sales orders & pricing', icon: ShoppingCart },
    { role: 'accountant', title: 'Chief Accountant', desc: 'Tax invoices & expenses', icon: DollarSign },
    { role: 'warehouse_mgr', title: 'Warehouse Lead', desc: 'Stock control & Inbound DNs', icon: Boxes },
    { role: 'driver', title: 'Driver / Field Agent', desc: 'Route & Delivery note slips', icon: User },
  ];

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors"
    >
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          id="mobile-menu-toggle-btn"
          onClick={handleToggleMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="global-search-input"
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery ?? ""}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick New Trip Action */}
        <button
          id="header-new-trip-btn"
          onClick={onOpenNewTripModal}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden md:inline">{t('newTrip')}</span>
        </button>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            id="role-switcher-btn"
            onClick={() => {
              setShowRoleMenu(!showRoleMenu);
              setShowNotifications(false);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="capitalize font-mono hidden sm:inline">{activeRole.replace('_', ' ')}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">({t('activeRole')})</span>
          </button>

          {/* Role Dropdown */}
          {showRoleMenu && (
            <div
              id="role-menu-dropdown"
              className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('switchRole')}
              </div>
              <div className="py-1 space-y-0.5">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = activeRole === r.role;
                  return (
                    <button
                      key={r.role}
                      onClick={() => {
                        setActiveRole(r.role);
                        setShowRoleMenu(false);
                        if (r.role === 'driver') setCurrentView('driverPanel');
                        else if (r.role === 'warehouse' || r.role === 'warehouse_mgr') setCurrentView('warehouse');
                        else if (r.role === 'accountant') setCurrentView('invoices');
                        else setCurrentView('warehouse');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="leading-tight">{r.title}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{r.desc}</div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            id="notifications-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowRoleMenu(false);
            }}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
            )}
          </button>

          {showNotifications && (
            <div
              id="notifications-popover"
              className="absolute right-0 mt-2 w-80 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Active Operational Alerts</span>
                <span className="text-[11px] text-slate-400">{totalAlerts} issues</span>
              </div>

              <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                {lowStockCount.length > 0 && (
                  <div
                    onClick={() => {
                      setCurrentView('warehouse');
                      setShowNotifications(false);
                    }}
                    className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 cursor-pointer hover:opacity-90"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Low Warehouse Stock
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                      {lowStockCount[0].name} is at {lowStockCount[0].quantityOnHand} units (Threshold: {lowStockCount[0].minimumThreshold}).
                    </p>
                  </div>
                )}

                {activeTripsCount.map((tr) => (
                  <div
                    key={tr.id}
                    onClick={() => {
                      setSelectedTripForDn(tr);
                      setShowNotifications(false);
                    }}
                    className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 cursor-pointer hover:opacity-90"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
                      <Truck className="w-3.5 h-3.5 text-blue-600" /> Active Trip: {tr.tripNumber}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      {tr.origin.city} → {tr.destination.city} ({tr.progressPercent}% completed).
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <button
          id="lang-toggle-btn"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-bold transition-colors"
          title="Toggle English / Arabic"
        >
          <Globe className="w-4 h-4" />
          <span>{language === 'en' ? 'العربية' : 'EN'}</span>
        </button>

        {/* Dark / Light Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};

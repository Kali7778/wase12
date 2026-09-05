import React from 'react';
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardCheck,
  Database,
  DollarSign,
  FileStack,
  LayoutDashboard,
  Navigation,
  PackagePlus,
  Route,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { NavView, useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../models/base';
import { StatusDot } from './ui/Badge';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Roles that may open this module. Mirrors what the database allows. */
  roles: UserRole[];
  badge?: number;
  badgeTone?: 'warn' | 'risk' | 'accent';
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const ALL: UserRole[] = ['ceo', 'gm', 'manager', 'admin', 'dispatcher', 'warehouse', 'driver'];
const OPS: UserRole[] = ['ceo', 'gm', 'manager', 'admin', 'dispatcher', 'warehouse'];
const COMMERCIAL: UserRole[] = ['ceo', 'gm', 'manager', 'admin'];
const LEADERSHIP: UserRole[] = ['ceo', 'gm', 'manager'];
const ADMINISTRATION: UserRole[] = ['ceo', 'gm'];

/**
 * Primary navigation.
 *
 * Modules are shown only to the roles that can actually use them. A driver was
 * previously offered every screen in the product and met a permission error on
 * most of them; navigation that leads somewhere you cannot go is not navigation.
 *
 * This is presentation only — the database enforces the same boundaries.
 */
export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { currentView, setCurrentView, trips, warehouseItems, supplierInventory } = useApp();
  const { role } = useAuth();

  const activeTrips = trips.filter((t) => t.status === 'in_transit').length;
  const lowStock = warehouseItems.filter((i) => i.quantityOnHand <= i.minimumThreshold).length;
  const availableSupplier = (supplierInventory ?? []).filter((s) => (s.qtyAvailable ?? 0) > 0).length;

  const groups: NavGroup[] = [
    {
      heading: 'Operations',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: OPS },
        {
          id: 'adminSlips',
          label: 'Delivery Slips',
          icon: FileStack,
          // The intake screen belongs to whoever receives slips from the supplier.
          roles: ['manager', 'admin', 'dispatcher', 'warehouse'],
        },
        { id: 'slipReview', label: 'Slip Review', icon: ClipboardCheck, roles: ['ceo', 'gm'] },
        {
          id: 'dispatcher',
          label: 'Dispatcher',
          icon: Truck,
          roles: ['ceo', 'gm', 'manager', 'dispatcher'],
          badge: activeTrips || undefined,
          badgeTone: 'accent',
        },
        { id: 'trips', label: 'Trips', icon: Route, roles: ['ceo', 'gm', 'manager', 'dispatcher'] },
        { id: 'driverPanel', label: 'Driver Panel', icon: UserCog, roles: ALL },
        { id: 'liveGps', label: 'Live GPS', icon: Navigation, roles: ['ceo', 'gm', 'manager', 'dispatcher'] },
      ],
    },
    {
      heading: 'Inventory',
      items: [
        {
          id: 'supplierInventory',
          label: 'Supplier Inventory',
          icon: PackagePlus,
          roles: OPS,
          badge: availableSupplier || undefined,
          badgeTone: 'accent',
        },
        {
          id: 'warehouse',
          label: 'Warehouse',
          icon: Boxes,
          roles: OPS,
          badge: lowStock || undefined,
          badgeTone: 'warn',
        },
      ],
    },
    {
      heading: 'Commercial',
      items: [
        { id: 'customers', label: 'Customers', icon: Building2, roles: COMMERCIAL },
        { id: 'invoices', label: 'Invoices', icon: ShieldCheck, roles: COMMERCIAL },
        { id: 'expenses', label: 'Expenses', icon: DollarSign, roles: COMMERCIAL },
        { id: 'drivers', label: 'Drivers & Fleet', icon: Users, roles: ['ceo', 'gm', 'manager', 'dispatcher'] },
      ],
    },
    {
      heading: 'Oversight',
      items: [
        { id: 'approvalCenter', label: 'Approvals', icon: ClipboardCheck, roles: LEADERSHIP },
        { id: 'masterAudit', label: 'Audit Trail', icon: ScrollText, roles: LEADERSHIP },
        { id: 'reports', label: 'Reports', icon: BarChart3, roles: COMMERCIAL },
      ],
    },
    {
      heading: 'Administration',
      items: [
        { id: 'users', label: 'Users', icon: Users, roles: ADMINISTRATION },
        { id: 'backupSync', label: 'Backup & Sync', icon: Database, roles: ADMINISTRATION },
        { id: 'settings', label: 'Settings', icon: Settings, roles: ADMINISTRATION },
      ],
    },
  ];

  const visible = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => role && i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);

  const go = (view: NavView) => {
    setCurrentView(view);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden
        />
      )}

      <aside
        className={[
          'fixed lg:sticky top-0 z-50 lg:z-auto h-screen w-60 shrink-0',
          'bg-surface border-r border-line flex flex-col',
          'transition-transform duration-200 lg:transition-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="h-14 shrink-0 px-4 flex items-center justify-between border-b border-line">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-control bg-accent text-white flex items-center justify-center">
              <Truck className="w-3.5 h-3.5" />
            </span>
            <span className="text-tiny font-semibold text-ink tracking-tight">LogiFlow</span>
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="lg:hidden h-7 w-7 rounded-control flex items-center justify-center text-ink-faint hover:bg-raised cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-3 space-y-5">
          {visible.map((group) => (
            <div key={group.heading}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = currentView === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => go(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={[
                          'w-full h-8 px-2 rounded-control flex items-center gap-2.5 text-tiny',
                          'transition-colors cursor-pointer',
                          active
                            ? 'bg-accent-soft text-accent-ink font-semibold'
                            : 'text-ink-soft hover:bg-raised hover:text-ink',
                        ].join(' ')}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className="text-micro font-semibold text-ink-faint tabular-nums"
                            data-numeric
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.badgeTone === 'warn' && item.badge !== undefined && (
                          <StatusDot tone="warn" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 px-3 py-2.5 border-t border-line">
          <p className="text-[10px] text-ink-faint">
            Logistics &amp; Inventory Management
          </p>
        </div>
      </aside>
    </>
  );
};

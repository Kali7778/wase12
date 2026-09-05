import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Package,
  Search,
  Sun,
  Truck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL } from '../models/base';
import { fullName } from '../models/masterData';
import { Avatar } from './Avatar';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenMobileSidebar?: () => void;
  onOpenNewTripModal?: () => void;
}

/**
 * Application header.
 *
 * The role shown here is the signed-in user's real role and cannot be changed
 * from the interface. It previously offered a "Switch Role" menu that let
 * anyone assume any role, including CEO — a leftover from when roles were
 * decorative. The database now enforces the same role through RLS, so a role
 * chosen in the UI could only ever disagree with what the server permits.
 */
export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenMobileSidebar }) => {
  const openMobileNav = onOpenMobileSidebar || onToggleMobileMenu || (() => {});
  const { language, setLanguage, isDark, setIsDark, searchQuery, setSearchQuery, trips, warehouseItems } =
    useApp();
  const { profile, role, signOut } = useAuth();

  const [openMenu, setOpenMenu] = useState<'alerts' | 'account' | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Close either popover on an outside click or Escape.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenMenu(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  const lowStock = warehouseItems.filter((i) => i.quantityOnHand <= i.minimumThreshold);
  const delayed = trips.filter((t) => t.status === 'delayed');
  const alertCount = lowStock.length + delayed.length;

  const name = profile ? fullName(profile) || profile.email : '';

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 h-14 shrink-0 bg-surface/85 backdrop-blur border-b border-line"
    >
      <div className="h-full px-3 sm:px-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          icon={Menu}
          iconOnly
          onClick={openMobileNav}
          className="lg:hidden"
        >
          Open navigation
        </Button>

        {/* Search — the primary way into records, so it gets the space. */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search delivery notes, trips, customers…"
            className="w-full h-8 pl-8 pr-3 rounded-control border border-line bg-raised text-tiny text-ink placeholder:text-ink-faint hover:border-line-strong transition-colors"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="font-mono uppercase"
            title={language === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
          >
            {language === 'en' ? 'ع' : 'EN'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={isDark ? Sun : Moon}
            iconOnly
            onClick={() => setIsDark(!isDark)}
          >
            {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          </Button>

          {/* Alerts */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'alerts' ? null : 'alerts')}
              aria-label={`Alerts${alertCount ? `, ${alertCount} needing attention` : ''}`}
              className="relative h-7 w-7 rounded-control flex items-center justify-center text-ink-soft hover:bg-raised hover:text-ink transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-pill bg-risk text-white text-[9px] font-bold flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>

            {openMenu === 'alerts' && (
              <div className="absolute right-0 mt-1.5 w-72 rounded-panel bg-surface border border-line shadow-lg overflow-hidden">
                <p className="px-3 py-2 text-micro font-semibold text-ink-soft border-b border-line">
                  Alerts
                </p>
                {alertCount === 0 ? (
                  <p className="px-3 py-6 text-micro text-ink-faint text-center">
                    Nothing needs attention.
                  </p>
                ) : (
                  <ul className="max-h-72 overflow-y-auto custom-scrollbar divide-line">
                    {lowStock.slice(0, 6).map((item) => (
                      <li key={item.id} className="px-3 py-2 flex items-start gap-2">
                        <Package className="w-3.5 h-3.5 text-warn mt-0.5 shrink-0" />
                        <span className="text-micro text-ink-soft">
                          <span className="font-semibold text-ink">{item.name}</span> is at{' '}
                          <span data-numeric>{item.quantityOnHand}</span>, below its minimum of{' '}
                          <span data-numeric>{item.minimumThreshold}</span>.
                        </span>
                      </li>
                    ))}
                    {delayed.slice(0, 6).map((trip) => (
                      <li key={trip.id} className="px-3 py-2 flex items-start gap-2">
                        <Truck className="w-3.5 h-3.5 text-risk mt-0.5 shrink-0" />
                        <span className="text-micro text-ink-soft">
                          Trip <span className="font-semibold text-ink">{trip.id}</span> is delayed.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Account */}
          <div className="relative ml-1">
            <button
              onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
              className="h-8 pl-1 pr-1.5 rounded-control flex items-center gap-2 hover:bg-raised transition-colors cursor-pointer"
            >
              <Avatar name={name || 'User'} size={24} />
              <span className="hidden sm:flex flex-col items-start leading-none">
                <span className="text-micro font-semibold text-ink max-w-[9rem] truncate">{name}</span>
                <span className="text-[10px] text-ink-faint mt-0.5">
                  {role ? ROLE_LABEL[role] : ''}
                </span>
              </span>
              <ChevronDown className="w-3 h-3 text-ink-faint" />
            </button>

            {openMenu === 'account' && (
              <div className="absolute right-0 mt-1.5 w-60 rounded-panel bg-surface border border-line shadow-lg overflow-hidden">
                <div className="px-3 py-3 border-b border-line">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={name || 'User'} size={34} />
                    <div className="min-w-0">
                      <p className="text-tiny font-semibold text-ink truncate">{name}</p>
                      <p className="text-micro text-ink-faint truncate">{profile?.email}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <Badge tone="accent">{role ? ROLE_LABEL[role] : 'No role'}</Badge>
                    <span className="text-[10px] text-ink-faint">set by your administrator</span>
                  </div>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => void signOut()}
                    className="w-full px-2.5 py-2 rounded-control text-tiny text-ink-soft hover:bg-raised hover:text-ink flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {alertCount > 0 && openMenu !== 'alerts' && (
        <span className="sr-only" role="status">
          <AlertTriangle className="w-0 h-0" />
          {alertCount} items need attention
        </span>
      )}
    </header>
  );
};

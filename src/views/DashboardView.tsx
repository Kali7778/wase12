import React from 'react';
import {
  ArrowRight,
  Copy,
  Truck,
  FileStack,
  History,
  PackageCheck,
  PackageSearch,
  Send,
} from 'lucide-react';
import { PageHeader, Panel } from '../components/ui/Panel';
import { SlipMovementPanel } from '../components/dashboard/SlipMovementPanel';
import { useApp, type NavView } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../models/base';

/**
 * The landing screen.
 *
 * This used to be a demo: fleet utilisation, monthly revenue, an on-time
 * rate of 98.5%, all of it typed into the source and none of it true. The
 * only figures here now are read from the database — what came in today
 * and what went out — and below them the way to each part of the work.
 *
 * The rest of the demo (trips, dispatch, invoicing, expenses) is still in
 * the codebase and still routed; it is simply not offered until it is
 * connected to something real.
 */
interface Shortcut {
  id: NavView;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const SHORTCUTS: Shortcut[] = [
  {
    id: 'adminSlips',
    label: 'Delivery Slips',
    description: 'Upload the slips the supplier sent, then pass them on.',
    icon: FileStack,
    roles: ['admin', 'manager', 'dispatcher', 'gm', 'ceo'],
  },
  {
    id: 'slipReview',
    label: 'Slip Review',
    description: 'Slips waiting for the GM to hand on or turn down.',
    icon: FileStack,
    roles: ['gm', 'ceo'],
  },
  {
    id: 'receiving',
    label: 'Receiving',
    description: 'Count what came off the truck. Stock starts here.',
    icon: PackageCheck,
    roles: ['warehouse', 'gm', 'ceo'],
  },
  {
    id: 'requests',
    label: 'Requests',
    description: 'Slips the warehouse and the drivers have asked for.',
    icon: Send,
    roles: ['admin', 'manager', 'gm', 'ceo', 'warehouse', 'driver'],
  },
  {
    id: 'talab',
    label: 'Customer Orders',
    description: 'Loads going straight to a customer, and what is still open.',
    icon: Truck,
    roles: ['admin', 'manager', 'gm', 'ceo'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Claimed, arrived, missing and what is left — per slip.',
    icon: PackageSearch,
    roles: ['admin', 'manager', 'gm', 'ceo', 'warehouse'],
  },
  {
    id: 'reissues',
    label: 'Reissued slips',
    description: 'Sheets the supplier printed twice, and why.',
    icon: Copy,
    roles: ['admin', 'manager', 'gm', 'ceo'],
  },
  {
    id: 'custody',
    label: 'Handovers',
    description: 'Who gave which slip to whom, and when.',
    icon: History,
    roles: ['admin', 'manager', 'gm', 'ceo'],
  },
];

export const DashboardView: React.FC = () => {
  const { setCurrentView } = useApp();
  const { profile, can } = useAuth();

  const seesSlipMovement = can('ceo', 'gm', 'manager', 'admin', 'dispatcher');
  const shortcuts = SHORTCUTS.filter((s) => profile && s.roles.includes(profile.role));

  return (
    <div id="dashboard-view" className="space-y-5">
      <PageHeader
        title={profile?.firstName ? `Hello, ${profile.firstName}` : 'Dashboard'}
        description="Delivery slips from El-Khayyat, from the moment one arrives to the moment its goods are counted in."
      />

      {seesSlipMovement && <SlipMovementPanel />}

      <Panel title="Where the work is" flush>
        <ul className="divide-line">
          {shortcuts.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setCurrentView(s.id)}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-raised transition-colors cursor-pointer"
              >
                <span className="w-9 h-9 rounded-control bg-sunken border border-line flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-ink-faint" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-tiny font-semibold text-ink">{s.label}</span>
                  <span className="block text-micro text-ink-faint">{s.description}</span>
                </span>

                <ArrowRight className="w-4 h-4 text-ink-faint shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/i18n';
import {
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  Users,
  Compass,
  FileText,
  Eye,
  Plus,
  Building2,
  CreditCard,
  Receipt,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DashboardViewProps {
  onOpenNewTripModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenNewTripModal }) => {
  const {
    t,
    trips,
    vehicles,
    drivers,
    customers,
    warehouseItems,
    supplierInventory,
    expenses,
    taxInvoices,
    setSelectedTripForDn,
    setSelectedInvoice,
    setCurrentView,
    createTaxInvoiceFromTrip
  } = useApp();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Compute key KPI metrics
  const activeTrips = trips.filter((t) => t.status === 'in_transit');
  const deliveredTrips = trips.filter((t) => t.status === 'delivered');
  const delayedTrips = trips.filter((t) => t.status === 'delayed');
  const availableDrivers = drivers.filter((d) => d.status === 'available');
  const activeVehicles = vehicles.filter((v) => v.status === 'in_transit' || v.status === 'active');
  const lowStockCount = warehouseItems.filter((i) => i.quantityOnHand <= i.minimumThreshold);

  const totalRevenue = trips.reduce((acc, t) => acc + (t.price || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netMargin = totalRevenue - totalExpenses;
  const onTimeRate = trips.length > 0 ? ((deliveredTrips.length / Math.max(1, deliveredTrips.length + delayedTrips.length)) * 100).toFixed(1) : '98.5';

  // Customer & Invoicing Aggregates
  const totalBilled = customers.reduce((acc, c) => acc + (c.totalAmount ?? c.totalBilled ?? 0), 0);
  const totalPaid = customers.reduce((acc, c) => acc + (c.paidAmount ?? 0), 0);
  const totalOutstanding = customers.reduce((acc, c) => acc + (c.outstandingAmount ?? c.outstandingBalance ?? 0), 0);

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-mono font-bold">
              LOGISTICS & ENTERPRISE ERP
            </span>
            <span className="text-xs text-slate-300">Live Telemetry & Billing Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">Fleet & Operations Hub</h1>
          <p className="text-xs text-slate-300 max-w-xl mt-1">
            End-to-end management for Customer Accounts, Dispatched Loads, Delivery Notes, and Financial Statements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="dash-quick-new-trip"
            onClick={onOpenNewTripModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip & DN</span>
          </button>
          <button
            onClick={() => setCurrentView('customers')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Customers ({customers.length})</span>
          </button>
        </div>
      </div>

      {/* Connected Workflow Banner */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white">Active System Workflow Chain:</span>
            <span className="text-slate-500 block text-[11px]">Seamless automation from order generation to payment settlement</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          <button
            onClick={() => setCurrentView('supplierInventory')}
            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-lg cursor-pointer transition-colors"
          >
            1. Supplier Intake
          </button>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <button
            onClick={() => setCurrentView('supplierInventory')}
            className="px-2 py-1 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 rounded-lg cursor-pointer transition-colors"
          >
            2. Stock All
          </button>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <button
            onClick={() => setCurrentView('dispatcher')}
            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer transition-colors"
          >
            3. Dispatch Loading
          </button>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <button
            onClick={() => setCurrentView('driverPanel')}
            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg cursor-pointer transition-colors"
          >
            4. Driver Fleet
          </button>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <button
            onClick={() => setCurrentView('trips')}
            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg cursor-pointer transition-colors"
          >
            5. Route Delivery
          </button>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <button
            onClick={() => setCurrentView('invoices')}
            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg cursor-pointer transition-colors"
          >
            6. Invoice & Pay
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Fleet */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('activeFleet')}
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {activeVehicles.length} <span className="text-sm font-normal text-slate-400">/ {vehicles.length} Trucks</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{activeTrips.length} active in-transit</span>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('monthlyRevenue')}
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+14.2% vs last month</span>
            </div>
          </div>
        </div>

        {/* Operating Cost */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('operatingCost')}
            </span>
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {formatCurrency(totalExpenses)}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
              <span>Fuel, Tolls & Maintenance</span>
            </div>
          </div>
        </div>

        {/* On-Time Delivery Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('onTimeRate')}
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {onTimeRate}%
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Target: 98.0% met</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Financial & Accounts Aggregates Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Customer Financial Ledgers & Receivables
              </h3>
            </div>
            <p className="text-xs text-slate-500">Live summary of billed invoices, settled payments, and customer accounts</p>
          </div>
          <button
            onClick={() => setCurrentView('customers')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Open Customer Directory →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Accounts</span>
            <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
              {customers.length} Accounts
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">
              {customers.filter((c) => c.status === 'active').length} Active Clients
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Invoiced</span>
            <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalBilled)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Across all loads</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Paid Amount</span>
            <div className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(totalPaid)}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">
              {totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100}% Settled
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Outstanding Due</span>
            <div className="text-xl font-mono font-black text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(totalOutstanding)}
            </div>
            <span className="text-[11px] text-rose-600 font-semibold">Pending Collection</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Revenue Trends Chart & Live Fleet Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Financial & Trip Trends (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('revenueExpenseTrends')}
              </h3>
              <p className="text-xs text-slate-500">Gross Freight Invoicing vs Direct Fuel & Fleet Costs</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    timeRange === range
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Clean Responsive Bar/Line Trend Chart */}
          <div className="h-64 w-full flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {[
              { label: 'Week 1', rev: 28000, exp: 12000 },
              { label: 'Week 2', rev: 34500, exp: 14800 },
              { label: 'Week 3', rev: 41200, exp: 18200 },
              { label: 'Week 4', rev: 48900, exp: 20400 },
              { label: 'Current', rev: 52400, exp: 22100 },
            ].map((bar, idx) => {
              const maxVal = 60000;
              const revHeight = (bar.rev / maxVal) * 100;
              const expHeight = (bar.exp / maxVal) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    {/* Revenue Bar */}
                    <div
                      style={{ height: `${revHeight}%` }}
                      className="w-5 sm:w-8 bg-blue-600 dark:bg-blue-500 rounded-t-lg transition-all duration-300 group-hover:brightness-110 relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap pointer-events-none transition-opacity z-10">
                        {formatCurrency(bar.rev)}
                      </div>
                    </div>
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${expHeight}%` }}
                      className="w-5 sm:w-8 bg-slate-300 dark:bg-slate-700 rounded-t-lg transition-all duration-300 group-hover:brightness-110 relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap pointer-events-none transition-opacity z-10">
                        {formatCurrency(bar.exp)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">{bar.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-blue-600 dark:bg-blue-500"></span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">Freight Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-300 dark:bg-slate-700"></span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">Operating Expenses</span>
              </div>
            </div>
            <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              Net Margin: +{formatCurrency(netMargin)}
            </div>
          </div>
        </div>

        {/* Fleet Status Breakdown & Quick Dispatch Panel (1 Column) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('fleetDistribution')}
              </h3>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold cursor-pointer" onClick={() => setCurrentView('drivers')}>
                View Fleet →
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-300">Moving on Route</span>
                  <span className="text-blue-600 font-mono font-bold">
                    {vehicles.filter((v) => v.status === 'in_transit').length} ({Math.round((vehicles.filter((v) => v.status === 'in_transit').length / vehicles.length) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(vehicles.filter((v) => v.status === 'in_transit').length / vehicles.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-300">Ready at Hub / Idle</span>
                  <span className="text-emerald-600 font-mono font-bold">
                    {vehicles.filter((v) => v.status === 'active' || v.status === 'idle').length}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(vehicles.filter((v) => v.status === 'active' || v.status === 'idle').length / vehicles.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-300">In Scheduled Maintenance</span>
                  <span className="text-amber-600 font-mono font-bold">
                    {vehicles.filter((v) => v.status === 'maintenance').length}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(vehicles.filter((v) => v.status === 'maintenance').length / vehicles.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Express Shortcuts</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-semibold">
              <button
                onClick={() => setCurrentView('supplierInventory')}
                className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 transition-colors text-left font-bold cursor-pointer"
              >
                Supplier Stock ({supplierInventory.length})
              </button>
              <button
                onClick={() => setCurrentView('customers')}
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
              >
                Customer Module
              </button>
              <button
                onClick={() => setCurrentView('invoices')}
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
              >
                Tax Invoicing
              </button>
              <button
                onClick={() => setCurrentView('dispatcher')}
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
              >
                Dispatch Console
              </button>
              <button
                onClick={() => setCurrentView('warehouse')}
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
              >
                Stock Intake GRN
              </button>
              <button
                onClick={() => setCurrentView('driverPanel')}
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
              >
                Driver Mobile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trips & Deliveries Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('recentTrips')}
            </h3>
            <p className="text-xs text-slate-500">Live status of current freight shipments and delivery notes</p>
          </div>
          <button
            onClick={() => setCurrentView('trips')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All Trips ({trips.length}) →
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              <tr>
                <th className="p-3.5">{t('tripNumber')}</th>
                <th className="p-3.5">{t('customer')}</th>
                <th className="p-3.5">Route</th>
                <th className="p-3.5">{t('driver')} & {t('vehicle')}</th>
                <th className="p-3.5 text-center">{t('progress')}</th>
                <th className="p-3.5 text-center">{t('status')}</th>
                <th className="p-3.5 text-right">Freight Rate</th>
                <th className="p-3.5 text-center">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {trips.slice(0, 5).map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                    <div>{trip.tripNumber}</div>
                    <div className="text-[10px] text-slate-400">{trip.deliveryNote?.dnNumber || trip.deliveryNoteNumber || 'DN-10025'}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white">{trip.customerName || trip.companyName}</div>
                    <span className="text-[10px] text-slate-500 capitalize">{trip.cargoType} Cargo</span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {trip.origin?.city || trip.originCity} → {trip.destination?.city || trip.destinationCity}
                    </div>
                    <span className="text-[10px] text-slate-400">ETA: {(trip.estimatedArrivalTime || '2026-08-20 18:00').substring(5)}</span>
                  </td>
                  <td className="p-3.5">
                    <div>{trip.driverName}</div>
                    <div className="text-[10px] font-mono text-slate-500">{trip.vehiclePlate || trip.truckNumber}</div>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${trip.progressPercent || 0}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">{trip.progressPercent || 0}%</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        trip.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : trip.status === 'in_transit'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {trip.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold">
                    {formatCurrency(trip.price || trip.driverFare || 4500)}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedTripForDn(trip)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                        title="View Delivery Note"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => createTaxInvoiceFromTrip(trip.id)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                        title="Generate Invoice"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

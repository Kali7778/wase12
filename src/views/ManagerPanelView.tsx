import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Trip } from '../types';
import { formatCurrency } from '../utils/i18n';
import { ManagerTripControlModal } from '../components/ManagerTripControlModal';
import { LogisticsOperationsTable } from '../components/LogisticsOperationsTable';
import {
  Truck,
  Boxes,
  Users,
  Compass,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileCheck,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Check,
  X,
  FileText,
  History,
  Plus,
  Edit3,
  RefreshCw,
  Search
} from 'lucide-react';

export const ManagerPanelView: React.FC = () => {
  const {
    trips,
    drivers,
    vehicles,
    warehouseItems,
    saleOrders,
    expenses,
    inboundDeliveryNotes,
    approvalRequests,
    processApprovalDecision,
    getDriverTotalTripAmount,
    setSelectedTripForDn,
    setSelectedInboundDn,
    setCurrentView,
    activeRole,
  } = useApp();

  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [activeTab, setActiveTab] = useState<'overview' | 'trip_control' | 'slips' | 'inventory' | 'fleet' | 'approvals'>('overview');

  // Manager Trip Modal State
  const [showTripModal, setShowTripModal] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [tripModalMode, setTripModalMode] = useState<'edit' | 'post_delivery'>('edit');
  const [tripSearch, setTripSearch] = useState('');
  const [tripStatusFilter, setTripStatusFilter] = useState('ALL');

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchSearch =
        tripSearch === '' ||
        t.tripNumber.toLowerCase().includes(tripSearch.toLowerCase()) ||
        (t.dnNumber && t.dnNumber.toLowerCase().includes(tripSearch.toLowerCase())) ||
        t.driverName.toLowerCase().includes(tripSearch.toLowerCase()) ||
        t.vehiclePlate.toLowerCase().includes(tripSearch.toLowerCase()) ||
        t.customerName.toLowerCase().includes(tripSearch.toLowerCase()) ||
        t.origin.city.toLowerCase().includes(tripSearch.toLowerCase()) ||
        t.destination.city.toLowerCase().includes(tripSearch.toLowerCase());

      const matchStatus = tripStatusFilter === 'ALL' || t.status === tripStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [trips, tripSearch, tripStatusFilter]);

  // Metrics Calculation
  const activeTrips = trips.filter((t) => t.status === 'in_transit');
  const pendingSlips = trips.filter((t) => t.slipStatus === 'pending');
  const pendingInboundSlips = inboundDeliveryNotes.filter((dn) => dn.slipStatus === 'pending');
  const totalPendingSlips = pendingSlips.length + pendingInboundSlips.length;

  const pendingManagerApprovals = approvalRequests.filter(
    (r) => r.status === 'pending' && (r.requiredTier === 'manager' || activeRole === 'manager')
  );

  // TLB & TLB SP tracking
  const tlbItem = warehouseItems.find((i) => i.sku === 'TLB-STD-100' || i.name.includes('TLB ('));
  const tlbSpItem = warehouseItems.find((i) => i.sku === 'TLB-SP-200' || i.name.includes('TLB SP'));

  // Revenue & Profit/Loss for Period
  const revenueTotal = saleOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netMargin = revenueTotal - expenseTotal;

  return (
    <div id="manager-panel-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                OPERATIONS MANAGER
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Daily Operational Command
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Day-to-day execution control: Live dispatch monitoring, driver status, TLB silo flow, pending delivery slips review, and operational P&L.
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700 self-start md:self-auto text-xs">
            <button
              onClick={() => setReportPeriod('daily')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                reportPeriod === 'daily' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Daily Control
            </button>
            <button
              onClick={() => setReportPeriod('weekly')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                reportPeriod === 'weekly' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Weekly Rollup
            </button>
            <button
              onClick={() => setReportPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                reportPeriod === 'monthly' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Summary
            </button>
          </div>
        </div>

        {/* Manager KPIs Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 font-medium">Active Trips on Route</span>
            <div className="text-xl font-black text-white mt-0.5">{activeTrips.length} Fleet En Route</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 font-medium">Pending Delivery Slips</span>
            <div className="text-xl font-black text-amber-400 mt-0.5">{totalPendingSlips} Review Needed</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 font-medium">TLB Silo Stock</span>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              {tlbItem ? `${tlbItem.quantityOnHand} ${tlbItem.unit || 'Tons'}` : '420 Tons'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 font-medium">Operational Net Margin</span>
            <div className={`text-xl font-black mt-0.5 ${netMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netMargin.toLocaleString()} SAR
            </div>
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Daily Operations & Silos
        </button>
        <button
          onClick={() => setActiveTab('trip_control')}
          className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'trip_control'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
          <span>Logistics &amp; Operations (Admin Control)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-mono">
            {trips.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('slips')}
          className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'slips'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>Pending Slips Review</span>
          {totalPendingSlips > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-mono">
              {totalPendingSlips}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'approvals'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>Manager Approvals</span>
          {pendingManagerApprovals.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500 text-white font-mono">
              {pendingManagerApprovals.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Product Silos: TLB & TLB SP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TLB Standard */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      TLB (Truck Load Bulk - Standard)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">Code: TLB-BULK-STD • Silo Bay A-01</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Bulk Cement / Gypsum
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs mb-4 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-sans">On Hand</span>
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {tlbItem?.quantityOnHand || 520} Tons
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Allocated</span>
                  <div className="text-base font-black text-amber-500">
                    {tlbItem?.allocatedQuantity || 120} Tons
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Available</span>
                  <div className="text-base font-black text-emerald-500">
                    {(tlbItem?.quantityOnHand || 520) - (tlbItem?.allocatedQuantity || 120)} Tons
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Unit Price: 185.00 SAR/Ton</span>
                <button
                  onClick={() => setCurrentView('warehouse')}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  Manage Silo Inventory <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* TLB SP Special Performance */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      TLB SP (Special Performance)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">Code: TLB-BULK-SP • Silo Bay B-05</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Polymer Reinforced
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs mb-4 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-sans">On Hand</span>
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {tlbSpItem?.quantityOnHand || 280} Tons
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Allocated</span>
                  <div className="text-base font-black text-amber-500">
                    {tlbSpItem?.allocatedQuantity || 80} Tons
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Available</span>
                  <div className="text-base font-black text-emerald-500">
                    {(tlbSpItem?.quantityOnHand || 280) - (tlbSpItem?.allocatedQuantity || 80)} Tons
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Unit Price: 245.00 SAR/Ton</span>
                <button
                  onClick={() => setCurrentView('warehouse')}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  Manage Silo Inventory <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Fleet Activity & Dispatcher Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Live Dispatch Stream */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Active Dispatcher & Driver Operations
                  </h3>
                </div>
                <button
                  onClick={() => setCurrentView('dispatcher')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Open Dispatch Console
                </button>
              </div>

              <div className="space-y-3">
                {trips.slice(0, 4).map((trip) => (
                  <div
                    key={trip.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${trip.status === 'in_transit' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'}`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{trip.tripNumber}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {trip.vehiclePlate}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Driver: {trip.driverName} • Route: {trip.origin?.city || trip.origin?.name || 'Riyadh'} → {trip.destination?.city || trip.destination?.name || 'Dammam'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        trip.status === 'in_transit' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {trip.status.replace('_', ' ')}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">Cargo: {trip.cargoType || trip.deliveryNote?.cargoDescription || 'Bulk Cargo'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Profit & Loss Snapshot */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Operational Financial Summary
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-500">Gross Sales Revenue:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {revenueTotal.toLocaleString()} SAR
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-500">Operating Expenses:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                      -{expenseTotal.toLocaleString()} SAR
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">Net Operational Margin:</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                      {netMargin.toLocaleString()} SAR
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Audited against Master Ledger records.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PENDING SLIPS */}
      {activeTab === 'slips' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pending Delivery Slips & POD Review ({totalPendingSlips})
              </h3>
              <p className="text-xs text-slate-500">
                Driver and inbound scanned slips awaiting manager verification and clearance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingSlips.map((trip) => (
              <div
                key={trip.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {trip.tripNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Slip Pending Review
                  </span>
                </div>

                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div><strong>Customer:</strong> {trip.customerName || trip.companyName || 'Customer'}</div>
                  <div><strong>Driver:</strong> {trip.driverName} ({trip.vehiclePlate})</div>
                  <div><strong>Cargo:</strong> {trip.cargoType || 'Bulk'} • {trip.quantity ? `${trip.quantity} ${trip.uom || 'Tons'}` : '30 Tons'}</div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedTripForDn(trip)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    View Slip & Barcode
                  </button>
                </div>
              </div>
            ))}

            {pendingInboundSlips.map((dn) => (
              <div
                key={dn.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {dn.dnNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Inbound DN Pending
                  </span>
                </div>

                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div><strong>Supplier/Company:</strong> {dn.companyName}</div>
                  <div><strong>Item:</strong> {dn.itemName} ({dn.quantity} {dn.uom})</div>
                  <div><strong>Location:</strong> {dn.warehouseLocation}</div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedInboundDn(dn)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Inspect Barcode Slip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: LOGISTICS & OPERATIONS (ADMIN CONTROL) */}
      {activeTab === 'trip_control' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Logistics &amp; Operations Control Center
                </h3>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                Inspect, modify, duplicate, delete, and trace complete audit histories for all logistics operations. All deletions and edits are preserved in the immutable Master Audit Ledger.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTripToEdit(null);
                  setTripModalMode('post_delivery');
                  setShowTripModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <History className="w-4 h-4" />
                <span>Add Missing Trip (After Delivery)</span>
              </button>
            </div>
          </div>

          {/* Dedicated Logistics & Operations Table with View / Edit / Delete / Duplicate / History */}
          <LogisticsOperationsTable
            onAddNewTrip={() => {
              setTripToEdit(null);
              setTripModalMode('post_delivery');
              setShowTripModal(true);
            }}
          />
        </div>
      )}

      {/* TAB: MANAGER APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Manager-Level Operational Approvals
              </h3>
              <p className="text-xs text-slate-500">
                Authorized items within Manager Tier scope (Cycle counts, re-routes, routine slip waivers).
              </p>
            </div>
            <button
              onClick={() => setCurrentView('approvalCenter')}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Open Full Approval Center
            </button>
          </div>

          <div className="space-y-3">
            {pendingManagerApprovals.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                No pending manager authorizations.
              </div>
            ) : (
              pendingManagerApprovals.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{req.title}</span>
                      <span className="font-mono text-[10px] text-slate-400">({req.id})</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">{req.description}</p>
                    <div className="text-[10px] text-slate-400">
                      Requested by {req.requestedBy} • {req.requestedAt}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => processApprovalDecision(req.id, 'rejected', 'Rejected by Operations Manager')}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold cursor-pointer hover:bg-rose-100"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => processApprovalDecision(req.id, 'approved', 'Approved by Operations Manager')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer hover:bg-emerald-700 shadow-xs shadow-emerald-600/30"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal instance */}
      {showTripModal && (
        <ManagerTripControlModal
          isOpen={showTripModal}
          onClose={() => {
            setShowTripModal(false);
            setTripToEdit(null);
          }}
          trip={tripToEdit}
          initialMode={tripModalMode}
        />
      )}
    </div>
  );
};

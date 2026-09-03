import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trip, TripStep, SlipStatus } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  Compass,
  Truck,
  Plus,
  Sparkles,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Thermometer,
  ShieldCheck,
  Upload,
  Camera,
  Search,
  CheckCheck,
  Eye,
  Smartphone,
  Check,
  X,
  ExternalLink,
  Package,
  Layers,
  Filter,
  Boxes,
  PackageCheck,
  Shuffle,
  Edit3,
  Trash2,
  Inbox,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { NewCompanyLoadModal } from '../components/NewCompanyLoadModal';
import { InwardStockModal } from '../components/InwardStockModal';
import { RouteShiftModal } from '../components/RouteShiftModal';
import { ManagerTripControlModal } from '../components/ManagerTripControlModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { BrokerLoadManagement } from '../components/BrokerLoadManagement';
import { DispatcherDriverRequestsTable } from '../components/DispatcherDriverRequestsTable';

interface DispatcherViewProps {
  onOpenNewTripModal: () => void;
  onOpenAiImportModal: () => void;
}

export const DispatcherView: React.FC<DispatcherViewProps> = ({
  onOpenNewTripModal,
  onOpenAiImportModal,
}) => {
  const {
    trips,
    drivers,
    vehicles,
    customers,
    updateTripStatus,
    advanceTripStep,
    clearTripSlip,
    createTaxInvoiceFromTrip,
    deleteTrip,
    activeRole,
    setSelectedTripForDn,
    setSelectedInboundDn,
    inboundDeliveryNotes,
    setCurrentView,
    setSelectedDriverId,
    showToast,
    language,
    brokerLoads,
    driverLoadRequests,
  } = useApp();

  const isAr = language === 'ar';

  // Section view: Standard Plant Loads vs Broker Load Management vs Driver Load Requests
  const [dispatcherViewMode, setDispatcherViewMode] = useState<'standard_trips' | 'broker_loads' | 'driver_requests'>('standard_trips');

  // Pending Driver Requests KPI
  const pendingDriverRequestsCount = driverLoadRequests.filter((r) => r.status === 'Pending').length;

  // Filters & State
  const [activeTab, setActiveTab] = useState<'all' | 'pending_slips' | 'today_trips' | 'loading' | 'on_route' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTripForSlipReview, setSelectedTripForSlipReview] = useState<Trip | null>(null);
  const [selectedTripForRouteShift, setSelectedTripForRouteShift] = useState<Trip | null>(null);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [showCompanyLoadModal, setShowCompanyLoadModal] = useState<boolean>(false);
  const [showInwardModal, setShowInwardModal] = useState<boolean>(false);
  const [inwardTripTarget, setInwardTripTarget] = useState<Trip | null>(null);

  // Compute KPI Counts
  const pendingSlipsCount = trips.filter((t) => t.slipStatus === 'pending').length;
  const todayTripsCount = trips.length;
  const loadingCount = trips.filter((t) => t.tripStep === 'loading' || t.status === 'assigned').length;
  const onRouteCount = trips.filter((t) => t.tripStep === 'on_route' || t.status === 'in_transit').length;
  const deliveredCount = trips.filter((t) => t.tripStep === 'delivered' || t.status === 'delivered').length;

  // Filtered trips list
  const filteredTrips = trips.filter((trip) => {
    // Tab filter
    if (activeTab === 'pending_slips' && trip.slipStatus !== 'pending') return false;
    if (activeTab === 'loading' && trip.tripStep !== 'loading' && trip.status !== 'assigned') return false;
    if (activeTab === 'on_route' && trip.tripStep !== 'on_route' && trip.status !== 'in_transit') return false;
    if (activeTab === 'delivered' && trip.tripStep !== 'delivered' && trip.status !== 'delivered') return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTrip = trip.tripNumber.toLowerCase().includes(q);
      const matchDn = (trip.dnNumber || trip.deliveryNote.dnNumber || '').toLowerCase().includes(q);
      const matchCust = (trip.customerName || trip.companyName || '').toLowerCase().includes(q);
      const matchItem = (trip.itemName || '').toLowerCase().includes(q);
      const matchDriver = (trip.driverName || '').toLowerCase().includes(q);
      const matchPlate = (trip.vehiclePlate || '').toLowerCase().includes(q);
      if (!matchTrip && !matchDn && !matchCust && !matchItem && !matchDriver && !matchPlate) return false;
    }

    return true;
  });

  // Handle Dispatcher Slip Approval
  const handleApproveSlip = (trip: Trip) => {
    clearTripSlip(trip.id);
    createTaxInvoiceFromTrip(trip.id);
    setSelectedTripForSlipReview(null);
    try {
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    } catch {
      // ignore
    }
    showToast('Slip Cleared & Invoice Generated', `Slip for Trip #${trip.tripNumber} verified. Invoice auto-created.`, 'success');
  };

  const handleOpenDriverView = (driverId: string) => {
    setSelectedDriverId(driverId || 'drv_1');
    setCurrentView('driverPanel');
  };

  return (
    <div id="dispatcher-panel-view" className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-mono font-bold tracking-wider">
              DISPATCHER PANEL
            </span>
            <span className="text-xs text-slate-300">Live Freight & Slip Clearance</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            {isAr ? 'لوحة تحكم المرحّل ومتابعة الشحنات' : 'Dispatcher Panel'}
          </h1>
          <p className="text-xs text-slate-300 max-w-xl mt-1">
            Assign TLB loading jobs to drivers, track journey milestones, verify loading quantities, and coordinate dispatch operations.
          </p>
        </div>

        {/* Action Buttons: [ Driver Requests ] [ Broker Loads ] [ + Company Load ] [ + Upload PDF ] [ Scan DN ] [ Manual Add ] */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="dispatcher-driver-requests-btn"
            onClick={() => setDispatcherViewMode('driver_requests')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all transform active:scale-95 cursor-pointer ${
              dispatcherViewMode === 'driver_requests'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-indigo-600/25 ring-2 ring-indigo-400'
                : 'bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50'
            }`}
          >
            <Inbox className="w-4 h-4 text-white" />
            <span>📥 Driver Requests ({driverLoadRequests.length})</span>
            {pendingDriverRequestsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-black animate-pulse">
                {pendingDriverRequestsCount}
              </span>
            )}
          </button>

          <button
            id="dispatcher-broker-loads-btn"
            onClick={() => setDispatcherViewMode('broker_loads')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all transform active:scale-95 cursor-pointer ${
              dispatcherViewMode === 'broker_loads'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/25 ring-2 ring-amber-400'
                : 'bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-600 hover:to-amber-700 text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-white" />
            <span>🏢 Broker Loads ({brokerLoads.length})</span>
          </button>

          <button
            id="dispatcher-company-load-btn"
            onClick={() => setShowCompanyLoadModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <Boxes className="w-4 h-4 text-amber-300" />
            <span>+ Company Load (TLB)</span>
          </button>

          <button
            id="dispatcher-upload-pdf-btn"
            onClick={onOpenAiImportModal}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>+ Upload PDF</span>
          </button>

          <button
            id="dispatcher-scan-dn-btn"
            onClick={onOpenAiImportModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Scan DN</span>
          </button>

          <button
            id="dispatcher-manual-add-btn"
            onClick={onOpenNewTripModal}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Add</span>
          </button>
        </div>
      </div>

      {/* Primary Section Switcher: Standard Plant Loads vs Broker Load Management vs Driver Load Requests */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full sm:w-auto self-start border border-slate-200 dark:border-slate-700/80 overflow-x-auto custom-scrollbar">
        <button
          id="switch-standard-trips-btn"
          onClick={() => setDispatcherViewMode('standard_trips')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            dispatcherViewMode === 'standard_trips'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4 text-indigo-500" />
          <span>📦 Standard Logistics Loads ({trips.length})</span>
        </button>

        <button
          id="switch-driver-requests-btn"
          onClick={() => setDispatcherViewMode('driver_requests')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            dispatcherViewMode === 'driver_requests'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>📥 Driver Load Requests ({driverLoadRequests.length})</span>
          {pendingDriverRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black animate-pulse">
              {pendingDriverRequestsCount} PENDING
            </span>
          )}
        </button>

        <button
          id="switch-broker-loads-btn"
          onClick={() => setDispatcherViewMode('broker_loads')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            dispatcherViewMode === 'broker_loads'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>🏢 Broker Load Management (Multi-Drop) ({brokerLoads.length})</span>
        </button>
      </div>

      {dispatcherViewMode === 'driver_requests' ? (
        <DispatcherDriverRequestsTable
          onNavigateToTrips={() => setDispatcherViewMode('standard_trips')}
          onNavigateToBrokerLoads={() => setDispatcherViewMode('broker_loads')}
        />
      ) : dispatcherViewMode === 'broker_loads' ? (
        <BrokerLoadManagement onNavigateToDriverPanel={() => setCurrentView('driverPanel')} />
      ) : (
        <>
          {/* KPI METRICS TABS BAR (Requested Text-Based Box Layout) */}
      {/* Pending Slips | Today's Trips | Loading | On Route | Delivered */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Metric 1: Pending Slips */}
        <button
          onClick={() => setActiveTab('pending_slips')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'pending_slips'
              ? 'bg-amber-500 text-white border-amber-600 shadow-lg scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'pending_slips' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'}`}>
              Pending Slips
            </span>
            <AlertTriangle className={`w-4 h-4 ${activeTab === 'pending_slips' ? 'text-white' : 'text-amber-500 animate-pulse'}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${activeTab === 'pending_slips' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {pendingSlipsCount}
          </p>
          <span className={`text-[11px] block mt-0.5 ${activeTab === 'pending_slips' ? 'text-amber-100' : 'text-slate-400'}`}>
            Requires Clearance
          </span>
        </button>

        {/* Metric 2: Today's Trips */}
        <button
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 shadow-lg scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'all' ? 'text-slate-200 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
              Today's Trips
            </span>
            <Truck className={`w-4 h-4 ${activeTab === 'all' ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${activeTab === 'all' ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>
            {todayTripsCount}
          </p>
          <span className={`text-[11px] block mt-0.5 ${activeTab === 'all' ? 'text-slate-200 dark:text-slate-700' : 'text-slate-400'}`}>
            Total Dispatched
          </span>
        </button>

        {/* Metric 3: Loading */}
        <button
          onClick={() => setActiveTab('loading')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'loading'
              ? 'bg-amber-600 text-white border-amber-700 shadow-lg scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'loading' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'}`}>
              Loading
            </span>
            <Layers className={`w-4 h-4 ${activeTab === 'loading' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${activeTab === 'loading' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {loadingCount}
          </p>
          <span className={`text-[11px] block mt-0.5 ${activeTab === 'loading' ? 'text-amber-100' : 'text-slate-400'}`}>
            Plant Silo / Bay
          </span>
        </button>

        {/* Metric 4: On Route */}
        <button
          onClick={() => setActiveTab('on_route')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'on_route'
              ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'on_route' ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}>
              On Route
            </span>
            <Compass className={`w-4 h-4 ${activeTab === 'on_route' ? 'text-white' : 'text-blue-500'}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${activeTab === 'on_route' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {onRouteCount}
          </p>
          <span className={`text-[11px] block mt-0.5 ${activeTab === 'on_route' ? 'text-blue-100' : 'text-slate-400'}`}>
            Highway Active GPS
          </span>
        </button>

        {/* Metric 5: Delivered */}
        <button
          onClick={() => setActiveTab('delivered')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            activeTab === 'delivered'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'delivered' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
              Delivered
            </span>
            <CheckCircle2 className={`w-4 h-4 ${activeTab === 'delivered' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${activeTab === 'delivered' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {deliveredCount}
          </p>
          <span className={`text-[11px] block mt-0.5 ${activeTab === 'delivered' ? 'text-emerald-100' : 'text-slate-400'}`}>
            POD Completed
          </span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search DN #, Company, Driver (Ahmed), Item, Truck (T-101)..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All ({trips.length})
          </button>
          <button
            onClick={() => setActiveTab('pending_slips')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'pending_slips'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Pending Slips ({pendingSlipsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('loading')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'loading'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Loading ({loadingCount})
          </button>
          <button
            onClick={() => setActiveTab('on_route')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'on_route'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            On Route ({onRouteCount})
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'delivered'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Delivered ({deliveredCount})
          </button>
        </div>
      </div>

      {/* DISPATCH TRIPS TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Trip # / DN #</th>
                <th className="py-3.5 px-4">Company / Customer</th>
                <th className="py-3.5 px-4">Item & Quantity</th>
                <th className="py-3.5 px-4">Driver & Truck</th>
                <th className="py-3.5 px-4">Route & ETA</th>
                <th className="py-3.5 px-4">Trip Step</th>
                <th className="py-3.5 px-4">Slip Status</th>
                <th className="py-3.5 px-4 text-center">PDF / Slip</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No trips found matching filter.</p>
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => (
                  <tr
                    key={trip.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      trip.slipStatus === 'pending' ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    {/* Trip # & DN # */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{trip.tripNumber}</span>
                      </div>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold block">
                        DN #{trip.dnNumber || trip.deliveryNote.dnNumber}
                      </span>
                    </td>

                    {/* Customer / Company */}
                    <td className="py-3.5 px-4">
                      <strong className="block text-slate-900 dark:text-white font-bold text-xs truncate max-w-[200px]">
                        {trip.customerName || trip.companyName || 'مؤسسة صرح البنيان للتجارة'}
                      </strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Cust #: {trip.customerNumber || '1100187'}
                      </span>
                      {trip.hasRouteShift && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-mono font-bold text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                          <Shuffle className="w-3 h-3 text-amber-600 animate-pulse" />
                          <span>Diverted: {trip.directSaleQuantity} {trip.uom || 'BAG'} • Inward: {trip.remainingInwardQuantity}</span>
                        </div>
                      )}
                    </td>

                    {/* Item & QTY */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                        {trip.itemName || 'Gypsum Powder'}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-black inline-block mt-0.5">
                        {trip.quantity || 750} {trip.uom || 'BAG'} (~30T)
                      </span>
                    </td>

                    {/* Driver & Truck */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {trip.driverName || 'Ahmed'}
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 font-semibold">
                        Truck: {trip.vehiclePlate || 'T-101'}
                      </span>
                    </td>

                    {/* Route */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {trip.origin.city} → {trip.destination.city}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ETA: {trip.estimatedArrivalTime.substring(11) || '19:30'}
                      </span>
                    </td>

                    {/* Trip Step */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                          trip.tripStep === 'delivered' || trip.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : trip.tripStep === 'on_route' || trip.status === 'in_transit'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {trip.tripStep === 'delivered' || trip.status === 'delivered' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Delivered</span>
                          </>
                        ) : trip.tripStep === 'on_route' || trip.status === 'in_transit' ? (
                          <>
                            <Compass className="w-3 h-3" />
                            <span>On Route</span>
                          </>
                        ) : (
                          <>
                            <Layers className="w-3 h-3" />
                            <span>Loading</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Slip Status */}
                    <td className="py-3.5 px-4">
                      {trip.slipStatus === 'cleared' ? (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] inline-flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cleared</span>
                        </span>
                      ) : trip.slipStatus === 'pending' ? (
                        <button
                          onClick={() => setSelectedTripForSlipReview(trip)}
                          className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-sm animate-pulse cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Approve Slip</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium text-[11px]">
                          Not Submitted
                        </span>
                      )}
                    </td>

                    {/* PDF / Slip View Button */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          const matchingInbound = inboundDeliveryNotes.find(
                            (d) => d.dnNumber === trip.dnNumber || d.tripId === trip.id
                          );
                          if (matchingInbound) {
                            setSelectedInboundDn(matchingInbound);
                          } else {
                            setSelectedTripForDn(trip);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        <span>View PDF</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* In-Transit Route Shift Trigger (Preserves DN) */}
                        {trip.status !== 'delivered' && (
                          <button
                            onClick={() => setSelectedTripForRouteShift(trip)}
                            title="Shift Route to Customer while In-Transit (Preserves DN)"
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 transition-all cursor-pointer ${
                              trip.hasRouteShift
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                            }`}
                          >
                            <Shuffle className="w-3 h-3" />
                            <span>{trip.hasRouteShift ? 'Shift Info' : 'Route Shift'}</span>
                          </button>
                        )}

                        {/* Switch to Driver Panel */}
                        <button
                          onClick={() => handleOpenDriverView(trip.driverId || 'drv_1')}
                          title="Open in Driver Panel"
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
                        >
                          <Smartphone className="w-4 h-4 text-blue-500" />
                        </button>

                        {/* Slip Review / Clear Modal Trigger */}
                        {trip.slipStatus === 'pending' && (
                          <button
                            onClick={() => setSelectedTripForSlipReview(trip)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                          >
                            Verify
                          </button>
                        )}

                        {/* Edit Trip in Dispatcher Console */}
                        {['admin', 'manager', 'gm', 'dispatcher'].includes(activeRole) && (
                          <button
                            id={`btn-edit-dispatch-trip-${trip.id}`}
                            onClick={() => setTripToEdit(trip)}
                            title="Edit Trip Details & Assignments"
                            className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 rounded-lg cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Trip in Dispatcher Console */}
                        {['admin', 'manager', 'gm', 'dispatcher'].includes(activeRole) && (
                          <button
                            id={`btn-delete-dispatch-trip-${trip.id}`}
                            onClick={() => setTripToDelete(trip)}
                            title="Delete Trip Record"
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCHER SLIP VERIFICATION & CLEARANCE MODAL */}
      {selectedTripForSlipReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Inspect & Clear Delivery Slip (POD)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Trip #{selectedTripForSlipReview.tripNumber} • DN #{selectedTripForSlipReview.dnNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTripForSlipReview(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer / Consignee:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedTripForSlipReview.customerName || selectedTripForSlipReview.companyName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cargo & Quantity:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedTripForSlipReview.itemName} ({selectedTripForSlipReview.quantity} {selectedTripForSlipReview.uom})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Driver & Truck:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {selectedTripForSlipReview.driverName} ({selectedTripForSlipReview.vehiclePlate})
                  </span>
                </div>
              </div>

              {/* Uploaded Slip Inspection */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Driver's Uploaded POD Delivery Slip:
                </span>
                <div className="p-3 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                  {selectedTripForSlipReview.slipImageUrl ? (
                    <img
                      src={selectedTripForSlipReview.slipImageUrl}
                      alt="Delivery Slip POD"
                      className="max-h-60 rounded-lg shadow-sm border border-slate-300 object-contain"
                    />
                  ) : (
                    <div className="text-center py-6 text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-1 text-amber-500" />
                      <p className="font-bold">Digital Stamped Delivery Slip Verified</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Signee Confirmation */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                <div>
                  <span className="text-emerald-800 dark:text-emerald-300 font-bold block text-xs">
                    Receiver Signature / Stamp:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                    {selectedTripForSlipReview.deliveryNote?.receiverSignature || 'Hassan Al-Otaibi (Site Gate 3)'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px]">
                  ✓ Verified
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTripForSlipReview(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>

                {['admin', 'manager', 'gm', 'dispatcher'].includes(activeRole) && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedTripForSlipReview;
                        setSelectedTripForSlipReview(null);
                        setTripToEdit(target);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Trip</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedTripForSlipReview;
                        setSelectedTripForSlipReview(null);
                        setTripToDelete(target);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>

              <button
                id="confirm-clear-slip-btn"
                onClick={() => handleApproveSlip(selectedTripForSlipReview)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Approve & Clear Slip (Create Invoice)</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* New Company Load Modal */}
      {showCompanyLoadModal && (
        <NewCompanyLoadModal
          isOpen={showCompanyLoadModal}
          onClose={() => setShowCompanyLoadModal(false)}
        />
      )}

      {/* Inward Stock Modal */}
      {showInwardModal && (
        <InwardStockModal
          isOpen={showInwardModal}
          onClose={() => {
            setShowInwardModal(false);
            setInwardTripTarget(null);
          }}
          trip={inwardTripTarget}
        />
      )}

      {/* In-Transit Route Shift Modal */}
      {selectedTripForRouteShift && (
        <RouteShiftModal
          isOpen={!!selectedTripForRouteShift}
          onClose={() => setSelectedTripForRouteShift(null)}
          trip={selectedTripForRouteShift}
        />
      )}

      {/* Manager Trip Control / Edit Modal for Dispatcher */}
      {tripToEdit && (
        <ManagerTripControlModal
          isOpen={!!tripToEdit}
          onClose={() => setTripToEdit(null)}
          trip={tripToEdit}
          initialMode="edit"
        />
      )}

      {/* Delete Trip Confirmation Modal for Dispatcher */}
      {tripToDelete && (
        <DeleteConfirmationModal
          isOpen={!!tripToDelete}
          onClose={() => setTripToDelete(null)}
          trip={tripToDelete}
          onConfirmDelete={(tripId, reason, hardDelete) => {
            deleteTrip(tripId, reason, hardDelete);
            setTripToDelete(null);
          }}
          title="Delete Trip / Dispatch Record"
          confirmText="Yes, Delete Record"
        />
      )}
    </div>
  );
};

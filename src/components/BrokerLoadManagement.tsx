import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrokerLoad, BrokerDropLocation, BrokerLoadStatus, BrokerDropStatus } from '../types';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Truck,
  User,
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  Printer,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  Sparkles,
  ArrowRight,
  Eye,
  Check,
  PackageCheck,
  Phone,
  Hash,
  Share2
} from 'lucide-react';
import { BrokerLoadModal } from './BrokerLoadModal';
import { BrokerAssignDriverTruckModal } from './BrokerAssignDriverTruckModal';
import { BrokerAddDropModal } from './BrokerAddDropModal';
import { BrokerMarkDropModal } from './BrokerMarkDropModal';
import { BrokerPrintDetailsModal } from './BrokerPrintDetailsModal';
import { BrokerPdfViewModal } from './BrokerPdfViewModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface BrokerLoadManagementProps {
  onNavigateToDriverPanel?: () => void;
}

export const BrokerLoadManagement: React.FC<BrokerLoadManagementProps> = ({
  onNavigateToDriverPanel,
}) => {
  const {
    brokerLoads,
    deleteBrokerLoad,
    markBrokerLoadDelivered,
    updateBrokerDropStatus,
    showToast,
    setCurrentView,
    setSelectedDriverId,
    language,
  } = useApp();

  const isAr = language === 'ar';

  // Local UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | BrokerLoadStatus>('All');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({
    brk_001: true, // Default expand first row to highlight multi-drop table
  });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loadToEdit, setLoadToEdit] = useState<BrokerLoad | null>(null);
  const [loadToAssign, setLoadToAssign] = useState<BrokerLoad | null>(null);
  const [loadToAddDrop, setLoadToAddDrop] = useState<BrokerLoad | null>(null);
  const [dropToMarkDelivered, setDropToMarkDelivered] = useState<{
    load: BrokerLoad;
    drop: BrokerDropLocation;
  } | null>(null);
  const [loadToPrint, setLoadToPrint] = useState<BrokerLoad | null>(null);
  const [loadToViewPdf, setLoadToViewPdf] = useState<BrokerLoad | null>(null);
  const [loadToDelete, setLoadToDelete] = useState<BrokerLoad | null>(null);

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filtered loads
  const filteredLoads = brokerLoads.filter((load) => {
    // Status filter
    if (statusFilter !== 'All' && load.loadStatus !== statusFilter) {
      return false;
    }

    // Text search
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchDn = load.dnNumber.toLowerCase().includes(q);
    const matchBroker = load.brokerName.toLowerCase().includes(q);
    const matchMaterial = load.materialItem.toLowerCase().includes(q);
    const matchPickup = load.pickupLocation.toLowerCase().includes(q);
    const matchDriver = (load.assignedDriverName || '').toLowerCase().includes(q);
    const matchTruck = (load.assignedTruckPlate || '').toLowerCase().includes(q) || (load.assignedTruckTlbNo || '').toLowerCase().includes(q);
    const matchDrops = (load.dropLocations || []).some((d) => d.dropLocation.toLowerCase().includes(q));

    return matchDn || matchBroker || matchMaterial || matchPickup || matchDriver || matchTruck || matchDrops;
  });

  // KPI Metrics Calculation
  const totalLoadsCount = brokerLoads.length;
  const pendingCount = brokerLoads.filter((l) => l.loadStatus === 'Pending').length;
  const assignedCount = brokerLoads.filter((l) => l.loadStatus === 'Assigned').length;
  const inTransitCount = brokerLoads.filter((l) => l.loadStatus === 'In Transit').length;
  const deliveredCount = brokerLoads.filter((l) => l.loadStatus === 'Delivered').length;
  const totalFreightSAR = brokerLoads.reduce((sum, l) => sum + (Number(l.freightAmount) || 0), 0);
  const totalCommissionSAR = brokerLoads.reduce((sum, l) => sum + (Number(l.brokerCommission) || 0), 0);

  // Quick switch driver and jump to Driver Panel
  const handleJumpToDriver = (driverId?: string) => {
    if (driverId) {
      setSelectedDriverId(driverId);
    }
    setCurrentView('driverPanel');
    showToast('Switched to Driver Panel', 'Viewing driver panel for real-time drop delivery.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/30 flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Dispatcher Operations
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
              Multi-Drop Enabled
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Broker Load Management</span>
            <span className="text-sm font-normal text-slate-300">(إدارة حمولات الوسطاء)</span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Independent management of commercial broker freights with multiple delivery stops, per-drop status progression, and live driver synchronization.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {/* Action: ➕ Add Broker Load */}
          <button
            id="btn-open-add-broker-load"
            onClick={() => {
              setLoadToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>➕ Add Broker Load</span>
          </button>

          {/* Action: 📄 Upload / View PDF */}
          <button
            id="btn-upload-scan-pdf"
            onClick={() => {
              if (brokerLoads.length > 0) {
                setLoadToViewPdf(brokerLoads[0]);
              } else {
                setLoadToEdit(null);
                setIsCreateModalOpen(true);
              }
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-purple-400" />
            <span>📄 Upload / View PDF</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Loads */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            <span>Total Loads</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalLoadsCount}</p>
          <span className="text-[10px] text-slate-400">All registered consignments</span>
        </div>

        {/* Card 2: Pending Assignment */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm space-y-1 ${
            statusFilter === 'Pending'
              ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase">
            <span className={statusFilter === 'Pending' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}>
              Pending
            </span>
            <Clock className={`w-4 h-4 ${statusFilter === 'Pending' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <p className={`text-2xl font-black ${statusFilter === 'Pending' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {pendingCount}
          </p>
          <span className={`text-[10px] ${statusFilter === 'Pending' ? 'text-amber-100' : 'text-slate-400'}`}>
            Awaiting Driver/Truck
          </span>
        </div>

        {/* Card 3: Assigned */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Assigned' ? 'All' : 'Assigned')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm space-y-1 ${
            statusFilter === 'Assigned'
              ? 'bg-blue-600 text-white border-blue-700 shadow-blue-600/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase">
            <span className={statusFilter === 'Assigned' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}>
              Assigned
            </span>
            <Truck className={`w-4 h-4 ${statusFilter === 'Assigned' ? 'text-white' : 'text-blue-500'}`} />
          </div>
          <p className={`text-2xl font-black ${statusFilter === 'Assigned' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {assignedCount}
          </p>
          <span className={`text-[10px] ${statusFilter === 'Assigned' ? 'text-blue-100' : 'text-slate-400'}`}>
            Ready for dispatch
          </span>
        </div>

        {/* Card 4: In Transit */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'In Transit' ? 'All' : 'In Transit')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm space-y-1 ${
            statusFilter === 'In Transit'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase">
            <span className={statusFilter === 'In Transit' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}>
              In Transit
            </span>
            <MapPin className={`w-4 h-4 ${statusFilter === 'In Transit' ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <p className={`text-2xl font-black ${statusFilter === 'In Transit' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {inTransitCount}
          </p>
          <span className={`text-[10px] ${statusFilter === 'In Transit' ? 'text-indigo-100' : 'text-slate-400'}`}>
            Active on road
          </span>
        </div>

        {/* Card 5: Delivered */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Delivered' ? 'All' : 'Delivered')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm space-y-1 ${
            statusFilter === 'Delivered'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase">
            <span className={statusFilter === 'Delivered' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}>
              Delivered
            </span>
            <CheckCircle2 className={`w-4 h-4 ${statusFilter === 'Delivered' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <p className={`text-2xl font-black ${statusFilter === 'Delivered' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {deliveredCount}
          </p>
          <span className={`text-[10px] ${statusFilter === 'Delivered' ? 'text-emerald-100' : 'text-slate-400'}`}>
            Completed &amp; Signed
          </span>
        </div>

        {/* Card 6: Total Freight Value */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            <span>Freight (SAR)</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {totalFreightSAR.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">
            Comm: {totalCommissionSAR.toLocaleString()} SAR
          </span>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            id="search-broker-loads-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search DN, Broker, Driver, Truck, Drop Location..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          <span className="text-xs text-slate-400 font-bold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {(['All', 'Pending', 'Assigned', 'In Transit', 'Delivered', 'Cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* 4. BROKER LOADS TABLE & MULTIPLE DROPS VIEW */}
      <div className="space-y-4">
        {filteredLoads.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Broker Loads Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                {searchQuery || statusFilter !== 'All'
                  ? 'No loads matched your search or status filter criteria.'
                  : 'Get started by creating your first multi-drop broker load.'}
              </p>
            </div>
            <button
              onClick={() => {
                setLoadToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black inline-flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Broker Load</span>
            </button>
          </div>
        ) : (
          filteredLoads.map((load) => {
            const isExpanded = !!expandedRows[load.id];
            const stopsCount = load.dropLocations?.length || 0;
            const deliveredStops = (load.dropLocations || []).filter((s) => s.status === 'Delivered').length;
            const progressPercent = stopsCount > 0 ? Math.round((deliveredStops / stopsCount) * 100) : 0;
            const totalQty = (load.dropLocations || []).reduce((sum, s) => sum + (Number(s.deliveryQty) || 0), 0);

            return (
              <div
                key={load.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Main Row Header */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Identification, Broker, Material */}
                    <div className="flex items-start gap-4">
                      {/* DN Badge */}
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono font-black text-sm border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-amber-500" />
                          {load.dnNumber}
                        </span>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {load.slipDate}
                        </div>
                      </div>

                      {/* Broker & Cargo */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-black text-slate-900 dark:text-white">
                            {load.brokerName}
                          </h2>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                              load.loadStatus === 'Delivered'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : load.loadStatus === 'In Transit'
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                : load.loadStatus === 'Assigned'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : load.loadStatus === 'Cancelled'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            ● {load.loadStatus}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {load.materialItem}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                            From: <strong className="text-slate-700 dark:text-slate-300">{load.pickupLocation}</strong>
                          </span>
                          <span>•</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {stopsCount} Stops ({totalQty.toLocaleString()} units)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Driver & Truck Assignment */}
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 min-w-[240px]">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          Fleet Assignment
                        </span>
                        {load.assignedDriverName ? (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-blue-500" />
                              <span>{load.assignedDriverName}</span>
                            </div>
                            <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">
                              {load.assignedTruckPlate || 'No Plate'} {load.assignedTruckTlbNo ? `(${load.assignedTruckTlbNo})` : ''}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-amber-600 dark:text-amber-400 font-bold block">
                              Unassigned
                            </span>
                            <button
                              id={`assign-btn-${load.id}`}
                              onClick={() => setLoadToAssign(load)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              Assign Driver
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Freight Values & Action Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3">
                      {/* Financial info */}
                      <div className="text-right sm:text-right pr-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Freight (SAR)</span>
                        <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                          {load.freightAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                          Comm: {load.brokerCommission.toLocaleString()} SAR
                        </span>
                      </div>

                      {/* Quick Action Icons Bar */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Action: 👤 Assign Driver / 🚛 Assign Truck */}
                        <button
                          onClick={() => setLoadToAssign(load)}
                          title="Assign Driver & Truck"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <Truck className="w-4 h-4" />
                        </button>

                        {/* Action: 📄 Upload / View PDF */}
                        <button
                          onClick={() => setLoadToViewPdf(load)}
                          title="View / Attach Delivery Slip PDF"
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            load.attachedPdfUrl
                              ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50 hover:text-purple-600'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Action: 🖨️ Print Load Details */}
                        <button
                          onClick={() => setLoadToPrint(load)}
                          title="Print Load Details"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Action: ✏️ Edit */}
                        <button
                          onClick={() => {
                            setLoadToEdit(load);
                            setIsCreateModalOpen(true);
                          }}
                          title="Edit Load"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 dark:hover:text-amber-400 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Action: 🗑️ Delete */}
                        <button
                          onClick={() => setLoadToDelete(load)}
                          title="Delete Load"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Toggle Expansion */}
                        <button
                          onClick={() => toggleRowExpansion(load.id)}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Stops' : 'View Stops'}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Drop Delivery Progress Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Delivery Stops Progress:</span>
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {deliveredStops} / {stopsCount} Stops Delivered ({progressPercent}%)
                        </strong>
                      </span>
                      {load.loadStatus !== 'Delivered' && (
                        <button
                          onClick={() => markBrokerLoadDelivered(load.id)}
                          className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark All Complete</span>
                        </button>
                      )}
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          progressPercent === 100
                            ? 'bg-emerald-500'
                            : progressPercent > 0
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* EXPANDED SECTION: MULTIPLE DROP LOCATIONS TABLE */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-500" />
                          <span>Delivery Stops Breakdown (محطات الإنزال والتفريغ)</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Each drop location is independently tracked: Pending → In Transit → Delivered
                        </p>
                      </div>

                      {/* Required Action: ➕ Add Drop Location */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          id={`add-drop-btn-${load.id}`}
                          onClick={() => setLoadToAddDrop(load)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>➕ Add Drop Location</span>
                        </button>

                        {load.assignedDriverId && (
                          <button
                            onClick={() => handleJumpToDriver(load.assignedDriverId)}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Open in Driver Panel</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Table of Drop Locations */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                            <th className="py-3 px-4 w-16 text-center">Stop</th>
                            <th className="py-3 px-4 min-w-[260px]">Drop Location</th>
                            <th className="py-3 px-4 w-32 text-right">Delivery Qty</th>
                            <th className="py-3 px-4 w-36 text-center">Status</th>
                            <th className="py-3 px-4 min-w-[200px]">Delivery Details / Recipient</th>
                            <th className="py-3 px-4 w-44 text-center">Update Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(load.dropLocations || []).map((stop, sIdx) => {
                            const isDelivered = stop.status === 'Delivered';
                            const isInTransit = stop.status === 'In Transit';

                            return (
                              <tr
                                key={stop.id}
                                className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                                  isDelivered ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                                }`}
                              >
                                {/* Stop # */}
                                <td className="py-3.5 px-4 text-center font-mono font-black text-slate-800 dark:text-slate-200">
                                  <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 inline-flex items-center justify-center text-xs font-bold shadow-inner">
                                    {stop.stopNumber || sIdx + 1}
                                  </span>
                                </td>

                                {/* Drop Location */}
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span>{stop.dropLocation}</span>
                                  </div>
                                </td>

                                {/* Delivery Qty */}
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                  <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                                    {stop.deliveryQty}
                                  </span>{' '}
                                  <span className="text-slate-500 text-[11px]">{stop.unit || 'BAG'}</span>
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-4 text-center">
                                  <span
                                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                      isDelivered
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                        : isInTransit
                                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                    }`}
                                  >
                                    ● {stop.status}
                                  </span>
                                </td>

                                {/* Recipient / Delivery Details */}
                                <td className="py-3.5 px-4">
                                  {isDelivered ? (
                                    <div className="space-y-0.5 text-[11px]">
                                      <div className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Delivered: {stop.deliveredAt || 'Confirmed'}</span>
                                      </div>
                                      {stop.recipientName && (
                                        <div className="text-slate-600 dark:text-slate-300">
                                          Receiver: <strong>{stop.recipientName}</strong>
                                        </div>
                                      )}
                                      {stop.notes && (
                                        <div className="text-slate-400 italic truncate max-w-xs">
                                          "{stop.notes}"
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">
                                      Awaiting site arrival &amp; offload sign-off
                                    </span>
                                  )}
                                </td>

                                {/* Quick Independent Status Actions */}
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {/* Cycle button: Start Transit */}
                                    {stop.status === 'Pending' && (
                                      <button
                                        onClick={() => updateBrokerDropStatus(load.id, stop.id, 'In Transit')}
                                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-bold border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors"
                                      >
                                        Start Transit
                                      </button>
                                    )}

                                    {/* Action: ✅ Mark Individual Drop Delivered */}
                                    {!isDelivered && (
                                      <button
                                        onClick={() => setDropToMarkDelivered({ load, drop: stop })}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>Mark Delivered</span>
                                      </button>
                                    )}

                                    {/* Reset or change back */}
                                    {isDelivered && (
                                      <button
                                        onClick={() => updateBrokerDropStatus(load.id, stop.id, 'Pending')}
                                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                                      >
                                        Reset to Pending
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Bottom notes & Attachment summary */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <div>
                        {load.notes ? (
                          <p className="italic">
                            <strong>Consignment Notes:</strong> {load.notes}
                          </p>
                        ) : (
                          <span>No special notes recorded.</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {load.attachedPdfName && (
                          <button
                            onClick={() => setLoadToViewPdf(load)}
                            className="text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Slip: {load.attachedPdfName}</span>
                          </button>
                        )}
                        <button
                          onClick={() => setLoadToPrint(load)}
                          className="text-slate-700 dark:text-slate-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Consignment Manifest</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODALS */}

      {/* 1. Add / Edit Broker Load Modal */}
      <BrokerLoadModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setLoadToEdit(null);
        }}
        loadToEdit={loadToEdit}
      />

      {/* 2. Assign Driver & Truck Modal */}
      <BrokerAssignDriverTruckModal
        isOpen={!!loadToAssign}
        onClose={() => setLoadToAssign(null)}
        load={loadToAssign}
      />

      {/* 3. Add Drop Location Modal */}
      <BrokerAddDropModal
        isOpen={!!loadToAddDrop}
        onClose={() => setLoadToAddDrop(null)}
        load={loadToAddDrop}
      />

      {/* 4. Mark Individual Drop Delivered Modal */}
      <BrokerMarkDropModal
        isOpen={!!dropToMarkDelivered}
        onClose={() => setDropToMarkDelivered(null)}
        load={dropToMarkDelivered?.load || null}
        drop={dropToMarkDelivered?.drop || null}
      />

      {/* 5. Print Load Details Modal */}
      <BrokerPrintDetailsModal
        isOpen={!!loadToPrint}
        onClose={() => setLoadToPrint(null)}
        load={loadToPrint}
      />

      {/* 6. View / Upload PDF Modal */}
      <BrokerPdfViewModal
        isOpen={!!loadToViewPdf}
        onClose={() => setLoadToViewPdf(null)}
        load={loadToViewPdf}
      />

      {/* 7. Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!loadToDelete}
        onClose={() => setLoadToDelete(null)}
        title="Delete Broker Load"
        message={`Are you sure you want to delete Broker Load #${loadToDelete?.dnNumber} for ${loadToDelete?.brokerName}?`}
        description="This will permanently remove the consignment and all its associated drop stops."
        confirmText="Delete Load"
        onConfirm={() => {
          if (loadToDelete) {
            deleteBrokerLoad(loadToDelete.id);
            setLoadToDelete(null);
          }
        }}
      />
    </div>
  );
};

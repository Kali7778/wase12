import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trip, TripStatus, CargoType } from '../types';
import { formatCurrency } from '../utils/i18n';
import { ManagerTripControlModal } from '../components/ManagerTripControlModal';
import { NewCompanyLoadModal } from '../components/NewCompanyLoadModal';
import { InwardStockModal } from '../components/InwardStockModal';
import { TripDossierModal } from '../components/TripDossierModal';
import { RouteShiftModal } from '../components/RouteShiftModal';
import {
  Truck,
  Search,
  Filter,
  Plus,
  FileText,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Thermometer,
  Trash2,
  History,
  Edit3,
  Boxes,
  User,
  DollarSign,
  PackageCheck,
  Eye,
  ArrowDownCircle,
  Lock,
  Download,
  Shuffle
} from 'lucide-react';

interface TripsViewProps {
  onOpenNewTripModal: () => void;
}

export const TripsView: React.FC<TripsViewProps> = ({ onOpenNewTripModal }) => {
  const {
    trips,
    drivers,
    vehicles,
    t,
    searchQuery,
    setSelectedTripForDn,
    updateTripStatus,
    deleteTrip,
    createTaxInvoiceFromTrip,
    getDriverTotalTripAmount,
    showToast,
    activeRole,
  } = useApp();

  // Active view tab: 'trips' | 'company_loads'
  const [activeTab, setActiveTab] = useState<'trips' | 'company_loads'>('trips');

  // Filters for Trips
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cargoFilter, setCargoFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>('');

  // Modals
  const [showManagerModal, setShowManagerModal] = useState<boolean>(false);
  const [tripToManage, setTripToManage] = useState<Trip | null>(null);
  const [managerModalMode, setManagerModalMode] = useState<'edit' | 'post_delivery'>('edit');

  const [showCompanyLoadModal, setShowCompanyLoadModal] = useState<boolean>(false);
  const [showInwardModal, setShowInwardModal] = useState<boolean>(false);
  const [inwardTripTarget, setInwardTripTarget] = useState<Trip | null>(null);

  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const [selectedDossierTrip, setSelectedDossierTrip] = useState<Trip | null>(null);

  const [showRouteShiftModal, setShowRouteShiftModal] = useState<boolean>(false);
  const [selectedRouteShiftTrip, setSelectedRouteShiftTrip] = useState<Trip | null>(null);

  // Filtered trips list
  const filteredTrips = trips.filter((trip) => {
    const term = (localSearch || searchQuery || '').toLowerCase();
    const matchesSearch =
      !term ||
      trip.tripNumber.toLowerCase().includes(term) ||
      (trip.companyLoadId && trip.companyLoadId.toLowerCase().includes(term)) ||
      trip.customerName.toLowerCase().includes(term) ||
      trip.driverName.toLowerCase().includes(term) ||
      trip.vehiclePlate.toLowerCase().includes(term) ||
      trip.origin.city.toLowerCase().includes(term) ||
      trip.destination.city.toLowerCase().includes(term) ||
      (trip.itemName && trip.itemName.toLowerCase().includes(term)) ||
      (trip.dnNumber && trip.dnNumber.toLowerCase().includes(term)) ||
      (trip.deliveryNote?.dnNumber && trip.deliveryNote.dnNumber.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    const matchesCargo = cargoFilter === 'all' || trip.cargoType === cargoFilter;

    return matchesSearch && matchesStatus && matchesCargo;
  });

  // Active Company loads
  const companyLoads = trips.filter((t) => t.isCompanyLoad);

  return (
    <div id="trips-view" className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Trips
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
              Unified Single Record
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Trip ID links driver, truck, locations, cargo quantity, DN No, status, and Master Audit trail in one cohesive system.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Create Company Load */}
          <button
            type="button"
            onClick={() => setShowCompanyLoadModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Boxes className="w-4 h-4 text-amber-300" />
            <span>Create Company Load</span>
          </button>

          {/* Add Missing Trip (Post-Delivery Manager Control) */}
          <button
            type="button"
            onClick={() => {
              setTripToManage(null);
              setManagerModalMode('post_delivery');
              setShowManagerModal(true);
            }}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>Add Missing Trip</span>
          </button>

          {/* Standard New Trip */}
          <button
            id="trips-create-btn"
            type="button"
            onClick={onOpenNewTripModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newTrip')}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('trips')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'trips'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Trips Ledger</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {trips.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('company_loads')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'company_loads'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Company Loads &amp; Inward</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold">
            {companyLoads.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: TRIPS MAIN TABLE                                  */}
      {/* ======================================================== */}
      {activeTab === 'trips' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search Trip ID, Driver, Truck, DN No., Item, Customer..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>

            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['all', 'assigned', 'loading', 'in_transit', 'delivered', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-bold text-xs transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Clean Exact Trips Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Trip ID</th>
                    <th className="py-3.5 px-3">Date</th>
                    <th className="py-3.5 px-3">Driver</th>
                    <th className="py-3.5 px-3">Truck</th>
                    <th className="py-3.5 px-3">Pickup</th>
                    <th className="py-3.5 px-3">Drop</th>
                    <th className="py-3.5 px-3">Item Description</th>
                    <th className="py-3.5 px-3 text-right">Qty</th>
                    <th className="py-3.5 px-3">DN No.</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTrips.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        No trips found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTrips.map((trip) => {
                      const dn = trip.deliveryNote;
                      const displayDn = trip.reservedDnNo || trip.dnNumber || dn?.dnNumber || 'DN-1001';
                      const displayDate = trip.departureTime?.substring(0, 10) || '17-Aug-2026';
                      const displayItemDesc = trip.itemDescription || dn?.items?.[0]?.description || dn?.items?.[0]?.name || (trip.itemName ? `${trip.itemName} – Regular 40 kg` : 'Gypsum Powder – Bags, Regular 40 kg');
                      const displayQty = trip.quantity || dn?.packagesCount || 20;
                      const displayUom = trip.uom || dn?.items?.[0]?.unit || 'BAG';

                      return (
                        <tr
                          key={trip.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Trip ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{trip.tripNumber}</span>
                              {trip.isCompanyLoad && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                                  {trip.companyLoadId}
                                </span>
                              )}
                              {trip.isRetroactive && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                                  Post-Delivery
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                            {displayDate}
                          </td>

                          {/* Driver */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {trip.driverName}
                            </span>
                          </td>

                          {/* Truck */}
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {trip.vehiclePlate}
                          </td>

                          {/* Pickup */}
                          <td className="py-3.5 px-3 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[140px] truncate" title={trip.origin.name}>
                            {trip.origin.city || trip.origin.name}
                          </td>

                          {/* Drop */}
                          <td className="py-3.5 px-3 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[140px] truncate" title={trip.destination.name}>
                            {trip.destination.city || trip.destination.name}
                          </td>

                          {/* Item Description */}
                          <td className="py-3.5 px-3 text-slate-800 dark:text-slate-200 font-semibold whitespace-nowrap max-w-[200px] truncate" title={displayItemDesc}>
                            {displayItemDesc}
                          </td>

                          {/* Qty */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {displayQty} <span className="text-[10px] text-slate-400 font-normal">{displayUom}</span>
                          </td>

                          {/* DN No */}
                          <td className="py-3.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {displayDn}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                                trip.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : trip.status === 'in_transit'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : trip.status === 'loading'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {trip.status === 'delivered' ? 'Completed' : trip.status.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* If Arrived Company Load, show Inward Stock button */}
                              {trip.isCompanyLoad && trip.status !== 'delivered' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInwardTripTarget(trip);
                                    setShowInwardModal(true);
                                  }}
                                  className="px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                                  title="Inward Stock to Main Inventory"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  <span>Inward</span>
                                </button>
                              )}

                              {/* Route Shift Button for in-transit/loaded trips */}
                              {trip.status !== 'delivered' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRouteShiftTrip(trip);
                                    setShowRouteShiftModal(true);
                                  }}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                                    trip.hasRouteShift
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                                  }`}
                                  title="In-Transit Route Shift to Customer (Preserves DN)"
                                >
                                  <Shuffle className="w-3 h-3" />
                                  <span>{trip.hasRouteShift ? 'Shift Active' : 'Shift Route'}</span>
                                </button>
                              )}

                              {/* View Unified Trip Dossier */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDossierTrip(trip);
                                  setShowDossierModal(true);
                                }}
                                className="px-2.5 py-1 text-[11px] rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>

                              {/* Manager Control (Admin Only) */}
                              {activeRole === 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTripToManage(trip);
                                    setManagerModalMode('edit');
                                    setShowManagerModal(true);
                                  }}
                                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                  title="Manager Trip Control (Admin Only)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Print DN */}
                              <button
                                type="button"
                                onClick={() => setSelectedTripForDn(trip)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 cursor-pointer"
                                title="Print Delivery Note"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: COMPANY LOADS & INWARD PIPELINE                   */}
      {/* ======================================================== */}
      {activeTab === 'company_loads' && (
        <div className="space-y-5">
          {/* Company Load 6-Step Workflow Diagram Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-amber-300" />
                  Company Load 6-Step Inward Lifecycle
                </h3>
                <p className="text-xs text-purple-200 mt-0.5">
                  Direct connection between Dispatcher load creation, TLB Main Inventory reservation, and Admin Inward Stock verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompanyLoadModal(true)}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Company Load</span>
              </button>
            </div>

            {/* Stepper Visual */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-amber-300 block">1. Dispatcher</span>
                <span className="font-bold">Create Load</span>
                <span className="text-[10px] text-slate-300 block">Select TLB Qty &amp; Driver</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-amber-300 block">2. Reserve Stock</span>
                <span className="font-bold">DN-001 Reserve</span>
                <span className="text-[10px] text-slate-300 block">Marked &apos;In Loading&apos;</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-amber-300 block">3. Driver Assigned</span>
                <span className="font-bold">Ahmed / T-101</span>
                <span className="text-[10px] text-slate-300 block">Receives on Driver Panel</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-amber-300 block">4. Supplier Load</span>
                <span className="font-bold">Quarry / Plant</span>
                <span className="text-[10px] text-slate-300 block">Load cargo &amp; depart</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-amber-300 block">5. Arrive at Admin</span>
                <span className="font-bold">Admin Warehouse</span>
                <span className="text-[10px] text-slate-300 block">Driver presents delivery slip</span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-emerald-200 space-y-1">
                <span className="text-[10px] font-black text-emerald-300 block">6. Admin Action</span>
                <span className="font-black text-white">[INWARD STOCK]</span>
                <span className="text-[10px] text-emerald-200 block">Reserved &rarr; Available (+500)</span>
              </div>
            </div>
          </div>

          {/* Active Company Loads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companyLoads.map((load) => {
              const isDelivered = load.status === 'delivered' || load.companyLoadStage === 'inward_completed';
              return (
                <div
                  key={load.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-purple-600 dark:text-purple-400 text-sm">
                          {load.companyLoadId || load.tripNumber}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                          DN: {load.reservedDnNo || load.dnNumber || 'DN-001'}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          isDelivered
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {isDelivered ? 'Inward Completed' : (load.companyLoadStage || 'In Loading').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-2">
                      {load.itemName || 'TLB Main Inventory'}
                    </h4>
                    {load.itemDescription && load.itemDescription !== load.itemName && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate" title={load.itemDescription}>
                        {load.itemDescription}
                      </p>
                    )}
                    <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {load.reservedQuantity || load.quantity || 500} {load.uom || 'BAG'} Reserved
                    </p>

                    <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Driver:</span>
                        <span className="font-bold">{load.driverName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Truck:</span>
                        <span className="font-mono font-bold">{load.vehiclePlate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Supplier:</span>
                        <span className="truncate max-w-[150px]">{load.origin.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Destination:</span>
                        <span className="truncate max-w-[150px]">{load.destination.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDossierTrip(load);
                        setShowDossierModal(true);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                    >
                      View Dossier &rarr;
                    </button>

                    {!isDelivered ? (
                      <button
                        type="button"
                        onClick={() => {
                          setInwardTripTarget(load);
                          setShowInwardModal(true);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>[ INWARD STOCK ]</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Added to Stock
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* GLOBAL MODALS                                            */}
      {/* ======================================================== */}

      {/* 1. Manager Trip Control Modal */}
      {showManagerModal && (
        <ManagerTripControlModal
          isOpen={showManagerModal}
          onClose={() => {
            setShowManagerModal(false);
            setTripToManage(null);
          }}
          trip={tripToManage}
          initialMode={managerModalMode}
        />
      )}

      {/* 2. New Company Load Modal */}
      {showCompanyLoadModal && (
        <NewCompanyLoadModal
          isOpen={showCompanyLoadModal}
          onClose={() => setShowCompanyLoadModal(false)}
        />
      )}

      {/* 3. Inward Stock Modal */}
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

      {/* 4. Single Unified Trip Dossier Modal */}
      {showDossierModal && (
        <TripDossierModal
          isOpen={showDossierModal}
          onClose={() => {
            setShowDossierModal(false);
            setSelectedDossierTrip(null);
          }}
          trip={selectedDossierTrip}
          onOpenInwardModal={(t) => {
            setInwardTripTarget(t);
            setShowInwardModal(true);
          }}
        />
      )}

      {/* 5. In-Transit Route Shift Modal */}
      {showRouteShiftModal && (
        <RouteShiftModal
          isOpen={showRouteShiftModal}
          onClose={() => {
            setShowRouteShiftModal(false);
            setSelectedRouteShiftTrip(null);
          }}
          trip={selectedRouteShiftTrip}
        />
      )}
    </div>
  );
};

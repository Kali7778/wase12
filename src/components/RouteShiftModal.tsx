import React, { useState, useEffect } from 'react';
import { Trip, Customer } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/i18n';
import {
  X,
  Shuffle,
  Truck,
  Building2,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  User,
  History,
  Check
} from 'lucide-react';

interface RouteShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  initialMode?: 'customer' | 'split_inventory';
}

export const RouteShiftModal: React.FC<RouteShiftModalProps> = ({
  isOpen,
  onClose,
  trip,
  initialMode = 'customer',
}) => {
  const {
    customers,
    drivers,
    vehicles,
    executeRouteShift,
    shiftRouteToCustomer,
    showToast,
    activeRole,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'customer' | 'split_inventory'>(initialMode);

  // General Trip metrics
  const originalQty = trip?.originalQuantity || trip?.quantity || 750;
  const currentDirectSold = trip?.directSaleQuantity || 0;
  const remainingLoaded = originalQty - currentDirectSold;
  const dnNo = trip?.dnNumber || trip?.deliveryNote?.dnNumber || 'DN-001';
  const currentCustomerName = trip?.customerName || trip?.companyName || 'Previous Customer (Customer A)';
  const currentCustomerId = trip?.customerId || 'cust_1';

  // --- CUSTOMER SHIFT STATE ---
  const [targetCustomerId, setTargetCustomerId] = useState<string>('');
  const [targetCustomerName, setTargetCustomerName] = useState<string>('Customer B (ABC Logistics)');
  const [targetCustomerAddress, setTargetCustomerAddress] = useState<string>('King Fahd Industrial City, Riyadh');
  const [targetCustomerCity, setTargetCustomerCity] = useState<string>('Riyadh');
  const [targetCustomerPhone, setTargetCustomerPhone] = useState<string>('+966 55 440 2901');
  const [targetCustomerVat, setTargetCustomerVat] = useState<string>('300881928300003');
  const [targetCustomerCr, setTargetCustomerCr] = useState<string>('4030192847');

  // Optional driver/truck reassignment during customer shift
  const [reassignDriver, setReassignDriver] = useState<boolean>(false);
  const [newDriverId, setNewDriverId] = useState<string>('');
  const [reassignVehicle, setReassignVehicle] = useState<boolean>(false);
  const [newVehicleId, setNewVehicleId] = useState<string>('');

  const [shiftReason, setShiftReason] = useState<string>(
    'Client diverted order / Urgent priority consignment requested for Customer B site'
  );
  const [effectiveDateTime, setEffectiveDateTime] = useState<string>(
    new Date().toISOString().replace('T', ' ').substring(0, 16)
  );
  const [confirmedAcknowledged, setConfirmedAcknowledged] = useState<boolean>(true);

  // --- SPLIT / PARTIAL SALE SHIFT STATE ---
  const [splitCustomerId, setSplitCustomerId] = useState<string>('');
  const [splitCustomerName, setSplitCustomerName] = useState<string>('Customer B (ABC Company)');
  const [splitCustomerAddress, setSplitCustomerAddress] = useState<string>('King Abdulaziz Road Depot, Jeddah');
  const [splitCustomerCity, setSplitCustomerCity] = useState<string>('Jeddah');
  const [splitCustomerPhone, setSplitCustomerPhone] = useState<string>('+966 55 440 2901');
  const [splitCustomerVat, setSplitCustomerVat] = useState<string>('300881928300003');
  const [splitCustomerCr, setSplitCustomerCr] = useState<string>('4030192847');
  const [shiftedQuantity, setShiftedQuantity] = useState<number>(300);
  const [unitPrice, setUnitPrice] = useState<number>(24.5);
  const [splitReason, setSplitReason] = useState<string>('Customer urgent partial sale ordered while driver in transit');

  const [shiftedBy, setShiftedBy] = useState<string>('Dispatcher / Operations Manager');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (customers.length > 0) {
      // Find candidate for Customer B
      const abc = customers.find(
        (c) =>
          c.id !== currentCustomerId &&
          (c.name.toLowerCase().includes('abc') ||
            c.name.toLowerCase().includes('customer b') ||
            c.name.toLowerCase().includes('sarh'))
      ) || customers.find((c) => c.id !== currentCustomerId) || customers[0];

      if (abc && !targetCustomerId) {
        setTargetCustomerId(abc.id);
        setTargetCustomerName(abc.name);
        setTargetCustomerAddress(abc.address || '—');
        setTargetCustomerCity(abc.city || '—');
        setTargetCustomerPhone(abc.phone || '—');
        setTargetCustomerVat(abc.vatNumber || '300881928300003');
        setTargetCustomerCr(abc.crNumber || '4030192847');

        setSplitCustomerId(abc.id);
        setSplitCustomerName(abc.name);
        setSplitCustomerAddress(abc.address || 'King Abdulaziz Road Depot, Jeddah');
        setSplitCustomerCity(abc.city || '—');
        setSplitCustomerPhone(abc.phone || '—');
        setSplitCustomerVat(abc.vatNumber || '300881928300003');
        setSplitCustomerCr(abc.crNumber || '4030192847');
      }
    }
  }, [customers, currentCustomerId, targetCustomerId]);

  if (!isOpen || !trip) return null;

  const handleTargetCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setTargetCustomerId(cid);
    if (cid === 'new_custom') {
      setTargetCustomerName('Customer B (New Commercial Client)');
      setTargetCustomerAddress('Riyadh Logistics Park');
      setTargetCustomerCity('Riyadh');
      setTargetCustomerPhone('+966 55 123 4567');
      setTargetCustomerVat('300999888700003');
      setTargetCustomerCr('1010887766');
    } else {
      const found = customers.find((c) => c.id === cid);
      if (found) {
        setTargetCustomerName(found.name);
        setTargetCustomerAddress(found.address || '');
        setTargetCustomerCity(found.city || '—');
        setTargetCustomerPhone(found.phone || '');
        setTargetCustomerVat(found.vatNumber || '');
        setTargetCustomerCr(found.crNumber || '');
      }
    }
  };

  const handleSplitCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setSplitCustomerId(cid);
    if (cid === 'new_custom') {
      setSplitCustomerName('Customer B');
      setSplitCustomerAddress('Customer B Project Site');
      setSplitCustomerCity('Riyadh');
    } else {
      const found = customers.find((c) => c.id === cid);
      if (found) {
        setSplitCustomerName(found.name);
        setSplitCustomerAddress(found.address || '');
        setSplitCustomerCity(found.city || '—');
        setSplitCustomerPhone(found.phone || '');
        setSplitCustomerVat(found.vatNumber || '');
        setSplitCustomerCr(found.crNumber || '');
      }
    }
  };

  const remainingForWarehouse = remainingLoaded - shiftedQuantity;

  const handleCustomerShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetCustomerName.trim()) {
      showToast('Validation Error', 'Please select or enter the new target customer.', 'error');
      return;
    }

    if (!shiftReason.trim()) {
      showToast('Validation Error', 'Please specify the reason for customer route shift.', 'error');
      return;
    }

    if (!confirmedAcknowledged) {
      showToast('Confirmation Required', 'Please confirm the customer route reassignment acknowledgement.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedDriverObj = reassignDriver && newDriverId ? drivers.find((d) => d.id === newDriverId) : undefined;
      const selectedVehicleObj = reassignVehicle && newVehicleId ? vehicles.find((v) => v.id === newVehicleId) : undefined;

      const res = shiftRouteToCustomer({
        tripId: trip.id,
        previousCustomerId: currentCustomerId,
        previousCustomerName: currentCustomerName,
        newCustomerId: targetCustomerId === 'new_custom' ? 'cust_' + Date.now() : targetCustomerId,
        newCustomerName: targetCustomerName,
        newCustomerAddress: targetCustomerAddress,
        newCustomerCity: targetCustomerCity,
        newCustomerPhone: targetCustomerPhone,
        newCustomerVat: targetCustomerVat,
        newCustomerCr: targetCustomerCr,
        newDriverId: reassignDriver ? newDriverId : undefined,
        newDriverName: selectedDriverObj?.name,
        newVehicleId: reassignVehicle ? newVehicleId : undefined,
        newVehiclePlate: selectedVehicleObj?.plateNumber,
        reason: shiftReason,
        notes,
        effectiveDateTime,
        shiftedBy,
      });

      if (res.success) {
        onClose();
      }
    } catch {
      showToast('Error', 'Failed to shift route to customer.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSplitShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (shiftedQuantity <= 0) {
      showToast('Validation Error', 'Shifted quantity must be greater than zero.', 'error');
      return;
    }

    if (shiftedQuantity > remainingLoaded) {
      showToast(
        'Quantity Limit Exceeded',
        `Cannot shift ${shiftedQuantity} units. Only ${remainingLoaded} units remain on truck.`,
        'error'
      );
      return;
    }

    if (!splitCustomerName.trim()) {
      showToast('Validation Error', 'Please select or provide a customer name.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = executeRouteShift({
        tripId: trip.id,
        customerId: splitCustomerId === 'new_custom' ? 'cust_' + Date.now() : splitCustomerId,
        customerName: splitCustomerName,
        customerAddress: splitCustomerAddress,
        customerCity: splitCustomerCity,
        customerPhone: splitCustomerPhone,
        customerVat: splitCustomerVat,
        customerCr: splitCustomerCr,
        shiftedQuantity,
        unitPrice,
        reason: splitReason,
        shiftedBy,
        notes,
      });

      if (res.success) {
        onClose();
      }
    } catch {
      showToast('Error', 'Failed to execute route shift.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Shuffle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black tracking-tight text-white">Route Shift Operations</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 text-xs font-mono font-bold">
                  {dnNo}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-200 text-[10px] font-bold uppercase tracking-wider">
                  Shipment #{trip.tripNumber}
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Reassign consignment to a new customer or divert in-transit freight with full audit and sub-ledger tracking.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 cursor-pointer ${
              activeTab === 'customer'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Route Shift → Customer (Reassign Shipment)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('split_inventory')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 cursor-pointer ${
              activeTab === 'split_inventory'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Split / Partial Sale Diversion</span>
          </button>
        </div>

        {/* TAB 1: ROUTE SHIFT TO CUSTOMER */}
        {activeTab === 'customer' && (
          <form onSubmit={handleCustomerShiftSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Live Shipment Overview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Active Consignment &amp; Transport Details
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                  Status: {trip.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Current Customer</span>
                  <strong className="text-xs text-rose-600 dark:text-rose-400 truncate block">
                    {currentCustomerName}
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Current Driver</span>
                  <strong className="text-xs text-slate-900 dark:text-white truncate block">
                    {trip.driverName}
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Current Truck</span>
                  <strong className="text-xs text-slate-900 dark:text-white font-mono">
                    {trip.vehiclePlate}
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200">
                  <span className="text-[10px] block font-sans font-bold">Total Freight</span>
                  <strong className="text-xs font-black">
                    {originalQty} {trip.uom || 'BAG'}
                  </strong>
                </div>
              </div>

              {/* Route Path */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span><strong>Pickup Origin:</strong> {trip.origin.name}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span><strong>Current Delivery:</strong> {trip.destination.name}</span>
                </div>
              </div>
            </div>

            {/* Target New Customer Configuration */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" /> 1. Select New Target Customer (Customer B)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Customer *
                  </label>
                  <select
                    value={targetCustomerId ?? ""}
                    onChange={handleTargetCustomerChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                    <option value="new_custom">+ Add / Reassign to Custom Customer B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Customer Name / Entity Label *
                  </label>
                  <input
                    type="text"
                    value={targetCustomerName ?? ""}
                    onChange={(e) => setTargetCustomerName(e.target.value)}
                    placeholder="e.g. Customer B (ABC Logistics)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Drop Location Address
                  </label>
                  <input
                    type="text"
                    value={targetCustomerAddress ?? ""}
                    onChange={(e) => setTargetCustomerAddress(e.target.value)}
                    placeholder="New delivery address or yard"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={targetCustomerCity ?? ""}
                    onChange={(e) => setTargetCustomerCity(e.target.value)}
                    placeholder="e.g. Riyadh"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Optional Driver / Truck Reassignment */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" /> Optional Driver &amp; Truck Change
                </span>
                <span className="text-[11px] text-slate-500">
                  Keep current driver ({trip.driverName}) or swap to another unit
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Reassign Driver?
                    </label>
                    <input
                      type="checkbox"
                      checked={reassignDriver}
                      onChange={(e) => setReassignDriver(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  {reassignDriver ? (
                    <select
                      value={newDriverId ?? ""}
                      onChange={(e) => setNewDriverId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                    >
                      <option value="">-- Select New Driver --</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.phone})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono">
                      Current: {trip.driverName}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Reassign Vehicle/Truck?
                    </label>
                    <input
                      type="checkbox"
                      checked={reassignVehicle}
                      onChange={(e) => setReassignVehicle(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  {reassignVehicle ? (
                    <select
                      value={newVehicleId ?? ""}
                      onChange={(e) => setNewVehicleId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                    >
                      <option value="">-- Select New Truck --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.plateNumber} - {v.model} ({v.type})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono">
                      Current: {trip.vehiclePlate}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shift Reason, Effective Date, Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Shift Reason *
                </label>
                <input
                  type="text"
                  value={shiftReason ?? ""}
                  onChange={(e) => setShiftReason(e.target.value)}
                  placeholder="e.g. Urgent priority diversion to Customer B site"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Effective Date &amp; Time
                </label>
                <input
                  type="text"
                  value={effectiveDateTime ?? ""}
                  onChange={(e) => setEffectiveDateTime(e.target.value)}
                  placeholder="YYYY-MM-DD HH:MM"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Audit Notes / Operational Memo
              </label>
              <textarea
                rows={2}
                value={notes ?? ""}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any billing or operational handover notes for customer and dispatcher records..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden resize-none"
              />
            </div>

            {/* Workflow & Confirmation Box */}
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <strong className="block text-sm">Customer Access &amp; Lifecycle Impact:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] leading-relaxed">
                    <li>
                      <strong>New Customer ({targetCustomerName}):</strong> Immediately gains visibility to shipment #{trip.tripNumber}, pickup/drop locations, live driver/truck GPS, ETA, and billing.
                    </li>
                    <li>
                      <strong>Previous Customer ({currentCustomerName}):</strong> Load is removed from active operations and preserved in shift history logs.
                    </li>
                    <li>
                      <strong>Audit Trail:</strong> An immutable Master Audit entry will be logged tracking Previous Customer → New Customer handover.
                    </li>
                  </ul>
                </div>
              </div>

              <label className="flex items-center gap-2.5 pt-2 border-t border-amber-200 dark:border-amber-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedAcknowledged}
                  onChange={(e) => setConfirmedAcknowledged(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-amber-950 dark:text-amber-100">
                  I confirm route handover from {currentCustomerName} to {targetCustomerName}
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !confirmedAcknowledged}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shuffle className="w-4 h-4" />
                <span>Confirm &amp; Shift Route to {targetCustomerName}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: IN-TRANSIT PARTIAL / SPLIT SALE SHIFT */}
        {activeTab === 'split_inventory' && (
          <form onSubmit={handleSplitShiftSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Active Trip Info Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loaded Freight Breakdown</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                  Status: IN TRANSIT ON ROAD
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Original DN</span>
                  <strong className="text-sm text-slate-900 dark:text-white">{dnNo}</strong>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Driver &amp; Truck</span>
                  <strong className="text-sm text-slate-900 dark:text-white truncate block">
                    {trip.driverName} ({trip.vehiclePlate})
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Loaded Cargo</span>
                  <strong className="text-sm text-slate-900 dark:text-white">
                    {originalQty} {trip.uom || 'BAG'}
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200">
                  <span className="text-[10px] block font-sans font-bold">On Truck Now</span>
                  <strong className="text-sm font-black">
                    {remainingLoaded} {trip.uom || 'BAG'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Split Shift Target Form */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-amber-600" /> Divert Partial Cargo to Customer
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Receiving Customer *
                  </label>
                  <select
                    value={splitCustomerId ?? ""}
                    onChange={handleSplitCustomerChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                    <option value="new_custom">+ Custom Customer B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Customer Name / Alias
                  </label>
                  <input
                    type="text"
                    value={splitCustomerName ?? ""}
                    onChange={(e) => setSplitCustomerName(e.target.value)}
                    placeholder="e.g. Customer B (ABC Company)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Quantity & Unit Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                      Shift Quantity to Customer *
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                      Max: {remainingLoaded} {trip.uom || 'BAG'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={remainingLoaded}
                      value={shiftedQuantity ?? ""}
                      onChange={(e) => setShiftedQuantity(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-amber-400 text-amber-900 dark:text-amber-100 font-mono font-black text-xl text-center focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      required
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs font-mono">
                      {trip.uom || 'BAG'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[100, 200, 300, 400, remainingLoaded].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setShiftedQuantity(Math.min(qty, remainingLoaded))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          shiftedQuantity === qty
                            ? 'bg-amber-600 text-white'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                        }`}
                      >
                        {qty === remainingLoaded ? `Max (${qty})` : `${qty}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Unit Selling Price (SAR)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={unitPrice ?? ""}
                      onChange={(e) => setUnitPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                    <span className="text-xs font-mono text-slate-500 font-bold">SAR</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1">
                    <div className="flex justify-between text-slate-900 dark:text-white font-bold">
                      <span>Total Invoice Amount:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(shiftedQuantity * unitPrice)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Split Breakdown */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-amber-50 dark:from-slate-800 dark:via-indigo-950/40 dark:to-amber-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Balance Verification
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                    RECONCILED 100%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 font-sans block">1. Total Loaded on {dnNo}</span>
                    <strong className="text-base text-slate-900 dark:text-white">{originalQty}</strong>{' '}
                    <span className="text-[10px] text-slate-400">{trip.uom || 'BAG'}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                    <span className="text-[10px] font-sans block font-bold">2. Direct Customer Sale</span>
                    <strong className="text-base text-amber-700 dark:text-amber-300">-{shiftedQuantity}</strong>{' '}
                    <span className="text-[10px] text-amber-600">{trip.uom || 'BAG'}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-indigo-100/70 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
                    <span className="text-[10px] font-sans block font-bold">3. Warehouse Inward Balance</span>
                    <strong className="text-base text-indigo-700 dark:text-indigo-300">+{remainingForWarehouse}</strong>{' '}
                    <span className="text-[10px] text-indigo-600">{trip.uom || 'BAG'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || shiftedQuantity <= 0 || shiftedQuantity > remainingLoaded}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shuffle className="w-4 h-4" />
                <span>Confirm &amp; Dispatch Split Route ({dnNo})</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

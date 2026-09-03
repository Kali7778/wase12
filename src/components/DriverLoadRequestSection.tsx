import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DriverLoadRequest, DriverRequestedLoadType, DriverLoadRequestStatus } from '../types';
import {
  Send,
  Truck,
  Layers,
  Calendar,
  User,
  MapPin,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  Package,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Info,
} from 'lucide-react';

interface DriverLoadRequestSectionProps {
  onNavigateToTab?: (tab: 'active_trip' | 'assigned_loads' | 'broker_loads') => void;
}

export const DriverLoadRequestSection: React.FC<DriverLoadRequestSectionProps> = ({
  onNavigateToTab,
}) => {
  const {
    driverLoadRequests,
    addDriverLoadRequest,
    selectedDriverId,
    drivers,
    vehicles,
    language,
    showToast,
  } = useApp();

  const isAr = language === 'ar';

  // Identify active driver
  const activeDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0] || {
    id: 'drv_1',
    name: 'Ahmed Al-Harbi',
    assignedVehiclePlate: '8421-KSA (TLB-4812)',
  };

  const assignedPlate =
    activeDriver.assignedVehiclePlate ||
    vehicles.find((v) => v.id === activeDriver.assignedVehicleId)?.plateNumber ||
    '8421-KSA (TLB-4812)';

  // Form State
  const [loadType, setLoadType] = useState<DriverRequestedLoadType>('Company Load (TLB)');
  const [requestDate, setRequestDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [driverName, setDriverName] = useState<string>(activeDriver.name);
  const [truckNo, setTruckNo] = useState<string>(assignedPlate);
  const [tlbQuantity, setTlbQuantity] = useState<number>(600);
  const [pickupLocation, setPickupLocation] = useState<string>('Riyadh Gypsum Plant Silo #2');
  const [dropLocation, setDropLocation] = useState<string>('Al-Kharj Industrial Development Project');
  const [customerCompanyName, setCustomerCompanyName] = useState<string>(
    'Al-Kifah ReadyMix & Contracting'
  );
  const [notes, setNotes] = useState<string>('Driver ready for early loading slot.');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter State for submitted requests
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Assigned' | 'Rejected'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Location suggestions for fast one-tap selection
  const commonPickups = [
    'Riyadh Gypsum Plant Silo #2',
    'Jeddah Port Container Logistics Gate 5',
    'Dammam Port Bulk Gypsum Silos',
    'Yanbu Gypsum Factory Outbound Bay',
    'Al-Kharj Industrial Zone Hub',
  ];

  const commonDrops = [
    'Al-Kharj Industrial Development Project',
    'Mecca Al-Shawqiyah Commercial Center',
    'Jubail Industrial Park Sector 4',
    'Riyadh Exit 18 Construction Site',
    'Medina South Ring Logistics Yard',
  ];

  const commonCustomers = [
    'Al-Kifah ReadyMix & Contracting',
    'Saudi Oger Precast Division',
    'Al-Safwa Logistics Broker',
    'Arabian Cementitious Trading Co.',
    'Al-Rajhi Construction & Supply',
  ];

  // Auto-adapt customer default based on loadType
  const handleSelectLoadType = (type: DriverRequestedLoadType) => {
    setLoadType(type);
    if (type === 'Broker Load') {
      if (customerCompanyName.includes('ReadyMix') || customerCompanyName.includes('Precast')) {
        setCustomerCompanyName('Al-Safwa Logistics Broker');
      }
      if (pickupLocation.includes('Riyadh Gypsum Plant')) {
        setPickupLocation('Jeddah Port Container Logistics Gate 5');
      }
    } else {
      if (customerCompanyName.includes('Broker')) {
        setCustomerCompanyName('Al-Kifah ReadyMix & Contracting');
      }
      if (pickupLocation.includes('Jeddah Port')) {
        setPickupLocation('Riyadh Gypsum Plant Silo #2');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!driverName.trim()) {
      showToast('Driver Name Required', 'Please enter your driver name.', 'warning');
      return;
    }

    if (!truckNo.trim()) {
      showToast('Truck No Required', 'Please provide your truck / TLB registration number.', 'warning');
      return;
    }

    if (!pickupLocation.trim()) {
      showToast('Pickup Location Required', 'Please specify where the load should be picked up.', 'warning');
      return;
    }

    if (!dropLocation.trim()) {
      showToast('Drop Location Required', 'Please specify the destination drop location.', 'warning');
      return;
    }

    if (!customerCompanyName.trim()) {
      showToast('Customer/Company Required', 'Please specify the customer or company name.', 'warning');
      return;
    }

    if (tlbQuantity <= 0) {
      showToast('Invalid Quantity', 'TLB quantity must be greater than 0 bags.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      addDriverLoadRequest({
        requestDate,
        driverId: activeDriver.id,
        driverName: driverName.trim(),
        truckNo: truckNo.trim(),
        loadType,
        tlbQuantity: Number(tlbQuantity),
        uom: 'Bags',
        pickupLocation: pickupLocation.trim(),
        dropLocation: dropLocation.trim(),
        customerCompanyName: customerCompanyName.trim(),
        notes: notes.trim(),
      });

      // Clear or reset fields
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter requests for the driver
  const myRequests = driverLoadRequests.filter((r) => {
    const matchDriver =
      r.driverId === activeDriver.id ||
      r.driverName.toLowerCase().includes(activeDriver.name.toLowerCase().split(' ')[0]) ||
      r.truckNo.includes(assignedPlate.split(' ')[0]);

    if (!matchDriver) return false;

    if (statusFilter !== 'all' && r.status !== statusFilter) return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchText =
        r.requestNumber.toLowerCase().includes(q) ||
        r.customerCompanyName.toLowerCase().includes(q) ||
        r.pickupLocation.toLowerCase().includes(q) ||
        r.dropLocation.toLowerCase().includes(q) ||
        r.loadType.toLowerCase().includes(q);
      if (!matchText) return false;
    }

    return true;
  });

  const getStatusBadge = (status: DriverLoadRequestStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>Pending Dispatcher Review</span>
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved by Dispatcher</span>
          </span>
        );
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Truck className="w-3.5 h-3.5" />
            <span>Assigned to Active Trip</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>Request Rejected</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Workflow Pipeline */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Driver Self-Service Portal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {isAr ? 'طلب حمولة سائق (Request Load)' : 'Driver Load Request Portal'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Request a new <strong>Broker Load</strong> or <strong>Company Load (TLB)</strong>.
              Your request will be immediately transmitted to the <strong>Dispatcher / Admin Console</strong> for approval and auto-assignment.
            </p>
          </div>

          {/* Status Pipeline Visual Indicator */}
          <div className="bg-slate-800/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 shrink-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Approval Workflow</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black">
              <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                1. Pending
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                2. Approved / Rejected
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                3. Assigned
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Request Load Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form
            id="driver-request-load-form"
            onSubmit={handleSubmit}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Submit New Load Request</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select load type and enter consignment parameters.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-slate-400">
                Driver: <strong className="text-slate-700 dark:text-slate-200">{activeDriver.name}</strong>
              </span>
            </div>

            {/* 1. LOAD TYPE SELECTION (Exactly two load types required: Broker Load vs Company Load (TLB)) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Load Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A: Broker Load */}
                <button
                  type="button"
                  id="select-load-type-broker"
                  onClick={() => handleSelectLoadType('Broker Load')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    loadType === 'Broker Load'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                      <Layers className="w-5 h-5" />
                    </div>
                    {loadType === 'Broker Load' && (
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                        <Check className="w-4 h-4 font-black" />
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white mt-3">
                    1. Broker Load
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Third-party logistics broker load with multiple drop destinations &amp; freight slips.
                  </p>
                </button>

                {/* Option B: Company Load (TLB) */}
                <button
                  type="button"
                  id="select-load-type-company"
                  onClick={() => handleSelectLoadType('Company Load (TLB)')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    loadType === 'Company Load (TLB)'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 shadow-md ring-2 ring-blue-600/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    {loadType === 'Company Load (TLB)' && (
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-4 h-4 font-black" />
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white mt-3">
                    2. Company Load (TLB)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Direct company plant bulk mortar/gypsum consignment assigned to internal fleet.
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Form Grid (Date, Driver Name, Truck No, Quantity) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Request Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Request Date <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="date"
                  id="req-date-input"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Driver Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Driver Name <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  id="req-driver-name-input"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Ahmed Al-Harbi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Truck No. / TLB No. */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Truck No. / TLB Plate <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  id="req-truck-no-input"
                  value={truckNo}
                  onChange={(e) => setTruckNo(e.target.value)}
                  placeholder="e.g. 8421-KSA (TLB-4812)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* TLB Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                    <span>TLB Quantity (Bags) <span className="text-rose-500">*</span></span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                    ≈ {(tlbQuantity * 0.04).toFixed(1)} Tons
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="req-tlb-quantity-input"
                    value={tlbQuantity}
                    onChange={(e) => setTlbQuantity(Math.max(1, Number(e.target.value)))}
                    min={1}
                    max={2000}
                    step={10}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  {/* Preset buttons */}
                  {[450, 600, 750].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setTlbQuantity(preset)}
                      className={`px-2 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        tlbQuantity === preset
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Pickup Location */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pickup Location <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                id="req-pickup-location-input"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Enter pickup point (e.g., Silo #2, Jeddah Port)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold self-center">Quick pick:</span>
                {commonPickups.slice(0, 3).map((loc) => (
                  <button
                    type="button"
                    key={loc}
                    onClick={() => setPickupLocation(loc)}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Drop Location */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Drop Location <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                id="req-drop-location-input"
                value={dropLocation}
                onChange={(e) => setDropLocation(e.target.value)}
                placeholder="Enter destination delivery point"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold self-center">Quick drop:</span>
                {commonDrops.slice(0, 3).map((loc) => (
                  <button
                    type="button"
                    key={loc}
                    onClick={() => setDropLocation(loc)}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[10px] text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Customer / Company Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Customer / Company Name <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                id="req-customer-company-input"
                value={customerCompanyName}
                onChange={(e) => setCustomerCompanyName(e.target.value)}
                placeholder="Customer contractor or logistics broker"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold self-center">Suggested:</span>
                {commonCustomers.slice(0, 3).map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCustomerCompanyName(c)}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-[10px] text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Notes &amp; Special Instructions</span>
              </label>
              <textarea
                id="req-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Silo bay reserved, driver ready for immediate morning dispatch..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Transmits directly to <strong>Dispatcher Console</strong>
              </span>

              <button
                type="submit"
                id="submit-load-request-btn"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Request (إرسال الطلب)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Submitted Requests History & Live Status (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  My Load Requests
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track real-time status and assignment history.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {myRequests.length} Total
              </span>
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by request # or destination..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                {(['all', 'Pending', 'Approved', 'Assigned', 'Rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'All Status' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Requests List */}
            <div className="space-y-3 max-h-[620px] overflow-y-auto custom-scrollbar pr-1">
              {myRequests.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">No load requests found</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Submit your first load request above to see updates here.
                  </p>
                </div>
              ) : (
                myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 hover:border-indigo-400 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                            {req.requestNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              req.loadType === 'Broker Load'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {req.loadType}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
                          <span>{req.requestDate}</span>
                          <span>•</span>
                          <span className="font-mono">{req.truckNo}</span>
                        </div>
                      </div>

                      {getStatusBadge(req.status)}
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-500 dark:text-slate-400">Quantity:</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {req.tlbQuantity} {req.uom || 'Bags'}
                        </span>
                      </div>

                      <div className="flex items-start gap-1.5 text-[11px]">
                        <span className="text-slate-400 shrink-0 font-medium">From:</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate">{req.pickupLocation}</span>
                      </div>

                      <div className="flex items-start gap-1.5 text-[11px]">
                        <span className="text-slate-400 shrink-0 font-medium">To:</span>
                        <span className="text-slate-900 dark:text-white font-bold truncate">{req.dropLocation}</span>
                      </div>

                      <div className="flex items-start gap-1.5 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 shrink-0 font-medium">Client:</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold truncate">
                          {req.customerCompanyName}
                        </span>
                      </div>

                      {req.notes && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic pt-1">
                          "{req.notes}"
                        </p>
                      )}
                    </div>

                    {/* Review Feedback if reviewed */}
                    {req.reviewNotes && (
                      <div
                        className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                          req.status === 'Rejected'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                        }`}
                      >
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[11px]">
                            {req.reviewedBy || 'Dispatcher Review'}:
                          </strong>
                          <p className="text-[11px]">{req.reviewNotes}</p>
                        </div>
                      </div>
                    )}

                    {/* Action button to jump to active load if approved/assigned */}
                    {req.status === 'Assigned' && (
                      <div className="pt-1">
                        {req.loadType === 'Company Load (TLB)' ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToTab?.('active_trip')}
                            className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>View Dispatched Trip in Active Trips</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigateToTab?.('broker_loads')}
                            className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>View Multi-Drop in Broker Loads</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

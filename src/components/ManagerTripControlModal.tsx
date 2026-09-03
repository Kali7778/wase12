import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trip, LocationPoint, CargoType, TripStatus } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
  MapPin,
  FileText,
  DollarSign,
  Package,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  Upload,
  RefreshCw,
  Ban,
  ArrowRight,
  Sparkles,
  Layers,
  History,
  FileCheck,
  HelpCircle,
  FolderOpen
} from 'lucide-react';

interface ManagerTripControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: Trip | null; // If provided, edit/control this trip; if null, create retroactive missing trip
  initialMode?: 'edit' | 'post_delivery';
}

export const ManagerTripControlModal: React.FC<ManagerTripControlModalProps> = ({
  isOpen,
  onClose,
  trip,
  initialMode = 'edit',
}) => {
  const {
    trips,
    drivers,
    vehicles,
    customers,
    locations,
    inboundDeliveryNotes,
    managerModifyTrip,
    managerAddPostDeliveryTrip,
    managerCancelTrip,
    managerReopenTrip,
    managerClearDelivery,
    managerAttachSlip,
    getDriverTotalTripAmount,
    activeRole,
    users,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'edit' | 'post_delivery'>(trip ? 'edit' : initialMode);

  // Form states
  const [selectedTripId, setSelectedTripId] = useState<string>(trip?.id || '');
  const [selectedDnNumber, setSelectedDnNumber] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [pickupPresetId, setPickupPresetId] = useState<string>('');
  const [dropPresetId, setDropPresetId] = useState<string>('');
  const [pickupName, setPickupName] = useState<string>('Riyadh Central Logistics Hub');
  const [pickupCity, setPickupCity] = useState<string>('Riyadh');
  const [pickupAddress, setPickupAddress] = useState<string>('Warehouse Bay 4, Industrial City 2');
  const [dropName, setDropName] = useState<string>('Dammam Port Freight Terminal');
  const [dropCity, setDropCity] = useState<string>('Dammam');
  const [dropAddress, setDropAddress] = useState<string>('Consignee Receiving Depot, Exit 18');
  
  const [quantity, setQuantity] = useState<number>(750);
  const [uom, setUom] = useState<string>('BAG');
  const [itemName, setItemName] = useState<string>('Gypsum Powder Regular 40kg');
  const [cargoType, setCargoType] = useState<CargoType>('general');
  const [driverTripRate, setDriverTripRate] = useState<number>(500);
  const [freightPrice, setFreightPrice] = useState<number>(1800);
  const [customerName, setCustomerName] = useState<string>('Saudi Building Supplies Ltd');
  const [customerId, setCustomerId] = useState<string>('');
  const [slipImageUrl, setSlipImageUrl] = useState<string>('');
  const [receiverSignature, setReceiverSignature] = useState<string>('Signed by Consignee at Site');
  const [notes, setNotes] = useState<string>('');

  // Post-delivery specific fields
  const [originalDeliveryTime, setOriginalDeliveryTime] = useState<string>('');
  
  // Mandatory Manager Reason for Master Audit
  const [managerReason, setManagerReason] = useState<string>('');

  // Initialize or populate form when trip or modal opens
  useEffect(() => {
    if (trip) {
      setMode('edit');
      setSelectedTripId(trip.id);
      setSelectedDnNumber(trip.dnNumber || trip.deliveryNote?.dnNumber || '');
      setDriverId(trip.driverId || '');
      setVehicleId(trip.vehicleId || '');
      setPickupName(trip.origin.name || trip.origin.city || 'Riyadh');
      setPickupCity(trip.origin.city || 'Riyadh');
      setPickupAddress(trip.origin.address || '');
      setDropName(trip.destination.name || trip.destination.city || 'Dammam');
      setDropCity(trip.destination.city || 'Dammam');
      setDropAddress(trip.destination.address || '');
      setQuantity(trip.quantity || trip.deliveryNote?.packagesCount || 750);
      setUom(trip.uom || 'BAG');
      setItemName(trip.itemName || trip.deliveryNote?.cargoDescription || 'Industrial Cargo');
      setCargoType(trip.cargoType || 'general');
      const currentDriver = drivers.find((d) => d.id === trip.driverId);
      setDriverTripRate(trip.driverTripRate !== undefined ? trip.driverTripRate : (currentDriver?.tripAllowanceRate ?? trip.cost ?? 500));
      setFreightPrice(trip.price || 1500);
      setCustomerName(trip.customerName || trip.companyName || '');
      setCustomerId(trip.customerId || '');
      setSlipImageUrl(trip.slipImageUrl || trip.deliveryNote?.slipImageUrl || '');
      setReceiverSignature(trip.deliveryNote?.receiverSignature || '');
      setNotes(trip.notes || '');
      setManagerReason('');
    } else {
      // Default to Post-Delivery mode
      setMode(initialMode);
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      const prevHour = Math.max(8, now.getHours() - 3);
      setOriginalDeliveryTime(`${day}-${month}-${year} ${String(prevHour).padStart(2, '0')}:30`);
      setManagerReason('Trip was not created before dispatch (Retroactive missing trip creation)');
      if (drivers.length > 0) setDriverId(drivers[0].id);
      if (vehicles.length > 0) setVehicleId(vehicles[0].id);
      if (locations.length >= 2) {
        setPickupName(locations[0].name);
        setPickupCity(locations[0].city);
        setPickupAddress(locations[0].address);
        setDropName(locations[1].name);
        setDropCity(locations[1].city);
        setDropAddress(locations[1].address);
      }
    }
  }, [trip, isOpen, initialMode]);

  if (!isOpen) return null;

  const currentTrip = trips.find((t) => t.id === selectedTripId) || trip;
  const selectedDriver = drivers.find((d) => d.id === driverId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  // Quick select an existing Delivery Note to auto-fill post-delivery trip
  const handleSelectExistingDn = (dnNum: string) => {
    setSelectedDnNumber(dnNum);
    const matchedInbound = inboundDeliveryNotes.find((inb) => inb.dnNumber === dnNum);
    if (matchedInbound) {
      setCustomerName(matchedInbound.companyName || matchedInbound.salesman || '');
      setItemName(matchedInbound.itemName || '');
      setQuantity(matchedInbound.quantity || 750);
      setUom(matchedInbound.uom || 'BAG');
      if (matchedInbound.shipFrom) {
        setPickupName(matchedInbound.shipFrom);
      }
      if (matchedInbound.driverId) {
        setDriverId(matchedInbound.driverId);
      }
      if (matchedInbound.vehiclePlate) {
        const foundVeh = vehicles.find((v) => v.plateNumber === matchedInbound.vehiclePlate);
        if (foundVeh) setVehicleId(foundVeh.id);
      }
      showToast('Delivery Note Linked', `Loaded details from DN #${dnNum}`, 'info');
    }
  };

  const handlePickupPresetChange = (presetId: string) => {
    setPickupPresetId(presetId);
    const loc = locations.find((l) => l.id === presetId);
    if (loc) {
      setPickupName(loc.name);
      setPickupCity(loc.city);
      setPickupAddress(loc.address);
    }
  };

  const handleDropPresetChange = (presetId: string) => {
    setDropPresetId(presetId);
    const loc = locations.find((l) => l.id === presetId);
    if (loc) {
      setDropName(loc.name);
      setDropCity(loc.city);
      setDropAddress(loc.address);
    }
  };

  // Image Upload handler
  const handleSlipFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSlipImageUrl(reader.result as string);
      showToast('Delivery Slip Uploaded', 'Proof of delivery document attached.', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Submit Modification
  const handleSaveModification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) return;

    if (!managerReason.trim()) {
      showToast('Reason Required', 'Please provide a mandatory reason for the Master Audit log.', 'warning');
      return;
    }

    const pickupPoint: LocationPoint = {
      id: pickupPresetId || 'loc_pickup_' + Date.now(),
      name: pickupName,
      city: pickupCity,
      address: pickupAddress,
      lat: 24.7136,
      lng: 46.6753,
    };

    const dropPoint: LocationPoint = {
      id: dropPresetId || 'loc_drop_' + Date.now(),
      name: dropName,
      city: dropCity,
      address: dropAddress,
      lat: 26.4207,
      lng: 50.0888,
    };

    const updates: Partial<Trip> = {
      driverId,
      driverName: selectedDriver ? selectedDriver.name : currentTrip.driverName,
      driverPhone: selectedDriver ? selectedDriver.phone : currentTrip.driverPhone,
      vehicleId,
      vehiclePlate: selectedVehicle ? selectedVehicle.plateNumber : currentTrip.vehiclePlate,
      vehicleType: selectedVehicle ? selectedVehicle.type : currentTrip.vehicleType,
      driverTripRate: Number(driverTripRate),
      cost: Number(driverTripRate),
      price: Number(freightPrice),
      quantity: Number(quantity),
      uom,
      itemName,
      cargoType,
      origin: pickupPoint,
      destination: dropPoint,
      dnNumber: selectedDnNumber || currentTrip.dnNumber,
      customerName,
      customerId,
      slipImageUrl,
      notes,
    };

    managerModifyTrip(currentTrip.id, updates, managerReason);
    onClose();
  };

  // Submit Post-Delivery / Retroactive Missing Trip
  const handleSavePostDeliveryTrip = (e: React.FormEvent) => {
    e.preventDefault();

    if (!driverId) {
      showToast('Driver Required', 'Please assign a driver for this trip.', 'warning');
      return;
    }
    if (!vehicleId) {
      showToast('Truck Required', 'Please assign a vehicle for this trip.', 'warning');
      return;
    }
    if (!managerReason.trim()) {
      showToast('Reason Required', 'Mandatory reason is required for creating a missing post-delivery trip.', 'warning');
      return;
    }

    const pickupPoint: LocationPoint = {
      id: pickupPresetId || 'loc_pickup_' + Date.now(),
      name: pickupName,
      city: pickupCity,
      address: pickupAddress,
      lat: 24.7136,
      lng: 46.6753,
    };

    const dropPoint: LocationPoint = {
      id: dropPresetId || 'loc_drop_' + Date.now(),
      name: dropName,
      city: dropCity,
      address: dropAddress,
      lat: 26.4207,
      lng: 50.0888,
    };

    managerAddPostDeliveryTrip({
      dnNumber: selectedDnNumber,
      driverId,
      vehicleId,
      origin: pickupPoint,
      destination: dropPoint,
      quantity: Number(quantity),
      uom,
      itemName,
      cargoType,
      driverTripRate: Number(driverTripRate),
      price: Number(freightPrice),
      completedTime: originalDeliveryTime || `${new Date().toLocaleDateString()} 11:30`,
      reason: managerReason,
      slipImageUrl,
      receiverSignature,
      customerName,
      customerId,
      notes,
    });

    onClose();
  };

  // Quick Action: Cancel Trip
  const handleCancelTripAction = () => {
    if (!currentTrip) return;
    const reason = prompt(`Please enter the cancellation reason for Trip #${currentTrip.tripNumber} (Mandatory for Master Audit):`, 'Cancelled per customer request / vehicle breakdown');
    if (!reason) return;
    managerCancelTrip(currentTrip.id, reason);
    onClose();
  };

  // Quick Action: Reopen Trip
  const handleReopenTripAction = () => {
    if (!currentTrip) return;
    const reason = prompt(`Enter reason to Reopen Trip #${currentTrip.tripNumber} (Recorded in Master Audit):`, 'Reopened for additional cargo verification / delivery correction');
    if (!reason) return;
    managerReopenTrip(currentTrip.id, reason, 'in_transit');
    onClose();
  };

  // Quick Action: Clear Delivery
  const handleClearDeliveryAction = () => {
    if (!currentTrip) return;
    const reason = prompt(`Enter notes for Manager Delivery Clearance:`, 'Verified POD and physical cargo match');
    managerClearDelivery(currentTrip.id, reason || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        
        {/* Header Strip */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/30 text-emerald-400 rounded-xl border border-emerald-500/40">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                  Manager Trip Control & Master Audit
                </span>
                {currentTrip && (
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {currentTrip.tripNumber}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black tracking-tight text-white mt-0.5">
                {mode === 'edit' ? 'Correct, Modify & Reassign Trip' : 'Add Missing Trip After Delivery (Retroactive)'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-6 pt-3 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              mode === 'edit'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Modify & Correct Active/Existing Trip</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('post_delivery')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              mode === 'post_delivery'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-500" />
            <span>Add Trip After Delivery (Post-Delivery Missed Trip)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Post-Delivery Information Banner */}
          {mode === 'post_delivery' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                <History className="w-4 h-4 text-amber-500" />
                <span>Post-Delivery Retroactive Workflow (إضافة رحلة متأخرة بعد اكتمال التسليم)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                Use this control when a delivery took place physically but the driver trip was missed or not created before dispatch. The system will link the trip to the existing delivery note, update the driver's total trip amount/allowance, and log an immutable entry in the Master Audit trail without altering the original delivery timestamp.
              </p>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400">1. Original Delivery:</span>{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">{originalDeliveryTime || '17-Aug 11:30 — Delivery completed'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">2. Manager Action:</span>{' '}
                  <strong className="text-blue-600 dark:text-blue-400">Recorded Now in Master Audit</strong>
                </div>
              </div>
            </div>
          )}

          {/* If in Edit Mode and multiple trips exist, allow switching trip */}
          {mode === 'edit' && !trip && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Trip to Modify / Correct:
              </label>
              <select
                value={selectedTripId ?? ""}
                onChange={(e) => {
                  setSelectedTripId(e.target.value);
                  const found = trips.find((t) => t.id === e.target.value);
                  if (found) {
                    setDriverId(found.driverId);
                    setVehicleId(found.vehicleId);
                    setSelectedDnNumber(found.dnNumber || '');
                    setQuantity(found.quantity || 750);
                    setUom(found.uom || 'BAG');
                    setItemName(found.itemName || 'Cargo');
                    setDriverTripRate(found.driverTripRate ?? 500);
                  }
                }}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripNumber} — {t.customerName} ({t.origin.city} → {t.destination.city}) [Driver: {t.driverName}] ({t.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Pre-fill from Existing Delivery Notes in Post-Delivery mode */}
          {mode === 'post_delivery' && inboundDeliveryNotes.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Link to Completed Delivery Note (Optional 1-Click Auto-Fill):
              </label>
              <div className="flex flex-wrap gap-2">
                {inboundDeliveryNotes.slice(0, 4).map((dn) => (
                  <button
                    key={dn.id}
                    type="button"
                    onClick={() => handleSelectExistingDn(dn.dnNumber)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                      selectedDnNumber === dn.dnNumber
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    DN #{dn.dnNumber} ({dn.companyName})
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={mode === 'edit' ? handleSaveModification : handleSavePostDeliveryTrip} className="space-y-6">
            {/* Row 1: Delivery Note Number & Customer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Note Number (DN No.)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={selectedDnNumber ?? ""}
                    onChange={(e) => setSelectedDnNumber(e.target.value)}
                    placeholder="e.g. 9010043436"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Consignee Name
                </label>
                <input
                  type="text"
                  required
                  value={customerName ?? ""}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. مؤسسة صرح البنيان للتجارة"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                />
              </div>
            </div>

            {/* Row 2: Driver & Vehicle Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Assign / Reassign Driver (تعيين السائق)</span>
                  </label>
                  {selectedDriver && (
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      Current Total: {formatCurrency(getDriverTotalTripAmount(selectedDriver.id))}
                    </span>
                  )}
                </div>
                <select
                  value={driverId ?? ""}
                  onChange={(e) => setDriverId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="">-- Select Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone}) • Trips: {d.totalTripsCompleted} • Base: SAR {d.baseSalary}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Assign / Reassign Truck Plate (الشاحنة)</span>
                </label>
                <select
                  value={vehicleId ?? ""}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold font-mono"
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} — {v.truckModel} ({v.capacityTonnes}t {v.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Rates & Financial Control (Trip Rate & Freight) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <div>
                <label className="block text-xs font-black text-emerald-900 dark:text-emerald-300 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Driver Trip Rate / Allowance (أجر الرحلة للسائق - ريال)</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={10}
                  value={driverTripRate ?? ""}
                  onChange={(e) => setDriverTripRate(Number(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 block">
                  Directly credits driver's Total Trip Amount &amp; payroll allowances.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Freight Invoicing Rate (سعر نقل الفاتورة - للعميل)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={freightPrice ?? ""}
                  onChange={(e) => setFreightPrice(Number(e.target.value))}
                  placeholder="e.g. 1800"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Customer billing charge.
                </span>
              </div>
            </div>

            {/* Row 4: Route Locations (Pickup & Drop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup Point */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>Pickup Location (موقع الاستلام / التحميل)</span>
                  </span>
                </div>

                <select
                  value={pickupPresetId ?? ""}
                  onChange={(e) => handlePickupPresetChange(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">-- Choose Preset Location --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.city})
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Facility Name"
                    value={pickupName ?? ""}
                    onChange={(e) => setPickupName(e.target.value)}
                    className="p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={pickupCity ?? ""}
                    onChange={(e) => setPickupCity(e.target.value)}
                    className="p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Street / Warehouse Address"
                  value={pickupAddress ?? ""}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Drop Point */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Drop Destination (موقع التسليم / التنزيل)</span>
                  </span>
                </div>

                <select
                  value={dropPresetId ?? ""}
                  onChange={(e) => handleDropPresetChange(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">-- Choose Preset Location --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.city})
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Facility Name"
                    value={dropName ?? ""}
                    onChange={(e) => setDropName(e.target.value)}
                    className="p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={dropCity ?? ""}
                    onChange={(e) => setDropCity(e.target.value)}
                    className="p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Street / Customer Site Address"
                  value={dropAddress ?? ""}
                  onChange={(e) => setDropAddress(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Row 5: Cargo Details (Quantity, UOM, Cargo Type) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Item / Cargo Description
                </label>
                <input
                  type="text"
                  value={itemName ?? ""}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Gypsum Powder"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity &amp; UOM (الكمية والوحدة)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={quantity ?? ""}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-2/3 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                  <select
                    value={uom ?? ""}
                    onChange={(e) => setUom(e.target.value)}
                    className="w-1/3 p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="BAG">BAG</option>
                    <option value="Tons">Tons</option>
                    <option value="Pallets">Pallets</option>
                    <option value="CBM">CBM</option>
                    <option value="Boxes">Boxes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cargo Type (تصنيف الحمولة)
                </label>
                <select
                  value={cargoType ?? ""}
                  onChange={(e) => setCargoType(e.target.value as CargoType)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold capitalize"
                >
                  <option value="general">General Cargo</option>
                  <option value="industrial">Heavy Industrial / Building</option>
                  <option value="chilled">Cold Chain / Reefer</option>
                  <option value="fragile">Fragile</option>
                </select>
              </div>
            </div>

            {/* Row 6: Delivery Slip Attachment (Upload Slip / POD) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-blue-500" />
                <span>Delivery Slip &amp; POD (إرفاق صورة سند التسليم / إشعار الاستلام)</span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <label className="flex-1 w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-slate-900 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                  <Upload className="w-4 h-4 text-blue-500" />
                  <span>Choose file or photo of physical delivery slip</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleSlipFileUpload}
                    className="hidden"
                  />
                </label>

                {slipImageUrl && (
                  <div className="flex items-center gap-2 shrink-0">
                    <img
                      src={slipImageUrl}
                      alt="Delivery Slip Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-300 dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setSlipImageUrl('')}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Row 7: Original Delivery Time (in Post-Delivery mode) */}
            {mode === 'post_delivery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Original Delivery Completion Time (وقت التسليم الأصلي)</span>
                  </label>
                  <input
                    type="text"
                    value={originalDeliveryTime ?? ""}
                    onChange={(e) => setOriginalDeliveryTime(e.target.value)}
                    placeholder="e.g. 17-Aug-2026 11:30"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Preserves the genuine historical delivery timestamp in records.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Receiver Signatory / Consignee Notes
                  </label>
                  <input
                    type="text"
                    value={receiverSignature ?? ""}
                    onChange={(e) => setReceiverSignature(e.target.value)}
                    placeholder="e.g. Signed by Site Supervisor"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Row 8: MANDATORY MANAGER REASON (MASTER AUDIT) */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/80 space-y-1.5">
              <label className="block text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Mandatory Reason for Master Audit (سبب التعديل / الإضافة - إلزامي لسجل التدقيق العام)</span>
              </label>
              <textarea
                required
                rows={2}
                value={managerReason ?? ""}
                onChange={(e) => setManagerReason(e.target.value)}
                placeholder="e.g. Trip was not created before dispatch / Corrected driver rate after road detour / Driver reassigned due to truck breakdown..."
                className="w-full p-2.5 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <div className="flex items-center justify-between text-[10px] text-amber-800 dark:text-amber-400 font-mono">
                <span>All modifications generate an immutable SHA-256 sealed audit entry.</span>
                <span>Authorized Role: {activeRole.toUpperCase()}</span>
              </div>
            </div>

            {/* Quick Actions (Cancel, Reopen, Clear Delivery) if in Edit Mode */}
            {mode === 'edit' && currentTrip && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-500">
                  Manager Lifecycle Controls:
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {currentTrip.status !== 'cancelled' ? (
                    <button
                      type="button"
                      onClick={handleCancelTripAction}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors"
                    >
                      Cancel Trip (إلغاء)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReopenTripAction}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors"
                    >
                      Reopen Cancelled Trip
                    </button>
                  )}

                  {currentTrip.status === 'delivered' && (
                    <button
                      type="button"
                      onClick={handleClearDeliveryAction}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      Clear &amp; Approve Delivery Note
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {mode === 'edit' ? 'Save Changes & Seal in Master Audit' : 'Save Missing Trip & Update Driver Total'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

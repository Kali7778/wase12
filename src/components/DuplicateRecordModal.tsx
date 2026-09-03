import React, { useState } from 'react';
import { Trip } from '../types';
import { useApp } from '../context/AppContext';
import {
  Copy,
  X,
  Truck,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface DuplicateRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onDuplicateSuccess?: (newTrip: Trip) => void;
}

export const DuplicateRecordModal: React.FC<DuplicateRecordModalProps> = ({
  isOpen,
  onClose,
  trip,
  onDuplicateSuccess,
}) => {
  const { drivers, vehicles, duplicateTrip, showToast } = useApp();

  const [customDn, setCustomDn] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(750);
  const [price, setPrice] = useState<number>(1500);
  const [driverTripRate, setDriverTripRate] = useState<number>(500);

  // Initialize form when trip changes
  React.useEffect(() => {
    if (trip) {
      const origDn = trip.dnNumber || trip.deliveryNote?.dnNumber || 'DN-1001';
      setCustomDn(`${origDn}-DUP`);
      setSelectedDriverId(trip.driverId || (drivers[0]?.id ?? ''));
      setSelectedVehicleId(trip.vehicleId || (vehicles[0]?.id ?? ''));
      setQuantity(trip.quantity || 750);
      setPrice(trip.price || 1500);
      setDriverTripRate(trip.driverTripRate ?? trip.cost ?? 500);
    }
  }, [trip, drivers, vehicles]);

  if (!isOpen || !trip) return null;

  const handleDuplicate = () => {
    const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

    const newTrip = duplicateTrip(trip.id, {
      dnNumber: customDn.trim() || `${trip.dnNumber || 'DN-1000'}-COPY`,
      driverId: selectedDriverId,
      driverName: selectedDriver ? selectedDriver.name : trip.driverName,
      driverPhone: selectedDriver ? selectedDriver.phone : trip.driverPhone,
      vehicleId: selectedVehicleId,
      vehiclePlate: selectedVehicle ? selectedVehicle.plateNumber : trip.vehiclePlate,
      quantity: Number(quantity),
      price: Number(price),
      driverTripRate: Number(driverTripRate),
      cost: Number(driverTripRate),
    });

    if (newTrip) {
      if (onDuplicateSuccess) onDuplicateSuccess(newTrip);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        id={`duplicate-modal-${trip.id}`}
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between border-b border-blue-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-white flex items-center gap-2">
                Duplicate Logistics Operation
              </h3>
              <p className="text-xs text-blue-100 font-mono">
                Cloning from #{trip.tripNumber} ({trip.customerName || trip.companyName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] text-xs">
          {/* Info Banner */}
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-black text-blue-900 dark:text-blue-200 text-xs">
                Quick Operation Cloning
              </div>
              <p className="text-[11px] text-blue-800/90 dark:text-blue-300">
                This will create a new, distinct operation in status <strong>Assigned (Loading)</strong> with its own unique Trip ID and audit entry, carrying forward customer, route, and cargo specifications.
              </p>
            </div>
          </div>

          {/* Route Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Route &amp; Customer</span>
              <div className="font-black text-slate-900 dark:text-white text-xs">
                {trip.origin?.city} → {trip.destination?.city}
              </div>
              <div className="text-[11px] text-slate-500">{trip.customerName || trip.companyName}</div>
            </div>
            <div className="text-right space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Cargo</span>
              <div className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                {trip.itemName || 'Cargo'} ({trip.uom || 'BAG'})
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1 sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                New Delivery Note Number (DN No.) <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={customDn ?? ""}
                onChange={(e) => setCustomDn(e.target.value)}
                placeholder="e.g. DN-1002"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Assign Driver
              </label>
              <select
                value={selectedDriverId ?? ""}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Assign Vehicle / Truck
              </label>
              <select
                value={selectedVehicleId ?? ""}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.type.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Cargo Quantity ({trip.uom || 'BAG'})
              </label>
              <input
                type="number"
                value={quantity ?? ""}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Driver Trip Rate (SAR)
              </label>
              <input
                type="number"
                value={driverTripRate ?? ""}
                onChange={(e) => setDriverTripRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-emerald-600"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Freight Customer Price (SAR)
              </label>
              <input
                type="number"
                value={price ?? ""}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <Copy className="w-4 h-4" />
            <span>Duplicate &amp; Save Operation</span>
          </button>
        </div>
      </div>
    </div>
  );
};

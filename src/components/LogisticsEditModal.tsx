import React, { useState, useEffect } from 'react';
import { Trip, TripStatus, CargoType } from '../types';
import { useApp } from '../context/AppContext';
import {
  Edit3,
  X,
  Truck,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Save,
  Clock
} from 'lucide-react';

interface LogisticsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onSaveSuccess?: (tripId: string) => void;
}

export const LogisticsEditModal: React.FC<LogisticsEditModalProps> = ({
  isOpen,
  onClose,
  trip,
  onSaveSuccess,
}) => {
  const { drivers, vehicles, customers, locations, adminUpdateTrip, showToast } = useApp();

  const [dnNumber, setDnNumber] = useState<string>('');
  const [departureDate, setDepartureDate] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [status, setStatus] = useState<TripStatus>('in_transit');
  
  const [originCity, setOriginCity] = useState<string>('Jeddah');
  const [originName, setOriginName] = useState<string>('');
  const [originAddress, setOriginAddress] = useState<string>('');

  const [destCity, setDestCity] = useState<string>('Riyadh');
  const [destName, setDestName] = useState<string>('');
  const [destAddress, setDestAddress] = useState<string>('');

  const [itemName, setItemName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(750);
  const [uom, setUom] = useState<string>('BAG');
  const [cargoType, setCargoType] = useState<CargoType>('general');

  const [driverTripRate, setDriverTripRate] = useState<number>(500);
  const [price, setPrice] = useState<number>(1500);
  const [notes, setNotes] = useState<string>('');

  const [changeReason, setChangeReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (trip) {
      setDnNumber(trip.dnNumber || trip.deliveryNote?.dnNumber || 'DN-1001');
      setDepartureDate(trip.departureTime?.split(' ')[0] || '19-08-2026');
      setCustomerId(trip.customerId || '');
      setCustomerName(trip.customerName || trip.companyName || '');
      setDriverId(trip.driverId || '');
      setVehicleId(trip.vehicleId || '');
      setStatus(trip.status || 'in_transit');

      setOriginCity(trip.origin?.city || 'Jeddah');
      setOriginName(trip.origin?.name || '');
      setOriginAddress(trip.origin?.address || '');

      setDestCity(trip.destination?.city || 'Riyadh');
      setDestName(trip.destination?.name || '');
      setDestAddress(trip.destination?.address || '');

      setItemName(trip.itemName || 'Cargo');
      setQuantity(trip.quantity || 750);
      setUom(trip.uom || 'BAG');
      setCargoType(trip.cargoType || 'general');

      setDriverTripRate(trip.driverTripRate ?? trip.cost ?? 500);
      setPrice(trip.price || 1500);
      setNotes(trip.notes || trip.deliveryNote?.specialInstructions || '');
      setChangeReason('');
      setError('');
    }
  }, [trip]);

  if (!isOpen || !trip) return null;

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = customers.find((c) => c.id === e.target.value);
    if (selected) {
      setCustomerId(selected.id);
      setCustomerName(selected.name);
    }
  };

  const handleSave = () => {
    if (!changeReason.trim()) {
      setError('Please provide a mandatory reason for this modification for the Master Audit trail.');
      return;
    }

    const selectedDriver = drivers.find((d) => d.id === driverId);
    const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

    const auditId = adminUpdateTrip(
      trip.id,
      {
        dnNumber: dnNumber.trim(),
        departureTime: departureDate ? `${departureDate} 08:00` : trip.departureTime,
        customerId,
        customerName,
        companyName: customerName,
        driverId,
        driverName: selectedDriver ? selectedDriver.name : trip.driverName,
        driverPhone: selectedDriver ? selectedDriver.phone : trip.driverPhone,
        vehicleId,
        vehiclePlate: selectedVehicle ? selectedVehicle.plateNumber : trip.vehiclePlate,
        vehicleType: selectedVehicle ? selectedVehicle.type : trip.vehicleType,
        status,
        origin: {
          ...trip.origin,
          city: originCity,
          name: originName || `${originCity} Facility`,
          address: originAddress || `${originCity} Industrial Area`,
        },
        destination: {
          ...trip.destination,
          city: destCity,
          name: destName || `${destCity} Depot`,
          address: destAddress || `${destCity} Distribution Center`,
        },
        itemName,
        quantity: Number(quantity),
        uom,
        cargoType,
        driverTripRate: Number(driverTripRate),
        cost: Number(driverTripRate),
        price: Number(price),
        notes,
      },
      changeReason.trim()
    );

    if (auditId) {
      if (onSaveSuccess) onSaveSuccess(trip.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        id={`edit-modal-${trip.id}`}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-white flex items-center gap-2">
                Edit Logistics &amp; Operation Record
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Modifying #{trip.tripNumber} (DN #{dnNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar text-xs">
          {/* Audit Trail Mandatory Notice */}
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-900 dark:text-indigo-300">
              All modifications will be sealed into the <strong>Master Audit History Ledger</strong> with timestamp, previous snapshot comparison, and your admin role credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date & DN */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Operation Date (DD-MM-YYYY)
              </label>
              <input
                type="text"
                value={departureDate ?? ""}
                onChange={(e) => setDepartureDate(e.target.value)}
                placeholder="19-08-2026"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Delivery Note Number (DN No.)
              </label>
              <input
                type="text"
                value={dnNumber ?? ""}
                onChange={(e) => setDnNumber(e.target.value)}
                placeholder="DN-1001"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold"
              />
            </div>

            {/* Customer & Status */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Customer / Consignee
              </label>
              <select
                value={customerId ?? ""}
                onChange={handleCustomerChange}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Operational Status
              </label>
              <select
                value={status ?? ""}
                onChange={(e) => setStatus(e.target.value as TripStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-bold"
              >
                <option value="assigned">ASSIGNED</option>
                <option value="loading">LOADING</option>
                <option value="in_transit">IN TRANSIT</option>
                <option value="arrived">ARRIVED</option>
                <option value="delivered">DELIVERED</option>
                <option value="cancelled">CANCELLED</option>
              </select>
            </div>

            {/* Driver & Vehicle */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Driver
              </label>
              <select
                value={driverId ?? ""}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Truck / Vehicle Plate
              </label>
              <select
                value={vehicleId ?? ""}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.type.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Route */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Origin City
              </label>
              <input
                type="text"
                value={originCity ?? ""}
                onChange={(e) => setOriginCity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Destination City
              </label>
              <input
                type="text"
                value={destCity ?? ""}
                onChange={(e) => setDestCity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Cargo */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Cargo Item Name
              </label>
              <input
                type="text"
                value={itemName ?? ""}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Quantity &amp; UOM
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={quantity ?? ""}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-2/3 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
                <input
                  type="text"
                  value={uom ?? ""}
                  onChange={(e) => setUom(e.target.value)}
                  className="w-1/3 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Driver Trip Rate (SAR)
              </label>
              <input
                type="number"
                value={driverTripRate ?? ""}
                onChange={(e) => setDriverTripRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                Freight Customer Price (SAR)
              </label>
              <input
                type="number"
                value={price ?? ""}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
              Operational Notes &amp; Special Instructions
            </label>
            <input
              type="text"
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fragile shipment, client requires 2-hour advance notice before arrival"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Mandatory Reason for Master Audit */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
            <label className="block font-black text-amber-950 dark:text-amber-200 text-xs">
              Mandatory Reason for Modification <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={changeReason ?? ""}
              onChange={(e) => {
                setChangeReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Corrected truck plate number after breakdown, updated customer agreed rate..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
            {error && <p className="text-[11px] text-rose-500 font-bold">{error}</p>}
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
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Save &amp; Audit Seal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

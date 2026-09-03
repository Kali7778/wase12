import React, { useState, useEffect } from 'react';
import { BrokerLoad } from '../types';
import { useApp } from '../context/AppContext';
import { X, Truck, User, CheckCircle2, AlertCircle, Hash, MapPin, Calendar } from 'lucide-react';

interface BrokerAssignDriverTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
  load: BrokerLoad | null;
}

export const BrokerAssignDriverTruckModal: React.FC<BrokerAssignDriverTruckModalProps> = ({
  isOpen,
  onClose,
  load,
}) => {
  const { drivers, vehicles, assignBrokerDriverTruck, showToast } = useApp();

  const [driverId, setDriverId] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [tlbNo, setTlbNo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (load) {
      setDriverId(load.assignedDriverId || '');
      setTruckPlate(load.assignedTruckPlate || '');
      setTlbNo(load.assignedTruckTlbNo || '');
      setError('');
    }
  }, [load, isOpen]);

  if (!isOpen || !load) return null;

  const handleDriverSelect = (selectedId: string) => {
    setDriverId(selectedId);
    if (selectedId) {
      const d = drivers.find((drv) => drv.id === selectedId);
      if (d?.assignedVehiclePlate && !truckPlate) {
        setTruckPlate(d.assignedVehiclePlate);
        setTlbNo(`TLB-${d.assignedVehiclePlate.replace(/\D/g, '') || '9101'}`);
      }
    }
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) {
      setError('Please select a driver to assign.');
      return;
    }
    if (!truckPlate.trim()) {
      setError('Please provide a vehicle plate or select an assigned truck.');
      return;
    }

    assignBrokerDriverTruck(load.id, driverId, truckPlate.trim(), tlbNo.trim() || undefined);
    onClose();
  };

  const selectedDriverObj = drivers.find((d) => d.id === driverId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Assign Driver &amp; Truck</h2>
              <p className="text-xs text-slate-400">
                Broker Consignment: <strong className="text-amber-400 font-mono">{load.dnNumber}</strong>
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

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Consignment Quick Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
            <div className="flex justify-between items-center font-bold">
              <span className="text-slate-500 dark:text-slate-400">Broker:</span>
              <span className="text-slate-900 dark:text-white">{load.brokerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Material:</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">{load.materialItem}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Stops:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                {load.dropLocations?.length || 0} Drop Locations
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Driver */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>Select Driver *</span>
            </label>
            <select
              id="assign-driver-select"
              value={driverId}
              onChange={(e) => handleDriverSelect(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Choose Assigned Driver --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — Status: {d.status} ({d.assignedVehiclePlate || 'No Truck'})
                </option>
              ))}
            </select>
            {selectedDriverObj && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-0.5">
                <span>Phone: <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedDriverObj.phone}</strong></span>
                <span>•</span>
                <span>License: <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedDriverObj.licenseNumber}</strong></span>
              </p>
            )}
          </div>

          {/* Select / Enter Truck */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-500" />
              <span>Assigned Truck Plate *</span>
            </label>
            <div className="flex gap-2">
              <input
                id="assign-truck-plate"
                type="text"
                list="truck-plate-list"
                value={truckPlate}
                onChange={(e) => setTruckPlate(e.target.value)}
                placeholder="e.g. T-101 / KSA 1120 XAA"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <datalist id="truck-plate-list">
                {vehicles.map((v) => (
                  <option key={v.id} value={v.plateNumber}>
                    {v.plateNumber} ({v.model})
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* TLB No. */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-500" />
              <span>Assigned TLB No.</span>
            </label>
            <input
              id="assign-tlb-number"
              type="text"
              value={tlbNo}
              onChange={(e) => setTlbNo(e.target.value)}
              placeholder="e.g. TLB-91042"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-assign-driver-truck-btn"
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-blue-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Assignment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

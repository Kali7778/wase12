import React, { useState } from 'react';
import { BrokerLoad } from '../types';
import { useApp } from '../context/AppContext';
import { X, Plus, MapPin, Layers, AlertCircle } from 'lucide-react';

interface BrokerAddDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  load: BrokerLoad | null;
}

export const BrokerAddDropModal: React.FC<BrokerAddDropModalProps> = ({
  isOpen,
  onClose,
  load,
}) => {
  const { addBrokerDropLocation, showToast } = useApp();

  const [dropLocation, setDropLocation] = useState('');
  const [deliveryQty, setDeliveryQty] = useState<number | ''>(150);
  const [unit, setUnit] = useState('BAG');
  const [status, setStatus] = useState<'Pending' | 'In Transit' | 'Delivered'>('Pending');
  const [error, setError] = useState('');

  if (!isOpen || !load) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropLocation.trim()) {
      setError('Please provide a destination drop location.');
      return;
    }

    addBrokerDropLocation(load.id, {
      dropLocation: dropLocation.trim(),
      deliveryQty: Number(deliveryQty) || 0,
      unit,
      status,
    });

    setDropLocation('');
    setDeliveryQty(150);
    setError('');
    onClose();
  };

  const nextStopNumber = (load.dropLocations?.length || 0) + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Add Drop Location</h2>
              <p className="text-xs text-slate-400">
                Stop #{nextStopNumber} for DN: <strong className="font-mono text-amber-400">{load.dnNumber}</strong>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drop Location */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span>Drop Location (Stop #{nextStopNumber}) *</span>
            </label>
            <input
              type="text"
              value={dropLocation}
              onChange={(e) => setDropLocation(e.target.value)}
              placeholder="e.g. Riyadh Exit 14 Construction Site B"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Delivery Qty */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Delivery Qty *
              </label>
              <input
                type="number"
                min="1"
                value={deliveryQty}
                onChange={(e) => setDeliveryQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Unit */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value="BAG">BAG (كيس)</option>
                <option value="TON">TON (طن)</option>
                <option value="PALLET">PALLET (طبلية)</option>
                <option value="PCS">PCS (قطعة)</option>
                <option value="CBM">CBM (م³)</option>
              </select>
            </div>
          </div>

          {/* Initial Status */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Stop Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none"
            >
              <option value="Pending">Pending (قيد الانتظار)</option>
              <option value="In Transit">In Transit (في الطريق)</option>
              <option value="Delivered">Delivered (تم التسليم)</option>
            </select>
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
              id="submit-add-drop-btn"
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stop</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

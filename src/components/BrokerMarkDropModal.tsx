import React, { useState, useEffect } from 'react';
import { BrokerLoad, BrokerDropLocation } from '../types';
import { useApp } from '../context/AppContext';
import { X, CheckCircle2, MapPin, User, Phone, FileText, Clock, PackageCheck } from 'lucide-react';

interface BrokerMarkDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  load: BrokerLoad | null;
  drop: BrokerDropLocation | null;
}

export const BrokerMarkDropModal: React.FC<BrokerMarkDropModalProps> = ({
  isOpen,
  onClose,
  load,
  drop,
}) => {
  const { updateBrokerDropStatus } = useApp();

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveredTime, setDeliveredTime] = useState('');

  useEffect(() => {
    if (drop) {
      setRecipientName(drop.recipientName || '');
      setRecipientPhone(drop.recipientPhone || '');
      setNotes(drop.notes || 'Goods inspected and received in full at destination bay.');
      const now = new Date();
      setDeliveredTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString());
    }
  }, [drop, isOpen]);

  if (!isOpen || !load || !drop) return null;

  const handleConfirmDelivered = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrokerDropStatus(load.id, drop.id, 'Delivered', {
      deliveredAt: deliveredTime,
      recipientName: recipientName.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Mark Drop Stop Delivered</h2>
              <p className="text-xs text-emerald-100">
                Stop #{drop.stopNumber}: {drop.dropLocation}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleConfirmDelivered} className="p-6 space-y-4">
          {/* Drop Info Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Stop #{drop.stopNumber} Location:
              </span>
              <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                {drop.deliveryQty} {drop.unit || 'BAG'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {drop.dropLocation}
            </p>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Consignment: <strong className="font-mono">{load.dnNumber}</strong> ({load.materialItem})
            </div>
          </div>

          {/* Delivery Timestamp */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Delivered Date &amp; Time</span>
            </label>
            <input
              type="text"
              value={deliveredTime}
              onChange={(e) => setDeliveredTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Recipient Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-500" />
              <span>Recipient / Receiving Engineer Name</span>
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Hassan Al-Otaibi / Site Engineer"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Recipient Phone */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              <span>Recipient Phone (Optional)</span>
            </label>
            <input
              type="text"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="e.g. +966 50 123 4567"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Receiving Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>Delivery Remarks &amp; POD Notes</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Unloaded safely at bay; inspected without damage..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
              id="confirm-drop-delivered-btn"
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Stop Delivered</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

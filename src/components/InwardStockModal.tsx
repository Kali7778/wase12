import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trip } from '../types';
import {
  X,
  PackageCheck,
  Truck,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  MapPin,
  Calendar,
  Lock,
  ArrowDownCircle
} from 'lucide-react';

interface InwardStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
}

export const InwardStockModal: React.FC<InwardStockModalProps> = ({ isOpen, onClose, trip }) => {
  const { inwardCompanyStock, activeRole, users } = useApp();

  const [verifiedQty, setVerifiedQty] = useState<number>(
    trip?.reservedQuantity || trip?.quantity || 500
  );
  const [verifiedNotes, setVerifiedNotes] = useState<string>(
    'Supplier delivery slip verified and physical count matches. Inward stock accepted into Admin Central Warehouse.'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !trip) return null;

  const currentUserName = users.find((u) => u.role === activeRole)?.name || 'Admin Warehouse Lead';
  const supplierDn = trip.reservedDnNo || trip.dnNumber || trip.deliveryNote?.dnNumber || 'DN-001';

  const handleInwardConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = inwardCompanyStock({
      tripId: trip.id,
      verifiedQty: Number(verifiedQty),
      verifiedNotes,
      adminName: currentUserName,
    });
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        id="inward-stock-modal"
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <ArrowDownCircle className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Inward Stock Verification</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-emerald-800 font-black uppercase">
                  Step 5 &amp; 6
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                Verify supplier delivery and move TLB cargo from Reserved into Main Available Inventory.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Body */}
        <form onSubmit={handleInwardConfirm} className="p-6 space-y-5 text-xs">
          {/* Load Summary Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                Load ID: {trip.companyLoadId || trip.tripNumber}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold">
                DN Ref: {supplierDn}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-[10px] text-slate-400 block">Driver</span>
                <span className="font-bold">{trip.driverName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Truck Plate</span>
                <span className="font-mono font-bold">{trip.vehiclePlate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Supplier / Origin</span>
                <span className="font-semibold truncate block">{trip.origin.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Destination</span>
                <span className="font-semibold truncate block">{trip.destination.name}</span>
              </div>
            </div>
          </div>

          {/* Quantity Verification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Verified Inward Quantity (TLB Units / Bags) *
              </label>
              <input
                type="number"
                min="1"
                value={verifiedQty ?? ""}
                onChange={(e) => setVerifiedQty(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-base text-emerald-600 dark:text-emerald-400"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Reserved for this load: {trip.reservedQuantity || trip.quantity || 500} {trip.uom || 'BAG'}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Admin Verifier Name
              </label>
              <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>{currentUserName} ({activeRole.toUpperCase()})</span>
              </div>
            </div>
          </div>

          {/* Delivery Slip Photo if attached */}
          {trip.slipImageUrl && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-500" /> Driver Delivery Slip (POD)
              </span>
              <img
                src={trip.slipImageUrl}
                alt="Delivery Slip"
                className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Inward Inspection &amp; Tally Notes
            </label>
            <textarea
              rows={2}
              value={verifiedNotes ?? ""}
              onChange={(e) => setVerifiedNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Master Audit Guarantee Banner */}
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Automated Inventory Transition &amp; Master Audit:</span>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                Clicking &quot;INWARD STOCK&quot; releases {trip.reservedQuantity || verifiedQty} from <em>Reserved</em> status and injects +{verifiedQty} {trip.uom || 'BAG'} into <strong>TLB Main Inventory Available Stock</strong>. A SHA-256 sealed audit entry is logged to the GM/CEO Master Audit.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-2"
            >
              <PackageCheck className="w-4 h-4" />
              <span>[ INWARD STOCK ]</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

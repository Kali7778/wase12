import React, { useState } from 'react';
import { Trip } from '../types';
import {
  X,
  Trash2,
  ShieldAlert,
  Calendar,
  Truck,
  User,
  MapPin,
  FileText
} from 'lucide-react';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  trip?: Trip | null;
  onConfirmDelete?: (tripId: string, reason: string, hardDelete: boolean) => void;
  onConfirm?: (reason?: string) => void;
  title?: string;
  message?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  requireReason?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  trip,
  onConfirmDelete,
  onConfirm,
  title,
  message,
  description,
  confirmText,
  cancelText,
  requireReason = false,
}) => {
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isPermanent, setIsPermanent] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setReason('');
    setError('');
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const handleConfirm = () => {
    // If trip deletion specifically
    if (trip && onConfirmDelete) {
      if (!reason.trim()) {
        setError('Please provide a specific reason for deleting this logistics operation record for the Master Audit trail.');
        return;
      }
      setError('');
      onConfirmDelete(trip.id, reason.trim(), isPermanent);
      setReason('');
      handleClose();
      return;
    }

    // If generic item deletion requiring reason
    if (requireReason && !reason.trim()) {
      setError('Please provide a reason for this deletion action.');
      return;
    }

    setError('');
    if (onConfirm) {
      onConfirm(reason.trim());
    }
    setReason('');
    handleClose();
  };

  const modalTitle = title || (trip ? 'Delete Logistics Operation' : 'Confirm Deletion');
  const modalMessage = message || description || (trip ? `Delete Trip #${trip.tripNumber}` : 'Are you sure you want to permanently delete this record?');
  const buttonLabel = confirmText || (trip ? 'Confirm Deletion' : 'Delete');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        id={trip ? `delete-confirm-${trip.id}` : 'generic-delete-confirm-modal'}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between border-b border-rose-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-white flex items-center gap-2">
                {modalTitle}
              </h3>
              {trip && (
                <p className="text-xs text-rose-100 font-mono">
                  Trip #{trip.tripNumber} • DN #{trip.dnNumber || trip.deliveryNote?.dnNumber || 'DN-N/A'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-rose-200 hover:text-white hover:bg-rose-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Audit Protection Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-black text-amber-900 dark:text-amber-200 text-xs">
                Master Audit Trail &amp; Deletion Record
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300 leading-relaxed">
                {trip
                  ? 'By default, this record will be archived and soft-deleted. All previous logs, delivery notes, and route changes will remain permanently preserved in the Audit History Ledger.'
                  : modalMessage}
              </p>
            </div>
          </div>

          {/* Trip Summary Card if trip provided */}
          {trip && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Record to be Deleted:
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date: <strong>{trip.departureTime?.split(' ')[0] || '19-08-2026'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>DN: <strong>{trip.dnNumber || trip.deliveryNote?.dnNumber || 'DN-1001'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer: <strong>{trip.customerName || trip.companyName}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Driver: <strong>{trip.driverName}</strong> ({trip.vehiclePlate})</span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Route: <strong>{trip.origin?.city} → {trip.destination?.city}</strong></span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {trip.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}

          {/* Reason Input (Mandatory for Trips or when requireReason is set, otherwise optional audit reason) */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
              Reason for Deletion {trip || requireReason ? <span className="text-rose-500">* (Required for Audit History)</span> : <span className="text-slate-400 font-normal">(Optional note for audit)</span>}
            </label>
            <textarea
              rows={trip ? 3 : 2}
              value={reason ?? ""}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={trip ? "e.g. Duplicate entry logged in error, Client cancelled shipment..." : "Add audit note or reason for deletion..."}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
            />
            {error && <p className="text-[11px] text-rose-500 font-bold">{error}</p>}
          </div>

          {/* Optional hard purge toggle for trips */}
          {trip && (
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span>Permanent Purge (Remove completely from database after logging audit)</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            {cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <Trash2 className="w-4 h-4" />
            <span>{buttonLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

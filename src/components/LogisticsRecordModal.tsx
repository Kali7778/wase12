import React from 'react';
import { Trip } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/i18n';
import {
  FileText,
  X,
  Truck,
  User,
  MapPin,
  Calendar,
  Clock,
  Boxes,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  Share2,
  Download,
  Layers,
  Edit3,
  Trash2,
  History,
  Barcode,
  Navigation
} from 'lucide-react';

interface LogisticsRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onEdit?: (trip: Trip) => void;
  onDuplicate?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
  onHistory?: (trip: Trip) => void;
}

export const LogisticsRecordModal: React.FC<LogisticsRecordModalProps> = ({
  isOpen,
  onClose,
  trip,
  onEdit,
  onDuplicate,
  onDelete,
  onHistory,
}) => {
  const { setSelectedTripForDn, activeRole } = useApp();

  if (!isOpen || !trip) return null;

  const dn = trip.deliveryNote;
  const dnNumber = trip.dnNumber || dn?.dnNumber || 'DN-1001';
  const margin = (trip.price || 0) - (trip.driverTripRate ?? trip.cost ?? 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        id={`logistics-record-view-${trip.id}`}
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">
                  Logistics &amp; Operations Dossier
                </span>
                <span className="font-mono font-black text-base text-white">{trip.tripNumber}</span>
                {trip.isDeleted && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                    DELETED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                DN #{dnNumber} • Date: {trip.departureTime || '19-08-2026'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                trip.status === 'delivered'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : trip.status === 'in_transit'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : trip.status === 'loading'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : trip.status === 'cancelled'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {trip.status.replace('_', ' ')}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTripForDn(trip)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Inspect Delivery Note</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {activeRole === 'admin' && onEdit && (
              <button
                onClick={() => onEdit(trip)}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(trip)}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
            )}
            {onHistory && (
              <button
                onClick={() => onHistory(trip)}
                className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
              </button>
            )}
            {activeRole === 'admin' && onDelete && !trip.isDeleted && (
              <button
                onClick={() => onDelete(trip)}
                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Dossier Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar text-xs">
          {/* Key Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Date</span>
              <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                {trip.departureTime?.split(' ')[0] || '19-08-2026'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">DN Number</span>
              <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                {dnNumber}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Customer Price</span>
              <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                {formatCurrency(trip.price || 0)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Driver Rate</span>
              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                {formatCurrency(trip.driverTripRate ?? trip.cost ?? 0)}
              </div>
            </div>
          </div>

          {/* Route Section */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-black uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-500" />
              <span>Route &amp; Transit Waypoints</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>ORIGIN (PICKUP)</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {trip.origin.city}
                </div>
                <div className="text-slate-500 text-[11px]">{trip.origin.name || trip.origin.address}</div>
                {trip.origin.address && trip.origin.name && (
                  <div className="text-slate-400 text-[10px]">{trip.origin.address}</div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>DESTINATION (DROP)</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {trip.destination.city}
                </div>
                <div className="text-slate-500 text-[11px]">{trip.destination.name || trip.destination.address}</div>
                {trip.destination.address && trip.destination.name && (
                  <div className="text-slate-400 text-[10px]">{trip.destination.address}</div>
                )}
              </div>
            </div>
          </div>

          {/* Customer, Driver & Truck Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <h4 className="font-black uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>Customer Details</span>
              </h4>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {trip.customerName || trip.companyName}
                </div>
                {trip.customerNumber && (
                  <div className="text-slate-400 font-mono text-[11px]">Acct: {trip.customerNumber}</div>
                )}
                {dn?.receiverContact && (
                  <div className="text-slate-500 text-[11px]">Contact: {dn.receiverContact}</div>
                )}
                {dn?.receiverVatNumber && (
                  <div className="text-slate-500 text-[11px]">VAT: {dn.receiverVatNumber}</div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <h4 className="font-black uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-500" />
                <span>Driver &amp; Vehicle Allocation</span>
              </h4>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {trip.driverName}
                </div>
                <div className="text-slate-500 text-[11px]">Phone: {trip.driverPhone}</div>
                <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    Plate: {trip.vehiclePlate}
                  </span>
                  <span className="text-slate-400 capitalize">
                    {trip.vehicleType?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cargo Itemization */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-black uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-emerald-500" />
              <span>Manifest Cargo &amp; Loading Specifications</span>
            </h4>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px]">Product / Material</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {trip.itemName || 'Industrial Cargo'}
                </div>
                {trip.itemNumber && (
                  <div className="text-slate-400 font-mono text-[10px]">SKU: {trip.itemNumber}</div>
                )}
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px]">Quantity</span>
                <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                  {trip.quantity || 750} {trip.uom || 'BAG'}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px]">Cargo Type</span>
                <div className="font-bold text-slate-700 dark:text-slate-300 capitalize text-xs">
                  {trip.cargoType || 'General'}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px]">Total Weight</span>
                <div className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                  {(trip.quantity || 750) * 40} kg
                </div>
              </div>
            </div>
          </div>

          {/* Route Shift Details (If applicable) */}
          {trip.hasRouteShift && trip.routeShifts && trip.routeShifts.length > 0 && (
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-2">
              <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>In-Transit Route Shift Executed</span>
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
                This operation had an active route shift applied during transit. Preserved original DN #{trip.dnNumber}. 
                Delivered <strong>{trip.directSaleQuantity} units</strong> to shifted customer, with <strong>{trip.remainingInwardQuantity} units</strong> destined for warehouse inward.
              </p>
            </div>
          )}

          {/* Master Audit Seal Stamp */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>
                Master Audit Ledger Protection Active
                {trip.managerAuditRef && ` • Ref: ${trip.managerAuditRef}`}
              </span>
            </div>
            <span className="font-mono text-[10px]">
              {trip.lastModifiedAt ? `Updated: ${trip.lastModifiedAt}` : `Created: ${trip.departureTime}`}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

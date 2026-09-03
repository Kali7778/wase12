import React from 'react';
import { useApp } from '../context/AppContext';
import { Trip } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  X,
  Truck,
  MapPin,
  Calendar,
  Clock,
  User,
  Boxes,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Printer,
  Download,
  Share2,
  AlertCircle,
  PackageCheck
} from 'lucide-react';

interface TripDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onOpenInwardModal?: (trip: Trip) => void;
}

export const TripDossierModal: React.FC<TripDossierModalProps> = ({
  isOpen,
  onClose,
  trip,
  onOpenInwardModal
}) => {
  const { setSelectedTripForDn, createTaxInvoiceFromTrip } = useApp();

  if (!isOpen || !trip) return null;

  const dn = trip.deliveryNote;
  const dnNumber = trip.dnNumber || dn?.dnNumber || 'DN-001';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        id={`trip-dossier-${trip.id}`}
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-blue-400 font-bold">TRIP DOSSIER</span>
                <span className="font-mono font-black text-lg text-white">{trip.tripNumber}</span>
                {trip.isCompanyLoad && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold">
                    Load #{trip.companyLoadId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                DN No: {dnNumber} • Created: {trip.departureTime || '17-Aug-2026'}
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

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar text-xs">
          {/* Company Load Banner (If Applicable) */}
          {trip.isCompanyLoad && (
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-black text-purple-950 dark:text-purple-200">
                    Company Load &amp; TLB Inventory Linkage
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 font-bold font-mono">
                    {trip.companyLoadStage?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Reserved {trip.reservedQuantity || trip.quantity} {trip.uom || 'BAG'} from Batch <strong>{trip.reservedDnNo || dnNumber}</strong>.
                  {trip.inwardReceivedAt ? ` Inward verified on ${trip.inwardReceivedAt} by ${trip.inwardReceivedBy}.` : ' Awaiting Admin arrival for Stock Inward.'}
                </p>
              </div>

              {trip.status !== 'delivered' && onOpenInwardModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInwardModal(trip);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer shrink-0"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>[ INWARD STOCK ]</span>
                </button>
              )}
            </div>
          )}

          {/* Key Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Driver</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                {trip.driverName}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{trip.driverPhone}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Truck Plate</span>
              <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                {trip.vehiclePlate}
              </span>
              <span className="text-[10px] text-slate-500 capitalize">{trip.vehicleType.replace('_', ' ')}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Cargo &amp; Qty</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                {trip.itemName || dn?.items?.[0]?.name || 'TLB'}
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {trip.quantity || dn?.packagesCount || 20} {trip.uom || dn?.items?.[0]?.unit || 'BAG'} ({((dn?.totalWeightKg || 0)).toLocaleString()} kg)
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Driver Trip Rate</span>
              <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                SAR {trip.driverTripRate ?? trip.cost ?? 500}
              </span>
              <span className="text-[10px] text-slate-500">Freight: {formatCurrency(trip.price)}</span>
            </div>
          </div>

          {/* Route & Progress */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" /> Origin &amp; Destination Waypoints
              </span>
              <span className="text-[11px] font-mono text-slate-400">Progress: {trip.progressPercent}%</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase">
                  <MapPin className="w-3 h-3 text-blue-500" /> Pickup Location (Origin)
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-xs">{trip.origin.name}</div>
                <div className="text-slate-500 text-[11px]">{trip.origin.address || trip.origin.city}</div>
                <div className="text-[10px] font-mono text-slate-400">Departure: {trip.departureTime}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase">
                  <MapPin className="w-3 h-3 text-emerald-500" /> Drop Location (Destination)
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-xs">{trip.destination.name}</div>
                <div className="text-slate-500 text-[11px]">{trip.destination.address || trip.destination.city}</div>
                <div className="text-[10px] font-mono text-slate-400">
                  {trip.completedTime ? `Delivered: ${trip.completedTime}` : `Estimated Arrival: ${trip.estimatedArrivalTime}`}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                style={{ width: `${trip.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Delivery Note & POD Details */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" /> Delivery Slip &amp; Proof of Delivery (POD)
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                DN #{dnNumber}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Receiver Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{dn?.receiverName || trip.customerName}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Receiver Signature</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {dn?.receiverSignature || 'Signed by Customer Representative'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Slip Status</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase font-mono">
                  {trip.slipStatus || 'Cleared'}
                </span>
              </div>
            </div>

            {trip.slipImageUrl && (
              <div className="mt-2">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">Attached Slip Image:</span>
                <img
                  src={trip.slipImageUrl}
                  alt="Delivery Slip"
                  className="w-full max-h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                />
              </div>
            )}
          </div>

          {/* Master Audit & Compliance Seal */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-purple-200">Master Audit Integrity Reference</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                {trip.managerAuditRef || 'AUD-SHA256-SEALED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              All state transitions, driver reassignments, and inventory reserves linked to Trip ID <strong>{trip.tripNumber}</strong> are immutable and recorded in the CEO/GM Master Audit.
            </p>
            {trip.isRetroactive && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono">
                Post-Delivery Addition: Created at {trip.retroactiveCreatedAt} with Reason: &quot;{trip.retroactiveReason}&quot;
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-xs"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                setSelectedTripForDn(trip);
              }}
              className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Delivery Note</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                createTaxInvoiceFromTrip(trip.id);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Generate Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Trip, LogisticsEditHistoryEntry, MasterAuditRecord } from '../types';
import { useApp } from '../context/AppContext';
import {
  History,
  X,
  Clock,
  User,
  ShieldCheck,
  FileText,
  Truck,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Trash2,
  Edit3,
  PlusCircle,
  Copy
} from 'lucide-react';

interface LogisticsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onRestore?: (tripId: string) => void;
}

export const LogisticsHistoryModal: React.FC<LogisticsHistoryModalProps> = ({
  isOpen,
  onClose,
  trip,
  onRestore,
}) => {
  const { masterAudits, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!isOpen || !trip) return null;

  const dnNumber = trip.dnNumber || trip.deliveryNote?.dnNumber || 'DN-1001';

  // Find all master audit entries that match this trip number or DN number
  const relatedAudits = masterAudits.filter((a) => {
    const ref = a.recordRef.toLowerCase();
    return (
      ref.includes(trip.tripNumber.toLowerCase()) ||
      (dnNumber && ref.includes(dnNumber.toLowerCase())) ||
      (trip.companyLoadId && ref.includes(trip.companyLoadId.toLowerCase()))
    );
  });

  // Combine trip edit history and audit records into unified timeline
  const editHistoryList: LogisticsEditHistoryEntry[] = trip.editHistory || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied', 'Audit hash / reference copied to clipboard.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        id={`logistics-history-${trip.id}`}
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">
                  Audit History &amp; Modification Trail
                </span>
                <span className="font-mono font-black text-base text-white">{trip.tripNumber}</span>
                {trip.isDeleted && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                    DELETED / ARCHIVED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                DN #{dnNumber} • Customer: {trip.customerName || trip.companyName} • Driver: {trip.driverName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trip.isDeleted && onRestore && (
              <button
                type="button"
                onClick={() => {
                  onRestore(trip.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Record</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Overview Banner */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400">Created:</span>{' '}
              <strong>{trip.departureTime || '19-08-2026'}</strong>
            </div>
            <div>
              <span className="text-slate-400">Total Edits:</span>{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">{editHistoryList.length}</strong>
            </div>
            <div>
              <span className="text-slate-400">Master Audit Logs:</span>{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">{relatedAudits.length}</strong>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm ?? ""}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history logs..."
              className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar text-xs">
          {/* Deletion Warning Banner if record is deleted */}
          {trip.isDeleted && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-black text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
                  <span>Record Soft-Deleted &amp; Preserved in Archive</span>
                  <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400">
                    ({trip.deletedAt})
                  </span>
                </div>
                <p className="text-[11px] text-rose-800 dark:text-rose-300">
                  <strong>Deleted By:</strong> {trip.deletedBy || 'Admin Officer'} • <strong>Reason:</strong> {trip.deletedReason || 'Admin deletion'}
                </p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400">
                  This record is preserved in the system's deletion audit trail to ensure zero data loss.
                </p>
              </div>
            </div>
          )}

          {/* Section: Operational Edit History */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-500" />
              <span>Direct Admin &amp; Manager Modifications ({editHistoryList.length})</span>
            </h4>

            {editHistoryList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-400 text-center text-xs">
                No direct edits recorded for this trip.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {editHistoryList.map((entry) => (
                  <div key={entry.id} className="relative space-y-1.5">
                    {/* Circle marker */}
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900" />

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 dark:text-white text-xs">
                            {entry.modifiedBy}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase">
                            {entry.modifiedByRole}
                          </span>
                        </div>
                        <span className="font-mono text-slate-400 text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {entry.timestamp}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-700 dark:text-slate-200">
                        <strong className="text-slate-500">Reason:</strong> {entry.reason}
                      </div>

                      {entry.changesSummary && (
                        <div className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] font-mono text-indigo-900 dark:text-indigo-200">
                          {entry.changesSummary}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Route Shift History (if applicable) */}
          {trip.hasRouteShift && trip.routeShifts && trip.routeShifts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>In-Transit Route Shift Logs ({trip.routeShifts.length})</span>
              </h4>

              <div className="space-y-2">
                {trip.routeShifts.map((rs) => (
                  <div
                    key={rs.id}
                    className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                        <span>Route Shift #{rs.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 uppercase font-bold">
                          {rs.shiftStatus.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400">
                        {rs.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800 dark:text-purple-300">
                      <strong>Shifted By:</strong> {rs.shiftedBy} • <strong>Shifted Quantity:</strong> {rs.shiftedQuantity} units to {rs.shiftedCustomer?.name} ({rs.shiftedDestination?.city}) • <strong>Remaining for Inward:</strong> {rs.remainingWarehouseQuantity} units.
                    </p>
                    <p className="text-[10px] text-purple-700 dark:text-purple-400">
                      <strong>Reason:</strong> {rs.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Master Audit Ledger immutable records */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Immutable Master Audit Ledger Records ({relatedAudits.length})</span>
            </h4>

            {relatedAudits.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-400 text-center text-xs">
                No matching Master Audit entries found for this reference.
              </div>
            ) : (
              <div className="space-y-2.5">
                {relatedAudits.map((audit) => (
                  <div
                    key={audit.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                          #{audit.id}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-black text-[10px]">
                          {audit.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">{audit.timestamp}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(audit.immutableRecordHash)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Copy Master Hash"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400">Actor:</span>{' '}
                        <strong>{audit.user}</strong> ({audit.userRole})
                      </div>
                      <div>
                        <span className="text-slate-400">Approved By:</span>{' '}
                        <strong>{audit.approvedBy || 'System'}</strong>
                      </div>
                    </div>

                    {audit.delta && (
                      <div className="text-[11px] font-mono p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50">
                        {audit.delta}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500">
                      <strong>Reason:</strong> {audit.reason}
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1">
                      <span>Ref: {audit.recordRef}</span>
                      <span className="truncate max-w-[200px]">Hash: {audit.immutableRecordHash.substring(0, 16)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Protected by Master Audit Immutable System
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer transition-colors"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Trip, TripStatus } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/i18n';
import {
  FileText,
  Search,
  Plus,
  Edit3,
  Trash2,
  Copy,
  History,
  Eye,
  RotateCcw,
  Truck,
  User,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  Download,
  Filter
} from 'lucide-react';
import { LogisticsRecordModal } from './LogisticsRecordModal';
import { LogisticsEditModal } from './LogisticsEditModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { DuplicateRecordModal } from './DuplicateRecordModal';
import { LogisticsHistoryModal } from './LogisticsHistoryModal';

interface LogisticsOperationsTableProps {
  onAddNewTrip?: () => void;
}

export const LogisticsOperationsTable: React.FC<LogisticsOperationsTableProps> = ({
  onAddNewTrip,
}) => {
  const { trips, deleteTrip, restoreTrip, setSelectedTripForDn, activeRole } = useApp();

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Modals state
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [duplicatingTrip, setDuplicatingTrip] = useState<Trip | null>(null);
  const [historyTrip, setHistoryTrip] = useState<Trip | null>(null);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // Archive filter
      if (showArchived) {
        if (!t.isDeleted) return false;
      } else {
        if (t.isDeleted) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const dn = (t.dnNumber || t.deliveryNote?.dnNumber || '').toLowerCase();
        const tripNum = (t.tripNumber || '').toLowerCase();
        const cust = (t.customerName || t.companyName || '').toLowerCase();
        const driver = (t.driverName || '').toLowerCase();
        const truck = (t.vehiclePlate || '').toLowerCase();
        const route = `${t.origin?.city} ${t.destination?.city}`.toLowerCase();
        const item = (t.itemName || '').toLowerCase();

        return (
          dn.includes(q) ||
          tripNum.includes(q) ||
          cust.includes(q) ||
          driver.includes(q) ||
          truck.includes(q) ||
          route.includes(q) ||
          item.includes(q)
        );
      }

      return true;
    });
  }, [trips, showArchived, statusFilter, searchTerm]);

  const activeCount = trips.filter((t) => !t.isDeleted).length;
  const deletedCount = trips.filter((t) => t.isDeleted).length;

  const handleConfirmDelete = (tripId: string, reason: string, hardDelete: boolean) => {
    deleteTrip(tripId, reason, hardDelete);
  };

  const handleRestore = (tripId: string) => {
    restoreTrip(tripId, 'Restored via Logistics Operations Table');
  };

  return (
    <div id="logistics-operations-table-container" className="space-y-4">
      {/* Top Controls & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm ?? ""}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Date, DN No, Customer, Driver, Truck, Route..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filters & Archive Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['ALL', 'in_transit', 'delivered', 'loading', 'assigned', 'cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              showArchived
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>
              {showArchived ? `Viewing Archived (${deletedCount})` : `Show Deleted Archive (${deletedCount})`}
            </span>
          </button>

          {onAddNewTrip && (
            <button
              type="button"
              onClick={onAddNewTrip}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>New Operation</span>
            </button>
          )}
        </div>
      </div>

      {/* Suggested Table Layout */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">DN No.</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Truck</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold">
                        {showArchived
                          ? 'No deleted or archived records found.'
                          : 'No logistics operations found matching your criteria.'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {searchTerm ? 'Try changing your search terms.' : 'Create a new operation or adjust filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => {
                  const dnNo = trip.dnNumber || trip.deliveryNote?.dnNumber || 'DN-1001';
                  const dateStr = trip.departureTime?.split(' ')[0] || '19-08-2026';
                  const customer = trip.customerName || trip.companyName || 'ABC Customer';
                  const routeStr = `${trip.origin?.city || 'Jeddah'} → ${trip.destination?.city || 'Riyadh'}`;

                  return (
                    <tr
                      key={trip.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        trip.isDeleted ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      {/* 1. Date */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      {/* 2. DN No. */}
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedTripForDn(trip)}
                          className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:underline font-bold border border-blue-200 dark:border-blue-800/70 inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{dnNo}</span>
                        </button>
                      </td>

                      {/* 3. Customer */}
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-[180px] truncate">
                        <div className="flex items-center gap-1.5" title={customer}>
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{customer}</span>
                        </div>
                      </td>

                      {/* 4. Driver */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
                            {trip.driverName?.charAt(0) || 'D'}
                          </div>
                          <span>{trip.driverName}</span>
                        </div>
                      </td>

                      {/* 5. Truck */}
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-bold">{trip.vehiclePlate}</span>
                        </div>
                      </td>

                      {/* 6. Route */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{routeStr}</span>
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            trip.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : trip.status === 'in_transit'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse'
                              : trip.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {trip.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* 8. Actions (View · Edit · Delete · Duplicate · History) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <button
                            type="button"
                            onClick={() => setViewingTrip(trip)}
                            title="View Full Record"
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-blue-500" />
                            <span>View</span>
                          </button>

                          {/* Edit (Admin Only) */}
                          {activeRole === 'admin' && (
                            <button
                              type="button"
                              onClick={() => setEditingTrip(trip)}
                              title="Edit Record"
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => setDuplicatingTrip(trip)}
                            title="Duplicate Record"
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Duplicate</span>
                          </button>

                          {/* History */}
                          <button
                            type="button"
                            onClick={() => setHistoryTrip(trip)}
                            title="Audit History"
                            className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <History className="w-3 h-3" />
                            <span>History</span>
                          </button>

                          {/* Delete or Restore (Admin Only) */}
                          {activeRole === 'admin' && (
                            trip.isDeleted ? (
                              <button
                                type="button"
                                onClick={() => handleRestore(trip.id)}
                                title="Restore Record"
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingTrip(trip)}
                                title="Delete Record (with Confirmation & Audit)"
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong>{filteredTrips.length}</strong> of <strong>{trips.length}</strong> total records
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Master Audit Protected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono">
              Active: {activeCount} | Archived: {deletedCount}
            </span>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {viewingTrip && (
        <LogisticsRecordModal
          isOpen={!!viewingTrip}
          onClose={() => setViewingTrip(null)}
          trip={viewingTrip}
          onEdit={(t) => {
            setViewingTrip(null);
            setEditingTrip(t);
          }}
          onDuplicate={(t) => {
            setViewingTrip(null);
            setDuplicatingTrip(t);
          }}
          onDelete={(t) => {
            setViewingTrip(null);
            setDeletingTrip(t);
          }}
          onHistory={(t) => {
            setViewingTrip(null);
            setHistoryTrip(t);
          }}
        />
      )}

      {editingTrip && (
        <LogisticsEditModal
          isOpen={!!editingTrip}
          onClose={() => setEditingTrip(null)}
          trip={editingTrip}
          onSaveSuccess={() => {
            // Updated
          }}
        />
      )}

      {deletingTrip && (
        <DeleteConfirmationModal
          isOpen={!!deletingTrip}
          onClose={() => setDeletingTrip(null)}
          trip={deletingTrip}
          onConfirmDelete={handleConfirmDelete}
        />
      )}

      {duplicatingTrip && (
        <DuplicateRecordModal
          isOpen={!!duplicatingTrip}
          onClose={() => setDuplicatingTrip(null)}
          trip={duplicatingTrip}
          onDuplicateSuccess={(newT) => {
            setViewingTrip(newT);
          }}
        />
      )}

      {historyTrip && (
        <LogisticsHistoryModal
          isOpen={!!historyTrip}
          onClose={() => setHistoryTrip(null)}
          trip={historyTrip}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
};

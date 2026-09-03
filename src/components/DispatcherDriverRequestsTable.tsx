import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DriverLoadRequest, DriverRequestedLoadType, DriverLoadRequestStatus } from '../types';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Layers,
  Search,
  Filter,
  User,
  MapPin,
  Calendar,
  Building2,
  Package,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Check,
  X,
  FileText,
  Eye,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface DispatcherDriverRequestsTableProps {
  onNavigateToTrips?: () => void;
  onNavigateToBrokerLoads?: () => void;
}

export const DispatcherDriverRequestsTable: React.FC<DispatcherDriverRequestsTableProps> = ({
  onNavigateToTrips,
  onNavigateToBrokerLoads,
}) => {
  const {
    driverLoadRequests,
    approveAndConvertDriverLoadRequest,
    rejectDriverLoadRequest,
    deleteDriverLoadRequest,
    canDelete,
    language,
    showToast,
  } = useApp();

  const isAr = language === 'ar';

  // Filters
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'company_load' | 'broker_load' | 'assigned' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reject Modal State
  const [rejectingRequest, setRejectingRequest] = useState<DriverLoadRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Details Modal State
  const [viewingRequest, setViewingRequest] = useState<DriverLoadRequest | null>(null);

  // Statistics
  const totalCount = driverLoadRequests.length;
  const pendingCount = driverLoadRequests.filter((r) => r.status === 'Pending').length;
  const companyLoadCount = driverLoadRequests.filter((r) => r.loadType === 'Company Load (TLB)').length;
  const brokerLoadCount = driverLoadRequests.filter((r) => r.loadType === 'Broker Load').length;
  const assignedCount = driverLoadRequests.filter((r) => r.status === 'Assigned' || r.status === 'Approved').length;

  // Filtered List
  const filteredRequests = driverLoadRequests.filter((req) => {
    // Tab filter
    if (filterTab === 'pending' && req.status !== 'Pending') return false;
    if (filterTab === 'company_load' && req.loadType !== 'Company Load (TLB)') return false;
    if (filterTab === 'broker_load' && req.loadType !== 'Broker Load') return false;
    if (filterTab === 'assigned' && req.status !== 'Assigned' && req.status !== 'Approved') return false;
    if (filterTab === 'rejected' && req.status !== 'Rejected') return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = req.requestNumber.toLowerCase().includes(q);
      const matchDriver = req.driverName.toLowerCase().includes(q);
      const matchTruck = req.truckNo.toLowerCase().includes(q);
      const matchCust = req.customerCompanyName.toLowerCase().includes(q);
      const matchPick = req.pickupLocation.toLowerCase().includes(q);
      const matchDrop = req.dropLocation.toLowerCase().includes(q);
      if (!matchNum && !matchDriver && !matchTruck && !matchCust && !matchPick && !matchDrop) return false;
    }

    return true;
  });

  const handleApprove = (req: DriverLoadRequest) => {
    const result = approveAndConvertDriverLoadRequest(req.id);
    if (result.success) {
      if (viewingRequest?.id === req.id) {
        setViewingRequest(null);
      }
    }
  };

  const handleOpenRejectModal = (req: DriverLoadRequest) => {
    setRejectingRequest(req);
    setRejectReason('No loading silo capacity at requested time / requires reschedule.');
  };

  const handleConfirmReject = () => {
    if (!rejectingRequest) return;
    if (!rejectReason.trim()) {
      showToast('Reason Required', 'Please provide a reason for rejecting the request.', 'warning');
      return;
    }

    rejectDriverLoadRequest(rejectingRequest.id, rejectReason.trim());
    setRejectingRequest(null);
    if (viewingRequest?.id === rejectingRequest.id) {
      setViewingRequest(null);
    }
  };

  const getStatusBadge = (status: DriverLoadRequestStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </span>
        );
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Truck className="w-3.5 h-3.5" />
            <span>Assigned to Load</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Metric 1: Pending Approvals */}
        <button
          onClick={() => setFilterTab('pending')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterTab === 'pending'
              ? 'bg-amber-500 text-white border-amber-600 shadow-lg scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                filterTab === 'pending' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              Pending Approval
            </span>
            <Clock
              className={`w-4 h-4 ${
                filterTab === 'pending' ? 'text-white' : 'text-amber-500 animate-spin'
              }`}
            />
          </div>
          <p
            className={`text-2xl font-black mt-2 ${
              filterTab === 'pending' ? 'text-white' : 'text-slate-900 dark:text-white'
            }`}
          >
            {pendingCount}
          </p>
          <span
            className={`text-[11px] block mt-0.5 ${
              filterTab === 'pending' ? 'text-amber-100' : 'text-slate-400'
            }`}
          >
            Requires Dispatcher Action
          </span>
        </button>

        {/* Metric 2: All Requests */}
        <button
          onClick={() => setFilterTab('all')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterTab === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 shadow-lg scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                filterTab === 'all' ? 'text-slate-200 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              All Requests
            </span>
            <Inbox
              className={`w-4 h-4 ${
                filterTab === 'all' ? 'text-white dark:text-slate-900' : 'text-slate-400'
              }`}
            />
          </div>
          <p
            className={`text-2xl font-black mt-2 ${
              filterTab === 'all' ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'
            }`}
          >
            {totalCount}
          </p>
          <span
            className={`text-[11px] block mt-0.5 ${
              filterTab === 'all' ? 'text-slate-200 dark:text-slate-700' : 'text-slate-400'
            }`}
          >
            Total Driver Inquiries
          </span>
        </button>

        {/* Metric 3: Company Loads (TLB) */}
        <button
          onClick={() => setFilterTab('company_load')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterTab === 'company_load'
              ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                filterTab === 'company_load' ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              Company Load (TLB)
            </span>
            <Truck
              className={`w-4 h-4 ${
                filterTab === 'company_load' ? 'text-white' : 'text-blue-500'
              }`}
            />
          </div>
          <p
            className={`text-2xl font-black mt-2 ${
              filterTab === 'company_load' ? 'text-white' : 'text-slate-900 dark:text-white'
            }`}
          >
            {companyLoadCount}
          </p>
          <span
            className={`text-[11px] block mt-0.5 ${
              filterTab === 'company_load' ? 'text-blue-100' : 'text-slate-400'
            }`}
          >
            Direct Fleet Consignments
          </span>
        </button>

        {/* Metric 4: Broker Loads */}
        <button
          onClick={() => setFilterTab('broker_load')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterTab === 'broker_load'
              ? 'bg-amber-600 text-white border-amber-700 shadow-lg scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                filterTab === 'broker_load' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              Broker Loads
            </span>
            <Layers
              className={`w-4 h-4 ${
                filterTab === 'broker_load' ? 'text-white' : 'text-amber-500'
              }`}
            />
          </div>
          <p
            className={`text-2xl font-black mt-2 ${
              filterTab === 'broker_load' ? 'text-white' : 'text-slate-900 dark:text-white'
            }`}
          >
            {brokerLoadCount}
          </p>
          <span
            className={`text-[11px] block mt-0.5 ${
              filterTab === 'broker_load' ? 'text-amber-100' : 'text-slate-400'
            }`}
          >
            Multi-Drop Broker Requests
          </span>
        </button>

        {/* Metric 5: Assigned / Approved */}
        <button
          onClick={() => setFilterTab('assigned')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterTab === 'assigned'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                filterTab === 'assigned' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              Assigned / Dispatched
            </span>
            <CheckCircle2
              className={`w-4 h-4 ${
                filterTab === 'assigned' ? 'text-white' : 'text-emerald-500'
              }`}
            />
          </div>
          <p
            className={`text-2xl font-black mt-2 ${
              filterTab === 'assigned' ? 'text-white' : 'text-slate-900 dark:text-white'
            }`}
          >
            {assignedCount}
          </p>
          <span
            className={`text-[11px] block mt-0.5 ${
              filterTab === 'assigned' ? 'text-emerald-100' : 'text-slate-400'
            }`}
          >
            Converted to Live Loads
          </span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search request #, driver, truck, client, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {(
            [
              { id: 'pending', label: `Pending (${pendingCount})` },
              { id: 'all', label: `All (${totalCount})` },
              { id: 'company_load', label: `Company TLB (${companyLoadCount})` },
              { id: 'broker_load', label: `Broker (${brokerLoadCount})` },
              { id: 'assigned', label: `Assigned (${assignedCount})` },
              { id: 'rejected', label: 'Rejected' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterTab === t.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* REQUESTS TABLE */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Request Ref</th>
                <th className="py-3 px-4">Driver &amp; Truck</th>
                <th className="py-3 px-4">Load Type</th>
                <th className="py-3 px-4">TLB Quantity</th>
                <th className="py-3 px-4">Route (Pickup → Drop)</th>
                <th className="py-3 px-4">Customer / Company</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold">No driver load requests match this filter.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      When drivers submit load requests from the Driver Panel, they will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Request Ref & Date */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-black text-slate-900 dark:text-white">
                        {req.requestNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{req.requestDate}</span>
                      </div>
                    </td>

                    {/* Driver & Truck */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{req.driverName}</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {req.truckNo}
                      </div>
                    </td>

                    {/* Load Type */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                          req.loadType === 'Broker Load'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                        }`}
                      >
                        {req.loadType === 'Broker Load' ? (
                          <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                        <span>{req.loadType}</span>
                      </span>
                    </td>

                    {/* TLB Quantity */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-black text-slate-900 dark:text-white">
                        {req.tlbQuantity} {req.uom || 'Bags'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ≈ {(req.tlbQuantity * 0.04).toFixed(1)} Tons
                      </div>
                    </td>

                    {/* Route (Pickup -> Drop) */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{req.pickupLocation}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900 dark:text-white truncate mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <span className="truncate">{req.dropLocation}</span>
                      </div>
                    </td>

                    {/* Customer / Company */}
                    <td className="py-3 px-4 max-w-xs truncate">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 truncate">
                        {req.customerCompanyName}
                      </div>
                      {req.notes && (
                        <div className="text-[10px] text-slate-400 truncate italic mt-0.5">
                          "{req.notes}"
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">{getStatusBadge(req.status)}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status === 'Pending' && (
                          <>
                            {/* Approve & Assign Button */}
                            <button
                              id={`approve-req-btn-${req.id}`}
                              onClick={() => handleApprove(req)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                              title="Approve and convert to active load"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>

                            {/* Reject Button */}
                            <button
                              id={`reject-req-btn-${req.id}`}
                              onClick={() => handleOpenRejectModal(req)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1 border border-rose-200 dark:border-rose-900 transition-all cursor-pointer"
                              title="Reject load request"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {/* View Details Modal */}
                        <button
                          onClick={() => setViewingRequest(req)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                          title="View Request Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Direct link if already assigned */}
                        {req.status === 'Assigned' && (
                          <>
                            {req.loadType === 'Company Load (TLB)' && onNavigateToTrips && (
                              <button
                                onClick={onNavigateToTrips}
                                className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1 hover:bg-blue-100 transition-all cursor-pointer"
                                title="Open in Standard Plant Trips"
                              >
                                <span>Trip</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            {req.loadType === 'Broker Load' && onNavigateToBrokerLoads && (
                              <button
                                onClick={onNavigateToBrokerLoads}
                                className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:bg-amber-100 transition-all cursor-pointer"
                                title="Open in Broker Load Management"
                              >
                                <span>Broker</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}

                        {/* Delete (Admin only) */}
                        {canDelete && (
                          <button
                            onClick={() => deleteDriverLoadRequest(req.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                            title="Delete Request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REJECT MODAL */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                <span>Reject Driver Load Request</span>
              </h3>
              <button
                onClick={() => setRejectingRequest(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <div className="font-mono font-bold text-slate-900 dark:text-white">
                {rejectingRequest.requestNumber} • {rejectingRequest.loadType}
              </div>
              <div className="text-slate-500">
                Driver: <strong>{rejectingRequest.driverName}</strong> ({rejectingRequest.truckNo})
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this request is rejected so the driver can adjust..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                    {viewingRequest.requestNumber}
                  </span>
                  {getStatusBadge(viewingRequest.status)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submitted: {new Date(viewingRequest.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setViewingRequest(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800">
                <div>
                  <span className="text-slate-400 text-[11px] block">Load Type</span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {viewingRequest.loadType}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">TLB Quantity</span>
                  <strong className="font-mono text-slate-900 dark:text-white">
                    {viewingRequest.tlbQuantity} {viewingRequest.uom || 'Bags'} (≈ {(viewingRequest.tlbQuantity * 0.04).toFixed(1)} Tons)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Driver</span>
                  <strong className="text-slate-900 dark:text-white">
                    {viewingRequest.driverName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Truck No. / Plate</span>
                  <strong className="font-mono text-slate-900 dark:text-white">
                    {viewingRequest.truckNo}
                  </strong>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div>
                  <span className="text-slate-400 text-[11px] block">Pickup Location</span>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{viewingRequest.pickupLocation}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[11px] block">Drop Location</span>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{viewingRequest.dropLocation}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[11px] block">Customer / Company</span>
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{viewingRequest.customerCompanyName}</span>
                  </div>
                </div>
              </div>

              {viewingRequest.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">
                    Driver Notes:
                  </span>
                  <p className="italic">"{viewingRequest.notes}"</p>
                </div>
              )}

              {viewingRequest.reviewNotes && (
                <div
                  className={`p-3 rounded-xl border ${
                    viewingRequest.status === 'Rejected'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  <span className="text-[11px] font-bold block mb-1">
                    Reviewer ({viewingRequest.reviewedBy || 'Dispatcher'}):
                  </span>
                  <p>{viewingRequest.reviewNotes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>

              {viewingRequest.status === 'Pending' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenRejectModal(viewingRequest)}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs border border-rose-200 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(viewingRequest)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve &amp; Dispatch</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest, ApprovalTier, ApprovalStatus } from '../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  PlusCircle,
  ShieldCheck,
  Building,
  DollarSign,
  Boxes,
  FileText,
  User,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';

export const ApprovalCenterView: React.FC = () => {
  const { approvalRequests, processApprovalDecision, createApprovalRequest, activeRole, users } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{
    request: ApprovalRequest;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  // New Request Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqCategory, setReqCategory] = useState<'operational' | 'inventory_delta' | 'expense' | 'credit_override' | 'policy'>('inventory_delta');
  const [reqTier, setReqTier] = useState<ApprovalTier>('manager');
  const [reqRecordRef, setReqRecordRef] = useState('');
  const [reqItem, setReqItem] = useState('');
  const [reqCustomer, setReqCustomer] = useState('');
  const [reqOldVal, setReqOldVal] = useState('');
  const [reqNewVal, setReqNewVal] = useState('');
  const [reqAmount, setReqAmount] = useState<number>(0);
  const [reqReason, setReqReason] = useState('');

  const pendingCount = approvalRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = approvalRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = approvalRequests.filter((r) => r.status === 'rejected').length;

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return approvalRequests.filter((req) => {
      const matchesSearch =
        searchQuery === '' ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requestedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.customer && req.customer.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (req.item && req.item.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (req.recordRef && req.recordRef.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTier = tierFilter === 'ALL' || req.requiredTier === tierFilter;
      const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [approvalRequests, searchQuery, tierFilter, statusFilter]);

  // Check if active user can decide this request
  const canDecide = (requiredTier: ApprovalTier): boolean => {
    if (activeRole === 'ceo' || activeRole === 'admin') return true;
    if (activeRole === 'gm' && (requiredTier === 'gm' || requiredTier === 'manager')) return true;
    if (activeRole === 'manager' && requiredTier === 'manager') return true;
    return false;
  };

  const handleConfirmDecision = () => {
    if (!decisionModal) return;
    processApprovalDecision(decisionModal.request.id, decisionModal.decision, decisionNotes);
    setDecisionModal(null);
    setDecisionNotes('');
    if (selectedRequest?.id === decisionModal.request.id) {
      setSelectedRequest(null);
    }
  };

  const handleCreateNewRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqReason.trim()) {
      alert('Please fill out the title and mandatory reason.');
      return;
    }

    createApprovalRequest({
      title: reqTitle,
      description: reqDesc || reqReason,
      category: reqCategory,
      requestedBy: users.find((u) => u.role === activeRole)?.name || `${activeRole} Operator`,
      requestedByRole: activeRole,
      requiredTier: reqTier,
      recordRef: reqRecordRef || undefined,
      item: reqItem || undefined,
      customer: reqCustomer || undefined,
      oldValue: reqOldVal || undefined,
      newValue: reqNewVal || undefined,
      delta: reqOldVal && reqNewVal ? `${reqOldVal} → ${reqNewVal}` : undefined,
      amount: reqAmount > 0 ? reqAmount : undefined,
      reason: reqReason,
    });

    setShowNewModal(false);
    setReqTitle('');
    setReqDesc('');
    setReqRecordRef('');
    setReqItem('');
    setReqCustomer('');
    setReqOldVal('');
    setReqNewVal('');
    setReqAmount(0);
    setReqReason('');
  };

  const getTierBadge = (tier: ApprovalTier) => {
    switch (tier) {
      case 'ceo':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'gm':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'manager':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
  };

  return (
    <div id="approval-center-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Hierarchy Approval Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multi-tiered operational, inventory, financial, and policy authorizations (Manager → GM → CEO).
          </p>
        </div>

        <button
          id="new-approval-request-btn"
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-blue-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Approval Request</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Pending Authorization</span>
            <div className="text-2xl font-black text-amber-500 mt-1">{pendingCount}</div>
            <span className="text-[10px] text-slate-400">Requires executive sign-off</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Approved & Sealed</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{approvedCount}</div>
            <span className="text-[10px] text-slate-400">Integrated into Master Audit</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Rejected With Audit</span>
            <div className="text-2xl font-black text-rose-500 mt-1">{rejectedCount}</div>
            <span className="text-[10px] text-slate-400">With recorded rejection notes</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search approvals by title, request ID, requester, cargo, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
          >
            <option value="ALL">All Tiers</option>
            <option value="manager">Manager Tier</option>
            <option value="gm">GM Tier</option>
            <option value="ceo">CEO Tier</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRequests.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            No approval requests found matching your filter criteria.
          </div>
        ) : (
          filteredRequests.map((req) => {
            const hasAuthority = canDecide(req.requiredTier);
            return (
              <div
                key={req.id}
                id={`approval-card-${req.id}`}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-400 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {req.id}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getTierBadge(req.requiredTier)}`}>
                        {req.requiredTier} Tier
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                    {req.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 mb-3">
                    {req.description}
                  </p>

                  {/* Operational Delta or Amount */}
                  {(req.oldValue !== undefined || req.newValue !== undefined || req.amount) && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs mb-3 space-y-1">
                      {req.oldValue && req.newValue && (
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <span className="text-[10px] text-slate-400 font-medium">Variance:</span>
                          <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{String(req.oldValue)}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{String(req.newValue)}</span>
                        </div>
                      )}
                      {req.amount && (
                        <div className="text-slate-900 dark:text-white font-bold">
                          Financial Impact: <span className="text-blue-600 dark:text-blue-400">{req.amount.toLocaleString()} SAR</span>
                        </div>
                      )}
                      {req.recordRef && (
                        <div className="text-[11px] font-mono text-slate-500">
                          Ref: {req.recordRef} {req.item ? `• ${req.item}` : ''}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Requester info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div>
                      <span>Requested by </span>
                      <strong className="text-slate-700 dark:text-slate-200">{req.requestedBy}</strong>
                    </div>
                    <span className="font-mono">{req.requestedAt}</span>
                  </div>

                  {/* Decision summary if already finalized */}
                  {req.status !== 'pending' && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] border border-slate-100 dark:border-slate-800">
                      <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Decision by: {req.decisionBy}</span>
                        <span className="font-mono text-slate-400">{req.decisionAt}</span>
                      </div>
                      {req.decisionNotes && (
                        <p className="text-slate-600 dark:text-slate-400 mt-1 italic">
                          "{req.decisionNotes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                {req.status === 'pending' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {hasAuthority ? (
                      <>
                        <button
                          onClick={() => setDecisionModal({ request: req, decision: 'rejected' })}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => setDecisionModal({ request: req, decision: 'approved' })}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-colors cursor-pointer"
                        >
                          Approve Request
                        </button>
                      </>
                    ) : (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 py-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Requires {req.requiredTier.toUpperCase()} authorization level</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Decision Confirmation Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${decisionModal.decision === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'}`}>
                {decisionModal.decision === 'approved' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                  {decisionModal.decision} Request #{decisionModal.request.id}
                </h3>
                <p className="text-xs text-slate-500">
                  Executing role: <strong className="uppercase">{activeRole}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {decisionModal.request.title}
              </div>
              <div className="text-slate-500">
                Requested by {decisionModal.request.requestedBy}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Decision Notes / Rationale (Recorded in Master Audit)
              </label>
              <textarea
                rows={3}
                required={decisionModal.decision === 'rejected'}
                placeholder={decisionModal.decision === 'approved' ? 'Optional authorization comments...' : 'Mandatory rejection justification...'}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md cursor-pointer ${
                  decisionModal.decision === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                }`}
              >
                Confirm {decisionModal.decision.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                <h3 className="text-base font-black">Submit Hierarchical Approval Request</h3>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-blue-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewRequest} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Approval Target Tier
                  </label>
                  <select
                    value={reqTier}
                    onChange={(e) => setReqTier(e.target.value as ApprovalTier)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="manager">Manager Tier (Operational / Daily)</option>
                    <option value="gm">GM Tier (Financial / Policy / Inventory)</option>
                    <option value="ceo">CEO Tier (CapEx / High-value / Board)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Request Category
                  </label>
                  <select
                    value={reqCategory}
                    onChange={(e) => setReqCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="inventory_delta">Inventory / Silo Variance</option>
                    <option value="expense">Operational Expense Override</option>
                    <option value="credit_override">Customer Credit Limit Increase</option>
                    <option value="operational">Dispatcher / Driver Re-route</option>
                    <option value="policy">Corporate Policy / Fleet CapEx</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Request Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TLB Bulk Silo 25 Ton Tare Correction"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Record Reference ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WH-ADJ-2026-095"
                    value={reqRecordRef}
                    onChange={(e) => setReqRecordRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Associated Amount (SAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={reqAmount || ''}
                    onChange={(e) => setReqAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Current / Old Value
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 520 Tons"
                    value={reqOldVal}
                    onChange={(e) => setReqOldVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Requested / New Value
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 495 Tons"
                    value={reqNewVal}
                    onChange={(e) => setReqNewVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Business Rationale <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this authorization is required..."
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Submit for Authorization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

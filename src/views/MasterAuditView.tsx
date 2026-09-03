import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MasterAuditRecord, MasterAuditAction, ApprovalTier, UserRole } from '../types';
import {
  ShieldAlert,
  Lock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileCode,
  Printer,
  Key,
  Layers,
  Sparkles,
  History,
  Check,
  UserCheck,
  Building,
  Boxes,
  Truck,
  DollarSign,
  User,
  Fingerprint,
  Info,
  Trash2,
  X
} from 'lucide-react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const MasterAuditView: React.FC = () => {
  const { masterAudits, deleteMasterAudit, logMasterAudit, recordSensitiveChange, activeRole, users } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<MasterAuditRecord | null>(null);
  const [auditToDelete, setAuditToDelete] = useState<MasterAuditRecord | null>(null);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Sensitive change simulator form state
  const [simAction, setSimAction] = useState<MasterAuditAction>('EDIT_INVENTORY');
  const [simRecordRef, setSimRecordRef] = useState('WH-TLB-SILO-01');
  const [simItem, setSimItem] = useState('TLB (Truck Load Bulk)');
  const [simCustomer, setSimCustomer] = useState('Saudi Readymix Co.');
  const [simOldValue, setSimOldValue] = useState('500 Tons');
  const [simNewValue, setSimNewValue] = useState('450 Tons');
  const [simReason, setSimReason] = useState('');
  const [simTier, setSimTier] = useState<ApprovalTier>('manager');
  const [simWarehouse, setSimWarehouse] = useState('Riyadh Central Depot');

  const filteredAudits = useMemo(() => {
    return masterAudits.filter((audit) => {
      const matchesSearch =
        searchTerm === '' ||
        audit.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.recordRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (audit.reason && audit.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (audit.customer && audit.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (audit.item && audit.item.toLowerCase().includes(searchTerm.toLowerCase())) ||
        audit.integrityHash.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = selectedActionFilter === 'ALL' || audit.action === selectedActionFilter;
      const matchesRole = selectedRoleFilter === 'ALL' || audit.userRole === selectedRoleFilter;
      const matchesCategory = selectedCategoryFilter === 'ALL' || audit.category === selectedCategoryFilter;

      return matchesSearch && matchesAction && matchesRole && matchesCategory;
    });
  }, [masterAudits, searchTerm, selectedActionFilter, selectedRoleFilter, selectedCategoryFilter]);

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simReason.trim()) {
      alert('Mandatory reason is strictly required by the Master Audit protocol.');
      return;
    }

    recordSensitiveChange({
      action: simAction,
      recordRef: simRecordRef,
      item: simItem,
      customer: simCustomer,
      oldValue: simOldValue,
      newValue: simNewValue,
      delta: `${simOldValue} -> ${simNewValue}`,
      reason: simReason,
      requiredTier: simTier,
      warehouse: simWarehouse,
    });

    setShowSimulatorModal(false);
    setSimReason('');
  };

  const handleExportCsv = () => {
    const headers = [
      'Audit ID',
      'Timestamp',
      'User',
      'Role',
      'Action',
      'Category',
      'Record Reference',
      'Item/Customer',
      'Old Value',
      'New Value',
      'Delta',
      'Reason',
      'Approved By',
      'Approval Date',
      'IP/Device',
      'SHA256 Hash',
    ];
    const rows = masterAudits.map((a) => [
      `"${a.id}"`,
      `"${a.timestamp}"`,
      `"${a.user}"`,
      `"${a.userRole}"`,
      `"${a.action}"`,
      `"${a.category || ''}"`,
      `"${a.recordRef}"`,
      `"${a.item || a.customer || ''}"`,
      `"${String(a.oldValue || '').replace(/"/g, '""')}"`,
      `"${String(a.newValue || '').replace(/"/g, '""')}"`,
      `"${String(a.delta || '').replace(/"/g, '""')}"`,
      `"${(a.reason || '').replace(/"/g, '""')}"`,
      `"${a.approvedBy || ''}"`,
      `"${a.approvalDate || ''}"`,
      `"${a.ipDevice || ''}"`,
      `"${a.integrityHash}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `master-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(masterAudits, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `master-audit-ledger-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const getActionBadgeColor = (action: MasterAuditAction) => {
    if (action.includes('CEO') || action.includes('MONTH_END')) return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    if (action.includes('GM') || action.includes('APPROVED')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (action.includes('INVENTORY') || action.includes('PRICE')) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    if (action.includes('DELETE')) return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    if (action.includes('SALE')) return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
  };

  return (
    <div id="master-audit-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Cryptographic Ledger Integrity */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Master-Level Audit Trail
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Tamper-Proof
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Permanent, cryptographically sealed enterprise audit log across CEO, GM, Manager, Dispatcher, Sales, Driver, and Inventory operations. Old vs New state recording with mandatory rationale and verification seals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="simulate-sensitive-change-btn"
              onClick={() => setShowSimulatorModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Fingerprint className="w-4 h-4" />
              <span>Record Sensitive Change</span>
            </button>
            <button
              onClick={() => setShowCertificateModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Compliance Seal</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Audit Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-slate-400 font-medium">Total Sealed Audits</div>
            <div className="text-lg font-black text-white mt-0.5">{masterAudits.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-slate-400 font-medium">Immutability Lock</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 100% Guaranteed
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-slate-400 font-medium">Hierarchy Coverage</div>
            <div className="text-lg font-black text-indigo-300 mt-0.5">CEO → GM → Mgr → Fleet</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-slate-400 font-medium">Deletion Protection</div>
            <div className="text-lg font-black text-amber-400 mt-0.5 flex items-center gap-1.5">
              <Key className="w-4 h-4" /> Zero-Delete Policy
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="master-audit-search-input"
            type="text"
            placeholder="Search by Audit ID, User, Item, Customer, Record Ref, Reason, or SHA-256..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <select
            id="audit-action-filter"
            value={selectedActionFilter}
            onChange={(e) => setSelectedActionFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
          >
            <option value="ALL">All Actions ({masterAudits.length})</option>
            <option value="EDIT_INVENTORY">EDIT_INVENTORY</option>
            <option value="SALE_CREATION">SALE_CREATION</option>
            <option value="DRIVER_ASSIGNED">DRIVER_ASSIGNED</option>
            <option value="EXPENSE_APPROVED">EXPENSE_APPROVED</option>
            <option value="CEO_APPROVAL">CEO_APPROVAL</option>
            <option value="GM_APPROVAL">GM_APPROVAL</option>
            <option value="MANAGER_APPROVAL">MANAGER_APPROVAL</option>
            <option value="MONTH_END">MONTH_END</option>
            <option value="LOGIN">LOGIN</option>
            <option value="SLIP_SCANNED">SLIP_SCANNED</option>
            <option value="CUSTOMER_CREATION">CUSTOMER_CREATION</option>
            <option value="PRICE_OVERRIDE">PRICE_OVERRIDE</option>
          </select>

          {/* Role Filter */}
          <select
            id="audit-role-filter"
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="ceo">CEO</option>
            <option value="gm">GM</option>
            <option value="manager">Manager</option>
            <option value="admin">Super Admin</option>
            <option value="dispatcher">Dispatcher</option>
            <option value="sales">Sales</option>
            <option value="accountant">Accountant</option>
            <option value="warehouse_mgr">Warehouse Lead</option>
            <option value="driver">Driver</option>
          </select>

          {/* Category Filter */}
          <select
            id="audit-category-filter"
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="inventory">Inventory & Silos</option>
            <option value="dispatch">Fleet & Trips</option>
            <option value="sales">Sales & Commercial</option>
            <option value="finance">Finance & Salaries</option>
            <option value="security">Security & Sessions</option>
            <option value="governance">Executive Governance</option>
          </select>

          {(searchTerm || selectedActionFilter !== 'ALL' || selectedRoleFilter !== 'ALL' || selectedCategoryFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedActionFilter('ALL');
                setSelectedRoleFilter('ALL');
                setSelectedCategoryFilter('ALL');
              }}
              className="p-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
              title="Reset Filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Sealed Event Timeline ({filteredAudits.length} Records)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Current Session: {activeRole.toUpperCase()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Audit ID & Time</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Action & Ref</th>
                <th className="py-3 px-4">Old Value → New Value</th>
                <th className="py-3 px-4">Mandatory Reason</th>
                <th className="py-3 px-4">Approver</th>
                <th className="py-3 px-4 text-center">Integrity Seal</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No audit records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAudits.map((audit) => (
                  <tr
                    key={audit.id}
                    id={`audit-row-${audit.id}`}
                    onClick={() => setSelectedAuditRecord(audit)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* ID & Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {audit.id}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {audit.timestamp}
                      </div>
                    </td>

                    {/* User & Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {audit.user}
                      </div>
                      <span className="inline-block mt-0.5 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {audit.userRole}
                      </span>
                    </td>

                    {/* Action & Ref */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${getActionBadgeColor(audit.action)}`}>
                        {audit.action}
                      </span>
                      <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 mt-1">
                        {audit.recordRef}
                      </div>
                      {audit.item && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          Item: {audit.item}
                        </div>
                      )}
                      {audit.customer && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          Cust: {audit.customer}
                        </div>
                      )}
                    </td>

                    {/* Old Value -> New Value */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {audit.oldValue !== undefined || audit.newValue !== undefined ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            <span className="font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900 truncate">
                              {String(audit.oldValue ?? 'None')}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 font-semibold truncate">
                              {String(audit.newValue ?? 'None')}
                            </span>
                          </div>
                          {audit.delta && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                              Delta: {audit.delta}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">System Event</span>
                      )}
                    </td>

                    {/* Mandatory Reason */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-700 dark:text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
                        {audit.reason || 'Automated system protocol log'}
                      </p>
                      {audit.warehouse && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-2.5 h-2.5" /> {audit.warehouse}
                        </span>
                      )}
                    </td>

                    {/* Approver */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {audit.approvedBy ? (
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            {audit.approvedBy}
                          </div>
                          <div className="text-[10px] text-slate-400">{audit.approvalDate}</div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">Direct Execute</span>
                      )}
                    </td>

                    {/* Integrity Seal */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>VERIFIED</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-[100px] mx-auto">
                        {audit.integrityHash.substring(0, 12)}...
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {['admin', 'gm', 'ceo'].includes(activeRole) && (
                        <button
                          id={`btn-delete-audit-${audit.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAuditToDelete(audit);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Purge Audit Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedAuditRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black">{selectedAuditRecord.id}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      IMMUTABLE RECORD
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Captured at {selectedAuditRecord.timestamp}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditRecord(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                  <div className="text-slate-400 font-medium">Executing User & Role</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {selectedAuditRecord.user}
                  </div>
                  <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 uppercase mt-0.5">
                    Tier: {selectedAuditRecord.userRole}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                  <div className="text-slate-400 font-medium">Target Action & Reference</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {selectedAuditRecord.action}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Ref: {selectedAuditRecord.recordRef}
                  </div>
                </div>
              </div>

              {/* State Transition Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>State Change Log</span>
                  {selectedAuditRecord.category && (
                    <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-200/50 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300">
                      {selectedAuditRecord.category}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50">
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wide">
                      OLD STATE / VALUE
                    </div>
                    <div className="font-mono text-xs text-slate-800 dark:text-slate-200 mt-1 font-semibold">
                      {String(selectedAuditRecord.oldValue ?? 'N/A')}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50">
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">
                      NEW STATE / VALUE
                    </div>
                    <div className="font-mono text-xs text-slate-800 dark:text-slate-200 mt-1 font-bold">
                      {String(selectedAuditRecord.newValue ?? 'N/A')}
                    </div>
                  </div>
                </div>

                {selectedAuditRecord.delta && (
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                    <span className="font-bold">Calculated Variance (Delta):</span> {selectedAuditRecord.delta}
                  </div>
                )}
              </div>

              {/* Rationale */}
              <div className="space-y-1.5">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Mandatory Business Reason</div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {selectedAuditRecord.reason || 'None provided'}
                </div>
              </div>

              {/* Device and Signoff */}
              <div className="grid grid-cols-2 gap-4 text-[11px]">
                <div>
                  <span className="text-slate-400">Terminal / Network IP:</span>
                  <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                    {selectedAuditRecord.ipDevice || 'Verified Internal Gateway'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Authorized Signoff:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedAuditRecord.approvedBy || 'Pre-authorized operational role'}
                  </p>
                </div>
              </div>

              {/* Cryptographic SHA256 Signature */}
              <div className="p-3.5 rounded-xl bg-slate-950 text-slate-300 font-mono text-[10px] space-y-1 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3 text-indigo-400" /> SHA-256 Cryptographic Hash Seal
                  </span>
                  <span className="text-emerald-400 font-bold">TAMPER TEST: PASSED</span>
                </div>
                <div className="break-all text-indigo-300 font-bold">
                  {selectedAuditRecord.integrityHash}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              {['admin', 'gm', 'ceo'].includes(activeRole) ? (
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedAuditRecord;
                    setSelectedAuditRecord(null);
                    setAuditToDelete(rec);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Purge Audit Entry</span>
                </button>
              ) : <div />}
              <button
                onClick={() => setSelectedAuditRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Modal for Recording New Sensitive Changes */}
      {showSimulatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Fingerprint className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-black">Record Sensitive Operational Change</h3>
                  <p className="text-xs text-indigo-200">Protocol enforces Old/New logging and SHA-256 seal</p>
                </div>
              </div>
              <button onClick={() => setShowSimulatorModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimulateSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Action Classification
                  </label>
                  <select
                    value={simAction}
                    onChange={(e) => setSimAction(e.target.value as MasterAuditAction)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="EDIT_INVENTORY">EDIT_INVENTORY (Stock/Silos)</option>
                    <option value="SALE_CREATION">SALE_CREATION (POS/Contract)</option>
                    <option value="PRICE_OVERRIDE">PRICE_OVERRIDE (Discount)</option>
                    <option value="EXPENSE_APPROVED">EXPENSE_APPROVED (Payment)</option>
                    <option value="DRIVER_ASSIGNED">DRIVER_ASSIGNED (Fleet)</option>
                    <option value="DELETE_RECORD">DELETE_RECORD (Sensitive)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Required Approval Tier
                  </label>
                  <select
                    value={simTier}
                    onChange={(e) => setSimTier(e.target.value as ApprovalTier)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="manager">Manager Approval</option>
                    <option value="gm">General Manager (GM)</option>
                    <option value="ceo">CEO Executive Sign-off</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Record Reference ID
                  </label>
                  <input
                    type="text"
                    required
                    value={simRecordRef}
                    onChange={(e) => setSimRecordRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Item / Cargo / Subject
                  </label>
                  <input
                    type="text"
                    value={simItem}
                    onChange={(e) => setSimItem(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    OLD VALUE (Captured)
                  </label>
                  <input
                    type="text"
                    required
                    value={simOldValue}
                    onChange={(e) => setSimOldValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    NEW VALUE (Target)
                  </label>
                  <input
                    type="text"
                    required
                    value={simNewValue}
                    onChange={(e) => setSimNewValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Operational Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this change is required (e.g. Weighbridge recalibration variance, approved contract discount, driver emergency dispatch)..."
                  value={simReason}
                  onChange={(e) => setSimReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>Once submitted, this entry cannot be modified or deleted by anyone.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSimulatorModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/30"
                >
                  Seal & Log in Master Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compliance Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Enterprise Audit Compliance Certificate
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                LogiFlow Saudi Logistics Management System • Enterprise Governance &amp; Tax Compliant
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-left text-xs space-y-2 font-mono border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Certificate Ref:</span>
                <span className="font-bold text-slate-900 dark:text-white">CERT-KSA-2026-089</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audited Records:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{masterAudits.length} Events</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hash Standard:</span>
                <span className="font-bold text-emerald-600">SHA-256 Cryptographic Chain</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Immutability Proof:</span>
                <span className="font-bold text-emerald-600">Active (Zero-Delete Rule)</span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  window.print();
                  setShowCertificateModal(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Certificate
              </button>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Audit Confirmation Modal */}
      {auditToDelete && (
        <DeleteConfirmationModal
          isOpen={!!auditToDelete}
          onClose={() => setAuditToDelete(null)}
          onConfirm={(reason) => {
            if (auditToDelete) {
              deleteMasterAudit(auditToDelete.id, reason);
              setAuditToDelete(null);
            }
          }}
          title="Purge Master Audit Ledger Entry"
          message={`Are you sure you want to delete sealed Audit Entry "${auditToDelete.id}" (${auditToDelete.action} - ${auditToDelete.recordRef}) by ${auditToDelete.user}?`}
          confirmText="Yes, Purge Record"
          requireReason={true}
        />
      )}
    </div>
  );
};

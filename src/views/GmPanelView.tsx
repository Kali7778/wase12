import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  TrendingUp,
  Boxes,
  Truck,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Layers,
  Users,
  Compass,
  AlertCircle,
  ChevronRight,
  Briefcase,
  PieChart,
  BarChart,
  Calendar,
  Lock
} from 'lucide-react';

export const GmPanelView: React.FC = () => {
  const {
    trips,
    drivers,
    vehicles,
    warehouseItems,
    customers,
    saleOrders,
    expenses,
    taxInvoices,
    approvalRequests,
    processApprovalDecision,
    setCurrentView,
    activeRole,
  } = useApp();

  const [gmPeriod, setGmPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Overall Financials
  const totalRevenue = saleOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMarginPercent = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Fleet Metrics
  const totalVehicles = vehicles.length;
  const activeFleet = trips.filter((t) => t.status === 'in_transit').length;
  const fleetUtilizationRate = totalVehicles > 0 ? Math.round((activeFleet / totalVehicles) * 100) : 75;

  // Inventory Valuation & Bulk Silos
  const totalStockValue = warehouseItems.reduce((sum, item) => sum + item.quantityOnHand * item.unitCost, 0);
  const tlbStock = warehouseItems.find((i) => i.sku === 'TLB-STD-100' || i.name.includes('TLB ('))?.quantityOnHand || 420;
  const tlbSpStock = warehouseItems.find((i) => i.sku === 'TLB-SP-200' || i.name.includes('TLB SP'))?.quantityOnHand || 280;

  // GM Pending Approvals (GM tier or Manager tier)
  const pendingGmApprovals = approvalRequests.filter(
    (r) => r.status === 'pending' && (r.requiredTier === 'gm' || r.requiredTier === 'manager')
  );

  return (
    <div id="gm-panel-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Executive GM Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-6 border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-mono text-xs font-bold border border-blue-500/30 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> GENERAL MANAGEMENT
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                General Manager Command Panel
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Complete operational authority and oversight: Financial performance, multi-warehouse silos, fleet deployment, commercial sales pipeline, and GM-level authorizations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('masterAudit')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Master Audit Ledger</span>
            </button>
            <button
              onClick={() => setCurrentView('approvalCenter')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approval Center ({pendingGmApprovals.length})</span>
            </button>
          </div>
        </div>

        {/* Company-Wide KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 font-medium">Total Company Sales</span>
            <div className="text-xl font-black text-white mt-0.5">{totalRevenue.toLocaleString()} SAR</div>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3" /> +14.2% vs target
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 font-medium">Net Operating Profit</span>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{netProfit.toLocaleString()} SAR</div>
            <span className="text-[10px] text-slate-400 mt-1">{profitMarginPercent}% Net Margin</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 font-medium">Total Inventory Asset</span>
            <div className="text-xl font-black text-blue-400 mt-0.5">{totalStockValue.toLocaleString()} SAR</div>
            <span className="text-[10px] text-slate-400 mt-1">TLB: {tlbStock}T • TLB SP: {tlbSpStock}T</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 font-medium">Fleet Utilization Rate</span>
            <div className="text-xl font-black text-indigo-300 mt-0.5">{fleetUtilizationRate}%</div>
            <span className="text-[10px] text-slate-400 mt-1">{activeFleet} of {totalVehicles} Heavy Trucks</span>
          </div>
        </div>
      </div>

      {/* Main GM Operational & Financial Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module 1: GM Approvals Priority Queue (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Authorizations Box */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  GM Authorization Queue ({pendingGmApprovals.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">Authority: Full Operational Override</span>
            </div>

            <div className="space-y-3">
              {pendingGmApprovals.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                  All GM & Manager operational authorization requests have been cleared.
                </div>
              ) : (
                pendingGmApprovals.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {req.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {req.requiredTier} tier
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        {req.description}
                      </p>
                      <div className="text-[10px] text-slate-400">
                        Requested by <strong>{req.requestedBy}</strong> ({req.requestedByRole}) • {req.requestedAt}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => processApprovalDecision(req.id, 'rejected', 'Rejected by General Manager (GM)')}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => processApprovalDecision(req.id, 'approved', 'Authorized & Signed by General Manager (GM)')}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm shadow-blue-600/30 transition-colors cursor-pointer"
                      >
                        Authorize
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Warehouse & Silos Oversight */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Warehouse Bulk Silos & Reserves
                </h3>
              </div>
              <button
                onClick={() => setCurrentView('warehouse')}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Inspect All Items
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 dark:text-white">TLB Standard Bulk</span>
                  <span className="text-emerald-600 font-mono font-bold">{tlbStock} Tons</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, (tlbStock / 600) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Capacity: 600 Tons</span>
                  <span>Safe Threshold: 100 Tons</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 dark:text-white">TLB Special Performance (SP)</span>
                  <span className="text-purple-600 font-mono font-bold">{tlbSpStock} Tons</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, (tlbSpStock / 400) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Capacity: 400 Tons</span>
                  <span>Safe Threshold: 50 Tons</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: Commercial & Financial Health (Right 1 column) */}
        <div className="space-y-6">
          {/* Commercial Sales Breakdown */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Commercial Performance
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                <span className="text-slate-500">Active Sale Orders:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{saleOrders.length} Orders</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                <span className="text-slate-500">Total B2B Customers:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{customers.length} Accounts</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                <span className="text-slate-500">Invoices Generated:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{taxInvoices.length} Invoices</span>
              </div>
            </div>

            <button
              onClick={() => setCurrentView('sales')}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors text-center block"
            >
              View Sales & Customer Accounts
            </button>
          </div>

          {/* Quick GM Reports Export */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white shadow-md space-y-3 text-xs">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-300" />
              GM Executive Reports
            </h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Generate compiled operational, financial, and fleet performance packages for executive board presentations.
            </p>
            <button
              onClick={() => setCurrentView('reports')}
              className="w-full py-2 rounded-xl bg-white text-slate-900 hover:bg-blue-50 font-bold transition-colors cursor-pointer"
            >
              Open Comprehensive Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

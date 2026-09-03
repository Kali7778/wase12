import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Crown,
  Shield,
  TrendingUp,
  Building,
  DollarSign,
  Truck,
  Boxes,
  Users,
  CheckCircle2,
  Lock,
  Eye,
  FileCheck,
  Award,
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
  Sparkles,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export const CeoPanelView: React.FC = () => {
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
    masterAudits,
    isViewOnlyRole,
    activeRole
  } = useApp();

  const [ceoOperationalOverride, setCeoOperationalOverride] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);

  // High level financial KPIs
  const totalRevenue = saleOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Asset Valuations
  const inventoryAssetValuation = warehouseItems.reduce((sum, item) => sum + item.quantityOnHand * item.unitCost, 0);
  const fleetAssetValuation = vehicles.length * 350000; // Estimated 350,000 SAR per heavy truck asset
  const totalEnterpriseAssets = inventoryAssetValuation + fleetAssetValuation;

  // CEO Tier Pending Approvals
  const ceoPendingApprovals = approvalRequests.filter((r) => r.status === 'pending' && r.requiredTier === 'ceo');

  return (
    <div id="ceo-panel-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Executive CEO Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-purple-950 text-white p-7 border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/30">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/30">
                    EXECUTIVE LEADERSHIP
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Office of the CEO</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                  Chief Executive Command & Governance
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Enterprise-level performance dashboard: Top-line revenue, net margin, total asset capitalization, executive sign-offs, and cryptographically verified Master Audit governance.
            </p>
          </div>

          {/* Operational View-Only Mode Safeguard Toggle */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 text-xs space-y-2 min-w-[260px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-400" /> Operational Mode
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                ceoOperationalOverride ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {ceoOperationalOverride ? 'Action Override' : 'View-Only (Safe)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {ceoOperationalOverride
                ? 'Executive action override granted for operational records.'
                : 'CEO view-only safeguard active for daily dispatch and slips.'}
            </p>
            <button
              onClick={() => setCeoOperationalOverride(!ceoOperationalOverride)}
              className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors text-center block cursor-pointer"
            >
              {ceoOperationalOverride ? 'Re-enable View-Only Safeguard' : 'Request Executive Override'}
            </button>
          </div>
        </div>

        {/* Executive Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7 pt-6 border-t border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 font-medium">Enterprise Revenue</span>
            <div className="text-2xl font-black text-white mt-1">{totalRevenue.toLocaleString()} SAR</div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-1 font-semibold">
              <ArrowUpRight className="w-3 h-3" /> Solid Top-Line Growth
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 font-medium">Net Profit Margin</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{profitMargin}%</div>
            <span className="text-[10px] text-slate-400 mt-1">{netProfit.toLocaleString()} SAR Net</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 font-medium">Total Asset Capitalization</span>
            <div className="text-2xl font-black text-purple-300 mt-1">{totalEnterpriseAssets.toLocaleString()} SAR</div>
            <span className="text-[10px] text-slate-400 mt-1">Fleet Assets + Bulk Silo Reserves</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 font-medium">Governance & Compliance</span>
            <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5" /> 100% Tax & Audit
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Master Audit Sealed</span>
          </div>
        </div>
      </div>

      {/* CEO Actions & Department Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CEO Approvals & Sign-offs (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Executive Sign-off Queue */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  CEO Executive Authorization Queue ({ceoPendingApprovals.length})
                </h3>
              </div>
              <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold">
                Tier: CEO ONLY
              </span>
            </div>

            <div className="space-y-3">
              {ceoPendingApprovals.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  No high-tier executive approval requests currently pending CEO signature.
                </div>
              ) : (
                ceoPendingApprovals.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {req.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                          CEO Sign-off
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                        {req.description}
                      </p>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Submitted by <strong>{req.requestedBy}</strong> ({req.requestedByRole}) • {req.requestedAt}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => processApprovalDecision(req.id, 'rejected', 'Executive Rejection by CEO')}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => processApprovalDecision(req.id, 'approved', 'Authorized & Signed by Chief Executive Officer (CEO)')}
                        className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/30 transition-colors cursor-pointer"
                      >
                        Sign & Authorize
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cross-Department Executive Rollup */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Enterprise Department Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="text-slate-400 font-medium">Logistics & Fleet</div>
                <div className="text-lg font-black text-slate-900 dark:text-white">{vehicles.length} Trucks</div>
                <div className="text-[11px] text-slate-500">{drivers.length} Certified Drivers • {trips.length} Total Trips</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="text-slate-400 font-medium">Commercial & B2B</div>
                <div className="text-lg font-black text-slate-900 dark:text-white">{customers.length} Enterprise Clients</div>
                <div className="text-[11px] text-slate-500">{saleOrders.length} Completed Orders</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="text-slate-400 font-medium">Warehouse Silos</div>
                <div className="text-lg font-black text-slate-900 dark:text-white">800 Tons Bulk</div>
                <div className="text-[11px] text-slate-500">TLB & TLB SP Silo Reserves</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Board Reports & Governance Controls */}
        <div className="space-y-6">
          {/* Board Presentation Package */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-950 text-white shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-purple-300" />
              <h4 className="text-base font-bold">Executive Board Package</h4>
            </div>

            <p className="text-xs text-purple-200 leading-relaxed">
              Consolidate financial P&L statements, fleet performance, and master audit logs into a unified executive board report.
            </p>

            <button
              onClick={() => setShowBoardModal(true)}
              className="w-full py-3 rounded-2xl bg-white text-slate-900 hover:bg-purple-50 font-bold text-xs shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-purple-700" />
              Generate Board Report
            </button>
          </div>

          {/* Master Audit Quick Access */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Master-Level Audit Trail</h4>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              {masterAudits.length} events cryptographically sealed in the immutable SHA-256 ledger.
            </p>
            <button
              onClick={() => setCurrentView('masterAudit')}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold transition-colors text-center block"
            >
              Open Master Audit Trail
            </button>
          </div>
        </div>
      </div>

      {/* Board Report Modal */}
      {showBoardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Executive Board Briefing Document
                </h3>
              </div>
              <button onClick={() => setShowBoardModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">1. Financial Performance</div>
                <div className="text-slate-500">Gross Sales: {totalRevenue.toLocaleString()} SAR • Net Operating Margin: {netProfit.toLocaleString()} SAR ({profitMargin}%)</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">2. Fleet & Logistics Scale</div>
                <div className="text-slate-500">{vehicles.length} Trucks • {drivers.length} Drivers • {trips.length} Trips Executed</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">3. Governance & Immutability</div>
                <div className="text-slate-500">Tax &amp; Regulatory Compliant • {masterAudits.length} Sealed Audit Events • Zero Deletions Permitted</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  window.print();
                  setShowBoardModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Board Brief
              </button>
              <button
                onClick={() => setShowBoardModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

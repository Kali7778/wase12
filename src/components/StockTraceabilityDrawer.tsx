import React from 'react';
import { WarehouseItem, WarehouseMovement, SaleOrder } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  X,
  History,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Building2,
  User,
  Truck,
  FileText,
  Calendar,
  Layers,
  ArrowDown,
  ArrowRight,
  Barcode,
  Sparkles,
} from 'lucide-react';

interface StockTraceabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: WarehouseItem | null;
  movements: WarehouseMovement[];
  saleOrders: SaleOrder[];
}

export const StockTraceabilityDrawer: React.FC<StockTraceabilityDrawerProps> = ({
  isOpen,
  onClose,
  item,
  movements,
  saleOrders,
}) => {
  if (!isOpen || !item) return null;

  // Filter movements for this specific item or DN
  const itemMovements = movements.filter(
    (m) =>
      m.itemId === item.id ||
      m.inventoryId === item.id ||
      (item.dnNumber && m.dnNumber === item.dnNumber) ||
      m.itemSku === item.sku
  );

  // Filter linked sales
  const linkedSales = saleOrders.filter(
    (s) =>
      (item.dnNumber && s.linkedDnNo === item.dnNumber) ||
      s.items.some((i) => i.itemId === item.id || i.sku === item.sku)
  );

  const totalStockIn = itemMovements
    .filter((m) => m.type === 'stock_in' || m.movementType === 'IN' || m.type === 'inbound_grn')
    .reduce((acc, m) => acc + (m.quantity || 0), 0);

  const totalStockOut = itemMovements
    .filter((m) => m.type === 'stock_out_sale' || m.movementType === 'OUT' || m.type === 'outbound_dispatch')
    .reduce((acc, m) => acc + (m.quantity || 0), 0);

  const availableStock = item.quantityOnHand;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-purple-400 border border-white/10">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">Stock Traceability &amp; Audit Trail</h2>
                {item.dnNumber && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-mono font-bold">
                    {item.dnNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete non-destructive ledger from TLB Supplier Slip to Customer Sales &amp; Master Audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Main Item Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm">{item.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                  <span>SKU: {item.sku}</span>
                  <span>•</span>
                  <span>Barcode: {item.barcode}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">
                {item.category}
              </span>
            </div>

            {/* Inventory Trace Formula Row */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 font-mono text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Total Stock In
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  +{totalStockIn || item.openingStock || item.quantityOnHand} {item.unit}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Customer Sales
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  -{totalStockOut} {item.unit}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300">
                <div className="text-[10px] font-bold">Available Balance</div>
                <div className="text-sm font-black mt-0.5">
                  {availableStock} {item.unit}
                </div>
              </div>
            </div>
          </div>

          {/* End-to-End Visual Workflow Progression */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
            <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> End-to-End Traceable Architecture
            </h4>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono leading-relaxed space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-bold text-indigo-600">1</span>
                <span>Supplier ({item.sourceSupplier || '—'}) → TLB Slip ({item.dnNumber || 'DN-001'})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-bold text-indigo-600">2</span>
                <span>TLB Main Inventory → <strong>Stock In (+{totalStockIn || item.openingStock || item.quantityOnHand})</strong> → Available Stock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-bold text-indigo-600">3</span>
                <span>Customer Order → Sale Approval → <strong>Stock Out (-{totalStockOut})</strong> → Customer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-bold text-indigo-600">4</span>
                <span>Sales Ledger → Official Tax Invoicing → <strong>GM / CEO Master Audit Ledger (Immutable)</strong></span>
              </div>
            </div>
          </div>

          {/* Chronological Movements Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-600" /> Movement History Records ({itemMovements.length})
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Non-destructive ledger</span>
            </div>

            <div className="space-y-3">
              {itemMovements.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No individual movement records logged yet for this item.
                </div>
              ) : (
                itemMovements.map((mov, idx) => {
                  const isIn = mov.movementType === 'IN' || mov.type === 'stock_in' || mov.type === 'inbound_grn';
                  return (
                    <div
                      key={mov.id || idx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 ${
                              isIn
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {isIn ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {isIn ? 'STOCK IN' : 'STOCK OUT (SALE)'}
                          </span>

                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                            {mov.referenceDoc || mov.saleId || mov.dnNumber}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400 font-mono">{mov.timestamp || mov.date}</span>
                      </div>

                      {/* Stock Math details */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs font-mono flex items-center justify-between">
                        <div className="text-slate-500">
                          Opening: <strong className="text-slate-800 dark:text-slate-200">{mov.previousQuantityOnHand ?? '—'}</strong>
                        </div>
                        <div className={`font-black ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIn ? `+${mov.quantity}` : `-${mov.quantity}`} {item.unit}
                        </div>
                        <div className="text-slate-500">
                          Balance: <strong className="text-purple-600 dark:text-purple-300">{mov.newQuantityOnHand ?? '—'}</strong>
                        </div>
                      </div>

                      {/* Customer / Driver details */}
                      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        {mov.customerName && (
                          <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                            <Building2 className="w-3.5 h-3.5 text-purple-500" />
                            <span>Customer: <strong>{mov.customerName}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          {mov.driverName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" /> Driver: {mov.driverName}
                            </span>
                          )}
                          {mov.vehiclePlate && (
                            <span className="flex items-center gap-1">
                              <Truck className="w-3 h-3 text-slate-400" /> Plate: {mov.vehiclePlate}
                            </span>
                          )}
                          <span>By: {mov.performedBy}</span>
                        </div>
                      </div>

                      {/* Cryptographic SHA-256 Seal */}
                      {mov.auditHash && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <ShieldCheck className="w-3 h-3" /> Master Audit SHA-256 Sealed
                          </span>
                          <span className="truncate max-w-[200px] text-slate-400">{mov.auditHash}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Current Stock On-Hand: <strong className="text-slate-900 dark:text-white font-mono">{availableStock} {item.unit}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Close Traceability View
          </button>
        </div>
      </div>
    </div>
  );
};

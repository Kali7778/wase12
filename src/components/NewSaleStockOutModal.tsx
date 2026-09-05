import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  X,
  ShoppingCart,
  ArrowUpRight,
  TrendingDown,
  ShieldCheck,
  Building2,
  User,
  Truck,
  FileCheck,
  Layers,
  Sparkles,
  Calculator,
  ArrowRight,
  CheckCircle2,
  QrCode,
} from 'lucide-react';

interface NewSaleStockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedDnNumber?: string;
  preselectedItemId?: string;
}

export const NewSaleStockOutModal: React.FC<NewSaleStockOutModalProps> = ({
  isOpen,
  onClose,
  preselectedDnNumber,
  preselectedItemId,
}) => {
  const {
    warehouseItems,
    customers,
    drivers,
    vehicles,
    executeStockOutForSale,
    companySettings,
    language,
    currentRole,
  } = useApp();

  const isAr = language === 'ar';

  // Find candidate items with available stock
  const tlbItems = warehouseItems.filter(
    (i) => (i.quantityOnHand > 0 || i.dnNumber) && (i.dnNumber?.startsWith('DN-') || i.sku.includes('TLB') || i.category === 'TLB Main Inventory')
  );
  const availableItems = tlbItems.length > 0 ? tlbItems : warehouseItems;

  const initialItem =
    availableItems.find((i) => (preselectedItemId && i.id === preselectedItemId) || (preselectedDnNumber && i.dnNumber === preselectedDnNumber)) ||
    availableItems[0];

  const [selectedItemId, setSelectedItemId] = useState<string>(initialItem?.id || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(200);
  const [unitPrice, setUnitPrice] = useState<number>(initialItem?.sellingPrice || 18);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_account');
  const [driverId, setDriverId] = useState<string>(drivers[0]?.id || 'drv_1');
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id || 'veh_1');
  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const targetItem = warehouseItems.find((i) => i.id === selectedItemId) || initialItem;
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedDriver = drivers.find((d) => d.id === driverId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const customerName = customCustomerName.trim() || selectedCustomer?.name || 'Customer A (مؤسسة صرح البنيان)';
  const customerVat = selectedCustomer?.vatNumber || '300998127300003';

  const openingStock = targetItem ? targetItem.quantityOnHand : 750;
  const remainingStock = Math.max(0, openingStock - (Number(quantity) || 0));

  const subtotal = (Number(quantity) || 0) * (Number(unitPrice) || 0);
  const vatAmount = subtotal * 0.15;
  const grandTotal = subtotal + vatAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;
    if (quantity <= 0) return;

    executeStockOutForSale({
      customerId: selectedCustomerId || 'cust_custom',
      customerName: customerName,
      customerVat: customerVat,
      inventoryId: targetItem.id,
      dnNumber: targetItem.dnNumber || 'DN-001',
      itemSku: targetItem.sku,
      itemName: targetItem.name,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      paymentMethod,
      driverId: selectedDriver?.id,
      driverName: selectedDriver?.name,
      vehiclePlate: selectedVehicle?.plateNumber,
      performedBy: `${currentRole === 'super_admin' ? 'Super Admin' : 'Operations Manager'} (Fahad Al-Malki)`,
      autoApprove,
      notes: notes || `Direct stock out for Customer Order from ${targetItem.dnNumber || 'TLB Main Inventory'}.`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Customer Sale &amp; Stock Out</h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[10px] font-mono font-black uppercase">
                  Stock Out Record
                </span>
              </div>
              <p className="text-xs text-purple-100/90 mt-0.5">
                Issue goods directly from TLB Main Inventory with linked traceability &amp; Official Invoice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Traceable Formula Card */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Calculator className="w-4 h-4 text-purple-600" />
              <span>Traceable Inventory Balance Calculation:</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              DN: <strong className="text-purple-600 dark:text-purple-400">{targetItem?.dnNumber || 'DN-001'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-center font-mono">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-500">Opening Available</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                {openingStock} {targetItem?.unit || 'BAG'}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 shadow-2xs">
              <div className="text-[10px] uppercase font-bold flex items-center justify-center gap-1">
                <TrendingDown className="w-3 h-3" /> Sale Stock Out
              </div>
              <div className="text-sm font-black mt-0.5">
                -{quantity || 0} {targetItem?.unit || 'BAG'}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 shadow-2xs">
              <div className="text-[10px] uppercase font-bold">Remaining Available</div>
              <div className="text-sm font-black mt-0.5">
                {remainingStock} {targetItem?.unit || 'BAG'}
              </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Inventory Item / Batch Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              1. Source Main Inventory Batch / DN *
            </label>
            <select
              value={selectedItemId ?? ""}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                const found = warehouseItems.find((i) => i.id === e.target.value);
                if (found?.sellingPrice) setUnitPrice(found.sellingPrice);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              required
            >
              {availableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.dnNumber ? `[${item.dnNumber}] ` : ''}
                  {item.name} — Available: {item.quantityOnHand} {item.unit} (Price: {item.sellingPrice} SAR)
                </option>
              ))}
            </select>
            {targetItem && (
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                <span>Location: <strong>{targetItem.aisle || 'Bay B-01'}</strong> ({targetItem.rack || 'Silo 1'})</span>
                <span>•</span>
                <span>Supplier Origin: <strong>{targetItem.sourceSupplier || '—'}</strong></span>
              </p>
            )}
          </div>

          {/* Customer Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                2. Select Customer Account *
              </label>
              <select
                value={selectedCustomerId ?? ""}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setCustomCustomerName('');
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.customerNumber ? `(${c.customerNumber})` : ''}
                  </option>
                ))}
                <option value="cust_custom">+ Manual Customer Name</option>
              </select>
            </div>

            {selectedCustomerId === 'cust_custom' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Customer / Establishment Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer A (مؤسسة صرح البنيان)"
                  value={customCustomerName ?? ""}
                  onChange={(e) => setCustomCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Terms / Method
              </label>
              <select
                value={paymentMethod ?? ""}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              >
                <option value="credit_account">Credit Account (Net 30 / آجل)</option>
                <option value="bank_transfer">Bank Transfer (تحويل بنكي)</option>
                <option value="mada">MADA / Debit Card (مدى)</option>
                <option value="cash">Cash on Delivery (نقداً)</option>
              </select>
            </div>
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/60">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Sale Quantity ({targetItem?.unit || 'BAG'}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={openingStock}
                  value={quantity ?? ""}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                  max {openingStock}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Unit Selling Price (SAR) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={unitPrice ?? ""}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Pricing Breakdown Summary */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center text-sm">
              <span className="font-sans font-black text-slate-200">Total Amount ({quantity} × {formatCurrency(unitPrice)}):</span>
              <span className="text-emerald-400 font-black text-base">{formatCurrency(quantity * unitPrice)}</span>
            </div>
          </div>

          {/* Driver & Truck Assignment for Dispatch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" /> Assigned Delivery Driver
              </label>
              <select
                value={driverId ?? ""}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.nationality})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-500" /> Assigned Transport Truck
              </label>
              <select
                value={vehicleId ?? ""}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.model} - {v.capacityTons}T)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Internal Dispatch &amp; Sale Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Customer site gate 4, contact site engineer prior to offload."
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
            />
          </div>

          {/* Instant Approval Checkbox */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
            <input
              type="checkbox"
              id="auto-approve-sale"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="auto-approve-sale" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <strong className="text-emerald-700 dark:text-emerald-400 font-bold block">
                Instant Approval &amp; Stock Out Execution
              </strong>
              Immediately creates the <code>STOCK OUT</code> movement record, deducts available balance to{' '}
              <span className="font-mono font-bold text-emerald-600">{remainingStock}</span>, generates the Official
              Invoice and stamps GM/CEO Master Audit record.
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Stock Out for Sale</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

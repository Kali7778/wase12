import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Receipt,
  Building2,
  Truck,
  Plus,
  Save,
  PackagePlus,
  ShieldCheck,
  TrendingUp,
  Boxes,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { CustomerInvoice, InvoicePaymentStatus } from '../types';
import { formatCurrency } from '../utils/i18n';

interface CustomerInvoiceFormModalProps {
  invoiceToEdit?: CustomerInvoice | null;
  defaultCustomerId?: string;
  initialValues?: {
    dnNumber?: string;
    customerName?: string;
    customerId?: string;
    customerNumber?: string;
    productService?: string;
    quantity?: number;
    unitPrice?: number;
    notes?: string;
    stockCredited?: boolean;
    paymentStatus?: InvoicePaymentStatus;
  };
  onClose: () => void;
}

export const CustomerInvoiceFormModal: React.FC<CustomerInvoiceFormModalProps> = ({
  invoiceToEdit,
  defaultCustomerId,
  initialValues,
  onClose,
}) => {
  const {
    customers,
    trips,
    drivers,
    vehicles,
    warehouseItems,
    addCustomerInvoice,
    updateCustomerInvoice,
    verifyAndCreditCustomerInvoiceStockIn,
    showToast,
  } = useApp();

  const isEdit = !!invoiceToEdit;

  const [invoiceNumber, setInvoiceNumber] = useState(
    invoiceToEdit?.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [invoiceDate, setInvoiceDate] = useState(
    invoiceToEdit?.invoiceDate || new Date().toISOString().split('T')[0]
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    invoiceToEdit?.customerId || initialValues?.customerId || defaultCustomerId || customers[0]?.id || ''
  );
  const [customCustomerName, setCustomCustomerName] = useState(
    invoiceToEdit?.customerName || initialValues?.customerName || ''
  );
  const [selectedDnNumber, setSelectedDnNumber] = useState(
    invoiceToEdit?.dnNumber || initialValues?.dnNumber || ''
  );
  const [productService, setProductService] = useState(
    invoiceToEdit?.productService || initialValues?.productService || 'TLB (Truck Load Bulk)'
  );
  const [quantity, setQuantity] = useState<number>(
    invoiceToEdit?.quantity ?? initialValues?.quantity ?? 2
  );
  const [unitPrice, setUnitPrice] = useState<number>(
    invoiceToEdit?.unitPrice ?? initialValues?.unitPrice ?? 1000
  );
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>(
    invoiceToEdit?.paymentStatus || initialValues?.paymentStatus || 'paid'
  );
  const [notes, setNotes] = useState(
    invoiceToEdit?.notes ||
      initialValues?.notes ||
      'Standard freight haulage delivery and logistical services.'
  );
  const [creditStockInChecked, setCreditStockInChecked] = useState(
    invoiceToEdit?.stockCredited ?? initialValues?.stockCredited ?? true
  );

  // Auto-calculated strictly as Quantity * Unit Price
  const totalAmount = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  // Sync selected customer info
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Quick service / item presets
  const servicePresets = [
    { label: 'TLB (Truck Load Bulk)', price: 1000 },
    { label: 'Truck Transportation', price: 1000 },
    { label: 'Heavy Trailer Long-Haul', price: 3500 },
    { label: 'Reefer Cold-Chain (+4°C)', price: 4200 },
    { label: 'Direct Dyna Multi-Drop', price: 800 },
    { label: 'Bulk Silo Chemical Haulage', price: 1800 },
    { label: 'Flatbed Steel Rod Haulage', price: 2200 },
  ];

  const handleSaveInvoice = (creditStockInNow: boolean) => {
    if (!invoiceNumber.trim()) {
      showToast('Validation Error', 'Please specify an Invoice Number.', 'warning');
      return;
    }

    const customerName = selectedCustomer ? selectedCustomer.name : customCustomerName.trim() || 'Valued Customer';
    const dnNum = selectedDnNumber || `DN-${Math.floor(1000 + Math.random() * 9000)}`;

    if (isEdit && invoiceToEdit) {
      updateCustomerInvoice(invoiceToEdit.id, {
        invoiceNumber,
        invoiceDate,
        customerId: selectedCustomer ? selectedCustomer.id : invoiceToEdit.customerId,
        customerName,
        customerNumber: selectedCustomer?.customerNumber || invoiceToEdit.customerNumber,
        dnNumber: dnNum,
        productService,
        quantity: Number(quantity) || 1,
        unitPrice: Number(unitPrice) || 0,
        totalAmount,
        paymentStatus,
        notes,
      });

      if (creditStockInNow && !invoiceToEdit.stockCredited) {
        verifyAndCreditCustomerInvoiceStockIn(invoiceToEdit.id, Number(quantity) || 1);
      }
    } else {
      addCustomerInvoice(
        {
          invoiceNumber,
          invoiceDate,
          customerId: selectedCustomer ? selectedCustomer.id : 'cust_guest',
          customerName,
          customerNumber: selectedCustomer?.customerNumber || '',
          dnNumber: dnNum,
          productService,
          quantity: Number(quantity) || 1,
          unitPrice: Number(unitPrice) || 0,
          totalAmount,
          paymentStatus,
          notes,
          stockCredited: creditStockInNow,
        },
        creditStockInNow
      );
    }

    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveInvoice(creditStockInChecked);
  };

  return (
    <div
      id="customer-invoice-form-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="customer-invoice-form-container"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isEdit ? 'Edit Customer Sale (Stock Out)' : '+ Customer Sale (Stock Out)'}
              </h3>
              <p className="text-xs text-slate-500">
                Commercial Sales &amp; Stock Out Billing • Unit Price × Quantity Formula
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Top Row: Invoice Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Invoice No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber ?? ""}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2026-101"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Invoice Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={invoiceDate ?? ""}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Customer & DN No. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Customer Account <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCustomerId ?? ""}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerNumber || c.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                DN No. (Delivery Note / Slip)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedDnNumber ?? ""}
                  onChange={(e) => setSelectedDnNumber(e.target.value)}
                  placeholder="e.g. DN-2026-0801"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  onChange={(e) => e.target.value && setSelectedDnNumber(e.target.value)}
                  className="px-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-mono"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Pick Trip DN
                  </option>
                  {trips.slice(0, 10).map((t) => (
                    <option key={t.id} value={t.dnNumber || t.tripNumber}>
                      {t.dnNumber || t.tripNumber} ({t.customerName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Product / Service Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Product / Service / Cargo Item <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Quick presets below</span>
            </div>
            <input
              type="text"
              required
              value={productService ?? ""}
              onChange={(e) => setProductService(e.target.value)}
              placeholder="e.g. TLB (Truck Load Bulk)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {/* Presets Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {servicePresets.map((sp) => (
                <button
                  type="button"
                  key={sp.label}
                  onClick={() => {
                    setProductService(sp.label);
                    setUnitPrice(sp.price);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  {sp.label} • {formatCurrency(sp.price)}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Unit Price & Total Calculation */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity ?? ""}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Unit Price (SAR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={unitPrice ?? ""}
                  onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Live Calculation Banner */}
            <div className="pt-2 border-t border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Formula: Quantity ({quantity}) × Unit Price ({formatCurrency(unitPrice)}) =
              </span>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-bold mr-2 uppercase">Total Amount:</span>
                <span className="font-mono text-lg font-black text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-blue-300 dark:border-blue-700 shadow-sm">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Status
              </label>
              <select
                value={paymentStatus ?? ""}
                onChange={(e) => setPaymentStatus(e.target.value as InvoicePaymentStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="paid">Paid (مدفوع)</option>
                <option value="unpaid">Unpaid (غير مدفوع)</option>
                <option value="partial">Partial (مدفوع جزئياً)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Notes
              </label>
              <input
                type="text"
                value={notes ?? ""}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional delivery or invoice notes..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Stock In Verification Preview Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                    Warehouse Stock In Linkage
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Crediting stock will immediately verify and inject +{quantity} units into Main Available Inventory.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={creditStockInChecked}
                  onChange={(e) => setCreditStockInChecked(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Credit Stock In
                </span>
              </label>
            </div>

            <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-900/40 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="text-slate-600 dark:text-slate-400">
                <span className="text-slate-400 block text-[10px]">Target Item:</span>
                <strong className="text-slate-800 dark:text-slate-200">{productService}</strong>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                <span className="text-slate-400 block text-[10px]">Stock Delta:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">+{quantity} Units Inward</strong>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                <span className="text-slate-400 block text-[10px]">Linked Slip / DN:</span>
                <strong className="font-mono text-blue-600 dark:text-blue-400">{selectedDnNumber || 'Auto-generated DN'}</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons: Standard Save vs Dedicated "Verify & Credit Stock In" Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-center"
            >
              Cancel
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {/* Standard Save Customer Sale (Stock Out) */}
              <button
                type="submit"
                id="create-customer-sale-btn"
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isEdit ? 'Save Changes' : '+ Customer Sale (Stock Out)'}</span>
              </button>

              {/* Dedicated "Verify & Credit Stock In" Button */}
              <button
                type="button"
                id="verify-credit-stock-in-btn"
                onClick={() => handleSaveInvoice(true)}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
                title="Save Customer Invoice & Immediately Verify + Credit Stock In to Main Inventory"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>Verify &amp; Credit Stock In</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};


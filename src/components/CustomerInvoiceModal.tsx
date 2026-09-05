import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Printer,
  Receipt,
  Building2,
  CheckCircle2,
  PackagePlus,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '../utils/i18n';
import { CustomerInvoice } from '../types';

interface CustomerInvoiceModalProps {
  invoice?: CustomerInvoice | null;
  onClose?: () => void;
}

export const CustomerInvoiceModal: React.FC<CustomerInvoiceModalProps> = ({
  invoice: propInvoice,
  onClose: propOnClose,
}) => {
  const {
    selectedCustomerInvoice,
    setSelectedCustomerInvoice,
    selectedInvoice,
    setSelectedInvoice,
    customerInvoices,
    verifyAndCreditCustomerInvoiceStockIn,
    companySettings,
  } = useApp();

  const baseInv: any = propInvoice || selectedCustomerInvoice || selectedInvoice;

  // Real-time lookup to reflect updated status
  const currentInvFromState = customerInvoices.find((i) => i.id === baseInv?.id);
  const inv = currentInvFromState || baseInv;

  if (!inv) return null;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      setSelectedCustomerInvoice(null);
      setSelectedInvoice(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = inv.invoiceNumber || '—';
  const invoiceDate = inv.invoiceDate || inv.issueDate || '2026-08-19';
  const customerName = inv.customerName || inv.buyerName || 'Customer Client';
  const dnNumber = inv.dnNumber || inv.tripNumber || inv.loadNumber || 'DN-2026-000';
  const productService = inv.productService || inv.items?.[0]?.description || 'TLB (Truck Load Bulk)';
  const quantity = Number(inv.quantity || inv.items?.[0]?.quantity || 1);
  const unitPrice = Number(inv.unitPrice ?? (inv.items?.[0]?.unitPrice ?? (inv.totalAmount ? inv.totalAmount / quantity : 1000)));
  const totalAmount = Number(inv.totalAmount ?? (quantity * unitPrice));
  const paymentStatus = inv.paymentStatus || (inv.isPaid ? 'paid' : 'unpaid');
  const paidAmount = Number(inv.paidAmount ?? (paymentStatus === 'paid' ? totalAmount : 0));
  const outstandingAmount = Math.max(0, totalAmount - paidAmount);
  const notes = inv.notes || 'Standard logistics haulage and transportation service.';
  const isStockCredited = !!inv.stockCredited;

  const handleVerifyAndCreditStock = () => {
    if (inv.id) {
      verifyAndCreditCustomerInvoiceStockIn(inv.id, quantity);
    }
  };

  return (
    <div
      id="customer-invoice-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
      onClick={handleClose}
    >
      <div
        id="customer-invoice-modal-container"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Customer Sale (Stock Out) <span className="font-mono text-blue-600 dark:text-blue-400">{invoiceNumber}</span>
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    paymentStatus === 'paid'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : paymentStatus === 'partial'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {paymentStatus}
                </span>

                {isStockCredited ? (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Stock Credited (+{inv.stockCreditedQty || quantity})
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                    Stock Uncredited
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Commercial &amp; Accounts Billing (No QR • Direct Unit Price × Quantity)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isStockCredited && (
              <button
                id="modal-verify-credit-stock-in-btn"
                onClick={handleVerifyAndCreditStock}
                className="px-3.5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                title="Verify goods and credit stock in to warehouse inventory"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify &amp; Credit Stock In</span>
              </button>
            )}

            <button
              id="customer-invoice-print-btn"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stock Credit Inward Alert Banner */}
        {isStockCredited ? (
          <div className="mx-8 mt-6 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-emerald-600 text-white">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  Stock In Verified &amp; Credited to Inventory
                </span>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  +{inv.stockCreditedQty || quantity} units of {productService} credited to Main Inventory
                  {inv.stockCreditedAt ? ` on ${inv.stockCreditedAt}` : ''}.
                </p>
              </div>
            </div>
            <span className="font-mono text-emerald-800 dark:text-emerald-300 font-black text-xs px-2.5 py-1 bg-white dark:bg-emerald-900 rounded-lg border border-emerald-200 dark:border-emerald-700">
              +{inv.stockCreditedQty || quantity} Units
            </span>
          </div>
        ) : (
          <div className="mx-8 mt-6 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-amber-600 text-white">
                <PackagePlus className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Inventory Stock In Status: Pending Credit
                </span>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  This commercial delivery note has not been credited to warehouse stock yet.
                </p>
              </div>
            </div>
            <button
              onClick={handleVerifyAndCreditStock}
              className="px-3.5 py-1.5 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify &amp; Credit Stock In</span>
            </button>
          </div>
        )}

        {/* Printable Customer Invoice Document */}
        <div id="printable-customer-invoice" className="p-8 space-y-6 bg-white dark:bg-slate-900">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                  LF
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {companySettings.companyName || '—'}
                  </h2>
                  <p className="text-xs text-slate-500">Commercial Invoicing &amp; Operations</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                <p>{companySettings.address || '—'}, {companySettings.city || '—'}</p>
                <p>Phone: {companySettings.phone || '—'}</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wider inline-block">
                Customer Sale (Stock Out)
              </span>
              <div className="text-2xl font-mono font-black text-slate-900 dark:text-white mt-1">
                {invoiceNumber}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Invoice Date: <span className="font-mono text-slate-800 dark:text-slate-200">{invoiceDate}</span>
              </div>
            </div>
          </div>

          {/* Customer & DN Info Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Billed To (Customer):
              </span>
              <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                {customerName}
              </div>
              {inv.customerNumber && (
                <div className="text-xs font-mono text-slate-500">
                  Account Ref: {inv.customerNumber}
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-slate-500 font-medium">DN No. (Delivery Note):</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                  {dnNumber}
                </span>
              </div>
              {inv.driverName && (
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <span className="text-slate-500">Driver / Vehicle:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {inv.driverName} {inv.vehiclePlate ? `• ${inv.vehiclePlate}` : ''}
                  </span>
                </div>
              )}
              {inv.pickupLocation && (
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <span className="text-slate-500">Route:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {inv.pickupLocation} → {inv.dropLocation || 'Delivery Destination'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Product & Service Table - STRICT COLUMNS: Product/Service, Quantity, Unit Price, Total Amount */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold uppercase">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Product / Service</th>
                  <th className="p-3.5 text-center">Quantity</th>
                  <th className="p-3.5 text-right">Unit Price</th>
                  <th className="p-3.5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono text-slate-400">1</td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {productService}
                  </td>
                  <td className="p-3.5 text-center font-mono font-black text-sm text-slate-800 dark:text-slate-100">
                    {quantity}
                  </td>
                  <td className="p-3.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(unitPrice)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-black text-base text-slate-900 dark:text-white">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Formula Callout: Quantity x Unit Price = Total Amount */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-slate-400 font-sans font-semibold">
              Calculation Logic:
            </span>
            <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">
              <span>Qty {quantity}</span>
              <span>×</span>
              <span>Unit Price {formatCurrency(unitPrice)}</span>
              <span>=</span>
              <span className="text-sm font-black text-blue-900 dark:text-blue-100 bg-white dark:bg-blue-900/80 px-2 py-0.5 rounded-lg border border-blue-300 dark:border-blue-700">
                Total {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Bottom Section: Notes & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
            {/* Notes & Payment Status */}
            <div className="sm:col-span-7 space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Invoice Notes &amp; Terms:
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {notes}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Commercial customer invoice authenticated for billing ledger.</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="sm:col-span-5 space-y-2.5">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    {paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid to Date:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding Balance:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(outstandingAmount)}
                  </span>
                </div>
              </div>

              {/* Grand Total Box */}
              <div className="flex justify-between items-center py-3 px-4 rounded-2xl bg-slate-900 text-white dark:bg-blue-950 dark:border dark:border-blue-800 font-bold">
                <span className="text-xs uppercase tracking-wider">Total Amount:</span>
                <span className="font-mono text-xl font-black text-blue-400">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

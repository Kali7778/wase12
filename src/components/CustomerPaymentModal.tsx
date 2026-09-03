import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, TaxInvoice } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  X,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Calendar,
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface CustomerPaymentModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'payment_in' | 'payment_out';
  defaultInvoiceId?: string;
}

export const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
  customer,
  isOpen,
  onClose,
  defaultType = 'payment_in',
  defaultInvoiceId = '',
}) => {
  const { customerInvoices, taxInvoices, recordCustomerPayment, showToast, activeRole } = useApp();

  const [paymentType, setPaymentType] = useState<'payment_in' | 'payment_out'>(defaultType);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(defaultInvoiceId);
  const [amount, setAmount] = useState<number>(() => {
    if (defaultInvoiceId) {
      const commInv = customerInvoices.find((i) => i.id === defaultInvoiceId);
      if (commInv) return commInv.outstandingAmount !== undefined ? commInv.outstandingAmount : (commInv.totalAmount || commInv.quantity * commInv.unitPrice);
      const taxInv = taxInvoices.find((i) => i.id === defaultInvoiceId);
      if (taxInv) return taxInv.outstandingAmount !== undefined ? taxInv.outstandingAmount : (taxInv.grandTotal || taxInv.totalAmount || 0);
    }
    return customer.outstandingAmount ?? customer.outstandingBalance ?? 0;
  });
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState<string>(
    () => `PAY-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  // Filter commercial customer invoices for this customer
  const matchingCommInvoices = customerInvoices.filter(
    (inv) =>
      inv.customerId === customer.id ||
      (inv.customerNumber && inv.customerNumber === customer.customerNumber) ||
      inv.customerName?.toLowerCase() === customer.name.toLowerCase()
  );

  const selectedCommInvoice = matchingCommInvoices.find((i) => i.id === selectedInvoiceId);

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (invId) {
      const commInv = matchingCommInvoices.find((i) => i.id === invId);
      if (commInv) {
        const remaining = commInv.outstandingAmount !== undefined ? commInv.outstandingAmount : (commInv.totalAmount || (commInv.quantity * commInv.unitPrice));
        setAmount(remaining);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      showToast('Invalid Amount', 'Please enter a valid payment amount greater than zero.', 'warning');
      return;
    }

    const targetInv = selectedInvoiceId ? matchingCommInvoices.find((i) => i.id === selectedInvoiceId) : undefined;

    recordCustomerPayment({
      customerId: customer.id,
      type: paymentType,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || `PAY-${Date.now()}`,
      invoiceId: targetInv?.id,
      invoiceNumber: targetInv?.invoiceNumber,
      tripNumber: targetInv?.dnNumber,
      dnNumber: targetInv?.dnNumber,
      notes: notes.trim() || `${paymentType === 'payment_in' ? 'Payment In' : 'Payment Out'} for ${customer.name}`,
      recordedBy: activeRole ? `${activeRole.toUpperCase()} Finance Officer` : 'Accounts Dept',
    });

    onClose();
  };

  return (
    <div
      id="customer-payment-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                paymentType === 'payment_in'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
              }`}
            >
              {paymentType === 'payment_in' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {paymentType === 'payment_in' ? 'Record Payment In (Credit)' : 'Record Payment Out (Debit / Refund)'}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{customer.name}</span>
                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">({customer.customerNumber || customer.id})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Balance Summary Bar */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Billed</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(customer.totalAmount ?? customer.totalBilled ?? 0)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Paid to Date</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(customer.paidAmount ?? 0)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Due</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(customer.outstandingAmount ?? customer.outstandingBalance ?? 0)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Payment Type Switcher */}
          <div>
            <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">Transaction Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('payment_in')}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  paymentType === 'payment_in'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Payment In (Received)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('payment_out')}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  paymentType === 'payment_out'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Payment Out (Refund / Debit)</span>
              </button>
            </div>
          </div>

          {/* Invoice Linking (Optional) */}
          <div>
            <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              Link to Specific Customer Invoice (Optional)
            </label>
            <select
              value={selectedInvoiceId ?? ""}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">-- General Account Balance (Unlinked) --</option>
              {matchingCommInvoices.map((inv) => {
                const total = inv.totalAmount || (inv.quantity * inv.unitPrice);
                const due = inv.outstandingAmount !== undefined ? inv.outstandingAmount : total;
                return (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} • {inv.productService} (Total: {formatCurrency(total)} | Due: {formatCurrency(due)} | Status: {inv.paymentStatus.toUpperCase()})
                  </option>
                );
              })}
            </select>
            {selectedCommInvoice && (
              <div className="mt-1.5 p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-center justify-between">
                <span>Invoice: {selectedCommInvoice.invoiceNumber} (DN: {selectedCommInvoice.dnNumber || 'N/A'})</span>
                <span className="font-bold">Remaining Due: {formatCurrency(selectedCommInvoice.outstandingAmount ?? (selectedCommInvoice.totalAmount || (selectedCommInvoice.quantity * selectedCommInvoice.unitPrice)))}</span>
              </div>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Amount (SAR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white text-sm"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">SAR</span>
              </div>
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate ?? ""}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Method & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Payment Channel</label>
              <select
                value={paymentMethod ?? ""}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="bank_transfer">Al-Rajhi / SARIE Bank Transfer</option>
                <option value="corporate_check">Corporate Check / Promissory Note</option>
                <option value="pos_card">POS Terminal Card / Mada / Visa</option>
                <option value="cash_receipt">Cash Voucher Receipt</option>
                <option value="sadad_biller">SADAD Biller Gateway</option>
                <option value="advance_credit">Prepaid Advance Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Reference / Receipt # <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={referenceNumber ?? ""}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. TRF-8829103"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Ledger Remarks / Notes</label>
            <input
              type="text"
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared via Al-Rajhi Corporate account transfer"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${
                paymentType === 'payment_in'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm {paymentType === 'payment_in' ? 'Payment In' : 'Payment Out'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

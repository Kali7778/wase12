import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TaxInvoice } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  X,
  CreditCard,
  CheckCircle2,
  Receipt,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';

interface InvoicePaymentModalProps {
  invoice: TaxInvoice;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const { recordInvoicePayment, showToast, activeRole } = useApp();

  const total = invoice.grandTotal || invoice.totalAmount || 0;
  const currentOutstanding = invoice.outstandingAmount !== undefined ? invoice.outstandingAmount : (invoice.isPaid ? 0 : total);

  const [paymentAmount, setPaymentAmount] = useState<number>(currentOutstanding);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState<string>(
    () => `TRF-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) {
      showToast('Invalid Amount', 'Please enter a valid payment amount.', 'warning');
      return;
    }

    recordInvoicePayment(invoice.id, {
      amount: Number(paymentAmount),
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || `REF-${Date.now()}`,
      notes: notes.trim() || `Settlement for Invoice ${invoice.invoiceNumber}`,
      recordedBy: activeRole ? `${activeRole.toUpperCase()} Finance Officer` : 'Finance Dept',
    });

    onClose();
  };

  return (
    <div
      id="invoice-payment-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Record Invoice Payment
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {invoice.invoiceNumber} • {invoice.customerName || invoice.buyerName}
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

        {/* Invoice Balance Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(total)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Paid</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(invoice.paidAmount ?? (invoice.isPaid ? total : 0))}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Due</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(currentOutstanding)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
              Payment Amount (SAR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                min="0.01"
                max={currentOutstanding > 0 ? currentOutstanding : undefined}
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">SAR</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate ?? ""}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Payment Channel</label>
              <select
                value={paymentMethod ?? ""}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="bank_transfer">Bank Wire (Al-Rajhi/SNB)</option>
                <option value="corporate_check">Corporate Check</option>
                <option value="pos_card">POS Terminal Card</option>
                <option value="cash_receipt">Cash Voucher</option>
              </select>
            </div>
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
              placeholder="e.g. TRF-102948"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Remarks</label>
            <input
              type="text"
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

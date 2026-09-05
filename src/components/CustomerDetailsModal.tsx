import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, Trip, CustomerInvoice, CustomerPaymentEntry, CustomerHistoryEntry } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Edit,
  Trash2,
  Plus,
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Receipt,
  Scale,
  Calendar,
  DollarSign
} from 'lucide-react';
import { CustomerPaymentModal } from './CustomerPaymentModal';
import { CustomerStatementModal } from './CustomerStatementModal';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerInvoiceModal } from './CustomerInvoiceModal';
import { CustomerInvoiceFormModal } from './CustomerInvoiceFormModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface CustomerDetailsModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

interface SubLedgerRow {
  id: string;
  date: string;
  refNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid' | 'settled';
  type: 'invoice' | 'payment_in' | 'payment_out';
  rawItem?: CustomerInvoice | CustomerPaymentEntry;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customer,
  isOpen,
  onClose,
}) => {
  const {
    trips,
    customerInvoices,
    deleteCustomer,
    deleteCustomerInvoice,
    showToast,
    activeRole,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'subledger' | 'invoices' | 'payments' | 'overview' | 'workflow' | 'history'>('subledger');
  
  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalType, setPaymentModalType] = useState<'payment_in' | 'payment_out'>('payment_in');
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceToView, setInvoiceToView] = useState<CustomerInvoice | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<CustomerInvoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<CustomerInvoice | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!isOpen) return null;

  // 1. Associated Commercial Customer Invoices (No QR, Quantity x Unit Price = Total)
  const matchingCustomerInvoices = customerInvoices.filter(
    (inv) =>
      inv.customerId === customer.id ||
      (inv.customerNumber && inv.customerNumber === customer.customerNumber) ||
      inv.customerName?.toLowerCase() === customer.name.toLowerCase()
  );

  // 2. Associated Customer Payments
  const customerPayments: CustomerPaymentEntry[] = customer.payments || [];
  const customerHistory: CustomerHistoryEntry[] = customer.history || [];

  // 3. Associated Trips / Loads
  const customerTrips = trips.filter(
    (t) =>
      t.customerId === customer.id ||
      (t.customerName && t.customerName.toLowerCase() === customer.name.toLowerCase()) ||
      (t.companyName && t.companyName.toLowerCase() === customer.name.toLowerCase()) ||
      (customer.companyName && t.companyName && t.companyName.toLowerCase() === customer.companyName.toLowerCase())
  );

  // 4. Calculate Financial Sub-Ledger Entries (Chronological with running balance)
  const { subLedgerRows, totalDebits, totalCredits, netOutstandingBalance, lastInvoice, lastPayment } = useMemo(() => {
    const entries: {
      id: string;
      date: string;
      refNumber: string;
      description: string;
      debit: number;
      credit: number;
      status: 'paid' | 'partial' | 'unpaid' | 'settled';
      type: 'invoice' | 'payment_in' | 'payment_out';
      rawItem?: CustomerInvoice | CustomerPaymentEntry;
      sortTime: number;
    }[] = [];

    // Add Invoices (Debit)
    matchingCustomerInvoices.forEach((inv) => {
      const invTotal = inv.totalAmount || (inv.quantity * inv.unitPrice);
      const dateVal = inv.invoiceDate || '2026-08-20';
      const timeVal = inv.createdAt ? new Date(inv.createdAt).getTime() : new Date(dateVal).getTime();
      
      entries.push({
        id: inv.id,
        date: dateVal,
        refNumber: inv.invoiceNumber,
        description: `Customer Invoice (${inv.productService || 'Truck Transportation'})`,
        debit: invTotal,
        credit: 0,
        status: inv.paymentStatus || 'unpaid',
        type: 'invoice',
        rawItem: inv,
        sortTime: timeVal,
      });
    });

    // Add Payments (Credit / Debit for refunds)
    customerPayments.forEach((pmt) => {
      const isPaymentIn = pmt.type === 'payment_in';
      const dateVal = pmt.paymentDate || '2026-08-20';
      const timeVal = pmt.timestamp ? new Date(pmt.timestamp).getTime() : new Date(dateVal).getTime();

      entries.push({
        id: pmt.id,
        date: dateVal,
        refNumber: pmt.referenceNumber,
        description: `${isPaymentIn ? 'Customer Payment' : 'Payment Out (Refund)'} • ${pmt.paymentMethod?.replace(/_/g, ' ') || 'Bank Transfer'}${pmt.notes ? ` (${pmt.notes})` : ''}`,
        debit: isPaymentIn ? 0 : pmt.amount,
        credit: isPaymentIn ? pmt.amount : 0,
        status: 'settled',
        type: pmt.type,
        rawItem: pmt,
        sortTime: timeVal,
      });
    });

    // Sort chronologically ascending for running balance calculation
    entries.sort((a, b) => a.sortTime - b.sortTime || a.date.localeCompare(b.date));

    // Calculate running balance: Balance = Previous Balance + Debit - Credit
    let running = 0;
    let debSum = 0;
    let credSum = 0;

    const computedRows: SubLedgerRow[] = entries.map((e) => {
      debSum += e.debit;
      credSum += e.credit;
      running += (e.debit - e.credit);

      return {
        id: e.id,
        date: e.date,
        refNumber: e.refNumber,
        description: e.description,
        debit: e.debit,
        credit: e.credit,
        balance: running,
        status: e.status,
        type: e.type,
        rawItem: e.rawItem,
      };
    });

    // Calculate last invoice and last payment
    const sortedInvoices = [...matchingCustomerInvoices].sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));
    const sortedPayments = [...customerPayments].sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

    const lastInv = sortedInvoices[0];
    const lastPmt = sortedPayments[0];

    return {
      subLedgerRows: computedRows,
      totalDebits: debSum > 0 ? debSum : (customer.totalAmount ?? customer.totalBilled ?? 0),
      totalCredits: credSum > 0 ? credSum : (customer.paidAmount ?? 0),
      netOutstandingBalance: debSum > 0 || credSum > 0 ? running : (customer.outstandingAmount ?? customer.outstandingBalance ?? 0),
      lastInvoice: lastInv,
      lastPayment: lastPmt,
    };
  }, [matchingCustomerInvoices, customerPayments, customer]);

  const creditLimit = customer.creditLimit || 300000;
  const creditUtilizedPercent = Math.min(100, Math.round((Math.max(0, netOutstandingBalance) / Math.max(1, creditLimit)) * 100));

  const handleDeleteConfirm = () => {
    deleteCustomer(customer.id);
    setShowDeleteModal(false);
    onClose();
  };

  const handleInvoiceDeleteConfirm = () => {
    if (invoiceToDelete) {
      deleteCustomerInvoice(invoiceToDelete.id);
      setInvoiceToDelete(null);
    }
  };

  return (
    <>
      <div
        id="customer-details-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Sticky Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {customer.name}
                  </h2>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    {customer.customerNumber || customer.id}
                  </span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      customer.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {customer.status || 'Active'}
                  </span>
                </div>
                {customer.nameAr && (
                  <p className="text-xs text-slate-500 font-arabic mt-0.5">{customer.nameAr}</p>
                )}
              </div>
            </div>

            {/* Top Action Buttons (Direct Links for Invoices & Payments) */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="create-customer-sale-btn"
                onClick={() => setShowCreateInvoiceModal(true)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                title="Create a new Customer Sale (Stock Out) directly for this customer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Customer Sale (Stock Out)</span>
              </button>
              <button
                id="record-customer-payment-btn"
                onClick={() => {
                  setPaymentModalType('payment_in');
                  setShowPaymentModal(true);
                }}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Record a payment received from customer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Payment In</span>
              </button>
              <button
                onClick={() => {
                  setPaymentModalType('payment_out');
                  setShowPaymentModal(true);
                }}
                className="px-2.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                title="Record payment refund"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Refund</span>
              </button>
              <button
                onClick={() => setShowStatementModal(true)}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Print Statement of Account"
              >
                <Printer className="w-4 h-4" />
                <span>Statement</span>
              </button>
              {activeRole === 'admin' && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                  title="Edit Customer Details"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {activeRole === 'admin' && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer"
                  title="Delete Customer Account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Customer KPI & Profile Header Cards */}
          <div className="p-6 pb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Total Invoiced (Debit) */}
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
              <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 block tracking-wider">
                Total Invoiced (Debit)
              </span>
              <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                {formatCurrency(totalDebits)}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block font-medium">
                {matchingCustomerInvoices.length} Invoices Issued
              </span>
            </div>

            {/* Total Paid (Credit) */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 block tracking-wider">
                Total Paid (Credit)
              </span>
              <div className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {formatCurrency(totalCredits)}
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 block font-semibold">
                {customerPayments.length} Payment Transactions
              </span>
            </div>

            {/* Total Outstanding (Balance = Total Debit - Total Credit) */}
            <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60">
              <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 block tracking-wider">
                Total Outstanding (Balance)
              </span>
              <div className="text-xl font-mono font-black text-rose-700 dark:text-rose-400 mt-1">
                {formatCurrency(netOutstandingBalance)}
              </div>
              <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 block font-semibold">
                {netOutstandingBalance > 0 ? 'Receivable Balance Due' : 'Account Settled / Zero Balance'}
              </span>
            </div>

            {/* Last Invoice */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-black uppercase text-slate-500 block tracking-wider">
                Last Invoice
              </span>
              {lastInvoice ? (
                <div className="mt-1">
                  <div className="text-sm font-mono font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{lastInvoice.invoiceNumber}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between items-center mt-0.5">
                    <span>{lastInvoice.invoiceDate}</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(lastInvoice.totalAmount || (lastInvoice.quantity * lastInvoice.unitPrice))}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 mt-2 italic">No invoices recorded</div>
              )}
            </div>

            {/* Last Payment */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-black uppercase text-slate-500 block tracking-wider">
                Last Payment
              </span>
              {lastPayment ? (
                <div className="mt-1">
                  <div className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>{lastPayment.referenceNumber}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between items-center mt-0.5">
                    <span>{lastPayment.paymentDate}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(lastPayment.amount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 mt-2 italic">No payments recorded</div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <button
              onClick={() => setActiveTab('subledger')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'subledger'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Financial Sub-Ledger ({subLedgerRows.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'invoices'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Customer Sales (Stock Out) ({matchingCustomerInvoices.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'payments'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payment History ({customerPayments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Customer Profile &amp; Legal Info</span>
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'workflow'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Workflow &amp; Loads ({customer.totalLoads ?? customerTrips.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit &amp; History ({customerHistory.length})</span>
            </button>
          </div>

          {/* Modal Tab Contents */}
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* TAB 1: FINANCIAL SUB-LEDGER */}
            {activeTab === 'subledger' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Scale className="w-4 h-4 text-blue-600" />
                      <span>Customer Financial Sub-Ledger &amp; Statement of Account</span>
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      <strong>Automatic Rule:</strong> Invoice Saved → Debit increases • Payment Received → Credit increases • <span className="font-mono font-bold text-blue-600 dark:text-blue-400">Balance = Total Debit − Total Credit</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCreateInvoiceModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1 text-xs cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Invoice</span>
                    </button>
                    <button
                      onClick={() => {
                        setPaymentModalType('payment_in');
                        setShowPaymentModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 text-xs cursor-pointer shadow-xs"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>+ Payment</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Invoice No. / Ref</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Debit</th>
                        <th className="p-3 text-right">Credit</th>
                        <th className="p-3 text-right">Balance</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                      {subLedgerRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No ledger transactions recorded yet for this customer. Create an invoice or record a payment to initiate the sub-ledger.
                          </td>
                        </tr>
                      ) : (
                        subLedgerRows.map((row) => {
                          const isInvoice = row.type === 'invoice';
                          return (
                            <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {row.date}
                              </td>
                              <td className="p-3 font-mono font-bold whitespace-nowrap">
                                {isInvoice ? (
                                  <button
                                    onClick={() => setInvoiceToView(row.rawItem as CustomerInvoice)}
                                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>{row.refNumber}</span>
                                  </button>
                                ) : (
                                  <span className="text-emerald-700 dark:text-emerald-400">
                                    {row.refNumber}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-800 dark:text-slate-200">
                                {row.description}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                              </td>
                              <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                                {formatCurrency(row.balance)}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span
                                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                                    row.status === 'paid' || row.status === 'settled'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : row.status === 'partial'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                                >
                                  {row.status}
                                </span>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                {isInvoice ? (
                                  <button
                                    onClick={() => setInvoiceToView(row.rawItem as CustomerInvoice)}
                                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 cursor-pointer transition-colors"
                                    title="View Full Customer Invoice"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400">Payment</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {subLedgerRows.length > 0 && (
                      <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700 font-bold text-xs">
                        <tr>
                          <td colSpan={3} className="p-3 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Total Sub-Ledger Sum &amp; Net Balance:
                          </td>
                          <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                            {formatCurrency(totalDebits)}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(totalCredits)}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                            {formatCurrency(netOutstandingBalance)}
                          </td>
                          <td colSpan={2} className="p-3 text-center text-[11px] text-slate-500 font-medium">
                            {netOutstandingBalance === 0 ? 'Fully Settled (SAR 0)' : `${formatCurrency(netOutstandingBalance)} Due`}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOMER INVOICES */}
            {activeTab === 'invoices' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Customer Sales (Stock Out) Issued to {customer.name}
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      Commercial billings &amp; Stock Out • Direct formula: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">Quantity × Unit Price = Total Amount</span> (No QR Code)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateInvoiceModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 text-xs cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Customer Sale (Stock Out)</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Invoice Date</th>
                        <th className="p-3">DN No.</th>
                        <th className="p-3">Product / Service</th>
                        <th className="p-3 text-center">Quantity</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Total Amount</th>
                        <th className="p-3 text-center">Payment Status</th>
                        <th className="p-3">Notes</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                      {matchingCustomerInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-400">
                            No Customer Sales (Stock Out) recorded for this client yet. Click "+ Customer Sale (Stock Out)" to bill this account.
                          </td>
                        </tr>
                      ) : (
                        matchingCustomerInvoices.map((inv) => {
                          const qty = Number(inv.quantity) || 1;
                          const uPrice = Number(inv.unitPrice) || 0;
                          const total = Number(inv.totalAmount) || (qty * uPrice);

                          return (
                            <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                <button
                                  onClick={() => setInvoiceToView(inv)}
                                  className="hover:underline flex items-center gap-1 cursor-pointer font-bold"
                                >
                                  {inv.invoiceNumber}
                                </button>
                              </td>
                              <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{inv.invoiceDate}</td>
                              <td className="p-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {inv.dnNumber || '—'}
                              </td>
                              <td className="p-3 text-slate-800 dark:text-slate-200 font-semibold">
                                {inv.productService}
                              </td>
                              <td className="p-3 text-center font-mono font-bold">
                                {qty}
                              </td>
                              <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                {formatCurrency(uPrice)}
                              </td>
                              <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                                {formatCurrency(total)}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span
                                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                                    inv.paymentStatus === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : inv.paymentStatus === 'partial'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                                >
                                  {inv.paymentStatus}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate">
                                {inv.notes || '—'}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => setInvoiceToView(inv)}
                                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 cursor-pointer transition-colors"
                                    title="View / Print Customer Invoice"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {activeRole === 'admin' && (
                                    <button
                                      onClick={() => setInvoiceToEdit(inv)}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                                      title="Edit Customer Invoice"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {activeRole === 'admin' && (
                                    <button
                                      onClick={() => setInvoiceToDelete(inv)}
                                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                                      title="Delete Customer Invoice"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: PAYMENT HISTORY */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Customer Payment History &amp; Settlements
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      Bank Transfers, Cash, Checks, and POS payments received from {customer.name}.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPaymentModalType('payment_in');
                      setShowPaymentModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 text-xs cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Record Payment In</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Ref #</th>
                        <th className="p-3">Payment Method</th>
                        <th className="p-3 text-right">Amount (Credit)</th>
                        <th className="p-3">Linked Invoice</th>
                        <th className="p-3">Recorded By</th>
                        <th className="p-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                      {customerPayments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No payment entries recorded in this customer account yet.
                          </td>
                        </tr>
                      ) : (
                        customerPayments.map((pmt) => (
                          <tr key={pmt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {pmt.paymentDate}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  pmt.type === 'payment_in'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {pmt.type === 'payment_in' ? 'Payment In (Credit)' : 'Payment Out (Refund)'}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {pmt.referenceNumber}
                            </td>
                            <td className="p-3 capitalize text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {pmt.paymentMethod.replace(/_/g, ' ')}
                            </td>
                            <td
                              className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
                                pmt.type === 'payment_in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {pmt.type === 'payment_in' ? '+' : '-'}{formatCurrency(pmt.amount)}
                            </td>
                            <td className="p-3 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {pmt.invoiceNumber || 'General Account Balance'}
                            </td>
                            <td className="p-3 text-slate-500 whitespace-nowrap">
                              {pmt.recordedBy || 'Accounts Officer'}
                            </td>
                            <td className="p-3 text-slate-500 max-w-xs truncate">
                              {pmt.notes || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: CUSTOMER PROFILE & LEGAL INFO */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Profile Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company & Legal Info */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Company Registry &amp; Identification</span>
                    </h3>
                    <div className="space-y-2 divide-y divide-slate-200 dark:divide-slate-700/60">
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500">Customer Code:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{customer.customerNumber || customer.id}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-500">VAT Registration No:</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{customer.vatNumber || '300000000000003'}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-500">Commercial Registration (CR):</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{customer.crNumber || '1010000000'}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-500">Customer Type:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{customer.customerType || 'Corporate'}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-500">Payment Terms:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{customer.paymentTerms || 'Net 30'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Location Info */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span>Contact &amp; Logistics Depot</span>
                    </h3>
                    <div className="space-y-2 divide-y divide-slate-200 dark:divide-slate-700/60">
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500">Contact Person:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{customer.contactPerson || 'Logistics Coordinator'}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-500">Mobile / Telephone:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{customer.phone || customer.mobileNumber}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-500">Email Address:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{customer.email || 'logistics@client.sa'}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-500">City / Province:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{customer.city || '—'}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-500">Address / Yard:</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{customer.address || 'Industrial Area'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credit Limit & Usage Bar */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <span>Credit Facility &amp; Exposure Limit</span>
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      Limit: {formatCurrency(creditLimit)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          creditUtilizedPercent > 80 ? 'bg-rose-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${creditUtilizedPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>{creditUtilizedPercent}% credit utilized ({formatCurrency(netOutstandingBalance)} outstanding)</span>
                      <span>{formatCurrency(Math.max(0, creditLimit - netOutstandingBalance))} remaining headroom</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: WORKFLOW & LOADS */}
            {activeTab === 'workflow' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Customer Haulage Operations &amp; Delivery Notes
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      Workflow: Customer → Load → DN → Driver → Truck → Route → Delivery → Invoice → Payment
                    </p>
                  </div>
                  <span className="font-mono text-slate-400">
                    {customerTrips.length} operations
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold uppercase">
                      <tr>
                        <th className="p-3">DN / Trip #</th>
                        <th className="p-3">Route (Origin → Destination)</th>
                        <th className="p-3">Driver &amp; Truck</th>
                        <th className="p-3">Cargo &amp; Qty</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Freight Amount</th>
                        <th className="p-3 text-center">Invoice Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                      {customerTrips.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No haulage operations found for this customer.
                          </td>
                        </tr>
                      ) : (
                        customerTrips.map((trip) => {
                          const dnNumberVal = trip.dnNumber || trip.deliveryNote?.dnNumber || trip.tripNumber;
                          const linkedInv = matchingCustomerInvoices.find(
                            (i) => i.dnNumber === dnNumberVal || i.id === trip.id
                          );
                          return (
                            <tr key={trip.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-3">
                                <div className="font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 flex-wrap">
                                  <span>{dnNumberVal}</span>
                                  {trip.isCustomerShifted && (
                                    <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-bold">
                                      Shifted Route
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {trip.departureTime || trip.loadingDate || '2026-08-20'}
                                </div>
                                {trip.customerShiftNotification && (
                                  <div className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-1 rounded-md mt-1 border border-amber-200 dark:border-amber-900">
                                    {trip.customerShiftNotification}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {trip.origin?.city || trip.origin?.name || 'Origin'} → {trip.destination?.city || trip.destination?.name || 'Destination'}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                                  {trip.origin?.address || trip.origin?.name || 'Central Depot'}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{trip.driverName}</div>
                                <div className="text-[10px] font-mono text-slate-400">Truck: {trip.vehiclePlate}</div>
                              </td>
                              <td className="p-3">
                                <div className="text-slate-900 dark:text-white">{trip.cargoType}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{trip.quantity ? `${trip.quantity} ${trip.uom || 'Unit'}` : '30 Tons'}</div>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    trip.status === 'delivered' || trip.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : trip.status === 'in_transit'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {trip.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                {formatCurrency(trip.price || 4500)}
                              </td>
                              <td className="p-3 text-center">
                                {linkedInv ? (
                                  <button
                                    onClick={() => setInvoiceToView(linkedInv)}
                                    className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1 mx-auto cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>{linkedInv.invoiceNumber}</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setShowCreateInvoiceModal(true)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold mx-auto cursor-pointer"
                                  >
                                    + Bill
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: AUDIT & HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Customer Lifecycle History &amp; Audit Trail
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      Immutable chronological audit events for invoices, payments, profile changes, and credit limit updates.
                    </p>
                  </div>
                  <span className="font-mono text-slate-400">
                    {customerHistory.length} events
                  </span>
                </div>

                <div className="space-y-3">
                  {customerHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                      No customer audit log events recorded yet.
                    </div>
                  ) : (
                    customerHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5 text-xs"
                      >
                        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                          <History className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white uppercase text-[11px]">
                              {item.action.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {item.timestamp}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">
                            {item.details || item.action}
                          </p>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 font-medium pt-0.5">
                            <span>Performed by: <strong>{item.performedBy}</strong></span>
                            {item.referenceId && <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Ref: {item.referenceId}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Create Customer Invoice Modal (Direct link from Customer Profile) */}
      {showCreateInvoiceModal && (
        <CustomerInvoiceFormModal
          defaultCustomerId={customer.id}
          onClose={() => setShowCreateInvoiceModal(false)}
        />
      )}

      {/* 2. View Customer Invoice Modal (Full Details, No QR, Qty x Price = Total) */}
      {invoiceToView && (
        <CustomerInvoiceModal
          invoice={invoiceToView}
          onClose={() => setInvoiceToView(null)}
        />
      )}

      {/* 3. Edit Customer Invoice Modal */}
      {invoiceToEdit && (
        <CustomerInvoiceFormModal
          invoiceToEdit={invoiceToEdit}
          onClose={() => setInvoiceToEdit(null)}
        />
      )}

      {/* 4. Delete Customer Invoice Confirmation */}
      {invoiceToDelete && (
        <DeleteConfirmationModal
          isOpen={!!invoiceToDelete}
          onClose={() => setInvoiceToDelete(null)}
          onConfirm={handleInvoiceDeleteConfirm}
          title="Delete Customer Invoice"
          message={`Are you sure you want to delete Customer Invoice "${invoiceToDelete.invoiceNumber}" (SAR ${(invoiceToDelete.totalAmount || (invoiceToDelete.quantity * invoiceToDelete.unitPrice)).toLocaleString()})? This will reverse the debit entry from ${customer.name}'s sub-ledger.`}
          confirmText="Yes, Delete Invoice"
        />
      )}

      {/* 5. Payment In / Payment Out Modal */}
      {showPaymentModal && (
        <CustomerPaymentModal
          customer={customer}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          defaultType={paymentModalType}
        />
      )}

      {/* 6. Statement Print Modal */}
      {showStatementModal && (
        <CustomerStatementModal
          customer={customer}
          isOpen={showStatementModal}
          onClose={() => setShowStatementModal(false)}
        />
      )}

      {/* 7. Edit Customer Profile Modal */}
      {showEditModal && (
        <CustomerFormModal
          customer={customer}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* 8. Delete Customer Account Confirmation */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Customer Account"
          message={`Are you sure you want to permanently delete customer account "${customer.name}" (${customer.customerNumber || customer.id})? All historical balance links will be securely archived in the Master Audit Log.`}
          confirmText="Yes, Delete Customer"
        />
      )}
    </>
  );
};

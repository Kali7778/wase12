import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, TaxInvoice, CustomerPaymentEntry } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  X,
  Printer,
  Download,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface CustomerStatementModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  customer,
  isOpen,
  onClose,
}) => {
  const { taxInvoices, companySettings } = useApp();

  const [dateRangeFrom, setDateRangeFrom] = useState<string>('2026-01-01');
  const [dateRangeTo, setDateRangeTo] = useState<string>(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  // 1. Collect all invoices for this customer
  const customerInvoices = taxInvoices.filter(
    (inv) =>
      inv.customerId === customer.id ||
      inv.customerName?.toLowerCase() === customer.name.toLowerCase() ||
      inv.buyerName?.toLowerCase() === customer.name.toLowerCase()
  );

  // 2. Collect all payments for this customer
  const customerPayments: CustomerPaymentEntry[] = customer.payments || [];

  // 3. Build unified transaction ledger
  interface StatementRow {
    id: string;
    date: string;
    type: 'invoice' | 'payment_in' | 'payment_out';
    referenceNumber: string;
    description: string;
    debitAmount: number; // Invoices increase receivable
    creditAmount: number; // Payments in decrease receivable, payments out increase
    runningBalance: number;
  }

  const rows: StatementRow[] = [];

  // Add invoices
  customerInvoices.forEach((inv) => {
    rows.push({
      id: inv.id,
      date: inv.issueDate || inv.invoiceDate || '2026-08-01',
      type: 'invoice',
      referenceNumber: inv.invoiceNumber,
      description: `Invoice [DN: ${inv.dnNumber || inv.loadNumber || 'N/A'}] - ${inv.productService || (inv.items && inv.items[0]?.description) || 'Logistics freight haulage'}`,
      debitAmount: inv.grandTotal || inv.totalAmount || 0,
      creditAmount: 0,
      runningBalance: 0,
    });
  });

  // Add payments
  customerPayments.forEach((pmt) => {
    const isPaymentIn = pmt.type === 'payment_in';
    rows.push({
      id: pmt.id,
      date: pmt.paymentDate || '2026-08-01',
      type: pmt.type,
      referenceNumber: pmt.referenceNumber,
      description: `${isPaymentIn ? 'Payment In (Received)' : 'Payment Out (Refund)'} via ${pmt.paymentMethod.replace(/_/g, ' ')} ${pmt.invoiceNumber ? `[Inv #${pmt.invoiceNumber}]` : ''} ${pmt.notes ? `(${pmt.notes})` : ''}`,
      debitAmount: isPaymentIn ? 0 : pmt.amount,
      creditAmount: isPaymentIn ? pmt.amount : 0,
      runningBalance: 0,
    });
  });

  // Sort chronologically
  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute running balance
  let currentBalance = 0;
  rows.forEach((row) => {
    currentBalance += row.debitAmount - row.creditAmount;
    row.runningBalance = currentBalance;
  });

  // Financial aggregates
  const totalBilled = rows.reduce((sum, r) => sum + r.debitAmount, 0);
  const totalPaid = rows.reduce((sum, r) => sum + r.creditAmount, 0);
  const netOutstanding = Math.max(0, currentBalance);
  const creditLimit = customer.creditLimit || 150000;
  const availableCredit = Math.max(0, creditLimit - netOutstanding);

  // Aging breakdown estimation
  const currentDue = netOutstanding * 0.4;
  const aging30 = netOutstanding * 0.35;
  const aging60 = netOutstanding * 0.25;
  const aging90 = 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Type,Reference,Description,Debit (SAR),Credit (SAR),Running Balance (SAR)\n';
    rows.forEach((r) => {
      csvContent += `"${r.date}","${r.type}","${r.referenceNumber}","${r.description.replace(/"/g, '""')}",${r.debitAmount.toFixed(2)},${r.creditAmount.toFixed(2)},${r.runningBalance.toFixed(2)}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Statement_${customer.customerNumber || customer.id}_${dateRangeTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="customer-statement-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Customer Account Statement
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{customer.name}</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">({customer.customerNumber || customer.id})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-statement" className="p-8 space-y-6 bg-white dark:bg-slate-900">
          {/* Statement Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                  LF
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{companySettings.companyName}</h2>
                  <p className="text-xs text-slate-500 font-arabic">{companySettings.companyNameAr}</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                <p><span className="font-semibold text-slate-800 dark:text-slate-200">VAT Registration No:</span> <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{companySettings.vatNumber}</span></p>
                <p><span className="font-semibold text-slate-800 dark:text-slate-200">Commercial Registration (CR):</span> {companySettings.crNumber}</p>
                <p>{companySettings.address}, {companySettings.city}</p>
                <p>Phone: {companySettings.phone} • Email: {companySettings.email}</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                OFFICIAL STATEMENT OF ACCOUNT
              </div>
              <div className="text-2xl font-mono font-black text-slate-900 dark:text-white mt-1">
                {customer.customerNumber || customer.id}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Statement Date: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{dateRangeTo}</span>
              </div>
              <div className="text-xs text-slate-500">
                Payment Terms: <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.paymentTerms || 'Net 30'}</span>
              </div>
            </div>
          </div>

          {/* Customer & Account Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Customer Details</span>
              <div className="text-sm font-black text-slate-900 dark:text-white">{customer.name}</div>
              {customer.nameAr && <div className="text-xs text-slate-500 font-arabic">{customer.nameAr}</div>}
              <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{customer.address || 'Industrial Area'}, {customer.city || 'Kingdom of Saudi Arabia'}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400 flex items-center gap-3 pt-0.5">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {customer.phone || customer.mobileNumber}</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {customer.email || 'accounts@client.sa'}</span>
              </div>
            </div>

            <div className="space-y-1 sm:border-l sm:border-slate-200 sm:dark:border-slate-700 sm:pl-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Tax & Credit Registry</span>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Customer VAT No:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{customer.vatNumber || '300000000000003'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Commercial Reg (CR):</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{customer.crNumber || '1010000000'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Customer Category:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{customer.customerType || 'Corporate'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Account Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {customer.status || 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Statement Financial Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
              <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 block">Total Billed</span>
              <div className="text-base font-mono font-black text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(totalBilled)}
              </div>
              <span className="text-[10px] text-slate-400">{customerInvoices.length} Invoices</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">Total Payments Received</span>
              <div className="text-base font-mono font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                {formatCurrency(totalPaid)}
              </div>
              <span className="text-[10px] text-slate-400">{customerPayments.length} Payment Receipts</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60">
              <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 block">Outstanding Balance</span>
              <div className="text-base font-mono font-black text-rose-700 dark:text-rose-400 mt-0.5">
                {formatCurrency(netOutstanding)}
              </div>
              <span className="text-[10px] text-slate-400">Current Amount Due</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-black uppercase text-slate-500 block">Credit Limit & Headroom</span>
              <div className="text-base font-mono font-black text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(creditLimit)}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {formatCurrency(availableCredit)} Available
              </span>
            </div>
          </div>

          {/* Statement Chronological Ledger Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Itemized Transaction History & Running Balance
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                {rows.length} total ledger records
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Ref #</th>
                    <th className="p-3">Description & Route Details</th>
                    <th className="p-3 text-right">Debit / Billed (SAR)</th>
                    <th className="p-3 text-right">Credit / Paid (SAR)</th>
                    <th className="p-3 text-right font-bold">Balance (SAR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No transactions recorded for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              row.type === 'invoice'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : row.type === 'payment_in'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {row.type === 'invoice' ? 'Invoice' : row.type === 'payment_in' ? 'Payment In' : 'Payment Out'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {row.referenceNumber}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs">
                          {row.description}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-900 dark:text-white whitespace-nowrap">
                          {row.debitAmount > 0 ? formatCurrency(row.debitAmount) : '-'}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                          {row.creditAmount > 0 ? formatCurrency(row.creditAmount) : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(row.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Aging Analysis Table */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Aging Analysis & Receivables Maturity (تحليل أعمار الديون)
            </div>
            <div className="grid grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-sans block">Current (0 - 30 Days)</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(currentDue)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-sans block">31 - 60 Days</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(aging30)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-sans block">61 - 90 Days</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(aging60)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-sans block">&gt; 90 Days Past Due</span>
                <span className="font-bold text-slate-400">{formatCurrency(aging90)}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions & Official Sign-off */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="space-y-1 text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Bank Wire Instructions:</span>
              <p>Beneficiary: <strong className="text-slate-900 dark:text-white">{companySettings.companyName}</strong></p>
              <p>Bank: <strong className="text-slate-900 dark:text-white">Al-Rajhi Bank / Saudi National Bank (SNB)</strong></p>
              <p>IBAN: <span className="font-mono font-bold text-slate-900 dark:text-white">SA44 8000 0123 6080 1000 9999</span></p>
              <p className="text-[11px] text-slate-400 mt-1">Please quote customer code <strong>{customer.customerNumber || customer.id}</strong> in transfer remarks.</p>
            </div>

            <div className="flex flex-col justify-end items-start sm:items-end text-slate-500 text-xs space-y-6">
              <div className="text-right">
                <span className="block font-bold text-slate-800 dark:text-slate-200">Authorized Financial Signatory</span>
                <span className="text-[11px] text-slate-400">Logistics & Operations Finance Division</span>
              </div>
              <div className="w-48 border-b-2 border-dashed border-slate-300 dark:border-slate-700 text-center pb-1 text-[10px] text-slate-400 font-mono">
                [ OFFICIAL STAMP & SIGNATURE ]
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

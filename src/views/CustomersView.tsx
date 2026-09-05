import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  Building2,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building,
  Printer,
  Edit,
  Trash2,
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Truck,
  TrendingUp,
  Clock,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  ShieldCheck,
  Receipt,
  Scale
} from 'lucide-react';
import { CustomerDetailsModal } from '../components/CustomerDetailsModal';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { CustomerPaymentModal } from '../components/CustomerPaymentModal';
import { CustomerStatementModal } from '../components/CustomerStatementModal';
import { CustomerInvoiceFormModal } from '../components/CustomerInvoiceFormModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const CustomersView: React.FC = () => {
  const { customers, deleteCustomer, showToast, searchQuery, setSearchQuery, activeRole } = useApp();

  // Modals & Selection States
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<Customer | null>(null);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] = useState<Customer | null>(null);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [paymentType, setPaymentType] = useState<'payment_in' | 'payment_out'>('payment_in');
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<Customer | null>(null);
  const [selectedCustomerForDelete, setSelectedCustomerForDelete] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filters & View Mode
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'has_due' | 'zero_balance'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [localSearch, setLocalSearch] = useState<string>('');

  // Combined Search Query
  const effectiveSearch = (localSearch || searchQuery || '').toLowerCase();

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const matchSearch =
        !effectiveSearch ||
        (cust.name && cust.name.toLowerCase().includes(effectiveSearch)) ||
        (cust.companyName && cust.companyName.toLowerCase().includes(effectiveSearch)) ||
        (cust.nameAr && cust.nameAr.includes(effectiveSearch)) ||
        (cust.customerNumber && cust.customerNumber.toLowerCase().includes(effectiveSearch)) ||
        (cust.id && cust.id.toLowerCase().includes(effectiveSearch)) ||
        (cust.vatNumber && cust.vatNumber.includes(effectiveSearch)) ||
        (cust.phone && cust.phone.includes(effectiveSearch)) ||
        (cust.mobileNumber && cust.mobileNumber.includes(effectiveSearch)) ||
        (cust.email && cust.email.toLowerCase().includes(effectiveSearch)) ||
        (cust.city && cust.city.toLowerCase().includes(effectiveSearch));

      const matchStatus =
        statusFilter === 'all' || cust.status === statusFilter;

      const matchType =
        typeFilter === 'all' || (cust.customerType || 'Corporate') === typeFilter;

      const outstanding = cust.outstandingAmount ?? cust.outstandingBalance ?? 0;
      const matchBalance =
        balanceFilter === 'all'
          ? true
          : balanceFilter === 'has_due'
          ? outstanding > 0
          : outstanding === 0;

      return matchSearch && matchStatus && matchType && matchBalance;
    });
  }, [customers, effectiveSearch, statusFilter, typeFilter, balanceFilter]);

  // Aggregate Metrics
  const totalCustomersCount = customers.length;
  const activeCustomersCount = customers.filter((c) => c.status === 'active').length;
  const totalLoadsDispatched = customers.reduce((sum, c) => sum + (c.totalLoads ?? 0), 0);
  const totalAmountBilled = customers.reduce((sum, c) => sum + (c.totalAmount ?? c.totalBilled ?? 0), 0);
  const totalPaymentsReceived = customers.reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);
  const totalOutstandingReceivables = customers.reduce(
    (sum, c) => sum + (c.outstandingAmount ?? c.outstandingBalance ?? 0),
    0
  );

  const handleDeleteConfirm = () => {
    if (selectedCustomerForDelete) {
      deleteCustomer(selectedCustomerForDelete.id);
      setSelectedCustomerForDelete(null);
    }
  };

  return (
    <div id="customers-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-mono font-bold flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-400" /> CUSTOMER & CLIENT DIRECTORY
            </span>
            <span className="text-xs text-slate-300">
              Workflow: Customer → Load → DN → Driver → Truck → Route → Delivery → Invoice → Payment
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            Customer Management & Financial Sub-Ledger
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Maintain corporate client profiles, credit limits, operational load assignments, Payment In / Out records, and printable statements of account.
          </p>
        </div>

        <button
          id="add-customer-btn"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* KPI Financial & Operations Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Customers</span>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {totalCustomersCount}
            </div>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{activeCustomersCount} Active Corporate Accounts</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Dispatched Loads</span>
            <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
              {totalLoadsDispatched}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-2">
            <Truck className="w-3.5 h-3.5 text-blue-500" />
            <span>Connected to Logistics Operations</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Billed (Inc. VAT)</span>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalAmountBilled)}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Grand revenue across all client invoices
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Paid Amount (Settled)</span>
            <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(totalPaymentsReceived)}
            </div>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            {totalAmountBilled > 0 ? Math.round((totalPaymentsReceived / totalAmountBilled) * 100) : 100}% Collection Efficiency
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding Receivables</span>
            <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(totalOutstandingReceivables)}
            </div>
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-2">
            Pending Client Collection
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and View Switcher */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by Customer ID, Name, Mobile, Email, VAT Number, or City..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive / Suspended</option>
          </select>

          {/* Customer Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold"
          >
            <option value="all">All Categories</option>
            <option value="Corporate">Corporate</option>
            <option value="Contractor">Contractor</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Retail">Retail</option>
            <option value="Government">Government</option>
          </select>

          {/* Balance Filter */}
          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold"
          >
            <option value="all">All Balances</option>
            <option value="has_due">Has Outstanding Due</option>
            <option value="zero_balance">Fully Settled (0 SAR)</option>
          </select>

          {/* Table / Grid Mode Toggle */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-0.5 bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CUSTOMER LIST: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Customer Directory Master Table ({filteredCustomers.length} records)
            </span>
            <span className="text-[11px] text-slate-400">
              Actions: View • Edit • Delete • Payment In/Out • Statement
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 font-semibold uppercase">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Customer ID</th>
                  <th className="p-3.5 whitespace-nowrap">Customer / Company Name</th>
                  <th className="p-3.5 whitespace-nowrap">Mobile & Email</th>
                  <th className="p-3.5 whitespace-nowrap">Address & City</th>
                  <th className="p-3.5 whitespace-nowrap">VAT Number</th>
                  <th className="p-3.5 whitespace-nowrap">Type & Terms</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Credit Limit</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Loads</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Total Amount</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Paid Amount</th>
                  <th className="p-3.5 text-right whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">Outstanding</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-slate-400">
                      No customers match the current search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const totalAmt = cust.totalAmount ?? cust.totalBilled ?? 0;
                    const paidAmt = cust.paidAmount ?? 0;
                    const outstanding = cust.outstandingAmount ?? cust.outstandingBalance ?? Math.max(0, totalAmt - paidAmt);
                    const isOverdue = outstanding > (cust.creditLimit || 150000);

                    return (
                      <tr
                        key={cust.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Customer ID */}
                        <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedCustomerForDetails(cust)}
                            className="hover:underline flex items-center gap-1 cursor-pointer font-bold"
                            title="Open Customer Profile & Sub-Ledger"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>{cust.customerNumber || cust.id}</span>
                          </button>
                        </td>

                        {/* Customer Name */}
                        <td className="p-3.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedCustomerForDetails(cust)}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer"
                          >
                            {cust.name}
                          </button>
                          {cust.nameAr && (
                            <div className="text-[10px] text-slate-500 font-arabic">{cust.nameAr}</div>
                          )}
                        </td>

                        {/* Mobile & Email */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-mono text-slate-800 dark:text-slate-200">
                            {cust.phone || cust.mobileNumber}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {cust.email || 'accounts@client.sa'}
                          </div>
                        </td>

                        {/* Address & City */}
                        <td className="p-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          <div className="font-semibold text-slate-900 dark:text-white">{cust.city || '—'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{cust.address}</div>
                        </td>

                        {/* VAT Number */}
                        <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {cust.vatNumber || '300000000000003'}
                        </td>

                        {/* Customer Type & Payment Terms */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{cust.customerType || 'Corporate'}</div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{cust.paymentTerms || 'Net 30'}</div>
                        </td>

                        {/* Credit Limit */}
                        <td className="p-3.5 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatCurrency(cust.creditLimit || 150000)}
                        </td>

                        {/* Status */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              cust.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {cust.status || 'active'}
                          </span>
                        </td>

                        {/* Total Loads */}
                        <td className="p-3.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                            {cust.totalLoads ?? 0}
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="p-3.5 text-right font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(totalAmt)}
                        </td>

                        {/* Paid Amount */}
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(paidAmt)}
                        </td>

                        {/* Outstanding Amount */}
                        <td className="p-3.5 text-right font-mono font-black whitespace-nowrap">
                          <span
                            className={
                              outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {formatCurrency(outstanding)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Create Customer Sale (Stock Out) */}
                            <button
                              onClick={() => setSelectedCustomerForInvoice(cust)}
                              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
                              title="+ Customer Sale (Stock Out)"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>

                            {/* View Profile & Sub-Ledger */}
                            <button
                              onClick={() => setSelectedCustomerForDetails(cust)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 cursor-pointer transition-colors"
                              title="View Customer Profile & Financial Sub-Ledger"
                            >
                              <Scale className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit (Admin Only) */}
                            {activeRole === 'admin' && (
                              <button
                                onClick={() => setSelectedCustomerForEdit(cust)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                                title="Edit Customer Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Payment In */}
                            <button
                              onClick={() => {
                                setSelectedCustomerForPayment(cust);
                                setPaymentType('payment_in');
                              }}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors"
                              title="Record Payment In / Out"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Statement */}
                            <button
                              onClick={() => setSelectedCustomerForStatement(cust)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 cursor-pointer transition-colors"
                              title="Print Account Statement"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete (Admin Only) */}
                            {activeRole === 'admin' && (
                              <button
                                onClick={() => setSelectedCustomerForDelete(cust)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                                title="Delete Customer Account"
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

      {/* CUSTOMER LIST: GRID CARD VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const totalAmt = cust.totalAmount ?? cust.totalBilled ?? 0;
            const paidAmt = cust.paidAmount ?? 0;
            const outstanding = cust.outstandingAmount ?? cust.outstandingBalance ?? Math.max(0, totalAmt - paidAmt);
            const creditLimit = cust.creditLimit || 150000;
            const creditUsagePercent = Math.min(100, Math.round((outstanding / Math.max(1, creditLimit)) * 100));

            return (
              <div
                key={cust.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-900 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{cust.name}</h3>
                        </div>
                        <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                          {cust.customerNumber || cust.id}
                        </span>
                        {cust.nameAr && <p className="text-xs text-slate-500 font-arabic">{cust.nameAr}</p>}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        cust.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {cust.status || 'Active'}
                    </span>
                  </div>

                  {/* VAT & CR */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">VAT Number</span>
                      <span className="font-bold">{cust.vatNumber || '300000000000003'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Commercial Reg (CR)</span>
                      <span className="font-bold">{cust.crNumber || '1010000000'}</span>
                    </div>
                  </div>

                  {/* Financial Mini Summary */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Loads</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cust.totalLoads ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Billed</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalAmt)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Paid</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmt)}</span>
                    </div>
                  </div>
                </div>

                {/* Credit Limit & Balance Bar */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Outstanding Balance:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(outstanding)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Credit Limit: {formatCurrency(creditLimit)}</span>
                    <span>{creditUsagePercent}% utilized</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        creditUsagePercent > 80 ? 'bg-rose-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${creditUsagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Contact info & Terms */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.city || '—'} • {cust.address}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {cust.phone || cust.mobileNumber}
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{cust.paymentTerms || 'Net 30'}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => setSelectedCustomerForInvoice(cust)}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
                    title="+ Customer Sale (Stock Out)"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedCustomerForDetails(cust)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Profile &amp; Sub-Ledger</span>
                  </button>
                  {activeRole === 'admin' && (
                    <button
                      onClick={() => setSelectedCustomerForEdit(cust)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                      title="Edit Customer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCustomerForPayment(cust);
                      setPaymentType('payment_in');
                    }}
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors"
                    title="Record Payment In / Out"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedCustomerForStatement(cust)}
                    className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 cursor-pointer transition-colors"
                    title="Customer Statement"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  {activeRole === 'admin' && (
                    <button
                      onClick={() => setSelectedCustomerForDelete(cust)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALS */}
      {/* 1. Add Customer Modal */}
      {showAddModal && (
        <CustomerFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* 2. Create Customer Invoice Modal */}
      {selectedCustomerForInvoice && (
        <CustomerInvoiceFormModal
          defaultCustomerId={selectedCustomerForInvoice.id}
          onClose={() => setSelectedCustomerForInvoice(null)}
        />
      )}

      {/* 3. Edit Customer Modal */}
      {selectedCustomerForEdit && (
        <CustomerFormModal
          customer={selectedCustomerForEdit}
          isOpen={!!selectedCustomerForEdit}
          onClose={() => setSelectedCustomerForEdit(null)}
        />
      )}

      {/* 4. Customer Details & Workflow Modal */}
      {selectedCustomerForDetails && (
        <CustomerDetailsModal
          customer={selectedCustomerForDetails}
          isOpen={!!selectedCustomerForDetails}
          onClose={() => setSelectedCustomerForDetails(null)}
        />
      )}

      {/* 4. Payment In / Payment Out Modal */}
      {selectedCustomerForPayment && (
        <CustomerPaymentModal
          customer={selectedCustomerForPayment}
          isOpen={!!selectedCustomerForPayment}
          onClose={() => setSelectedCustomerForPayment(null)}
          defaultType={paymentType}
        />
      )}

      {/* 5. Statement Print Modal */}
      {selectedCustomerForStatement && (
        <CustomerStatementModal
          customer={selectedCustomerForStatement}
          isOpen={!!selectedCustomerForStatement}
          onClose={() => setSelectedCustomerForStatement(null)}
        />
      )}

      {/* 6. Delete Confirmation Modal */}
      {selectedCustomerForDelete && (
        <DeleteConfirmationModal
          isOpen={!!selectedCustomerForDelete}
          onClose={() => setSelectedCustomerForDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Customer Account"
          message={`Are you sure you want to permanently delete customer account "${selectedCustomerForDelete.name}" (${selectedCustomerForDelete.customerNumber || selectedCustomerForDelete.id})? All audit actions and historical balance records will be securely recorded in the Master Audit log.`}
          confirmText="Yes, Delete Customer"
        />
      )}
    </div>
  );
};

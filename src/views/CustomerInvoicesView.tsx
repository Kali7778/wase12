import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerInvoice, InvoicePaymentStatus } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  Building2,
  PackagePlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Boxes,
} from 'lucide-react';
import { CustomerInvoiceModal } from '../components/CustomerInvoiceModal';
import { CustomerInvoiceFormModal } from '../components/CustomerInvoiceFormModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const CustomerInvoicesView: React.FC = () => {
  const {
    customerInvoices,
    deleteCustomerInvoice,
    verifyAndCreditCustomerInvoiceStockIn,
    selectedCustomerInvoice,
    setSelectedCustomerInvoice,
    customers,
    showToast,
    activeRole,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<CustomerInvoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<CustomerInvoice | null>(null);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return customerInvoices.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.dnNumber && inv.dnNumber.toLowerCase().includes(q)) ||
        inv.productService.toLowerCase().includes(q) ||
        (inv.notes && inv.notes.toLowerCase().includes(q)) ||
        inv.invoiceDate.includes(q);

      const matchStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
      const matchStock =
        stockFilter === 'all' ||
        (stockFilter === 'credited' && inv.stockCredited) ||
        (stockFilter === 'pending' && !inv.stockCredited);
      const matchCustomer =
        customerFilter === 'all' || inv.customerId === customerFilter || inv.customerName === customerFilter;

      return matchSearch && matchStatus && matchStock && matchCustomer;
    });
  }, [customerInvoices, searchQuery, statusFilter, stockFilter, customerFilter]);

  // Aggregate Metrics
  const totalCount = customerInvoices.length;
  const totalAmountSum = customerInvoices.reduce((sum, inv) => sum + (inv.totalAmount || (inv.quantity * inv.unitPrice)), 0);
  const totalPaidSum = customerInvoices.reduce((sum, inv) => sum + (inv.paidAmount ?? (inv.paymentStatus === 'paid' ? inv.totalAmount : 0)), 0);
  const totalOutstandingSum = Math.max(0, totalAmountSum - totalPaidSum);
  const stockCreditedCount = customerInvoices.filter((inv) => inv.stockCredited).length;
  const totalStockCreditedUnits = customerInvoices
    .filter((inv) => inv.stockCredited)
    .reduce((sum, inv) => sum + (inv.stockCreditedQty || inv.quantity || 0), 0);

  const handleExportCsv = () => {
    const headers = [
      'Invoice No',
      'Invoice Date',
      'Customer',
      'DN No',
      'Product / Service',
      'Quantity',
      'Unit Price (SAR)',
      'Total Amount (SAR)',
      'Payment Status',
      'Stock Credited',
      'Stock Credited Qty',
      'Notes'
    ];

    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.invoiceDate}"`,
      `"${inv.customerName}"`,
      `"${inv.dnNumber || ''}"`,
      `"${inv.productService}"`,
      inv.quantity,
      inv.unitPrice,
      inv.totalAmount,
      `"${inv.paymentStatus}"`,
      inv.stockCredited ? 'YES' : 'NO',
      inv.stockCreditedQty || (inv.stockCredited ? inv.quantity : 0),
      `"${inv.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Successful', 'Customer invoices exported to CSV.', 'success');
  };

  return (
    <div id="customer-invoices-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Customer Sales (Stock Out)
              </h1>
              <p className="text-xs text-slate-500">
                Commercial Sales &amp; Stock Out Billing • Formula: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">Quantity × Unit Price = Total Amount</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            id="add-customer-sale-btn"
            onClick={() => {
              setInvoiceToEdit(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Customer Sale (Stock Out)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Invoices
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {totalCount}
            </div>
            <span className="text-[10px] text-slate-500">Customer billing records</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Invoiced (Qty × Rate)
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalAmountSum)}
            </div>
            <span className="text-[10px] text-blue-600 font-semibold">Direct commercial billings</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Calculator className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Outstanding Sub-Ledger
            </span>
            <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(totalOutstandingSum)}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">
              Collected: {formatCurrency(totalPaidSum)}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Stock In Credited
            </span>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              +{totalStockCreditedUnits} Units
            </div>
            <span className="text-[10px] text-slate-500">
              {stockCreditedCount} of {totalCount} verified in Inventory
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice, customer, DN, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Payment Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid Only</option>
            <option value="unpaid">Unpaid Only</option>
            <option value="partial">Partial Only</option>
          </select>

          {/* Stock In Credited Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Inventory Statuses</option>
            <option value="credited">Stock Credited (✓)</option>
            <option value="pending">Stock Uncredited</option>
          </select>

          {/* Customer Filter */}
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[160px] truncate"
          >
            <option value="all">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <span className="text-xs font-mono text-slate-400 ml-auto md:ml-0">
            {filteredInvoices.length} of {customerInvoices.length} invoices
          </span>
        </div>
      </div>

      {/* Customer Invoices Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Invoice No.</th>
                <th className="p-3.5">Invoice Date</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">DN No.</th>
                <th className="p-3.5">Product / Service</th>
                <th className="p-3.5 text-center">Quantity</th>
                <th className="p-3.5 text-right">Unit Price</th>
                <th className="p-3.5 text-right font-bold text-slate-900 dark:text-white">Total Amount</th>
                <th className="p-3.5 text-center">Payment Status</th>
                <th className="p-3.5 text-center">Stock In Link</th>
                <th className="p-3.5">Notes</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold">No Customer Sales (Stock Out) Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Create your first customer sale (stock out) using the button above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const qty = Number(inv.quantity) || 1;
                  const unitPrice = Number(inv.unitPrice) || 0;
                  const total = Number(inv.totalAmount ?? (qty * unitPrice));
                  const isStockCredited = !!inv.stockCredited;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors group"
                    >
                      {/* 1. Invoice No. */}
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {inv.invoiceNumber}
                      </td>

                      {/* 2. Invoice Date */}
                      <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {inv.invoiceDate}
                      </td>

                      {/* 3. Customer */}
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{inv.customerName}</span>
                        </div>
                      </td>

                      {/* 4. DN No. */}
                      <td className="p-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] border border-slate-200 dark:border-slate-700">
                          {inv.dnNumber || 'DN-PENDING'}
                        </span>
                      </td>

                      {/* 5. Product / Service */}
                      <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {inv.productService}
                      </td>

                      {/* 6. Quantity */}
                      <td className="p-3.5 text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {qty}
                      </td>

                      {/* 7. Unit Price */}
                      <td className="p-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(unitPrice)}
                      </td>

                      {/* 8. Total Amount (Quantity * Unit Price) */}
                      <td className="p-3.5 text-right font-mono font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                          {formatCurrency(total)}
                        </span>
                      </td>

                      {/* 9. Payment Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                            inv.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : inv.paymentStatus === 'partial'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>

                      {/* 10. Stock In Linkage Status / Verify & Credit Button */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {isStockCredited ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            title={`Credited +${inv.stockCreditedQty || qty} units to Main Inventory`}
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Credited (+{inv.stockCreditedQty || qty})
                          </span>
                        ) : (
                          <button
                            id={`row-verify-credit-btn-${inv.id}`}
                            onClick={() => verifyAndCreditCustomerInvoiceStockIn(inv.id, qty)}
                            className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                            title="Verify goods and credit stock in to warehouse inventory"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verify &amp; Credit Stock In</span>
                          </button>
                        )}
                      </td>

                      {/* 11. Notes */}
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 max-w-xs truncate text-[11px]">
                        {inv.notes || '—'}
                      </td>

                      {/* 12. Actions */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedCustomerInvoice(inv)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 cursor-pointer transition-colors"
                            title="View / Print Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {activeRole === 'admin' && (
                            <button
                              onClick={() => {
                                setInvoiceToEdit(inv);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                              title="Edit Invoice"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['admin', 'manager', 'gm', 'accountant'].includes(activeRole) && (
                            <button
                              id={`btn-delete-inv-${inv.id}`}
                              onClick={() => setInvoiceToDelete(inv)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                              title="Delete Invoice"
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

      {/* View / Print Customer Invoice Modal */}
      {selectedCustomerInvoice && (
        <CustomerInvoiceModal
          invoice={selectedCustomerInvoice}
          onClose={() => setSelectedCustomerInvoice(null)}
        />
      )}

      {/* Create / Edit Customer Invoice Modal */}
      {isFormOpen && (
        <CustomerInvoiceFormModal
          invoiceToEdit={invoiceToEdit}
          onClose={() => {
            setIsFormOpen(false);
            setInvoiceToEdit(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {invoiceToDelete && (
        <DeleteConfirmationModal
          isOpen={!!invoiceToDelete}
          onClose={() => setInvoiceToDelete(null)}
          onConfirm={() => {
            if (invoiceToDelete) {
              deleteCustomerInvoice(invoiceToDelete.id);
              setInvoiceToDelete(null);
            }
          }}
          title="Delete Customer Sale (Stock Out)"
          message={`Are you sure you want to delete Customer Sale "${invoiceToDelete.invoiceNumber}" for ${invoiceToDelete.customerName} (SAR ${invoiceToDelete.totalAmount?.toLocaleString()})?`}
          confirmText="Yes, Delete Record"
        />
      )}
    </div>
  );
};

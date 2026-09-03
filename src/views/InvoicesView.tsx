import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TaxInvoice, InvoiceStatus, InvoicePaymentStatus, ZatcaQrScan } from '../types';
import { formatCurrency, formatDate } from '../utils/i18n';
import { exportInvoicesToCsv } from '../utils/zatca';
import {
  FileText,
  Plus,
  Eye,
  Search,
  CheckCircle2,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  CreditCard,
  Trash2,
  Building2,
  QrCode,
  ShieldCheck,
  Download,
  Printer,
  Edit,
  Camera,
  Upload,
  Database,
  RefreshCw,
  AlertTriangle,
  FileCode,
  Check,
  Copy,
  ExternalLink,
  Filter,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { ZatcaAddInvoiceModal } from '../components/ZatcaAddInvoiceModal';
import { ZatcaInvoiceDetailModal } from '../components/ZatcaInvoiceDetailModal';
import { ZatcaScannerModal } from '../components/ZatcaScannerModal';
import { InvoicePaymentModal } from '../components/InvoicePaymentModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const InvoicesView: React.FC = () => {
  const {
    taxInvoices,
    zatcaQrScans,
    invoiceStatusHistory,
    deleteTaxInvoice,
    deleteZatcaQrScan,
    updateInvoiceStatus,
    showToast,
    searchQuery,
    companySettings,
    activeRole,
  } = useApp();

  // Navigation tab state
  const [activeMainTab, setActiveMainTab] = useState<'dashboard' | 'history' | 'scanner' | 'supabase'>('dashboard');

  // Filter & Search states
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [zatcaStatusFilter, setZatcaStatusFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<TaxInvoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<TaxInvoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<TaxInvoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<TaxInvoice | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const [copiedSql, setCopiedSql] = useState(false);

  const effectiveSearch = (localSearch || searchQuery || '').toLowerCase();

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return taxInvoices.filter((inv) => {
      const matchesSearch =
        !effectiveSearch ||
        inv.invoiceNumber.toLowerCase().includes(effectiveSearch) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(effectiveSearch)) ||
        (inv.buyerName && inv.buyerName.toLowerCase().includes(effectiveSearch)) ||
        (inv.dnNumber && inv.dnNumber.toLowerCase().includes(effectiveSearch)) ||
        (inv.driverName && inv.driverName.toLowerCase().includes(effectiveSearch)) ||
        (inv.truckNo && inv.truckNo.toLowerCase().includes(effectiveSearch)) ||
        (inv.productService && inv.productService.toLowerCase().includes(effectiveSearch));

      const pStatus = inv.paymentStatus || (inv.isPaid ? 'paid' : 'unpaid');
      const matchesPayment = paymentStatusFilter === 'all' || pStatus === paymentStatusFilter;

      const zStatus = inv.status || 'submitted';
      const matchesZatca = zatcaStatusFilter === 'all' || zStatus === zatcaStatusFilter;

      const invDate = inv.issueDate || inv.invoiceDate || '';
      const matchesDate = !dateFilter || invDate.startsWith(dateFilter);

      return matchesSearch && matchesPayment && matchesZatca && matchesDate;
    });
  }, [taxInvoices, effectiveSearch, paymentStatusFilter, zatcaStatusFilter, dateFilter]);

  // Financial KPI Aggregations
  const totalInvoicesCount = taxInvoices.length;
  const grandTotalRevenue = taxInvoices.reduce((acc, inv) => acc + (inv.grandTotal || inv.totalAmount || 0), 0);
  const totalPaidAmount = taxInvoices.reduce(
    (acc, inv) => acc + (inv.paidAmount ?? (inv.isPaid ? (inv.grandTotal || inv.totalAmount || 0) : 0)),
    0
  );
  const totalOutstandingAmount = taxInvoices.reduce(
    (acc, inv) => acc + (inv.outstandingAmount ?? (inv.isPaid ? 0 : (inv.grandTotal || inv.totalAmount || 0))),
    0
  );
  const totalVatAmount = taxInvoices.reduce((acc, inv) => acc + (inv.totalVat || inv.vatAmount || 0), 0);
  const totalDiscountAmount = taxInvoices.reduce((acc, inv) => acc + (inv.discountTotal || 0), 0);

  const paidCount = taxInvoices.filter((i) => i.paymentStatus === 'paid' || i.isPaid).length;
  const unpaidCount = taxInvoices.filter((i) => (i.paymentStatus === 'unpaid' || !i.isPaid) && i.paymentStatus !== 'partial').length;
  const partialCount = taxInvoices.filter((i) => i.paymentStatus === 'partial').length;

  const submittedCount = taxInvoices.filter((i) => i.status === 'sent' || i.status === 'submitted' || i.status === 'reported').length;
  const acceptedCount = taxInvoices.filter((i) => i.status === 'accepted' || i.status === 'cleared' || i.status === 'paid').length;
  const rejectedCount = taxInvoices.filter((i) => i.status === 'rejected').length;

  const handleDeleteConfirm = (reason: string) => {
    if (deletingInvoice) {
      deleteTaxInvoice(deletingInvoice.id, reason);
      setDeletingInvoice(null);
    }
  };

  const handleExportExcel = () => {
    exportInvoicesToCsv(filteredInvoices);
    showToast('Export Ready', `Exported ${filteredInvoices.length} invoices to spreadsheet.`, 'success');
  };

  // Complete Supabase SQL Schema for all 6 tables
  const supabaseSchemaSql = `-- =========================================================
-- LOGIFLOW ENTERPRISE - ZATCA E-INVOICING SUPABASE DATABASE SCHEMA
-- Compliant with ZATCA Fatoora Phase 1 & Phase 2 UBL 2.1 Standard
-- =========================================================

-- 1. Table: customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    company_name_ar TEXT,
    mobile_number TEXT,
    email TEXT,
    address TEXT,
    city TEXT DEFAULT 'Riyadh',
    country TEXT DEFAULT 'Saudi Arabia',
    vat_number VARCHAR(15),
    cr_number VARCHAR(20),
    customer_type TEXT CHECK (customer_type IN ('corporate', 'individual', 'partner', 'government')),
    payment_terms TEXT DEFAULT 'Net 30',
    credit_limit NUMERIC(12,2) DEFAULT 100000.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    total_loads INTEGER DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0.00,
    paid_amount NUMERIC(14,2) DEFAULT 0.00,
    outstanding_amount NUMERIC(14,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('tax_invoice_b2b', 'simplified_b2c')),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issue_time TIME NOT NULL DEFAULT CURRENT_TIME,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    buyer_name TEXT NOT NULL,
    buyer_vat_number VARCHAR(15),
    buyer_cr_number VARCHAR(20),
    buyer_address TEXT,
    buyer_phone TEXT,
    dn_number TEXT,
    trip_number TEXT,
    driver_name TEXT,
    truck_no TEXT,
    pickup_location TEXT,
    drop_location TEXT,
    seller_name TEXT NOT NULL DEFAULT 'LogiFlow Transport & Logistics Co.',
    seller_vat_number VARCHAR(15) NOT NULL DEFAULT '300881928300003',
    seller_cr_number VARCHAR(20) NOT NULL DEFAULT '1010882736',
    seller_address TEXT NOT NULL,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(14,2) DEFAULT 0.00,
    vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'SAR',
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
    paid_amount NUMERIC(14,2) DEFAULT 0.00,
    outstanding_amount NUMERIC(14,2) DEFAULT 0.00,
    payment_terms TEXT DEFAULT 'Net 30',
    zatca_status TEXT DEFAULT 'submitted' CHECK (zatca_status IN ('draft', 'submitted', 'accepted', 'rejected', 'cleared', 'warning')),
    zatca_qr_payload TEXT,
    zatca_uuid UUID DEFAULT gen_random_uuid(),
    zatca_hash TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12,2) DEFAULT 0.00,
    taxable_amount NUMERIC(14,2) NOT NULL,
    vat_rate NUMERIC(4,2) DEFAULT 0.15,
    vat_amount NUMERIC(14,2) NOT NULL,
    total_with_vat NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table: payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_ref TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    invoice_number TEXT,
    payment_type TEXT CHECK (payment_type IN ('payment_in', 'payment_out')),
    amount NUMERIC(14,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'mada', 'cash', 'credit_account')),
    reference_number TEXT,
    recorded_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table: zatca_qr_scans
CREATE TABLE IF NOT EXISTS zatca_qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scanned_by TEXT,
    source_type TEXT CHECK (source_type IN ('camera', 'pdf', 'image', 'manual_base64')),
    raw_qr_payload TEXT NOT NULL,
    is_valid_tlv BOOLEAN DEFAULT TRUE,
    seller_name TEXT,
    seller_vat_number VARCHAR(15),
    invoice_timestamp TEXT,
    total_amount_with_vat NUMERIC(14,2),
    vat_amount NUMERIC(14,2),
    invoice_hash TEXT,
    digital_signature TEXT,
    public_key TEXT,
    matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    matched_invoice_number TEXT,
    verification_status TEXT DEFAULT 'verified' CHECK (verification_status IN ('verified', 'tampered', 'unverified')),
    notes TEXT
);

-- 6. Table: invoice_status_history
CREATE TABLE IF NOT EXISTS invoice_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    reason TEXT,
    zatca_response TEXT
);

-- Create Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_zatca_scans_date ON zatca_qr_scans(scanned_at);
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(supabaseSchemaSql);
    setCopiedSql(true);
    showToast('SQL Copied', 'Complete Supabase schema copied to clipboard.', 'info');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div id="zatca-e-invoice-view" className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-mono font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ZATCA E-INVOICING MODULE
            </span>
            <span className="text-xs text-slate-300">
              Fatoora Phase 1 & 2 Compliant | UBL 2.1 XML | QR TLV
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">ZATCA E-Invoice Management</h1>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Generate compliant electronic tax invoices, scan & decode ZATCA QR codes, inspect TLV tags, manage customer settlements, and sync schemas with Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setShowScannerModal(true)}
            className="px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-indigo-400/30 transition-all shadow-md cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>📷 QR Scanner</span>
          </button>

          <button
            onClick={() => {
              setEditingInvoice(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Invoice</span>
          </button>
        </div>
      </div>

      {/* Main Module Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveMainTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeMainTab === 'dashboard'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>1. ZATCA Dashboard</span>
        </button>

        <button
          onClick={() => setActiveMainTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeMainTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>4. Invoice History ({taxInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('scanner')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeMainTab === 'scanner'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>3. QR / ZATCA Scanner ({zatcaQrScans.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('supabase')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeMainTab === 'supabase'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>6. Supabase Database Schema</span>
        </button>
      </div>

      {/* TAB 1: ZATCA DASHBOARD */}
      {activeMainTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Total Invoices */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoices</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalInvoicesCount}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <span className="font-semibold text-emerald-600">{paidCount} Paid</span> •
                <span className="font-semibold text-rose-600">{unpaidCount} Unpaid</span>
              </div>
            </div>

            {/* Grand Total Revenue */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Total</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                {formatCurrency(grandTotalRevenue)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Gross Invoiced Volume</p>
            </div>

            {/* VAT Amount */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">VAT Amount (15%)</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2 font-mono">
                {formatCurrency(totalVatAmount)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total Tax Liability</p>
            </div>

            {/* Total Discount */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Discount</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
                {formatCurrency(totalDiscountAmount)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Customer Rebates & Offers</p>
            </div>

            {/* Paid / Outstanding Breakdown */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding Due</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
                {formatCurrency(totalOutstandingAmount)}
              </p>
              <div className="text-xs text-slate-500 mt-1">
                Settled: <strong className="text-emerald-600">{formatCurrency(totalPaidAmount)}</strong>
              </div>
            </div>
          </div>

          {/* ZATCA Status Telemetry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Submitted Status */}
            <div className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-indigo-950/40 dark:to-slate-900 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> SUBMITTED / QUEUED
                </span>
                <span className="text-2xl font-black text-indigo-950 dark:text-indigo-200 font-mono">{submittedCount}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Invoices generated and queued for ZATCA API portal clearance and cryptographic signing.
              </p>
              <button
                onClick={() => {
                  setZatcaStatusFilter('submitted');
                  setActiveMainTab('history');
                }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>View Submitted Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Accepted Status */}
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-slate-900 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> ACCEPTED / CLEARED
                </span>
                <span className="text-2xl font-black text-emerald-950 dark:text-emerald-200 font-mono">{acceptedCount}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Phase 2 compliant XML documents verified with valid cryptographic hash and stamped QR codes.
              </p>
              <button
                onClick={() => {
                  setZatcaStatusFilter('accepted');
                  setActiveMainTab('history');
                }}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>View Cleared Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Rejected / Warnings */}
            <div className="p-5 bg-gradient-to-br from-rose-50 to-amber-50/50 dark:from-rose-950/40 dark:to-slate-900 rounded-3xl border border-rose-100 dark:border-rose-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> REJECTED / ISSUES
                </span>
                <span className="text-2xl font-black text-rose-950 dark:text-rose-200 font-mono">{rejectedCount}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Invoices requiring attention due to VAT number discrepancies or incomplete buyer profiles.
              </p>
              <button
                onClick={() => {
                  setZatcaStatusFilter('rejected');
                  setActiveMainTab('history');
                }}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>View Rejected Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions Card */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>ZATCA E-Invoicing Quick Actions</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setEditingInvoice(null);
                    setShowAddModal(true);
                  }}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 rounded-2xl text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Issue New Tax Invoice</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Generate B2B / B2C invoice with instant ZATCA QR</p>
                </button>

                <button
                  onClick={() => setShowScannerModal(true)}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 rounded-2xl text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Scan & Decode QR</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Camera, image, or PDF ZATCA TLV extraction</p>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 rounded-2xl text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Download className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Export Excel (.CSV)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Download complete invoice and VAT registers</p>
                </button>

                <button
                  onClick={() => setActiveMainTab('supabase')}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 rounded-2xl text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Supabase SQL Schema</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">View & sync tables for cloud database</p>
                </button>
              </div>
            </div>

            {/* ZATCA Status Audit History Feed */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Recent Status & Clearance History</span>
                </h3>
                <span className="text-xs text-slate-400">{invoiceStatusHistory.length} events logged</span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {invoiceStatusHistory.slice(0, 5).map((ish) => (
                  <div
                    key={ish.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{ish.invoiceNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{ish.timestamp}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                      Status changed from <span className="font-mono uppercase text-slate-500">{ish.previousStatus}</span> → <strong className="text-emerald-600 uppercase">{ish.newStatus}</strong> by {ish.changedBy}
                    </p>
                    {ish.reason && <p className="text-slate-500 text-[11px] italic">{ish.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICE HISTORY */}
      {activeMainTab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          {/* Search, Date, Filters Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by Invoice No, Customer, DN, Driver, Truck..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Filter */}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden"
              />

              {/* Payment Filter */}
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="all">All Payments ({taxInvoices.length})</option>
                <option value="paid">Paid ({paidCount})</option>
                <option value="unpaid">Unpaid ({unpaidCount})</option>
                <option value="partial">Partial ({partialCount})</option>
              </select>

              {/* ZATCA Status Filter */}
              <select
                value={zatcaStatusFilter}
                onChange={(e) => setZatcaStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="all">All ZATCA Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="accepted">Accepted / Cleared</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Export Button */}
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Invoices History Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Invoice No.</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Customer / Buyer</th>
                    <th className="py-3.5 px-4">DN / Route</th>
                    <th className="py-3.5 px-4 text-right">Unit Price</th>
                    <th className="py-3.5 px-4 text-right">Discount</th>
                    <th className="py-3.5 px-4 text-center">VAT %</th>
                    <th className="py-3.5 px-4 text-right">VAT Amount</th>
                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-4 text-center">Payment Status</th>
                    <th className="py-3.5 px-4 text-center">ZATCA Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv) => {
                      const isPaid = inv.paymentStatus === 'paid' || inv.isPaid;
                      const isPartial = inv.paymentStatus === 'partial';
                      const zStatus = inv.status || 'submitted';

                      const firstItem = inv.items?.[0];
                      const qty = inv.quantity || firstItem?.quantity || 1;
                      const unitPrice = firstItem?.unitPrice ?? (qty > 0 && inv.subtotal ? inv.subtotal / qty : inv.subtotal || 0);
                      const discount = inv.discountTotal ?? firstItem?.discount ?? 0;
                      const vatPercent = firstItem?.vatRate !== undefined
                        ? Math.round(firstItem.vatRate * 100)
                        : (inv.subtotal > 0 && (inv.totalVat || inv.vatAmount)
                            ? Math.round(((inv.totalVat || inv.vatAmount || 0) / Math.max(1, inv.subtotal - discount)) * 100)
                            : 15);
                      const vatAmount = inv.totalVat ?? inv.vatAmount ?? firstItem?.vatAmount ?? 0;
                      const grandTotal = inv.grandTotal ?? inv.totalAmount ?? (inv.subtotal - discount + vatAmount);

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {formatDate(inv.issueDate || inv.invoiceDate || '')}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                              {inv.customerName || inv.buyerName}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              VAT: {inv.buyerVatNumber || '300000000000003'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            <span className="font-mono text-xs font-semibold">{inv.dnNumber || inv.tripNumber || 'N/A'}</span>
                            <p className="text-[10px] text-slate-400">
                              {inv.pickupLocation || 'Jeddah'} → {inv.dropLocation || 'Riyadh'}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300 font-medium">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {discount > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">-{formatCurrency(discount)}</span>
                            ) : (
                              <span className="text-slate-400">0.00</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                              {vatPercent}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            {formatCurrency(vatAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                            {formatCurrency(grandTotal)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-block ${
                              isPaid
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : isPartial
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            }`}>
                              {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase inline-block ${
                              zStatus === 'accepted' || zStatus === 'cleared'
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : zStatus === 'rejected'
                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                            }`}>
                              {zStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View / Print */}
                              <button
                                onClick={() => setViewingInvoice(inv)}
                                title="View & Print ZATCA Invoice"
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit (Admin Only) */}
                              {activeRole === 'admin' && (
                                <button
                                  onClick={() => {
                                    setEditingInvoice(inv);
                                    setShowAddModal(true);
                                  }}
                                  title="Edit Invoice"
                                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}

                              {/* Settle Payment */}
                              {!isPaid && (
                                <button
                                  onClick={() => setPayingInvoice(inv)}
                                  title="Record Payment"
                                  className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete (Admin Only) */}
                              {activeRole === 'admin' && (
                                <button
                                  onClick={() => setDeletingInvoice(inv)}
                                  title="Delete Invoice"
                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-500">
                        <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
                        <p className="font-semibold">No invoices match your search filters.</p>
                        <button
                          onClick={() => {
                            setLocalSearch('');
                            setPaymentStatusFilter('all');
                            setZatcaStatusFilter('all');
                            setDateFilter('');
                          }}
                          className="mt-2 text-xs text-indigo-600 font-bold hover:underline"
                        >
                          Clear Filters
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QR / ZATCA SCANNER & AUDIT LOGS */}
      {activeMainTab === 'scanner' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <span>ZATCA QR Code Scans & Extracted Payloads</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved scans, TLV binary decodes, vendor receipts, and verification results stored in table <code>zatca_qr_scans</code>.
              </p>
            </div>

            <button
              onClick={() => setShowScannerModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Live Camera / Upload Scan</span>
            </button>
          </div>

          {/* Scans Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3.5 px-4">Scanned Date / Time</th>
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-4">Seller / Vendor Name</th>
                    <th className="py-3.5 px-4">Seller VAT No.</th>
                    <th className="py-3.5 px-4 text-right">Unit Price</th>
                    <th className="py-3.5 px-4 text-right">Discount</th>
                    <th className="py-3.5 px-4 text-center">VAT %</th>
                    <th className="py-3.5 px-4 text-right">VAT Amount</th>
                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {zatcaQrScans.length > 0 ? (
                    zatcaQrScans.map((scan) => {
                      const matchedInv = taxInvoices.find(
                        (i) =>
                          (scan.matchedInvoiceId && i.id === scan.matchedInvoiceId) ||
                          (scan.matchedInvoiceNumber && (i.invoiceNumber === scan.matchedInvoiceNumber || i.id === scan.matchedInvoiceNumber))
                      );

                      const grandTotal = scan.grandTotal ?? scan.totalAmountWithVat ?? (matchedInv ? (matchedInv.grandTotal || matchedInv.totalAmount) : 0);
                      const vatAmount = scan.vatAmount ?? (matchedInv ? (matchedInv.totalVat || matchedInv.vatAmount) : 0);
                      const discount = scan.discount ?? (matchedInv ? (matchedInv.discountTotal || matchedInv.items?.[0]?.discount || 0) : 0);
                      const subtotal = scan.subtotal ?? (matchedInv ? matchedInv.subtotal : Math.max(0, grandTotal - vatAmount));
                      const unitPrice = scan.unitPrice ?? (matchedInv?.items?.[0]?.unitPrice || (subtotal + discount));
                      const vatPercent = scan.vatPercent !== undefined
                        ? scan.vatPercent
                        : (matchedInv?.items?.[0]?.vatRate !== undefined
                            ? Math.round(matchedInv.items[0].vatRate * 100)
                            : (subtotal > 0 && vatAmount > 0 ? Math.round((vatAmount / Math.max(1, subtotal - discount)) * 100) : 15));

                      return (
                        <tr key={scan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-800 dark:text-slate-200">
                            {scan.scannedAt}
                            <p className="text-[10px] text-slate-400">{scan.scannedBy}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono uppercase text-slate-700 dark:text-slate-300">
                              {scan.sourceType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {scan.sellerName || 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-indigo-600 dark:text-indigo-400">
                            {scan.sellerVatNumber || 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300 font-medium">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {discount > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">-{formatCurrency(discount)}</span>
                            ) : (
                              <span className="text-slate-400">0.00</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                              {vatPercent}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            {formatCurrency(vatAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                            {formatCurrency(grandTotal)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-block ${
                              scan.status === 'verified'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            }`}>
                              {scan.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {activeRole === 'admin' && (
                              <button
                                onClick={() => deleteZatcaQrScan(scan.id)}
                                title="Delete scan entry"
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-slate-500">
                        <QrCode className="w-8 h-8 mx-auto text-slate-400 mb-1 opacity-50" />
                        <p>No QR scans logged yet. Click above to scan with camera or upload an image.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUPABASE DATABASE SCHEMA */}
      {activeMainTab === 'supabase' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-xs font-mono font-bold">
                  DATABASE ENGINE
                </span>
                <span className="text-xs text-slate-400">PostgreSQL / Supabase Ready</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Supabase ZATCA Schema & Table Structures
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                DDL definitions for all 6 tables: <code>customers</code>, <code>invoices</code>, <code>invoice_items</code>, <code>payments</code>, <code>zatca_qr_scans</code>, and <code>invoice_status_history</code>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copySqlToClipboard}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {copiedSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'SQL Copied!' : 'Copy SQL Script'}</span>
              </button>
            </div>
          </div>

          {/* SQL Code Block */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl overflow-hidden space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400 font-mono border-b border-slate-800 pb-3">
              <span>schema_zatca_v2.sql</span>
              <span className="text-emerald-400 font-bold">6 Tables | Indexes | Constraints</span>
            </div>
            <pre className="text-emerald-400 font-mono text-xs leading-relaxed max-h-[500px] overflow-y-auto pr-2">
              {supabaseSchemaSql}
            </pre>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <ZatcaAddInvoiceModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          initialInvoice={editingInvoice}
        />
      )}

      {viewingInvoice && (
        <ZatcaInvoiceDetailModal
          isOpen={Boolean(viewingInvoice)}
          onClose={() => setViewingInvoice(null)}
          invoice={viewingInvoice}
          onPay={(inv) => {
            setViewingInvoice(null);
            setPayingInvoice(inv);
          }}
        />
      )}

      {payingInvoice && (
        <InvoicePaymentModal
          isOpen={Boolean(payingInvoice)}
          onClose={() => setPayingInvoice(null)}
          invoice={payingInvoice}
        />
      )}

      {deletingInvoice && (
        <DeleteConfirmationModal
          isOpen={Boolean(deletingInvoice)}
          onClose={() => setDeletingInvoice(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete Invoice ${deletingInvoice.invoiceNumber}`}
          description={`Are you sure you want to delete invoice ${deletingInvoice.invoiceNumber} for ${deletingInvoice.customerName || deletingInvoice.buyerName}? An audit log entry will record this deletion.`}
          requireReason={true}
        />
      )}

      {showScannerModal && (
        <ZatcaScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
        />
      )}
    </div>
  );
};

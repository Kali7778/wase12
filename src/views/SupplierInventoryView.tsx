import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SupplierInventoryItem, SupplierStockTransfer } from '../types';
import {
  Boxes,
  PackagePlus,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  FileText,
  Building2,
  Calendar,
  Eye,
  Trash2,
  Truck,
  CheckCircle2,
  QrCode,
  Barcode,
  Upload,
  Camera,
  Layers,
  ArrowRight,
  Download,
  Share2,
  Copy,
  Check,
  Plus,
  RefreshCw,
  Clock,
  UserCheck,
  FileCheck,
  ShieldCheck,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import { BarcodeRenderer } from '../components/BarcodeRenderer';

export const SupplierInventoryView: React.FC = () => {
  const {
    setCurrentView,
    supplierInventory,
    drivers,
    customers,
    vehicles,
    addSupplierInventoryItem,
    updateSupplierInventoryItem,
    deleteSupplierInventoryItem,
    transferSupplierStock,
    showToast,
    language,
  } = useApp();

  const isAr = language === 'ar';

  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState<'all_stock' | 'inward_log' | 'outward_transfers' | 'available_only'>('all_stock');

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail / PDF / Transfer Modals
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<SupplierInventoryItem | null>(null);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<SupplierInventoryItem | null>(null);
  const [selectedItemForBarcode, setSelectedItemForBarcode] = useState<SupplierInventoryItem | null>(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Manual Add State
  const [manualForm, setManualForm] = useState({
    supplier: 'El-Khayyat Gypsum Plant',
    tlbNo: `TLB-00${supplierInventory.length + 1}`,
    dnNo: `901004${Math.floor(3000 + Math.random() * 9000)}`,
    soNo: `910004${Math.floor(2000 + Math.random() * 8000)}`,
    itemDescription: 'Gypsum Powder Regular 40 kg (TLB)',
    itemNumber: '1290000001',
    qtyReceived: 750,
    uom: 'BAG',
    receivedBy: 'Mohamed Salah (Driver - T-101)',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: 'Direct bulk receipt from supplier manufacturing plant.',
    autoLinkToMain: true,
  });

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    transferredTo: 'DISPATCH_LOAD' as 'TLB_MAIN_INVENTORY' | 'DISPATCH_LOAD' | 'DIRECT_SALE' | 'CUSTOMER_DELIVERY',
    quantity: 750,
    driverId: drivers[0]?.id || '',
    customerId: customers[0]?.id || '',
    vehiclePlate: drivers[0]?.vehiclePlate || '',
    performedBy: 'Logistics Dispatcher Lead',
    referenceDoc: '',
    notes: '',
  });

  // Filtered Items
  const filteredItems = useMemo(() => {
    return supplierInventory.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matches =
          item.tlbNo.toLowerCase().includes(q) ||
          item.dnNo.toLowerCase().includes(q) ||
          item.soNo.toLowerCase().includes(q) ||
          item.supplier.toLowerCase().includes(q) ||
          item.itemDescription.toLowerCase().includes(q) ||
          item.itemNumber?.toLowerCase().includes(q) ||
          item.receivedBy.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (supplierFilter !== 'ALL' && item.supplier !== supplierFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      if (activeTab === 'available_only' && item.qtyAvailable <= 0) return false;

      return true;
    });
  }, [supplierInventory, searchQuery, supplierFilter, statusFilter, activeTab]);

  // Aggregations
  const totalReceived = supplierInventory.reduce((acc, i) => acc + (i.qtyReceived || 0), 0);
  const totalAvailable = supplierInventory.reduce((acc, i) => acc + (i.qtyAvailable || 0), 0);
  const totalAllocated = supplierInventory.reduce((acc, i) => acc + (i.qtyAllocated || 0), 0);

  // All Transfers Array (Outward stock)
  const allTransfers = useMemo(() => {
    const list: (SupplierStockTransfer & { tlbNo: string; dnNo: string; itemDescription: string })[] = [];
    supplierInventory.forEach((item) => {
      (item.transfers || []).forEach((t) => {
        list.push({
          ...t,
          tlbNo: item.tlbNo,
          dnNo: item.dnNo,
          itemDescription: item.itemDescription,
        });
      });
    });
    return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }, [supplierInventory]);

  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(supplierInventory.map((i) => i.supplier).filter(Boolean)));
  }, [supplierInventory]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    showToast('Copied', `Copied "${text}" to clipboard`, 'info');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.dnNo || !manualForm.qtyReceived) {
      showToast('Validation Error', 'Please enter valid DN Number and Quantity.', 'warning');
      return;
    }

    addSupplierInventoryItem({
      supplier: manualForm.supplier,
      supplierName: manualForm.supplier,
      tlbNo: manualForm.tlbNo,
      dnNo: manualForm.dnNo,
      soNo: manualForm.soNo,
      itemDescription: manualForm.itemDescription,
      itemNumber: manualForm.itemNumber,
      uom: manualForm.uom,
      qtyReceived: Number(manualForm.qtyReceived),
      qtyAvailable: Number(manualForm.qtyReceived),
      qtyAllocated: 0,
      receivedBy: manualForm.receivedBy,
      receivedDate: manualForm.receivedDate,
      aiScanStatus: 'completed',
      status: 'RECEIVED',
      notes: manualForm.notes,
      autoLinkToMainInventory: manualForm.autoLinkToMain,
    });

    setShowAddSupplierModal(false);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForTransfer) return;

    const driver = drivers.find((d) => d.id === transferForm.driverId);
    const customer = customers.find((c) => c.id === transferForm.customerId);

    const result = transferSupplierStock({
      supplierItemId: selectedItemForTransfer.id,
      quantity: Number(transferForm.quantity),
      transferredTo: transferForm.transferredTo,
      driverId: driver?.id,
      driverName: driver?.name,
      vehiclePlate: driver?.vehiclePlate || transferForm.vehiclePlate,
      customerId: customer?.id,
      customerName: customer?.name,
      performedBy: transferForm.performedBy,
      referenceDoc: transferForm.referenceDoc || `TRF-${selectedItemForTransfer.dnNo}`,
      notes: transferForm.notes,
    });

    if (result.success) {
      setSelectedItemForTransfer(null);
    }
  };

  return (
    <div id="supplier-inventory-view" className="space-y-6 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white uppercase">
                  {isAr ? 'مخزون المورّد (TLB Supplier Inventory)' : 'TLB SUPPLIER INVENTORY – STOCK ALL'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {isAr ? 'المخزن الرئيسي للمورّد' : 'Primary Source of Truth'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                {isAr
                  ? 'مرحلة استلام المخزون الأولي من المورّد: رفع وتدقيق الـ PDF بالذكاء الاصطناعي، ثم التحويل للأسطول أو المبيعات أو المستودع الرئيسي.'
                  : 'Stage 1 Supplier Stock intake: PDF Upload + AI Scan → Supplier Inventory → Stock All → Dispatcher Loading → Driver Inventory → Sale.'}
              </p>
            </div>
          </div>
        </div>

        {/* Top Action CTAs */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Primary Action Button: + Upload DN PDF */}
          <button
            id="btn-supplier-upload-pdf"
            onClick={() => setCurrentView('adminSlips')}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
            <span>{isAr ? '+ رفع ملف PDF للمورّد' : '+ Upload DN / Supplier PDF'}</span>
          </button>

          {/* Manual Add Item */}
          <button
            id="btn-supplier-manual-add"
            onClick={() => setShowAddSupplierModal(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-95 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300/80 dark:border-slate-700"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>{isAr ? 'إدخال يدوي' : 'Manual Intake'}</span>
          </button>
        </div>
      </div>

      {/* Workflow Step Indicator */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 text-white flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">{isAr ? 'مسار دورة المخزون:' : 'Workflow Pipeline:'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-mono font-bold">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>1. Supplier PDF / AI Scan</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300">
            <span>2. Supplier Inventory (Stock All)</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300">
            <span>3. Dispatcher Loading / Driver Fleet</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
            <span>4. Customer Delivery & Sale</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Inward Received</span>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {totalReceived.toLocaleString()} <span className="text-xs font-normal text-slate-400">BAG</span>
            </div>
            <span className="text-[11px] text-slate-500">{supplierInventory.length} Supplier DN Batches</span>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Available in Stock</span>
            <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {totalAvailable.toLocaleString()} <span className="text-xs font-normal text-slate-400">BAG</span>
            </div>
            <span className="text-[11px] text-emerald-600">Ready for Dispatch / Transfer</span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Outward Allocated</span>
            <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {totalAllocated.toLocaleString()} <span className="text-xs font-normal text-slate-400">BAG</span>
            </div>
            <span className="text-[11px] text-amber-600">{allTransfers.length} Outward Movements</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Active Suppliers</span>
            <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              {uniqueSuppliers.length || 1} <span className="text-xs font-normal text-slate-400">Plants</span>
            </div>
            <span className="text-[11px] text-slate-500">100% AI Scan Verified</span>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
        <button
          id="tab-supplier-all-stock"
          onClick={() => setActiveTab('all_stock')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'all_stock'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-500" />
          <span>{isAr ? 'المخزون الشامل (Stock All)' : 'Stock All (All Batches)'} ({supplierInventory.length})</span>
        </button>

        <button
          id="tab-supplier-available"
          onClick={() => setActiveTab('available_only')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'available_only'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-teal-500" />
          <span>{isAr ? 'المخزون المتاح للتحميل' : 'Available Stock Only'} ({supplierInventory.filter((i) => i.qtyAvailable > 0).length})</span>
        </button>

        <button
          id="tab-supplier-outward-transfers"
          onClick={() => setActiveTab('outward_transfers')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'outward_transfers'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4 text-blue-500" />
          <span>{isAr ? 'حركات التحميل والترحيل (Outward Transfers)' : 'Outward Transfers & Loading'} ({allTransfers.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PRIMARY TAB CONTENT: STOCK ALL / BATCH TABLE                             */}
      {/* ========================================================================= */}
      {activeTab !== 'outward_transfers' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
          {/* Controls Bar: Search & Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-search-supplier-inventory"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث برقم السند DN أو المورد أو الصنف...' : 'Search by DN No, SO No, TLB No, Supplier, Item...'}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                id="select-supplier-filter"
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium outline-none"
              >
                <option value="ALL">All Suppliers ({supplierInventory.length})</option>
                {uniqueSuppliers.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                id="select-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="RECEIVED">RECEIVED (Full)</option>
                <option value="PARTIAL_ALLOCATED">PARTIAL_ALLOCATED</option>
                <option value="ALLOCATED">ALLOCATED (Exhausted)</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3.5">TLB No / Supplier</th>
                  <th className="py-3 px-3.5">DN No / SO No</th>
                  <th className="py-3 px-3.5">Item Description</th>
                  <th className="py-3 px-3.5 text-center">QTY Received</th>
                  <th className="py-3 px-3.5 text-center">QTY Available</th>
                  <th className="py-3 px-3.5 text-center">QTY Allocated</th>
                  <th className="py-3 px-3.5">PDF / AI Scan</th>
                  <th className="py-3 px-3.5">Barcode / QR</th>
                  <th className="py-3 px-3.5">Received By / Date</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <PackagePlus className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-bold">No supplier inventory records found.</p>
                      <p className="text-[11px] mt-1 text-slate-500">Upload a supplier DN PDF or record a manual intake.</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isFullyAllocated = item.qtyAvailable === 0;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* TLB No & Supplier */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              {item.tlbNo}
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{item.supplier}</span>
                          </div>
                        </td>

                        {/* DN No & SO No */}
                        <td className="py-3 px-3.5 font-mono">
                          <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                            <span>DN: {item.dnNo}</span>
                            <button
                              onClick={() => handleCopy(item.dnNo)}
                              title="Copy DN"
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              {copiedCode === item.dnNo ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          {item.soNo && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>SO: {item.soNo}</span>
                              <button
                                onClick={() => handleCopy(item.soNo || '')}
                                title="Copy SO"
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                {copiedCode === item.soNo ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Item Description */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.itemDescription}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            SKU: {item.itemNumber || '1290000001'} • {item.uom || 'BAG'}
                          </div>
                        </td>

                        {/* QTY Received */}
                        <td className="py-3 px-3.5 text-center font-mono font-black text-slate-900 dark:text-white">
                          {item.qtyReceived?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{item.uom}</span>
                        </td>

                        {/* QTY Available */}
                        <td className="py-3 px-3.5 text-center font-mono font-black">
                          <span
                            className={`px-2 py-0.5 rounded-md ${
                              item.qtyAvailable > 0
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.qtyAvailable?.toLocaleString()} {item.uom}
                          </span>
                        </td>

                        {/* QTY Allocated */}
                        <td className="py-3 px-3.5 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                          {item.qtyAllocated || 0} <span className="text-[10px] font-normal text-slate-400">{item.uom}</span>
                        </td>

                        {/* PDF / AI Scan */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                              <Sparkles className="w-3 h-3" />
                              <span>AI Scanned</span>
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5">
                            {item.pdfName || `DN_${item.dnNo}.pdf`}
                          </div>
                        </td>

                        {/* Barcode / QR */}
                        <td className="py-3 px-3.5">
                          <button
                            onClick={() => setSelectedItemForBarcode(item)}
                            className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-[11px] font-mono transition-all cursor-pointer"
                          >
                            <Barcode className="w-3.5 h-3.5 text-slate-500" />
                            <span>{item.barcode || item.dnNo}</span>
                          </button>
                        </td>

                        {/* Received By / Date */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            <span>{item.receivedBy}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{item.receivedDate}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              item.status === 'RECEIVED'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                : item.status === 'PARTIAL_ALLOCATED'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300/40'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Transfer / Allocate Button */}
                            <button
                              disabled={isFullyAllocated}
                              onClick={() => {
                                setSelectedItemForTransfer(item);
                                setTransferForm((prev) => ({
                                  ...prev,
                                  quantity: item.qtyAvailable,
                                  referenceDoc: `TRF-${item.dnNo}`,
                                }));
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                                isFullyAllocated
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs cursor-pointer'
                              }`}
                              title="Transfer or Dispatch Stock from this Supplier Batch"
                            >
                              <Truck className="w-3 h-3" />
                              <span>{isAr ? 'ترحيل / تحميل' : 'Transfer'}</span>
                            </button>

                            {/* View Detail Button */}
                            <button
                              onClick={() => setSelectedItemForDetail(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                              title="View Full Supplier Batch Details & PDF Slip"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Delete Record */}
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete supplier batch TLB #${item.tlbNo} (DN #${item.dnNo})?`)) {
                                  deleteSupplierInventoryItem(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-all cursor-pointer"
                              title="Delete Supplier Inventory Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* ========================================================================= */}
      {/* OUTWARD TRANSFERS / LOADING AUDIT TAB                                     */}
      {/* ========================================================================= */}
      {activeTab === 'outward_transfers' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                <span>Outward Stock Allocations & Driver Loading Ledger</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Traceable record of stock pulled from Supplier Batches into Dispatcher Loading, Driver Fleet, or Direct Customer Sales.
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full font-mono text-xs font-bold">
              {allTransfers.length} Total Allocations
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3.5">Timestamp</th>
                  <th className="py-3 px-3.5">Source Supplier Batch</th>
                  <th className="py-3 px-3.5">Transfer Target</th>
                  <th className="py-3 px-3.5 text-center">Quantity (BAG)</th>
                  <th className="py-3 px-3.5">Assigned Driver / Fleet</th>
                  <th className="py-3 px-3.5">Customer / Receiver</th>
                  <th className="py-3 px-3.5">Authorized By</th>
                  <th className="py-3 px-3.5">Ref Doc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {allTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No outward transfers recorded yet. Transfer stock from an available batch above.
                    </td>
                  </tr>
                ) : (
                  allTransfers.map((trn) => (
                    <tr key={trn.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3.5 text-slate-500 font-sans text-[11px]">{trn.timestamp}</td>
                      <td className="py-3 px-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {trn.tlbNo} <span className="text-slate-400 font-normal text-[11px]">(DN: {trn.dnNo})</span>
                      </td>
                      <td className="py-3 px-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {trn.transferredTo.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center font-black text-slate-900 dark:text-white">
                        {trn.quantity?.toLocaleString()} BAG
                      </td>
                      <td className="py-3 px-3.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                        {trn.driverName ? `${trn.driverName} (${trn.vehiclePlate || '—'})` : '—'}
                      </td>
                      <td className="py-3 px-3.5 font-sans text-slate-700 dark:text-slate-300">
                        {trn.customerName || 'Main Inventory Depot'}
                      </td>
                      <td className="py-3 px-3.5 font-sans text-slate-500">{trn.performedBy}</td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">{trn.referenceDoc || trn.id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TRANSFER / ALLOCATE STOCK FROM SUPPLIER BATCH                    */}
      {/* ========================================================================= */}
      {selectedItemForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                    Allocate / Transfer Supplier Stock
                  </h3>
                  <p className="text-xs text-slate-500">
                    Source: {selectedItemForTransfer.tlbNo} (DN #{selectedItemForTransfer.dnNo})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">Available to Allocate:</span>
                  <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-200">
                    {selectedItemForTransfer.qtyAvailable} {selectedItemForTransfer.uom}
                  </div>
                </div>
                <div className="text-right text-slate-500 text-[11px]">
                  <span>Item: {selectedItemForTransfer.itemDescription}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Destination Target *
                </label>
                <select
                  value={transferForm.transferredTo}
                  onChange={(e) => setTransferForm({ ...transferForm, transferredTo: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="DISPATCH_LOAD">Dispatcher Loading / Driver Fleet</option>
                  <option value="TLB_MAIN_INVENTORY">TLB Main Inventory Storage</option>
                  <option value="DIRECT_SALE">Direct Customer Sale (Stock Out)</option>
                  <option value="CUSTOMER_DELIVERY">Customer Site Direct Delivery</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Transfer Quantity (BAG) *
                  </label>
                  <input
                    type="number"
                    max={selectedItemForTransfer.qtyAvailable}
                    min={1}
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Driver
                  </label>
                  <select
                    value={transferForm.driverId}
                    onChange={(e) => {
                      const d = drivers.find((drv) => drv.id === e.target.value);
                      setTransferForm({
                        ...transferForm,
                        driverId: e.target.value,
                        vehiclePlate: d?.vehiclePlate || '',
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.vehiclePlate || 'Fleet'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Customer (If direct sale/delivery)
                </label>
                <select
                  value={transferForm.customerId}
                  onChange={(e) => setTransferForm({ ...transferForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                >
                  <option value="">— Select Customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reference Note
                </label>
                <input
                  type="text"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  placeholder="e.g. Loaded onto Truck T-101 for Riyadh West construction route"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItemForTransfer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  Confirm Transfer ({transferForm.quantity} BAG)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MANUAL SUPPLIER INTAKE                                           */}
      {/* ========================================================================= */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                    Manual Supplier Stock Intake
                  </h3>
                  <p className="text-xs text-slate-500">Record stock directly arriving from supplier plant</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSupplierModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier / Plant Origin *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.supplier}
                    onChange={(e) => setManualForm({ ...manualForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    TLB Batch No.
                  </label>
                  <input
                    type="text"
                    value={manualForm.tlbNo}
                    onChange={(e) => setManualForm({ ...manualForm, tlbNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier DN No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.dnNo}
                    onChange={(e) => setManualForm({ ...manualForm, dnNo: e.target.value })}
                    placeholder="9010043722"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SO No.
                  </label>
                  <input
                    type="text"
                    value={manualForm.soNo}
                    onChange={(e) => setManualForm({ ...manualForm, soNo: e.target.value })}
                    placeholder="9100042633"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Item Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.itemDescription}
                    onChange={(e) => setManualForm({ ...manualForm, itemDescription: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity Received *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={manualForm.qtyReceived}
                    onChange={(e) => setManualForm({ ...manualForm, qtyReceived: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Received By (Driver / Lead)
                  </label>
                  <input
                    type="text"
                    value={manualForm.receivedBy}
                    onChange={(e) => setManualForm({ ...manualForm, receivedBy: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Received Date
                  </label>
                  <input
                    type="date"
                    value={manualForm.receivedDate}
                    onChange={(e) => setManualForm({ ...manualForm, receivedDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Auto-Link & Sync to TLB Main Inventory
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Automatically credits warehouse stock quantity and records inward audit ledger
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={manualForm.autoLinkToMain}
                  onChange={(e) => setManualForm({ ...manualForm, autoLinkToMain: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  Save Supplier Stock Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BARCODE & QR CODE VIEWER                                         */}
      {/* ========================================================================= */}
      {selectedItemForBarcode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                  Batch Barcode & QR Slip
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForBarcode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center space-y-3">
              <BarcodeRenderer
                value={selectedItemForBarcode.barcode || selectedItemForBarcode.dnNo}
                type="DN"
                title={`TLB: ${selectedItemForBarcode.tlbNo}`}
                subtitle={`DN #${selectedItemForBarcode.dnNo} • QTY: ${selectedItemForBarcode.qtyReceived} BAG`}
              />
            </div>

            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 font-mono">
              <p><strong>Supplier:</strong> {selectedItemForBarcode.supplier}</p>
              <p><strong>SO Number:</strong> {selectedItemForBarcode.soNo || '—'}</p>
              <p><strong>Available:</strong> {selectedItemForBarcode.qtyAvailable} {selectedItemForBarcode.uom}</p>
            </div>

            <button
              onClick={() => setSelectedItemForBarcode(null)}
              className="w-full py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              Close Barcode
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FULL SUPPLIER BATCH DETAIL & PDF PREVIEW                          */}
      {/* ========================================================================= */}
      {selectedItemForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                    Supplier Batch Record – {selectedItemForDetail.tlbNo}
                  </h3>
                  <p className="text-xs text-slate-500">
                    DN #{selectedItemForDetail.dnNo} / SO #{selectedItemForDetail.soNo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Received QTY</span>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
                    {selectedItemForDetail.qtyReceived} BAG
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Available</span>
                  <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {selectedItemForDetail.qtyAvailable} BAG
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Allocated</span>
                  <div className="text-base font-black font-mono text-amber-700 dark:text-amber-300 mt-0.5">
                    {selectedItemForDetail.qtyAllocated || 0} BAG
                  </div>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-950/60 rounded-xl border border-purple-500/20">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">AI Status</span>
                  <div className="text-base font-black font-mono text-purple-700 dark:text-purple-300 mt-0.5">
                    VERIFIED
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Supplier:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedItemForDetail.supplier}</p>
                </div>
                <div>
                  <span className="text-slate-400">Item Description:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedItemForDetail.itemDescription}</p>
                </div>
                <div>
                  <span className="text-slate-400">Received By:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedItemForDetail.receivedBy}</p>
                </div>
                <div>
                  <span className="text-slate-400">Received Date & Time:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedItemForDetail.receivedDate} ({selectedItemForDetail.receivedTime || '08:30 AM'})
                  </p>
                </div>
              </div>

              {/* Transfers history for this batch */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span>Outward Movement Allocations ({selectedItemForDetail.transfers?.length || 0})</span>
                </h4>

                {(selectedItemForDetail.transfers || []).length === 0 ? (
                  <p className="text-slate-400 italic">No outward transfers yet. 100% stock available in supplier batch.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedItemForDetail.transfers?.map((tr) => (
                      <div
                        key={tr.id}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{tr.transferredTo.replace(/_/g, ' ')}</span>
                          <p className="text-[11px] text-slate-500">
                            {tr.driverName ? `Driver: ${tr.driverName}` : ''} {tr.customerName ? `• Customer: ${tr.customerName}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-amber-600">-{tr.quantity} BAG</span>
                          <p className="text-[10px] text-slate-400">{tr.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setSelectedItemForDetail(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

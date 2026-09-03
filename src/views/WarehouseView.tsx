import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { WarehouseItem, WarehouseMovement, InboundDeliveryNote } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  Boxes,
  PackagePlus,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Search,
  CheckCircle2,
  Barcode,
  Thermometer,
  Calendar,
  Layers,
  History,
  TrendingDown,
  Sparkles,
  FileText,
  Building2,
  Printer,
  Eye,
  Trash2,
  PackageCheck,
  Truck,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Tag,
  Upload,
  Camera,
  Filter,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  ChevronDown,
  Edit2
} from 'lucide-react';
import { AiDeliveryNoteImportModal } from '../components/AiDeliveryNoteImportModal';
import { InboundDeliveryNoteSlipModal } from '../components/InboundDeliveryNoteSlipModal';
import { BarcodeRenderer, SlipBarcodePair } from '../components/BarcodeRenderer';
import { NewCompanyLoadModal } from '../components/NewCompanyLoadModal';
import { InwardStockModal } from '../components/InwardStockModal';
import { NewSaleStockOutModal } from '../components/NewSaleStockOutModal';
import { StockInwardModal } from '../components/StockInwardModal';
import { StockTraceabilityDrawer } from '../components/StockTraceabilityDrawer';
import { WarehouseItemModal } from '../components/WarehouseItemModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { Trip, SaleOrder } from '../types';

export const WarehouseView: React.FC = () => {
  const {
    warehouseItems,
    warehouseMovements,
    saleOrders,
    inboundDeliveryNotes,
    updateInboundDeliveryNote,
    deleteInboundDeliveryNote,
    customers,
    trips,
    addWarehouseItem,
    addWarehouseMovement,
    updateWarehouseItem,
    deleteWarehouseItem,
    showToast,
    searchQuery: globalSearchQuery,
    language,
    activeRole,
    openAiDnImportModal,
    setCurrentView,
    supplierInventory,
  } = useApp();

  const isAr = language === 'ar';

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'available_items' | 'movements'>('available_items');

  // Modals
  const [showAiImportModal, setShowAiImportModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<WarehouseItem | null>(null);
  const [stockItemToDelete, setStockItemToDelete] = useState<WarehouseItem | null>(null);
  const [dnToDelete, setDnToDelete] = useState<InboundDeliveryNote | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showCompanyLoadModal, setShowCompanyLoadModal] = useState(false);
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showSaleOutModal, setShowSaleOutModal] = useState(false);
  const [showStockInwardModal, setShowStockInwardModal] = useState(false);
  const [showTraceabilityDrawer, setShowTraceabilityDrawer] = useState(false);
  const [selectedItemForTraceability, setSelectedItemForTraceability] = useState<WarehouseItem | null>(null);
  const [saleOutTargetDn, setSaleOutTargetDn] = useState<string | undefined>(undefined);
  const [saleOutTargetItemId, setSaleOutTargetItemId] = useState<string | undefined>(undefined);
  const [stockInTargetDn, setStockInTargetDn] = useState<string>('DN-003');
  const [inwardTripTarget, setInwardTripTarget] = useState<Trip | null>(null);
  const [selectedDnForSlip, setSelectedDnForSlip] = useState<InboundDeliveryNote | null>(null);
  const [selectedBarcodeNote, setSelectedBarcodeNote] = useState<InboundDeliveryNote | null>(null);
  const [copiedDnId, setCopiedDnId] = useState<string | null>(null);
  const [movementFilter, setMovementFilter] = useState<'ALL' | 'STOCK_IN' | 'STOCK_OUT' | 'RESERVE'>('ALL');

  // Table Filters & Search
  const [tableSearch, setTableSearch] = useState('');
  const [inOutFilter, setInOutFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // Manual Movement Form State
  const [movementType, setMovementType] = useState<'inbound_grn' | 'outbound_dispatch'>('inbound_grn');
  const [selectedSkuForMovement, setSelectedSkuForMovement] = useState(warehouseItems[0]?.sku || '');
  const [movementQty, setMovementQty] = useState(50);
  const [movementRefDoc, setMovementRefDoc] = useState('GRN-2026-0205');
  const [movementNotes, setMovementNotes] = useState('Quality inspection passed. Stock positioned in Bay.');

  // Unique companies & dates for filter dropdowns
  const availableCompanies = useMemo(() => {
    const list = Array.from(new Set(inboundDeliveryNotes.map((d) => d.companyName.trim()))).filter(Boolean);
    return list;
  }, [inboundDeliveryNotes]);

  const availableDates = useMemo(() => {
    const list = Array.from(new Set(inboundDeliveryNotes.map((d) => d.printDate || d.orderDate))).filter(Boolean);
    return list;
  }, [inboundDeliveryNotes]);

  // IN / OUT stats
  const inRows = useMemo(() => inboundDeliveryNotes.filter((d) => (d.inOutType || 'IN').toUpperCase() === 'IN'), [inboundDeliveryNotes]);
  const outRows = useMemo(() => inboundDeliveryNotes.filter((d) => (d.inOutType || 'IN').toUpperCase() === 'OUT'), [inboundDeliveryNotes]);
  const inCount = inRows.length;
  const outCount = outRows.length;
  const totalInboundQuantity = inRows.reduce((acc, d) => acc + d.quantity, 0);
  const totalOutboundQuantity = outRows.reduce((acc, d) => acc + d.quantity, 0);

  // Main Filtered Available Warehouse Items Table Rows
  const filteredAvailableRows = useMemo(() => {
    const query = (tableSearch || globalSearchQuery || '').toLowerCase().trim();

    return inboundDeliveryNotes.filter((dn) => {
      // 1. Search Query
      if (query) {
        const matchesQuery =
          dn.dnNumber.toLowerCase().includes(query) ||
          dn.soNumber.toLowerCase().includes(query) ||
          dn.companyName.toLowerCase().includes(query) ||
          dn.customerNumber.toLowerCase().includes(query) ||
          dn.itemName.toLowerCase().includes(query) ||
          (dn.productDescription && dn.productDescription.toLowerCase().includes(query)) ||
          (dn.itemNumber && dn.itemNumber.toLowerCase().includes(query)) ||
          (dn.shipFrom && dn.shipFrom.toLowerCase().includes(query));

        if (!matchesQuery) return false;
      }

      // 2. IN / OUT Filter (Case-insensitive & robust)
      const currentInOut = (dn.inOutType || 'IN').toUpperCase() as 'IN' | 'OUT';
      if (inOutFilter !== 'ALL' && currentInOut !== inOutFilter) {
        return false;
      }

      // 3. Company Filter
      if (companyFilter !== 'ALL' && dn.companyName.trim() !== companyFilter.trim()) {
        return false;
      }

      // 4. Date Filter
      if (dateFilter !== 'ALL') {
        const rowDate = dn.printDate || dn.orderDate;
        if (rowDate !== dateFilter) return false;
      }

      return true;
    });
  }, [inboundDeliveryNotes, tableSearch, globalSearchQuery, inOutFilter, companyFilter, dateFilter]);

  // Stock catalog filter
  const filteredStockItems = warehouseItems.filter((i) => {
    const q = (tableSearch || globalSearchQuery || '').toLowerCase().trim();
    return (
      !q ||
      i.name.toLowerCase().includes(q) ||
      i.sku.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.barcode.includes(q)
    );
  });

  const lowStockItems = warehouseItems.filter((i) => i.quantityOnHand <= i.minimumThreshold);
  const totalStockValue = warehouseItems.reduce((acc, it) => acc + it.quantityOnHand * it.unitCost, 0);

  const handleCopyDn = (dnNumber: string) => {
    navigator.clipboard.writeText(dnNumber);
    setCopiedDnId(dnNumber);
    showToast('Copied', `DN #${dnNumber} copied to clipboard`, 'info');
    setTimeout(() => setCopiedDnId(null), 2000);
  };

  const handleProcessMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const item = warehouseItems.find((i) => i.sku === selectedSkuForMovement);
    if (!item) return;

    if (movementType === 'outbound_dispatch' && item.quantityOnHand < Number(movementQty)) {
      showToast('Insufficient Stock', `Only ${item.quantityOnHand} available in inventory.`, 'error');
      return;
    }

    addWarehouseMovement({
      type: movementType,
      itemSku: item.sku,
      itemName: item.name,
      quantity: Number(movementQty),
      referenceDoc: movementRefDoc,
      performedBy: 'Hassan Al-Otaibi (Warehouse Lead)',
      notes: movementNotes,
    });

    setShowMovementModal(false);
  };

  return (
    <div id="warehouse-inventory-view" className="space-y-6 animate-fadeIn">
      {/* Top Banner & Main Heading */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white uppercase">
                {isAr ? 'الأصناف المتوفرة بالمستودع (Available Warehouse Items)' : 'AVAILABLE WAREHOUSE ITEMS'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'جدول المخزون وسندات التسليم المستخرجة بالذكاء الاصطناعي مع إرفاق ملف الـ PDF الأصلي'
                  : 'Automated AI PDF Delivery Note table with real-time stock balances and attached original PDFs'}
              </p>
            </div>
          </div>
        </div>

        {/* Top Direct Action Buttons: [ + Upload PDF ] [ Scan DN ] [ Manual Add ] */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Primary Action Button: + Upload PDF */}
          <button
            id="btn-upload-pdf"
            onClick={() => openAiDnImportModal('pdf')}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>{isAr ? '+ رفع ملف PDF' : '+ Upload PDF'}</span>
          </button>

          {/* Scan DN Button */}
          <button
            id="btn-scan-dn"
            onClick={() => openAiDnImportModal('picture')}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-95 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300/80 dark:border-slate-700"
          >
            <Camera className="w-4 h-4 text-blue-500" />
            <span>{isAr ? 'مسح السند (Scan DN)' : 'Scan DN'}</span>
          </button>

          {/* Manual Add Button */}
          <button
            id="btn-manual-add"
            onClick={() => {
              setEditingStockItem(null);
              setShowAddItemModal(true);
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-95 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300/80 dark:border-slate-700"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>{isAr ? 'إضافة صنف' : 'Add Item SKU'}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Items in Table</span>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {inboundDeliveryNotes.length} <span className="text-xs font-normal text-slate-400">Records</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Inbound QTY</span>
            <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {totalInboundQuantity.toLocaleString()} <span className="text-xs font-normal text-slate-400">Units</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Linked Companies</span>
            <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {customers.length} <span className="text-xs font-normal text-slate-400">Accounts</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Valuation</span>
            <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              {formatCurrency(totalStockValue)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
            <Boxes className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id="tab-available-warehouse-items"
            onClick={() => setActiveTab('available_items')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'available_items'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>{isAr ? 'جدول الأصناف وسندات التسليم' : 'Available Warehouse Items (DN Table)'} ({inboundDeliveryNotes.length})</span>
          </button>

          <button
            id="tab-movements-log"
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'movements'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4 text-emerald-500" />
            <span>{isAr ? 'سجل الحركات والتوريد (GRN)' : 'Movements & Audit Ledger'} ({warehouseMovements.length})</span>
          </button>
        </div>

        <button
          id="btn-goto-supplier-inventory"
          onClick={() => setCurrentView('supplierInventory')}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <PackagePlus className="w-4 h-4" />
          <span>{isAr ? 'مخزون المورّد (TLB Supplier Inventory)' : 'TLB Supplier Inventory – Stock All'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-800 text-[10px] font-mono">
            {supplierInventory.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PRIMARY TAB: AVAILABLE WAREHOUSE ITEMS (EXACT SPECIFICATION TABLE)       */}
      {/* ========================================================================= */}
      {activeTab === 'available_items' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <span>AVAILABLE WAREHOUSE ITEMS</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">
                  {filteredAvailableRows.length} {filteredAvailableRows.length === 1 ? 'row' : 'rows'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'رفع ملف PDF ينشئ سطراً جديداً بالجدول فورياً مع إرفاق مستند الـ PDF الأصلي'
                  : 'Uploading a PDF automatically extracts information and creates a new table row with attached PDF'}
              </p>
            </div>

            {/* Quick Upload Action */}
            <button
              onClick={() => setShowAiImportModal(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'رفع سند جديد (PDF)' : 'Upload New DN'}</span>
            </button>
          </div>

          {/* Search & Filter Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="search-warehouse-input"
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder={isAr ? 'بحث برقم السند / الشركة / الصنف / العميل...' : 'Search DN / Company / Item...'}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Filter: All / IN / OUT */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-400 px-2 uppercase">{isAr ? 'النوع:' : 'Type:'}</span>
              <button
                id="filter-inout-all"
                onClick={() => setInOutFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  inOutFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All ({inboundDeliveryNotes.length})
              </button>
              <button
                id="filter-inout-in"
                onClick={() => setInOutFilter('IN')}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  inOutFilter === 'IN'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>🟢 IN ({inCount})</span>
              </button>
              <button
                id="filter-inout-out"
                onClick={() => setInOutFilter('OUT')}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  inOutFilter === 'OUT'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>🔴 OUT ({outCount})</span>
              </button>
            </div>

            {/* Filter: Company Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
              >
                <option value="ALL">All Companies ▼</option>
                {availableCompanies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Date Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer font-mono"
              >
                <option value="ALL">Date ▼</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* MAIN TABLE: EXACT REQUESTED SCHEMA */}
          {/* | Date | Company | Customer No. | DN No. | SO No. | Item | Item No. | UOM | QTY | IN/OUT | PDF | Action | */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-left text-xs border-collapse min-w-[980px]">
              <thead className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">Date</th>
                  <th className="py-3 px-3.5">Company</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Customer No.</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">DN No.</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">SO No.</th>
                  <th className="py-3 px-3.5">Item Description</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Item No.</th>
                  <th className="py-3 px-3 text-center">UOM</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">QTY</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">IN/OUT</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">PDF</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                {filteredAvailableRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500">
                      <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold">No warehouse items matching current filters</p>
                      <button
                        onClick={() => {
                          setTableSearch('');
                          setInOutFilter('ALL');
                          setCompanyFilter('ALL');
                          setDateFilter('ALL');
                        }}
                        className="mt-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                      >
                        Reset Search Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredAvailableRows.map((row, idx) => {
                    const isOut = row.inOutType === 'OUT';
                    const displayDate = row.printDate || row.orderDate || '13-08-2026';

                    return (
                      <tr
                        key={`${row.id}-${row.inOutType || 'row'}-${idx}`}
                        className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        {/* 1. Date */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                          {displayDate}
                        </td>

                        {/* 2. Company */}
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{row.companyName}</span>
                          </div>
                          {row.shipFrom && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                              From: {row.shipFrom}
                            </span>
                          )}
                        </td>

                        {/* 3. Customer No. */}
                        <td className="py-3.5 px-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                          {row.customerNumber}
                        </td>

                        {/* 4. DN No. */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap font-mono font-bold text-amber-600 dark:text-amber-400">
                          <div className="flex items-center gap-1">
                            <span>{row.dnNumber}</span>
                            <button
                              onClick={() => handleCopyDn(row.dnNumber)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer transition-opacity"
                              title="Copy DN Number"
                            >
                              {copiedDnId === row.dnNumber ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>

                        {/* 5. SO No. */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                          {row.soNumber}
                        </td>

                        {/* 6. Item Description */}
                        <td className="py-3.5 px-3.5 text-slate-700 dark:text-slate-200 font-semibold">
                          <span className="truncate max-w-[240px] block" title={row.productDescription || row.itemName}>
                            {row.productDescription || row.itemName}
                          </span>
                        </td>

                        {/* 7. Item No. */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                          {row.itemNumber || '1290000001'}
                        </td>

                        {/* 9. UOM */}
                        <td className="py-3.5 px-3 text-center font-bold">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                            {row.uom || 'BAG'}
                          </span>
                        </td>

                        {/* 10. QTY */}
                        <td className="py-3.5 px-3.5 text-right font-black font-mono text-sm text-slate-900 dark:text-white">
                          <span className={isOut ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {row.quantity.toLocaleString()}
                          </span>
                        </td>

                        {/* 11. IN / OUT */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <button
                            id={`toggle-inout-${row.id}`}
                            type="button"
                            onClick={() => {
                              const nextType: 'IN' | 'OUT' = isOut ? 'IN' : 'OUT';
                              updateInboundDeliveryNote(row.id, { inOutType: nextType });
                              showToast(
                                'Movement Type Updated',
                                `DN #${row.dnNumber} changed to ${nextType === 'OUT' ? '🔴 OUT (Stock Out)' : '🟢 IN (Stock In)'}`,
                                'success'
                              );
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] cursor-pointer transition-all active:scale-95 shadow-2xs hover:opacity-90 ${
                              isOut
                                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900 border border-rose-300/60'
                                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 border border-emerald-300/60'
                            }`}
                            title={`Click to switch type between IN and OUT. Currently: ${isOut ? '🔴 OUT (Stock Out)' : '🟢 IN (Stock In)'}`}
                          >
                            <span>{isOut ? '🔴 OUT' : '🟢 IN'}</span>
                            <span className="text-[9px] opacity-70 font-mono">⇄</span>
                          </button>
                        </td>

                        {/* 12. PDF (View PDF button / Attached PDF) */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <button
                            id={`view-pdf-btn-${row.id}`}
                            onClick={() => setSelectedDnForSlip(row)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                            title={`Open attached PDF: ${row.attachedPdfName || 'Delivery_Note.pdf'}`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View PDF</span>
                          </button>
                        </td>

                        {/* 13. Action */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedBarcodeNote(row)}
                              className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                              title="View SO & DN Barcodes"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDnForSlip(row);
                                setTimeout(() => window.print(), 150);
                              }}
                              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                              title="Print Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {['admin', 'manager', 'gm', 'warehouse_mgr', 'warehouse', 'dispatcher'].includes(activeRole) && (
                              <button
                                id={`btn-delete-dn-${row.id}`}
                                onClick={() => setDnToDelete(row)}
                                className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete Row"
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

      {/* ========================================================================= */}
      {/* TAB: MOVEMENTS & AUDIT LEDGER                                             */}
      {/* ========================================================================= */}
      {activeTab === 'movements' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                {isAr ? 'سجل حركات المخزون والمراجعة والتدقيق' : 'Stock Movements & Inventory Ledger'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every Stock In and Stock Out is permanently recorded for GM &amp; CEO traceability.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setMovementFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  movementFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({warehouseMovements.length})
              </button>
              <button
                onClick={() => setMovementFilter('STOCK_IN')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  movementFilter === 'STOCK_IN'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Stock In
              </button>
              <button
                onClick={() => setMovementFilter('STOCK_OUT')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  movementFilter === 'STOCK_OUT'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Stock Out (Sale)
              </button>
              <button
                onClick={() => setMovementFilter('RESERVE')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  movementFilter === 'RESERVE'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Reserved
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Movement Type</th>
                  <th className="p-3.5">Ref / DN No.</th>
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5 text-center">Qty Delta</th>
                  <th className="p-3.5 text-center">Stock Transition</th>
                  <th className="p-3.5">Customer / Supplier</th>
                  <th className="p-3.5">Driver &amp; Truck</th>
                  <th className="p-3.5">Performed By</th>
                  <th className="p-3.5 text-right">Audit Seal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                {warehouseMovements
                  .filter((mov) => {
                    if (movementFilter === 'STOCK_IN') {
                      return mov.type === 'stock_in' || mov.movementType === 'IN' || mov.type === 'inbound_grn';
                    }
                    if (movementFilter === 'STOCK_OUT') {
                      return mov.type === 'stock_out_sale' || mov.movementType === 'OUT' || mov.type === 'outbound_dispatch';
                    }
                    if (movementFilter === 'RESERVE') {
                      return mov.type === 'reserve_company_load' || mov.movementType === 'RESERVE';
                    }
                    return true;
                  })
                  .map((mov) => {
                    const isIn = mov.type === 'stock_in' || mov.movementType === 'IN' || mov.type === 'inbound_grn';
                    const isOut = mov.type === 'stock_out_sale' || mov.movementType === 'OUT' || mov.type === 'outbound_dispatch';
                    const isReserve = mov.type === 'reserve_company_load' || mov.movementType === 'RESERVE';

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {mov.timestamp || mov.date}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase inline-flex items-center gap-1 ${
                              isIn
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : isOut
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {isIn ? <ArrowDownLeft className="w-3 h-3" /> : isOut ? <ArrowUpRight className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                            {isIn ? 'STOCK IN' : isOut ? 'STOCK OUT (SALE)' : 'RESERVED (LOAD)'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          {mov.referenceDoc || mov.dnNumber || mov.saleId || '—'}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{mov.itemName || mov.productName || 'TLB'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{mov.itemSku || mov.barcode || 'TLB'}</div>
                        </td>
                        <td className="p-3.5 text-center font-mono font-black">
                          <span
                            className={
                              isIn
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isOut
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-amber-600'
                            }
                          >
                            {isIn ? `+${mov.quantity}` : isOut ? `-${mov.quantity}` : `${mov.quantity}`}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono text-[11px]">
                          {mov.previousQuantityOnHand !== undefined && mov.newQuantityOnHand !== undefined ? (
                            <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {mov.previousQuantityOnHand} → <strong>{mov.newQuantityOnHand}</strong>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-300">
                          {mov.customerName || mov.source || 'Central Inventory'}
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                          {mov.driverName ? `${mov.driverName} (${mov.vehiclePlate || 'T-101'})` : '—'}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 text-xs">
                          {mov.performedBy || 'Admin'}
                        </td>
                        <td className="p-3.5 text-right font-mono text-[10px] text-slate-400">
                          {mov.auditHash ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title={`SHA-256: ${mov.auditHash}`}>
                              <ShieldCheck className="w-3.5 h-3.5" /> Sealed
                            </span>
                          ) : (
                            <span>Verified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Delivery Note Scanner / Import Modal */}
      <AiDeliveryNoteImportModal
        isOpen={showAiImportModal}
        onClose={() => setShowAiImportModal(false)}
      />

      {/* Inbound Delivery Note Formal Slip & Attached PDF Modal */}
      <InboundDeliveryNoteSlipModal
        note={selectedDnForSlip}
        onClose={() => setSelectedDnForSlip(null)}
      />

      {/* Warehouse Stock Item Add / Edit Modal */}
      <WarehouseItemModal
        isOpen={showAddItemModal}
        onClose={() => {
          setShowAddItemModal(false);
          setEditingStockItem(null);
        }}
        initialData={editingStockItem}
        onSave={(data) => {
          if (editingStockItem) {
            updateWarehouseItem(editingStockItem.id, data);
          } else {
            addWarehouseItem(data as Omit<WarehouseItem, 'id'>);
          }
          setShowAddItemModal(false);
          setEditingStockItem(null);
        }}
        language={language}
      />

      {/* Delete Stock Item Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!stockItemToDelete}
        title={isAr ? 'حذف صنف من دليل المستودع' : 'Delete Warehouse Stock Item'}
        message={
          isAr
            ? `هل أنت متأكد من رغبتك في حذف الصنف "${stockItemToDelete?.name}" (رمز: ${stockItemToDelete?.sku})؟ لا يمكن التراجع عن هذه العملية.`
            : `Are you sure you want to permanently delete SKU "${stockItemToDelete?.sku}" (${stockItemToDelete?.name})? All inventory data and physical balance records will be removed.`
        }
        onConfirm={() => {
          if (stockItemToDelete) {
            deleteWarehouseItem(stockItemToDelete.id);
            setStockItemToDelete(null);
          }
        }}
        onCancel={() => setStockItemToDelete(null)}
      />

      {/* Modal: Process Movement GRN / Pick */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {movementType === 'inbound_grn' ? 'Goods Receipt Note (GRN Intake)' : 'Outbound Cargo Pick & Dispatch'}
            </h3>
            <form onSubmit={handleProcessMovement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Target Stock Item</label>
                <select
                  value={selectedSkuForMovement}
                  onChange={(e) => setSelectedSkuForMovement(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {warehouseItems.map((it) => (
                    <option key={it.id} value={it.sku}>
                      {it.sku} - {it.name} (Current: {it.quantityOnHand})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={movementQty}
                  onChange={(e) => setMovementQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Reference Document Code</label>
                <input
                  type="text"
                  required
                  value={movementRefDoc}
                  onChange={(e) => setMovementRefDoc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Inspection & Quality Notes</label>
                <textarea
                  rows={2}
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isAr ? 'تأكيد وقيد الحركة' : 'Confirm & Post Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: QUICK SO & DN BARCODES PREVIEW                                     */}
      {/* ========================================================================= */}
      {selectedBarcodeNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'رموز الباركود المعتمدة (SO & DN)' : 'Official Scannable Barcodes (SO & DN)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedBarcodeNote.companyName} • {selectedBarcodeNote.itemName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBarcodeNote(null)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <SlipBarcodePair
                soNumber={selectedBarcodeNote.soNumber}
                dnNumber={selectedBarcodeNote.dnNumber}
                itemSku={selectedBarcodeNote.itemNumber}
              />

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sales Order (SO):</span>
                  <strong className="font-mono text-slate-900 dark:text-white">#{selectedBarcodeNote.soNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Note (DN):</span>
                  <strong className="font-mono text-amber-600 dark:text-amber-400">#{selectedBarcodeNote.dnNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Item Reference / SKU:</span>
                  <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedBarcodeNote.itemNumber || '1290000001'}</strong>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
              <button
                onClick={() => {
                  const note = selectedBarcodeNote;
                  setSelectedBarcodeNote(null);
                  setSelectedDnForSlip(note);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open Full Slip Sheet</span>
              </button>

              <button
                onClick={() => setSelectedBarcodeNote(null)}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Company Load Modal */}
      {showCompanyLoadModal && (
        <NewCompanyLoadModal
          isOpen={showCompanyLoadModal}
          onClose={() => setShowCompanyLoadModal(false)}
        />
      )}

      {/* Inward Stock Modal */}
      {showInwardModal && (
        <InwardStockModal
          isOpen={showInwardModal}
          onClose={() => {
            setShowInwardModal(false);
            setInwardTripTarget(null);
          }}
          trip={inwardTripTarget}
        />
      )}

      {/* Stock In Inward Modal */}
      {showStockInwardModal && (
        <StockInwardModal
          isOpen={showStockInwardModal}
          onClose={() => setShowStockInwardModal(false)}
          defaultDnNumber={stockInTargetDn}
        />
      )}

      {/* Full Traceability & Audit Trail Drawer */}
      {showTraceabilityDrawer && selectedItemForTraceability && (
        <StockTraceabilityDrawer
          isOpen={showTraceabilityDrawer}
          onClose={() => {
            setShowTraceabilityDrawer(false);
            setSelectedItemForTraceability(null);
          }}
          item={selectedItemForTraceability}
          movements={warehouseMovements}
          saleOrders={saleOrders}
        />
      )}
      {/* Delete Stock Item Confirmation Modal */}
      {stockItemToDelete && (
        <DeleteConfirmationModal
          isOpen={!!stockItemToDelete}
          onClose={() => setStockItemToDelete(null)}
          onConfirm={() => {
            if (stockItemToDelete) {
              deleteWarehouseItem(stockItemToDelete.id);
              setStockItemToDelete(null);
            }
          }}
          title="Delete Warehouse SKU"
          message={`Are you sure you want to permanently delete inventory SKU "${stockItemToDelete.sku}" - ${stockItemToDelete.name}? Current On-Hand: ${stockItemToDelete.quantityOnHand} ${stockItemToDelete.unit}.`}
          confirmText="Yes, Delete SKU"
        />
      )}

      {/* Delete Inbound Delivery Note Confirmation Modal */}
      {dnToDelete && (
        <DeleteConfirmationModal
          isOpen={!!dnToDelete}
          onClose={() => setDnToDelete(null)}
          onConfirm={() => {
            if (dnToDelete) {
              deleteInboundDeliveryNote(dnToDelete.id);
              setDnToDelete(null);
            }
          }}
          title="Delete Delivery Note"
          message={`Are you sure you want to remove Delivery Note "${dnToDelete.dnNumber}" (${dnToDelete.companyName} - ${dnToDelete.itemName})?`}
          confirmText="Yes, Delete Delivery Note"
        />
      )}
    </div>
  );
};

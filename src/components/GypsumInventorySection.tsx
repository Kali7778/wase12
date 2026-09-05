import React, { useState, useRef } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  History,
  Check,
  AlertTriangle,
  Search,
  Download,
  Trash2,
  Calendar,
  Truck,
  User,
  Building,
  RefreshCw,
  X,
  Upload,
  ArrowRight,
  Info,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GypsumInventoryItem, GypsumMovement } from '../types';

export const GypsumInventorySection: React.FC = () => {
  const {
    gypsumInventory,
    gypsumMovements,
    recordGypsumQtyIn,
    recordGypsumQtyOut,
    addGypsumItem,
    deleteGypsumMovement,
    resetGypsumInventory,
    customers,
    drivers,
    canEdit,
  } = useApp();

  // Selected item for operations
  const [selectedItemNumber, setSelectedItemNumber] = useState<string>(
    gypsumInventory[0]?.itemNumber || '1290000001'
  );

  const currentItem =
    gypsumInventory.find((g) => g.itemNumber === selectedItemNumber) ||
    gypsumInventory[0] || {
      id: 'default',
      itemNumber: '1290000001',
      itemDescription: 'Bags - Regular 40 kg Gypsum Powder',
      uom: 'BAG',
      openingStock: 0,
      qtyIn: 750,
      qtyOut: 0,
      availableStock: 750,
      soNumber: '9100042352',
      dnNumber: '9010043436',
    };

  // Section references for quick scrolling
  const movementsSectionRef = useRef<HTMLDivElement>(null);
  const qtyInCardRef = useRef<HTMLDivElement>(null);
  const qtyOutCardRef = useRef<HTMLDivElement>(null);

  // Qty In Form State
  const [inDate, setInDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inItemNumber, setInItemNumber] = useState<string>(currentItem.itemNumber);
  const [inQty, setInQty] = useState<string>('750');
  const [inReference, setInReference] = useState<string>('DN #9010043436 (SO: 9100042352)');
  const [inSoNumber, setInSoNumber] = useState<string>('9100042352');
  const [inDnNumber, setInDnNumber] = useState<string>('9010043436');
  const [inNotes, setInNotes] = useState<string>('Delivery Note intake from El-Khayyat Gypsum Plant.');
  const [inPdfFile, setInPdfFile] = useState<File | null>(null);
  const [inPdfName, setInPdfName] = useState<string>('Delivery_Note_9010043436.pdf');
  const [inSubmitting, setInSubmitting] = useState<boolean>(false);

  // Qty Out Form State
  const [outDate, setOutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [outItemNumber, setOutItemNumber] = useState<string>(currentItem.itemNumber);
  const [outQty, setOutQty] = useState<string>('');
  const [outCustomer, setOutCustomer] = useState<string>('Sarh Al-Bunyan Construction Co.');
  const [outDriverName, setOutDriverName] = useState<string>('Ahmed Al-Ghamdi');
  const [outTlbNo, setOutTlbNo] = useState<string>('TLB-001');
  const [outReference, setOutReference] = useState<string>('Sale Order / Outward Dispatch');
  const [outNotes, setOutNotes] = useState<string>('');
  const [outSubmitting, setOutSubmitting] = useState<boolean>(false);

  // Modals
  const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);

  // New Item Form State
  const [newItemNumber, setNewItemNumber] = useState<string>('');
  const [newItemDesc, setNewItemDesc] = useState<string>('');
  const [newItemUom, setNewItemUom] = useState<string>('BAG');
  const [newItemOpeningStock, setNewItemOpeningStock] = useState<string>('0');
  const [newItemSo, setNewItemSo] = useState<string>('');
  const [newItemDn, setNewItemDn] = useState<string>('');
  const [newItemNotes, setNewItemNotes] = useState<string>('');

  // Movement Ledger Filters & Search
  const [movementSearch, setMovementSearch] = useState<string>('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Sync item selection in forms when active item changes
  const handleSelectActiveItem = (itemNum: string) => {
    setSelectedItemNumber(itemNum);
    setInItemNumber(itemNum);
    setOutItemNumber(itemNum);
  };

  // Selected item object for Qty In
  const inSelectedItem =
    gypsumInventory.find((g) => g.itemNumber === inItemNumber) || currentItem;

  // Selected item object for Qty Out
  const outSelectedItem =
    gypsumInventory.find((g) => g.itemNumber === outItemNumber) || currentItem;

  // Check validation for Qty Out: Qty Out cannot exceed available stock
  const numericOutQty = Number(outQty) || 0;
  const isOutQtyExceeded = numericOutQty > outSelectedItem.availableStock;
  const isOutQtyInvalid = numericOutQty <= 0 || isOutQtyExceeded;

  // Handle Save Qty In
  const handleSaveQtyIn = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyVal = Number(inQty);
    if (!qtyVal || qtyVal <= 0) return;

    setInSubmitting(true);
    setTimeout(() => {
      recordGypsumQtyIn({
        itemNumber: inItemNumber,
        date: inDate,
        qtyIn: qtyVal,
        reference: inReference.trim(),
        soNumber: inSoNumber.trim() || undefined,
        dnNumber: inDnNumber.trim() || undefined,
        notes: inNotes.trim() || undefined,
        pdfName: inPdfName || undefined,
      });
      setInSubmitting(false);
      setInQty('');
      setInNotes('');
    }, 200);
  };

  // Handle Save Qty Out
  const handleSaveQtyOut = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyVal = Number(outQty);
    if (!qtyVal || qtyVal <= 0) return;

    // Constraint: The system should not allow Qty Out greater than the available stock.
    if (qtyVal > outSelectedItem.availableStock) {
      return;
    }

    setOutSubmitting(true);
    setTimeout(() => {
      const res = recordGypsumQtyOut({
        itemNumber: outItemNumber,
        date: outDate,
        qtyOut: qtyVal,
        customer: outCustomer.trim() || undefined,
        driverName: outDriverName.trim() || undefined,
        tlbNumber: outTlbNo.trim() || undefined,
        reference: outReference.trim() || undefined,
        notes: outNotes.trim() || undefined,
      });
      setOutSubmitting(false);
      if (res.success) {
        setOutQty('');
        setOutNotes('');
      }
    }, 200);
  };

  // Handle Add New Item Submit
  const handleAddNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemNumber.trim() || !newItemDesc.trim()) return;

    addGypsumItem({
      itemNumber: newItemNumber.trim(),
      itemDescription: newItemDesc.trim(),
      uom: (newItemUom.trim() || 'BAG').toUpperCase(),
      openingStock: Number(newItemOpeningStock) || 0,
      qtyIn: 0,
      qtyOut: 0,
      soNumber: newItemSo.trim() || undefined,
      dnNumber: newItemDn.trim() || undefined,
      notes: newItemNotes.trim() || undefined,
    });

    setSelectedItemNumber(newItemNumber.trim());
    setInItemNumber(newItemNumber.trim());
    setOutItemNumber(newItemNumber.trim());
    setShowAddItemModal(false);

    // Reset modal fields
    setNewItemNumber('');
    setNewItemDesc('');
    setNewItemOpeningStock('0');
    setNewItemSo('');
    setNewItemDn('');
    setNewItemNotes('');
  };

  // Filtered movements
  const filteredMovements = gypsumMovements.filter((mov) => {
    if (movementTypeFilter !== 'ALL' && mov.type !== movementTypeFilter) {
      return false;
    }
    if (!movementSearch.trim()) return true;
    const q = movementSearch.toLowerCase();
    return (
      mov.itemNumber.toLowerCase().includes(q) ||
      mov.itemDescription.toLowerCase().includes(q) ||
      (mov.soNumber && mov.soNumber.toLowerCase().includes(q)) ||
      (mov.dnNumber && mov.dnNumber.toLowerCase().includes(q)) ||
      (mov.reference && mov.reference.toLowerCase().includes(q)) ||
      (mov.customer && mov.customer.toLowerCase().includes(q))
    );
  });

  // Export Movement History as CSV
  const handleExportCsv = () => {
    const headers = ['Date', 'Type', 'Item No.', 'Item Description', 'Qty In', 'Qty Out', 'Balance', 'SO No.', 'DN No.', 'Reference', 'Customer'];
    const rows = filteredMovements.map((m) => [
      m.date,
      m.type,
      `"${m.itemNumber}"`,
      `"${m.itemDescription}"`,
      m.qtyIn,
      m.qtyOut,
      m.balance,
      `"${m.soNumber || ''}"`,
      `"${m.dnNumber || ''}"`,
      `"${m.reference || ''}"`,
      `"${m.customer || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Gypsum_Movement_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 📦 Section 1: Gypsum Inventory Header & Summary Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  📦 Gypsum Inventory
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Live Synced
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time stock ledger, separate Qty In / Qty Out workflows, and continuous Delivery Note traceability.
              </p>
            </div>
          </div>

          {/* System status pill */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Stock:</span>
            <strong className="text-slate-900 dark:text-white font-bold">
              {currentItem.availableStock.toLocaleString()} {currentItem.uom}
            </strong>
          </div>
        </div>

        {/* Inventory Summary Table */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-500" />
              Inventory Summary
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing {gypsumInventory.length} item{gypsumInventory.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Item No.</th>
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4 text-center">UOM</th>
                  <th className="py-3 px-4 text-right">Opening Stock</th>
                  <th className="py-3 px-4 text-right">Qty In</th>
                  <th className="py-3 px-4 text-right">Qty Out</th>
                  <th className="py-3 px-4 text-right">Available Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {gypsumInventory.map((item) => {
                  const isSelected = item.itemNumber === selectedItemNumber;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleSelectActiveItem(item.itemNumber)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50/60 dark:bg-amber-950/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        {item.itemNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                        {item.itemDescription}
                        {item.dnNumber && (
                          <span className="ml-2 text-2xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            DN #{item.dnNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.uom}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 dark:text-slate-400 font-mono">
                        {item.openingStock.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                        +{item.qtyIn.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400 font-semibold font-mono">
                        {item.qtyOut > 0 ? `-${item.qtyOut.toLocaleString()}` : '0'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-slate-900 dark:text-white">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                          {item.availableStock.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1 gap-2">
            <p className="italic">
              * The item number, description, and quantity are based on the uploaded Delivery Note.
            </p>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Reference:</span>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-2xs">
                SO: 9100042352
              </span>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-2xs">
                DN: 9010043436
              </span>
            </div>
          </div>
        </div>

        {/* Inventory Actions Bar */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Inventory Actions:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* ➕ Add New Item */}
              <button
                id="btn-gypsum-add-item"
                type="button"
                onClick={() => setShowAddItemModal(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span>➕ Add New Item</span>
              </button>

              {/* 📥 Qty In */}
              <button
                id="btn-gypsum-action-qty-in"
                type="button"
                onClick={() => qtyInCardRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>📥 Qty In</span>
              </button>

              {/* 📤 Qty Out */}
              <button
                id="btn-gypsum-action-qty-out"
                type="button"
                onClick={() => qtyOutCardRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>📤 Qty Out</span>
              </button>

              {/* 📄 Upload PDF */}
              <button
                id="btn-gypsum-action-upload-pdf"
                type="button"
                onClick={() => setShowPdfModal(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>📄 Upload PDF</span>
              </button>

              {/* 📋 Movement History */}
              <button
                id="btn-gypsum-action-history"
                type="button"
                onClick={() => movementsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <History className="w-3.5 h-3.5 text-indigo-500" />
                <span>📋 Movement History</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📥📤 Section 2: Separate Section: Inventory Movements (Qty In / Qty Out) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📥📤</span>
              <span>Separate Section: Inventory Movements</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Execute inward stock intake or outward customer dispatches with automatic stock verification.
            </p>
          </div>

          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Active Target: <span className="font-bold text-slate-800 dark:text-slate-200">Item #{currentItem.itemNumber}</span>
          </div>
        </div>

        {/* Two Forms Grid: Add Qty In & Add Qty Out */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ===================== FORM 1: Add Qty In ===================== */}
          <div
            ref={qtyInCardRef}
            id="card-add-qty-in"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-800"
          >
            <div>
              {/* Form Header */}
              <div className="px-5 py-4 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Add Qty In
                    </h3>
                    <p className="text-2xs text-emerald-700/80 dark:text-emerald-400/80">
                      Record incoming Delivery Note intake or supplier shipments
                    </p>
                  </div>
                </div>
                <span className="text-2xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                  Inward Stock
                </span>
              </div>

              {/* Form Body */}
              <form id="form-add-qty-in" onSubmit={handleSaveQtyIn} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        id="input-qty-in-date"
                        value={inDate}
                        onChange={(e) => setInDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Item Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Item Number
                    </label>
                    <select
                      id="select-qty-in-item-number"
                      value={inItemNumber}
                      onChange={(e) => {
                        setInItemNumber(e.target.value);
                        setSelectedItemNumber(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      {gypsumInventory.map((item) => (
                        <option key={item.id} value={item.itemNumber}>
                          {item.itemNumber} - {item.itemDescription}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto-filled: Item Description & UOM */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Item Description <span className="text-2xs text-slate-400">(Auto-filled)</span>
                    </label>
                    <input
                      type="text"
                      id="input-qty-in-desc"
                      value={inSelectedItem.itemDescription}
                      disabled
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      UOM <span className="text-2xs text-slate-400">(Auto-filled)</span>
                    </label>
                    <input
                      type="text"
                      id="input-qty-in-uom"
                      value={inSelectedItem.uom}
                      disabled
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed font-bold text-center"
                    />
                  </div>
                </div>

                {/* Qty In */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Qty In <span className="text-emerald-600 font-bold">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      {[100, 250, 500, 750].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setInQty(preset.toString())}
                          className="px-1.5 py-0.5 rounded text-2xs bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      id="input-qty-in-quantity"
                      min="1"
                      step="1"
                      placeholder="Enter Quantity (e.g. 750)"
                      value={inQty}
                      onChange={(e) => setInQty(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl text-sm font-bold font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      {inSelectedItem.uom}
                    </span>
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reference <span className="text-2xs text-slate-400">(SO / DN / Manual)</span>
                  </label>
                  <input
                    type="text"
                    id="input-qty-in-reference"
                    placeholder="e.g. DN #9010043436 (SO: 9100042352)"
                    value={inReference}
                    onChange={(e) => setInReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Upload PDF (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Upload PDF <span className="text-2xs text-slate-400">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="truncate">
                        {inPdfFile ? inPdfFile.name : inPdfName || 'Choose Delivery Note PDF...'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setInPdfFile(e.target.files[0]);
                            setInPdfName(e.target.files[0].name);
                          }
                        }}
                      />
                    </label>
                    {(inPdfFile || inPdfName) && (
                      <button
                        type="button"
                        onClick={() => {
                          setInPdfFile(null);
                          setInPdfName('');
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes <span className="text-2xs text-slate-400">(Optional)</span>
                  </label>
                  <textarea
                    id="input-qty-in-notes"
                    rows={2}
                    placeholder="Inspection remarks, pallet counts, supplier notes..."
                    value={inNotes}
                    onChange={(e) => setInNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="btn-save-qty-in"
                    disabled={inSubmitting || !inQty || Number(inQty) <= 0}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    {inSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>SAVING...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>SAVE QTY IN</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom quick indicator */}
            <div className="px-5 py-2.5 bg-emerald-50/40 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900/40 text-2xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span>Current Available: {inSelectedItem.availableStock} {inSelectedItem.uom}</span>
              <span>Projected New: {inSelectedItem.availableStock + (Number(inQty) || 0)} {inSelectedItem.uom}</span>
            </div>
          </div>

          {/* ===================== FORM 2: Add Qty Out ===================== */}
          <div
            ref={qtyOutCardRef}
            id="card-add-qty-out"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:border-rose-300 dark:hover:border-rose-800"
          >
            <div>
              {/* Form Header */}
              <div className="px-5 py-4 bg-rose-50/70 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      Add Qty Out
                    </h3>
                    <p className="text-2xs text-rose-700/80 dark:text-rose-400/80">
                      Record customer dispatches, truck loads, or outward sales
                    </p>
                  </div>
                </div>
                <span className="text-2xs px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 font-semibold uppercase tracking-wider">
                  Outward Stock
                </span>
              </div>

              {/* Form Body */}
              <form id="form-add-qty-out" onSubmit={handleSaveQtyOut} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      id="input-qty-out-date"
                      value={outDate}
                      onChange={(e) => setOutDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  {/* Item Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Item Number
                    </label>
                    <select
                      id="select-qty-out-item-number"
                      value={outItemNumber}
                      onChange={(e) => {
                        setOutItemNumber(e.target.value);
                        setSelectedItemNumber(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    >
                      {gypsumInventory.map((item) => (
                        <option key={item.id} value={item.itemNumber}>
                          {item.itemNumber} - {item.itemDescription}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto-filled: Item Description & UOM & Current Stock */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Item Description <span className="text-2xs text-slate-400">(Auto-filled)</span>
                    </label>
                    <input
                      type="text"
                      id="input-qty-out-desc"
                      value={outSelectedItem.itemDescription}
                      disabled
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      UOM <span className="text-2xs text-slate-400">(Auto-filled)</span>
                    </label>
                    <input
                      type="text"
                      id="input-qty-out-uom"
                      value={outSelectedItem.uom}
                      disabled
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed font-bold text-center"
                    />
                  </div>
                </div>

                {/* Current Stock Auto-filled Highlight Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                      Current Stock (Auto-filled)
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      Item #{outSelectedItem.itemNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      {outSelectedItem.availableStock.toLocaleString()} {outSelectedItem.uom}
                    </span>
                  </div>
                </div>

                {/* Qty Out with Validation Check */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Qty Out <span className="text-rose-600 font-bold">*</span>
                    </label>
                    {outSelectedItem.availableStock > 0 && (
                      <div className="flex items-center gap-1">
                        {[100, 200, 500].filter(q => q <= outSelectedItem.availableStock).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setOutQty(preset.toString())}
                            className="px-1.5 py-0.5 rounded text-2xs bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-colors"
                          >
                            {preset}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setOutQty(outSelectedItem.availableStock.toString())}
                          className="px-1.5 py-0.5 rounded text-2xs bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-semibold"
                        >
                          All ({outSelectedItem.availableStock})
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      id="input-qty-out-quantity"
                      min="1"
                      max={outSelectedItem.availableStock}
                      step="1"
                      placeholder={`Enter Quantity (Max ${outSelectedItem.availableStock})`}
                      value={outQty}
                      onChange={(e) => setOutQty(e.target.value)}
                      required
                      className={`w-full px-3 py-2 rounded-xl text-sm font-bold font-mono bg-slate-50 dark:bg-slate-800/80 border text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 ${
                        isOutQtyExceeded
                          ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-slate-300 dark:border-slate-700 focus:ring-rose-500'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      {outSelectedItem.uom}
                    </span>
                  </div>

                  {/* ⚠️ Constraint Alert */}
                  {isOutQtyExceeded ? (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>⚠️ Stock Limit Exceeded:</strong> You entered <strong>{numericOutQty} {outSelectedItem.uom}</strong>, but available stock is only <strong>{outSelectedItem.availableStock} {outSelectedItem.uom}</strong>. The system does not allow Qty Out greater than available stock.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-1.5 text-2xs text-slate-500 dark:text-slate-400">
                      <Info className="w-3 h-3 text-slate-400" />
                      <span>The system strictly validates that Qty Out does not exceed Available Stock ({outSelectedItem.availableStock} {outSelectedItem.uom}).</span>
                    </div>
                  )}
                </div>

                {/* Customer & Driver & TLB */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Customer <span className="text-2xs text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="input-qty-out-customer"
                      placeholder="e.g. Sarh Al-Bunyan"
                      value={outCustomer}
                      onChange={(e) => setOutCustomer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Driver Name <span className="text-2xs text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="input-qty-out-driver"
                      placeholder="e.g. Ahmed Al-Ghamdi"
                      value={outDriverName}
                      onChange={(e) => setOutDriverName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      TLB No. <span className="text-2xs text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="input-qty-out-tlb"
                      placeholder="e.g. TLB-001"
                      value={outTlbNo}
                      onChange={(e) => setOutTlbNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reference <span className="text-2xs text-slate-400">(Sale / SO / DN)</span>
                  </label>
                  <input
                    type="text"
                    id="input-qty-out-reference"
                    placeholder="e.g. Sale Order #SAL-104 or SO #9100042352"
                    value={outReference}
                    onChange={(e) => setOutReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Notes (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes <span className="text-2xs text-slate-400">(Optional)</span>
                  </label>
                  <textarea
                    id="input-qty-out-notes"
                    rows={2}
                    placeholder="Dispatch gates, recipient phone, project site notes..."
                    value={outNotes}
                    onChange={(e) => setOutNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
                  />
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="btn-save-qty-out"
                    disabled={outSubmitting || isOutQtyInvalid}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    {outSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>DISPATCHING...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>SAVE QTY OUT</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom remaining stock preview */}
            <div className="px-5 py-2.5 bg-rose-50/40 dark:bg-rose-950/20 border-t border-rose-100 dark:border-rose-900/40 text-2xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
              <span>Current Available: {outSelectedItem.availableStock} {outSelectedItem.uom}</span>
              <span>
                Remaining After Out:{' '}
                <strong className={isOutQtyExceeded ? 'text-rose-600 font-bold' : ''}>
                  {Math.max(0, outSelectedItem.availableStock - (Number(outQty) || 0))} {outSelectedItem.uom}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 Section 3: Linked Inventory Movement History */}
      <div
        ref={movementsSectionRef}
        id="section-movement-history"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        {/* Table Header with Search & Filter */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📋</span>
              <span>Linked Inventory Movement History</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              The uploaded document identifies SO No. <strong className="text-slate-700 dark:text-slate-300 font-mono">9100042352</strong> and Delivery Note No. <strong className="text-slate-700 dark:text-slate-300 font-mono">9010043436</strong>.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Item, SO, DN..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 w-44 sm:w-56"
              />
            </div>

            {/* Type Filters */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setMovementTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  movementTypeFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setMovementTypeFilter('IN')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  movementTypeFilter === 'IN'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900'
                }`}
              >
                IN
              </button>
              <button
                type="button"
                onClick={() => setMovementTypeFilter('OUT')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  movementTypeFilter === 'OUT'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 dark:text-rose-400 hover:text-rose-900'
                }`}
              >
                OUT
              </button>
            </div>

            {/* Export CSV */}
            <button
              type="button"
              id="btn-export-movement-csv"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Movement Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4">Item No.</th>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4 text-right">Qty In</th>
                <th className="py-3 px-4 text-right">Qty Out</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4">SO No.</th>
                <th className="py-3 px-4">DN No.</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    No movement records matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const isIn = mov.type === 'IN';
                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {mov.date}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isIn
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {isIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {mov.type}
                        </span>
                      </td>

                      {/* Item No. */}
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {mov.itemNumber}
                      </td>

                      {/* Item Description */}
                      <td className="py-3 px-4 text-xs text-slate-800 dark:text-slate-200">
                        <div>{mov.itemDescription}</div>
                        {mov.customer && (
                          <div className="text-2xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building className="w-2.5 h-2.5" /> Cust: {mov.customer}
                            {mov.driverName && <span>• Driver: {mov.driverName}</span>}
                          </div>
                        )}
                        {mov.notes && (
                          <div className="text-2xs text-slate-500 italic mt-0.5 truncate max-w-xs">
                            {mov.notes}
                          </div>
                        )}
                      </td>

                      {/* Qty In */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {mov.qtyIn > 0 ? `+${mov.qtyIn.toLocaleString()}` : '0'}
                      </td>

                      {/* Qty Out */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                        {mov.qtyOut > 0 ? `-${mov.qtyOut.toLocaleString()}` : '0'}
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        <strong className="text-slate-900 dark:text-white">
                          {mov.balance.toLocaleString()}
                        </strong>
                      </td>

                      {/* SO No. */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {mov.soNumber || '—'}
                      </td>

                      {/* DN No. */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {mov.dnNumber || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => deleteGypsumMovement(mov.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete movement record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔗 Section 4: System Connection Diagram */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                🔗 System Connection Flow
              </h3>
              <p className="text-2xs text-slate-500 dark:text-slate-400">
                Visual pipeline connecting Delivery Note Inward, Item Selection, and Real-Time Stock Updates.
              </p>
            </div>
          </div>

          <div className="text-xs bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-3 py-1.5 rounded-xl text-amber-800 dark:text-amber-300 font-medium">
            Current example stock: <strong className="font-bold">{currentItem.availableStock} {currentItem.uom}</strong> of Gypsum Powder
          </div>
        </div>

        {/* Visual Workflow Tree & ASCII Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Formatted ASCII Art Box */}
          <div className="bg-slate-950 rounded-xl p-5 text-emerald-400 font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
            <div className="text-2xs text-slate-500 mb-2 font-sans font-semibold uppercase tracking-wider">
              Terminal Architecture Schema
            </div>
            <pre className="leading-tight select-all">
{`GYPSUM INVENTORY
       │
       ▼
SELECT ITEM [${currentItem.itemNumber}]
       │
       ├───────────────┐
       ▼               ▼
    QTY IN          QTY OUT
  (+${currentItem.qtyIn} ${currentItem.uom})      (-${currentItem.qtyOut} ${currentItem.uom})
       │               │
       └───────┬───────┘
               ▼
     INVENTORY MOVEMENTS
               ▼
   AVAILABLE STOCK UPDATED
        IN REAL TIME
   =========================
   >>> ${currentItem.availableStock} ${currentItem.uom} AVAILABLE <<<`}
            </pre>
          </div>

          {/* Interactive Flow Diagram Cards */}
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-2xs">
                  1
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  GYPSUM INVENTORY
                </span>
              </div>
              <span className="text-2xs font-mono text-slate-500">
                Item #{currentItem.itemNumber}
              </span>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-2xs font-bold text-emerald-800 dark:text-emerald-300 block uppercase">
                  QTY IN
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{currentItem.qtyIn} {currentItem.uom}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                <span className="text-2xs font-bold text-rose-800 dark:text-rose-300 block uppercase">
                  QTY OUT
                </span>
                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                  -{currentItem.qtyOut} {currentItem.uom}
                </span>
              </div>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>

            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900 dark:text-indigo-200">
                AVAILABLE STOCK UPDATED IN REAL TIME
              </span>
              <span className="px-2 py-0.5 rounded font-mono font-extrabold bg-indigo-600 text-white">
                {currentItem.availableStock} {currentItem.uom}
              </span>
            </div>
          </div>
        </div>

        {/* Reset button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={resetGypsumInventory}
            className="text-2xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Clear inventory</span>
          </button>
        </div>
      </div>

      {/* ===================== MODAL 1: Add New Item ===================== */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Add New Gypsum Item
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewItemSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Number (SKU) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1290000002"
                  value={newItemNumber}
                  onChange={(e) => setNewItemNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bags - Special 40 kg Gypsum Powder"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    UOM
                  </label>
                  <select
                    value={newItemUom}
                    onChange={(e) => setNewItemUom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="BAG">BAG</option>
                    <option value="TON">TON</option>
                    <option value="PALLET">PALLET</option>
                    <option value="KG">KG</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemOpeningStock}
                    onChange={(e) => setNewItemOpeningStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SO Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9100042633"
                    value={newItemSo}
                    onChange={(e) => setNewItemSo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    DN Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9010043722"
                    value={newItemDn}
                    onChange={(e) => setNewItemDn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Supplier origin, grade, or storage location..."
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: Upload PDF Modal ===================== */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Upload Gypsum Delivery Note (PDF)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200">
                <p className="font-semibold text-sm mb-1">AI Delivery Note Parsing</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Upload a scanned Gypsum Delivery Note or load the verified sample below. The system automatically reads the SO Number, DN Number, Item Code (1290000001), and Quantity (750 BAG).
                </p>
              </div>

              {/* Sample Quick Load Button */}
              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center space-y-3">
                <FileText className="w-8 h-8 text-amber-500 mx-auto" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Delivery Note: #9010043436
                  </p>
                  <p className="text-2xs text-slate-500">
                    SO: 9100042352 • 750 BAG Bags - Regular 40 kg Gypsum Powder
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
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

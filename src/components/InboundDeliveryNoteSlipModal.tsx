import React, { useRef, useState } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  Package,
  Calendar,
  CheckCircle2,
  FileText,
  Truck,
  User,
  ShieldCheck,
  QrCode,
  Layers,
  ArrowRight,
  Eye,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InboundDeliveryNote } from '../types';
import { BarcodeRenderer, SlipBarcodePair } from './BarcodeRenderer';

interface InboundDeliveryNoteSlipModalProps {
  note: InboundDeliveryNote | null;
  onClose: () => void;
}

export const InboundDeliveryNoteSlipModal: React.FC<InboundDeliveryNoteSlipModalProps> = ({
  note,
  onClose,
}) => {
  const { language, companySettings } = useApp();
  const isAr = language === 'ar';
  const printRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'slip' | 'pdf_scan'>('slip');

  if (!note) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div
      id="inbound-dn-slip-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
    >
      <div
        id="inbound-dn-slip-modal-container"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isAr ? 'سند التسليم والمستند المرفق (Delivery Note & PDF)' : 'Delivery Note Document & Attached PDF'}
                </h3>
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  DN #{note.dnNumber}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                  note.inOutType === 'OUT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {note.inOutType === 'OUT' ? '🔴 OUT' : '🟢 IN'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {note.attachedPdfName ? `Attached PDF: ${note.attachedPdfName}` : 'Verified Inventory Entry Document'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex p-1 bg-slate-200 dark:bg-slate-700/60 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveView('slip')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeView === 'slip'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isAr ? 'سند التسليم' : 'DN Slip'}
              </button>
              <button
                onClick={() => setActiveView('pdf_scan')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeView === 'pdf_scan'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📄 {isAr ? 'عرض PDF الأصلي' : 'Original PDF'}
              </button>
            </div>

            <button
              id="print-dn-slip-btn"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {isAr ? 'طباعة' : 'Print'}
            </button>
            <button
              id="close-dn-slip-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode 1: Printable Delivery Note Slip Sheet */}
        {activeView === 'slip' && (
          <div ref={printRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            {/* Slip Header */}
            <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white uppercase">
                    {note.shipFrom || '—'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Industrial Area Logistics Hub • Saudi Arabia
                </p>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                  Salesman / Rep: <strong>{note.salesman || '—'}</strong>
                </p>
              </div>

              <div className="text-left sm:text-right">
                <div className="inline-block px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest rounded">
                  DELIVERY NOTE (DN)
                </div>
                <div className="mt-2 text-xs space-y-0.5">
                  <p>
                    <span className="text-slate-400">DN Number:</span>{' '}
                    <strong className="font-mono text-amber-600 dark:text-amber-400 text-sm">#{note.dnNumber}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">SO Number:</span>{' '}
                    <strong className="font-mono text-slate-800 dark:text-slate-200">#{note.soNumber}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Print / Issue Date:</span>{' '}
                    <strong className="font-mono">{note.printDate || note.orderDate}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Shipping Ref:</span>{' '}
                    <strong className="font-mono">{note.shippingRef || '750'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Customer / Consignee Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block mb-1">
                  Customer / Consignee (العميل المستلم)
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {note.companyName}
                </h4>
                <p className="text-slate-600 dark:text-slate-300 mt-1 font-mono">
                  Customer No.: <strong>{note.customerNumber}</strong>
                </p>
                <p className="text-slate-500 mt-0.5">
                  Destination / Site: {note.warehouseLocation || 'Main Logistics Depot'}
                </p>
              </div>

              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block mb-1">
                  Warehouse & Transport Details
                </span>
                <p className="text-slate-700 dark:text-slate-300">
                  Ship From: <strong>{note.shipFrom}</strong>
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  Driver: <strong>{note.driverName || '—'}</strong>
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  Dispatcher: <strong>{note.dispatcher || '—'}</strong>
                </p>
                <p className="text-slate-500 mt-0.5">
                  Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Verified {note.inOutType || 'IN'}</span>
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Item No. / SKU</th>
                    <th className="py-3 px-4">Product Description</th>
                    <th className="py-3 px-4 text-center">UOM</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-mono">01</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {note.itemNumber || '1290000001'}
                    </td>
                    <td className="py-3.5 px-4">
                      <strong className="block text-slate-900 dark:text-white font-semibold">
                        {note.productDescription || note.itemName}
                      </strong>
                      <span className="text-[11px] text-slate-500">{note.itemName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                        {note.uom || 'BAG'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {note.quantity}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                      Total Packages / Units Received:
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {note.quantity} {note.uom}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Official SO & DN Dual Barcode Slip Verification */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  <span>Official Scannable Document Barcodes (SO & DN Codes)</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">ISO/IEC 15417 Code 128</span>
              </div>
              <SlipBarcodePair
                soNumber={note.soNumber}
                dnNumber={note.dnNumber}
                itemSku={note.itemNumber}
              />
            </div>

            {/* Signatures & Verification Block */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">
                  Dispatched By / Plant Storekeeper
                </span>
                <div className="h-10 flex items-end">
                  <span className="font-serif italic text-sm text-slate-700 dark:text-slate-300">
                    {note.salesman || '—'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Authorized Plant Dispatch Stamp</p>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">
                  Received & Verified By (مستلم المستودع)
                </span>
                <div className="h-10 flex items-end">
                  <span className="font-serif italic text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                    {note.receiverSignature || '—'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Inward Goods Inspection Passed</p>
              </div>
            </div>
          </div>
        )}

        {/* View Mode 2: Original PDF Document Scan Simulation */}
        {activeView === 'pdf_scan' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 flex flex-col items-center">
            <div className="w-full max-w-2xl bg-white text-slate-900 shadow-2xl rounded-lg p-8 border border-slate-300 space-y-5 font-sans relative">
              {/* Plant Stamp Watermark */}
              <div className="absolute top-12 right-12 opacity-85 pointer-events-none transform rotate-12 border-2 border-emerald-600 rounded-lg p-2 text-center text-emerald-700">
                <p className="text-[10px] font-black uppercase tracking-widest">INWARD RECEIVED</p>
                <p className="text-[9px] font-mono">{note.printDate || '2026-08-13'}</p>
                <p className="text-[8px] font-bold">LOGIFLOW WAREHOUSE</p>
              </div>

              {/* PDF Document Header */}
              <div className="border-b-2 border-slate-800 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                      {note.shipFrom || 'EL-KHAYYAT GYPSUM PLANT'}
                    </h2>
                    <p className="text-xs text-slate-600">Al-Kharj Industrial City • Riyadh Zone</p>
                    <p className="text-xs text-slate-600">VAT Reg: 300928172900003</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded uppercase">
                      DELIVERY NOTE
                    </span>
                    <p className="font-mono text-sm font-bold text-amber-700 mt-1">DN #{note.dnNumber}</p>
                    <p className="font-mono text-xs text-slate-500">SO #{note.soNumber}</p>
                  </div>
                </div>
              </div>

              {/* PDF Metadata Fields */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded border border-slate-200">
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Customer / Consignee:</p>
                  <p className="font-bold text-slate-900 text-sm">{note.companyName}</p>
                  <p className="font-mono text-slate-700">Cust No: <strong>{note.customerNumber}</strong></p>
                  <p className="text-slate-600 mt-1">Destination: {note.warehouseLocation}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Document Info:</p>
                  <p className="font-mono text-slate-700">Date: <strong>{note.printDate || note.orderDate}</strong></p>
                  <p className="font-mono text-slate-700">Shipping Ref: <strong>{note.shippingRef || '750'}</strong></p>
                  <p className="text-slate-700">Salesman: <strong>{note.salesman}</strong></p>
                  <p className="text-slate-700">Driver: <strong>{note.driverName || '—'}</strong></p>
                </div>
              </div>

              {/* Items Table in PDF */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-300">
                    <tr>
                      <th className="p-2 text-left">Item No.</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-center">UOM</th>
                      <th className="p-2 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 font-mono font-bold text-amber-800">{note.itemNumber || '1290000001'}</td>
                      <td className="p-2 font-semibold text-slate-900">{note.productDescription || note.itemName}</td>
                      <td className="p-2 text-center font-mono">{note.uom || 'BAG'}</td>
                      <td className="p-2 text-right font-mono font-black text-sm text-slate-900">{note.quantity}</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={3} className="p-2 text-right">Total Net Quantity:</td>
                      <td className="p-2 text-right font-black text-sm">{note.quantity} {note.uom}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Barcode & Signature */}
              <div className="pt-4 border-t border-slate-200 text-xs space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <BarcodeRenderer
                    value={note.soNumber || '9100042352'}
                    type="SO"
                    title="SO Barcode"
                    height={38}
                    moduleWidth={1.6}
                    showCopy={false}
                  />
                  <BarcodeRenderer
                    value={note.dnNumber}
                    type="DN"
                    title="DN Barcode"
                    height={38}
                    moduleWidth={1.6}
                    showCopy={false}
                  />
                </div>

                <div className="flex justify-between items-end pt-1">
                  <div className="text-[10px] text-slate-500 font-mono">
                    Official Logistics Transport Document • Dual Code-128 Scan Enabled
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Verified Receiver Stamp</p>
                    <p className="font-serif italic font-bold text-slate-900 text-sm mt-0.5">{note.receiverSignature || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

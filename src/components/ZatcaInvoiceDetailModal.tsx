import React, { useState, useEffect } from 'react';
import { TaxInvoice } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/i18n';
import { generateQrDataUrl, generateZatcaUblXml, decodeZatcaTlvBase64 } from '../utils/zatca';
import {
  X,
  Printer,
  FileCode,
  QrCode,
  CheckCircle2,
  Building2,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  Download,
  CreditCard,
  Truck,
  User
} from 'lucide-react';

interface ZatcaInvoiceDetailModalProps {
  invoice: TaxInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onPay?: (invoice: TaxInvoice) => void;
}

export const ZatcaInvoiceDetailModal: React.FC<ZatcaInvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onPay,
}) => {
  const { companySettings, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'invoice' | 'xml' | 'tlv'>('invoice');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (invoice) {
      const payload = invoice.zatcaQrPayload || invoice.qrPayload || '';
      if (payload) {
        generateQrDataUrl(payload).then((url) => setQrDataUrl(url));
      }
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const ublXml = generateZatcaUblXml({
    invoiceNumber: invoice.invoiceNumber,
    uuid: invoice.invoiceUuid || invoice.zatcaUuid || `INV-UUID-${invoice.id}`,
    issueDate: invoice.issueDate || invoice.invoiceDate || new Date().toISOString().split('T')[0],
    issueTime: invoice.issueTime || '10:00:00',
    sellerName: invoice.sellerName || companySettings.companyName,
    sellerVat: invoice.sellerVatNumber || companySettings.vatNumber,
    sellerCr: invoice.sellerCrNumber || companySettings.crNumber,
    buyerName: invoice.customerName || invoice.buyerName,
    buyerVat: invoice.buyerVatNumber || '300000000000003',
    subtotal: invoice.subtotal,
    totalVat: invoice.totalVat || invoice.vatAmount || 0,
    grandTotal: invoice.grandTotal || invoice.totalAmount || 0,
    currency: invoice.currency || 'SAR',
  });

  const decodedTlv = invoice.zatcaQrPayload || invoice.qrPayload ? decodeZatcaTlvBase64(invoice.zatcaQrPayload || invoice.qrPayload!) : null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyXml = () => {
    navigator.clipboard.writeText(ublXml);
    setCopied(true);
    showToast('XML Copied', 'ZATCA UBL 2.1 invoice XML copied to clipboard.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadXml = () => {
    const blob = new Blob([ublXml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNumber}_ZATCA_UBL2.1.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPaid = invoice.paymentStatus === 'paid' || invoice.isPaid;
  const isPartial = invoice.paymentStatus === 'partial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto print:shadow-none print:border-none print:max-w-none print:w-full print:rounded-none print:max-h-none">
        {/* Top Action Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/20">
                  {invoice.invoiceType === 'simplified_b2c' ? 'SIMPLIFIED TAX INVOICE' : 'STANDARD TAX INVOICE (B2B)'}
                </span>
                <span className="text-xs text-slate-300">ZATCA Compliant</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white mt-0.5">
                Invoice {invoice.invoiceNumber}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPaid && onPay && (
              <button
                onClick={() => onPay(invoice)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Settle Payment</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 print:hidden">
          <button
            onClick={() => setActiveTab('invoice')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'invoice'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 dark:border-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Official Invoice View</span>
          </button>
          <button
            onClick={() => setActiveTab('xml')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'xml'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 dark:border-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>ZATCA UBL 2.1 XML</span>
          </button>
          <button
            onClick={() => setActiveTab('tlv')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'tlv'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 dark:border-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>TLV Tag Inspector</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 print:p-4 print:overflow-visible">
          {activeTab === 'invoice' && (
            <div className="space-y-6 font-sans">
              {/* Workflow Pill Bar */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Connected Workflow:</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-300 overflow-x-auto">
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">
                    Customer: {invoice.customerName || invoice.buyerName}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">
                    DN: {invoice.dnNumber || invoice.tripNumber || 'N/A'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">
                    Driver: {invoice.driverName || 'Ahmed'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">
                    Truck: {invoice.truckNo || invoice.vehiclePlate || 'TR-101'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className={`px-2 py-0.5 rounded-md font-bold ${
                    isPaid ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}>
                    {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                  </span>
                </div>
              </div>

              {/* Invoice Layout Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      {companySettings.companyName}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                    {companySettings.companyNameAr}
                  </p>
                  <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                    <p>VAT Reg No: <strong className="font-mono text-slate-800 dark:text-slate-200">{companySettings.vatNumber}</strong></p>
                    <p>CR No: <strong className="font-mono text-slate-800 dark:text-slate-200">{companySettings.crNumber}</strong></p>
                    <p>{companySettings.address}, {companySettings.city}, {companySettings.country}</p>
                    <p>Email: {companySettings.email} | Phone: {companySettings.phone}</p>
                  </div>
                </div>

                {/* QR Code and Invoice Metadata */}
                <div className="flex sm:flex-col items-center sm:items-end gap-4">
                  {qrDataUrl ? (
                    <div className="p-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
                      <img src={qrDataUrl} alt="ZATCA Compliant QR" className="w-28 h-28 object-contain" />
                      <span className="text-[9px] font-mono font-bold text-slate-500 mt-1">ZATCA QR VERIFIED</span>
                    </div>
                  ) : (
                    <div className="w-28 h-28 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                      <QrCode className="w-8 h-8" />
                    </div>
                  )}
                  <div className="text-left sm:text-right space-y-0.5 text-xs">
                    <p className="text-slate-500">Invoice No: <strong className="text-slate-900 dark:text-white font-mono text-sm">{invoice.invoiceNumber}</strong></p>
                    <p className="text-slate-500">Date: <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatDate(invoice.issueDate || invoice.invoiceDate || '')}</strong></p>
                    <p className="text-slate-500">Payment Terms: <strong className="text-slate-800 dark:text-slate-200">{invoice.paymentTerms || 'Net 30'}</strong></p>
                  </div>
                </div>
              </div>

              {/* Bill To & Freight Logistics Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">BILL TO / CUSTOMER</span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">{invoice.customerName || invoice.buyerName}</h4>
                  <p className="text-slate-600 dark:text-slate-300">{invoice.buyerAddress || 'Kingdom of Saudi Arabia'}</p>
                  <p className="text-slate-500">Customer VAT: <strong className="font-mono text-slate-800 dark:text-slate-200">{invoice.buyerVatNumber || '300000000000003'}</strong></p>
                  {invoice.buyerPhone && <p className="text-slate-500">Contact: {invoice.buyerPhone}</p>}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">FREIGHT HAULAGE / LOAD DETAILS</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DN / Load Ref:</span>
                    <strong className="font-mono text-slate-900 dark:text-white">{invoice.dnNumber || invoice.tripNumber || 'DN-10025'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Route & Transit:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{invoice.pickupLocation || 'Jeddah'} → {invoice.dropLocation || 'Riyadh'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Driver & Truck:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{invoice.driverName || 'Ahmed'} ({invoice.truckNo || invoice.vehiclePlate || 'TR-102'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service / Commodity:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{invoice.productService || 'Freight Haulage'}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Description / Service</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Discount</th>
                      <th className="py-3 px-4 text-center">VAT %</th>
                      <th className="py-3.5 px-4 text-right">VAT Amount</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {invoice.items?.map((item, idx) => {
                      const itemVatPercent = item.vatRate !== undefined ? Math.round(item.vatRate * 100) : 15;
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white max-w-xs">{item.description}</td>
                          <td className="py-3 px-4 text-center font-mono">{item.quantity}</td>
                          <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-3 px-4 text-right font-mono">
                            {item.discount > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">-{formatCurrency(item.discount)}</span>
                            ) : (
                              <span className="text-slate-400">0.00</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                              {itemVatPercent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{formatCurrency(item.vatAmount)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(item.totalWithVat)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Monetary Totals Block */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1 text-xs text-slate-500 max-w-sm">
                  <p><strong>Payment Instructions:</strong></p>
                  <p>Bank: Al Rajhi Bank (Corporate Branch)</p>
                  <p>IBAN: SA03 8000 0000 6080 1019 2831</p>
                  {invoice.notes && <p className="pt-2 text-slate-600 dark:text-slate-400 italic">{invoice.notes}</p>}
                </div>

                <div className="w-full sm:w-80 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-medium">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.discountTotal > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400">
                      <span>Total Discount:</span>
                      <span className="font-mono">- {formatCurrency(invoice.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold">
                    <span>Total VAT (15%):</span>
                    <span className="font-mono">{formatCurrency(invoice.totalVat || invoice.vatAmount || 0)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-300 dark:border-slate-700 flex justify-between text-base font-black text-slate-900 dark:text-white">
                    <span>Grand Total:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(invoice.grandTotal || invoice.totalAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pt-1">
                    <span>Settled / Paid:</span>
                    <span className="font-mono font-semibold text-emerald-600">{formatCurrency(invoice.paidAmount || (isPaid ? invoice.grandTotal : 0))}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Outstanding Due:</span>
                    <span className="font-mono font-bold text-rose-600">{formatCurrency(invoice.outstandingAmount ?? (isPaid ? 0 : invoice.grandTotal))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ZATCA UBL XML Tab */}
          {activeTab === 'xml' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl">
                <span className="text-slate-600 dark:text-slate-300 font-bold">Standard ZATCA UBL 2.1 Schema Payload</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyXml}
                    className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold flex items-center gap-1 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy XML'}</span>
                  </button>
                  <button
                    onClick={handleDownloadXml}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold flex items-center gap-1 hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download XML</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl overflow-x-auto max-h-96 text-[11px] leading-relaxed border border-slate-800">
                {ublXml}
              </pre>
            </div>
          )}

          {/* TLV Tag Inspector Tab */}
          {activeTab === 'tlv' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Base64 TLV Representation:</h4>
                <p className="p-3 bg-white dark:bg-slate-900 rounded-xl font-mono text-xs text-indigo-600 dark:text-indigo-400 break-all border border-slate-200 dark:border-slate-800">
                  {invoice.zatcaQrPayload || invoice.qrPayload || 'No QR Payload Available'}
                </p>
              </div>

              {decodedTlv && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="py-2.5 px-4">Tag</th>
                        <th className="py-2.5 px-4 font-sans">Field Meaning</th>
                        <th className="py-2.5 px-4">Declared Length</th>
                        <th className="py-2.5 px-4">Decoded Content</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {decodedTlv.tags.map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 text-indigo-600 dark:text-indigo-400 font-bold">{t.tag}</td>
                          <td className="py-2.5 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">{t.tagMeaning}</td>
                          <td className="py-2.5 px-4 text-slate-500">{t.length} Bytes</td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{t.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 print:hidden">
          <span className="text-xs text-slate-500">
            ZATCA Electronic Invoicing (Fatoora Phase 1 & 2)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TaxInvoice, InvoiceItem, InvoiceType, InvoicePaymentStatus } from '../types';
import { formatCurrency } from '../utils/i18n';
import { generateZatcaTlvBase64, generateQrDataUrl } from '../utils/zatca';
import {
  X,
  Plus,
  Trash2,
  QrCode,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  Sparkles,
  DollarSign
} from 'lucide-react';

interface ZatcaAddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvoice?: TaxInvoice | null; // For editing mode
}

export const ZatcaAddInvoiceModal: React.FC<ZatcaAddInvoiceModalProps> = ({
  isOpen,
  onClose,
  initialInvoice,
}) => {
  const { customers, companySettings, createCustomTaxInvoice, updateTaxInvoice, showToast } = useApp();

  const isEdit = Boolean(initialInvoice);

  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('tax_invoice_b2b');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30');
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>('unpaid');
  const [paidAmountInput, setPaidAmountInput] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerVatNumber, setBuyerVatNumber] = useState<string>('300881928300003');
  const [buyerAddress, setBuyerAddress] = useState<string>('King Abdulaziz Road, Jeddah');
  const [buyerPhone, setBuyerPhone] = useState<string>('+966 55 440 2901');

  // Freight & Load context
  const [dnNumber, setDnNumber] = useState<string>('DN-10025');
  const [pickupLocation, setPickupLocation] = useState<string>('Jeddah Warehouse');
  const [dropLocation, setDropLocation] = useState<string>('Riyadh');
  const [driverName, setDriverName] = useState<string>('Ahmed');
  const [truckNo, setTruckNo] = useState<string>('TR-102');

  // Product Line Items state
  const [productService, setProductService] = useState<string>('Heavy Commercial Freight - TLB Bulk Gypsum Transport');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(4347.83);
  const [discount, setDiscount] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(0.15);

  const [previewQr, setPreviewQr] = useState<string>('');

  // Calculations
  const taxableAmount = Math.max(0, quantity * unitPrice - discount);
  const vatAmount = taxableAmount * vatRate;
  const grandTotal = taxableAmount + vatAmount;

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      if (initialInvoice) {
        setInvoiceNumber(initialInvoice.invoiceNumber);
        setInvoiceDate(initialInvoice.issueDate || initialInvoice.invoiceDate || new Date().toISOString().split('T')[0]);
        setInvoiceType(initialInvoice.invoiceType || 'tax_invoice_b2b');
        setPaymentTerms(initialInvoice.paymentTerms || 'Net 30');
        setPaymentStatus(initialInvoice.paymentStatus || (initialInvoice.isPaid ? 'paid' : 'unpaid'));
        setPaidAmountInput(initialInvoice.paidAmount || (initialInvoice.isPaid ? initialInvoice.grandTotal : 0));
        setSelectedCustomerId(initialInvoice.customerId || '');
        setBuyerName(initialInvoice.customerName || initialInvoice.buyerName || '');
        setBuyerVatNumber(initialInvoice.buyerVatNumber || '300881928300003');
        setBuyerAddress(initialInvoice.buyerAddress || '');
        setBuyerPhone(initialInvoice.buyerPhone || '');
        setDnNumber(initialInvoice.dnNumber || '');
        setPickupLocation(initialInvoice.pickupLocation || '');
        setDropLocation(initialInvoice.dropLocation || '');
        setDriverName(initialInvoice.driverName || '');
        setTruckNo(initialInvoice.truckNo || '');
        setNotes(initialInvoice.notes || '');

        const item = initialInvoice.items?.[0];
        if (item) {
          setProductService(item.description || initialInvoice.productService || '');
          setQuantity(item.quantity || 1);
          setUnitPrice(item.unitPrice || 0);
          setDiscount(item.discount || initialInvoice.discountTotal || 0);
          setVatRate(item.vatRate ?? 0.15);
        }
      } else {
        const dateStr = new Date().toISOString().split('T')[0];
        setInvoiceNumber('INV-' + dateStr.replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900));
        setInvoiceDate(dateStr);
        setPaymentStatus('unpaid');
        setPaidAmountInput(0);
        if (customers.length > 0) {
          const c = customers[0];
          setSelectedCustomerId(c.id);
          setBuyerName(c.name);
          setBuyerVatNumber(c.vatNumber || '300881928300003');
          setBuyerAddress(c.address || 'Saudi Arabia');
          setBuyerPhone(c.phone || '—');
        }
      }
    }
  }, [isOpen, initialInvoice, customers]);

  // Generate live ZATCA QR preview
  useEffect(() => {
    if (buyerName && grandTotal > 0) {
      const payload = generateZatcaTlvBase64(
        companySettings.companyName,
        companySettings.vatNumber,
        new Date().toISOString(),
        grandTotal,
        vatAmount
      );
      generateQrDataUrl(payload).then((url) => setPreviewQr(url));
    }
  }, [buyerName, grandTotal, vatAmount, companySettings]);

  if (!isOpen) return null;

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setBuyerName(found.name);
      setBuyerVatNumber(found.vatNumber || '300881928300003');
      setBuyerAddress(found.address || 'Kingdom of Saudi Arabia');
      setBuyerPhone(found.phone || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceNumber.trim()) {
      showToast('Validation Error', 'Invoice number is required.', 'warning');
      return;
    }
    if (!buyerName.trim()) {
      showToast('Validation Error', 'Customer / Buyer Name is required.', 'warning');
      return;
    }
    if (quantity <= 0 || unitPrice < 0) {
      showToast('Validation Error', 'Quantity and unit price must be positive numbers.', 'warning');
      return;
    }

    const items: InvoiceItem[] = [
      {
        id: '1',
        description: productService.trim(),
        quantity,
        unitPrice,
        discount,
        taxableAmount,
        vatRate,
        vatAmount,
        totalWithVat: grandTotal,
      },
    ];

    const actualPaid = paymentStatus === 'paid' ? grandTotal : paymentStatus === 'partial' ? paidAmountInput : 0;
    const actualOutstanding = Math.max(0, grandTotal - actualPaid);

    const qrPayload = generateZatcaTlvBase64(
      companySettings.companyName,
      companySettings.vatNumber,
      new Date().toISOString(),
      grandTotal,
      vatAmount
    );

    if (isEdit && initialInvoice) {
      updateTaxInvoice(initialInvoice.id, {
        invoiceNumber: invoiceNumber.trim(),
        issueDate: invoiceDate,
        invoiceDate: invoiceDate,
        invoiceType,
        customerId: selectedCustomerId || undefined,
        customerName: buyerName.trim(),
        buyerName: buyerName.trim(),
        buyerVatNumber: buyerVatNumber.trim(),
        buyerAddress: buyerAddress.trim(),
        buyerPhone: buyerPhone.trim(),
        dnNumber: dnNumber.trim(),
        pickupLocation: pickupLocation.trim(),
        dropLocation: dropLocation.trim(),
        driverName: driverName.trim(),
        truckNo: truckNo.trim(),
        productService: productService.trim(),
        quantity,
        items,
        subtotal: taxableAmount,
        discountTotal: discount,
        totalVat: vatAmount,
        vatAmount: vatAmount,
        grandTotal,
        totalAmount: grandTotal,
        paymentStatus,
        isPaid: paymentStatus === 'paid',
        paidAmount: actualPaid,
        outstandingAmount: actualOutstanding,
        paymentTerms,
        notes: notes.trim(),
        zatcaQrPayload: qrPayload,
        qrPayload,
      }, 'Invoice details updated via ZATCA Editor');
    } else {
      createCustomTaxInvoice({
        invoiceNumber: invoiceNumber.trim(),
        issueDate: invoiceDate,
        invoiceDate: invoiceDate,
        invoiceType,
        customerId: selectedCustomerId || undefined,
        customerName: buyerName.trim(),
        buyerName: buyerName.trim(),
        buyerVatNumber: buyerVatNumber.trim(),
        buyerAddress: buyerAddress.trim(),
        buyerPhone: buyerPhone.trim(),
        dnNumber: dnNumber.trim(),
        pickupLocation: pickupLocation.trim(),
        dropLocation: dropLocation.trim(),
        driverName: driverName.trim(),
        truckNo: truckNo.trim(),
        productService: productService.trim(),
        quantity,
        items,
        subtotal: taxableAmount,
        discountTotal: discount,
        totalVat: vatAmount,
        vatAmount: vatAmount,
        grandTotal,
        totalAmount: grandTotal,
        paymentStatus,
        isPaid: paymentStatus === 'paid',
        paidAmount: actualPaid,
        outstandingAmount: actualOutstanding,
        paymentTerms,
        notes: notes.trim(),
        zatcaQrPayload: qrPayload,
        qrPayload,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/20">
                  {isEdit ? 'EDIT INVOICE' : 'NEW ZATCA INVOICE'}
                </span>
                <span className="text-xs text-slate-300">Fatoora Phase 1 & 2</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white mt-0.5">
                {isEdit ? `Edit Invoice ${invoiceNumber}` : 'Create Electronic Tax Invoice'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Meta: Invoice Number, Date, Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Invoice No. *
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Type
              </label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="tax_invoice_b2b">Standard Tax Invoice (B2B)</option>
                <option value="simplified_b2c">Simplified Tax Invoice (B2C)</option>
              </select>
            </div>
          </div>

          {/* Customer Selection & Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Customer / Buyer Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Select Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- Custom / One-time Client --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Customer / Company Name *
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  required
                  placeholder="e.g. ABC Trading Co."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Buyer VAT Number (15 Digits)
                </label>
                <input
                  type="text"
                  value={buyerVatNumber}
                  onChange={(e) => setBuyerVatNumber(e.target.value)}
                  placeholder="300XXXXXXXXXXXX"
                  maxLength={15}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Buyer Address & Phone
                </label>
                <input
                  type="text"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="City, District, KSA"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Workflow & Freight Links */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Freight Haulage Workflow Connection (Optional)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500">DN / Load No.</label>
                <input
                  type="text"
                  value={dnNumber}
                  onChange={(e) => setDnNumber(e.target.value)}
                  placeholder="DN-10025"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Pickup Origin</label>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="Jeddah"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Drop Destination</label>
                <input
                  type="text"
                  value={dropLocation}
                  onChange={(e) => setDropLocation(e.target.value)}
                  placeholder="Riyadh"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Driver Name</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Ahmed"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Truck No.</label>
                <input
                  type="text"
                  value={truckNo}
                  onChange={(e) => setTruckNo(e.target.value)}
                  placeholder="TR-102"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Product / Service & Financial Line Item */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>Product / Service Item & Pricing Breakdown</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Product / Service Description *
                </label>
                <input
                  type="text"
                  value={productService}
                  onChange={(e) => setProductService(e.target.value)}
                  required
                  placeholder="e.g. Heavy Commercial Freight - Jeddah to Riyadh"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Unit Price (SAR) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Discount (SAR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  VAT %
                </label>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value={0.15}>15% Standard</option>
                  <option value={0.0}>0% Zero-Rated</option>
                  <option value={0.0}>Exempt</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Status & Totals Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Status *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['unpaid', 'partial', 'paid'] as InvoicePaymentStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setPaymentStatus(status)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        paymentStatus === status
                          ? status === 'paid'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : status === 'partial'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-rose-600 text-white shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {paymentStatus === 'partial' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Initial Paid Amount (SAR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      step="any"
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g. Net 30 Days"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Summary & QR Preview */}
            <div className="p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-6 text-slate-300">
                    <span>Taxable Subtotal:</span>
                    <strong className="font-mono">{formatCurrency(taxableAmount)}</strong>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between gap-6 text-rose-400">
                      <span>Discount:</span>
                      <strong className="font-mono">- {formatCurrency(discount)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between gap-6 text-indigo-300 font-semibold">
                    <span>VAT Amount ({(vatRate * 100).toFixed(0)}%):</span>
                    <strong className="font-mono">{formatCurrency(vatAmount)}</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-700 flex justify-between gap-6 text-base font-black text-white">
                    <span>Grand Total:</span>
                    <strong className="font-mono text-emerald-400">{formatCurrency(grandTotal)}</strong>
                  </div>
                </div>

                {previewQr && (
                  <div className="p-1.5 bg-white rounded-xl shadow-xs shrink-0 flex flex-col items-center">
                    <img src={previewQr} alt="QR Preview" className="w-20 h-20 object-contain" />
                    <span className="text-[8px] font-mono font-bold text-slate-800">ZATCA QR</span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ZATCA TLV tags generated live and ready for clearance.</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Internal Invoicing Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved under master logistics contract 2026."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEdit ? 'Save Changes' : 'Issue Tax Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

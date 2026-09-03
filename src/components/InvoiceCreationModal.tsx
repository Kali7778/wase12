import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trip, Customer, TaxInvoice } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  X,
  Plus,
  Receipt,
  Truck,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';

interface InvoiceCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTrip?: Trip | null;
  defaultCustomer?: Customer | null;
}

export const InvoiceCreationModal: React.FC<InvoiceCreationModalProps> = ({
  isOpen,
  onClose,
  defaultTrip,
  defaultCustomer,
}) => {
  const {
    customers,
    trips,
    createCustomTaxInvoice,
    createTaxInvoiceFromTrip,
    setSelectedInvoice,
    showToast
  } = useApp();

  const [creationMode, setCreationMode] = useState<'from_trip' | 'custom_invoice'>(
    defaultTrip ? 'from_trip' : 'from_trip'
  );

  // Mode 1: From Trip / DN
  const [selectedTripId, setSelectedTripId] = useState<string>(defaultTrip?.id || trips[0]?.id || '');
  const [invoiceType, setInvoiceType] = useState<'tax_invoice_b2b' | 'simplified_b2c'>('tax_invoice_b2b');

  // Mode 2: Custom Invoicing
  const [customerId, setCustomerId] = useState<string>(
    defaultCustomer?.id || customers[0]?.id || ''
  );
  const [itemDescription, setItemDescription] = useState<string>(
    'Full Truckload Haulage Freight (Rabigh Refinery ⇄ Riyadh Central Logistics Depot)'
  );
  const [unitRate, setUnitRate] = useState<number>(4500);
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30 Days');
  const [dnNumber, setDnNumber] = useState<string>(`DN-${Math.floor(10000 + Math.random() * 90000)}`);
  const [pickupLocation, setPickupLocation] = useState<string>('Jeddah Port Cargo Terminal');
  const [dropLocation, setDropLocation] = useState<string>('Riyadh Dry Port Logistic Hub');
  const [driverName, setDriverName] = useState<string>('Ahmed Al-Ghamdi');
  const [truckNo, setTruckNo] = useState<string>('TRK-001 (Volvo FH16)');
  const [initialPaymentStatus, setInitialPaymentStatus] = useState<'unpaid' | 'paid' | 'partial'>('unpaid');
  const [initialPaidAmount, setInitialPaidAmount] = useState<number>(0);

  if (!isOpen) return null;

  const handleCreateFromTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) {
      showToast('Select Trip', 'Please select an operational trip to generate an invoice.', 'warning');
      return;
    }
    const inv = createTaxInvoiceFromTrip(selectedTripId, invoiceType);
    if (inv) {
      onClose();
      setSelectedInvoice(inv);
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === customerId) || customers[0];
    if (!cust) {
      showToast('Missing Customer', 'Please select a customer account.', 'warning');
      return;
    }

    const totalCalculated = Number(unitRate) * Number(quantity);
    const paid = initialPaymentStatus === 'paid' ? totalCalculated : initialPaymentStatus === 'partial' ? Number(initialPaidAmount) : 0;
    const outstanding = Math.max(0, totalCalculated - paid);

    const inv = createCustomTaxInvoice({
      invoiceType,
      customerId: cust.id,
      customerName: cust.name,
      customerNameAr: cust.nameAr || cust.name,
      customerVatNumber: cust.vatNumber || '',
      customerCrNumber: cust.crNumber || '',
      customerAddress: cust.address || `${cust.city}, Saudi Arabia`,
      buyerName: cust.name,
      buyerNameAr: cust.nameAr || cust.name,
      buyerVatNumber: cust.vatNumber || '',
      buyerCrNumber: cust.crNumber || '',
      buyerAddress: cust.address || `${cust.city}, Saudi Arabia`,
      dnNumber: dnNumber.trim(),
      pickupLocation: pickupLocation.trim(),
      dropLocation: dropLocation.trim(),
      driverName: driverName.trim(),
      truckNo: truckNo.trim(),
      productService: itemDescription.trim(),
      paymentStatus: initialPaymentStatus,
      paidAmount: paid,
      outstandingAmount: outstanding,
      isPaid: initialPaymentStatus === 'paid',
      subtotal: totalCalculated,
      vatAmount: 0,
      totalVat: 0,
      totalAmount: totalCalculated,
      grandTotal: totalCalculated,
      vatRate: 0,
      items: [
        {
          id: `item-${Date.now()}`,
          description: itemDescription.trim(),
          descriptionAr: itemDescription.trim(),
          quantity: Number(quantity),
          unitPrice: Number(unitRate),
          discount: 0,
          taxableAmount: totalCalculated,
          vatRate: 0,
          vatAmount: 0,
          subtotal: totalCalculated,
          total: totalCalculated,
          totalWithVat: totalCalculated,
          itemCode: 'SRV-FREIGHT-01',
        },
      ],
    });

    onClose();
    setSelectedInvoice(inv);
  };

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  return (
    <div
      id="invoice-creation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl my-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Create & Issue Invoice
              </h3>
              <p className="text-xs text-slate-500">
                Connect Customer → Load → DN → Driver → Truck → Route → Delivery → Invoice → Payment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCreationMode('from_trip')}
            className={`py-2.5 px-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs border transition-all cursor-pointer ${
              creationMode === 'from_trip'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Generate from Delivery Note / Trip</span>
          </button>

          <button
            type="button"
            onClick={() => setCreationMode('custom_invoice')}
            className={`py-2.5 px-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs border transition-all cursor-pointer ${
              creationMode === 'custom_invoice'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Custom Invoice (Manual)</span>
          </button>
        </div>

        {/* MODE 1: FROM TRIP */}
        {creationMode === 'from_trip' && (
          <form onSubmit={handleCreateFromTrip} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                Select Operational Trip / Delivery Note
              </label>
              <select
                value={selectedTripId ?? ""}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.deliveryNoteNumber || t.tripNumber} — {t.companyName} ({t.originCity} → {t.destinationCity}) | Driver: {t.driverName} ({formatCurrency(t.driverFare || 4500)})
                  </option>
                ))}
              </select>
            </div>

            {selectedTrip && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-2.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Linked Workflow Details</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {selectedTrip.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div><strong>Customer:</strong> {selectedTrip.companyName}</div>
                  <div><strong>DN No:</strong> {selectedTrip.deliveryNoteNumber || selectedTrip.tripNumber}</div>
                  <div><strong>Route:</strong> {selectedTrip.originCity} → {selectedTrip.destinationCity}</div>
                  <div><strong>Driver & Truck:</strong> {selectedTrip.driverName} ({selectedTrip.truckNumber})</div>
                  <div><strong>Cargo:</strong> {selectedTrip.cargoType} ({selectedTrip.cargoWeightTons} Tons)</div>
                  <div><strong>Invoice Amount:</strong> {formatCurrency(selectedTrip.driverFare || 4500)}</div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Create Invoice</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: CUSTOM MANUAL INVOICE */}
        {creationMode === 'custom_invoice' && (
          <form onSubmit={handleCreateCustom} className="space-y-4 text-xs">
            {/* Customer */}
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Customer / Account <span className="text-rose-500">*</span>
              </label>
              <select
                value={customerId ?? ""}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerNumber || c.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Workflow Linking Fields: DN #, Driver, Truck, Route */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-700 dark:text-slate-200 text-[11px] block uppercase tracking-wider">
                Supply Chain & Route Details (Customer → Load → DN → Driver → Truck → Route)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold mb-1 text-slate-500">Delivery Note (DN No.)</label>
                  <input
                    type="text"
                    value={dnNumber ?? ""}
                    onChange={(e) => setDnNumber(e.target.value)}
                    placeholder="DN-10025"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1 text-slate-500">Pickup Origin</label>
                  <input
                    type="text"
                    value={pickupLocation ?? ""}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="Jeddah Port"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1 text-slate-500">Drop Destination</label>
                  <input
                    type="text"
                    value={dropLocation ?? ""}
                    onChange={(e) => setDropLocation(e.target.value)}
                    placeholder="Riyadh Depot"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold mb-1 text-slate-500">Assigned Driver</label>
                  <input
                    type="text"
                    value={driverName ?? ""}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Ahmed Al-Ghamdi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1 text-slate-500">Assigned Truck</label>
                  <input
                    type="text"
                    value={truckNo ?? ""}
                    onChange={(e) => setTruckNo(e.target.value)}
                    placeholder="TRK-001 (Volvo FH16)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Service / Line Item Details */}
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Service / Cargo Description
              </label>
              <input
                type="text"
                required
                value={itemDescription ?? ""}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Full Truckload Haulage Freight"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Unit Rate & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Rate / Price per Load (SAR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    value={unitRate ?? ""}
                    onChange={(e) => setUnitRate(Number(e.target.value))}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">SAR</span>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Number of Loads / Units <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity ?? ""}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Payment Settlement Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Initial Payment Status</label>
                <select
                  value={initialPaymentStatus ?? ""}
                  onChange={(e) => setInitialPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="unpaid">Unpaid (Full Due)</option>
                  <option value="paid">Fully Paid (Settled)</option>
                  <option value="partial">Partially Paid</option>
                </select>
              </div>

              {initialPaymentStatus === 'partial' && (
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Initial Paid Amount (SAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialPaidAmount ?? ""}
                    onChange={(e) => setInitialPaidAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              )}
            </div>

            {/* Clean Total Summary Box */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs space-y-1.5">
              <div className="flex justify-between font-black text-slate-900 dark:text-white text-sm">
                <span>Total Invoiced Amount ({quantity} Loads @ {formatCurrency(unitRate)}):</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {formatCurrency(unitRate * quantity)}
                </span>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Create & Issue Invoice</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

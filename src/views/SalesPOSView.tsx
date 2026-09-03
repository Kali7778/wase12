import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  CreditCard,
  Building,
  DollarSign,
  Receipt,
  ShieldCheck,
  Search,
  Sparkles,
  Barcode
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CartItem {
  id: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  vatRate: number;
}

export const SalesPOSView: React.FC = () => {
  const {
    warehouseItems,
    customers,
    addZatcaInvoice,
    executeStockOutForSale,
    showToast,
    companySettings,
    setSelectedInvoice
  } = useApp();

  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mada');
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: 'srv_1',
      sku: 'SRV-FRT-01',
      name: 'Riyadh to Dammam Heavy Trailer Haulage',
      unitPrice: 3800,
      quantity: 1,
      vatRate: 0.15,
    },
    {
      id: 'srv_2',
      sku: 'SRV-HND-02',
      name: 'Pallet Offloading & Cross-Dock Service',
      unitPrice: 350,
      quantity: 2,
      vatRate: 0.15,
    },
  ]);

  const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const grandTotal = cart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);

  const handleAddToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.sku === item.sku);
      if (existing) {
        return prev.map((i) => (i.sku === item.sku ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: item.id || Date.now().toString(),
          sku: item.sku,
          name: item.name,
          unitPrice: item.sellingPrice || item.unitCost * 1.3,
          quantity: 1,
          vatRate: 0.15,
        }
      ];
    });
  };

  const handleUpdateQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.sku === sku) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast('Empty Cart', 'Please add logistics services or goods to the POS terminal.', 'warning');
      return;
    }

    // Process physical items stock out
    const physicalCartItems = cart.filter((c) => warehouseItems.some((wi) => wi.sku === c.sku));
    for (const pItem of physicalCartItems) {
      const match = warehouseItems.find((wi) => wi.sku === pItem.sku);
      if (match) {
        executeStockOutForSale({
          itemId: match.id,
          customerName: customer.name,
          customerVatNumber: customer.vatNumber,
          customerCrNumber: customer.crNumber,
          customerAddress: customer.address,
          quantity: pItem.quantity,
          unitPrice: pItem.unitPrice,
          paymentMethod,
          isPaid: true,
          notes: `POS Direct Register Sale to ${customer.name}`,
          performedBy: 'POS Terminal Cashier'
        });
      }
    }

    // For non-physical items or if no physical items triggered separate invoice, create standard invoice
    if (physicalCartItems.length === 0) {
      const inv = addZatcaInvoice({
        invoiceType: 'tax_invoice_b2b',
        customerId: customer.id,
        customerName: customer.name,
        customerNameAr: customer.nameAr,
        customerVatNumber: customer.vatNumber,
        customerCrNumber: customer.crNumber,
        customerAddress: customer.address,
        subtotal: grandTotal,
        vatAmount: 0,
        totalAmount: grandTotal,
        vatRate: 0,
        paymentMethod,
        isPaid: true,
        items: cart.map((it) => ({
          id: it.id,
          description: it.name,
          descriptionAr: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.unitPrice * it.quantity,
          vatAmount: 0,
          total: it.unitPrice * it.quantity,
          itemCode: it.sku,
        })),
        zatcaStatus: 'cleared',
        clearedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
      setSelectedInvoice(inv);
    }

    try {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    } catch (e) {
      // ignore
    }

    showToast('Sale Completed & Stock Updated', 'Sale Order registered and inventory ledger reconciled!', 'success');
    setCart([]);
  };

  return (
    <div id="sales-pos-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Sale Point & Counter POS Terminal
          </h1>
          <p className="text-xs text-slate-500">
            Instant booking for express spot loads, warehouse fulfillment fees & certified B2B/B2C checkouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-4 h-4" /> Live Tax Verification &amp; QR Signer
          </span>
        </div>
      </div>

      {/* Grid: Catalog on Left (60%), Cart & Checkout on Right (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Services & Stock Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Pre-Set Freight Routes & Services */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Logistics Freight & Service Catalog
              </h3>
              <span className="text-[11px] text-slate-400">Click to add to bill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { sku: 'SRV-RUH-JED', name: 'Riyadh ⇄ Jeddah 30T Trailer Transport', price: 4200 },
                { sku: 'SRV-RUH-DMM', name: 'Riyadh ⇄ Dammam Heavy Express Haulage', price: 3600 },
                { sku: 'SRV-REEF-COLD', name: 'Reefer Cold-Chain (+4°C) Express Run', price: 4800 },
                { sku: 'SRV-DYNA-CITY', name: 'Dyna City Delivery (10T Door-to-Door)', price: 1200 },
                { sku: 'SRV-WH-PALLET', name: 'Warehouse Pallet Storage (30 Days)', price: 180 },
                { sku: 'SRV-CROSS-DOCK', name: 'Emergency Cross-Docking & Labor', price: 450 },
              ].map((srv) => (
                <button
                  key={srv.sku}
                  onClick={() => handleAddToCart({ ...srv, sellingPrice: srv.price })}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {srv.name}
                    </span>
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </div>
                  <div className="flex justify-between items-center text-xs mt-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-mono text-[10px] text-slate-400">{srv.sku}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(srv.price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Physical Inventory Stock Items */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Warehouse Stock Materials
              </h3>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter stock..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto">
              {warehouseItems
                .filter((i) => !searchFilter || i.name.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                          {item.name}
                        </div>
                        <span className="text-[10px] text-slate-400">{item.category}</span>
                      </div>
                      <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </div>
                    <div className="flex justify-between items-center text-xs mt-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                        {item.quantityOnHand} {item.unit} on hand
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.sellingPrice)}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Right Side: POS Order Register & Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Sale Register Cart</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">{cart.length} line items</span>
            </div>

            {/* Customer selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bill to Customer Account
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (VAT: {c.vatNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No items in POS basket yet
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.sku}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{item.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {formatCurrency(item.unitPrice)} each
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateQty(item.sku, -1)}
                        className="p-1 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.sku, 1)}
                        className="p-1 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="font-mono font-bold text-right min-w-[70px]">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                {[
                  { id: 'mada', label: 'Mada / POS Card', icon: CreditCard },
                  { id: 'bank_transfer', label: 'Bank Wire / SADAD', icon: Building },
                  { id: 'cash', label: 'Cash at Counter', icon: DollarSign },
                  { id: 'credit_account', label: 'Net 30 Account', icon: Receipt },
                ].map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Calculations Breakdown */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>Total Amount Due:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              id="pos-checkout-btn"
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Complete Sale & Issue Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

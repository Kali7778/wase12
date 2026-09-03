import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface CustomerFormModalProps {
  customer?: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  customer,
  isOpen,
  onClose,
}) => {
  const { addCustomer, updateCustomer, showToast, customers } = useApp();

  const isEditing = !!customer;

  // Form fields
  const [customerNumber, setCustomerNumber] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Riyadh');
  const [vatNumber, setVatNumber] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [customerType, setCustomerType] = useState<any>('Corporate');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [creditLimit, setCreditLimit] = useState(150000);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [totalLoads, setTotalLoads] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  useEffect(() => {
    if (customer) {
      setCustomerNumber(customer.customerNumber || customer.id || '');
      setName(customer.name || customer.companyName || '');
      setNameAr(customer.nameAr || '');
      setContactPerson(customer.contactPerson || '');
      setPhone(customer.phone || customer.mobileNumber || '');
      setMobileNumber(customer.mobileNumber || customer.phone || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setCity(customer.city || 'Riyadh');
      setVatNumber(customer.vatNumber || '');
      setCrNumber(customer.crNumber || '');
      setCustomerType(customer.customerType || 'Corporate');
      setPaymentTerms(customer.paymentTerms || 'Net 30');
      setCreditLimit(customer.creditLimit ?? 150000);
      setStatus(customer.status || 'active');
      setTotalLoads(customer.totalLoads ?? 0);
      setTotalAmount(customer.totalAmount ?? customer.totalBilled ?? 0);
      setPaidAmount(customer.paidAmount ?? 0);
    } else {
      // Auto-assign next customer number
      const nextNum = `CUST-${1000 + customers.length + 1}`;
      setCustomerNumber(nextNum);
      setName('');
      setNameAr('');
      setContactPerson('');
      setPhone('');
      setMobileNumber('');
      setEmail('');
      setAddress('');
      setCity('Riyadh');
      setVatNumber('');
      setCrNumber('');
      setCustomerType('Corporate');
      setPaymentTerms('Net 30');
      setCreditLimit(150000);
      setStatus('active');
      setTotalLoads(0);
      setTotalAmount(0);
      setPaidAmount(0);
    }
  }, [customer, customers.length, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Missing Company Name', 'Please enter the customer / company name.', 'warning');
      return;
    }
    const finalPhone = mobileNumber.trim() || phone.trim();
    if (!finalPhone) {
      showToast('Missing Phone Number', 'Please enter a valid telephone or mobile number.', 'warning');
      return;
    }

    const calculatedOutstanding = Math.max(0, Number(totalAmount) - Number(paidAmount));

    if (isEditing && customer) {
      updateCustomer(
        customer.id,
        {
          customerNumber: customerNumber.trim() || customer.customerNumber,
          name: name.trim(),
          companyName: name.trim(),
          nameAr: nameAr.trim() || name.trim(),
          contactPerson: contactPerson.trim() || 'Logistics Coordinator',
          phone: finalPhone,
          mobileNumber: finalPhone,
          email: email.trim() || 'logistics@client.sa',
          address: address.trim() || 'Industrial City, Saudi Arabia',
          city: city.trim() || 'Riyadh',
          vatNumber: vatNumber.trim() || '300000000000003',
          crNumber: crNumber.trim() || '1010000000',
          customerType,
          paymentTerms,
          creditLimit: Number(creditLimit),
          status,
          totalLoads: Number(totalLoads),
          totalAmount: Number(totalAmount),
          paidAmount: Number(paidAmount),
          outstandingAmount: calculatedOutstanding,
          outstandingBalance: calculatedOutstanding,
        },
        'Customer account profile updated by Administrator.'
      );
    } else {
      addCustomer({
        customerNumber: customerNumber.trim() || `CUST-${1000 + customers.length + 1}`,
        name: name.trim(),
        companyName: name.trim(),
        nameAr: nameAr.trim() || name.trim(),
        contactPerson: contactPerson.trim() || 'Logistics Coordinator',
        phone: finalPhone,
        mobileNumber: finalPhone,
        email: email.trim() || 'logistics@client.sa',
        address: address.trim() || 'Industrial City, Saudi Arabia',
        city: city.trim() || 'Riyadh',
        vatNumber: vatNumber.trim() || `300${Math.floor(100000000000 + Math.random() * 900000000000)}3`,
        crNumber: crNumber.trim() || `1010${Math.floor(100000 + Math.random() * 900000)}`,
        customerType,
        paymentTerms,
        creditLimit: Number(creditLimit),
        status,
        totalLoads: Number(totalLoads),
        totalAmount: Number(totalAmount),
        paidAmount: Number(paidAmount),
        outstandingAmount: calculatedOutstanding,
        outstandingBalance: calculatedOutstanding,
        payments: [],
        history: [],
      });
    }

    onClose();
  };

  return (
    <div
      id="customer-form-modal"
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
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isEditing ? 'Edit Customer Account' : '+ Add New Customer'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? `Modifying profile for ${customer?.name} (${customer?.customerNumber || customer?.id})`
                  : 'Register a client organization, payment terms, and credit limits.'}
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Customer ID & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Customer ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerNumber ?? ""}
                onChange={(e) => setCustomerNumber(e.target.value)}
                placeholder="e.g. CUST-1001"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-blue-600 dark:text-blue-400"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Customer Type</label>
              <select
                value={customerType ?? ""}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="Corporate">Corporate / Enterprise</option>
                <option value="Contractor">Contractor & Building Materials</option>
                <option value="Wholesale">Wholesale Distributor</option>
                <option value="Retail">Retail Chain</option>
                <option value="Government">Government / Semi-Gov</option>
                <option value="Individual">Individual / Private</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Account Status</label>
              <select
                value={status ?? ""}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="active">Active Account</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          {/* Row 2: Company Name (EN & AR) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Customer Name / Company Name (English) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name ?? ""}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ABC Trading & Contracting Co."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Company Name (Arabic / اسم الشركة)
              </label>
              <input
                type="text"
                value={nameAr ?? ""}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="e.g. شركة إيه بي سي للتجارة والمقاولات"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-arabic text-sm"
              />
            </div>
          </div>

          {/* Row 3: Mobile & Email & Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={mobileNumber || phone}
                onChange={(e) => {
                  setMobileNumber(e.target.value);
                  setPhone(e.target.value);
                }}
                placeholder="+966 50 123 4567"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                value={email ?? ""}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="procurement@abccompany.sa"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Contact Person</label>
              <input
                type="text"
                value={contactPerson ?? ""}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Tariq Mansour"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Row 4: Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Address / Delivery Depot</label>
              <input
                type="text"
                value={address ?? ""}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="King Abdulaziz Road Logistics Depot, Sector 4"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">City / Province</label>
              <input
                type="text"
                value={city ?? ""}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Jeddah / Riyadh"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Row 5: VAT & CR Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                15-Digit VAT Number (الرقم الضريبي)
              </label>
              <input
                type="text"
                value={vatNumber ?? ""}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="300881928300003"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Commercial Registration (CR # / السجل التجاري)
              </label>
              <input
                type="text"
                value={crNumber ?? ""}
                onChange={(e) => setCrNumber(e.target.value)}
                placeholder="4030192847"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Row 6: Payment Terms & Credit Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Payment Terms</label>
              <select
                value={paymentTerms ?? ""}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="Net 90">Net 90 Days</option>
                <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                <option value="100% Advance Payment">100% Advance Payment</option>
                <option value="Letter of Credit (LC)">Letter of Credit (LC)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Credit Limit (SAR)</label>
              <div className="relative">
                <input
                  type="number"
                  value={creditLimit ?? ""}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">SAR</span>
              </div>
            </div>
          </div>

          {/* Row 7: Financial Aggregates & Balances (Loads, Total Amount, Paid Amount) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-3">
            <span className="font-bold text-slate-700 dark:text-slate-200 text-xs block">
              Financial Summary & Operational Loads
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-500">Total Loads</label>
                <input
                  type="number"
                  value={totalLoads ?? ""}
                  onChange={(e) => setTotalLoads(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-500">Total Amount (SAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={totalAmount ?? ""}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-500">Paid Amount (SAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paidAmount ?? ""}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-500">Outstanding Amount</label>
                <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-black text-rose-600 dark:text-rose-400">
                  {(Math.max(0, totalAmount - paidAmount)).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
              <span>{isEditing ? 'Save Changes' : 'Register Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

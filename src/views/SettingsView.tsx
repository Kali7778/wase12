import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Building,
  ShieldCheck,
  Globe,
  Save,
  CheckCircle2,
  Lock,
  DollarSign
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    companySettings,
    updateCompanySettings,
    language,
    setLanguage,
    currency,
    setCurrency,
    showToast,
    t
  } = useApp();

  const [companyName, setCompanyName] = useState(companySettings.companyName);
  const [companyNameAr, setCompanyNameAr] = useState(companySettings.companyNameAr);
  const [vatNumber, setVatNumber] = useState(companySettings.vatNumber);
  const [crNumber, setCrNumber] = useState(companySettings.crNumber);
  const [address, setAddress] = useState(companySettings.address);
  const [city, setCity] = useState(companySettings.city);
  const [phone, setPhone] = useState(companySettings.phone);
  const [email, setEmail] = useState(companySettings.email);
  const [vatRatePercent, setVatRatePercent] = useState(companySettings.vatRatePercent);
  const [invoicingEnv, setInvoicingEnv] = useState<'sandbox' | 'simulation' | 'production'>('production');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings({
      companyName,
      companyNameAr,
      vatNumber,
      crNumber,
      address,
      city,
      phone,
      email,
      vatRatePercent: Number(vatRatePercent),
    });
    showToast('Settings Saved', 'Company profile and tax billing configurations updated.', 'success');
  };

  return (
    <div id="settings-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            System & Enterprise Settings
          </h1>
          <p className="text-xs text-slate-500">
            Configure company legal entity, bilingual profile, VAT tax rates, default currencies, and dispatch rules.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Legal Profile */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Saudi Legal Entity Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Company Commercial Name (English)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Company Commercial Name (Arabic)
              </label>
              <input
                type="text"
                value={companyNameAr}
                onChange={(e) => setCompanyNameAr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-arabic font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Official 15-Digit VAT Tax Number
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Commercial Registration (CR) Number
              </label>
              <input
                type="text"
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Hub / Depot Registered Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Primary Operations City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Support Telephone (KSA)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Official Billing Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Tax & Invoicing Environment */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Tax & Invoicing Configuration
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Standard Value Added Tax (VAT Rate)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={vatRatePercent}
                  onChange={(e) => setVatRatePercent(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Invoicing Mode
              </label>
              <select
                value={invoicingEnv}
                onChange={(e) => setInvoicingEnv(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="production">Standard Live Mode</option>
                <option value="simulation">Sandbox Testing</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Invoice QR Code Security
              </label>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Base64 TLV QR Verification</span>
              </div>
            </div>
          </div>
        </div>

        {/* Language & Currency Preferences */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Interface Localization & Currency
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Display Language
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex-1 py-2 rounded-xl border font-bold transition-all ${
                    language === 'en'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  English (LTR)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`flex-1 py-2 rounded-xl border font-arabic font-bold transition-all ${
                    language === 'ar'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  العربية (RTL)
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Accounting Currency Format
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              >
                <option value="SAR">Saudi Riyal (SAR / ر.س)</option>
                <option value="USD">US Dollar (USD $)</option>
                <option value="AED">UAE Dirham (AED / د.إ)</option>
                <option value="EUR">Euro (EUR €)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save System Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

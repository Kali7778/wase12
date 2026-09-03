import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ExpenseRecord, ExpenseCategory } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  DollarSign,
  Plus,
  Fuel,
  Wrench,
  Shield,
  Building,
  Users,
  Receipt,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const ExpensesView: React.FC = () => {
  const { expenses, drivers, addExpense, deleteExpense, showToast, activeRole } = useApp();
  const [activeTab, setActiveTab] = useState<'expenses' | 'salaries'>('expenses');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);

  // Form State
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('fuel');
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState<number>(450);
  const [expVehiclePlate, setExpVehiclePlate] = useState('5512 HJA');
  const [expDriverName, setExpDriverName] = useState(drivers[0]?.name || '');
  const [expReceipt, setExpReceipt] = useState('REC-SASCO-9912');
  const [expVendor, setExpVendor] = useState('SASCO Fuel Station Exit 18');
  const [expNotes, setExpNotes] = useState('Diesel fill-up before Dammam departure');

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalFuel = expenses.filter((e) => e.category === 'fuel').reduce((acc, e) => acc + e.amount, 0);
  const totalMaintenance = expenses.filter((e) => e.category === 'maintenance').reduce((acc, e) => acc + e.amount, 0);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || expAmount <= 0) {
      showToast('Invalid Amount', 'Please provide a title and positive expense amount.', 'warning');
      return;
    }

    addExpense({
      category: expCategory,
      title: expTitle.trim(),
      titleAr: expTitle.trim(),
      amount: Number(expAmount),
      date: new Date().toISOString().split('T')[0],
      vehiclePlate: expVehiclePlate || undefined,
      driverName: expDriverName || undefined,
      receiptNumber: expReceipt || undefined,
      vendorName: expVendor || undefined,
      isApproved: true,
      notes: expNotes,
    });

    setShowAddExpenseModal(false);
    setExpTitle('');
  };

  return (
    <div id="expenses-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Expenses & Driver Payroll
          </h1>
          <p className="text-xs text-slate-500">
            Log fleet operating costs, diesel receipts, highway tolls, vehicle maintenance & driver salary disbursements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'expenses'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Fleet Expenses ({expenses.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('salaries')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'salaries'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Driver Payroll ({drivers.length})</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">Total Operating Expenses</span>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(totalExpenseAmount)}
            </div>
            <span className="text-[11px] text-slate-400">Current financial month</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">Diesel & Fuel Costs</span>
            <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {formatCurrency(totalFuel)}
            </div>
            <span className="text-[11px] text-slate-400">{Math.round((totalFuel / Math.max(1, totalExpenseAmount)) * 100)}% of total expenses</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600">
            <Fuel className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">Maintenance & Repairs</span>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(totalMaintenance)}
            </div>
            <span className="text-[11px] text-slate-400">Periodic workshop servicing</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tab 1: Expenses List */}
      {activeTab === 'expenses' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold uppercase">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Description & Vendor</th>
                  <th className="p-3.5">Vehicle Plate</th>
                  <th className="p-3.5">Driver / Handled By</th>
                  <th className="p-3.5">Receipt #</th>
                  <th className="p-3.5 text-right">Amount (SAR)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 text-slate-400 font-mono">{exp.date}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {exp.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{exp.title}</div>
                      <div className="text-[10px] text-slate-400">{exp.vendorName || exp.notes || '—'}</div>
                    </td>
                    <td className="p-3.5 font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      {exp.vehiclePlate || 'Fleet Overhead'}
                    </td>
                    <td className="p-3.5">{exp.driverName || 'Admin'}</td>
                    <td className="p-3.5 font-mono text-slate-500">{exp.receiptNumber || '—'}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        APPROVED
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {['admin', 'manager', 'gm', 'accountant'].includes(activeRole) && (
                        <button
                          id={`btn-delete-exp-${exp.id}`}
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Driver Monthly Salary & Payout Slips */}
      {activeTab === 'salaries' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Monthly Driver Payroll & Trip Allowances
              </h3>
              <p className="text-xs text-slate-500">Base salary + per-trip allowance and road per-diem</p>
            </div>
            <button
              onClick={() => showToast('Disbursement Processed', 'Payroll batch generated for WPS bank transfer.', 'success')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              Export WPS Salary File
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold uppercase">
                <tr>
                  <th className="p-3.5">Driver</th>
                  <th className="p-3.5">Iqama / ID</th>
                  <th className="p-3.5 text-right">Base Salary</th>
                  <th className="p-3.5 text-center">Completed Trips</th>
                  <th className="p-3.5 text-right">Trip Allowance</th>
                  <th className="p-3.5 text-right">Net Monthly Payout</th>
                  <th className="p-3.5 text-center">WPS Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                {drivers.map((driver) => {
                  const tripAllowanceTotal = driver.totalTripsCompleted * driver.tripAllowanceRate;
                  const netTotal = driver.baseSalary + tripAllowanceTotal;
                  return (
                    <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{driver.name}</div>
                        <div className="text-[10px] text-slate-500">{driver.phone}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{driver.nationalIdOrIqama}</td>
                      <td className="p-3.5 text-right font-mono font-semibold">
                        {formatCurrency(driver.baseSalary)}
                      </td>
                      <td className="p-3.5 text-center font-bold">{driver.totalTripsCompleted}</td>
                      <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{formatCurrency(tripAllowanceTotal)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                        {formatCurrency(netTotal)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> READY
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Expense */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Fleet Operating Expense</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Expense Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 capitalize"
                >
                  <option value="fuel">Fuel & Diesel (وقود)</option>
                  <option value="maintenance">Vehicle Maintenance & Parts (صيانة)</option>
                  <option value="tolls">Highway Tolls & Weighbridge (رسوم طرق)</option>
                  <option value="tires">Tires & Alignment (إطارات)</option>
                  <option value="insurance">Fleet Insurance & Licensing (تأمين)</option>
                  <option value="warehouse_rent">Warehouse & Facility Rent (إيجار مستودع)</option>
                  <option value="other">Other Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Expense Title / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diesel refill at SASCO station"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Amount (SAR)</label>
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Receipt / Invoice #</label>
                  <input
                    type="text"
                    placeholder="REC-1234"
                    value={expReceipt}
                    onChange={(e) => setExpReceipt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Associated Vehicle Plate</label>
                  <input
                    type="text"
                    placeholder="5512 HJA"
                    value={expVehiclePlate}
                    onChange={(e) => setExpVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Vendor / Fuel Station</label>
                  <input
                    type="text"
                    placeholder="SASCO / Naft / Petromin"
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {expenseToDelete && (
        <DeleteConfirmationModal
          isOpen={!!expenseToDelete}
          onClose={() => setExpenseToDelete(null)}
          onConfirm={() => {
            if (expenseToDelete) {
              deleteExpense(expenseToDelete.id);
              setExpenseToDelete(null);
            }
          }}
          title="Delete Expense Record"
          message={`Are you sure you want to delete expense "${expenseToDelete.title}" (SAR ${formatCurrency(expenseToDelete.amount)})?`}
          confirmText="Yes, Delete Expense"
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { SystemUser, UserRole } from '../types';
import { X, UserCheck, Shield, Mail, Phone, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Avatar } from './Avatar';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Omit<SystemUser, 'id'> | Partial<SystemUser>) => void;
  initialData?: SystemUser | null;
}

const roleOptions: { role: UserRole; title: string; desc: string }[] = [
  { role: 'ceo', title: 'Chief Executive Officer (CEO)', desc: 'Full executive visibility, board oversight & policy signoff' },
  { role: 'gm', title: 'General Manager (GM)', desc: 'Complete operations control, high-level approvals & audit investigation' },
  { role: 'manager', title: 'Operations Manager', desc: 'Daily logistics control, trip adjustments & slip reviews' },
  { role: 'admin', title: 'System Administrator', desc: 'Unrestricted administration, role configuration & database sync' },
  { role: 'dispatcher', title: 'Fleet Dispatcher', desc: 'Trip assignment, live GPS telemetry & delivery notes' },
  { role: 'warehouse_mgr', title: 'Warehouse Manager', desc: 'Stock allocation, GRN receipts & aisle-bay mappings' },
  { role: 'warehouse', title: 'Warehouse Staff', desc: 'Physical picking, stock counts & loading operations' },
  { role: 'accountant', title: 'Finance Officer', desc: 'Invoices, customer payment ledgers & expense auditing' },
  { role: 'sales', title: 'Sales Executive', desc: 'POS sales orders, customer accounts & pricing' },
  { role: 'driver', title: 'Fleet Driver', desc: 'Mobile route manifests, POD receipts & delivery sign-offs' },
];

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('dispatcher');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      setRole(initialData.role || 'dispatcher');
      setStatus(initialData.status || 'active');
      setAvatarUrl(initialData.avatarUrl || '');
    } else {
      setName('');
      setEmail('');
      setPhone('+966 5');
      setRole('dispatcher');
      setStatus('active');
      setAvatarUrl('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const defaultPerms: Record<UserRole, string[]> = {
      ceo: ['full_visibility', 'executive_audit_view', 'policy_signoff', 'board_reports'],
      gm: ['full_operations_control', 'gm_approvals', 'audit_investigation', 'export_reports', 'salary_overview'],
      manager: ['daily_ops_control', 'manager_approvals', 'slip_review', 'inventory_flow', 'operational_reports'],
      admin: ['all_access', 'financial_override', 'system_config'],
      dispatcher: ['create_trips', 'assign_drivers', 'manage_gps', 'update_dn'],
      warehouse_mgr: ['full_warehouse_control', 'approve_grn', 'stock_transfers', 'bay_allocation'],
      warehouse: ['view_inventory', 'log_movement', 'scan_barcode', 'submit_grn'],
      accountant: ['view_invoices', 'issue_tax_invoice', 'record_expenses', 'export_wps'],
      sales: ['create_pos_orders', 'view_customers', 'request_stock_out'],
      driver: ['view_assigned_trips', 'submit_slip', 'sign_pod'],
    };

    const payload = {
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@logiflow.sa`,
      phone: phone.trim(),
      role,
      status,
      avatarUrl: avatarUrl.trim() || undefined,
      lastLogin: initialData?.lastLogin || 'Never logged in',
      permissions: initialData?.permissions || defaultPerms[role] || ['basic_access'],
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {initialData ? 'Edit System Operator / User' : 'Register New System User'}
              </h3>
              <p className="text-xs text-slate-500">
                {initialData ? `Modify credentials and role for ${initialData.name}` : 'Assign RBAC role, permissions and contact details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Avatar Preview & URL */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <Avatar name={name || 'New user'} src={avatarUrl} size={48} className="border-2 border-white dark:border-slate-700" />
            <div className="flex-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Avatar Photo URL
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Optional — leave blank to use initials"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tariq Al-Mansoor"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Work Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@logiflow.sa"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile Phone</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 50 123 4567"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>
          </div>

          {/* Assigned System Role */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              <span>Assigned System Role (RBAC)</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
            >
              {roleOptions.map((opt) => (
                <option key={opt.role} value={opt.role}>
                  {opt.title} ({opt.role.toUpperCase()})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1 italic">
              {roleOptions.find((r) => r.role === role)?.desc}
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Account Access Status
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 bg-slate-50 dark:bg-slate-800">
                <input
                  type="radio"
                  name="userStatus"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-bold text-emerald-700 dark:text-emerald-400">Active (Authorized)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 bg-slate-50 dark:bg-slate-800">
                <input
                  type="radio"
                  name="userStatus"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="font-bold text-rose-700 dark:text-rose-400">Suspended / Inactive</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>{initialData ? 'Save User Changes' : 'Create User Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

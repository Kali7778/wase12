import React, { useState, useMemo } from 'react';
import { Avatar } from '../components/Avatar';
import { useApp } from '../context/AppContext';
import { SystemUser, UserRole } from '../types';
import { UserFormModal } from '../components/UserFormModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import {
  UserCog,
  Shield,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  UserCheck,
  Building,
  Key,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, activeRole, currentUser, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  const roleDefinitions: Record<
    string,
    { title: string; description: string; permissions: string[] }
  > = {
    admin: {
      title: 'Super Administrator',
      description: 'Unrestricted control over all system entities, database synchronization, payroll approvals & settings.',
      permissions: ['Manage Trips & DN', 'Issue Invoices', 'Approve Payroll & Expenses', 'Stock Intake GRN & Picking', 'Database Backup & Restore', 'Configure System Roles'],
    },
    dispatcher: {
      title: 'Fleet Dispatcher',
      description: 'Manages load assignments, live GPS radar, driver telemetry, and outside carrier brokers.',
      permissions: ['Create & Edit Trips', 'Generate Delivery Notes (DN)', 'Assign Drivers & Trucks', 'View Live GPS Radar', 'Mark POD Signed'],
    },
    warehouse: {
      title: 'Warehouse Operations Manager',
      description: 'Controls stock levels, inbound GRN receipts, aisle bay mappings, and cold storage.',
      permissions: ['Catalog Warehouse SKUs', 'Issue Inbound GRN Receipts', 'Process Outbound Dispatch Picking', 'Manage Stock Thresholds'],
    },
    accountant: {
      title: 'Finance & Compliance Officer',
      description: 'Oversees invoices, customer credit balances & expenses.',
      permissions: ['Issue & Sign Invoices', 'Audit Operating Expenses', 'Manage Customer Ledgers', 'Export WPS Payroll Batches'],
    },
    driver: {
      title: 'Fleet Driver / Carrier',
      description: 'Mobile field view for assigned routes, cargo manifest, and recipient signature capture.',
      permissions: ['View Assigned Trips', 'Inspect Delivery Note Items', 'Record Trip Status Updates'],
    },
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (user: SystemUser) => {
    setEditingUser(user);
    setIsFormModalOpen(true);
  };

  const handleSaveUser = (userData: Omit<SystemUser, 'id'> | Partial<SystemUser>) => {
    if (editingUser) {
      updateUser(editingUser.id, userData);
    } else {
      addUser(userData as Omit<SystemUser, 'id'>);
    }
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  return (
    <div id="users-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <UserCog className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>Users & Role Permissions Matrix</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage system operators, assign RBAC access levels, create user credentials, and switch active roles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 p-2 px-3 rounded-2xl border border-blue-200 dark:border-blue-900">
            <Key className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
              Active Testing Role: <span className="uppercase">{activeRole}</span>
            </span>
          </div>

          <button
            id="btn-add-user"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Role reference — what each role may do. Roles are assigned by an administrator. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['admin', 'dispatcher', 'warehouse', 'accountant'] as UserRole[]).map((roleKey) => {
          const roleInfo = roleDefinitions[roleKey];
          const isCurrent = activeRole === roleKey;
          return (
            <div
              key={roleKey}
              className={`p-5 rounded-3xl border transition-colors flex flex-col justify-between space-y-3 ${
                isCurrent
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-blue-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {roleKey}
                  </span>
                  {isCurrent && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <h3 className="font-bold text-sm mt-2">{roleInfo.title}</h3>
                <p className={`text-xs mt-1 ${isCurrent ? 'text-blue-100' : 'text-slate-500'}`}>
                  {roleInfo.description}
                </p>
              </div>

              <div className="pt-2 border-t border-white/20 dark:border-slate-800 space-y-1">
                <span className={`text-[10px] font-bold uppercase ${isCurrent ? 'text-blue-200' : 'text-slate-400'}`}>
                  Key Permissions:
                </span>
                {roleInfo.permissions.slice(0, 3).map((perm, idx) => (
                  <div key={idx} className="text-[11px] flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-current"></span>
                    <span className="truncate">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Users Directory & Management Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Registered Staff & Operators</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                {filteredUsers.length} total
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Add new staff members, edit roles & contact numbers, or deactivate/delete user access.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
            >
              <option value="ALL">All Roles</option>
              <option value="admin">Admin</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="warehouse">Warehouse</option>
              <option value="warehouse_mgr">Warehouse Mgr</option>
              <option value="accountant">Accountant</option>
              <option value="sales">Sales</option>
              <option value="manager">Manager</option>
              <option value="gm">General Manager</option>
              <option value="ceo">CEO</option>
              <option value="driver">Driver</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              <tr>
                <th className="p-3.5">Staff Member</th>
                <th className="p-3.5">Contact Phone</th>
                <th className="p-3.5">Assigned Role</th>
                <th className="p-3.5">Account Status</th>
                <th className="p-3.5">Last Login</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No system users matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={usr.name} src={usr.avatarUrl} size={36} className="border border-slate-200 dark:border-slate-700" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{usr.name}</span>
                            {currentUser.id === usr.id && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{usr.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{usr.phone || '—'}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 inline-block border border-blue-200 dark:border-blue-900">
                        {usr.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {usr.status === 'active' ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{usr.lastLogin || '2026-08-17 09:30'}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-edit-user-${usr.id}`}
                          onClick={() => handleOpenEdit(usr)}
                          className="p-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-user-${usr.id}`}
                          onClick={() => setUserToDelete(usr)}
                          className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Form Modal */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        initialData={editingUser}
      />

      {/* Delete User Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!userToDelete}
        title="Delete System User"
        message={`Are you sure you want to permanently delete user account "${userToDelete?.name}" (${userToDelete?.email})? This will revoke all role permissions and system access.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};

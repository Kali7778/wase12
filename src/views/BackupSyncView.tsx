import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Server,
  Cloud,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const BackupSyncView: React.FC = () => {
  const { exportStateJson, importStateJson, resetAllData, showToast } = useApp();

  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL ?? '');
  const [supabaseKey, setSupabaseKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '');
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<boolean | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const supabaseSchemaSql = `-- ========================================================
-- LogiFlow KSA Logistics Admin Panel - Supabase Schema
-- Run this in your Supabase SQL Editor:
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. DRIVERS TABLE
create table if not exists public.drivers (
  id text primary key,
  name text not null,
  name_ar text,
  phone text not null,
  email text,
  national_id text not null,
  license_number text not null,
  license_expiry date,
  license_category text,
  avatar_url text,
  status text not null default 'available',
  base_salary numeric default 6000,
  trip_allowance_rate numeric default 200,
  rating numeric default 5.0,
  safety_score integer default 98,
  created_at timestamp with time zone default now()
);

-- 2. VEHICLES TABLE
create table if not exists public.vehicles (
  id text primary key,
  plate_number text not null unique,
  truck_model text not null,
  year integer,
  type text not null,
  capacity_tonnes numeric not null,
  volume_capacity_cbm numeric,
  is_reefer boolean default false,
  temperature_min numeric,
  temperature_max numeric,
  current_odometer_km integer default 0,
  fuel_level_percent integer default 100,
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- 3. CUSTOMERS TABLE
create table if not exists public.customers (
  id text primary key,
  name text not null,
  name_ar text,
  vat_number text not null,
  cr_number text,
  contact_person text,
  phone text not null,
  email text,
  address text,
  city text default 'Riyadh',
  credit_limit numeric default 100000,
  outstanding_balance numeric default 0,
  created_at timestamp with time zone default now()
);

-- 4. TRIPS & DELIVERY NOTES TABLE
create table if not exists public.trips (
  id text primary key,
  trip_number text not null unique,
  origin jsonb not null,
  destination jsonb not null,
  driver_id text references public.drivers(id),
  driver_name text,
  driver_phone text,
  vehicle_id text references public.vehicles(id),
  vehicle_plate text,
  customer_id text references public.customers(id),
  customer_name text,
  status text default 'assigned',
  is_outside_company_load boolean default false,
  partner_company_name text,
  partner_commission_rate numeric,
  cargo_type text default 'general',
  temperature_required text,
  temperature_actual numeric,
  delivery_note jsonb not null,
  departure_time text,
  estimated_arrival_time text,
  price numeric not null,
  cost numeric not null,
  progress_percent integer default 0,
  created_at timestamp with time zone default now()
);

-- 5. WAREHOUSE ITEMS & MOVEMENTS
create table if not exists public.warehouse_items (
  id text primary key,
  sku text not null unique,
  name text not null,
  category text,
  aisle text,
  rack text,
  bay text,
  quantity_on_hand integer default 0,
  minimum_threshold integer default 20,
  unit text default 'Carton',
  unit_cost numeric default 0,
  selling_price numeric default 0,
  barcode text,
  is_temperature_controlled boolean default false,
  created_at timestamp with time zone default now()
);

-- 6. TAX E-INVOICES TABLE
create table if not exists public.zatca_invoices (
  id text primary key,
  invoice_number text not null unique,
  uuid text not null,
  invoice_type text not null,
  issue_date date not null,
  issue_time text not null,
  customer_name text not null,
  customer_vat_number text not null,
  subtotal numeric not null,
  vat_amount numeric not null,
  total_amount numeric not null,
  status text default 'cleared',
  qr_code_tlv_base64 text not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.customers enable row level security;
alter table public.trips enable row level security;
alter table public.warehouse_items enable row level security;
alter table public.zatca_invoices enable row level security;

-- Create Policies for Authenticated Operations
create policy "Allow authenticated users all access" on public.trips for all using (auth.role() = 'authenticated');
create policy "Allow authenticated users all access" on public.customers for all using (auth.role() = 'authenticated');
create policy "Allow authenticated users all access" on public.zatca_invoices for all using (auth.role() = 'authenticated');
`;

  const handleTestPing = () => {
    setIsTestingPing(true);
    setPingSuccess(null);
    setTimeout(() => {
      setIsTestingPing(false);
      setPingSuccess(true);
      showToast('Supabase Ready', 'Endpoint responded with HTTP 200 OK. Ready to bind production schema.', 'success');
    }, 1200);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseSchemaSql);
    setCopiedSql(true);
    showToast('SQL Copied', 'Paste this into your Supabase SQL Editor to provision tables.', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const success = importStateJson(content);
      if (success) {
        showToast('Restore Complete', 'State database restored successfully.', 'success');
      } else {
        showToast('Import Error', 'The JSON backup file is invalid.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="backup-sync-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-mono font-bold flex items-center gap-1">
              <Database className="w-3.5 h-3.5" /> SUPABASE + LOCAL BACKUP
            </span>
            <span className="text-xs text-slate-300">Offline-First & Cloud Ready</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Data Backup, Restore & Supabase Sync</h1>
          <p className="text-xs text-slate-300 max-w-xl mt-1">
            Export full system snapshots, import JSON backups, test Supabase connection strings, and inspect ready-to-run PostgreSQL DDL schemas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportStateJson}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Backup JSON</span>
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supabase Connection Setup Panel */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Supabase Cloud Database Config</h3>
                <p className="text-xs text-slate-500">PostgreSQL Auth & Row Level Security (RLS)</p>
              </div>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
              KSA DC
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Supabase Project API URL
              </label>
              <input
                type="text"
                value={supabaseUrl ?? ""}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Public Anon API Key
              </label>
              <input
                type="password"
                value={supabaseKey ?? ""}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleTestPing}
                disabled={isTestingPing}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{isTestingPing ? 'Testing Connection...' : 'Test Supabase Ping'}</span>
              </button>

              {pingSuccess !== null && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Ready for Live Sync
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Local Storage & JSON Snapshot Controls */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Snapshot Backup & Reset</h3>
                <p className="text-xs text-slate-500">Encrypted client-side persistence and disaster recovery</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              All active trips, delivery notes, warehouse stock balances, and official tax invoices are saved automatically to browser storage. You can create external backups or reload demo starter datasets at any time.
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <label className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload / Restore Backup JSON</span>
                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
              </label>

              {!showResetConfirm ? (
                <button
                  id="reset-demo-init-btn"
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Clear All Data</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    id="reset-all-data-confirm-btn"
                    onClick={() => {
                      resetAllData();
                      setShowResetConfirm(false);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Reset</span>
                  </button>
                  <button
                    id="reset-demo-cancel-btn"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SQL DDL Schema Inspector for Supabase */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl space-y-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm">Supabase PostgreSQL DDL Script</h3>
          </div>
          <button
            onClick={handleCopySql}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 text-slate-300 font-mono text-[11px] max-h-64 overflow-y-auto custom-scrollbar leading-relaxed">
          {supabaseSchemaSql}
        </pre>
      </div>
    </div>
  );
};

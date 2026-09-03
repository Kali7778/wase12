import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/i18n';
import {
  BarChart3,
  Download,
  Calendar,
  Truck,
  TrendingUp,
  ShieldCheck,
  Fuel,
  Users,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { trips, expenses, zatcaInvoices, drivers, vehicles, showToast } = useApp();
  const [reportRange, setReportRange] = useState('this_month');

  const totalRev = trips.reduce((acc, t) => acc + (t.price || 0), 0);
  const totalExp = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netMargin = totalRev - totalExp;
  const marginPct = totalRev > 0 ? ((netMargin / totalRev) * 100).toFixed(1) : '0';

  const exportCSV = () => {
    const headers = 'Trip Number,Customer,Origin,Destination,Driver,Vehicle,Status,Price,Cost,Date\n';
    const rows = trips
      .map(
        (t) =>
          `"${t.tripNumber}","${t.customerName}","${t.origin.city}","${t.destination.city}","${t.driverName}","${t.vehiclePlate}","${t.status}",${t.price},${t.cost},"${t.departureTime}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LogiFlow_Fleet_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report Exported', 'CSV Freight and Financial Report downloaded.', 'success');
  };

  return (
    <div id="reports-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Analytics & Executive Reports
          </h1>
          <p className="text-xs text-slate-500">
            Fleet utilization indices, cost per ton-kilometer (CPTK), on-time delivery percentages, and financial summaries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={reportRange}
            onChange={(e) => setReportRange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
          >
            <option value="this_month">Current Billing Period</option>
            <option value="last_quarter">Last Quarter (Q4)</option>
            <option value="ytd">Year to Date (YTD 2026)</option>
          </select>

          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Gross Revenue</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalRev)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">+18.5% YoY</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Operating Costs</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalExp)}
          </div>
          <span className="text-[11px] text-slate-400">Fuel, Salaries & Maintenance</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Net Operating Profit</span>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(netMargin)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">{marginPct}% Net Margin</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Fleet Utilization</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            87.4%
          </div>
          <span className="text-[11px] text-blue-600 font-semibold">12,480 Ton-KM per truck</span>
        </div>
      </div>

      {/* Main Analysis Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lane Analysis */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            High-Volume Freight Corridor Performance
          </h3>

          <div className="space-y-3 text-xs">
            {[
              { lane: 'Riyadh ⇄ Jeddah (Route 40)', loads: 42, revenue: 176400, onTime: 99.1, avgTransit: '14.2 hrs' },
              { lane: 'Riyadh ⇄ Dammam (Route 80)', loads: 36, revenue: 129600, onTime: 98.4, avgTransit: '4.8 hrs' },
              { lane: 'Riyadh ⇄ Qassim / Medina (Route 65)', loads: 21, revenue: 67200, onTime: 97.6, avgTransit: '8.5 hrs' },
              { lane: 'Jeddah ⇄ Tabuk / North Express', loads: 14, revenue: 58800, onTime: 96.8, avgTransit: '18.0 hrs' },
            ].map((lane, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white">
                  <span>{lane.lane}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(lane.revenue)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>{lane.loads} Dispatched Loads</span>
                  <span>On-Time: {lane.onTime}%</span>
                  <span>Avg Duration: {lane.avgTransit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet Driver Safety & Efficiency */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Top Driver Performance & Safety Scores
          </h3>

          <div className="space-y-3 text-xs">
            {drivers.map((driver) => (
              <div key={driver.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={driver.avatarUrl} alt={driver.name} className="w-10 h-10 rounded-xl object-cover" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{driver.name}</div>
                    <span className="text-[11px] text-slate-400 font-mono">{driver.assignedVehiclePlate || 'Trailer Driver'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    Safety: {driver.safetyScore}%
                  </div>
                  <span className="text-[11px] text-slate-400">{driver.totalTripsCompleted} Completed Trips</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

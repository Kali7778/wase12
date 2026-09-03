import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  PackagePlus,
  TrendingUp,
  FileCheck,
  Building2,
  User,
  Truck,
  Barcode,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface StockInwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDnNumber?: string;
}

export const StockInwardModal: React.FC<StockInwardModalProps> = ({
  isOpen,
  onClose,
  defaultDnNumber = 'DN-003',
}) => {
  const {
    drivers,
    vehicles,
    executeStockIn,
    currentRole,
  } = useApp();

  const [dnNumber, setDnNumber] = useState<string>(defaultDnNumber);
  const [productName, setProductName] = useState<string>('TLB (Truck Load Bulk)');
  const [quantity, setQuantity] = useState<number>(750);
  const [unit, setUnit] = useState<string>('BAG');
  const [supplierSource, setSupplierSource] = useState<string>('El-Khayyat Gypsum Plant');
  const [driverId, setDriverId] = useState<string>(drivers[0]?.id || 'drv_1');
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id || 'veh_1');
  const [barcode, setBarcode] = useState<string>('6281002938109');
  const [unitCost, setUnitCost] = useState<number>(14);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const selectedDriver = drivers.find((d) => d.id === driverId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dnNumber || quantity <= 0) return;

    executeStockIn({
      dnNumber,
      productName,
      quantity: Number(quantity),
      unit,
      source: supplierSource,
      driverId: selectedDriver?.id,
      driverName: selectedDriver?.name,
      vehiclePlate: selectedVehicle?.plateNumber,
      barcode: barcode || `628100${Math.floor(1000000 + Math.random() * 9000000)}`,
      unitCost: Number(unitCost),
      performedBy: `${currentRole === 'super_admin' ? 'Super Admin' : 'Warehouse Lead'} (Fahad Al-Malki)`,
      notes: notes || `Direct Inward physical stock intake from Supplier Slip ${dnNumber}.`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">TLB Stock In (Supplier Slip)</h2>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/30 text-[10px] font-mono font-black uppercase">
                  Movement: IN
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Record verified physical arrival to TLB Main Inventory &amp; generate audit movement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Summary */}
        <div className="px-6 py-3 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300 font-medium">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Workflow: <strong>TLB Slip → Inward Verification → Available Stock (+{quantity} {unit})</strong></span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* DN Number & Product Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                DN / Slip Number *
              </label>
              <input
                type="text"
                value={dnNumber}
                onChange={(e) => setDnNumber(e.target.value)}
                placeholder="e.g. DN-003"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                required
              />
            </div>
          </div>

          {/* Quantity, Unit & Unit Cost */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantity Inward *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-black font-mono"
                required
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cost/Unit (SAR)
              </label>
              <input
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>
          </div>

          {/* Supplier Origin Source & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Source / Plant *
              </label>
              <input
                type="text"
                value={supplierSource}
                onChange={(e) => setSupplierSource(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-slate-400" /> Barcode Identifier
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>
          </div>

          {/* Inbound Driver & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" /> Receiving Driver
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.nationality})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600" /> Inbound Truck
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.model})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Physical Verification Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Seal intact, offloaded in Silo A without damages."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify &amp; Credit Stock In (+{quantity})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Truck,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  Boxes,
  Briefcase,
  Factory,
  ArrowRight,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

interface NewLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLoadType?: 'gypsum' | 'broker';
}

export const NewLoadModal: React.FC<NewLoadModalProps> = ({
  isOpen,
  onClose,
  initialLoadType = 'gypsum',
}) => {
  const {
    drivers,
    vehicles,
    warehouseItems,
    locations,
    createTruckLoad,
    language,
  } = useApp();

  const isAr = language === 'ar';

  // Load Type State: 'gypsum' | 'broker'
  const [loadType, setLoadType] = useState<'gypsum' | 'broker'>(initialLoadType);

  // --- GYPSUM LOAD SPECIFIC STATE ---
  // Look for TLB items in inventory
  const tlbItems = warehouseItems.filter(
    (it) =>
      it.category.includes('TLB') ||
      it.name.toLowerCase().includes('tlb') ||
      it.sku.includes('TLB') ||
      (it.dnNumber && it.dnNumber.startsWith('DN-'))
  );
  const activeTlbList = tlbItems.length > 0 ? tlbItems : warehouseItems;

  const [tlbNumber, setTlbNumber] = useState<string>('9100042352');
  const [supplier, setSupplier] = useState<string>('Supplier A (El-Khayyat Gypsum Plant)');
  const [availableQty, setAvailableQty] = useState<number>(1000);
  const [loadingQty, setLoadingQty] = useState<number>(750);

  // --- BROKER LOAD SPECIFIC STATE ---
  const [brokerName, setBrokerName] = useState<string>('ABC Broker Logistics');
  const [brokerSupplierSource, setBrokerSupplierSource] = useState<string>('Supplier B (Yanbu Quarry Terminals)');
  const [brokerTlbNumber, setBrokerTlbNumber] = useState<string>('9100042352');
  const [brokerQty, setBrokerQty] = useState<number>(750);

  // --- COMMON DISPATCH STATE ---
  const [driverId, setDriverId] = useState<string>(drivers[0]?.id || 'drv_1');
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id || 'veh_1');
  const [loadingDate, setLoadingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const selectedDriver = drivers.find((d) => d.id === driverId) || drivers[0];
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) || vehicles[0];

  const handleTlbSelectChange = (val: string) => {
    setTlbNumber(val);
    const found = activeTlbList.find((i) => i.dnNumber === val || i.sku === val);
    if (found) {
      const avail = found.quantityOnHand - (found.reservedQuantity || 0);
      setAvailableQty(avail > 0 ? avail : found.quantityOnHand);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (loadType === 'gypsum') {
      createTruckLoad({
        loadType: 'gypsum',
        tlbNumber: tlbNumber.trim() || '9100042352',
        supplier: supplier.trim() || 'Supplier A',
        availableQuantity: Number(availableQty) || 1000,
        loadingQuantity: Number(loadingQty) || 750,
        driverId: selectedDriver?.id || 'drv_1',
        driverName: selectedDriver?.name || 'Ahmed',
        vehicleId: selectedVehicle?.id || 'veh_1',
        vehiclePlate: selectedVehicle?.plateNumber || 'Truck 12',
        loadingDate: loadingDate || '2026-08-22',
        notes: notes || `Direct Gypsum Load from ${supplier}`,
      });
    } else {
      createTruckLoad({
        loadType: 'broker',
        brokerName: brokerName.trim() || 'ABC Broker',
        supplierSource: brokerSupplierSource.trim() || 'Supplier B',
        tlbNumber: brokerTlbNumber.trim() || undefined,
        loadingQuantity: Number(brokerQty) || 750,
        driverId: selectedDriver?.id || 'drv_1',
        driverName: selectedDriver?.name || 'Ahmed',
        vehicleId: selectedVehicle?.id || 'veh_1',
        vehiclePlate: selectedVehicle?.plateNumber || 'Truck 12',
        loadingDate: loadingDate || '2026-08-22',
        notes: notes || `Broker Load via ${brokerName}`,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div
        id="new-truck-load-modal"
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">
                  {isAr ? 'إنشاء حمولة جديدة' : '+ NEW LOAD'}
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                  Truck Dispatcher
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isAr
                  ? 'اختر نوع الحمولة (جبس أو وسيط) وعيّن السائق والشاحنة'
                  : 'Select Load Type (Gypsum or Broker) & Assign to Driver'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 1. LOAD TYPE SELECTOR */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isAr ? 'نوع الحمولة (Load Type):' : 'Load Type:'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-select-gypsum-load"
                onClick={() => setLoadType('gypsum')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  loadType === 'gypsum'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-slate-900 dark:text-white ring-2 ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    loadType === 'gypsum'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <Factory className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block text-slate-900 dark:text-white">
                    {isAr ? '🚚 حمولة جبس (GYPSUM LOAD)' : '🚚 GYPSUM LOAD'}
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    {isAr ? 'مباشر من المورد / سند TLB' : 'Direct load from your supplier'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                id="btn-select-broker-load"
                onClick={() => setLoadType('broker')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  loadType === 'broker'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-white ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    loadType === 'broker'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block text-slate-900 dark:text-white">
                    {isAr ? '🏢 حمولة وسيط (BROKER LOAD)' : '🏢 BROKER LOAD'}
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    {isAr ? 'شحنة مستلمة عبر وسيط شحن' : 'Load received through broker'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. DYNAMIC LOAD FIELDS */}
          {loadType === 'gypsum' ? (
            /* ======================================================== */
            /* GYPSUM LOAD FORM FIELDS                                   */
            /* ======================================================== */
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/40">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Factory className="w-3.5 h-3.5 text-amber-600" />
                  {isAr ? 'بيانات حمولة الجبس' : 'Gypsum Supplier Specifications'}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                  Direct Supplier Intake
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* TLB Number */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'رقم السند (TLB No.):' : 'TLB No.:'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tlbNumber}
                      onChange={(e) => setTlbNumber(e.target.value)}
                      placeholder="9100042352"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Supplier */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'المورد (Supplier):' : 'Supplier:'}
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Supplier A"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Available Quantity */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'الكمية المتاحة (Available Qty):' : 'Available Qty:'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={availableQty}
                      onChange={(e) => setAvailableQty(Number(e.target.value))}
                      placeholder="1000"
                      min={1}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                      BAG
                    </span>
                  </div>
                </div>

                {/* Loading Quantity */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'كمية التحميل (Loading Qty):' : 'Loading Qty:'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={loadingQty}
                      onChange={(e) => setLoadingQty(Number(e.target.value))}
                      placeholder="750"
                      min={1}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 font-mono font-black text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-amber-600 dark:text-amber-400 font-bold">
                      BAG
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* BROKER LOAD FORM FIELDS                                   */
            /* ======================================================== */
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60 dark:border-indigo-800/40">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  {isAr ? 'بيانات حمولة الوسيط' : 'Broker Assignment Specifications'}
                </span>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-mono">
                  Broker Logistics Partner
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Broker Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'اسم الوسيط (Broker):' : 'Broker:'}
                  </label>
                  <input
                    type="text"
                    value={brokerName}
                    onChange={(e) => setBrokerName(e.target.value)}
                    placeholder="ABC Broker"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Supplier / Source */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'المورد / المصدر (Supplier / Source):' : 'Supplier / Source:'}
                  </label>
                  <input
                    type="text"
                    value={brokerSupplierSource}
                    onChange={(e) => setBrokerSupplierSource(e.target.value)}
                    placeholder="Supplier B"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* TLB Number (if applicable) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'رقم السند (TLB - إن وجد):' : 'TLB (if applicable):'}
                  </label>
                  <input
                    type="text"
                    value={brokerTlbNumber}
                    onChange={(e) => setBrokerTlbNumber(e.target.value)}
                    placeholder="9100042352"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'الكمية (Quantity):' : 'Quantity:'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={brokerQty}
                      onChange={(e) => setBrokerQty(Number(e.target.value))}
                      placeholder="750"
                      min={1}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-200 font-mono font-black text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                      BAG
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. DRIVER & TRUCK ASSIGNMENT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Driver */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'السائق (Driver):' : 'Driver:'}
              </label>
              <select
                value={driverId}
                onChange={(e) => {
                  setDriverId(e.target.value);
                  const d = drivers.find((drv) => drv.id === e.target.value);
                  if (d?.assignedVehiclePlate) {
                    const matchVeh = vehicles.find((v) => v.plateNumber === d.assignedVehiclePlate);
                    if (matchVeh) setVehicleId(matchVeh.id);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.assignedVehiclePlate || 'Truck'}) — {d.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Truck */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'الشاحنة (Truck):' : 'Truck:'}
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.model || v.type}) — {v.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. LOADING DATE & NOTES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Loading Date */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'تاريخ التحميل (Loading Date):' : 'Loading Date:'}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={loadingDate}
                  onChange={(e) => setLoadingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'ملاحظات التحميل:' : 'Loading Notes:'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  loadType === 'gypsum'
                    ? 'e.g. Standard loading bay gate 2'
                    : 'e.g. Reference broker booking code'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Dispatch Target:</span>
              <span className="font-black text-slate-900 dark:text-white">
                {selectedDriver?.name} ({selectedVehicle?.plateNumber})
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-blue-600 dark:text-blue-400">
              <span>
                {loadType === 'gypsum' ? loadingQty : brokerQty} BAG
              </span>
              <span className="text-[10px] text-slate-400 font-sans">
                ({loadType === 'gypsum' ? 'Gypsum TLB' : 'Broker Cargo'})
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              id="btn-assign-load"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isAr ? 'تعيين وتأكيد الحمولة' : 'ASSIGN LOAD'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { WarehouseItem } from '../types';
import { X, Package, Tag, Layers, DollarSign, AlertTriangle, Thermometer } from 'lucide-react';

interface WarehouseItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<WarehouseItem, 'id'> | Partial<WarehouseItem>) => void;
  initialData?: WarehouseItem | null;
  language?: 'en' | 'ar';
}

export const WarehouseItemModal: React.FC<WarehouseItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  language = 'en',
}) => {
  const isAr = language === 'ar';

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Construction Materials');
  const [aisle, setAisle] = useState('A-01');
  const [rack, setRack] = useState('R-01');
  const [bay, setBay] = useState('B-01');
  const [quantityOnHand, setQuantityOnHand] = useState(100);
  const [minimumThreshold, setMinimumThreshold] = useState(25);
  const [unit, setUnit] = useState('TON');
  const [unitCost, setUnitCost] = useState(45);
  const [sellingPrice, setSellingPrice] = useState(65);
  const [isTemperatureControlled, setIsTemperatureControlled] = useState(false);
  const [targetTemp, setTargetTemp] = useState('20°C');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setSku(initialData.sku || '');
      setBarcode(initialData.barcode || '');
      setCategory(initialData.category || 'Construction Materials');
      setAisle(initialData.aisle || 'A-01');
      setRack(initialData.rack || 'R-01');
      setBay(initialData.bay || 'B-01');
      setQuantityOnHand(initialData.quantityOnHand ?? 0);
      setMinimumThreshold(initialData.minimumThreshold ?? 25);
      setUnit(initialData.unit || 'TON');
      setUnitCost(initialData.unitCost ?? 45);
      setSellingPrice(initialData.sellingPrice ?? 65);
      setIsTemperatureControlled(!!initialData.isTemperatureControlled);
      setTargetTemp(initialData.targetTemp || '20°C');
    } else {
      setName('');
      setSku(`SKU-${Date.now().toString().slice(-4)}`);
      setBarcode(`628${Math.floor(100000000 + Math.random() * 900000000)}`);
      setCategory('Construction Materials');
      setAisle('A-01');
      setRack('R-01');
      setBay('B-01');
      setQuantityOnHand(100);
      setMinimumThreshold(25);
      setUnit('TON');
      setUnitCost(45);
      setSellingPrice(65);
      setIsTemperatureControlled(false);
      setTargetTemp('20°C');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: barcode.trim() || `628${Math.floor(100000000 + Math.random() * 900000000)}`,
      category,
      aisle: aisle.trim() || 'A-01',
      rack: rack.trim() || 'R-01',
      bay: bay.trim() || 'B-01',
      quantityOnHand: Number(quantityOnHand) || 0,
      minimumThreshold: Number(minimumThreshold) || 10,
      unit: unit.trim() || 'TON',
      unitCost: Number(unitCost) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      isTemperatureControlled,
      targetTemp: isTemperatureControlled ? targetTemp : undefined,
      lastStockCheck: initialData?.lastStockCheck || new Date().toISOString().split('T')[0],
      totalStockIn: initialData?.totalStockIn ?? (Number(quantityOnHand) || 0),
      totalStockOut: initialData?.totalStockOut ?? 0,
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
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {initialData
                  ? (isAr ? 'تعديل صنف المستودع' : 'Edit Warehouse Stock SKU')
                  : (isAr ? 'إضافة صنف جديد لدليل المستودع' : 'Add New Warehouse Stock SKU')}
              </h3>
              <p className="text-xs text-slate-500">
                {initialData ? `SKU: ${initialData.sku}` : (isAr ? 'تسجيل صنف وموقع التخزين والحدود' : 'Catalog SKU, location bay & price metrics')}
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
          {/* Item Name */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم الصنف / المادة *' : 'Item Description / Name *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TLB Bulk (Truck Load Bulk)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* SKU & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رمز الصنف (SKU)' : 'Item SKU'}
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الباركود الرقمي (EAN/UPC)' : 'Barcode EAN/UPC'}
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تصنيف المادة' : 'Product Category'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
            >
              <option value="Construction Materials">Construction Materials</option>
              <option value="Raw Minerals & Gypsum">Raw Minerals & Gypsum</option>
              <option value="Packaging & Pallets">Packaging & Pallets</option>
              <option value="Chemicals & Additives">Chemicals & Additives</option>
              <option value="General Cargo">General Cargo</option>
            </select>
          </div>

          {/* Warehouse Location (Aisle, Rack, Bay) */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'موقع التخزين (الممر / الرف / الخانة)' : 'Storage Location (Aisle / Rack / Bay)'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  type="text"
                  placeholder="Aisle (e.g. A-01)"
                  value={aisle}
                  onChange={(e) => setAisle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs text-center"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Rack (e.g. R-01)"
                  value={rack}
                  onChange={(e) => setRack(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs text-center"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Bay (e.g. B-01)"
                  value={bay}
                  onChange={(e) => setBay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs text-center"
                />
              </div>
            </div>
          </div>

          {/* Stock Quantity, Minimum Threshold & UOM */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الكمية الحالية' : 'Stock On Hand'}
              </label>
              <input
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'حد التنبيه' : 'Min Alert Level'}
              </label>
              <input
                type="number"
                value={minimumThreshold}
                onChange={(e) => setMinimumThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الوحدة (UOM)' : 'Unit (UOM)'}
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
              >
                <option value="TON">TON</option>
                <option value="BAG">BAG</option>
                <option value="PALLET">PALLET</option>
                <option value="CARTON">CARTON</option>
                <option value="KG">KG</option>
                <option value="CBM">CBM</option>
                <option value="LITER">LITER</option>
              </select>
            </div>
          </div>

          {/* Pricing: Unit Cost & Selling Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'سعر التكلفة (SAR)' : 'Unit Cost (SAR)'}
              </label>
              <input
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'سعر البيع (SAR)' : 'Selling Price (SAR)'}
              </label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>

          {/* Cold chain storage toggle */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={isTemperatureControlled}
                onChange={(e) => setIsTemperatureControlled(e.target.checked)}
                className="rounded-lg text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-blue-500" />
                <span>{isAr ? 'يتطلب تخزين مبرد / حساس للحرارة' : 'Requires Cold Storage / Climate Control'}</span>
              </span>
            </label>
            {isTemperatureControlled && (
              <div className="pl-6 pt-1">
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'درجة الحرارة المستهدفة' : 'Target Temperature'}
                </label>
                <input
                  type="text"
                  value={targetTemp}
                  onChange={(e) => setTargetTemp(e.target.value)}
                  placeholder="e.g. -18°C or 4°C - 8°C"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Package className="w-4 h-4" />
              <span>{initialData ? (isAr ? 'حفظ التعديلات' : 'Save SKU Changes') : (isAr ? 'إضافة للصنف' : 'Add to Catalog')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

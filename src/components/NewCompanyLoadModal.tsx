import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Plus,
  Truck,
  Boxes,
  MapPin,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';

interface NewCompanyLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewCompanyLoadModal: React.FC<NewCompanyLoadModalProps> = ({ isOpen, onClose }) => {
  const {
    customers,
    drivers,
    vehicles,
    warehouseItems,
    locations,
    createCompanyLoad,
    showToast,
  } = useApp();

  // 1. Select Customer
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || 'cust_1');
  const [customerName, setCustomerName] = useState<string>(customers[0]?.name || 'Admin Central Warehouse');

  // 2. Select Product & DN from TLB Main Inventory
  // Find TLB items in inventory
  const tlbItems = warehouseItems.filter(
    (it) => it.category.includes('TLB') || it.name.toLowerCase().includes('tlb') || it.sku.includes('TLB') || (it.dnNumber && it.dnNumber.startsWith('DN-'))
  );
  const activeTlbList = tlbItems.length > 0 ? tlbItems : warehouseItems;

  const [selectedDnNo, setSelectedDnNo] = useState<string>(activeTlbList[0]?.dnNumber || 'DN-001');
  const [itemName, setItemName] = useState<string>(
    activeTlbList[0]?.name?.includes('–') ? activeTlbList[0].name.split('–')[0].trim() : (activeTlbList[0]?.name || 'Gypsum Powder')
  );
  const [itemDescription, setItemDescription] = useState<string>(
    activeTlbList[0]?.name || 'Gypsum Powder – Bags, Regular 40 kg'
  );
  const [itemNumber, setItemNumber] = useState<string>(activeTlbList[0]?.sku || '1290000001');
  const [requiredQty, setRequiredQty] = useState<number>(500);

  // 3. Driver & Truck
  const [driverId, setDriverId] = useState<string>(drivers[0]?.id || 'drv_1');
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id || 'veh_1');

  // 4. Pickup / Supplier & Drop / Delivery Location
  const [supplierName, setSupplierName] = useState<string>('El-Khayyat Gypsum Plant & Industrial Quarry');
  const [pickupCity, setPickupCity] = useState<string>('Rabigh');
  const [dropLocationName, setDropLocationName] = useState<string>('Admin Central Warehouse Bay B-04');
  const [dropCity, setDropCity] = useState<string>('Riyadh');

  // 5. Driver Trip Rate
  const [driverTripRate, setDriverTripRate] = useState<number>(250);
  const [freightPrice, setFreightPrice] = useState<number>(3500);
  const [notes, setNotes] = useState<string>('Company Load: Reserve from TLB Main Inventory, collect at supplier, inward to Admin warehouse.');

  if (!isOpen) return null;

  // Selected item details for stock preview
  const selectedInventoryItem = activeTlbList.find(
    (it) => it.dnNumber === selectedDnNo || it.sku === selectedDnNo
  ) || activeTlbList[0];

  const totalOnHand = selectedInventoryItem ? selectedInventoryItem.quantityOnHand : 750;
  const currentReserved = selectedInventoryItem ? (selectedInventoryItem.reservedQuantity || 0) : 0;
  const availableQty = totalOnHand - currentReserved;
  const isStockSufficient = availableQty >= requiredQty && requiredQty > 0;

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) setCustomerName(found.name);
  };

  const handleDnChange = (dn: string) => {
    setSelectedDnNo(dn);
    const it = activeTlbList.find((item) => item.dnNumber === dn || item.sku === dn);
    if (it) {
      const cleanName = it.name?.includes('–') ? it.name.split('–')[0].trim() : (it.name || 'Gypsum Powder');
      setItemName(cleanName);
      setItemDescription(it.name || `${cleanName} – Bags, Regular 40 kg`);
      setItemNumber(it.sku || '1290000001');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStockSufficient) {
      showToast(
        'Stock Unavailable',
        `Requested ${requiredQty} exceeds available ${availableQty} on ${selectedDnNo}.`,
        'error'
      );
      return;
    }

    const driverObj = drivers.find((d) => d.id === driverId);
    const vehicleObj = vehicles.find((v) => v.id === vehicleId);

    const pickupLocation = {
      id: 'loc_supp_' + Date.now(),
      name: supplierName,
      city: pickupCity,
      address: `${supplierName}, Industrial Area, ${pickupCity}`,
      lat: 22.7986,
      lng: 39.0347,
      category: 'plant',
    };

    const dropLocation = {
      id: 'loc_admin_' + Date.now(),
      name: dropLocationName,
      city: dropCity,
      address: `${dropLocationName}, Logistics Zone Exit 18, ${dropCity}`,
      lat: 24.6408,
      lng: 46.8225,
      category: 'warehouse',
    };

    const result = createCompanyLoad({
      customerId,
      customerName,
      product: itemDescription || itemName,
      itemName: itemName,
      itemDescription: itemDescription,
      itemNumber: itemNumber,
      requiredQty: Number(requiredQty),
      reservedDnNo: selectedDnNo,
      driverId,
      driverName: driverObj?.name || 'Ahmed',
      vehicleId,
      vehiclePlate: vehicleObj?.plateNumber || 'T-101',
      pickupLocation,
      dropLocation,
      price: Number(freightPrice),
      driverTripRate: Number(driverTripRate),
      notes,
    });

    if (result.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        id="new-company-load-modal"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Boxes className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Create Company Load</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black uppercase">
                  TLB Inventory Flow
                </span>
              </div>
              <p className="text-xs text-purple-100 font-medium">
                Reserve stock from TLB Main Inventory & assign driver to collect from supplier for Admin Inward.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Step 1 & 2: Inventory Reservation Preview */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
                <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                TLB Main Inventory Reservation (Step 1 & 2)
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                Marked &quot;Reserved / In Loading&quot;
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Select Inventory DN No. */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select TLB Batch / DN No. *
                </label>
                <select
                  value={selectedDnNo ?? ""}
                  onChange={(e) => handleDnChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                >
                  {activeTlbList.map((item) => (
                    <option key={item.id} value={item.dnNumber || item.sku}>
                      {item.dnNumber || item.sku} — {item.name} ({item.quantityOnHand - (item.reservedQuantity || 0)} Available)
                    </option>
                  ))}
                </select>
              </div>

              {/* Required Quantity */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Required Qty (TLB Units / Bags) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableQty}
                  value={requiredQty ?? ""}
                  onChange={(e) => setRequiredQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                  required
                />
              </div>
            </div>

            {/* Live Inventory Math Bar */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Total Stock: <strong className="text-slate-900 dark:text-white">{totalOnHand}</strong></span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">Currently Reserved: {currentReserved}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">Available: {availableQty}</span>
              </div>
              <div className="font-mono font-bold">
                {isStockSufficient ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Reserve {requiredQty}
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Insufficient Stock
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer & Item Description Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Customer / Account *
              </label>
              <select
                value={customerId ?? ""}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Item Description
              </label>
              <input
                type="text"
                value={itemDescription ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setItemDescription(val);
                  setItemName(val.includes('–') ? val.split('–')[0].trim() : val);
                }}
                placeholder="e.g. Gypsum Powder – Bags, Regular 40 kg"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                required
              />
            </div>
          </div>

          {/* Step 3: Driver & Truck Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Driver *
              </label>
              <select
                value={driverId ?? ""}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                required
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — Status: {d.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Truck / Plate *
              </label>
              <select
                value={vehicleId ?? ""}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-semibold"
                required
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.truckModel} • {v.capacityTonnes}T)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pickup / Supplier & Drop / Delivery Location */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <MapPin className="w-4 h-4 text-blue-600" /> Route & Facilities
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Pickup / Supplier Location *
                </label>
                <input
                  type="text"
                  value={supplierName ?? ""}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                  placeholder="Supplier A / Quarry"
                  required
                />
                <input
                  type="text"
                  value={pickupCity ?? ""}
                  onChange={(e) => setPickupCity(e.target.value)}
                  className="w-full mt-1 px-3 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                  placeholder="City (e.g. Rabigh)"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Destination / Inward Warehouse *
                </label>
                <input
                  type="text"
                  value={dropLocationName ?? ""}
                  onChange={(e) => setDropLocationName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                  placeholder="Admin Central Warehouse"
                  required
                />
                <input
                  type="text"
                  value={dropCity ?? ""}
                  onChange={(e) => setDropCity(e.target.value)}
                  className="w-full mt-1 px-3 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                  placeholder="City (e.g. Riyadh)"
                />
              </div>
            </div>
          </div>

          {/* Rates & Audit Trail Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Driver Trip Rate (SAR)
              </label>
              <input
                type="number"
                value={driverTripRate ?? ""}
                onChange={(e) => setDriverTripRate(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Total Freight Price (SAR)
              </label>
              <input
                type="number"
                value={freightPrice ?? ""}
                onChange={(e) => setFreightPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Audit Notice */}
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-300 flex items-start gap-2">
            <Lock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Master Audit Guarantee:</span> Creating this Company Load will generate a SHA-256 sealed transaction recording stock reservation on {selectedDnNo}, driver assignment, and will require Admin inward verification.
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isStockSufficient}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center gap-2"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Create Load &amp; Reserve Stock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

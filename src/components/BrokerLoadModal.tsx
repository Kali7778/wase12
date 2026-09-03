import React, { useState, useEffect } from 'react';
import { BrokerLoad, BrokerDropLocation, BrokerLoadStatus, BrokerDropStatus } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  Plus,
  Trash2,
  Upload,
  FileText,
  MapPin,
  Truck,
  User,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Hash,
  Clock,
  ArrowRight
} from 'lucide-react';

interface BrokerLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadToEdit?: BrokerLoad | null;
  onSave?: (load: BrokerLoad) => void;
}

const COMMON_BROKERS = [
  'Al-Futtaim Freight Brokers',
  'Gulf Express Logistics Broker',
  'Red Sea Cargo Carriers & Brokers',
  'Arabian Overland Brokerage',
  'Najd Logistics & Freight Co.',
  'Saudi Trans-Continental Brokers',
  'Al-Majdouie Freight Brokerage',
];

const COMMON_MATERIALS = [
  'Gypsum Board 12.5mm Standard (Palletized)',
  'Bulk White Cement Bags (50kg)',
  'Steel Wire Mesh & Reinforcement Ties',
  'Special Dry Mortar Premix (TLB Bulk)',
  'Portland Cement Type I/II (50kg Bags)',
  'Heavy Duty Plaster & Joint Compound',
  'High-Grade Silica Sand (Bulk Jumbo Bags)',
];

const COMMON_PICKUP_LOCATIONS = [
  'Yanbu Industrial Terminal (Bay 3)',
  'Rabigh Cement Plant Terminal Silo 2',
  'Dammam Port Customs Zone Gate 7',
  'Jeddah Industrial City Phase 3',
  'Riyadh Dry Port Logistic Yard',
  'Ras Al-Khair Industrial Silo Complex',
];

export const BrokerLoadModal: React.FC<BrokerLoadModalProps> = ({
  isOpen,
  onClose,
  loadToEdit,
  onSave,
}) => {
  const { drivers, vehicles, addBrokerLoad, updateBrokerLoad, showToast, language } = useApp();
  const isAr = language === 'ar';

  // Form states
  const [dnNumber, setDnNumber] = useState('');
  const [slipDate, setSlipDate] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [materialItem, setMaterialItem] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [assignedTruckPlate, setAssignedTruckPlate] = useState('');
  const [assignedTruckTlbNo, setAssignedTruckTlbNo] = useState('');
  const [freightAmount, setFreightAmount] = useState<number | ''>(4500);
  const [brokerCommission, setBrokerCommission] = useState<number | ''>(450);
  const [loadStatus, setLoadStatus] = useState<BrokerLoadStatus>('Pending');
  const [notes, setNotes] = useState('');
  const [attachedPdfUrl, setAttachedPdfUrl] = useState<string | undefined>(undefined);
  const [attachedPdfName, setAttachedPdfName] = useState<string | undefined>(undefined);

  // Drop Locations list
  const [dropLocations, setDropLocations] = useState<BrokerDropLocation[]>([
    {
      id: 'drop_init_1',
      stopNumber: 1,
      dropLocation: '',
      deliveryQty: 250,
      unit: 'BAG',
      status: 'Pending',
    },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when opening or editing
  useEffect(() => {
    if (loadToEdit) {
      setDnNumber(loadToEdit.dnNumber || '');
      setSlipDate(loadToEdit.slipDate || new Date().toISOString().split('T')[0]);
      setBrokerName(loadToEdit.brokerName || '');
      setMaterialItem(loadToEdit.materialItem || '');
      setPickupLocation(loadToEdit.pickupLocation || '');
      setAssignedDriverId(loadToEdit.assignedDriverId || '');
      setAssignedTruckPlate(loadToEdit.assignedTruckPlate || '');
      setAssignedTruckTlbNo(loadToEdit.assignedTruckTlbNo || '');
      setFreightAmount(loadToEdit.freightAmount ?? 0);
      setBrokerCommission(loadToEdit.brokerCommission ?? 0);
      setLoadStatus(loadToEdit.loadStatus || 'Pending');
      setNotes(loadToEdit.notes || '');
      setAttachedPdfUrl(loadToEdit.attachedPdfUrl);
      setAttachedPdfName(loadToEdit.attachedPdfName);
      setDropLocations(
        loadToEdit.dropLocations && loadToEdit.dropLocations.length > 0
          ? loadToEdit.dropLocations
          : [
              {
                id: 'drop_init_1',
                stopNumber: 1,
                dropLocation: '',
                deliveryQty: 250,
                unit: 'BAG',
                status: 'Pending',
              },
            ]
      );
    } else {
      // Auto-generate fresh values
      const randomDn = `DN-BRK-${Math.floor(1000 + Math.random() * 9000)}`;
      setDnNumber(randomDn);
      setSlipDate(new Date().toISOString().split('T')[0]);
      setBrokerName('');
      setMaterialItem('');
      setPickupLocation('Yanbu Industrial Terminal (Bay 3)');
      setAssignedDriverId('');
      setAssignedTruckPlate('');
      setAssignedTruckTlbNo('');
      setFreightAmount(4500);
      setBrokerCommission(450);
      setLoadStatus('Pending');
      setNotes('');
      setAttachedPdfUrl(undefined);
      setAttachedPdfName(undefined);
      setDropLocations([
        {
          id: 'drop_' + Date.now() + '_1',
          stopNumber: 1,
          dropLocation: 'Riyadh Al-Sulay Logistics Depot (Gate 4)',
          deliveryQty: 350,
          unit: 'BAG',
          status: 'Pending',
        },
        {
          id: 'drop_' + Date.now() + '_2',
          stopNumber: 2,
          dropLocation: 'Al-Kharj Industrial Supply Center',
          deliveryQty: 200,
          unit: 'BAG',
          status: 'Pending',
        },
      ]);
    }
    setErrors({});
  }, [loadToEdit, isOpen]);

  if (!isOpen) return null;

  // When driver selected, auto-fill truck plate if available
  const handleDriverChange = (driverId: string) => {
    setAssignedDriverId(driverId);
    if (driverId) {
      const selected = drivers.find((d) => d.id === driverId);
      if (selected?.assignedVehiclePlate && !assignedTruckPlate) {
        setAssignedTruckPlate(selected.assignedVehiclePlate);
        setAssignedTruckTlbNo(`TLB-${selected.assignedVehiclePlate.replace(/\D/g, '') || '9101'}`);
      }
      if (loadStatus === 'Pending') {
        setLoadStatus('Assigned');
      }
    }
  };

  // Add a new Drop Location stop
  const handleAddDropLocation = () => {
    const nextStop = dropLocations.length + 1;
    const newStop: BrokerDropLocation = {
      id: 'drop_' + Date.now() + '_' + nextStop,
      stopNumber: nextStop,
      dropLocation: '',
      deliveryQty: 100,
      unit: 'BAG',
      status: 'Pending',
    };
    setDropLocations([...dropLocations, newStop]);
  };

  // Remove a Drop Location stop
  const handleRemoveDropLocation = (id: string) => {
    if (dropLocations.length <= 1) {
      showToast('Minimum Stop Required', 'A broker load must have at least one drop location.', 'warning');
      return;
    }
    const filtered = dropLocations
      .filter((d) => d.id !== id)
      .map((d, index) => ({
        ...d,
        stopNumber: index + 1,
      }));
    setDropLocations(filtered);
  };

  // Update a single field on a stop
  const handleUpdateStopField = (
    id: string,
    field: keyof BrokerDropLocation,
    value: string | number
  ) => {
    setDropLocations(
      dropLocations.map((drop) => {
        if (drop.id === id) {
          return {
            ...drop,
            [field]: value,
          };
        }
        return drop;
      })
    );
  };

  // Auto-generate DN Number
  const handleGenerateDn = () => {
    const randomDn = `DN-BRK-${Math.floor(1000 + Math.random() * 9000)}`;
    setDnNumber(randomDn);
  };

  // Handle PDF file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedPdfUrl(reader.result as string);
      setAttachedPdfName(file.name);
      showToast('File Attached', `Attached: ${file.name}`, 'info');
    };
    reader.readAsDataURL(file);
  };

  // Attach sample mock slip
  const handleAttachSampleSlip = () => {
    const sampleSlip = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:%23fafafa;font-family:sans-serif;">
      <rect width="600" height="800" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="4"/>
      <rect x="25" y="25" width="550" height="70" fill="%231e293b" rx="8"/>
      <text x="45" y="55" fill="%23ffffff" font-size="18" font-weight="bold">BROKER CONSIGNMENT NOTE &amp; SLIP</text>
      <text x="45" y="78" fill="%2338bdf8" font-size="12">Multi-Drop Logistics Manifest | DN: ${dnNumber}</text>
      <text x="420" y="65" fill="%23facc15" font-size="14" font-weight="bold">${slipDate}</text>
      
      <text x="40" y="130" font-size="12" font-weight="bold" fill="%23334155">Broker Company:</text>
      <text x="180" y="130" font-size="13" font-weight="bold" fill="%230f172a">${brokerName || 'Al-Futtaim Freight Brokers'}</text>
      
      <text x="40" y="160" font-size="12" font-weight="bold" fill="%23334155">Cargo / Material:</text>
      <text x="180" y="160" font-size="13" font-weight="bold" fill="%230f172a">${materialItem || 'Special Gypsum Board'}</text>

      <text x="40" y="190" font-size="12" font-weight="bold" fill="%23334155">Pickup Depot:</text>
      <text x="180" y="190" font-size="13" font-weight="bold" fill="%230369a1">${pickupLocation || 'Yanbu Terminal'}</text>

      <line x1="40" y1="215" x2="560" y2="215" stroke="%23e2e8f0" stroke-width="2"/>

      <text x="40" y="245" font-size="13" font-weight="bold" fill="%231e293b">Assigned Drops Schedule:</text>
      ${dropLocations.map((d, i) => `
        <rect x="40" y="${265 + i * 45}" width="520" height="36" fill="%23f8fafc" stroke="%23e2e8f0" rx="4"/>
        <text x="55" y="${288 + i * 45}" font-size="12" font-weight="bold" fill="%23475569">Stop #${d.stopNumber}:</text>
        <text x="120" y="${288 + i * 45}" font-size="12" font-weight="bold" fill="%230f172a">${d.dropLocation || 'Site Point'}</text>
        <text x="420" y="${288 + i * 45}" font-size="12" font-weight="bold" fill="%23059669">${d.deliveryQty} ${d.unit || 'BAG'}</text>
      `).join('')}

      <rect x="40" y="650" width="240" height="90" fill="none" stroke="%23cbd5e1" stroke-dasharray="4" rx="6"/>
      <text x="50" y="675" font-size="10" font-weight="bold" fill="%2364748b">DISPATCHER STAMP &amp; SIGN</text>
      
      <rect x="320" y="650" width="240" height="90" fill="none" stroke="%23cbd5e1" stroke-dasharray="4" rx="6"/>
      <text x="330" y="675" font-size="10" font-weight="bold" fill="%2364748b">DRIVER ACKNOWLEDGMENT</text>
    </svg>`;

    setAttachedPdfUrl(sampleSlip);
    setAttachedPdfName(`${dnNumber}_Consignment_Slip.pdf`);
    showToast('Sample PDF Generated', 'Official Broker Consignment Slip attached.', 'success');
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!dnNumber.trim()) newErrors.dnNumber = 'DN No. is required';
    if (!slipDate) newErrors.slipDate = 'Slip date is required';
    if (!brokerName.trim()) newErrors.brokerName = 'Broker Name is required';
    if (!materialItem.trim()) newErrors.materialItem = 'Material / Item is required';
    if (!pickupLocation.trim()) newErrors.pickupLocation = 'Pickup Location is required';

    // Validate drop locations
    const emptyDrop = dropLocations.find((d) => !d.dropLocation.trim());
    if (emptyDrop) {
      newErrors.dropLocations = `Please enter location for Stop #${emptyDrop.stopNumber}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Validation Error', 'Please complete all required fields.', 'error');
      return;
    }

    const driverObj = drivers.find((d) => d.id === assignedDriverId);

    const brokerLoadData = {
      dnNumber: dnNumber.trim(),
      slipDate,
      brokerName: brokerName.trim(),
      materialItem: materialItem.trim(),
      pickupLocation: pickupLocation.trim(),
      dropLocations: dropLocations.map((d, idx) => ({
        ...d,
        stopNumber: idx + 1,
        deliveryQty: Number(d.deliveryQty) || 0,
      })),
      assignedDriverId: assignedDriverId || undefined,
      assignedDriverName: driverObj?.name || (assignedDriverId ? assignedDriverId : undefined),
      assignedDriverPhone: driverObj?.phone || undefined,
      assignedTruckPlate: assignedTruckPlate.trim() || undefined,
      assignedTruckTlbNo: assignedTruckTlbNo.trim() || undefined,
      freightAmount: Number(freightAmount) || 0,
      brokerCommission: Number(brokerCommission) || 0,
      loadStatus,
      notes: notes.trim() || undefined,
      attachedPdfUrl,
      attachedPdfName,
    };

    if (loadToEdit) {
      updateBrokerLoad(loadToEdit.id, brokerLoadData);
      if (onSave) onSave({ ...loadToEdit, ...brokerLoadData, updatedAt: new Date().toISOString() });
    } else {
      const created = addBrokerLoad(brokerLoadData);
      if (onSave) onSave(created);
    }

    onClose();
  };

  const totalDeliveryQty = dropLocations.reduce((sum, d) => sum + (Number(d.deliveryQty) || 0), 0);
  const netFreight = (Number(freightAmount) || 0) - (Number(brokerCommission) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>{loadToEdit ? 'Edit Broker Load' : 'Add Broker Load'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  Multi-Drop
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Independent Broker Consignment with Multiple Delivery Stops
              </p>
            </div>
          </div>
          <button
            id="close-broker-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto custom-scrollbar">
          {/* Section 1: Core Broker Load Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-amber-500" />
                <span>1. Consignment &amp; Broker Identification</span>
              </h3>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                * Required Fields
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* DN No. */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  DN No. *
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="broker-dn-number"
                    type="text"
                    value={dnNumber}
                    onChange={(e) => setDnNumber(e.target.value)}
                    placeholder="e.g. DN-BRK-8921"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateDn}
                    title="Auto generate DN Number"
                    className="px-2.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </button>
                </div>
                {errors.dnNumber && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.dnNumber}
                  </p>
                )}
              </div>

              {/* Slip Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Slip Date *
                </label>
                <div className="relative">
                  <input
                    id="broker-slip-date"
                    type="date"
                    value={slipDate}
                    onChange={(e) => setSlipDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                {errors.slipDate && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.slipDate}
                  </p>
                )}
              </div>

              {/* Load Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Load Status
                </label>
                <select
                  id="broker-load-status"
                  value={loadStatus}
                  onChange={(e) => setLoadStatus(e.target.value as BrokerLoadStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="Pending">Pending (قيد الانتظار)</option>
                  <option value="Assigned">Assigned (تم التعيين)</option>
                  <option value="In Transit">In Transit (في الطريق)</option>
                  <option value="Delivered">Delivered (تم التوصيل بالكامل)</option>
                  <option value="Cancelled">Cancelled (ملغى)</option>
                </select>
              </div>

              {/* Broker Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Broker Name *
                </label>
                <input
                  id="broker-name-input"
                  list="broker-suggestions"
                  type="text"
                  value={brokerName}
                  onChange={(e) => setBrokerName(e.target.value)}
                  placeholder="Select or enter broker name (e.g. Al-Futtaim Freight Brokers)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <datalist id="broker-suggestions">
                  {COMMON_BROKERS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                {errors.brokerName && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.brokerName}
                  </p>
                )}
              </div>

              {/* Material / Item */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Material / Item *
                </label>
                <input
                  id="broker-material-input"
                  list="material-suggestions"
                  type="text"
                  value={materialItem}
                  onChange={(e) => setMaterialItem(e.target.value)}
                  placeholder="e.g. Gypsum Board 12.5mm"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <datalist id="material-suggestions">
                  {COMMON_MATERIALS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                {errors.materialItem && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.materialItem}
                  </p>
                )}
              </div>

              {/* Pickup Location */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pickup Location *</span>
                </label>
                <input
                  id="broker-pickup-location"
                  list="pickup-suggestions"
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="e.g. Yanbu Industrial Terminal (Bay 3) or Rabigh Silo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <datalist id="pickup-suggestions">
                  {COMMON_PICKUP_LOCATIONS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                {errors.pickupLocation && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.pickupLocation}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: MULTIPLE DROP LOCATIONS (Core User Request) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>Multiple Drop Locations (محطات التوصيل المتعددة)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    {dropLocations.length} Stops
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Each drop stop is tracked independently: Pending → In Transit → Delivered
                </p>
              </div>

              {/* Required button: ➕ Add Drop Location */}
              <button
                id="btn-add-drop-location"
                type="button"
                onClick={handleAddDropLocation}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>➕ Add Drop Location</span>
              </button>
            </div>

            {errors.dropLocations && (
              <p className="text-xs text-rose-500 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.dropLocations}
              </p>
            )}

            {/* Stops Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-16 text-center">Stop</th>
                    <th className="py-2.5 px-3 min-w-[240px]">Drop Location</th>
                    <th className="py-2.5 px-3 w-32">Delivery Qty</th>
                    <th className="py-2.5 px-3 w-28">Unit</th>
                    <th className="py-2.5 px-3 w-36">Status</th>
                    <th className="py-2.5 px-3 w-14 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80 bg-white dark:bg-slate-900">
                  {dropLocations.map((stop, idx) => (
                    <tr key={stop.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      {/* Stop # */}
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-700 dark:text-slate-200">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 inline-flex items-center justify-center text-xs">
                          {stop.stopNumber || idx + 1}
                        </span>
                      </td>

                      {/* Drop Location */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={stop.dropLocation}
                          onChange={(e) => handleUpdateStopField(stop.id, 'dropLocation', e.target.value)}
                          placeholder={`Enter Drop Location #${idx + 1} (e.g. Riyadh Depot Gate 4)`}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </td>

                      {/* Delivery Qty */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          value={stop.deliveryQty}
                          onChange={(e) => handleUpdateStopField(stop.id, 'deliveryQty', Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-3">
                        <select
                          value={stop.unit || 'BAG'}
                          onChange={(e) => handleUpdateStopField(stop.id, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none"
                        >
                          <option value="BAG">BAG (كيس)</option>
                          <option value="TON">TON (طن)</option>
                          <option value="PALLET">PALLET (طبلية)</option>
                          <option value="PCS">PCS (قطعة)</option>
                          <option value="CBM">CBM (م³)</option>
                        </select>
                      </td>

                      {/* Status: Pending -> In Transit -> Delivered */}
                      <td className="py-2 px-3">
                        <select
                          value={stop.status}
                          onChange={(e) => handleUpdateStopField(stop.id, 'status', e.target.value as BrokerDropStatus)}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border transition-colors ${
                            stop.status === 'Delivered'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                              : stop.status === 'In Transit'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300'
                          }`}
                        >
                          <option value="Pending">Pending (قيد الانتظار)</option>
                          <option value="In Transit">In Transit (في الطريق)</option>
                          <option value="Delivered">Delivered (تم التسليم)</option>
                        </select>
                      </td>

                      {/* Action */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveDropLocation(stop.id)}
                          disabled={dropLocations.length <= 1}
                          title="Remove Stop"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total summary bar */}
            <div className="flex flex-wrap items-center justify-between text-xs bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
              <span>Total Stops: <strong className="text-slate-900 dark:text-white">{dropLocations.length}</strong></span>
              <span>Total Delivery Quantity: <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{totalDeliveryQty.toLocaleString()} units</strong></span>
            </div>
          </div>

          {/* Section 3: Driver & Truck Assignment */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-500" />
              <span>3. Dispatch Driver &amp; Truck Assignment</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Assigned Driver */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span>Assigned Driver</span>
                </label>
                <select
                  id="broker-assigned-driver"
                  value={assignedDriverId}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Unassigned (Select Driver) --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.assignedVehiclePlate || 'No Truck'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned Truck / Plate */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Assigned Truck Plate</span>
                </label>
                <input
                  id="broker-assigned-truck"
                  list="vehicle-suggestions"
                  type="text"
                  value={assignedTruckPlate}
                  onChange={(e) => setAssignedTruckPlate(e.target.value)}
                  placeholder="e.g. T-101 / KSA 1120 XAA"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <datalist id="vehicle-suggestions">
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.plateNumber}>
                      {v.plateNumber} ({v.model || 'Heavy Haul'})
                    </option>
                  ))}
                </datalist>
              </div>

              {/* TLB No. */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-blue-500" />
                  <span>TLB No.</span>
                </label>
                <input
                  id="broker-assigned-tlb"
                  type="text"
                  value={assignedTruckTlbNo}
                  onChange={(e) => setAssignedTruckTlbNo(e.target.value)}
                  placeholder="e.g. TLB-91042"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Financials & Notes */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>4. Freight Amount &amp; Broker Commission (SAR)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Freight Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Freight Amount (SAR) *
                </label>
                <div className="relative">
                  <input
                    id="broker-freight-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={freightAmount}
                    onChange={(e) => setFreightAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 4500.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">SAR</span>
                </div>
              </div>

              {/* Broker Commission */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Broker Commission (SAR)
                </label>
                <div className="relative">
                  <input
                    id="broker-commission-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={brokerCommission}
                    onChange={(e) => setBrokerCommission(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 450.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">SAR</span>
                </div>
              </div>

              {/* Net Freight Value */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                  Net Freight (To Transporter)
                </span>
                <span className="text-lg font-black font-mono text-emerald-800 dark:text-emerald-300">
                  {netFreight.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Special Delivery Instructions &amp; Notes
              </label>
              <textarea
                id="broker-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Direct site offload; forklift requested at Stop 1; verify driver safety permit..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Section 5: Attach PDF / Delivery Slip */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-500" />
              <span>5. Attach PDF / Delivery Slip (سند التسليم)</span>
            </h3>

            <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  {attachedPdfName ? (
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{attachedPdfName}</span>
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        PDF Document Attached Ready for Driver &amp; Dispatcher
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Upload Broker Consignment Note / Delivery Slip
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supports PDF, PNG, or JPEG documents (Max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <label className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose PDF / Image</span>
                  <input
                    id="broker-pdf-file-input"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleAttachSampleSlip}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Generate Sample Slip
                </button>

                {attachedPdfUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedPdfUrl(undefined);
                      setAttachedPdfName(undefined);
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-broker-load-btn"
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loadToEdit ? 'Update Broker Load' : 'Save Broker Load'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Trip, TripStep, SlipStatus, DriverStatus } from '../types';
import { formatCurrency } from '../utils/i18n';
import {
  Truck,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  Phone,
  FileText,
  Upload,
  Camera,
  Check,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Fuel,
  DollarSign,
  User,
  ArrowRight,
  Sparkles,
  Layers,
  Building2,
  Calendar,
  Package,
  Eye,
  RefreshCw,
  Smartphone,
  CheckCheck,
  ScanLine,
  QrCode,
  Search,
  XCircle,
  ShieldAlert,
  Info,
  Shuffle,
  RotateCcw,
  SlidersHorizontal,
  FileCheck2,
  Scale,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const DriverPanelView: React.FC = () => {
  const {
    trips,
    drivers,
    vehicles,
    warehouseItems,
    selectedDriverId,
    setSelectedDriverId,
    advanceTripStep,
    startTripWithBarcode,
    submitTripSlip,
    setSelectedTripForDn,
    setSelectedInboundDn,
    inboundDeliveryNotes,
    saleOrders,
    language,
    showToast,
    addExpense,
    confirmRouteShiftDelivery,
    inwardRouteShiftRemainingStock,
    confirmDriverLoading,
    confirmDriverDeliveryWithQty,
    inwardDriverReturnedStock,
    updateDriverStatus,
  } = useApp();

  const isAr = language === 'ar';

  // Navigation tab state inside Driver Panel
  const [activeTab, setActiveTab] = useState<'active_trip' | 'assigned_loads' | 'route_map' | 'reconciliation' | 'history'>('active_trip');

  // Filter for assigned loads tab
  const [loadsFilter, setLoadsFilter] = useState<'all' | 'today' | 'loading' | 'in_transit' | 'delivered'>('all');

  // Current active driver
  const activeDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0] || {
    id: 'drv_1',
    name: 'Ahmed Al-Ghamdi',
    nameAr: 'أحمد الغامدي',
    phone: '+966 50 123 4567',
    licenseNumber: 'DL-982103',
    status: 'on_route',
    assignedVehiclePlate: 'T-101',
    currentTripId: 'trp_ahmed_1',
    totalTripsCompleted: 142,
    rating: 4.9,
  };

  // Find vehicle assigned to driver
  const assignedVehicle = vehicles.find(
    (v) => v.plateNumber === activeDriver.assignedVehiclePlate || v.id === activeDriver.assignedVehicleId
  ) || {
    id: 'v_101',
    plateNumber: activeDriver.assignedVehiclePlate || 'T-101',
    model: 'Mercedes-Benz Actros 3340',
    type: 'trailer_30t',
    capacityTons: 30,
    status: 'in_transit',
  };

  // Filter trips for this driver only (STRICT PERMISSION: Driver only sees trips assigned to them)
  const driverTrips = trips.filter(
    (t) =>
      t.driverId === activeDriver.id ||
      (t.driverName && t.driverName.toLowerCase().includes(activeDriver.name.toLowerCase().split(' ')[0]))
  );

  // Active in-progress trip (either loading, on_route, or recently delivered)
  const activeTrip =
    driverTrips.find((t) => t.status === 'in_transit' || t.status === 'loading' || t.status === 'assigned' || t.tripStep === 'on_route' || t.tripStep === 'loading') ||
    driverTrips.find((t) => t.status !== 'cancelled') ||
    trips[0];

  // Loading Confirmation State
  const [loadingQtyInput, setLoadingQtyInput] = useState<number>(activeTrip?.loadedQuantity || activeTrip?.quantity || 750);
  const [loadingNotesInput, setLoadingNotesInput] = useState<string>('Loaded & secured with weather tarpaulin at plant bay.');

  // Delivery & Reconciliation State
  const [deliveredQtyInput, setDeliveredQtyInput] = useState<number>(activeTrip?.deliveredQuantity || activeTrip?.loadedQuantity || activeTrip?.quantity || 750);
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('Normal unloading — all items intact');

  // Return / Inward Stock State
  const [returnQtyInput, setReturnQtyInput] = useState<number>(0);
  const [returnReasonInput, setReturnReasonInput] = useState<string>('Damaged bags / rejected by site receiver');

  // Slip submission state
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState('Hassan Al-Otaibi');
  const [receiverNotes, setReceiverNotes] = useState('All 750 bags received in sound condition. Stamped & signed.');
  const [signatureDone, setSignatureDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Expense Modal state
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseType, setExpenseType] = useState<'fuel' | 'toll' | 'maintenance' | 'allowance'>('fuel');
  const [expenseAmount, setExpenseAmount] = useState('180');
  const [expenseNotes, setExpenseNotes] = useState('Diesel fill-up at SASCO Highway Station');

  // Start Trip via Barcode / Slip State
  const [isStartTripModalOpen, setIsStartTripModalOpen] = useState(false);
  const [startTripMode, setStartTripMode] = useState<'upload' | 'manual'>('upload');
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [uploadedBarcodeImage, setUploadedBarcodeImage] = useState<string | null>(null);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scannedBarcodeResult, setScannedBarcodeResult] = useState<string | null>(null);
  const [matchedTripResult, setMatchedTripResult] = useState<Trip | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const barcodeCameraInputRef = useRef<HTMLInputElement>(null);

  // Sync state when activeTrip changes
  React.useEffect(() => {
    if (activeTrip) {
      setLoadingQtyInput(activeTrip.loadedQuantity || activeTrip.quantity || 750);
      setDeliveredQtyInput(activeTrip.deliveredQuantity || activeTrip.loadedQuantity || activeTrip.quantity || 750);
      if (activeTrip.shortExtraReason) {
        setDiscrepancyReason(activeTrip.shortExtraReason);
      }
      if (activeTrip.returnedStockQuantity) {
        setReturnQtyInput(activeTrip.returnedStockQuantity);
      }
    }
  }, [activeTrip?.id]);

  // Handle Driver Status Changes
  const handleStatusChange = (newStatus: DriverStatus) => {
    updateDriverStatus(activeDriver.id, newStatus);
  };

  // Search and verify barcode against inventory/dispatch records
  const handleScanOrSearchBarcode = (barcodeToVerify: string, imagePreviewUrl?: string) => {
    setSearchPerformed(true);
    setSearchError(null);
    const rawBarcode = barcodeToVerify.trim();
    if (!rawBarcode) {
      setMatchedTripResult(null);
      setSearchError('Please scan a barcode or enter a Delivery Note / Barcode number.');
      return;
    }

    const clean = rawBarcode.replace(/[*#]/g, '').trim().toLowerCase();

    // 1. Search in trips
    let found = trips.find((t) => {
      const b = (t.barcode || '').toLowerCase();
      const dn = (t.dnNumber || t.deliveryNote?.dnNumber || '').toLowerCase();
      const tr = (t.tripNumber || '').toLowerCase();
      const so = (t.deliveryNote?.soNumber || '').toLowerCase();
      const custNum = (t.customerNumber || '').toLowerCase();
      const itemNum = (t.itemNumber || '').toLowerCase();
      return (
        b === clean ||
        dn === clean ||
        clean.includes(dn) ||
        (dn && clean.replace(/[^a-z0-9]/gi, '') === dn.replace(/[^a-z0-9]/gi, '')) ||
        tr === clean ||
        so === clean ||
        (custNum && custNum === clean) ||
        (itemNum && itemNum === clean)
      );
    });

    // 2. Search in inboundDeliveryNotes
    if (!found) {
      const inb = inboundDeliveryNotes.find(
        (d) =>
          d.dnNumber.toLowerCase() === clean ||
          clean.includes(d.dnNumber.toLowerCase()) ||
          clean.replace(/[^a-z0-9]/gi, '') === d.dnNumber.replace(/[^a-z0-9]/gi, '').toLowerCase()
      );
      if (inb) {
        found = trips.find((t) => t.id === inb.tripId || t.dnNumber === inb.dnNumber);
      }
    }

    // 3. Search in saleOrders
    if (!found && saleOrders) {
      const matchedSo = saleOrders.find(
        (so) =>
          so.orderNumber.toLowerCase() === clean ||
          (so.dnNumber && so.dnNumber.toLowerCase() === clean)
      );
      if (matchedSo) {
        found = trips.find((t) => t.id === matchedSo.tripId || (matchedSo.dnNumber && t.dnNumber === matchedSo.dnNumber));
      }
    }

    // AUDIT RULE: Driver cannot create new stock records from Start Trip.
    // Barcode MUST already exist in inventory/dispatch.
    if (found) {
      setMatchedTripResult(found);
      setScannedBarcodeResult(rawBarcode);
      setSearchError(null);
    } else {
      setMatchedTripResult(null);
      setScannedBarcodeResult(rawBarcode);
      setSearchError(
        `Barcode "${rawBarcode}" not found in Dispatch/WMS records. Driver cannot create new stock records from Start Trip. Barcode must already exist in Dispatch.`
      );
    }
  };

  const handleBarcodeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      setIsScanningImage(true);
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setUploadedBarcodeImage(dataUrl);

        // Simulate optical barcode/QR scan detection
        setTimeout(() => {
          setIsScanningImage(false);
          let detectedBarcode = activeTrip?.dnNumber || '9010043436';
          if (file.name.toLowerCase().includes('8812') || file.name.toLowerCase().includes('silo')) detectedBarcode = 'DN-8812-RIY';
          if (file.name.toLowerCase().includes('4029') || file.name.toLowerCase().includes('sp')) detectedBarcode = 'DN-4029-JED';
          if (file.name.toLowerCase().includes('so') || file.name.toLowerCase().includes('9100')) detectedBarcode = 'SO-9100042352';

          setManualBarcodeInput(detectedBarcode);
          handleScanOrSearchBarcode(detectedBarcode, dataUrl);
        }, 650);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSampleBarcode = (sampleCode: string) => {
    setManualBarcodeInput(sampleCode);
    setIsScanningImage(true);
    setTimeout(() => {
      setIsScanningImage(false);
      handleScanOrSearchBarcode(sampleCode);
    }, 400);
  };

  const handleOpenStartTripModal = () => {
    setIsStartTripModalOpen(true);
    setSearchError(null);
    setSearchPerformed(false);
    if (activeTrip) {
      const defaultBarcode = activeTrip.dnNumber || activeTrip.deliveryNote?.dnNumber || '9010043436';
      setManualBarcodeInput(defaultBarcode);
      handleScanOrSearchBarcode(defaultBarcode);
    }
  };

  const handleConfirmStartTrip = () => {
    if (!matchedTripResult) return;
    const barcodeToUse = scannedBarcodeResult || manualBarcodeInput || matchedTripResult.dnNumber || '9010043436';

    const result = startTripWithBarcode({
      tripId: matchedTripResult.id,
      barcode: barcodeToUse,
      driverId: activeDriver.id,
      driverName: activeDriver.name,
      truckPlate: activeDriver.assignedVehiclePlate || matchedTripResult.vehiclePlate || 'T-101',
    });

    if (result.success) {
      setIsStartTripModalOpen(false);
      setUploadedBarcodeImage(null);
      setMatchedTripResult(null);
      setScannedBarcodeResult(null);
      setManualBarcodeInput('');
      setSearchPerformed(false);
    } else if (result.error) {
      setSearchError(result.error);
    }
  };

  // 1. Confirm Loading at Supplier
  const handleConfirmLoading = () => {
    if (!activeTrip) return;
    confirmDriverLoading(activeTrip.id, Number(loadingQtyInput), loadingNotesInput);
  };

  // 2. Open Arrival / Mark Delivered
  const handleMarkArrival = () => {
    if (!activeTrip) return;
    advanceTripStep(activeTrip.id, 'delivered');
    setIsSlipModalOpen(true);
    showToast('Arrived at Destination', 'Please confirm delivered quantity and capture the signed POD.', 'info');
  };

  // 3. Complete Delivery with Qty and POD
  const handleConfirmDeliveryWithQtyAndPod = () => {
    if (!activeTrip) return;
    confirmDriverDeliveryWithQty({
      tripId: activeTrip.id,
      deliveredQty: Number(deliveredQtyInput),
      discrepancyReason: discrepancyReason,
      receiverName: receiverName,
      receiverNotes: receiverNotes,
      podImageUrl: slipImage || undefined,
      signatureDone: signatureDone,
    });
    setIsSlipModalOpen(false);
  };

  // 4. Inward Returned Stock
  const handleInwardReturn = () => {
    if (!activeTrip) return;
    const qtyToReturn = returnQtyInput > 0 ? returnQtyInput : Math.abs((activeTrip.shortExtraQuantity || 0));
    if (qtyToReturn <= 0) {
      showToast('No Return Quantity', 'Please specify quantity to return to warehouse.', 'warning');
      return;
    }
    inwardDriverReturnedStock(activeTrip.id, qtyToReturn, returnReasonInput);
  };

  const handleSlipFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setSlipImage(reader.result as string);
        setSignatureDone(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSampleSlipUpload = () => {
    const sampleSlipSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840" viewBox="0 0 600 840" style="background:%23fdfcf7;font-family:sans-serif;">
      <rect width="600" height="840" fill="%23fdfcf7"/>
      <rect x="20" y="20" width="560" height="800" fill="none" stroke="%23cbd5e1" stroke-width="2"/>
      <text x="40" y="65" font-size="18" font-weight="bold" fill="%230f172a">EL-KHAYYAT GYPSUM PLANT</text>
      <text x="40" y="88" font-size="11" fill="%2364748b">DELIVERY NOTE &amp; CARGO MANIFEST</text>
      <text x="420" y="65" font-size="13" font-weight="bold" fill="%23047857">DELIVERED &amp; SIGNED</text>
      <line x1="40" y1="105" x2="560" y2="105" stroke="%23e2e8f0" stroke-width="2"/>
      
      <text x="40" y="135" font-size="13" font-weight="bold" fill="%231e293b">Customer: مؤسسة صرح البنيان للتجارة</text>
      <text x="40" y="158" font-size="11" fill="%23475569">Customer No: 1100187</text>
      <text x="40" y="180" font-size="11" fill="%23475569">Item: Gypsum Powder BAG - Regular 40 kg</text>
      <text x="40" y="202" font-size="13" font-weight="bold" fill="%230f766e">Verified Quantity: 750 BAG (30 Tons)</text>
      
      <rect x="40" y="225" width="520" height="110" fill="%23f8fafc" stroke="%23e2e8f0" rx="8"/>
      <text x="55" y="250" font-size="11" font-weight="bold" fill="%23334155">Truck: ${activeDriver.assignedVehiclePlate || 'T-101'} | Driver: ${activeDriver.name}</text>
      <text x="55" y="275" font-size="11" font-weight="bold" fill="%23334155">Destination: Riyadh Exit 18 Construction Site</text>
      <text x="55" y="300" font-size="10" fill="%2364748b">Unloaded safely at site warehouse bay 4</text>
      <circle cx="480" cy="280" r="38" fill="none" stroke="%23059669" stroke-width="2.5" stroke-dasharray="4"/>
      <text x="450" y="278" font-size="10" font-weight="bold" fill="%23059669">RECEIVED</text>
      <text x="454" y="293" font-size="8" fill="%23059669">SITE GATE 3</text>

      <rect x="40" y="355" width="250" height="115" fill="%23ffffff" stroke="%23cbd5e1" rx="6"/>
      <text x="55" y="375" font-size="9" font-weight="bold" fill="%231e40af">SO BARCODE (SALES ORDER)</text>
      <g fill="%230f172a">
        <rect x="55" y="385" width="4" height="48"/>
        <rect x="63" y="385" width="2" height="48"/>
        <rect x="68" y="385" width="6" height="48"/>
        <rect x="78" y="385" width="2" height="48"/>
        <rect x="83" y="385" width="4" height="48"/>
        <rect x="91" y="385" width="8" height="48"/>
        <rect x="103" y="385" width="2" height="48"/>
        <rect x="108" y="385" width="6" height="48"/>
        <rect x="118" y="385" width="4" height="48"/>
        <rect x="126" y="385" width="2" height="48"/>
        <rect x="132" y="385" width="8" height="48"/>
        <rect x="144" y="385" width="4" height="48"/>
        <rect x="152" y="385" width="2" height="48"/>
        <rect x="158" y="385" width="6" height="48"/>
      </g>
      <text x="110" y="455" font-size="11" font-family="monospace" font-weight="bold" fill="%230f172a">*SO-9100042352*</text>

      <rect x="310" y="355" width="250" height="115" fill="%23ffffff" stroke="%23cbd5e1" rx="6"/>
      <text x="325" y="375" font-size="9" font-weight="bold" fill="%23b45309">DN BARCODE (DELIVERY NOTE)</text>
      <g fill="%230f172a">
        <rect x="325" y="385" width="4" height="48"/>
        <rect x="333" y="385" width="2" height="48"/>
        <rect x="338" y="385" width="8" height="48"/>
        <rect x="350" y="385" width="2" height="48"/>
        <rect x="356" y="385" width="6" height="48"/>
        <rect x="366" y="385" width="4" height="48"/>
        <rect x="374" y="385" width="2" height="48"/>
        <rect x="380" y="385" width="8" height="48"/>
      </g>
      <text x="370" y="455" font-size="11" font-family="monospace" font-weight="bold" fill="%230f172a">*DN-9010043436*</text>

      <line x1="40" y1="495" x2="560" y2="495" stroke="%23e2e8f0" stroke-width="1"/>
      <text x="40" y="525" font-size="11" font-weight="bold" fill="%23475569">STOREKEEPER SIGNATURE &amp; STAMP</text>
      <path d="M 60 580 Q 90 540 140 560 T 220 550 T 300 580" fill="none" stroke="%231e3a8a" stroke-width="2.5"/>
      <text x="60" y="610" font-size="10" font-family="cursive" fill="%231e3a8a">Hassan Al-Otaibi (Site In-charge)</text>
    </svg>`;

    setSlipImage(sampleSlipSvg);
    setSignatureDone(true);
    setReceiverName('Hassan Al-Otaibi');
    setReceiverNotes('All 750 bags verified against Delivery Note. Sealed & received.');
  };

  const handleQuickAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;

    addExpense({
      tripId: activeTrip.id,
      vehicleId: activeTrip.vehicleId || activeDriver.assignedVehicleId || 'v_101',
      driverId: activeDriver.id,
      category: expenseType,
      amount: parseFloat(expenseAmount),
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: `EXP-DRV-${Date.now().toString().slice(-4)}`,
      merchantName: expenseNotes || 'Highway Gas Station',
      paymentMethod: 'cash',
      status: 'pending',
      notes: `Driver logged via Mobile Handheld: ${expenseNotes}`,
    });

    setIsExpenseOpen(false);
    showToast('Expense Recorded', `${formatCurrency(parseFloat(expenseAmount))} ${expenseType} expense logged for Trip #${activeTrip.tripNumber}`, 'success');
  };

  // Calculate load shortage or excess
  const expectedQty = activeTrip ? (activeTrip.loadedQuantity || activeTrip.quantity || 750) : 750;
  const currentVariance = deliveredQtyInput - expectedQty;
  const hasVariance = currentVariance !== 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* 1. TOP BAR: DRIVER PROFILE, ASSIGNED TRUCK & STATUS SWITCHER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          {/* Driver identity & vehicle plate */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg ring-2 ring-white/20">
                {activeDriver.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                activeDriver.status === 'on_route' ? 'bg-blue-400 animate-pulse' :
                activeDriver.status === 'loading' ? 'bg-amber-400' :
                activeDriver.status === 'available' ? 'bg-emerald-400' : 'bg-slate-400'
              }`} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white">
                  {activeDriver.name}
                </h1>
                {activeDriver.nameAr && (
                  <span className="text-xs text-slate-300 font-bold">({activeDriver.nameAr})</span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {activeDriver.licenseNumber}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  {activeDriver.phone}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  ⭐ {activeDriver.rating} ({activeDriver.totalTripsCompleted} trips)
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Truck & Driver Switcher Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Driver Selector for Testing/Multi-Driver Support */}
            <div className="relative">
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Switch Driver Profile</label>
              <select
                id="driver-profile-selector"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.assignedVehiclePlate || 'No Truck'})
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Truck Badge */}
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-0.5 min-w-[140px]">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Truck className="w-3 h-3 text-amber-400" />
                Assigned Truck
              </span>
              <div className="font-mono font-black text-sm text-amber-300">
                {activeDriver.assignedVehiclePlate || assignedVehicle.plateNumber || 'T-101'}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {assignedVehicle.model || '30-Ton Flatbed'}
              </p>
            </div>

            {/* Driver Status Switcher */}
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Driver Operational Status
              </span>
              <div className="flex items-center gap-1">
                {(['available', 'loading', 'on_route', 'delivered'] as DriverStatus[]).map((st) => (
                  <button
                    key={st}
                    id={`driver-status-btn-${st}`}
                    onClick={() => handleStatusChange(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                      activeDriver.status === st
                        ? st === 'on_route'
                          ? 'bg-blue-600 text-white shadow-md'
                          : st === 'loading'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : st === 'delivered'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Driver Action Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Quick Actions:</span>
            <button
              id="driver-quick-scan-btn"
              onClick={handleOpenStartTripModal}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>DN / SO Barcode Scan</span>
            </button>
            <button
              id="driver-quick-expense-btn"
              onClick={() => setIsExpenseOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Fuel className="w-3.5 h-3.5" />
              <span>Log Fuel / Toll</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Driver View Mode: <strong className="text-emerald-400">Assigned Loads Only (Protected Master WMS)</strong>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS (Active Workflow, Assigned Loads, Route Map, Reconciliation, History) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
        <button
          id="tab-active-trip"
          onClick={() => setActiveTab('active_trip')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'active_trip'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Active Trip Workflow (مراحل الرحلة)</span>
          {activeTrip && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
        </button>

        <button
          id="tab-assigned-loads"
          onClick={() => setActiveTab('assigned_loads')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'assigned_loads'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Assigned Loads &amp; Today's Trips ({driverTrips.length})</span>
        </button>

        <button
          id="tab-route-map"
          onClick={() => setActiveTab('route_map')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'route_map'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Route &amp; Route Shift</span>
          {activeTrip?.hasRouteShift && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-white font-black animate-pulse">
              SHIFT
            </span>
          )}
        </button>

        <button
          id="tab-reconciliation"
          onClick={() => setActiveTab('reconciliation')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'reconciliation'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Delivered Qty &amp; Return Inward</span>
          {hasVariance && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500 text-white font-bold">
              {currentVariance > 0 ? `+${currentVariance}` : currentVariance}
            </span>
          )}
        </button>

        <button
          id="tab-history"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Trip History &amp; PODs</span>
        </button>
      </div>

      {/* 3. TAB CONTENT 1: ACTIVE TRIP & END-TO-END DRIVER WORKFLOW */}
      {activeTab === 'active_trip' && activeTrip && (
        <div className="space-y-6">
          {/* Main Active Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Header of Trip Card */}
            <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-black text-xs">
                    TRIP #{activeTrip.tripNumber}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs">
                    DN #{activeTrip.dnNumber || activeTrip.deliveryNote?.dnNumber || 'DN-9010043436'}
                  </span>
                  {activeTrip.deliveryNote?.soNumber && (
                    <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold text-xs">
                      SO #{activeTrip.deliveryNote.soNumber}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase ${
                    activeTrip.tripStep === 'delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    activeTrip.tripStep === 'on_route' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {activeTrip.tripStep === 'delivered' ? 'Delivered at Site' : activeTrip.tripStep === 'on_route' ? 'On Route (In Transit)' : 'Loading at Supplier'}
                  </span>
                </div>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                  {activeTrip.customerName || activeTrip.companyName || 'Consignee Site'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeTrip.origin.name || activeTrip.origin.city} → {activeTrip.destination.name || activeTrip.destination.city}
                </p>
              </div>

              {/* Progress Bar & ETA */}
              <div className="text-right space-y-1.5 min-w-[180px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Progress:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{activeTrip.progressPercent || (activeTrip.tripStep === 'delivered' ? 100 : activeTrip.tripStep === 'on_route' ? 60 : 20)}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-500"
                    style={{ width: `${activeTrip.progressPercent || (activeTrip.tripStep === 'delivered' ? 100 : activeTrip.tripStep === 'on_route' ? 60 : 20)}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Est. Arrival: {activeTrip.estimatedArrivalTime || '2h 15m'}
                </span>
              </div>
            </div>

            {/* ROUTE SHIFT ALERT (When Dispatcher shifts destination in transit) */}
            {activeTrip.hasRouteShift && (
              <div className="p-5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-600/15 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-amber-900/50 border-b-2 border-amber-400 dark:border-amber-600 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shrink-0">
                      <Shuffle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-amber-900 dark:text-amber-200 uppercase">
                          IN-TRANSIT ROUTE SHIFT ACTIVE
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-amber-300 font-mono font-bold">
                          DN #{activeTrip.dnNumber || 'DN-001'} (Preserved)
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                        Deliver {activeTrip.directSaleQuantity || 300} {activeTrip.uom || 'BAG'} to Customer B, then inward remaining {activeTrip.remainingInwardQuantity || 450} {activeTrip.uom || 'BAG'} to Central Warehouse.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WORKFLOW STEPPER TIMELINE */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                Driver Workflow Lifecycle (خطوات تنفيذ الرحلة)
              </h3>

              {/* Step Grid: 1. Assigned -> 2. Supplier Loading -> 3. On Route -> 4. Delivered / Actual Qty -> 5. POD Upload -> 6. Complete */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Step 1: Assign */}
                <div className={`p-3.5 rounded-2xl border text-center transition-all ${
                  'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                }`}>
                  <div className="w-7 h-7 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs mb-1.5">
                    ✓
                  </div>
                  <span className="font-bold text-xs block">1. Assigned</span>
                  <span className="text-[10px] text-slate-500">Dispatcher Load</span>
                </div>

                {/* Step 2: Loading & Confirmed */}
                <div className={`p-3.5 rounded-2xl border text-center transition-all ${
                  activeTrip.tripStep === 'loading'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-md ring-2 ring-amber-400/20'
                    : activeTrip.loadedQuantity
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                    activeTrip.loadedQuantity ? 'bg-emerald-500 text-white' : activeTrip.tripStep === 'loading' ? 'bg-amber-500 text-white animate-bounce' : 'bg-slate-300 text-slate-700'
                  }`}>
                    {activeTrip.loadedQuantity ? '✓' : '2'}
                  </div>
                  <span className="font-bold text-xs block">2. Supplier Loading</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {activeTrip.loadedQuantity ? `${activeTrip.loadedQuantity} BAG Confirmed` : 'Waiting Count'}
                  </span>
                </div>

                {/* Step 3: On Route & Barcode Scan */}
                <div className={`p-3.5 rounded-2xl border text-center transition-all ${
                  activeTrip.tripStep === 'on_route'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-md ring-2 ring-blue-400/20'
                    : activeTrip.tripStep === 'delivered'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                    activeTrip.tripStep === 'delivered' ? 'bg-emerald-500 text-white' : activeTrip.tripStep === 'on_route' ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-300 text-slate-700'
                  }`}>
                    {activeTrip.tripStep === 'delivered' ? '✓' : '3'}
                  </div>
                  <span className="font-bold text-xs block">3. On Route</span>
                  <span className="text-[10px] text-slate-500">DN/SO Barcode Scanned</span>
                </div>

                {/* Step 4: Actual Delivered Qty */}
                <div className={`p-3.5 rounded-2xl border text-center transition-all ${
                  activeTrip.tripStep === 'delivered'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                    activeTrip.deliveredQuantity ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'
                  }`}>
                    {activeTrip.deliveredQuantity ? '✓' : '4'}
                  </div>
                  <span className="font-bold text-xs block">4. Actual Delivery</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {activeTrip.deliveredQuantity ? `${activeTrip.deliveredQuantity} BAG Delivered` : 'Unload at Site'}
                  </span>
                </div>

                {/* Step 5: POD & Outward WMS */}
                <div className={`p-3.5 rounded-2xl border text-center transition-all col-span-2 md:col-span-1 ${
                  activeTrip.slipStatus === 'cleared'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                    : activeTrip.slipStatus === 'pending'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-800 dark:text-blue-200'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                    activeTrip.slipStatus === 'cleared' || activeTrip.slipStatus === 'pending' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}>
                    {activeTrip.slipStatus === 'cleared' || activeTrip.slipStatus === 'pending' ? '✓' : '5'}
                  </div>
                  <span className="font-bold text-xs block">5. POD &amp; Outward</span>
                  <span className="text-[10px] text-slate-500">
                    {activeTrip.slipStatus === 'cleared' ? 'Verified ✓' : activeTrip.slipStatus === 'pending' ? 'Pending Review' : 'Photo & Sign'}
                  </span>
                </div>
              </div>
            </div>

            {/* STAGE-SPECIFIC INTERACTIVE ACTIONS */}
            <div className="p-6 space-y-6">
              {/* STAGE 1: LOADING AT SUPPLIER PLANT (Driver confirms loaded count) */}
              {activeTrip.tripStep === 'loading' && (
                <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">
                        Supplier Plant Loading Confirmation (تأكيد التحميل من المصنع)
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Verify and confirm the physical tally count loaded onto truck before departing plant.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Confirmed Loaded Quantity ({activeTrip.uom || 'BAG'}):
                      </label>
                      <input
                        type="number"
                        id="driver-loaded-qty-input"
                        value={loadingQtyInput ?? ""}
                        onChange={(e) => setLoadingQtyInput(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-base text-slate-900 dark:text-white"
                        placeholder="750"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Loading Inspection Notes:
                      </label>
                      <input
                        type="text"
                        value={loadingNotesInput ?? ""}
                        onChange={(e) => setLoadingNotesInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                        placeholder="e.g. 750 bags loaded and secured with tarpaulin"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      id="driver-confirm-loaded-qty-btn"
                      onClick={handleConfirmLoading}
                      className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm Loaded Count ({loadingQtyInput} {activeTrip.uom || 'BAG'})</span>
                    </button>

                    <button
                      id="driver-start-trip-barcode-btn"
                      onClick={handleOpenStartTripModal}
                      className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <ScanLine className="w-4 h-4" />
                      <span>Scan Barcode &amp; Depart (Start Trip)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: ON ROUTE (Driver is in transit -> Arrive at customer) */}
              {activeTrip.tripStep === 'on_route' && (
                <div className="p-5 rounded-3xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-blue-600 text-white font-black">
                        <Navigation className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          En Route to Customer Site (في الطريق للعميل)
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Destination: <strong className="text-blue-600 dark:text-blue-400">{activeTrip.customerName || activeTrip.destination.name}</strong> • {activeTrip.destination.address || activeTrip.destination.city}
                        </p>
                      </div>
                    </div>

                    <a
                      href="tel:+966501100187"
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call Receiver Storekeeper</span>
                    </a>
                  </div>

                  {/* Arrival Button */}
                  <div className="pt-2">
                    <button
                      id="driver-arrive-destination-btn"
                      onClick={handleMarkArrival}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-98"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>ARRIVED AT DESTINATION — UNLOAD &amp; ENTER ACTUAL DELIVERED QTY</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 3: DELIVERED & RECONCILIATION CARD (Actual Delivered Qty, Variance & POD) */}
              {activeTrip.tripStep === 'delivered' && (
                <div className="p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-emerald-600 text-white font-black">
                        <CheckCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          Delivery Verification &amp; POD (إثبات التسليم وتسوية الكمية)
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Enter actual delivered quantity, calculate discrepancy, and attach signed delivery slip.
                        </p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      Admin Outward Stock Auto-Deduction Active
                    </span>
                  </div>

                  {/* Quantity Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Loaded Quantity (Supplier)</span>
                      <div className="font-mono font-black text-lg text-slate-900 dark:text-white">
                        {expectedQty} {activeTrip.uom || 'BAG'}
                      </div>
                      <p className="text-[11px] text-slate-500">Confirmed at departure</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 space-y-1 ring-2 ring-blue-500/20">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold block">Actual Delivered Qty</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          id="driver-actual-delivered-qty-input"
                          value={deliveredQtyInput ?? ""}
                          onChange={(e) => setDeliveredQtyInput(Number(e.target.value))}
                          className="w-full px-2 py-1 font-mono font-black text-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-500">{activeTrip.uom || 'BAG'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Physically received by site</p>
                    </div>

                    <div className={`p-3.5 rounded-2xl border space-y-1 ${
                      currentVariance === 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                        : currentVariance < 0
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-200'
                    }`}>
                      <span className="text-[10px] uppercase font-bold block">Short / Extra Quantity</span>
                      <div className="font-mono font-black text-lg">
                        {currentVariance === 0 ? '0 (Exact Match ✓)' : currentVariance > 0 ? `+${currentVariance} Extra` : `${currentVariance} Shortage`}
                      </div>
                      <p className="text-[11px] opacity-80">
                        {currentVariance === 0 ? 'Full cargo delivered' : currentVariance < 0 ? 'Requires Inward Return to WMS' : 'Excess loaded by plant'}
                      </p>
                    </div>
                  </div>

                  {/* Discrepancy Reason Input (if variance exists) */}
                  {hasVariance && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                      <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                        Discrepancy Reason (سبب النقص أو الزيادة):
                      </label>
                      <select
                        value={discrepancyReason ?? ""}
                        onChange={(e) => setDiscrepancyReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="Damaged bags in transit (unloaded safely)">Damaged bags in transit (torn paper / pallet shift)</option>
                        <option value="Storekeeper rejected defective items">Storekeeper rejected defective / wet packaging</option>
                        <option value="Supplier plant tally count discrepancy">Supplier plant tally count discrepancy</option>
                        <option value="Partial direct drop per customer request">Partial direct drop per customer request</option>
                      </select>
                    </div>
                  )}

                  {/* Actions: Open POD Modal or Inward Return */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      id="driver-open-pod-modal-btn"
                      onClick={() => setIsSlipModalOpen(true)}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{activeTrip.slipStatus === 'pending' ? 'Update Signed POD Slip' : 'Upload Stamped Delivery Note & Sign'}</span>
                    </button>

                    {currentVariance < 0 && (
                      <button
                        id="driver-inward-return-quick-btn"
                        onClick={handleInwardReturn}
                        className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Inward {Math.abs(currentVariance)} Returned Bags to Warehouse</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* CARGO & ROUTE DETAILS (FLAT LAYOUT) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cargo Details */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-amber-500" />
                      Cargo Manifest
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold">
                      {activeTrip.quantity || 750} {activeTrip.uom || 'BAG'} (30.0 Tons)
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {activeTrip.itemName || 'Gypsum Powder - Regular 40 kg'}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      SKU: {activeTrip.itemNumber || '1290000001'} • Commodity: {activeTrip.cargoType || 'Industrial Dry Powder'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-500">Assigned Truck:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {activeTrip.vehiclePlate || activeDriver.assignedVehiclePlate || 'T-101'}
                    </span>
                  </div>
                </div>

                {/* Route Waypoints */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-blue-500" />
                    Pickup &amp; Delivery Route
                  </span>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        A
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Pickup (المورد / المصنع):</span>
                        <p className="font-bold text-slate-900 dark:text-white">{activeTrip.origin.name}</p>
                        <p className="text-slate-500 text-[11px]">{activeTrip.origin.address || activeTrip.origin.city}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        B
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Delivery (العميل):</span>
                        <p className="font-bold text-slate-900 dark:text-white">{activeTrip.destination.name}</p>
                        <p className="text-slate-500 text-[11px]">{activeTrip.destination.address || activeTrip.destination.city}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT 2: ASSIGNED LOADS & TODAY'S TRIPS */}
      {activeTab === 'assigned_loads' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Assigned Loads &amp; Schedule (الحمولات وجدول الرحلات)
              </h3>
              <p className="text-xs text-slate-500">
                Dispatches assigned to {activeDriver.name} on Truck {activeDriver.assignedVehiclePlate || 'T-101'}.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
              {(['all', 'today', 'loading', 'in_transit', 'delivered'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setLoadsFilter(f)}
                  className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                    loadsFilter === f
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* List of driver assigned trips */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {driverTrips
              .filter((tr) => {
                if (loadsFilter === 'today') return true;
                if (loadsFilter === 'loading') return tr.tripStep === 'loading' || tr.status === 'loading';
                if (loadsFilter === 'in_transit') return tr.status === 'in_transit' || tr.tripStep === 'on_route';
                if (loadsFilter === 'delivered') return tr.status === 'delivered' || tr.tripStep === 'delivered';
                return true;
              })
              .map((trip) => (
                <div key={trip.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        {trip.tripNumber}
                      </span>
                      <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                        DN #{trip.dnNumber || trip.deliveryNote.dnNumber}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        trip.status === 'delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        trip.status === 'in_transit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {trip.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {trip.customerName || trip.companyName} • {trip.itemName || 'Cargo'} ({trip.quantity || 750} {trip.uom || 'BAG'})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Route: {trip.origin.city} ({trip.origin.name}) → {trip.destination.city} ({trip.destination.name})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTripForDn(trip);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>View Slip / DN</span>
                    </button>

                    {trip.status !== 'delivered' && (
                      <button
                        onClick={() => {
                          setActiveTab('active_trip');
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Open Live Workflow</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT 3: ROUTE & ROUTE SHIFT */}
      {activeTab === 'route_map' && activeTrip && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Live Route &amp; GPS Telemetry (المسار والملاحة الحية)
              </h3>
              <p className="text-xs text-slate-500">
                Active Waypoints, In-Transit Route Shift status, and turn-by-turn logistics guidance.
              </p>
            </div>

            <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold">
              GPS Active (104 km/h)
            </span>
          </div>

          {/* Interactive Visual Map Representation */}
          <div className="p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Highway 40 Express • Riyadh / Western Province Corridor</span>
              <span className="font-mono text-amber-400 font-bold">Lat: 24.7136, Lng: 46.6753</span>
            </div>

            {/* Visual Route Line */}
            <div className="relative py-6">
              <div className="h-2 bg-slate-800 rounded-full w-full relative">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500 rounded-full"
                  style={{ width: `${activeTrip.progressPercent || 60}%` }}
                />
              </div>

              {/* Waypoint pins */}
              <div className="flex justify-between items-center -mt-4">
                <div className="text-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs mx-auto shadow-md">
                    A
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 block mt-1">
                    {activeTrip.origin.name || activeTrip.origin.city}
                  </span>
                  <span className="text-[10px] text-emerald-400">Loaded 08:30 AM</span>
                </div>

                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs mx-auto shadow-lg animate-pulse ring-4 ring-blue-500/30">
                    🚚
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-300 block mt-1">
                    Current Position
                  </span>
                  <span className="text-[10px] text-slate-400">45 km remaining</span>
                </div>

                <div className="text-center">
                  <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs mx-auto shadow-md">
                    B
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 block mt-1">
                    {activeTrip.destination.name || activeTrip.destination.city}
                  </span>
                  <span className="text-[10px] text-rose-400">ETA 11:45 AM</span>
                </div>
              </div>
            </div>

            {/* In-Transit Route Shift Details */}
            {activeTrip.hasRouteShift && (
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <Shuffle className="w-4 h-4 animate-pulse" />
                  <span>Route Shift Instruction from Dispatcher</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Divert {activeTrip.directSaleQuantity || 300} {activeTrip.uom || 'BAG'} to {activeTrip.routeShiftCustomerName || 'Direct Sale Site'}. Preserved original Delivery Note #{activeTrip.dnNumber}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT 4: DELIVERED QTY & RECONCILIATION */}
      {activeTab === 'reconciliation' && activeTrip && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 space-y-6">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              Quantity Reconciliation &amp; Inward Return (تسوية الكميات ومردود البضاعة)
            </h3>
            <p className="text-xs text-slate-500">
              Reconcile loaded count against actual customer delivery receipt. If goods remain or were rejected, return inward to warehouse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Variance Calculator */}
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Delivery Breakdown
              </span>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Supplier Loaded Count:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {expectedQty} {activeTrip.uom || 'BAG'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Actual Delivered Count:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {deliveredQtyInput} {activeTrip.uom || 'BAG'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-black">
                  <span>Variance (Short / Extra):</span>
                  <span className={currentVariance === 0 ? 'text-emerald-600' : currentVariance < 0 ? 'text-rose-600' : 'text-amber-600'}>
                    {currentVariance === 0 ? '0 (Matched)' : currentVariance > 0 ? `+${currentVariance} Extra` : `${currentVariance} Shortage`}
                  </span>
                </div>
              </div>

              {hasVariance && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold block">Discrepancy Reason</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {discrepancyReason}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Inward Return Stock to Warehouse */}
            <div className="p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-4">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase">
                <RotateCcw className="w-4 h-4" />
                <span>Return / Inward Remaining Stock</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                If the customer rejected defective bags, or if partial cargo remained on truck, inward the items back to the Central Logistics Warehouse.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Return Quantity to Inward:
                  </label>
                  <input
                    type="number"
                    value={returnQtyInput ?? ""}
                    onChange={(e) => setReturnQtyInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 font-mono font-bold text-base text-indigo-600 dark:text-indigo-400"
                    placeholder="2"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Return Reason:
                  </label>
                  <input
                    type="text"
                    value={returnReasonInput ?? ""}
                    onChange={(e) => setReturnReasonInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white"
                    placeholder="Damaged in transit / Storekeeper rejection"
                  />
                </div>

                <button
                  id="driver-inward-return-btn"
                  onClick={handleInwardReturn}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>INWARD {returnQtyInput || Math.abs(currentVariance)} BAGS TO CENTRAL WAREHOUSE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB CONTENT 5: TRIP HISTORY & PODS */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Driver Trip History &amp; Signed PODs (سجل الرحلات وسندات التسليم)
              </h3>
              <p className="text-xs text-slate-500">
                Archived logs of completed deliveries with viewable signed slips and customer receipts.
              </p>
            </div>

            <span className="text-xs font-mono font-bold text-slate-400">
              {driverTrips.length} Total Trips
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {driverTrips.map((trip) => (
              <div key={trip.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">{trip.tripNumber}</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-[11px]">
                      DN #{trip.dnNumber || trip.deliveryNote.dnNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      trip.slipStatus === 'cleared'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : trip.slipStatus === 'pending'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {trip.slipStatus === 'cleared' ? 'Cleared ✓' : trip.slipStatus === 'pending' ? 'Pending Approval' : 'Completed'}
                    </span>
                  </div>

                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {trip.customerName || trip.companyName} • {trip.itemName || 'Cargo'} ({trip.quantity || 750} {trip.uom || 'BAG'})
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Origin: {trip.origin.city} → Destination: {trip.destination.city} • Completed: {trip.completedTime || 'Recently'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTripForDn(trip)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>View Stamped POD Slip</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT DELIVERY SLIP (POD Photo & Signature) */}
      {isSlipModalOpen && activeTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Submit Delivery Slip &amp; POD
                  </h3>
                  <p className="text-xs text-slate-500">Trip #{activeTrip.tripNumber} • DN #{activeTrip.dnNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSlipModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* 1-Click Upload Physical Sample Slip */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Quick Sample Slip
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Auto-fill stamped &amp; signed Gypsum slip
                  </span>
                </div>
                <button
                  id="load-sample-slip-btn"
                  onClick={handleSampleSlipUpload}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Attach Stamped Slip</span>
                </button>
              </div>

              {/* Upload Drop Zone / Camera Capture */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleSlipFileUpload}
                  className="hidden"
                />
                {slipImage ? (
                  <div className="space-y-2">
                    <img
                      src={slipImage}
                      alt="Uploaded Slip"
                      className="max-h-48 mx-auto rounded-lg border border-slate-200 shadow-sm object-contain"
                    />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                      ✓ Slip photo loaded successfully
                    </span>
                    <span className="text-slate-400 text-[10px]">Tap to change photo</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Take Photo of Stamped Delivery Note
                    </span>
                    <span className="text-slate-400 text-[11px] block">
                      or upload from device gallery
                    </span>
                  </div>
                )}
              </div>

              {/* Delivered Qty Verification in POD Modal */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Actual Delivered Count:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={deliveredQtyInput ?? ""}
                      onChange={(e) => setDeliveredQtyInput(Number(e.target.value))}
                      className="w-24 px-2 py-1 font-mono font-bold text-right rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <span className="text-slate-500 font-bold">{activeTrip.uom || 'BAG'}</span>
                  </div>
                </div>
              </div>

              {/* Receiver Info */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                    Receiver / Storekeeper Name:
                  </label>
                  <input
                    type="text"
                    value={receiverName ?? ""}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    placeholder="e.g. Hassan Al-Otaibi"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                    Delivery Notes / Inspection Remarks:
                  </label>
                  <textarea
                    rows={2}
                    value={receiverNotes ?? ""}
                    onChange={(e) => setReceiverNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    placeholder="e.g. All bags received in good condition."
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <button
                onClick={() => setIsSlipModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="confirm-submit-slip-btn"
                onClick={handleConfirmDeliveryWithQtyAndPod}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Submit Slip &amp; Confirm Delivery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: START TRIP VIA BARCODE / DELIVERY SLIP */}
      {isStartTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-slate-900/5 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 shadow-md">
                  <ScanLine className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      Start Trip (بدء الرحلة عبر الباركود)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Audit Enforced
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Scan delivery slip / barcode or enter DN number to verify dispatch and start trip.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStartTripModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-black text-amber-900 dark:text-amber-300 block">
                    Important Audit Chain Rule (سلسلة التدقيق الإلزامية)
                  </span>
                  <p className="text-amber-800 dark:text-amber-400 leading-relaxed">
                    The driver <span className="font-bold underline">cannot create a new stock record</span> from Start Trip. The barcode must already exist in the Dispatch/WMS system.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStartTripMode('upload')}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    startTripMode === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Option 1: Upload / Take Picture</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStartTripMode('manual')}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    startTripMode === 'manual'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Option 2: Manual Barcode / DN</span>
                </button>
              </div>

              {startTripMode === 'upload' && (
                <div className="space-y-4">
                  <input
                    ref={barcodeCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleBarcodeImageUpload}
                    className="hidden"
                  />

                  <div
                    onClick={() => barcodeCameraInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                      uploadedBarcodeImage
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-amber-50/20'
                    }`}
                  >
                    {isScanningImage ? (
                      <div className="py-8 space-y-3">
                        <div className="relative w-20 h-20 mx-auto">
                          <div className="w-20 h-20 rounded-2xl border-2 border-amber-500 flex items-center justify-center bg-amber-500/10 animate-pulse">
                            <ScanLine className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-bounce" />
                          </div>
                          <div className="absolute left-0 right-0 h-1 bg-amber-500 shadow-lg shadow-amber-500 animate-pulse top-1/2"></div>
                        </div>
                        <p className="font-bold text-xs text-amber-600 dark:text-amber-400">
                          Scanning barcode &amp; matching against Dispatch records...
                        </p>
                      </div>
                    ) : uploadedBarcodeImage ? (
                      <div className="space-y-3">
                        <div className="max-h-48 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 mx-auto max-w-sm relative">
                          <img
                            src={uploadedBarcodeImage}
                            alt="Scanned Barcode Slip"
                            className="w-full object-contain"
                          />
                          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-mono text-[10px] font-bold shadow-md">
                            Barcode Detected: {scannedBarcodeResult || 'DN-9010043436'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                          <Camera className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-900 dark:text-white">
                            Tap to Take Picture or Upload Delivery Slip / Barcode
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            System scans barcode automatically and retrieves matched DN &amp; Route
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Or Quick Test with Pre-Registered Barcode Slips:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectSampleBarcode('9010043436')}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-amber-500 text-left transition-colors cursor-pointer"
                      >
                        <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 block truncate">
                          DN-9010043436
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          El-Khayyat Gypsum (750 BAG)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectSampleBarcode('DN-8812-RIY')}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-amber-500 text-left transition-colors cursor-pointer"
                      >
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 block truncate">
                          DN-8812-RIY
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          TLB Silo Bulk (32 Tons)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectSampleBarcode('DN-4029-JED')}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-amber-500 text-left transition-colors cursor-pointer"
                      >
                        <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 block truncate">
                          DN-4029-JED
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          TLB SP High-Grade (28T)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectSampleBarcode('SO-9100042352')}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-amber-500 text-left transition-colors cursor-pointer"
                      >
                        <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400 block truncate">
                          SO-9100042352
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          Sales Order Manifest
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {startTripMode === 'manual' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                      Enter Barcode or Delivery Note No. (رقم الباركود / إشعار التسليم)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ScanLine className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={manualBarcodeInput ?? ""}
                          onChange={(e) => setManualBarcodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleScanOrSearchBarcode(manualBarcodeInput);
                            }
                          }}
                          placeholder="e.g. 9010043436, DN-8812-RIY, SO-9100042352"
                          className="w-full pl-10 pr-4 py-3 font-mono font-bold text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleScanOrSearchBarcode(manualBarcodeInput)}
                        className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Search className="w-4 h-4" />
                        <span>Search &amp; Verify</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {searchError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-xs flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-black text-rose-900 dark:text-rose-300 block">
                      Barcode Not Found in Dispatch System
                    </span>
                    <p className="text-rose-800 dark:text-rose-400 leading-relaxed">
                      {searchError}
                    </p>
                  </div>
                </div>
              )}

              {matchedTripResult && (
                <div className="p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                          Verified Dispatch Record
                        </span>
                        <h4 className="font-mono text-sm font-black text-white">
                          Trip #{matchedTripResult.tripNumber} • DN #{matchedTripResult.dnNumber || matchedTripResult.deliveryNote.dnNumber}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>PICKUP LOCATION (التحميل)</span>
                      </div>
                      <p className="font-black text-sm text-white">{matchedTripResult.origin.name}</p>
                      <p className="text-[11px] text-slate-400">{matchedTripResult.origin.address || matchedTripResult.origin.city}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-400 text-xs font-black">
                        <Navigation className="w-4 h-4 shrink-0" />
                        <span>DROP LOCATION (التسليم)</span>
                      </div>
                      <p className="font-black text-sm text-white">{matchedTripResult.destination.name || matchedTripResult.customerName}</p>
                      <p className="text-[11px] text-slate-400">{matchedTripResult.destination.address || matchedTripResult.destination.city}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsStartTripModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-start-trip-btn"
                disabled={!matchedTripResult || isScanningImage}
                onClick={handleConfirmStartTrip}
                className={`px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl transition-all ${
                  matchedTripResult && !isScanningImage
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-amber-500/30 cursor-pointer transform active:scale-98'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>CONFIRM DETAILS &amp; START TRIP (ON ROUTE)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUICK DRIVER EXPENSE */}
      {isExpenseOpen && activeTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleQuickAddExpense}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Log Trip Expense
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Expense Type</label>
                <select
                  value={expenseType ?? ""}
                  onChange={(e) => setExpenseType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  <option value="fuel">⛽ Diesel / Fuel Fill</option>
                  <option value="toll">🛣️ Highway Toll &amp; Weight Bridge</option>
                  <option value="maintenance">🔧 Tire &amp; Mechanical Maintenance</option>
                  <option value="allowance">🍽️ Driver Meal / Overnight Allowance</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Amount (SAR)</label>
                <input
                  type="number"
                  required
                  value={expenseAmount ?? ""}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full px-3 py-2 text-lg font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Receipt / Station Description</label>
                <input
                  type="text"
                  value={expenseNotes ?? ""}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsExpenseOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

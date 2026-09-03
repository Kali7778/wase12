import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trip, CargoType, VehicleType, LocationPoint } from '../types';
import {
  X,
  Plus,
  Trash2,
  Truck,
  ShieldCheck,
  MapPin,
  Navigation,
  AlertCircle,
  ArrowRightLeft,
  Sparkles,
  Building2,
  LocateFixed,
  Compass,
  CheckCircle2,
  FileText,
  Save,
  BookmarkPlus,
  BookmarkCheck,
  FolderOpen,
  Search,
  Check
} from 'lucide-react';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Coordinate fallbacks and Arabic translations for major Saudi logistics nodes
const saudiCityPresets: Record<string, { lat: number; lng: number; nameAr: string; defaultAddress: string }> = {
  Riyadh: { lat: 24.7136, lng: 46.6753, nameAr: 'الرياض', defaultAddress: 'Al-Sulay Industrial Area, Exit 18, Riyadh' },
  Jeddah: { lat: 21.5433, lng: 39.1728, nameAr: 'جدة', defaultAddress: 'Jeddah Islamic Port Logistics Zone, Gate 5, Jeddah' },
  Dammam: { lat: 26.4207, lng: 50.0888, nameAr: 'الدمام', defaultAddress: 'King Abdulaziz Seaport Logistics Parkway, Dammam' },
  Jubail: { lat: 27.0046, lng: 49.6595, nameAr: 'الجبيل', defaultAddress: 'Jubail Industrial City 1, Petrochemical Zone, Jubail' },
  Yanbu: { lat: 24.0895, lng: 38.0618, nameAr: 'ينبع', defaultAddress: 'Royal Commission Industrial Area, Yanbu Al-Sinaiyah' },
  'Al-Kharj': { lat: 24.1555, lng: 47.3119, nameAr: 'الخرج', defaultAddress: 'Industrial Zone 2, Haradh Highway, Al-Kharj' },
  Mecca: { lat: 21.4225, lng: 39.8262, nameAr: 'مكة المكرمة', defaultAddress: 'Al-Kaakiya Logistics District, 3rd Ring Road, Mecca' },
  Medina: { lat: 24.4672, lng: 39.6111, nameAr: 'المدينة المنورة', defaultAddress: 'Al-Khalil Industrial Area, Airport Road, Medina' },
  Tabuk: { lat: 28.3835, lng: 36.5662, nameAr: 'تبوك', defaultAddress: 'Tabuk Highway Distribution Hub, Duba Road, Tabuk' },
  Neom: { lat: 28.0269, lng: 35.2344, nameAr: 'نيوم', defaultAddress: 'NEOM Logistics Base Camp, Sharma Coastal Sector' },
  Buraidah: { lat: 26.3260, lng: 43.9750, nameAr: 'بريدة / القصيم', defaultAddress: 'Qassim Central Produce Terminal, Buraidah Ring Road' },
  'Khamis Mushait': { lat: 18.3000, lng: 42.7333, nameAr: 'خميس مشيط', defaultAddress: 'Al-Wadi Industrial Area, King Fahd Road, Khamis Mushait' },
  Abha: { lat: 18.2164, lng: 42.5053, nameAr: 'أبها', defaultAddress: 'Asir Central Logistics Depot, Abha' },
  Jizan: { lat: 16.8892, lng: 42.5706, nameAr: 'جازان', defaultAddress: 'Jizan Port Industrial City, Coastal Highway, Jizan' },
  Taif: { lat: 21.2854, lng: 40.4222, nameAr: 'الطائف', defaultAddress: 'Al-Sail Road Logistics Hub, Taif' },
  Hail: { lat: 27.5219, lng: 41.6907, nameAr: 'حائل', defaultAddress: 'Hail Industrial City Phase 1, Al-Madinah Highway' },
  'Al-Ahsa': { lat: 25.3800, lng: 49.5850, nameAr: 'الأحساء / الهفوف', defaultAddress: 'Hofuf Industrial District, Qatar Highway, Al-Ahsa' },
  Rabigh: { lat: 22.7986, lng: 39.0347, nameAr: 'رابغ', defaultAddress: 'King Abdullah Economic City (KAEC) Port Depot, Rabigh' },
  'Ras Al-Khair': { lat: 27.5342, lng: 49.1911, nameAr: 'رأس الخير', defaultAddress: 'Ras Al-Khair Minerals Industrial City, Port Zone' },
};

export const NewTripModal: React.FC<NewTripModalProps> = ({ isOpen, onClose }) => {
  const { drivers, vehicles, customers, addTrip, locations, addLocation, deleteLocation, companySettings, showToast, t, activeRole } = useApp();

  // PICKUP LOCATION (ORIGIN) STATE
  const [pickupMode, setPickupMode] = useState<'preset' | 'manual'>('preset');
  const [originKey, setOriginKey] = useState<string>(locations[0]?.id || 'loc_ruh_1');
  const [manualOriginName, setManualOriginName] = useState<string>('Riyadh Central Logistics Hub, Sulay');
  const [manualOriginNameAr, setManualOriginNameAr] = useState<string>('مركز الرياض اللوجستي المركزي - السلي');
  const [manualOriginCity, setManualOriginCity] = useState<string>('Riyadh');
  const [manualOriginAddress, setManualOriginAddress] = useState<string>('Warehouse Zone 4, Exit 18, Al Sulay, Riyadh 14264');
  const [manualOriginLat, setManualOriginLat] = useState<number>(24.6408);
  const [manualOriginLng, setManualOriginLng] = useState<number>(46.8225);
  const [originCategory, setOriginCategory] = useState<string>('warehouse');
  const [saveOriginToDirectory, setSaveOriginToDirectory] = useState<boolean>(true);
  const [originSavedSuccess, setOriginSavedSuccess] = useState<boolean>(false);

  // DROP LOCATION (DESTINATION) STATE
  const [dropMode, setDropMode] = useState<'preset' | 'manual'>('preset');
  const [destinationKey, setDestinationKey] = useState<string>(locations[1]?.id || 'loc_jed_1');
  const [manualDestName, setManualDestName] = useState<string>('Jeddah Islamic Port Logistics Zone');
  const [manualDestNameAr, setManualDestNameAr] = useState<string>('منطقة ميناء جدة الإسلامي اللوجستية');
  const [manualDestCity, setManualDestCity] = useState<string>('Jeddah');
  const [manualDestAddress, setManualDestAddress] = useState<string>('Port Customs Bonded Area, Gate 5, Jeddah 22311');
  const [manualDestLat, setManualDestLat] = useState<number>(21.4644);
  const [manualDestLng, setManualDestLng] = useState<number>(39.1672);
  const [destCategory, setDestCategory] = useState<string>('customer_site');
  const [saveDestToDirectory, setSaveDestToDirectory] = useState<boolean>(true);
  const [destSavedSuccess, setDestSavedSuccess] = useState<boolean>(false);

  // Location Directory Manager Modal State
  const [isLocationsDirectoryOpen, setIsLocationsDirectoryOpen] = useState<boolean>(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>('');

  // Customer, Driver, Vehicle & Cargo
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [driverId, setDriverId] = useState<string>(drivers[0]?.id || '');
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [cargoType, setCargoType] = useState<CargoType>('general');
  const [temperatureRequired, setTemperatureRequired] = useState<string>('+2°C to +8°C');
  const [price, setPrice] = useState<number>(3800);
  const [cost, setCost] = useState<number>(1600);
  const [isOutsideCompanyLoad, setIsOutsideCompanyLoad] = useState<boolean>(false);
  const [partnerCompanyName, setPartnerCompanyName] = useState<string>('Gulf Express Logistics Broker');
  const [partnerCommissionRate, setPartnerCommissionRate] = useState<number>(0.10);
  const [specialInstructions, setSpecialInstructions] = useState<string>('Palletized freight. Ensure seal verification before departure.');

  // Cargo items list
  const [cargoItems, setCargoItems] = useState([
    { id: '1', name: 'Standard Palletized Goods', sku: 'SKU-GEN-01', quantity: 400, unit: 'Carton', weightKg: 4800, volumeCbm: 15 }
  ]);

  // Sync preset to manual fields if user switches mode or changes preset
  const handleSelectOriginPreset = (locId: string) => {
    setOriginKey(locId);
    const loc = locations.find((l) => l.id === locId);
    if (loc) {
      setManualOriginName(loc.name);
      setManualOriginNameAr(loc.nameAr || loc.name);
      setManualOriginCity(loc.city);
      setManualOriginAddress(loc.address);
      setManualOriginLat(loc.lat);
      setManualOriginLng(loc.lng);
      setOriginCategory(loc.category || 'warehouse');
    }
  };

  const handleSelectDestPreset = (locId: string) => {
    setDestinationKey(locId);
    const loc = locations.find((l) => l.id === locId);
    if (loc) {
      setManualDestName(loc.name);
      setManualDestNameAr(loc.nameAr || loc.name);
      setManualDestCity(loc.city);
      setManualDestAddress(loc.address);
      setManualDestLat(loc.lat);
      setManualDestLng(loc.lng);
      setDestCategory(loc.category || 'customer_site');
    }
  };

  // Quick Save Origin/Pickup Location to Directory
  const handleQuickSaveOriginLocation = () => {
    if (!manualOriginName.trim() || !manualOriginCity.trim()) {
      showToast('Name Required', 'Please enter a name and city for the pickup location.', 'warning');
      return;
    }
    const saved = addLocation({
      name: manualOriginName.trim(),
      nameAr: manualOriginNameAr.trim() || manualOriginName.trim(),
      city: manualOriginCity.trim(),
      address: manualOriginAddress.trim() || `${manualOriginCity} Logistics Zone`,
      lat: Number(manualOriginLat) || 24.6408,
      lng: Number(manualOriginLng) || 46.8225,
      category: originCategory,
      isCustom: true,
    });
    setOriginKey(saved.id);
    setOriginSavedSuccess(true);
    setTimeout(() => setOriginSavedSuccess(false), 3500);
  };

  // Quick Save Destination/Drop Location to Directory
  const handleQuickSaveDestLocation = () => {
    if (!manualDestName.trim() || !manualDestCity.trim()) {
      showToast('Name Required', 'Please enter a name and city for the drop location.', 'warning');
      return;
    }
    const saved = addLocation({
      name: manualDestName.trim(),
      nameAr: manualDestNameAr.trim() || manualDestName.trim(),
      city: manualDestCity.trim(),
      address: manualDestAddress.trim() || `${manualDestCity} Delivery Site`,
      lat: Number(manualDestLat) || 21.4644,
      lng: Number(manualDestLng) || 39.1672,
      category: destCategory,
      isCustom: true,
    });
    setDestinationKey(saved.id);
    setDestSavedSuccess(true);
    setTimeout(() => setDestSavedSuccess(false), 3500);
  };

  // Quick city chip selection for Pickup Location
  const handleQuickOriginCity = (cityName: string) => {
    setManualOriginCity(cityName);
    const preset = saudiCityPresets[cityName];
    if (preset) {
      setManualOriginLat(preset.lat);
      setManualOriginLng(preset.lng);
      setManualOriginNameAr(preset.nameAr);
      if (!manualOriginName || manualOriginName.includes('Hub') || manualOriginName.includes('Facility')) {
        setManualOriginName(`${cityName} Industrial Plant / Hub`);
      }
      if (!manualOriginAddress || manualOriginAddress.includes('Warehouse')) {
        setManualOriginAddress(preset.defaultAddress);
      }
    }
  };

  // Quick city chip selection for Drop Location
  const handleQuickDestCity = (cityName: string) => {
    setManualDestCity(cityName);
    const preset = saudiCityPresets[cityName];
    if (preset) {
      setManualDestLat(preset.lat);
      setManualDestLng(preset.lng);
      setManualDestNameAr(preset.nameAr);
      if (!manualDestName || manualDestName.includes('Port') || manualDestName.includes('Site')) {
        setManualDestName(`${cityName} Distribution Depot / Site`);
      }
      if (!manualDestAddress || manualDestAddress.includes('Port')) {
        setManualDestAddress(preset.defaultAddress);
      }
    }
  };

  // Auto-fill Drop Location from selected Customer's registered address
  const handleFillDestFromCustomer = () => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setDropMode('manual');
      setManualDestName(cust.name + ' - Site Receiving Gate');
      setManualDestCity(cust.city || 'Riyadh');
      setManualDestAddress(cust.address || `${cust.city}, Industrial Sector`);
      const cityPreset = saudiCityPresets[cust.city];
      if (cityPreset) {
        setManualDestLat(cityPreset.lat);
        setManualDestLng(cityPreset.lng);
        setManualDestNameAr(cust.nameAr || cityPreset.nameAr);
      }
      showToast('Drop Location Updated', `Loaded delivery address for ${cust.name}`, 'info');
    }
  };

  // Swap Origin and Destination
  const handleSwapRoute = () => {
    // Swap Modes
    const prevPickupMode = pickupMode;
    const prevDropMode = dropMode;
    setPickupMode(prevDropMode);
    setDropMode(prevPickupMode);

    // Swap Presets
    const prevOrigKey = originKey;
    const prevDestKey = destinationKey;
    setOriginKey(prevDestKey);
    setDestinationKey(prevOrigKey);

    // Swap Manual Values
    const prevOrigName = manualOriginName;
    const prevOrigNameAr = manualOriginNameAr;
    const prevOrigCity = manualOriginCity;
    const prevOrigAddr = manualOriginAddress;
    const prevOrigLat = manualOriginLat;
    const prevOrigLng = manualOriginLng;
    const prevOrigCat = originCategory;

    setManualOriginName(manualDestName);
    setManualOriginNameAr(manualDestNameAr);
    setManualOriginCity(manualDestCity);
    setManualOriginAddress(manualDestAddress);
    setManualOriginLat(manualDestLat);
    setManualOriginLng(manualDestLng);
    setOriginCategory(destCategory);

    setManualDestName(prevOrigName);
    setManualDestNameAr(prevOrigNameAr);
    setManualDestCity(prevOrigCity);
    setManualDestAddress(prevOrigAddr);
    setManualDestLat(prevOrigLat);
    setManualDestLng(prevOrigLng);
    setDestCategory(prevOrigCat);

    showToast('Route Swapped', 'Pickup and Drop locations exchanged.', 'info');
  };

  if (!isOpen) return null;

  const handleAddItem = () => {
    setCargoItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: 'Packaged Merchandise',
        sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
        quantity: 100,
        unit: 'Carton',
        weightKg: 1200,
        volumeCbm: 4,
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (cargoItems.length === 1) return;
    setCargoItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: string, val: any) => {
    setCargoItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedDriver = drivers.find((d) => d.id === driverId) || drivers[0];
    const selectedVehicle = vehicles.find((v) => v.id === vehicleId) || vehicles[0];
    const selectedCustomer = customers.find((c) => c.id === customerId) || customers[0];

    // CONSTRUCT PICKUP LOCATION (ORIGIN)
    let originLoc: LocationPoint;
    if (pickupMode === 'preset') {
      originLoc = locations.find((l) => l.id === originKey) || locations[0] || {
        id: 'loc_ruh_1',
        name: 'Riyadh Central Logistics Hub, Sulay',
        nameAr: 'مركز الرياض اللوجستي المركزي - السلي',
        city: 'Riyadh',
        lat: 24.6408,
        lng: 46.8225,
        address: 'Warehouse Zone 4, Exit 18, Al Sulay, Riyadh 14264',
      };
    } else {
      originLoc = {
        id: `loc_origin_manual_${Date.now()}`,
        name: manualOriginName.trim() || `${manualOriginCity} Pickup Hub`,
        nameAr: manualOriginNameAr.trim() || `${manualOriginCity} موقع التحميل`,
        city: manualOriginCity.trim() || 'Riyadh',
        lat: Number(manualOriginLat) || 24.6408,
        lng: Number(manualOriginLng) || 46.8225,
        address: manualOriginAddress.trim() || `${manualOriginCity} Industrial Area, Saudi Arabia`,
        category: originCategory,
        isCustom: true,
      };
      if (saveOriginToDirectory) {
        addLocation(originLoc);
      }
    }

    // CONSTRUCT DROP LOCATION (DESTINATION)
    let destLoc: LocationPoint;
    if (dropMode === 'preset') {
      destLoc = locations.find((l) => l.id === destinationKey) || locations[1] || locations[0] || {
        id: 'loc_jed_1',
        name: 'Jeddah Islamic Port Logistics Zone',
        nameAr: 'منطقة ميناء جدة الإسلامي اللوجستية',
        city: 'Jeddah',
        lat: 21.4644,
        lng: 39.1672,
        address: 'Port Customs Bonded Area, Gate 5, Jeddah 22311',
      };
    } else {
      destLoc = {
        id: `loc_dest_manual_${Date.now()}`,
        name: manualDestName.trim() || `${manualDestCity} Drop Site`,
        nameAr: manualDestNameAr.trim() || `${manualDestCity} موقع التسليم`,
        city: manualDestCity.trim() || 'Jeddah',
        lat: Number(manualDestLat) || 21.4644,
        lng: Number(manualDestLng) || 39.1672,
        address: manualDestAddress.trim() || `${manualDestCity} Delivery Site, Saudi Arabia`,
        category: destCategory,
        isCustom: true,
      };
      if (saveDestToDirectory) {
        addLocation(destLoc);
      }
    }

    const totalWeight = cargoItems.reduce((acc, it) => acc + Number(it.weightKg || 0), 0);
    const totalVolume = cargoItems.reduce((acc, it) => acc + Number(it.volumeCbm || 0), 0);
    const totalPkgs = cargoItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0);

    const cityCode = originLoc.city ? originLoc.city.substring(0, 3).toUpperCase() : 'SAU';
    const dnNumber = `DN-${Math.floor(1000 + Math.random() * 9000)}-${cityCode}`;

    const newTripData: Omit<Trip, 'id' | 'tripNumber'> = {
      origin: originLoc,
      destination: destLoc,
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      driverPhone: selectedDriver.phone,
      vehicleId: selectedVehicle.id,
      vehiclePlate: selectedVehicle.plateNumber,
      vehicleType: selectedVehicle.type,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      status: 'assigned',
      isOutsideCompanyLoad,
      partnerCompanyName: isOutsideCompanyLoad ? partnerCompanyName : undefined,
      partnerCommissionRate: isOutsideCompanyLoad ? partnerCommissionRate : undefined,
      cargoType,
      temperatureRequired: cargoType === 'chilled' || cargoType === 'frozen' ? temperatureRequired : undefined,
      deliveryNote: {
        dnNumber,
        issueDate: new Date().toISOString().split('T')[0],
        expectedDelivery: new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16),
        senderName: companySettings.companyName,
        senderAddress: originLoc.address,
        senderContact: companySettings.phone,
        receiverName: selectedCustomer.name,
        receiverAddress: destLoc.address,
        receiverContact: selectedCustomer.phone,
        receiverVatNumber: selectedCustomer.vatNumber,
        items: cargoItems,
        totalWeightKg: totalWeight,
        totalVolumeCbm: totalVolume,
        packagesCount: totalPkgs,
        specialInstructions,
      },
      departureTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
      estimatedArrivalTime: new Date(Date.now() + 18 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16),
      price: Number(price),
      cost: Number(cost),
      progressPercent: 0,
      currentLat: originLoc.lat,
      currentLng: originLoc.lng,
      currentSpeedKmH: 0,
    };

    addTrip(newTripData);
    onClose();
  };

  return (
    <div
      id="new-trip-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="new-trip-modal-container"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-4 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600/10 via-slate-50 dark:via-slate-800/40 to-transparent sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Create New Trip & Delivery Note</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Manual Pickup &amp; Drop Supported
                </span>
              </div>
              <p className="text-xs text-slate-500">Configure pickup location, drop destination, driver, truck & cargo manifest</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* SECTION 1: PICKUP & DROP LOCATIONS (WITH PRESET OR MANUAL CUSTOM INPUT) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Route Configuration (إعداد مسار الرحلة: موقع التحميل والتسليم)
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {/* View Saved Directory Button */}
                <button
                  type="button"
                  onClick={() => setIsLocationsDirectoryOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                  title="View and Manage Saved Locations Directory"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Locations Directory ({locations.length})</span>
                </button>

                {/* Swap Route Button */}
                <button
                  type="button"
                  onClick={handleSwapRoute}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Swap Pickup and Drop Locations"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Swap Pickup ⇄ Drop</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* CARD 1: PICKUP LOCATION (ORIGIN) */}
              <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3">
                {/* Header & Mode Switcher */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                        Origin Point
                      </span>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white">
                        Pickup Location (موقع التحميل)
                      </h5>
                    </div>
                  </div>

                  {/* Segmented Mode Control */}
                  <div className="flex items-center p-1 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPickupMode('preset')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        pickupMode === 'preset'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Preset Hub
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickupMode('manual')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        pickupMode === 'manual'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      ✍️ Manual Input
                    </button>
                  </div>
                </div>

                {/* PRESET MODE PICKUP */}
                {pickupMode === 'preset' ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Select Preset Logistics Hub / Depot:
                      </label>
                      <select
                        id="preset-origin-select"
                        value={originKey ?? ""}
                        onChange={(e) => handleSelectOriginPreset(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <optgroup label="⭐ Saved & Standard Saudi Hubs">
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.isCustom ? '⭐ [SAVED] ' : ''}{loc.city} - {loc.name} {loc.category ? `(${loc.category.toUpperCase()})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Preset Details Preview */}
                    {(() => {
                      const selectedLoc = locations.find((l) => l.id === originKey) || locations[0];
                      if (!selectedLoc) return null;
                      return (
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              {selectedLoc.name}
                            </p>
                            {selectedLoc.isCustom && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                Saved Preset
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {selectedLoc.address}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                              GPS: {selectedLoc.lat.toFixed(4)}, {selectedLoc.lng.toFixed(4)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectOriginPreset(selectedLoc.id);
                                setPickupMode('manual');
                              }}
                              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Edit details manually</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* MANUAL CUSTOM PICKUP LOCATION */
                  <div className="space-y-3">
                    {/* Facility / Location Name */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Pickup Facility / Warehouse Name (اسم موقع التحميل / المنشأة) *
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Arabic &amp; English</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={manualOriginName ?? ""}
                        onChange={(e) => setManualOriginName(e.target.value)}
                        placeholder="e.g. Al-Yamamah Cement Plant Gate 4, SABIC Yanbu Depot..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Arabic Name & Location Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Arabic Name (الاسم بالعربي):
                        </label>
                        <input
                          type="text"
                          value={manualOriginNameAr ?? ""}
                          onChange={(e) => setManualOriginNameAr(e.target.value)}
                          placeholder="الاسم بالعربية..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Location Category (التصنيف):
                        </label>
                        <select
                          value={originCategory ?? ""}
                          onChange={(e) => setOriginCategory(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="warehouse">Warehouse (مستودع)</option>
                          <option value="plant">Factory / Plant (مصنع)</option>
                          <option value="hub">Distribution Hub (مركز توزيع)</option>
                          <option value="port">Seaport / Dry Port (ميناء)</option>
                          <option value="customer_site">Customer Site (موقع عميل)</option>
                          <option value="custom">Custom Site (موقع خاص)</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick City Selection Chips */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        City / Region (المدينة):
                      </label>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {['Riyadh', 'Jeddah', 'Dammam', 'Al-Kharj', 'Yanbu', 'Jubail', 'Rabigh', 'Tabuk'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleQuickOriginCity(c)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                              manualOriginCity.toLowerCase() === c.toLowerCase()
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        required
                        value={manualOriginCity ?? ""}
                        onChange={(e) => setManualOriginCity(e.target.value)}
                        placeholder="Or enter custom city name..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Detailed Street Address / Gate */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Detailed Address / Gate / Landmark (العنوان التفصيلي / البوابة) *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualOriginAddress ?? ""}
                        onChange={(e) => setManualOriginAddress(e.target.value)}
                        placeholder="e.g. Industrial Area Phase 2, Exit 18, Warehouse Block C-14"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Coordinates (Lat / Lng) */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                          Latitude (خط العرض)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={manualOriginLat ?? ""}
                          onChange={(e) => setManualOriginLat(Number(e.target.value))}
                          className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                          Longitude (خط الطول)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={manualOriginLng ?? ""}
                          onChange={(e) => setManualOriginLng(Number(e.target.value))}
                          className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Save to Directory Action Bar */}
                    <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveOriginToDirectory}
                          onChange={(e) => setSaveOriginToDirectory(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span>Save to directory for future trips (حفظ في الدليل)</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleQuickSaveOriginLocation}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                          originSavedSuccess
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {originSavedSuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved to Presets!</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span>Save Location Now (حفظ الآن)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 2: DROP LOCATION (DESTINATION) */}
              <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/50 space-y-3">
                {/* Header & Mode Switcher */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                        Destination Point
                      </span>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white">
                        Drop Location (موقع التسليم)
                      </h5>
                    </div>
                  </div>

                  {/* Segmented Mode Control */}
                  <div className="flex items-center p-1 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDropMode('preset')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        dropMode === 'preset'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Preset Depot
                    </button>
                    <button
                      type="button"
                      onClick={() => setDropMode('manual')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        dropMode === 'manual'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      ✍️ Manual Input
                    </button>
                  </div>
                </div>

                {/* PRESET MODE DROP */}
                {dropMode === 'preset' ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Select Preset Destination Depot / Port:
                      </label>
                      <select
                        id="preset-destination-select"
                        value={destinationKey ?? ""}
                        onChange={(e) => handleSelectDestPreset(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <optgroup label="⭐ Saved & Standard Saudi Drop Sites">
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.isCustom ? '⭐ [SAVED] ' : ''}{loc.city} - {loc.name} {loc.category ? `(${loc.category.toUpperCase()})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Preset Details Preview */}
                    {(() => {
                      const selectedLoc = locations.find((l) => l.id === destinationKey) || locations[1] || locations[0];
                      if (!selectedLoc) return null;
                      return (
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              {selectedLoc.name}
                            </p>
                            {selectedLoc.isCustom && (
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                                Saved Preset
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {selectedLoc.address}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                              GPS: {selectedLoc.lat.toFixed(4)}, {selectedLoc.lng.toFixed(4)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectDestPreset(selectedLoc.id);
                                setDropMode('manual');
                              }}
                              className="text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Edit details manually</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* MANUAL CUSTOM DROP LOCATION */
                  <div className="space-y-3">
                    {/* Consignee / Drop Site Name + Quick Customer Auto-Fill */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Drop Facility / Consignee Site (اسم موقع التسليم / العميل) *
                        </label>
                        <button
                          type="button"
                          onClick={handleFillDestFromCustomer}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Building2 className="w-3 h-3" />
                          <span>Fill from Client Address</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={manualDestName ?? ""}
                        onChange={(e) => setManualDestName(e.target.value)}
                        placeholder="e.g. Red Sea Project Coastal Depot 3, King Salman Park Gate 12..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Arabic Name & Location Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Arabic Name (الاسم بالعربي):
                        </label>
                        <input
                          type="text"
                          value={manualDestNameAr ?? ""}
                          onChange={(e) => setManualDestNameAr(e.target.value)}
                          placeholder="الاسم بالعربية..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none text-right"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Location Category (التصنيف):
                        </label>
                        <select
                          value={destCategory ?? ""}
                          onChange={(e) => setDestCategory(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="customer_site">Customer Receiving Site (موقع عميل)</option>
                          <option value="warehouse">Warehouse (مستودع)</option>
                          <option value="plant">Factory / Plant (مصنع)</option>
                          <option value="hub">Distribution Hub (مركز توزيع)</option>
                          <option value="port">Seaport / Dry Port (ميناء)</option>
                          <option value="project_camp">Project Camp (موقع مشروع)</option>
                          <option value="custom">Custom Site (موقع خاص)</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick City Selection Chips */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        City / Region (المدينة):
                      </label>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {['Jeddah', 'Riyadh', 'Dammam', 'Neom', 'Medina', 'Mecca', 'Jubail', 'Jizan'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleQuickDestCity(c)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                              manualDestCity.toLowerCase() === c.toLowerCase()
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-blue-50'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        required
                        value={manualDestCity ?? ""}
                        onChange={(e) => setManualDestCity(e.target.value)}
                        placeholder="Or enter custom destination city..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Detailed Street Address / Delivery Gate */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Detailed Address / Site Gate / Landmark (العنوان وموقع التفريغ) *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualDestAddress ?? ""}
                        onChange={(e) => setManualDestAddress(e.target.value)}
                        placeholder="e.g. Port Customs Bonded Area, Gate 5, Delivery Bay 2"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Coordinates (Lat / Lng) */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                          Latitude (خط العرض)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={manualDestLat ?? ""}
                          onChange={(e) => setManualDestLat(Number(e.target.value))}
                          className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                          Longitude (خط الطول)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={manualDestLng ?? ""}
                          onChange={(e) => setManualDestLng(Number(e.target.value))}
                          className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Save to Directory Action Bar */}
                    <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/60 flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveDestToDirectory}
                          onChange={(e) => setSaveDestToDirectory(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>Save to directory for future trips (حفظ في الدليل)</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleQuickSaveDestLocation}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                          destSavedSuccess
                            ? 'bg-blue-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {destSavedSuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved to Presets!</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span>Save Location Now (حفظ الآن)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* LIVE ROUTE STRIP PREVIEW */}
            {(() => {
              const origObj = locations.find((l) => l.id === originKey) || locations[0];
              const destObj = locations.find((l) => l.id === destinationKey) || locations[1] || locations[0];
              return (
                <div className="p-3 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{pickupMode === 'preset' ? origObj?.city : manualOriginCity}</span>
                    </div>
                    <span className="text-slate-500">➔</span>
                    <div className="flex items-center gap-1 text-blue-400 font-bold">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{dropMode === 'preset' ? destObj?.city : manualDestCity}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="truncate max-w-xs">
                      From: {pickupMode === 'preset' ? origObj?.name?.split(',')[0] : manualOriginName}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="truncate max-w-xs">
                      To: {dropMode === 'preset' ? destObj?.name?.split(',')[0] : manualDestName}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* SECTION 2: CLIENT, DRIVER, VEHICLE & CARGO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Client / Account *
              </label>
              <select
                id="trip-customer-select"
                value={customerId ?? ""}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assign Driver *
              </label>
              <select
                id="trip-driver-select"
                value={driverId ?? ""}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.status}) - {d.licenseCategory.split('(')[0]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assign Truck / Trailer *
              </label>
              <select
                id="trip-vehicle-select"
                value={vehicleId ?? ""}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} - {v.truckModel.split('(')[0]} ({v.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cargo Classification *
              </label>
              <select
                value={cargoType ?? ""}
                onChange={(e) => setCargoType(e.target.value as CargoType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium capitalize focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="general">General Dry Goods</option>
                <option value="chilled">Chilled Food / Cold Chain (+2°C to +8°C)</option>
                <option value="frozen">Deep Frozen (-18°C)</option>
                <option value="industrial">Heavy Industrial / Bulk Silo / Chemicals</option>
                <option value="fragile">Fragile Electronics & Glass</option>
              </select>
            </div>
          </div>

          {/* Pricing & 3rd-Party Haulage Broker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Freight Revenue / Rate (SAR)
              </label>
              <input
                type="number"
                value={price ?? ""}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Direct Operating Cost (SAR)
              </label>
              <input
                type="number"
                value={cost ?? ""}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={isOutsideCompanyLoad}
                  onChange={(e) => setIsOutsideCompanyLoad(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Outside 3rd-Party Haulage Broker
                </span>
              </label>
            </div>
          </div>

          {/* Partner Broker Details */}
          {isOutsideCompanyLoad && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-blue-900 dark:text-blue-200">Partner Broker Name</label>
                <input
                  type="text"
                  value={partnerCompanyName ?? ""}
                  onChange={(e) => setPartnerCompanyName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-blue-900 dark:text-blue-200">Commission Rate (e.g. 0.10 for 10%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={partnerCommissionRate ?? ""}
                  onChange={(e) => setPartnerCommissionRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          )}

          {/* Cargo Manifest Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Delivery Note Cargo Manifest</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Cargo Line
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {cargoItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Item name / goods..."
                      value={item.name ?? ""}
                      onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="SKU"
                      value={item.sku ?? ""}
                      onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity ?? ""}
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Weight (kg)"
                      value={item.weightKg ?? ""}
                      onChange={(e) => handleUpdateItem(item.id, 'weightKg', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                      title="Remove Cargo Line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Special Handling Instructions & Delivery Notes
            </label>
            <textarea
              rows={2}
              value={specialInstructions ?? ""}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-create-trip-btn"
              className="px-6 py-3 text-xs font-black rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/25 transition-all transform active:scale-98 cursor-pointer flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Confirm Dispatch &amp; Issue Delivery Note</span>
            </button>
          </div>
        </form>

        {/* LOCATIONS DIRECTORY MODAL */}
        {isLocationsDirectoryOpen && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
            onClick={() => setIsLocationsDirectoryOpen(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Directory Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Logistics Hubs &amp; Locations Directory (دليل المواقع والمستودعات)
                    </h3>
                    <p className="text-xs text-slate-500">
                      {locations.length} standard &amp; custom locations saved in database
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationsDirectoryOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Directory Search & Filter */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={locationSearchQuery ?? ""}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder="Search by facility name, Arabic title, city, or address..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Directory List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[50vh]">
                {locations
                  .filter((loc) => {
                    const q = locationSearchQuery.toLowerCase();
                    return (
                      !q ||
                      loc.name.toLowerCase().includes(q) ||
                      (loc.nameAr && loc.nameAr.toLowerCase().includes(q)) ||
                      loc.city.toLowerCase().includes(q) ||
                      (loc.address && loc.address.toLowerCase().includes(q))
                    );
                  })
                  .map((loc) => (
                    <div
                      key={loc.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {loc.name}
                          </span>
                          {loc.nameAr && (
                            <span className="text-xs text-slate-500 font-normal" dir="rtl">
                              ({loc.nameAr})
                            </span>
                          )}
                          {loc.isCustom ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              ★ Custom Saved
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              System Hub
                            </span>
                          )}
                          {loc.category && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {loc.category}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          📍 {loc.city} — {loc.address}
                        </p>

                        <div className="text-[10px] font-mono text-slate-400">
                          GPS: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </div>
                      </div>

                      {/* Quick Select Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectOriginPreset(loc.id);
                            setPickupMode('preset');
                            setIsLocationsDirectoryOpen(false);
                            showToast('Pickup Location Selected', `Loaded ${loc.name} as Pickup Point`, 'success');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                        >
                          Use as Pickup
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleSelectDestPreset(loc.id);
                            setDropMode('preset');
                            setIsLocationsDirectoryOpen(false);
                            showToast('Drop Location Selected', `Loaded ${loc.name} as Drop Destination`, 'success');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                        >
                          Use as Drop
                        </button>

                        {['admin', 'manager', 'gm', 'dispatcher'].includes(activeRole) && loc.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              deleteLocation(loc.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Delete Saved Location"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Directory Footer */}
              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500">
                <span>Tip: You can add and save new locations from the Manual Input tab during trip creation.</span>
                <button
                  type="button"
                  onClick={() => setIsLocationsDirectoryOpen(false)}
                  className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

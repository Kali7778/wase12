import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Driver, Vehicle, DriverStatus, DriverDocumentInfo, DocumentExpiryStatus } from '../types';
import { formatCurrency } from '../utils/i18n';
import { calculateDocumentExpiryStatus } from '../utils/supabaseStorage';
import { DriverFormModal } from '../components/DriverFormModal';
import { DriverDocumentPreviewModal } from '../components/DriverDocumentPreviewModal';
import {
  Users,
  Truck,
  Plus,
  Star,
  Shield,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Fuel,
  Gauge,
  Thermometer,
  Wrench,
  Edit3,
  FileText,
  ShieldCheck,
  HardDrive
} from 'lucide-react';

export const DriversFleetView: React.FC = () => {
  const { drivers, vehicles, addDriver, addVehicle, updateDriver, updateVehicle, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'drivers' | 'fleet'>('drivers');

  // Driver Form Modal State (Add & Edit)
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<DriverDocumentInfo | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewDriverName, setPreviewDriverName] = useState('');
  const [previewExpiryStatus, setPreviewExpiryStatus] = useState<DocumentExpiryStatus | undefined>(undefined);
  const [previewExpiryDate, setPreviewExpiryDate] = useState<string | undefined>(undefined);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // New Vehicle Form State
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehType, setNewVehType] = useState<any>('trailer_30t');
  const [newVehCapacity, setNewVehCapacity] = useState(30);

  const handleOpenAddDriver = () => {
    setDriverToEdit(null);
    setShowDriverModal(true);
  };

  const handleOpenEditDriver = (driver: Driver) => {
    setDriverToEdit(driver);
    setShowDriverModal(true);
  };

  const handleSaveDriver = (driverData: Partial<Driver>) => {
    if (driverToEdit) {
      updateDriver(driverToEdit.id, driverData);
    } else {
      addDriver({
        name: driverData.name || 'New Driver',
        nameAr: driverData.nameAr || driverData.name || 'سائق جديد',
        employeeId: driverData.employeeId,
        phone: driverData.phone || '',
        email: `${(driverData.name || 'driver').toLowerCase().replace(/\s+/g, '.')}@logiflow.sa`,
        nationalIdOrIqama: driverData.nationalIdOrIqama || '1098472910',
        assignedVehiclePlate: driverData.assignedVehiclePlate,
        assignedVehicleId: driverData.assignedVehicleId,
        iqamaIssueDate: driverData.iqamaIssueDate,
        iqamaExpiryDate: driverData.iqamaExpiryDate,
        iqamaStatus: driverData.iqamaStatus,
        iqamaDocument: driverData.iqamaDocument,
        licenseNumber: driverData.licenseNumber || `DL-SA-${Math.floor(10000 + Math.random() * 90000)}`,
        licenseIssueDate: driverData.licenseIssueDate,
        licenseExpiry: driverData.licenseExpiry || '2028-12-31',
        rukhsaIssueDate: driverData.rukhsaIssueDate,
        rukhsaExpiryDate: driverData.rukhsaExpiryDate,
        rukhsaStatus: driverData.rukhsaStatus,
        rukhsaDocument: driverData.rukhsaDocument,
        licenseCategory: driverData.licenseCategory || 'Heavy Vehicle / Trailer (نقل ثقيل)',
        avatarUrl: driverData.avatarUrl || undefined,
        status: 'available',
        baseSalary: Number(driverData.baseSalary) || 6000,
        tripAllowanceRate: 200,
        rating: 4.85,
        totalTripsCompleted: 0,
        safetyScore: 98,
        joinedDate: new Date().toISOString().split('T')[0],
        emergencyContact: '+966 50 111 2233',
      });
    }
  };

  const handlePreviewDocument = (
    doc: DriverDocumentInfo,
    title: string,
    driverName: string,
    expiryStatus?: DocumentExpiryStatus,
    expiryDate?: string
  ) => {
    setPreviewDoc(doc);
    setPreviewTitle(title);
    setPreviewDriverName(driverName);
    setPreviewExpiryStatus(expiryStatus);
    setPreviewExpiryDate(expiryDate);
    setShowPreviewModal(true);
  };

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehPlate.trim() || !newVehModel.trim()) {
      showToast('Missing Fields', 'Please enter truck plate number and model.', 'warning');
      return;
    }
    addVehicle({
      plateNumber: newVehPlate.trim(),
      truckModel: newVehModel.trim(),
      year: 2025,
      type: newVehType,
      capacityTonnes: Number(newVehCapacity),
      volumeCapacityCbm: Number(newVehCapacity) * 3,
      isReefer: newVehType === 'reefer_chilled',
      currentOdometerKm: 12500,
      fuelLevelPercent: 90,
      status: 'active',
      lastMaintenanceDate: new Date().toISOString().split('T')[0],
      nextMaintenanceDueKm: 25000,
      insuranceExpiryDate: '2027-06-30',
      currentLat: 24.6408,
      currentLng: 46.8225,
    });
    setShowAddVehicleModal(false);
    setNewVehPlate('');
    setNewVehModel('');
  };

  return (
    <div id="drivers-fleet-view" className="space-y-6">
      {/* View Header with Tab Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Drivers & Fleet Management
          </h1>
          <p className="text-xs text-slate-500">
            Professional driver roster, licensing, safety scores, vehicle registries & maintenance schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('drivers')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'drivers'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Drivers ({drivers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'fleet'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Fleet Vehicles ({vehicles.length})</span>
            </button>
          </div>

          <button
            onClick={() => (activeTab === 'drivers' ? handleOpenAddDriver() : setShowAddVehicleModal(true))}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'drivers' ? 'Add Driver' : 'Register Vehicle'}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Drivers Roster */}
      {activeTab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => {
            const iqamaStatus = calculateDocumentExpiryStatus(driver.iqamaExpiryDate);
            const rukhsaExpiry = driver.rukhsaExpiryDate || driver.licenseExpiry;
            const rukhsaStatus = calculateDocumentExpiryStatus(rukhsaExpiry);

            return (
              <div
                key={driver.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Driver Identity Header */}
                <div className="flex items-start gap-3.5">
                  <img
                    src={driver.avatarUrl}
                    alt={driver.name}
                    className="w-13 h-13 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm">{driver.name}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          driver.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : driver.status === 'on_route'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {driver.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-xs text-slate-500 font-arabic truncate">{driver.nameAr}</p>
                      {driver.employeeId && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {driver.employeeId}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">
                      Iqama/ID: {driver.nationalIdOrIqama}
                    </div>
                  </div>
                </div>

                {/* Key Assignment & License Details */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                  {/* Truck Assignment */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-500" /> Assigned Truck:
                    </span>
                    {driver.assignedVehiclePlate ? (
                      <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/60">
                        {driver.assignedVehiclePlate}
                      </span>
                    ) : (
                      <span className="font-mono text-slate-400 italic text-[11px]">Unassigned</span>
                    )}
                  </div>

                  {/* Iqama Status & Preview */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-semibold">Iqama:</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {driver.iqamaExpiryDate ? (
                        <>
                          {iqamaStatus.status === 'valid' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Valid
                            </span>
                          )}
                          {iqamaStatus.status === 'expiring_soon' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Expiring Soon
                            </span>
                          )}
                          {iqamaStatus.status === 'expired' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5" /> Expired
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">No Date</span>
                      )}

                      {driver.iqamaDocument && (
                        <button
                          onClick={() =>
                            handlePreviewDocument(
                              driver.iqamaDocument!,
                              'Iqama Document',
                              driver.name,
                              iqamaStatus.status,
                              driver.iqamaExpiryDate
                            )
                          }
                          className="p-1 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-all cursor-pointer"
                          title="View Iqama Document in Supabase Storage"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rukhsa (Licence) Status & Preview */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-semibold">Rukhsa:</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {rukhsaExpiry ? (
                        <>
                          {rukhsaStatus.status === 'valid' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Valid
                            </span>
                          )}
                          {rukhsaStatus.status === 'expiring_soon' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Expiring Soon
                            </span>
                          )}
                          {rukhsaStatus.status === 'expired' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5" /> Expired
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">No Date</span>
                      )}

                      {driver.rukhsaDocument && (
                        <button
                          onClick={() =>
                            handlePreviewDocument(
                              driver.rukhsaDocument!,
                              'Rukhsa (Driving Licence)',
                              driver.name,
                              rukhsaStatus.status,
                              rukhsaExpiry
                            )
                          }
                          className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-all cursor-pointer"
                          title="View Rukhsa Document in Supabase Storage"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* License Category & Completed Trips */}
                  <div className="flex justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                      {driver.licenseCategory}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Completed Trips:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{driver.totalTripsCompleted}</span>
                  </div>
                </div>

                {/* Rating & Safety Index */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-200">{driver.rating} / 5.0</div>
                      <span className="text-[10px] text-slate-400">Rating</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-900 dark:text-emerald-200">{driver.safetyScore}%</div>
                      <span className="text-[10px] text-slate-400">Safety Index</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Phone, Salary & Edit Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{driver.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatCurrency(driver.baseSalary)}/mo
                    </span>

                    <button
                      onClick={() => handleOpenEditDriver(driver)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/60 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      title="Edit Driver, Assigned Truck, Dates & Documents"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Fleet Vehicles Registry */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((veh) => (
            <div
              key={veh.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black font-mono tracking-wider text-slate-900 dark:text-white">
                    {veh.plateNumber}
                  </span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      veh.status === 'in_transit'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : veh.status === 'maintenance'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {veh.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-1">
                  {veh.truckModel}
                </h3>
              </div>

              {/* Specs & Capacity */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payload Capacity:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {veh.capacityTonnes} Tonnes ({veh.volumeCapacityCbm} m³)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reefer Cold Chain:</span>
                  <span className={`font-bold ${veh.isReefer ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                    {veh.isReefer ? `YES (${veh.temperatureMin}°C to ${veh.temperatureMax}°C)` : 'Dry Standard'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Odometer:</span>
                  <span className="font-mono">{(veh.currentOdometerKm ?? 0).toLocaleString()} KM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Driver Assigned:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{veh.assignedDriverName || 'Unassigned'}</span>
                </div>
              </div>

              {/* Fuel & Maintenance Bar */}
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-blue-500" /> Fuel Level:
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{veh.fuelLevelPercent ?? 100}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (veh.fuelLevelPercent ?? 100) < 30 ? 'bg-rose-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${veh.fuelLevelPercent ?? 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-amber-500" /> Next Service:
                  </span>
                  <span className="font-mono">{(veh.nextMaintenanceDueKm ?? 0).toLocaleString()} KM</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Driver Form Modal (Add & Edit Driver with Truck Assignment & Supabase Documents) */}
      <DriverFormModal
        isOpen={showDriverModal}
        onClose={() => {
          setShowDriverModal(false);
          setDriverToEdit(null);
        }}
        driverToEdit={driverToEdit}
        vehicles={vehicles}
        existingDriversCount={drivers.length}
        onSave={handleSaveDriver}
        onPreviewDocument={handlePreviewDocument}
      />

      {/* Driver Document Preview Modal (Iqama & Rukhsa PDF/Image viewer) */}
      <DriverDocumentPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewDoc(null);
        }}
        document={previewDoc}
        title={previewTitle}
        driverName={previewDriverName}
        expiryStatus={previewExpiryStatus}
        expiryDate={previewExpiryDate}
      />

      {/* Modal: Add Vehicle */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register Fleet Truck / Trailer</h3>
            <form onSubmit={handleCreateVehicle} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Plate Number & Letters</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5512 HJA (أ ج ح ٥٥١٢)"
                  value={newVehPlate}
                  onChange={(e) => setNewVehPlate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Make & Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mercedes-Benz Actros 3340"
                  value={newVehModel}
                  onChange={(e) => setNewVehModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Configuration Type</label>
                <select
                  value={newVehType}
                  onChange={(e) => setNewVehType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="trailer_30t">30T Heavy Trailer (تريلا)</option>
                  <option value="reefer_chilled">Reefer Refrigerated Truck (ثلاجة)</option>
                  <option value="dyna_10t">10T Medium Dyna (دينا)</option>
                  <option value="flatbed">Flatbed Heavy Carrier (سطحة)</option>
                  <option value="box_van">City Box Van (فان توزيع)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Payload Capacity (Tonnes)</label>
                <input
                  type="number"
                  value={newVehCapacity}
                  onChange={(e) => setNewVehCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

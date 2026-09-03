import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Driver, Vehicle, DriverStatus } from '../types';
import { formatCurrency } from '../utils/i18n';
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
  DollarSign,
  Fuel,
  Gauge,
  Thermometer,
  Wrench
} from 'lucide-react';

export const DriversFleetView: React.FC = () => {
  const { drivers, vehicles, addDriver, addVehicle, updateDriver, updateVehicle, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'drivers' | 'fleet'>('drivers');
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // New Driver Form State
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverIqama, setNewDriverIqama] = useState('');
  const [newDriverCategory, setNewDriverCategory] = useState('Heavy Vehicle / Trailer (نقل ثقيل)');
  const [newDriverSalary, setNewDriverSalary] = useState(6000);

  // New Vehicle Form State
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehType, setNewVehType] = useState<any>('trailer_30t');
  const [newVehCapacity, setNewVehCapacity] = useState(30);

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim() || !newDriverPhone.trim()) {
      showToast('Missing Fields', 'Please provide driver name and contact phone.', 'warning');
      return;
    }
    addDriver({
      name: newDriverName.trim(),
      nameAr: newDriverName.trim(),
      phone: newDriverPhone.trim(),
      email: `${newDriverName.toLowerCase().replace(/\s+/g, '.')}@logiflow.sa`,
      nationalIdOrIqama: newDriverIqama || '1098472910',
      licenseNumber: `DL-SA-${Math.floor(10000 + Math.random() * 90000)}`,
      licenseExpiry: '2028-12-31',
      licenseCategory: newDriverCategory,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'available',
      baseSalary: Number(newDriverSalary),
      tripAllowanceRate: 200,
      rating: 4.8,
      totalTripsCompleted: 0,
      safetyScore: 98,
      joinedDate: new Date().toISOString().split('T')[0],
      emergencyContact: '+966 50 111 2233',
    });
    setShowAddDriverModal(false);
    setNewDriverName('');
    setNewDriverPhone('');
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
            onClick={() => (activeTab === 'drivers' ? setShowAddDriverModal(true) : setShowAddVehicleModal(true))}
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
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <img
                  src={driver.avatarUrl}
                  alt={driver.name}
                  className="w-13 h-13 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{driver.name}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
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
                  <p className="text-xs text-slate-500 font-arabic">{driver.nameAr}</p>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Iqama/ID: {driver.nationalIdOrIqama}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">License Category:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                    {driver.licenseCategory}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Truck:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {driver.assignedVehiclePlate || 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Completed Trips:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{driver.totalTripsCompleted}</span>
                </div>
              </div>

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

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {driver.phone}
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(driver.baseSalary)} /mo
                </span>
              </div>
            </div>
          ))}
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

      {/* Modal: Add Driver */}
      {showAddDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register New Fleet Driver</h3>
            <form onSubmit={handleCreateDriver} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Driver Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Khalid Al-Zahrani"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Mobile Phone (KSA)</label>
                <input
                  type="text"
                  required
                  placeholder="+966 50 ..."
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">National ID / Iqama Number</label>
                <input
                  type="text"
                  placeholder="10-digit ID..."
                  value={newDriverIqama}
                  onChange={(e) => setNewDriverIqama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">License Category</label>
                <select
                  value={newDriverCategory}
                  onChange={(e) => setNewDriverCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option>Heavy Vehicle / Trailer (نقل ثقيل)</option>
                  <option>Reefer / Cold Chain Specialist (نقل مبرد)</option>
                  <option>Medium Dyna Transport (نقل متوسط)</option>
                  <option>Light Box Van (توزيع خفيف)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Monthly Base Salary (SAR)</label>
                <input
                  type="number"
                  value={newDriverSalary}
                  onChange={(e) => setNewDriverSalary(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Add Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

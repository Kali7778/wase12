import React, { useState, useEffect, useRef } from 'react';
import { Driver, Vehicle, DriverDocumentInfo, DocumentExpiryStatus } from '../types';
import {
  calculateDocumentExpiryStatus,
  uploadDriverDocumentToSupabase
} from '../utils/supabaseStorage';
import {
  X,
  User,
  Hash,
  Phone,
  Truck,
  Calendar,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  RefreshCw,
  Trash2,
  HardDrive,
  DollarSign,
  ShieldCheck,
  Check
} from 'lucide-react';

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverToEdit?: Driver | null;
  vehicles: Vehicle[];
  existingDriversCount: number;
  onSave: (driverData: Partial<Driver>) => void;
  onPreviewDocument: (
    doc: DriverDocumentInfo,
    title: string,
    driverName: string,
    expiryStatus?: DocumentExpiryStatus,
    expiryDate?: string
  ) => void;
}

export const DriverFormModal: React.FC<DriverFormModalProps> = ({
  isOpen,
  onClose,
  driverToEdit,
  vehicles,
  existingDriversCount,
  onSave,
  onPreviewDocument,
}) => {
  const isEditMode = !!driverToEdit;

  // Driver Information
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedTruckPlate, setAssignedTruckPlate] = useState('');

  // Additional existing fields to preserve compatibility
  const [nameAr, setNameAr] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('Heavy Vehicle / Trailer (نقل ثقيل)');
  const [baseSalary, setBaseSalary] = useState(6000);

  // Iqama
  const [nationalIdOrIqama, setNationalIdOrIqama] = useState('');
  const [iqamaIssueDate, setIqamaIssueDate] = useState('');
  const [iqamaExpiryDate, setIqamaExpiryDate] = useState('');
  const [iqamaDocument, setIqamaDocument] = useState<DriverDocumentInfo | undefined>(undefined);
  const [isUploadingIqama, setIsUploadingIqama] = useState(false);

  // Rukhsa (Driving Licence)
  const [licenseNumber, setLicenseNumber] = useState('');
  const [rukhsaIssueDate, setRukhsaIssueDate] = useState('');
  const [rukhsaExpiryDate, setRukhsaExpiryDate] = useState('');
  const [rukhsaDocument, setRukhsaDocument] = useState<DriverDocumentInfo | undefined>(undefined);
  const [isUploadingRukhsa, setIsUploadingRukhsa] = useState(false);

  // Hidden File Inputs
  const iqamaFileInputRef = useRef<HTMLInputElement>(null);
  const rukhsaFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form on open / driver change
  useEffect(() => {
    if (driverToEdit) {
      setName(driverToEdit.name || '');
      setEmployeeId(driverToEdit.employeeId || `DRV-${String(driverToEdit.id.replace('drv_', '')).padStart(3, '0')}`);
      setPhone(driverToEdit.phone || '');
      setAssignedTruckPlate(driverToEdit.assignedVehiclePlate || '');
      setNameAr(driverToEdit.nameAr || driverToEdit.name || '');
      setLicenseCategory(driverToEdit.licenseCategory || 'Heavy Vehicle / Trailer (نقل ثقيل)');
      setBaseSalary(driverToEdit.baseSalary || 6000);

      // Iqama
      setNationalIdOrIqama(driverToEdit.nationalIdOrIqama || '');
      setIqamaIssueDate(driverToEdit.iqamaIssueDate || '');
      setIqamaExpiryDate(driverToEdit.iqamaExpiryDate || '');
      setIqamaDocument(driverToEdit.iqamaDocument);

      // Rukhsa
      setLicenseNumber(driverToEdit.licenseNumber || '');
      setRukhsaIssueDate(driverToEdit.rukhsaIssueDate || driverToEdit.licenseIssueDate || '');
      setRukhsaExpiryDate(driverToEdit.rukhsaExpiryDate || driverToEdit.licenseExpiry || '');
      setRukhsaDocument(driverToEdit.rukhsaDocument);
    } else {
      // New driver defaults
      setName('');
      setEmployeeId(`DRV-${String(existingDriversCount + 1).padStart(3, '0')}`);
      setPhone('+966 5');
      setAssignedTruckPlate('');
      setNameAr('');
      setLicenseCategory('Heavy Vehicle / Trailer (نقل ثقيل)');
      setBaseSalary(6000);

      setNationalIdOrIqama('');
      setIqamaIssueDate('');
      setIqamaExpiryDate('');
      setIqamaDocument(undefined);

      setLicenseNumber(`DL-SA-${Math.floor(10000 + Math.random() * 90000)}`);
      setRukhsaIssueDate('');
      setRukhsaExpiryDate('');
      setRukhsaDocument(undefined);
    }
  }, [driverToEdit, isOpen, existingDriversCount]);

  if (!isOpen) return null;

  // Real-time status computations
  const iqamaStatusObj = calculateDocumentExpiryStatus(iqamaExpiryDate);
  const rukhsaStatusObj = calculateDocumentExpiryStatus(rukhsaExpiryDate);

  // Upload handler for Iqama
  const handleIqamaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIqama(true);
    try {
      const docInfo = await uploadDriverDocumentToSupabase(
        file,
        driverToEdit?.id || employeeId || 'new_driver',
        'iqama'
      );
      setIqamaDocument(docInfo);
    } catch (error) {
      console.error('Failed to upload Iqama to Supabase:', error);
    } finally {
      setIsUploadingIqama(false);
      if (iqamaFileInputRef.current) iqamaFileInputRef.current.value = '';
    }
  };

  // Upload handler for Rukhsa
  const handleRukhsaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingRukhsa(true);
    try {
      const docInfo = await uploadDriverDocumentToSupabase(
        file,
        driverToEdit?.id || employeeId || 'new_driver',
        'rukhsa'
      );
      setRukhsaDocument(docInfo);
    } catch (error) {
      console.error('Failed to upload Rukhsa to Supabase:', error);
    } finally {
      setIsUploadingRukhsa(false);
      if (rukhsaFileInputRef.current) rukhsaFileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    // Find assigned vehicle ID if selected
    const selectedVeh = vehicles.find((v) => v.plateNumber === assignedTruckPlate);

    const driverPayload: Partial<Driver> = {
      name: name.trim(),
      employeeId: employeeId.trim(),
      phone: phone.trim(),
      nameAr: nameAr.trim() || name.trim(),
      assignedVehiclePlate: assignedTruckPlate || undefined,
      assignedVehicleId: selectedVeh ? selectedVeh.id : undefined,
      licenseCategory,
      baseSalary: Number(baseSalary) || 6000,

      // Iqama
      nationalIdOrIqama: nationalIdOrIqama.trim() || '1098472910',
      iqamaIssueDate: iqamaIssueDate || undefined,
      iqamaExpiryDate: iqamaExpiryDate || undefined,
      iqamaStatus: iqamaExpiryDate ? iqamaStatusObj.status : undefined,
      iqamaDocument,

      // Rukhsa
      licenseNumber: licenseNumber.trim(),
      licenseIssueDate: rukhsaIssueDate || undefined,
      licenseExpiry: rukhsaExpiryDate || '2028-12-31',
      rukhsaIssueDate: rukhsaIssueDate || undefined,
      rukhsaExpiryDate: rukhsaExpiryDate || '2028-12-31',
      rukhsaStatus: rukhsaExpiryDate ? rukhsaStatusObj.status : undefined,
      rukhsaDocument,
    };

    onSave(driverPayload);
    onClose();
  };

  return (
    <div
      id="driver-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                {isEditMode ? `Edit Driver Profile: ${driverToEdit.name}` : 'Register New Fleet Driver'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-indigo-500" /> Supabase Storage
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage driver identity, assigned truck fleet link, Iqama & Rukhsa documents with Supabase Cloud Storage.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* 1. DRIVER INFORMATION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-blue-600" /> Driver Information
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Employee Record</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Driver Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Driver Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Khalid Al-Zahrani"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Driver ID / Employee ID */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Driver ID / Employee ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. DRV-006"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number (KSA) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="+966 50 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Truck Assignment */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Truck Assignment (Fleet Selection)
                </label>
                <div className="relative">
                  <Truck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <select
                    value={assignedTruckPlate}
                    onChange={(e) => setAssignedTruckPlate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 font-mono font-semibold text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Unassigned (No Truck) --</option>
                    {vehicles.map((veh) => {
                      const isAssignedToOther =
                        veh.assignedDriverName && veh.assignedDriverName !== (driverToEdit?.name || name);
                      return (
                        <option key={veh.id} value={veh.plateNumber}>
                          {veh.plateNumber} — {veh.truckModel} ({veh.capacityTonnes}T)
                          {isAssignedToOther ? ` [Assigned: ${veh.assignedDriverName}]` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* License Category */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">License Category</label>
                <select
                  value={licenseCategory}
                  onChange={(e) => setLicenseCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option>Heavy Vehicle / Trailer (نقل ثقيل)</option>
                  <option>Heavy Equipment & Flatbed (معدات وثقيل)</option>
                  <option>Reefer / Cold Chain Specialist (نقل مبرد)</option>
                  <option>Medium Transport (نقل متوسط)</option>
                  <option>Light / City Box Van (نقل خفيف وتوزيع)</option>
                </select>
              </div>

              {/* Base Salary */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Monthly Salary (SAR)</label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. IQAMA SECTION */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="font-black text-slate-900 dark:text-white text-sm">Iqama (الإقامة)</h4>
              </div>

              {/* Expiry Status Badge */}
              {iqamaExpiryDate && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Status:</span>
                  {iqamaStatusObj.status === 'valid' && (
                    <span className="px-2.5 py-0.5 rounded-full font-black text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid ({iqamaStatusObj.daysRemaining}d left)
                    </span>
                  )}
                  {iqamaStatusObj.status === 'expiring_soon' && (
                    <span className="px-2.5 py-0.5 rounded-full font-black text-[11px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Expiring Soon ({iqamaStatusObj.daysRemaining}d left)
                    </span>
                  )}
                  {iqamaStatusObj.status === 'expired' && (
                    <span className="px-2.5 py-0.5 rounded-full font-black text-[11px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-600" /> Expired ({Math.abs(iqamaStatusObj.daysRemaining)}d ago)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Iqama Number */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Iqama / National ID Number
                </label>
                <input
                  type="text"
                  placeholder="10-digit ID (e.g. 1084729104)"
                  value={nationalIdOrIqama}
                  onChange={(e) => setNationalIdOrIqama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Iqama Issue Date */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Iqama Issue Date</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={iqamaIssueDate}
                    onChange={(e) => setIqamaIssueDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Iqama Expiry Date */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Iqama Expiry Date</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={iqamaExpiryDate}
                    onChange={(e) => setIqamaExpiryDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Iqama Document Upload / View / Replace */}
            <div className="pt-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Iqama Document Upload (PDF or Image)
              </label>

              <input
                ref={iqamaFileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
                onChange={handleIqamaFileUpload}
                className="hidden"
              />

              {iqamaDocument ? (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                      {iqamaDocument.fileType === 'pdf' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                        {iqamaDocument.fileName}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <HardDrive className="w-2.5 h-2.5" /> Supabase Storage
                        </span>
                        {iqamaDocument.fileSize && (
                          <span>• {(iqamaDocument.fileSize / 1024).toFixed(0)} KB</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        onPreviewDocument(
                          iqamaDocument,
                          'Iqama Document Preview',
                          name || 'Driver',
                          iqamaStatusObj.status,
                          iqamaExpiryDate
                        )
                      }
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>

                    <button
                      type="button"
                      onClick={() => iqamaFileInputRef.current?.click()}
                      disabled={isUploadingIqama}
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 font-bold flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isUploadingIqama ? 'animate-spin' : ''}`} />
                      {isUploadingIqama ? 'Uploading...' : 'Replace'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIqamaDocument(undefined)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                      title="Remove Iqama Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => iqamaFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-4 text-center cursor-pointer transition-all bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    {isUploadingIqama ? 'Uploading to Supabase Storage...' : 'Click to Upload Iqama File (PDF or Image)'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    File will be saved securely in Supabase Storage bucket <code>driver-documents/iqama/</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. RUKHSA (DRIVING LICENCE) SECTION */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h4 className="font-black text-slate-900 dark:text-white text-sm">
                  Rukhsa (Driving Licence / رخصة القيادة)
                </h4>
              </div>

              {/* Expiry Status Badge */}
              {rukhsaExpiryDate && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Status:</span>
                  {rukhsaStatusObj.status === 'valid' && (
                    <span className="px-2.5 py-0.5 rounded-full font-black text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid ({rukhsaStatusObj.daysRemaining}d left)
                    </span>
                  )}
                  {rukhsaStatusObj.status === 'expiring_soon' && (
                    <span className="px-2.5 py-0.5 rounded-full font-black text-[11px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Expiring Soon ({rukhsaStatusObj.daysRemaining}d left)
                    </span>
                  )}
                  {rukhsaStatusObj.status === 'expired' && (
                    <span className="px-2.5 py-0.5 rounded-full font-black text-[11px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-600" /> Expired ({Math.abs(rukhsaStatusObj.daysRemaining)}d ago)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Licence / Rukhsa Number */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rukhsa (Licence) Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. DL-SA-98214"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Date of Issue */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Issue</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={rukhsaIssueDate}
                    onChange={(e) => setRukhsaIssueDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Date of Expiry */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Expiry</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={rukhsaExpiryDate}
                    onChange={(e) => setRukhsaExpiryDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Rukhsa Document Upload / View / Replace */}
            <div className="pt-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Rukhsa PDF / Image Upload
              </label>

              <input
                ref={rukhsaFileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
                onChange={handleRukhsaFileUpload}
                className="hidden"
              />

              {rukhsaDocument ? (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                      {rukhsaDocument.fileType === 'pdf' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                        {rukhsaDocument.fileName}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <HardDrive className="w-2.5 h-2.5" /> Supabase Storage
                        </span>
                        {rukhsaDocument.fileSize && (
                          <span>• {(rukhsaDocument.fileSize / 1024).toFixed(0)} KB</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        onPreviewDocument(
                          rukhsaDocument,
                          'Rukhsa (Driving Licence) Preview',
                          name || 'Driver',
                          rukhsaStatusObj.status,
                          rukhsaExpiryDate
                        )
                      }
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>

                    <button
                      type="button"
                      onClick={() => rukhsaFileInputRef.current?.click()}
                      disabled={isUploadingRukhsa}
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 font-bold flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isUploadingRukhsa ? 'animate-spin' : ''}`} />
                      {isUploadingRukhsa ? 'Uploading...' : 'Replace'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRukhsaDocument(undefined)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                      title="Remove Rukhsa Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => rukhsaFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-4 text-center cursor-pointer transition-all bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    {isUploadingRukhsa ? 'Uploading to Supabase Storage...' : 'Click to Upload Rukhsa File (PDF or Image)'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    File will be saved securely in Supabase Storage bucket <code>driver-documents/rukhsa/</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isEditMode ? 'Save Driver Changes' : 'Enroll Driver'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

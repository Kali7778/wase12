import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Trip,
  Driver,
  DriverStatus,
  Vehicle,
  WarehouseItem,
  WarehouseMovement,
  Customer,
  SaleOrder,
  ExpenseRecord,
  DriverSalarySlip,
  TaxInvoice,
  CompanySettings,
  SystemUser,
  UserRole,
  Language,
  TripStatus,
  TripStep,
  SlipStatus,
  InvoiceStatus,
  InboundDeliveryNote,
  InboundAttachedFile,
  MasterAuditRecord,
  MasterAuditAction,
  ApprovalRequest,
  ApprovalTier,
  LocationPoint,
  CargoType,
  PaymentMethod,
  RouteShiftRecord,
  CustomerShiftHistoryEntry,
  LogisticsEditHistoryEntry,
  CustomerPaymentEntry,
  CustomerHistoryEntry,
  InvoicePaymentStatus,
  CustomerInvoice,
  ZatcaQrScan,
  InvoiceStatusHistory,  SupplierInventoryItem,
  SupplierStockTransfer,
  GypsumInventoryItem,
  GypsumMovement,
  BrokerLoad,
  BrokerDropLocation,
  BrokerLoadStatus,
  BrokerDropStatus,
  DriverLoadRequest,
  DriverRequestedLoadType,
  DriverLoadRequestStatus,
} from '../types';
import {
  initialTrips,
  initialDrivers,
  initialVehicles,
  initialWarehouseItems,
  initialWarehouseMovements,
  initialSupplierInventory,
  initialInboundDeliveryNotes,
  initialGypsumInventory,
  initialGypsumMovements,
  initialCustomers,
  initialSaleOrders,
  initialExpenses,
  initialSalarySlips,
  initialCustomerInvoices,
  initialTaxInvoices,
  initialCompanySettings,
  initialUsers,
  initialMasterAudits,
  initialApprovalRequests,
  initialLocations,
  initialZatcaQrScans,
  initialInvoiceStatusHistory,
  initialBrokerLoads,
  initialDriverLoadRequests,
} from '../emptyState';
import { useAuth } from './AuthContext';
import { translations } from '../utils/i18n';
import { generateTaxInvoiceQrBase64 } from '../utils/zatca';
import confetti from 'canvas-confetti';

export type NavView =
  | 'adminSlips'
  | 'slipReview'
  | 'myDeliveries'
  | 'ceoPanel'
  | 'gmPanel'
  | 'managerPanel'
  | 'masterAudit'
  | 'approvalCenter'
  | 'dashboard'
  | 'dispatcher'
  | 'driverPanel'
  | 'supplierInventory'
  | 'warehouse'
  | 'trips'
  | 'drivers'
  | 'sales'
  | 'customers'
  | 'expenses'
  | 'invoices'
  | 'liveGps'
  | 'reports'
  | 'users'
  | 'backupSync'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface AppContextType {
  // Navigation & UI
  currentView: NavView;
  setCurrentView: (view: NavView) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeRole: UserRole;
  isAdmin: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isViewOnlyRole: boolean;
  canPerformAction: (actionType: string) => boolean;

  // Selected Driver for Driver Panel View
  selectedDriverId: string;
  setSelectedDriverId: (driverId: string) => void;

  // Data Collections
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  warehouseItems: WarehouseItem[];
  warehouseMovements: WarehouseMovement[];
  gypsumInventory: GypsumInventoryItem[];
  gypsumMovements: GypsumMovement[];
  supplierInventory: SupplierInventoryItem[];
  inboundDeliveryNotes: InboundDeliveryNote[];
  customers: Customer[];
  saleOrders: SaleOrder[];
  expenses: ExpenseRecord[];
  salarySlips: DriverSalarySlip[];
  taxInvoices: TaxInvoice[];
  companySettings: CompanySettings;
  users: SystemUser[];
  masterAudits: MasterAuditRecord[];
  approvalRequests: ApprovalRequest[];
  locations: LocationPoint[];

  // Master Audit & Governance Actions
  deleteMasterAudit: (id: string, reason?: string) => void;
  logMasterAudit: (audit: {
    action: MasterAuditAction;
    recordRef: string;
    customer?: string;
    item?: string;
    quantity?: number;
    oldValue?: string | number;
    newValue?: string | number;
    delta?: string | number;
    reason?: string;
    warehouse?: string;
    approvedBy?: string;
    approvalDate?: string;
    user?: string;
    userRole?: UserRole | string;
    ipDevice?: string;
    category?: 'inventory' | 'dispatch' | 'sales' | 'finance' | 'security' | 'governance';
  }) => string;
  createApprovalRequest: (req: Omit<ApprovalRequest, 'id' | 'requestedAt' | 'status'>) => string;
  processApprovalDecision: (id: string, status: 'approved' | 'rejected', decisionNotes?: string) => void;
  recordSensitiveChange: (params: {
    recordRef: string;
    action: MasterAuditAction;
    item?: string;
    customer?: string;
    quantity?: number;
    oldValue: string | number;
    newValue: string | number;
    delta?: string | number;
    reason: string;
    requiredTier?: ApprovalTier;
    warehouse?: string;
  }) => { auditId: string; approvalId?: string };

  // Actions
  addTrip: (trip: Omit<Trip, 'id' | 'tripNumber'>) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  updateTripStatus: (id: string, newStatus: TripStatus, notes?: string) => void;
  advanceTripStep: (id: string, nextStep: TripStep) => void;
  startTripWithBarcode: (params: {
    barcode: string;
    driverId: string;
    driverName: string;
    truckPlate: string;
    tripId?: string;
  }) => { success: boolean; trip?: Trip; error?: string };
  submitTripSlip: (id: string, slipDataUrl: string, receiverName?: string) => void;
  clearTripSlip: (id: string) => void;
  confirmDriverLoading: (tripId: string, loadedQty: number, driverNotes?: string) => void;
  confirmDriverDeliveryWithQty: (params: {
    tripId: string;
    deliveredQty: number;
    discrepancyReason?: string;
    receiverName: string;
    receiverNotes?: string;
    podImageUrl?: string;
    signatureDone?: boolean;
  }) => void;
  inwardDriverReturnedStock: (tripId: string, returnQty: number, reason?: string) => void;
  updateDriverStatus: (driverId: string, status: DriverStatus) => void;
  deleteTrip: (id: string, reason?: string, hardDelete?: boolean) => void;
  restoreTrip: (id: string, reason?: string) => void;
  duplicateTrip: (id: string, customOverrides?: Partial<Trip>) => Trip | null;
  adminUpdateTrip: (id: string, updates: Partial<Trip>, reason: string) => string;

  // Company Load & TLB Main Inventory Inward Workflow
  createTruckLoad: (params: {
    loadType: 'gypsum' | 'broker';
    tlbNumber?: string;
    supplier?: string;
    availableQuantity?: number;
    loadingQuantity: number;
    brokerName?: string;
    supplierSource?: string;
    driverId: string;
    driverName?: string;
    vehicleId: string;
    vehiclePlate?: string;
    loadingDate?: string;
    pickupLocation?: LocationPoint;
    dropLocation?: LocationPoint;
    notes?: string;
  }) => { success: boolean; loadId?: string; trip?: Trip; error?: string };
  updateTripLoadingStatus: (tripId: string, status: 'pending' | 'loading' | 'loaded' | 'completed' | 'going_to_supplier' | 'at_supplier') => void;
  createCompanyLoad: (params: {
    customerId?: string;
    customerName?: string;
    product?: string;
    itemName?: string;
    itemDescription?: string;
    itemNumber?: string;
    requiredQty: number;
    reservedDnNo: string;
    driverId: string;
    driverName?: string;
    vehicleId: string;
    vehiclePlate?: string;
    pickupLocation: LocationPoint;
    dropLocation: LocationPoint;
    price?: number;
    driverTripRate?: number;
    notes?: string;
  }) => { success: boolean; loadId?: string; trip?: Trip; error?: string };
  advanceCompanyLoadStage: (tripId: string, stage: 'driver_assigned' | 'supplier_loading' | 'returned_to_admin') => void;
  inwardCompanyStock: (params: {
    tripId: string;
    verifiedQty?: number;
    verifiedNotes?: string;
    adminName?: string;
  }) => boolean;

  // Manager Trip Control & Audit Actions
  managerModifyTrip: (id: string, updates: Partial<Trip>, reason: string) => string;
  managerAddPostDeliveryTrip: (params: {
    dnNumber: string;
    driverId: string;
    vehicleId: string;
    origin: LocationPoint;
    destination: LocationPoint;
    quantity: number;
    uom?: string;
    itemName?: string;
    cargoType?: CargoType;
    driverTripRate: number;
    price?: number;
    completedTime: string;
    reason: string;
    slipImageUrl?: string;
    receiverSignature?: string;
    customerName?: string;
    customerId?: string;
    notes?: string;
  }) => Trip;
  managerCancelTrip: (id: string, reason: string) => void;
  managerReopenTrip: (id: string, reason: string, targetStatus?: TripStatus) => void;
  managerClearDelivery: (id: string, reason?: string) => void;
  managerAttachSlip: (id: string, slipImageUrl: string, reason: string, receiverName?: string) => void;
  getDriverTotalTripAmount: (driverId: string) => number;

  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, updates: Partial<Driver>) => void;

  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;

  addWarehouseItem: (item: Omit<WarehouseItem, 'id'>) => void;
  updateWarehouseItem: (id: string, updates: Partial<WarehouseItem>) => void;
  deleteWarehouseItem: (id: string) => void;
  addWarehouseMovement: (movement: Omit<WarehouseMovement, 'id' | 'timestamp'>) => void;

  // Gypsum Inventory & Real-Time Qty In / Qty Out Engine
  addGypsumItem: (item: Omit<GypsumInventoryItem, 'id' | 'availableStock'>) => void;
  recordGypsumQtyIn: (params: {
    itemNumber: string;
    date: string;
    qtyIn: number;
    reference?: string;
    notes?: string;
    pdfName?: string;
    pdfUrl?: string;
    soNumber?: string;
    dnNumber?: string;
  }) => { success: boolean; movement?: GypsumMovement; error?: string };
  recordGypsumQtyOut: (params: {
    itemNumber: string;
    date: string;
    qtyOut: number;
    customer?: string;
    driverName?: string;
    tlbNumber?: string;
    reference?: string;
    notes?: string;
    soNumber?: string;
    dnNumber?: string;
  }) => { success: boolean; movement?: GypsumMovement; error?: string };
  deleteGypsumMovement: (id: string) => void;
  resetGypsumInventory: () => void;

  // TLB Supplier Inventory Methods
  addSupplierInventoryItem: (item: Omit<SupplierInventoryItem, 'id' | 'createdAt'> & { autoLinkToMainInventory?: boolean }) => {
    supplierItemId: string;
    mainItemId?: string;
  };
  updateSupplierInventoryItem: (id: string, updates: Partial<SupplierInventoryItem>) => void;
  deleteSupplierInventoryItem: (id: string) => void;
  transferSupplierStock: (params: {
    supplierItemId: string;
    quantity: number;
    transferredTo: 'TLB_MAIN_INVENTORY' | 'DISPATCH_LOAD' | 'DIRECT_SALE' | 'CUSTOMER_DELIVERY';
    driverId?: string;
    driverName?: string;
    vehiclePlate?: string;
    customerId?: string;
    customerName?: string;
    performedBy?: string;
    referenceDoc?: string;
    notes?: string;
  }) => { success: boolean; transferId?: string; error?: string };

  // Traceable Stock Movement Ledger operations (Stock In & Stock Out for Sale)
  executeStockIn: (params: {
    dnNumber: string;
    productName?: string;
    itemSku?: string;
    quantity: number;
    unit?: string;
    barcode?: string;
    driverId?: string;
    driverName?: string;
    vehiclePlate?: string;
    source?: string;
    performedBy?: string;
    unitCost?: number;
    sellingPrice?: number;
    notes?: string;
  }) => string;

  executeStockOutForSale: (params: {
    saleNumber?: string;
    customerId: string;
    customerName: string;
    customerVat?: string;
    inventoryId?: string;
    dnNumber?: string;
    itemSku?: string;
    itemName?: string;
    quantity: number;
    unitPrice?: number;
    paymentMethod?: PaymentMethod;
    driverId?: string;
    driverName?: string;
    vehiclePlate?: string;
    performedBy?: string;
    autoApprove?: boolean;
    notes?: string;
  }) => { saleId: string; movementId: string; orderNumber: string };

  approveSaleOrder: (saleId: string, approvedBy?: string) => void;

  // In-Transit Route Shift Flow (Same DN preserved: Supplier → Driver → Route Shift Customer → Warehouse Inward)
  executeRouteShift: (params: {
    tripId: string;
    customerId: string;
    customerName: string;
    customerNameAr?: string;
    customerPhone?: string;
    customerVat?: string;
    customerCr?: string;
    destinationAddress: string;
    destinationCity: string;
    destinationLat?: number;
    destinationLng?: number;
    shiftedQuantity: number;
    unitPrice?: number;
    reason: string;
    notes?: string;
    shiftedBy?: string;
  }) => { success: boolean; routeShiftId?: string; error?: string };

  shiftRouteToCustomer: (params: {
    tripId: string;
    previousCustomerId: string;
    previousCustomerName: string;
    newCustomerId: string;
    newCustomerName: string;
    newCustomerAddress?: string;
    newCustomerCity?: string;
    newCustomerPhone?: string;
    newCustomerVat?: string;
    newCustomerCr?: string;
    newDriverId?: string;
    newDriverName?: string;
    newVehicleId?: string;
    newVehiclePlate?: string;
    reason: string;
    notes?: string;
    effectiveDateTime: string;
    shiftedBy?: string;
  }) => { success: boolean; shiftId?: string; error?: string };

  confirmRouteShiftDelivery: (params: {
    tripId: string;
    routeShiftId: string;
    podImageUrl?: string;
    podBarcodeScanned?: string;
    receiverNotes?: string;
    receiverSignature?: string;
    confirmedBy?: string;
  }) => { success: boolean; invoiceId?: string; error?: string };

  inwardRouteShiftRemainingStock: (params: {
    tripId: string;
    warehouseId?: string;
    warehouseLocation?: string;
    receivedBy?: string;
    notes?: string;
  }) => { success: boolean; movementId?: string; inwardQty?: number; error?: string };

  addInboundDeliveryNote: (note: Omit<InboundDeliveryNote, 'id' | 'importedAt'>) => {
    dnId: string;
    companyId: string;
    isNewCompany: boolean;
    isDuplicateTlb?: boolean;
    tripId: string;
    availableQty: number;
    stockedItemName: string;
    stockedItemSku: string;
  };
  updateInboundDeliveryNote: (id: string, updates: Partial<InboundDeliveryNote>) => void;
  deleteInboundDeliveryNote: (id: string) => void;
  attachFilesInboundDeliveryNote: (id: string, files: InboundAttachedFile[]) => void;
  removeAttachedFileInboundDeliveryNote: (dnId: string, fileId: string) => void;

  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>, reason?: string) => void;
  deleteCustomer: (id: string, reason?: string) => void;
  recordCustomerPayment: (params: {
    customerId: string;
    type: 'payment_in' | 'payment_out';
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    invoiceId?: string;
    invoiceNumber?: string;
    tripId?: string;
    tripNumber?: string;
    dnNumber?: string;
    notes?: string;
    recordedBy?: string;
  }) => string;

  addLocation: (location: Omit<LocationPoint, 'id'> | LocationPoint) => LocationPoint;
  updateLocation: (id: string, updates: Partial<LocationPoint>) => void;
  deleteLocation: (id: string) => void;

  createSaleOrder: (order: Omit<SaleOrder, 'id' | 'orderNumber' | 'date'>) => string;
  
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => void;
  deleteExpense: (id: string) => void;
  updateSalaryStatus: (id: string, status: 'pending' | 'approved' | 'paid') => void;

  createTaxInvoiceFromTrip: (tripId: string) => string;
  createCustomTaxInvoice: (invoice: Partial<TaxInvoice>) => TaxInvoice;
  updateTaxInvoice: (id: string, updates: Partial<TaxInvoice>, reason?: string) => void;
  deleteTaxInvoice: (id: string, reason?: string) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  recordInvoicePayment: (invoiceId: string, params: {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    notes?: string;
    recordedBy?: string;
  }) => string;

  updateCompanySettings: (settings: Partial<CompanySettings>) => void;
  
  // User Management
  addUser: (user: Omit<SystemUser, 'id'>) => SystemUser;
  updateUser: (id: string, updates: Partial<SystemUser>) => void;
  deleteUser: (id: string) => void;

  // Data management
  resetAllData: () => void;
  exportDatabaseBackup: () => void;
  exportStateJson: () => void;
  importDatabaseBackup: (jsonData: string) => boolean;
  importStateJson: (jsonData: string) => boolean;

  // Feedback Toasts
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // ZATCA QR Scans & Status Audit
  zatcaQrScans: ZatcaQrScan[];
  addZatcaQrScan: (scan: Omit<ZatcaQrScan, 'id' | 'scannedAt'>) => ZatcaQrScan;
  deleteZatcaQrScan: (id: string) => void;
  invoiceStatusHistory: InvoiceStatusHistory[];
  addInvoiceStatusHistory: (history: Omit<InvoiceStatusHistory, 'id' | 'timestamp'>) => void;

  // Commercial & Accounts: Customer Invoices (No QR, No VAT, Quantity * Unit Price = Total)
  customerInvoices: CustomerInvoice[];
  addCustomerInvoice: (invoice: Omit<CustomerInvoice, 'id' | 'createdAt'>, creditStockIn?: boolean) => CustomerInvoice;
  updateCustomerInvoice: (id: string, updates: Partial<CustomerInvoice>) => void;
  deleteCustomerInvoice: (id: string) => void;
  verifyAndCreditCustomerInvoiceStockIn: (invoiceId: string, customQty?: number, notes?: string) => boolean;
  selectedCustomerInvoice: CustomerInvoice | null;
  setSelectedCustomerInvoice: (invoice: CustomerInvoice | null) => void;

  // Selected item modal controls
  selectedTripForDn: Trip | null;
  setSelectedTripForDn: (trip: Trip | null) => void;
  selectedInvoice: TaxInvoice | null;
  setSelectedInvoice: (invoice: TaxInvoice | null) => void;
  selectedInboundDn: InboundDeliveryNote | null;
  setSelectedInboundDn: (dn: InboundDeliveryNote | null) => void;

  // AI Delivery Note Import Modal Controls
  // Broker Load Management
  brokerLoads: BrokerLoad[];
  addBrokerLoad: (load: Omit<BrokerLoad, 'id' | 'createdAt' | 'updatedAt'>) => BrokerLoad;
  updateBrokerLoad: (id: string, updates: Partial<BrokerLoad>) => void;
  deleteBrokerLoad: (id: string) => void;
  assignBrokerDriverTruck: (id: string, driverId: string, truckPlate: string, tlbNo?: string) => void;
  updateBrokerDropStatus: (
    loadId: string,
    stopId: string,
    status: BrokerDropStatus,
    extra?: { deliveredAt?: string; recipientName?: string; notes?: string }
  ) => void;
  addBrokerDropLocation: (loadId: string, drop: Omit<BrokerDropLocation, 'id' | 'stopNumber'>) => void;
  markBrokerLoadDelivered: (id: string) => void;
  attachBrokerPdf: (id: string, fileDataUrl: string, fileName: string) => void;

  // Driver Load Requests (Driver -> Request Load -> Dispatcher/Admin Approval -> Trip / Broker Load)
  driverLoadRequests: DriverLoadRequest[];
  addDriverLoadRequest: (request: Omit<DriverLoadRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt'>) => DriverLoadRequest;
  updateDriverLoadRequestStatus: (id: string, status: DriverLoadRequestStatus, reviewNotes?: string, reviewerName?: string) => void;
  approveAndConvertDriverLoadRequest: (id: string, reviewerName?: string) => { success: boolean; tripId?: string; brokerLoadId?: string; error?: string };
  rejectDriverLoadRequest: (id: string, reason: string, reviewerName?: string) => void;
  deleteDriverLoadRequest: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Bumped from v2 when the bundled sample data was removed: browsers that had
// already cached the demo records would otherwise keep showing them.
const STORAGE_KEY = 'logiflow_admin_state_v3';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [language, setLanguageState] = useState<Language>('en');
  const [isDark, setIsDarkState] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  // The active role is the signed-in user's real role from user_tbl. It is not
  // selectable: the database enforces the same role through RLS, so a value
  // chosen in the UI would only ever disagree with what the server allows.
  const { role: authRole } = useAuth();
  const activeRole: UserRole = (authRole ?? 'driver') as UserRole;

  // A driver has no dashboard to land on, so send them to their own queue.
  useEffect(() => {
    if (authRole === 'driver') setCurrentView('myDeliveries');
  }, [authRole]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('drv_1'); // Ahmed by default

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Selected modals
  const [selectedTripForDn, setSelectedTripForDn] = useState<Trip | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<TaxInvoice | null>(null);
  const [selectedCustomerInvoice, setSelectedCustomerInvoice] = useState<CustomerInvoice | null>(null);
  const [selectedInboundDn, setSelectedInboundDn] = useState<InboundDeliveryNote | null>(null);

  // AI Delivery Note Modal State
  // Collections state
  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_trips');
    return saved ? JSON.parse(saved) : initialTrips;
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_vehicles');
    return saved ? JSON.parse(saved) : initialVehicles;
  });

  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_drivers');
    return saved ? JSON.parse(saved) : initialDrivers;
  });

  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_warehouseItems');
    return saved ? JSON.parse(saved) : initialWarehouseItems;
  });

  const [warehouseMovements, setWarehouseMovements] = useState<WarehouseMovement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_warehouseMovements');
    return saved ? JSON.parse(saved) : initialWarehouseMovements;
  });

  const [gypsumInventory, setGypsumInventory] = useState<GypsumInventoryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_gypsumInventory');
    return saved ? JSON.parse(saved) : initialGypsumInventory;
  });

  const [gypsumMovements, setGypsumMovements] = useState<GypsumMovement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_gypsumMovements');
    return saved ? JSON.parse(saved) : initialGypsumMovements;
  });

  const [supplierInventory, setSupplierInventory] = useState<SupplierInventoryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_supplierInventory');
    return saved ? JSON.parse(saved) : initialSupplierInventory;
  });

  const [inboundDeliveryNotes, setInboundDeliveryNotes] = useState<InboundDeliveryNote[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_inboundDns');
    return saved ? JSON.parse(saved) : initialInboundDeliveryNotes;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_customers');
    return saved ? JSON.parse(saved) : initialCustomers;
  });

  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_saleOrders');
    return saved ? JSON.parse(saved) : initialSaleOrders;
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_expenses');
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const [salarySlips, setSalarySlips] = useState<DriverSalarySlip[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_salarySlips');
    return saved ? JSON.parse(saved) : initialSalarySlips;
  });

  const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_invoices');
    return saved ? JSON.parse(saved) : initialTaxInvoices;
  });

  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_customerInvoices');
    return saved ? JSON.parse(saved) : initialCustomerInvoices;
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_companySettings');
    return saved ? JSON.parse(saved) : initialCompanySettings;
  });

  const [locations, setLocations] = useState<LocationPoint[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_locations');
    return saved ? JSON.parse(saved) : initialLocations;
  });

  const [users, setUsers] = useState<SystemUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [masterAudits, setMasterAudits] = useState<MasterAuditRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_masterAudits');
    return saved ? JSON.parse(saved) : initialMasterAudits;
  });

  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_approvalRequests');
    return saved ? JSON.parse(saved) : initialApprovalRequests;
  });

  const [zatcaQrScans, setZatcaQrScans] = useState<ZatcaQrScan[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_zatcaQrScans');
    return saved ? JSON.parse(saved) : initialZatcaQrScans;
  });

  const [invoiceStatusHistory, setInvoiceStatusHistory] = useState<InvoiceStatusHistory[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_invoiceStatusHistory');
    return saved ? JSON.parse(saved) : initialInvoiceStatusHistory;
  });

  const [brokerLoads, setBrokerLoads] = useState<BrokerLoad[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_brokerLoads');
    return saved ? JSON.parse(saved) : initialBrokerLoads;
  });

  const [driverLoadRequests, setDriverLoadRequests] = useState<DriverLoadRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_driverLoadRequests');
    return saved ? JSON.parse(saved) : initialDriverLoadRequests;
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_driverLoadRequests', JSON.stringify(driverLoadRequests));
  }, [driverLoadRequests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_brokerLoads', JSON.stringify(brokerLoads));
  }, [brokerLoads]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_zatcaQrScans', JSON.stringify(zatcaQrScans));
  }, [zatcaQrScans]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_invoiceStatusHistory', JSON.stringify(invoiceStatusHistory));
  }, [invoiceStatusHistory]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_locations', JSON.stringify(locations));
  }, [locations]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_masterAudits', JSON.stringify(masterAudits));
  }, [masterAudits]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_approvalRequests', JSON.stringify(approvalRequests));
  }, [approvalRequests]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_trips', JSON.stringify(trips));
  }, [trips]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_drivers', JSON.stringify(drivers));
  }, [drivers]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_warehouseItems', JSON.stringify(warehouseItems));
  }, [warehouseItems]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_warehouseMovements', JSON.stringify(warehouseMovements));
  }, [warehouseMovements]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_gypsumInventory', JSON.stringify(gypsumInventory));
  }, [gypsumInventory]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_gypsumMovements', JSON.stringify(gypsumMovements));
  }, [gypsumMovements]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_supplierInventory', JSON.stringify(supplierInventory));
  }, [supplierInventory]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_inboundDns', JSON.stringify(inboundDeliveryNotes));
  }, [inboundDeliveryNotes]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_customers', JSON.stringify(customers));
  }, [customers]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_saleOrders', JSON.stringify(saleOrders));
  }, [saleOrders]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_users', JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_expenses', JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_salarySlips', JSON.stringify(salarySlips));
  }, [salarySlips]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_invoices', JSON.stringify(taxInvoices));
  }, [taxInvoices]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_customerInvoices', JSON.stringify(customerInvoices));
  }, [customerInvoices]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_companySettings', JSON.stringify(companySettings));
  }, [companySettings]);

  // RTL & Language
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    }
  };

  const setIsDark = (dark: boolean) => {
    setIsDarkState(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const t = (key: keyof typeof translations.en): string => {
    const langDict = translations[language] || translations.en;
    return langDict[key] || translations.en[key] || String(key);
  };

  // Toast Helper
  const showToast = (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Role separation & View-only definitions
  const isAdmin = activeRole === 'admin';
  const canEdit = activeRole === 'admin';
  const canDelete = activeRole === 'admin';
  const isViewOnlyRole = activeRole === 'ceo';

  const canPerformAction = (actionType: string): boolean => {
    // Admin-Only rule: All edit and delete operations across records are restricted to admin
    const isEditOrDeleteAction =
      actionType.startsWith('edit_') ||
      actionType.startsWith('delete_') ||
      actionType.includes('_edit') ||
      actionType.includes('_delete') ||
      actionType === 'delete' ||
      actionType === 'edit';

    if (isEditOrDeleteAction) {
      return activeRole === 'admin';
    }

    switch (activeRole) {
      case 'ceo':
        // CEO has executive approval & sign-off authority, view-only on base CRUD
        return ['ceo_signoff', 'view_all', 'export_reports'].includes(actionType);
      case 'gm':
        // GM controls operational approvals, but record edit/delete is Admin-only
        return !['delete_master_audit'].includes(actionType);
      case 'manager':
        // Manager controls daily ops & approvals, but record edit/delete is Admin-only
        return !['ceo_signoff', 'delete_master_audit', 'change_ceo_settings', 'modify_system_users'].includes(actionType);
      case 'admin':
        return !['delete_master_audit'].includes(actionType);
      case 'dispatcher':
        return ['create_trip', 'assign_driver', 'update_dn', 'submit_slip', 'view_all'].includes(actionType);
      case 'sales':
        return ['create_sale', 'view_customers', 'create_customer', 'view_inventory'].includes(actionType);
      case 'accountant':
        return ['create_invoice', 'log_expense', 'view_salaries', 'approve_salary'].includes(actionType);
      case 'warehouse_mgr':
      case 'warehouse':
        return ['add_inventory', 'transfer_inventory', 'grn_receive', 'view_all'].includes(actionType);
      case 'driver':
        return ['view_driver_route', 'update_trip_step', 'upload_pod'].includes(actionType);
      default:
        return false;
    }
  };

  // Master-Level Audit Immutable Logger
  const generateAuditHash = (payload: string): string => {
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
    const hex2 = Math.abs((hash ^ 0x5a5a5a5a)).toString(16).padStart(8, '0');
    const hex3 = Math.abs((hash ^ 0x3c3c3c3c)).toString(16).padStart(8, '0');
    const hex4 = Math.abs((hash ^ 0xa5a5a5a5)).toString(16).padStart(8, '0');
    return `${hex1}${hex2}${hex3}${hex4}${hex2}${hex1}${hex4}${hex3}`;
  };

  const logMasterAudit = (auditData: {
    action: MasterAuditAction;
    recordRef: string;
    user?: string;
    userRole?: string;
    ipDevice?: string;
    customer?: string;
    item?: string;
    quantity?: number;
    oldValue?: string | number;
    newValue?: string | number;
    delta?: string | number;
    reason?: string;
    warehouse?: string;
    approvedBy?: string;
    approvalDate?: string;
    category?: 'inventory' | 'dispatch' | 'sales' | 'finance' | 'security' | 'governance';
  }): string => {
    const nextSeq = Math.floor(1000000 + Math.random() * 9000000);
    const auditId = `AUD-${nextSeq}`;
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${day}-${month}-${year} ${hours}:${mins}:${secs}`;

    const activeUserObj = users.find((u) => u.role === activeRole) || {
      name: `${activeRole.toUpperCase()} User`,
      role: activeRole,
    };

    const auditUser = auditData.user || activeUserObj.name;
    const auditRole = auditData.userRole || activeRole;
    const auditIp = auditData.ipDevice || ('192.168.1.' + Math.floor(100 + Math.random() * 100) + ' (Verified Enterprise Terminal)');

    const payloadToHash = `${auditId}|${timestamp}|${auditUser}|${auditData.action}|${auditData.recordRef}|${auditData.oldValue || ''}|${auditData.newValue || ''}`;
    const integrityHash = generateAuditHash(payloadToHash);

    const newRecord: MasterAuditRecord = {
      id: auditId,
      timestamp,
      user: auditUser,
      userRole: auditRole,
      action: auditData.action,
      recordRef: auditData.recordRef,
      customer: auditData.customer,
      item: auditData.item,
      quantity: auditData.quantity,
      oldValue: auditData.oldValue,
      newValue: auditData.newValue,
      delta: auditData.delta,
      reason: auditData.reason,
      warehouse: auditData.warehouse || 'Central Facility',
      ipDevice: auditIp,
      approvedBy: auditData.approvedBy,
      approvalDate: auditData.approvalDate,
      integrityHash,
      immutable: true,
      category: auditData.category || 'governance',
    };

    setMasterAudits((prev) => [newRecord, ...prev]);
    return auditId;
  };

  const deleteMasterAudit = (id: string, reason?: string) => {
    if (!['admin', 'gm', 'ceo'].includes(activeRole)) {
      showToast('Access Denied', 'Only Administrator or Executive roles can purge audit ledger records.', 'error');
      return;
    }
    const target = masterAudits.find((a) => a.id === id);
    setMasterAudits((prev) => prev.filter((a) => a.id !== id));
    showToast(
      'Audit Record Purged',
      `Audit entry ${target ? target.id : id} (${target?.action || 'Record'}) was deleted from the ledger.${reason ? ` Reason: ${reason}` : ''}`,
      'info'
    );
  };

  // Sensitive change recording with Old Value -> New Value -> Reason -> Audit
  const recordSensitiveChange = (params: {
    recordRef: string;
    action: MasterAuditAction;
    item?: string;
    customer?: string;
    quantity?: number;
    oldValue: string | number;
    newValue: string | number;
    delta?: string | number;
    reason: string;
    requiredTier?: ApprovalTier;
    warehouse?: string;
  }): { auditId: string; approvalId?: string } => {
    const auditId = logMasterAudit({
      action: params.action,
      recordRef: params.recordRef,
      customer: params.customer,
      item: params.item,
      quantity: params.quantity,
      oldValue: params.oldValue,
      newValue: params.newValue,
      delta: params.delta,
      reason: params.reason,
      warehouse: params.warehouse,
      category: params.action.includes('INVENTORY') ? 'inventory' : params.action.includes('SALE') ? 'sales' : 'governance',
    });

    let approvalId: string | undefined;
    if (params.requiredTier) {
      approvalId = createApprovalRequest({
        title: `Sensitive Action: ${params.action.replace('_', ' ')} on ${params.recordRef}`,
        description: `Change from [${params.oldValue}] to [${params.newValue}]. Reason: ${params.reason}`,
        category: params.action.includes('INVENTORY') ? 'inventory_delta' : 'operational',
        requestedBy: users.find((u) => u.role === activeRole)?.name || `${activeRole} Operator`,
        requestedByRole: activeRole,
        requiredTier: params.requiredTier,
        recordRef: params.recordRef,
        item: params.item,
        customer: params.customer,
        oldValue: params.oldValue,
        newValue: params.newValue,
        delta: params.delta,
        reason: params.reason,
        auditId,
      });
    }

    showToast(
      'Master Audit Sealed',
      `Action permanently logged as ${auditId}. Tamper-evident seal created.`,
      'success'
    );

    return { auditId, approvalId };
  };

  const createApprovalRequest = (req: Omit<ApprovalRequest, 'id' | 'requestedAt' | 'status'>): string => {
    const nextReqId = `REQ-00${Math.floor(25 + Math.random() * 75)}`;
    const now = new Date();
    const requestedAt = `${now.getDate()}-${now.toLocaleString('default', { month: 'short' })}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newReq: ApprovalRequest = {
      ...req,
      id: nextReqId,
      requestedAt,
      status: 'pending',
    };

    setApprovalRequests((prev) => [newReq, ...prev]);
    showToast('Approval Request Submitted', `Request #${nextReqId} routed to ${req.requiredTier.toUpperCase()} tier.`, 'info');
    return nextReqId;
  };

  const processApprovalDecision = (id: string, decision: 'approved' | 'rejected', decisionNotes?: string) => {
    const req = approvalRequests.find((r) => r.id === id);
    if (!req) return;

    const approver = users.find((u) => u.role === activeRole) || {
      name: `${activeRole.toUpperCase()} Authority`,
      role: activeRole,
    };

    const now = new Date();
    const decisionAt = `${now.getDate()}-${now.toLocaleString('default', { month: 'short' })}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setApprovalRequests((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            status: decision,
            decisionBy: approver.name,
            decisionByRole: activeRole,
            decisionAt,
            decisionNotes: decisionNotes || (decision === 'approved' ? 'Approved through hierarchy approval chain.' : 'Rejected per policy review.'),
          };
        }
        return r;
      })
    );

    // Write approval permanently into Master Audit
    const auditAction: MasterAuditAction =
      activeRole === 'ceo'
        ? 'CEO_APPROVAL'
        : activeRole === 'gm'
        ? 'GM_APPROVAL'
        : 'MANAGER_APPROVAL';

    logMasterAudit({
      action: auditAction,
      recordRef: req.recordRef || req.id,
      customer: req.customer,
      item: req.item,
      oldValue: `Pending ${req.requiredTier.toUpperCase()} Approval`,
      newValue: decision.toUpperCase(),
      reason: decisionNotes || `Formal decision executed by ${approver.name} (${activeRole.toUpperCase()})`,
      approvedBy: approver.name,
      approvalDate: decisionAt,
      category: 'governance',
    });

    if (decision === 'approved') {
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
      showToast('Request Approved', `Request #${id} approved and sealed in Master Audit.`, 'success');
    } else {
      showToast('Request Rejected', `Request #${id} marked as rejected with audit trail.`, 'warning');
    }
  };

  // TRIPS ACTIONS
  const addTrip = (tripData: Omit<Trip, 'id' | 'tripNumber'>) => {
    const nextTripNumber = `TRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTrip: Trip = {
      ...tripData,
      id: 'trp_' + Date.now(),
      tripNumber: nextTripNumber,
      tripStep: tripData.tripStep || (tripData.status === 'in_transit' ? 'on_route' : tripData.status === 'delivered' ? 'delivered' : 'loading'),
      slipStatus: tripData.slipStatus || 'not_submitted',
    };
    setTrips((prev) => [newTrip, ...prev]);

    // Update driver status
    if (tripData.driverId) {
      setDrivers((prev) =>
        prev.map((d) => (d.id === tripData.driverId ? { ...d, status: 'on_route' } : d))
      );
    }
    // Update vehicle status
    if (tripData.vehicleId) {
      setVehicles((prev) =>
        prev.map((v) => (v.id === tripData.vehicleId ? { ...v, status: 'in_transit' } : v))
      );
    }

    showToast('Trip Created & Dispatched', `Trip #${nextTripNumber} assigned to ${tripData.driverName}.`, 'success');

    // Tamper-evident Master Audit Logging
    logMasterAudit({
      action: 'DRIVER_ASSIGNED',
      recordRef: `${nextTripNumber} [DN #${newTrip.deliveryNote?.dnNumber || 'NEW'}]`,
      customer: newTrip.customerName || newTrip.companyName,
      item: `${newTrip.deliveryNote?.items?.[0]?.name || newTrip.itemName || 'Freight Cargo'} [${newTrip.deliveryNote?.packagesCount || newTrip.quantity || 1} Pkgs]`,
      oldValue: 'Draft / Unscheduled',
      newValue: `${newTrip.origin.name || newTrip.origin.city} → ${newTrip.destination.name || newTrip.destination.city} (Driver: ${tripData.driverName}, Truck: ${newTrip.vehiclePlate})`,
      reason: `Trip scheduled. Pickup: ${newTrip.origin.name || newTrip.origin.city} (${newTrip.origin.address}) | Drop: ${newTrip.destination.name || newTrip.destination.city} (${newTrip.destination.address})`,
      approvedBy: 'Dispatcher',
      category: 'dispatch',
      warehouse: newTrip.origin.city || 'Central Hub',
    });
  };

  const updateTrip = (id: string, updates: Partial<Trip>) => {
    if (activeRole !== 'admin') {
      showToast('Access Denied', 'Only Admin users are authorized to edit trip details.', 'error');
      return;
    }
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id === id) {
          return { ...trip, ...updates };
        }
        return trip;
      })
    );
    showToast('Trip Updated', 'Trip details saved successfully.', 'info');
  };

  const updateTripStatus = (id: string, newStatus: TripStatus, notes?: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id === id) {
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
          const isFinished = newStatus === 'delivered';
          const newStep: TripStep = newStatus === 'in_transit' ? 'on_route' : newStatus === 'delivered' ? 'delivered' : trip.tripStep || 'loading';

          return {
            ...trip,
            status: newStatus,
            tripStep: newStep,
            progressPercent: isFinished ? 100 : newStatus === 'in_transit' ? Math.max(50, trip.progressPercent) : trip.progressPercent,
            completedTime: isFinished ? nowStr : trip.completedTime,
            deliveryNote: {
              ...trip.deliveryNote,
              actualDelivery: isFinished ? nowStr : trip.deliveryNote.actualDelivery,
              specialInstructions: notes ? `${trip.deliveryNote.specialInstructions || ''} [Note: ${notes}]` : trip.deliveryNote.specialInstructions,
            },
          };
        }
        return trip;
      })
    );

    const trip = trips.find((t) => t.id === id);
    if (newStatus === 'delivered' && trip) {
      // Free driver & vehicle
      if (trip.driverId) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === trip.driverId ? { ...d, status: 'available', totalTripsCompleted: d.totalTripsCompleted + 1 } : d))
        );
      }
      if (trip.vehicleId) {
        setVehicles((prev) =>
          prev.map((v) => (v.id === trip.vehicleId ? { ...v, status: 'idle' } : v))
        );
      }
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
      showToast('Trip Delivered!', `Trip #${trip.tripNumber} marked as successfully delivered.`, 'success');
    } else {
      showToast('Trip Status Updated', `Status changed to ${newStatus.replace('_', ' ').toUpperCase()}`, 'info');
    }
  };

  const advanceTripStep = (id: string, nextStep: TripStep) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id === id) {
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
          let newStatus: TripStatus = trip.status;
          let progress = trip.progressPercent;

          if (nextStep === 'loading') {
            newStatus = 'loading';
            progress = 20;
          } else if (nextStep === 'on_route') {
            newStatus = 'in_transit';
            progress = 60;
          } else if (nextStep === 'delivered') {
            newStatus = 'delivered';
            progress = 100;
          }

          return {
            ...trip,
            tripStep: nextStep,
            status: newStatus,
            progressPercent: progress,
            completedTime: nextStep === 'delivered' ? nowStr : trip.completedTime,
          };
        }
        return trip;
      })
    );
    showToast('Trip Step Advanced', `Trip step is now: ${nextStep.replace('_', ' ').toUpperCase()}`, 'success');
  };

  const startTripWithBarcode = (params: {
    barcode: string;
    driverId: string;
    driverName: string;
    truckPlate: string;
    tripId?: string;
  }): { success: boolean; trip?: Trip; error?: string } => {
    const rawBarcode = (params.barcode || '').trim();
    if (!rawBarcode && !params.tripId) {
      return { success: false, error: 'Please scan or enter a barcode/Delivery Note number.' };
    }

    const cleanBarcode = rawBarcode.replace(/[*#]/g, '').trim().toLowerCase();

    // 1. Search in trips
    let matchedTrip = trips.find((t) => {
      if (params.tripId && t.id === params.tripId) return true;
      if (!cleanBarcode) return false;
      const tripBarcode = (t.barcode || '').toLowerCase();
      const tripDn = (t.dnNumber || t.deliveryNote?.dnNumber || '').toLowerCase();
      const tripNum = (t.tripNumber || '').toLowerCase();
      const tripSo = (t.deliveryNote?.soNumber || '').toLowerCase();
      const tripCustNum = (t.customerNumber || '').toLowerCase();
      const tripItemNum = (t.itemNumber || '').toLowerCase();

      return (
        tripBarcode === cleanBarcode ||
        tripDn === cleanBarcode ||
        cleanBarcode.includes(tripDn) ||
        (tripDn && cleanBarcode.replace(/[^a-z0-9]/gi, '') === tripDn.replace(/[^a-z0-9]/gi, '')) ||
        tripNum === cleanBarcode ||
        tripSo === cleanBarcode ||
        (tripCustNum && tripCustNum === cleanBarcode) ||
        (tripItemNum && tripItemNum === cleanBarcode)
      );
    });

    // 2. Search in inboundDeliveryNotes if not found
    if (!matchedTrip && cleanBarcode) {
      const matchedInbound = inboundDeliveryNotes.find(
        (inb) =>
          inb.dnNumber.toLowerCase() === cleanBarcode ||
          cleanBarcode.includes(inb.dnNumber.toLowerCase()) ||
          cleanBarcode.replace(/[^a-z0-9]/gi, '') === inb.dnNumber.replace(/[^a-z0-9]/gi, '').toLowerCase()
      );
      if (matchedInbound) {
        matchedTrip = trips.find((t) => t.id === matchedInbound.tripId || t.dnNumber === matchedInbound.dnNumber);
      }
    }

    // 3. Search in sale orders if not found
    if (!matchedTrip && cleanBarcode) {
      const matchedSo = saleOrders.find(
        (so) =>
          so.orderNumber.toLowerCase() === cleanBarcode ||
          (so.dnNumber && so.dnNumber.toLowerCase() === cleanBarcode)
      );
      if (matchedSo) {
        matchedTrip = trips.find(
          (t) => t.id === matchedSo.tripId || (matchedSo.dnNumber && t.dnNumber === matchedSo.dnNumber)
        );
      }
    }

    // STRICT AUDIT RULE:
    // The driver CANNOT create a new stock record from Start Trip.
    // The barcode must already exist in the Inventory/Dispatch system.
    if (!matchedTrip) {
      return {
        success: false,
        error: `Barcode "${rawBarcode}" is not registered in the Inventory & Dispatch system. Drivers cannot create new stock records from Start Trip. The barcode/DN must already be logged by Dispatch/WMS. Please contact Dispatch Operations.`,
      };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const pickupLocName = matchedTrip.origin.name || matchedTrip.origin.city || 'Origin Facility';
    const dropLocName = matchedTrip.destination.name || matchedTrip.destination.city || 'Consignee Site';

    const updatedTrip: Trip = {
      ...matchedTrip,
      status: 'in_transit',
      tripStep: 'on_route',
      progressPercent: Math.max(matchedTrip.progressPercent || 0, 30),
      departureTime: nowStr,
      barcode: rawBarcode || matchedTrip.barcode || matchedTrip.dnNumber,
      startedByDriverAt: nowStr,
      startedByDriverId: params.driverId,
      startedByDriverName: params.driverName,
      driverId: params.driverId || matchedTrip.driverId,
      driverName: params.driverName || matchedTrip.driverName,
      vehiclePlate: params.truckPlate || matchedTrip.vehiclePlate,
    };

    setTrips((prev) => prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)));

    // Update driver status
    if (params.driverId) {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === params.driverId
            ? { ...d, status: 'on_route', currentTripId: updatedTrip.id }
            : d
        )
      );
    }

    // Update vehicle status
    if (updatedTrip.vehicleId) {
      setVehicles((prev) =>
        prev.map((v) => (v.id === updatedTrip.vehicleId ? { ...v, status: 'in_transit' } : v))
      );
    }

    // Record in Master Audit Trail
    logMasterAudit({
      action: 'TRIP_STARTED',
      recordRef: `${updatedTrip.tripNumber} [DN #${updatedTrip.dnNumber || updatedTrip.deliveryNote.dnNumber}]`,
      customer: updatedTrip.customerName || updatedTrip.companyName,
      item: `${updatedTrip.itemName || 'Cargo'} [${updatedTrip.quantity || 0} ${updatedTrip.uom || 'BAG'}]`,
      oldValue: `Loaded at ${pickupLocName} (Status: ${matchedTrip.status.toUpperCase()})`,
      newValue: `In Transit → ${dropLocName} (Status: ON ROUTE)`,
      reason: `Trip started by Driver ${params.driverName} on Truck ${params.truckPlate}. Barcode: ${rawBarcode || updatedTrip.dnNumber}. Pickup: ${pickupLocName}, Drop: ${dropLocName}`,
      approvedBy: `${params.driverName} (Driver Verified Barcode)`,
      category: 'dispatch',
      warehouse: matchedTrip.origin.city || 'Central Warehouse',
      user: params.driverName,
      userRole: 'driver',
      ipDevice: 'Driver Mobile Handheld (GPS Scanner)',
    });

    try {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      'Trip Started (On Route)',
      `Trip #${updatedTrip.tripNumber} started. Route: ${pickupLocName} → ${dropLocName}. Sealed in Master Audit.`,
      'success'
    );

    return { success: true, trip: updatedTrip };
  };

  const submitTripSlip = (id: string, slipDataUrl: string, receiverName?: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id === id) {
          return {
            ...trip,
            slipStatus: 'pending',
            slipSubmittedAt: nowStr,
            slipImageUrl: slipDataUrl,
            deliveryNote: {
              ...trip.deliveryNote,
              receiverSignature: receiverName || trip.deliveryNote.receiverSignature || 'Signed On Mobile Driver Panel',
              podSignedAt: nowStr,
              slipStatus: 'pending',
            }
          };
        }
        return trip;
      })
    );

    // Also update attached Inbound Delivery Note if exists
    setInboundDeliveryNotes((prev) =>
      prev.map((dn) => {
        if (dn.tripId === id || dn.dnNumber === trips.find(t => t.id === id)?.dnNumber) {
          return {
            ...dn,
            slipStatus: 'pending',
            receiverSignature: receiverName || dn.receiverSignature,
          };
        }
        return dn;
      })
    );

    try {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast('Delivery Slip Submitted', 'Slip photo uploaded and sent to Dispatcher for verification.', 'success');
  };

  const clearTripSlip = (id: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id === id) {
          return {
            ...trip,
            slipStatus: 'cleared',
            slipClearedAt: nowStr,
            deliveryNote: {
              ...trip.deliveryNote,
              slipStatus: 'cleared',
            }
          };
        }
        return trip;
      })
    );

    setInboundDeliveryNotes((prev) =>
      prev.map((dn) => {
        if (dn.tripId === id || dn.dnNumber === trips.find(t => t.id === id)?.dnNumber) {
          return {
            ...dn,
            slipStatus: 'cleared',
          };
        }
        return dn;
      })
    );

    showToast('Slip Cleared & Verified', 'Delivery slip verified by Dispatcher. Record is complete.', 'success');
  };

  const confirmDriverLoading = (tripId: string, loadedQty: number, driverNotes?: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let targetTrip: Trip | undefined;

    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === tripId) {
          targetTrip = {
            ...t,
            tripStep: 'loading',
            status: 'loading',
            driverWorkflowStage: 'loaded_confirmed',
            loadedQuantity: Number(loadedQty),
            loadingConfirmedAt: nowStr,
            loadingConfirmedBy: t.driverName,
            notes: driverNotes ? (t.notes ? `${t.notes} | ${driverNotes}` : driverNotes) : t.notes,
          };
          return targetTrip;
        }
        return t;
      })
    );

    if (targetTrip) {
      // Update driver status to loading
      setDrivers((prev) =>
        prev.map((d) => (d.id === targetTrip?.driverId ? { ...d, status: 'loading' } : d))
      );

      logMasterAudit({
        action: 'LOADING_CONFIRMED',
        recordRef: `${targetTrip.tripNumber} [DN #${targetTrip.dnNumber || targetTrip.deliveryNote.dnNumber}]`,
        customer: targetTrip.customerName || targetTrip.companyName,
        item: `${targetTrip.itemName || 'Cargo'} [${loadedQty} ${targetTrip.uom || 'BAG'}]`,
        oldValue: `Stage: ASSIGNED / WAITING LOADING`,
        newValue: `Loaded Confirmed: ${loadedQty} ${targetTrip.uom || 'BAG'} (by ${targetTrip.driverName})`,
        reason: `Driver confirmed loaded count at supplier. Notes: ${driverNotes || 'Loaded successfully'}`,
        approvedBy: `${targetTrip.driverName} (Driver Physical Count)`,
        category: 'dispatch',
        warehouse: targetTrip.origin.city || 'Supplier Plant',
        user: targetTrip.driverName,
        userRole: 'driver',
        ipDevice: 'Driver Mobile Handheld (Tally Counter)',
      });

      showToast('Loaded Quantity Confirmed', `Loaded ${loadedQty} ${targetTrip.uom || 'BAG'} confirmed by Driver at supplier plant.`, 'success');
    }
  };

  const confirmDriverDeliveryWithQty = (params: {
    tripId: string;
    deliveredQty: number;
    discrepancyReason?: string;
    receiverName: string;
    receiverNotes?: string;
    podImageUrl?: string;
    signatureDone?: boolean;
  }) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let targetTrip: Trip | undefined;

    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === params.tripId) {
          const expectedQty = t.loadedQuantity || t.quantity || params.deliveredQty;
          const diff = Number(params.deliveredQty) - Number(expectedQty);
          const hasReturn = diff < 0;

          targetTrip = {
            ...t,
            status: 'delivered',
            tripStep: 'delivered',
            progressPercent: 100,
            driverWorkflowStage: 'delivered',
            deliveredQuantity: Number(params.deliveredQty),
            shortExtraQuantity: diff,
            shortExtraReason: diff !== 0 ? params.discrepancyReason : undefined,
            shortExtraLoggedAt: nowStr,
            podReceiverName: params.receiverName,
            podReceiverNotes: params.receiverNotes,
            podSignatureDataUrl: params.signatureDone ? 'signature_captured' : undefined,
            podPhotoDataUrl: params.podImageUrl,
            slipStatus: params.podImageUrl ? 'pending' : 'not_submitted',
            slipSubmittedAt: params.podImageUrl ? nowStr : undefined,
            slipImageUrl: params.podImageUrl || t.slipImageUrl,
            completedTime: nowStr,
            returnedStockQuantity: hasReturn ? Math.abs(diff) : 0,
            returnedStockReason: hasReturn ? (params.discrepancyReason || 'Cargo damaged or rejected by site storekeeper') : undefined,
            returnedStockInwarded: false,
            outwardDeducted: true,
            deliveryNote: {
              ...t.deliveryNote,
              receiverSignature: params.receiverName || t.deliveryNote.receiverSignature,
              podSignedAt: nowStr,
              slipStatus: params.podImageUrl ? 'pending' : 'not_submitted',
            }
          };
          return targetTrip;
        }
        return t;
      })
    );

    if (targetTrip) {
      // Free driver and vehicle
      setDrivers((prev) =>
        prev.map((d) => (d.id === targetTrip?.driverId ? { ...d, status: 'available', totalTripsCompleted: (d.totalTripsCompleted || 0) + 1 } : d))
      );
      if (targetTrip.vehicleId) {
        setVehicles((prev) =>
          prev.map((v) => (v.id === targetTrip?.vehicleId ? { ...v, status: 'available' } : v))
        );
      }

      // Record outward stock deduction in WMS movement log (Admin inventory updates outward)
      const expectedQty = targetTrip.loadedQuantity || targetTrip.quantity || params.deliveredQty;
      const diff = Number(params.deliveredQty) - Number(expectedQty);

      logMasterAudit({
        action: 'TRIP_DELIVERED',
        recordRef: `${targetTrip.tripNumber} [DN #${targetTrip.dnNumber || targetTrip.deliveryNote.dnNumber}]`,
        customer: targetTrip.customerName || targetTrip.companyName,
        item: `${targetTrip.itemName || 'Cargo'} [Delivered: ${params.deliveredQty} ${targetTrip.uom || 'BAG'}]`,
        oldValue: `Loaded: ${expectedQty} ${targetTrip.uom || 'BAG'} (Status: IN TRANSIT)`,
        newValue: `Delivered: ${params.deliveredQty} ${targetTrip.uom || 'BAG'} ${diff !== 0 ? `(Variance: ${diff > 0 ? '+' : ''}${diff})` : '(Exact Match)'}`,
        reason: `Driver delivery confirmed at customer site. Receiver: ${params.receiverName}. Notes: ${params.receiverNotes || 'None'}. POD Uploaded: ${params.podImageUrl ? 'YES' : 'NO'}${diff !== 0 ? ` | Reason: ${params.discrepancyReason}` : ''}`,
        approvedBy: `${params.receiverName} (Consignee Storekeeper)`,
        category: 'dispatch',
        warehouse: targetTrip.destination.city || 'Customer Site',
        user: targetTrip.driverName,
        userRole: 'driver',
        ipDevice: 'Driver Mobile Handheld (POD Terminal)',
      });

      try {
        confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }

      showToast(
        'Delivery & POD Registered',
        `Delivered ${params.deliveredQty} ${targetTrip.uom || 'BAG'} to ${targetTrip.customerName}. Outward stock movement recorded.`,
        'success'
      );
    }
  };

  const inwardDriverReturnedStock = (tripId: string, returnQty: number, reason?: string) => {
    const targetTrip = trips.find((t) => t.id === tripId);
    if (!targetTrip) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, returnedStockInwarded: true } : t))
    );

    // Increase or adjust warehouse item if found
    const targetItem = warehouseItems.find(
      (item) =>
        (targetTrip.itemNumber && item.sku.toLowerCase() === targetTrip.itemNumber.toLowerCase()) ||
        (targetTrip.itemName && item.name.toLowerCase().includes(targetTrip.itemName.toLowerCase()))
    );

    if (targetItem) {
      setWarehouseItems((prev) =>
        prev.map((item) =>
          item.id === targetItem.id
            ? { ...item, quantityOnHand: item.quantityOnHand + Number(returnQty), availableQuantity: item.availableQuantity + Number(returnQty) }
            : item
        )
      );
    }

    logMasterAudit({
      action: 'STOCK_IN_VERIFIED',
      recordRef: `RETURN-TRIP-${targetTrip.tripNumber}`,
      customer: targetTrip.customerName,
      item: `${targetTrip.itemName || 'Cargo'} [${returnQty} ${targetTrip.uom || 'BAG'}]`,
      oldValue: `Returned/Undelivered Stock from Driver ${targetTrip.driverName}`,
      newValue: `Inwarded back into WMS Inventory (+${returnQty} ${targetTrip.uom || 'BAG'})`,
      reason: `Returned stock from Trip #${targetTrip.tripNumber} inwarded. Reason: ${reason || targetTrip.returnedStockReason || 'Returned stock'}`,
      approvedBy: 'Warehouse Inward Supervisor',
      category: 'inventory',
      warehouse: targetTrip.origin.city || 'Central Warehouse',
      user: targetTrip.driverName,
      userRole: 'driver',
      ipDevice: 'Driver Handheld Inward Terminal',
    });

    showToast(
      'Returned Stock Inwarded',
      `+${returnQty} ${targetTrip.uom || 'BAG'} successfully received back into Warehouse Inventory.`,
      'success'
    );
  };

  const updateDriverStatus = (driverId: string, status: DriverStatus) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, status } : d))
    );
    showToast('Driver Status Updated', `Status changed to ${status.replace('_', ' ').toUpperCase()}`, 'info');
  };

  const deleteTrip = (id: string, reason?: string, hardDelete: boolean = false) => {
    if (!['admin', 'manager', 'gm', 'dispatcher'].includes(activeRole)) {
      showToast('Access Denied', 'Only authorized managerial and dispatch users can delete trip records.', 'error');
      return;
    }
    const target = trips.find((t) => t.id === id);
    if (!target) return;

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const nowStr = `${day}-${month}-${year} ${hours}:${mins}`;

    const currentAdmin = users.find((u) => u.role === activeRole)?.name || 'Admin Officer';
    const deletionReason = reason || 'Admin deleted logistics & operations record';

    // Free driver & vehicle if currently assigned/in-transit
    if (target.driverId && (target.status === 'in_transit' || target.status === 'assigned')) {
      setDrivers((prev) => prev.map((d) => (d.id === target.driverId ? { ...d, status: 'available' } : d)));
    }
    if (target.vehicleId && (target.status === 'in_transit' || target.status === 'assigned')) {
      setVehicles((prev) => prev.map((v) => (v.id === target.vehicleId ? { ...v, status: 'idle' } : v)));
    }

    if (hardDelete) {
      setTrips((prev) => prev.filter((t) => t.id !== id));
      logMasterAudit({
        action: 'RECORD_DELETED',
        recordRef: `${target.tripNumber} [DN #${target.dnNumber || target.deliveryNote?.dnNumber || 'DN'}]`,
        customer: target.customerName || target.companyName,
        item: `${target.itemName || 'Cargo'} [${target.quantity || 0} ${target.uom || 'BAG'}]`,
        oldValue: `Active Record (Status: ${target.status.toUpperCase()}, Driver: ${target.driverName}, Truck: ${target.vehiclePlate})`,
        newValue: 'PERMANENTLY PURGED FROM ACTIVE LEDGER',
        reason: `Hard Delete: ${deletionReason}`,
        approvedBy: `${currentAdmin} (${activeRole.toUpperCase()})`,
        category: 'dispatch',
        warehouse: target.origin?.city || 'Central Hub',
      });
      showToast('Record Purged', `Operation #${target.tripNumber} permanently removed.`, 'warning');
    } else {
      // Soft Delete with full preservation
      const deleteHistoryEntry: LogisticsEditHistoryEntry = {
        id: 'del_' + Date.now(),
        timestamp: nowStr,
        modifiedBy: currentAdmin,
        modifiedByRole: activeRole,
        reason: deletionReason,
        changesSummary: `RECORD DELETED & ARCHIVED: ${deletionReason}`,
        previousSnapshot: {
          status: target.status,
          driverName: target.driverName,
          vehiclePlate: target.vehiclePlate,
          customerName: target.customerName,
        },
      };

      setTrips((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                isDeleted: true,
                deletedAt: nowStr,
                deletedBy: currentAdmin,
                deletedReason: deletionReason,
                editHistory: [deleteHistoryEntry, ...(t.editHistory || [])],
              }
            : t
        )
      );

      const auditId = logMasterAudit({
        action: 'RECORD_DELETED',
        recordRef: `${target.tripNumber} [DN #${target.dnNumber || target.deliveryNote?.dnNumber || 'DN'}]`,
        customer: target.customerName || target.companyName,
        item: `${target.itemName || 'Cargo'} [${target.quantity || 0} ${target.uom || 'BAG'}]`,
        oldValue: `Active Record (Status: ${target.status.toUpperCase()}, Driver: ${target.driverName}, Truck: ${target.vehiclePlate}, Route: ${target.origin?.city} → ${target.destination?.city})`,
        newValue: 'ARCHIVED & SOFT-DELETED (Preserved in Master Audit)',
        delta: `Deleted by ${currentAdmin} at ${nowStr}. Reason: ${deletionReason}`,
        reason: deletionReason,
        approvedBy: `${currentAdmin} (${activeRole.toUpperCase()})`,
        category: 'dispatch',
        warehouse: target.origin?.city || 'Central Hub',
      });

      showToast(
        'Record Deleted & Audited',
        `Operation #${target.tripNumber} moved to archive. Preserved in Master Audit #${auditId}.`,
        'warning'
      );
    }
  };

  const restoreTrip = (id: string, reason?: string) => {
    if (activeRole !== 'admin') {
      showToast('Access Denied', 'Only Admin users are authorized to restore trip records.', 'error');
      return;
    }
    const target = trips.find((t) => t.id === id);
    if (!target) return;

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const nowStr = `${day}-${month}-${year} ${hours}:${mins}`;

    const currentAdmin = users.find((u) => u.role === activeRole)?.name || 'Admin Officer';
    const restoreReason = reason || 'Admin restored archived operation record';

    const restoreHistoryEntry: LogisticsEditHistoryEntry = {
      id: 'rst_' + Date.now(),
      timestamp: nowStr,
      modifiedBy: currentAdmin,
      modifiedByRole: activeRole,
      reason: restoreReason,
      changesSummary: `RECORD RESTORED FROM ARCHIVE: ${restoreReason}`,
    };

    setTrips((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              isDeleted: false,
              deletedAt: undefined,
              deletedBy: undefined,
              deletedReason: undefined,
              editHistory: [restoreHistoryEntry, ...(t.editHistory || [])],
            }
          : t
      )
    );

    const auditId = logMasterAudit({
      action: 'RECORD_RESTORED',
      recordRef: `${target.tripNumber} [DN #${target.dnNumber || target.deliveryNote?.dnNumber || 'DN'}]`,
      customer: target.customerName || target.companyName,
      item: `${target.itemName || 'Cargo'} [${target.quantity || 0} ${target.uom || 'BAG'}]`,
      oldValue: 'Archived / Deleted Record',
      newValue: `Restored to Active Ledger (Status: ${target.status.toUpperCase()})`,
      delta: `Restored by ${currentAdmin} at ${nowStr}`,
      reason: restoreReason,
      approvedBy: `${currentAdmin} (${activeRole.toUpperCase()})`,
      category: 'dispatch',
      warehouse: target.origin?.city || 'Central Hub',
    });

    showToast('Record Restored', `Operation #${target.tripNumber} is now active. Master Audit #${auditId} logged.`, 'success');
  };

  const duplicateTrip = (sourceTripId: string, customOverrides?: Partial<Trip>): Trip | null => {
    const source = trips.find((t) => t.id === sourceTripId);
    if (!source) {
      showToast('Record Not Found', 'Cannot duplicate non-existent trip.', 'error');
      return null;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const nowStr = `${day}-${month}-${year} ${hours}:${mins}`;
    const dateOnly = `${day}-${month}-${year}`;

    const newTripNum = `TRP-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newDnNum = customOverrides?.dnNumber || `${source.dnNumber || 'DN-1000'}-DUP`;
    const currentAdmin = users.find((u) => u.role === activeRole)?.name || 'Admin Officer';

    const duplicatedTrip: Trip = {
      ...source,
      id: 'trp_dup_' + Date.now(),
      tripNumber: newTripNum,
      dnNumber: newDnNum,
      status: 'assigned',
      tripStep: 'loading',
      departureTime: nowStr,
      completedTime: undefined,
      progressPercent: 10,
      slipStatus: 'not_submitted',
      slipImageUrl: undefined,
      slipSubmittedAt: undefined,
      slipClearedAt: undefined,
      hasRouteShift: false,
      routeShifts: [],
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      deletedReason: undefined,
      duplicatedFromId: source.id,
      lastModifiedBy: currentAdmin,
      lastModifiedAt: nowStr,
      lastModifiedReason: `Duplicated from operation #${source.tripNumber}`,
      deliveryNote: {
        ...source.deliveryNote,
        dnNumber: newDnNum,
        issueDate: dateOnly,
        expectedDelivery: `${day}-${month}-${year} 18:00`,
        actualDelivery: undefined,
        podImageUrl: undefined,
        podSignedAt: undefined,
        receiverSignature: undefined,
        slipStatus: 'not_submitted',
        slipImageUrl: undefined,
      },
      editHistory: [
        {
          id: 'dup_init_' + Date.now(),
          timestamp: nowStr,
          modifiedBy: currentAdmin,
          modifiedByRole: activeRole,
          reason: `Duplicated from Record #${source.tripNumber} (DN #${source.dnNumber || 'None'})`,
          changesSummary: `Cloned operation with new Trip #${newTripNum} and DN #${newDnNum}`,
        },
      ],
      ...customOverrides,
    };

    setTrips((prev) => [duplicatedTrip, ...prev]);

    const auditId = logMasterAudit({
      action: 'RECORD_DUPLICATED',
      recordRef: `${newTripNum} [DN #${newDnNum}]`,
      customer: duplicatedTrip.customerName || duplicatedTrip.companyName,
      item: `${duplicatedTrip.itemName || 'Cargo'} [${duplicatedTrip.quantity || 0} ${duplicatedTrip.uom || 'BAG'}]`,
      oldValue: `Source Operation #${source.tripNumber} (${source.origin?.city} → ${source.destination?.city})`,
      newValue: `New Duplicated Operation #${newTripNum} (${duplicatedTrip.origin?.city} → ${duplicatedTrip.destination?.city})`,
      delta: `Duplicated by ${currentAdmin}. Assigned Driver: ${duplicatedTrip.driverName}, Truck: ${duplicatedTrip.vehiclePlate}`,
      reason: `Duplicated from operation #${source.tripNumber}`,
      approvedBy: `${currentAdmin} (${activeRole.toUpperCase()})`,
      category: 'dispatch',
      warehouse: duplicatedTrip.origin?.city || 'Central Hub',
    });

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      'Operation Duplicated',
      `Created new operation #${newTripNum} (DN #${newDnNum}). Master Audit #${auditId} logged.`,
      'success'
    );

    return duplicatedTrip;
  };

  const adminUpdateTrip = (id: string, updates: Partial<Trip>, reason: string): string => {
    return managerModifyTrip(id, updates, reason);
  };

  // COMPANY LOAD & TLB MAIN INVENTORY INWARD WORKFLOW
  const createCompanyLoad = (params: {
    customerId?: string;
    customerName?: string;
    product?: string;
    itemName?: string;
    itemDescription?: string;
    itemNumber?: string;
    requiredQty: number;
    reservedDnNo: string;
    driverId: string;
    driverName?: string;
    vehicleId: string;
    vehiclePlate?: string;
    pickupLocation: LocationPoint;
    dropLocation: LocationPoint;
    price?: number;
    driverTripRate?: number;
    notes?: string;
  }): { success: boolean; loadId?: string; trip?: Trip; error?: string } => {
    const cleanDn = (params.reservedDnNo || 'DN-001').trim();
    const qty = Number(params.requiredQty) || 500;

    // 1. Locate matching inventory item
    const targetItem = warehouseItems.find(
      (it) =>
        (it.dnNumber && it.dnNumber.toLowerCase() === cleanDn.toLowerCase()) ||
        it.sku.toLowerCase() === cleanDn.toLowerCase() ||
        it.name.toLowerCase().includes('tlb')
    ) || warehouseItems[0];

    const currentOnHand = targetItem ? targetItem.quantityOnHand : 750;
    const currentReserved = targetItem ? targetItem.reservedQuantity || 0 : 0;
    const available = currentOnHand - currentReserved;

    if (available < qty) {
      showToast('Insufficient Stock', `Cannot reserve ${qty} units. Only ${available} units available on ${targetItem?.dnNumber || cleanDn}.`, 'error');
      return { success: false, error: `Insufficient stock on ${targetItem?.dnNumber || cleanDn}. Available: ${available}, Requested: ${qty}` };
    }

    const driverObj = drivers.find((d) => d.id === params.driverId);
    const vehicleObj = vehicles.find((v) => v.id === params.vehicleId);
    const driverName = driverObj?.name || params.driverName || '—';
    const vehiclePlate = vehicleObj?.plateNumber || params.vehiclePlate || '—';

    const loadId = `CL-${Math.floor(1000 + Math.random() * 9000)}`;
    const nextTripNumber = `TRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // 2. Reserve TLB from Main Inventory (Do NOT permanently remove yet, mark Reserved)
    if (targetItem) {
      setWarehouseItems((prev) =>
        prev.map((it) =>
          it.id === targetItem.id
            ? {
                ...it,
                reservedQuantity: (it.reservedQuantity || 0) + qty,
                lastStockCheck: new Date().toISOString().split('T')[0],
              }
            : it
        )
      );
    }

    // 3. Create Company Load Trip
    const newTrip: Trip = {
      id: 'trp_cl_' + Date.now(),
      tripNumber: nextTripNumber,
      isCompanyLoad: true,
      companyLoadId: loadId,
      reservedDnNo: targetItem?.dnNumber || cleanDn,
      reservedItemSku: targetItem?.sku || 'TLB-MAIN-001',
      reservedQuantity: qty,
      companyLoadStage: 'driver_assigned',
      dnNumber: targetItem?.dnNumber || cleanDn,
      companyName: params.customerName || '',
      customerId: params.customerId || 'cust_internal',
      customerName: params.customerName || 'Admin Warehouse Inward',
      itemName: params.itemName || params.product || targetItem?.name || 'Gypsum Powder',
      itemNumber: params.itemNumber || targetItem?.sku || '1290000001',
      itemDescription: params.itemDescription || (params.product !== params.itemName ? params.product : undefined) || 'Gypsum Powder – Bags, Regular 40 kg',
      quantity: qty,
      uom: targetItem?.unit || 'BAG',
      origin: params.pickupLocation,
      destination: params.dropLocation,
      driverId: params.driverId,
      driverName: driverName,
      driverPhone: driverObj?.phone || '',
      vehicleId: params.vehicleId,
      vehiclePlate: vehiclePlate,
      vehicleType: vehicleObj?.type || 'trailer_30t',
      status: 'assigned',
      tripStep: 'loading',
      slipStatus: 'not_submitted',
      isOutsideCompanyLoad: false,
      cargoType: 'industrial',
      driverTripRate: params.driverTripRate || 250,
      price: params.price || 3500,
      cost: params.driverTripRate || 250,
      departureTime: nowStr,
      estimatedArrivalTime: new Date(Date.now() + 4 * 3600000).toISOString().replace('T', ' ').substring(0, 16),
      progressPercent: 20,
      currentLat: params.pickupLocation.lat || 22.8012,
      currentLng: params.pickupLocation.lng || 39.0145,
      deliveryNote: {
        dnNumber: targetItem?.dnNumber || cleanDn,
        issueDate: new Date().toISOString().split('T')[0],
        expectedDelivery: nowStr,
        senderName: params.pickupLocation.name,
        senderAddress: params.pickupLocation.address,
        senderContact: '+966 12 422 9900',
        receiverName: 'Admin Central Warehouse',
        receiverAddress: params.dropLocation.address,
        receiverContact: '+966 11 482 9900',
        items: [
          {
            id: 'itm_cl_' + Date.now(),
            sku: targetItem?.sku || 'TLB-MAIN-001',
            name: `${targetItem?.name || 'TLB'} [Reserved for ${loadId}]`,
            quantity: qty,
            unit: targetItem?.unit || 'BAG',
            weightKg: qty * 40,
            volumeCbm: 40,
            unitPrice: targetItem?.sellingPrice || 18,
          },
        ],
        totalWeightKg: qty * 40,
        totalVolumeCbm: 40,
        packagesCount: qty,
        specialInstructions: `Company Load ${loadId}. Reserved ${qty} ${targetItem?.unit || 'BAG'} from ${targetItem?.dnNumber || cleanDn}. Collect from ${params.pickupLocation.name} and return for Admin Inward.`,
        slipStatus: 'not_submitted',
      },
    };

    setTrips((prev) => [newTrip, ...prev]);

    // 4. Update Driver & Vehicle
    if (params.driverId) {
      setDrivers((prev) =>
        prev.map((d) => (d.id === params.driverId ? { ...d, status: 'on_route' } : d))
      );
    }
    if (params.vehicleId) {
      setVehicles((prev) =>
        prev.map((v) => (v.id === params.vehicleId ? { ...v, status: 'in_transit' } : v))
      );
    }

    // 5. Tamper-evident Master Audit Logging
    const currentManager = users.find((u) => u.role === activeRole)?.name || 'Dispatcher Lead';
    const auditId = logMasterAudit({
      action: 'COMPANY_LOAD_CREATED',
      recordRef: `${loadId} [${nextTripNumber} | ${targetItem?.dnNumber || cleanDn}]`,
      customer: newTrip.customerName,
      item: `${targetItem?.name || 'TLB'} [${qty} ${targetItem?.unit || 'BAG'}]`,
      oldValue: `Main Inventory: ${currentOnHand} (Available: ${available})`,
      newValue: `Reserved ${qty} for ${loadId} (Available: ${available - qty}, In Loading: ${currentReserved + qty})`,
      delta: `Stock Reserved: -${qty} Available, +${qty} Reserved (Pending Inward)`,
      reason: `Company Load created by Dispatcher. ${qty} TLB reserved from ${targetItem?.dnNumber || cleanDn} for pickup by Driver ${driverName} (${vehiclePlate}) at ${params.pickupLocation.name}.`,
      approvedBy: `${currentManager} (${activeRole.toUpperCase()})`,
      approvalDate: nowStr,
      category: 'inventory',
      warehouse: 'Admin Central Warehouse',
    });

    newTrip.managerAuditRef = auditId;

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      'Company Load Created & Stock Reserved',
      `Load #${loadId} assigned to ${driverName} (${vehiclePlate}). ${qty} TLB reserved from ${targetItem?.dnNumber || cleanDn}. Master Audit #${auditId} logged.`,
      'success'
    );

    return { success: true, loadId, trip: newTrip };
  };

  const createTruckLoad = (params: {
    loadType: 'gypsum' | 'broker';
    tlbNumber?: string;
    supplier?: string;
    availableQuantity?: number;
    loadingQuantity: number;
    brokerName?: string;
    supplierSource?: string;
    driverId: string;
    driverName?: string;
    vehicleId: string;
    vehiclePlate?: string;
    loadingDate?: string;
    pickupLocation?: LocationPoint;
    dropLocation?: LocationPoint;
    notes?: string;
  }) => {
    const nextSeq = trips.length + 1;
    const nextTripNumber = `TRP-2026-${String(nextSeq).padStart(4, '0')}`;
    const loadId = params.loadType === 'gypsum' ? `GYP-${Date.now().toString().slice(-4)}` : `BRK-${Date.now().toString().slice(-4)}`;
    const nowStr = params.loadingDate ? `${params.loadingDate} 08:00` : new Date().toISOString().replace('T', ' ').substring(0, 16);

    const driverObj = drivers.find((d) => d.id === params.driverId);
    const vehicleObj = vehicles.find((v) => v.id === params.vehicleId);
    const driverName = params.driverName || driverObj?.name || '—';
    const vehiclePlate = params.vehiclePlate || vehicleObj?.plateNumber || 'Truck 12';

    const originPoint: LocationPoint = params.pickupLocation || {
      id: 'loc_pickup_' + Date.now(),
      name: params.loadType === 'gypsum' ? (params.supplier || 'Supplier A') : (params.supplierSource || 'Supplier B'),
      city: 'Rabigh',
      address: params.loadType === 'gypsum' ? (params.supplier || '') : (params.supplierSource || 'Supplier Source Terminal'),
      lat: 22.8012,
      lng: 39.0145,
    };

    const destPoint: LocationPoint = params.dropLocation || {
      id: 'loc_central_wh',
      name: 'Admin Central Logistics Warehouse',
      nameAr: 'المستودع اللوجستي المركزي الرئيسي',
      city: 'Riyadh',
      lat: 24.6408,
      lng: 46.8225,
      address: 'Riyadh Exit 18 Al-Sulay Central Terminal Yard',
    };

    const cleanTlb = params.tlbNumber || (params.loadType === 'gypsum' ? '9100042352' : undefined);
    const qty = Number(params.loadingQuantity) || 750;

    const newTrip: Trip = {
      id: 'trp_load_' + Date.now(),
      tripNumber: nextTripNumber,
      loadType: params.loadType,
      isCompanyLoad: params.loadType === 'gypsum',
      companyLoadId: loadId,
      brokerName: params.brokerName,
      supplierSource: params.supplierSource,
      availableQuantity: params.availableQuantity,
      loadingQuantity: qty,
      loadingDate: params.loadingDate || new Date().toISOString().split('T')[0],
      loadingStatus: 'loading',
      tlbNumber: cleanTlb,
      dnNumber: cleanTlb || `DN-${Date.now().toString().slice(-4)}`,
      reservedDnNo: cleanTlb,
      companyName: params.loadType === 'gypsum' ? (params.supplier || 'Supplier A') : (params.brokerName || 'ABC Broker'),
      customerName: params.loadType === 'gypsum' ? 'Central Logistics Warehouse' : (params.brokerName || 'Broker Client Terminal'),
      customerId: params.loadType === 'gypsum' ? 'cust_gypsum_supplier' : 'cust_broker_client',
      itemName: params.loadType === 'gypsum' ? 'Gypsum Powder (TLB Load)' : 'Broker Freight Bags',
      itemNumber: cleanTlb || 'TLB-9100042352',
      itemDescription: params.loadType === 'gypsum'
        ? `Gypsum Powder – Regular 40 kg (Supplier: ${params.supplier || 'Supplier A'})`
        : `Broker Consignment Cargo (Source: ${params.supplierSource || 'Supplier B'})`,
      quantity: qty,
      originalQuantity: qty,
      remainingInwardQuantity: qty,
      directSaleQuantity: 0,
      uom: 'BAG',
      origin: originPoint,
      destination: destPoint,
      driverId: params.driverId,
      driverName: driverName,
      driverPhone: driverObj?.phone || '',
      vehicleId: params.vehicleId,
      vehiclePlate: vehiclePlate,
      vehicleType: vehicleObj?.type || 'trailer_30t',
      status: 'loading',
      tripStep: 'loading',
      slipStatus: 'not_submitted',
      isOutsideCompanyLoad: params.loadType === 'broker',
      partnerCompanyName: params.loadType === 'broker' ? params.brokerName : undefined,
      cargoType: 'industrial',
      driverTripRate: 250,
      price: 3500,
      cost: 250,
      departureTime: nowStr,
      estimatedArrivalTime: new Date(Date.now() + 5 * 3600000).toISOString().replace('T', ' ').substring(0, 16),
      progressPercent: 25,
      currentLat: originPoint.lat || 22.8012,
      currentLng: originPoint.lng || 39.0145,
      deliveryNote: {
        dnNumber: cleanTlb || `DN-${Date.now().toString().slice(-4)}`,
        issueDate: params.loadingDate || new Date().toISOString().split('T')[0],
        expectedDelivery: nowStr,
        senderName: originPoint.name,
        senderAddress: originPoint.address,
        senderContact: '+966 12 422 9900',
        receiverName: destPoint.name,
        receiverAddress: destPoint.address,
        receiverContact: '+966 11 482 9900',
        items: [
          {
            id: 'itm_' + Date.now(),
            sku: cleanTlb || 'TLB-9100042352',
            name: params.loadType === 'gypsum' ? 'Gypsum Powder BAG – 40 kg' : 'Broker Packaged Goods',
            quantity: qty,
            unit: 'BAG',
            weightKg: qty * 40,
            volumeCbm: 40,
            unitPrice: 18,
          },
        ],
        totalWeightKg: qty * 40,
        totalVolumeCbm: 40,
        packagesCount: qty,
        specialInstructions: params.notes || `${params.loadType.toUpperCase()} LOAD: ${qty} BAG assigned to ${driverName} (${vehiclePlate}).`,
        slipStatus: 'not_submitted',
      },
    };

    setTrips((prev) => [newTrip, ...prev]);

    // Update Driver & Vehicle Status
    if (params.driverId) {
      setDrivers((prev) =>
        prev.map((d) => (d.id === params.driverId ? { ...d, status: 'loading' } : d))
      );
    }
    if (params.vehicleId) {
      setVehicles((prev) =>
        prev.map((v) => (v.id === params.vehicleId ? { ...v, status: 'loading' } : v))
      );
    }

    // Tamper-evident Audit Log
    const currentManager = users.find((u) => u.role === activeRole)?.name || 'Dispatcher Lead';
    const auditId = logMasterAudit({
      action: 'TLB_LOAD_RECORDED',
      recordRef: `${newTrip.tripNumber} [${params.loadType.toUpperCase()} | TLB: ${cleanTlb || 'N/A'}]`,
      customer: newTrip.customerName,
      item: `${newTrip.itemName} [${qty} BAG]`,
      oldValue: 'Status: Unassigned / New Load Request',
      newValue: `Status: Loading (Driver: ${driverName}, Truck: ${vehiclePlate}, Date: ${params.loadingDate || 'Today'})`,
      delta: `Assigned ${qty} BAG to ${driverName}`,
      reason: `${params.loadType.toUpperCase()} LOAD dispatched via Truck Dispatcher Console.`,
      approvedBy: `${currentManager} (${activeRole.toUpperCase()})`,
      approvalDate: nowStr,
      category: 'dispatch',
      warehouse: 'Admin Central Warehouse',
    });

    newTrip.managerAuditRef = auditId;

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      `${params.loadType === 'gypsum' ? 'Gypsum' : 'Broker'} Load Assigned`,
      `Trip #${newTrip.tripNumber} assigned to ${driverName} (${vehiclePlate}). ${qty} BAG scheduled for loading.`,
      'success'
    );

    return { success: true, loadId, trip: newTrip };
  };

  const updateTripLoadingStatus = (
    tripId: string,
    status: 'pending' | 'loading' | 'loaded' | 'completed' | 'going_to_supplier' | 'at_supplier'
  ) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t;

        let tripStatus: TripStatus = t.status;
        let tripStep: TripStep = t.tripStep || 'loading';
        let progress = t.progressPercent;

        if (status === 'pending') {
          tripStatus = 'assigned';
          tripStep = 'assigned';
          progress = 10;
        } else if (status === 'going_to_supplier') {
          tripStatus = 'on_route';
          tripStep = 'loading';
          progress = 25;
        } else if (status === 'at_supplier' || status === 'loading') {
          tripStatus = 'loading';
          tripStep = 'loading';
          progress = 40;
        } else if (status === 'loaded') {
          tripStatus = 'in_transit';
          tripStep = 'on_route';
          progress = 60;
        } else if (status === 'completed') {
          tripStatus = 'delivered';
          tripStep = 'delivered';
          progress = 100;
        }

        return {
          ...t,
          loadingStatus: status,
          status: tripStatus,
          tripStep: tripStep,
          progressPercent: progress,
        };
      })
    );

    showToast('Loading Status Updated', `Load status shifted to ${status.toUpperCase().replace('_', ' ')}.`, 'info');
  };

  const advanceCompanyLoadStage = (tripId: string, stage: 'driver_assigned' | 'supplier_loading' | 'returned_to_admin') => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    let newTripStep: TripStep = 'loading';
    let newStatus: TripStatus = 'in_transit';
    let progress = 30;

    if (stage === 'supplier_loading') {
      newTripStep = 'loading';
      newStatus = 'loading';
      progress = 50;
    } else if (stage === 'returned_to_admin') {
      newTripStep = 'unloading';
      newStatus = 'arrived';
      progress = 90;
    }

    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              companyLoadStage: stage,
              tripStep: newTripStep,
              status: newStatus,
              progressPercent: progress,
            }
          : t
      )
    );

    logMasterAudit({
      action: 'TRIP_MODIFIED',
      recordRef: `${trip.companyLoadId || trip.tripNumber} [${trip.reservedDnNo || 'DN'}]`,
      customer: trip.customerName,
      item: `${trip.itemName} [${trip.quantity} ${trip.uom}]`,
      oldValue: `Stage: ${(trip.companyLoadStage || 'created').replace(/_/g, ' ').toUpperCase()}`,
      newValue: `Stage: ${stage.replace(/_/g, ' ').toUpperCase()}`,
      reason: `Company load lifecycle progression: ${stage.replace(/_/g, ' ')}`,
      approvedBy: activeRole.toUpperCase(),
      category: 'dispatch',
    });

    showToast('Company Load Stage Updated', `Load #${trip.companyLoadId || trip.tripNumber} advanced to ${stage.replace(/_/g, ' ').toUpperCase()}`, 'info');
  };

  const inwardCompanyStock = (params: {
    tripId: string;
    verifiedQty?: number;
    verifiedNotes?: string;
    adminName?: string;
  }): boolean => {
    const trip = trips.find((t) => t.id === params.tripId);
    if (!trip) {
      showToast('Load Not Found', 'Trip or company load does not exist.', 'error');
      return false;
    }

    const currentManager = params.adminName || users.find((u) => u.role === activeRole)?.name || 'Admin Warehouse Lead';
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const inwardQty = params.verifiedQty !== undefined ? Number(params.verifiedQty) : (trip.reservedQuantity || trip.quantity || 500);

    // 1. Find warehouse item and release from reserved into available stock
    setWarehouseItems((prev) => {
      const itemIndex = prev.findIndex(
        (it) =>
          (trip.reservedItemSku && it.sku === trip.reservedItemSku) ||
          (trip.reservedDnNo && it.dnNumber === trip.reservedDnNo) ||
          it.name.toLowerCase().includes('tlb')
      );
      if (itemIndex >= 0) {
        const item = prev[itemIndex];
        const currentReserved = item.reservedQuantity || 0;
        const newReserved = Math.max(0, currentReserved - (trip.reservedQuantity || inwardQty));
        const newOnHand = item.quantityOnHand + inwardQty;
        const updated = [...prev];
        updated[itemIndex] = {
          ...item,
          quantityOnHand: newOnHand,
          reservedQuantity: newReserved,
          lastStockCheck: new Date().toISOString().split('T')[0],
        };
        return updated;
      }
      return prev;
    });

    // 2. Mark Trip as delivered and inward completed
    setTrips((prev) =>
      prev.map((t) =>
        t.id === params.tripId
          ? {
              ...t,
              status: 'delivered',
              tripStep: 'delivered',
              companyLoadStage: 'inward_completed',
              progressPercent: 100,
              completedTime: nowStr,
              inwardReceivedAt: nowStr,
              inwardReceivedBy: currentManager,
              inwardNotes: params.verifiedNotes || 'Inward verified by Admin and added to Main Available Stock.',
            }
          : t
      )
    );

    // 3. Free driver & vehicle
    if (trip.driverId) {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === trip.driverId
            ? { ...d, status: 'available', totalTripsCompleted: d.totalTripsCompleted + 1 }
            : d
        )
      );
    }
    if (trip.vehicleId) {
      setVehicles((prev) =>
        prev.map((v) => (v.id === trip.vehicleId ? { ...v, status: 'idle' } : v))
      );
    }

    // 4. Create WarehouseMovement Log (inbound_grn)
    const movement: WarehouseMovement = {
      id: 'mov_inward_' + Date.now(),
      type: 'inbound_grn',
      itemSku: trip.reservedItemSku || trip.itemNumber || 'TLB-MAIN-001',
      itemName: trip.itemName || 'TLB Main Inventory',
      quantity: inwardQty,
      timestamp: nowStr,
      referenceDoc: `${trip.companyLoadId || 'CL-LOAD'} / DN-${trip.reservedDnNo || trip.dnNumber}`,
      performedBy: `${currentManager} (Admin Inward)`,
      notes: `Inward Stock received from Driver ${trip.driverName} (${trip.vehiclePlate}). Verified ${inwardQty} ${trip.uom || 'BAG'} from Supplier. Released from Reserved into Main Available Inventory.`,
    };
    setWarehouseMovements((prev) => [movement, ...prev]);

    // 5. Tamper-evident Master Audit Logging
    const auditId = logMasterAudit({
      action: 'INWARD_STOCK_RECEIVED',
      recordRef: `${trip.companyLoadId || trip.tripNumber} [DN #${trip.reservedDnNo || trip.dnNumber}]`,
      customer: trip.customerName,
      item: `${trip.itemName} [${inwardQty} ${trip.uom || 'BAG'}]`,
      oldValue: `Reserved in transit: ${trip.reservedQuantity || inwardQty} (Status: Arrived at Admin)`,
      newValue: `Inward Completed: +${inwardQty} Available in TLB Main Inventory (0 Reserved)`,
      delta: `Inventory Movement: Reserved Stock released -> Available Stock +${inwardQty} units`,
      reason: `Admin verified Supplier Delivery Note & physical cargo from Driver ${trip.driverName}. Clicked [INWARD STOCK]. Audit trail complete.`,
      approvedBy: `${currentManager} (${activeRole.toUpperCase()})`,
      approvalDate: nowStr,
      category: 'inventory',
      warehouse: 'Admin Central Warehouse',
    });

    try {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      'Stock Inward Completed & Sealed',
      `Load #${trip.companyLoadId || trip.tripNumber}: +${inwardQty} ${trip.uom || 'BAG'} moved to Available Inventory. Master Audit #${auditId} logged.`,
      'success'
    );

    return true;
  };

  // Helper: calculate total earned trip allowances for a driver
  const getDriverTotalTripAmount = (driverId: string): number => {
    const driver = drivers.find((d) => d.id === driverId);
    const driverTrips = trips.filter(
      (t) => t.driverId === driverId && (t.status === 'delivered' || t.isRetroactive)
    );
    return driverTrips.reduce((sum, t) => {
      const rate = t.driverTripRate !== undefined ? t.driverTripRate : (driver?.tripAllowanceRate ?? t.cost ?? 0);
      return sum + Number(rate || 0);
    }, 0);
  };

  // MANAGER TRIP CONTROL & AUDITABLE ACTIONS
  const managerModifyTrip = (id: string, updates: Partial<Trip>, reason: string): string => {
    if (activeRole !== 'admin') {
      showToast('Access Denied', 'Only Admin users are authorized to edit trip records.', 'error');
      return '';
    }
    const existingTrip = trips.find((t) => t.id === id);
    if (!existingTrip) {
      showToast('Trip Not Found', 'Unable to locate trip for modification.', 'error');
      return '';
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const nowStr = `${day}-${month}-${year} ${hours}:${mins}`;

    const currentManager = users.find((u) => u.role === activeRole)?.name || 'Operations Manager';

    // Build granular diff / delta summary for audit
    const diffs: string[] = [];
    let primaryAction: MasterAuditAction = 'TRIP_MODIFIED';

    if (updates.driverId && updates.driverId !== existingTrip.driverId) {
      diffs.push(`Driver: ${existingTrip.driverName} -> ${updates.driverName || updates.driverId}`);
      primaryAction = 'DRIVER_REASSIGNED';
    }
    if (updates.vehiclePlate && updates.vehiclePlate !== existingTrip.vehiclePlate) {
      diffs.push(`Vehicle: ${existingTrip.vehiclePlate} -> ${updates.vehiclePlate}`);
    }
    if (updates.driverTripRate !== undefined && updates.driverTripRate !== existingTrip.driverTripRate) {
      diffs.push(`Driver Trip Rate: SAR ${existingTrip.driverTripRate ?? 0} -> SAR ${updates.driverTripRate}`);
      primaryAction = 'TRIP_RATE_CHANGED';
    }
    if (updates.origin && (updates.origin.name !== existingTrip.origin.name || updates.origin.city !== existingTrip.origin.city)) {
      diffs.push(`Pickup: ${existingTrip.origin.name || existingTrip.origin.city} -> ${updates.origin.name || updates.origin.city}`);
      primaryAction = 'ROUTE_CHANGED';
    }
    if (updates.destination && (updates.destination.name !== existingTrip.destination.name || updates.destination.city !== existingTrip.destination.city)) {
      diffs.push(`Drop: ${existingTrip.destination.name || existingTrip.destination.city} -> ${updates.destination.name || updates.destination.city}`);
      primaryAction = 'ROUTE_CHANGED';
    }
    if (updates.quantity !== undefined && updates.quantity !== existingTrip.quantity) {
      diffs.push(`Quantity: ${existingTrip.quantity ?? 0} -> ${updates.quantity} ${updates.uom || existingTrip.uom || ''}`);
      primaryAction = 'QUANTITY_CORRECTED';
    }
    if (updates.dnNumber && updates.dnNumber !== existingTrip.dnNumber) {
      diffs.push(`DN No: ${existingTrip.dnNumber || 'None'} -> ${updates.dnNumber}`);
    }
    if (updates.slipImageUrl && updates.slipImageUrl !== existingTrip.slipImageUrl) {
      diffs.push('Delivery Slip Attached / Updated');
      primaryAction = 'DELIVERY_SLIP_ATTACHED';
    }
    if (updates.price !== undefined && updates.price !== existingTrip.price) {
      diffs.push(`Freight Price: SAR ${existingTrip.price} -> SAR ${updates.price}`);
    }

    const deltaStr = diffs.length > 0 ? diffs.join(' | ') : 'Trip parameters updated by Manager';

    // Log into Master Audit
    const auditId = logMasterAudit({
      action: primaryAction,
      recordRef: `${existingTrip.tripNumber} [DN #${updates.dnNumber || existingTrip.dnNumber || 'DN'}]`,
      customer: updates.customerName || existingTrip.customerName || existingTrip.companyName,
      item: `${updates.itemName || existingTrip.itemName || 'Cargo'} [${updates.quantity ?? existingTrip.quantity ?? 1} ${updates.uom || existingTrip.uom || 'Unit'}]`,
      oldValue: `Driver: ${existingTrip.driverName}, Truck: ${existingTrip.vehiclePlate}, Rate: SAR ${existingTrip.driverTripRate ?? existingTrip.cost ?? 0}, Route: ${existingTrip.origin.city} → ${existingTrip.destination.city}`,
      newValue: `Driver: ${updates.driverName || existingTrip.driverName}, Truck: ${updates.vehiclePlate || existingTrip.vehiclePlate}, Rate: SAR ${updates.driverTripRate ?? existingTrip.driverTripRate ?? 0}, Route: ${updates.origin?.city || existingTrip.origin.city} → ${updates.destination?.city || existingTrip.destination.city}`,
      delta: deltaStr,
      reason: `Manager Modification: ${reason}`,
      approvedBy: `${currentManager} (${activeRole.toUpperCase()})`,
      category: 'dispatch',
      warehouse: updates.origin?.city || existingTrip.origin.city || 'Central Hub',
    });

    // Handle Driver reassignment statuses
    if (updates.driverId && updates.driverId !== existingTrip.driverId) {
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === existingTrip.driverId) {
            return { ...d, status: 'available' };
          }
          if (d.id === updates.driverId) {
            return { ...d, status: existingTrip.status === 'in_transit' ? 'on_route' : d.status };
          }
          return d;
        })
      );
    }

    // Handle Vehicle reassignment statuses
    if (updates.vehicleId && updates.vehicleId !== existingTrip.vehicleId) {
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === existingTrip.vehicleId) {
            return { ...v, status: 'idle' };
          }
          if (v.id === updates.vehicleId) {
            return { ...v, status: existingTrip.status === 'in_transit' ? 'in_transit' : v.status };
          }
          return v;
        })
      );
    }

    const newEditHistoryEntry: LogisticsEditHistoryEntry = {
      id: 'ed_' + Date.now(),
      timestamp: nowStr,
      modifiedBy: currentManager,
      modifiedByRole: activeRole,
      reason: reason,
      changesSummary: deltaStr,
      previousSnapshot: {
        customerName: existingTrip.customerName,
        driverName: existingTrip.driverName,
        vehiclePlate: existingTrip.vehiclePlate,
        origin: existingTrip.origin,
        destination: existingTrip.destination,
        quantity: existingTrip.quantity,
        status: existingTrip.status,
        price: existingTrip.price,
        driverTripRate: existingTrip.driverTripRate,
        dnNumber: existingTrip.dnNumber,
      },
    };

    // Apply updates to Trip
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            ...updates,
            lastModifiedBy: currentManager,
            lastModifiedAt: nowStr,
            lastModifiedReason: reason,
            managerAuditRef: auditId,
            editHistory: [newEditHistoryEntry, ...(t.editHistory || [])],
            deliveryNote: {
              ...t.deliveryNote,
              ...(updates.dnNumber ? { dnNumber: updates.dnNumber } : {}),
              ...(updates.quantity ? { totalWeightKg: (updates.quantity || 1) * 40, packagesCount: updates.quantity } : {}),
              ...(updates.slipImageUrl ? { slipImageUrl: updates.slipImageUrl, slipStatus: 'pending' } : {}),
            },
          };
        }
        return t;
      })
    );

    showToast('Trip Modified & Audited', `Changes sealed permanently under Master Audit #${auditId}.`, 'success');
    return auditId;
  };

  const managerAddPostDeliveryTrip = (params: {
    dnNumber: string;
    driverId: string;
    vehicleId: string;
    origin: LocationPoint;
    destination: LocationPoint;
    quantity: number;
    uom?: string;
    itemName?: string;
    cargoType?: CargoType;
    driverTripRate: number;
    price?: number;
    completedTime: string;
    reason: string;
    slipImageUrl?: string;
    receiverSignature?: string;
    customerName?: string;
    customerId?: string;
    notes?: string;
  }): Trip => {
    const nextTripNumber = `TRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const driverObj = drivers.find((d) => d.id === params.driverId);
    const vehicleObj = vehicles.find((v) => v.id === params.vehicleId);
    const currentManager = users.find((u) => u.role === activeRole)?.name || 'Operations Manager';

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const nowStr = `${day}-${month}-${year} ${hours}:${mins}`;

    const cleanDn = (params.dnNumber || `DN-RETRO-${Math.floor(100000 + Math.random() * 900000)}`).trim();
    const driverName = driverObj ? driverObj.name : 'Assigned Driver';
    const driverPhone = driverObj ? driverObj.phone : '+966 50 000 0000';
    const vehiclePlate = vehicleObj ? vehicleObj.plateNumber : 'TRK-0000';
    const vehicleType = vehicleObj ? vehicleObj.type : 'trailer_30t';

    // Check if there's an existing Delivery Note or Inbound DN with this DN number
    const matchedInbound = inboundDeliveryNotes.find(
      (inb) => inb.dnNumber.toLowerCase() === cleanDn.toLowerCase()
    );

    const finalCustomerName = params.customerName || matchedInbound?.companyName || 'Commercial Client';
    const finalItemName = params.itemName || matchedInbound?.itemName || 'General Freight';
    const finalQty = params.quantity || matchedInbound?.quantity || 1;
    const finalUom = params.uom || matchedInbound?.uom || 'BAG';

    const newTrip: Trip = {
      id: 'trp_retro_' + Date.now(),
      tripNumber: nextTripNumber,
      dnNumber: cleanDn,
      companyName: finalCustomerName,
      customerName: finalCustomerName,
      customerId: params.customerId || matchedInbound?.customerId || 'cust_default',
      itemName: finalItemName,
      quantity: finalQty,
      uom: finalUom,
      origin: params.origin,
      destination: params.destination,
      driverId: params.driverId,
      driverName: driverName,
      driverPhone: driverPhone,
      vehicleId: params.vehicleId,
      vehiclePlate: vehiclePlate,
      vehicleType: vehicleType,
      status: 'delivered',
      tripStep: 'delivered',
      isOutsideCompanyLoad: false,
      cargoType: params.cargoType || 'general',
      price: params.price || 1200,
      cost: params.driverTripRate,
      driverTripRate: params.driverTripRate,
      isRetroactive: true,
      retroactiveReason: params.reason || 'Trip was not created before dispatch (Post-Delivery Adjustment)',
      retroactiveCreatedAt: nowStr,
      originalDeliveryTime: params.completedTime || nowStr,
      completedTime: params.completedTime || nowStr,
      departureTime: params.completedTime ? `${params.completedTime.split(' ')[0]} 08:00` : nowStr,
      estimatedArrivalTime: params.completedTime || nowStr,
      progressPercent: 100,
      barcode: cleanDn,
      slipStatus: params.slipImageUrl ? 'pending' : 'not_submitted',
      slipImageUrl: params.slipImageUrl,
      notes: params.notes,
      lastModifiedBy: currentManager,
      lastModifiedAt: nowStr,
      lastModifiedReason: `Post-delivery retroactive creation: ${params.reason}`,
      deliveryNote: {
        dnNumber: cleanDn,
        soNumber: matchedInbound?.soNumber || `SO-${Math.floor(100000 + Math.random() * 900000)}`,
        issueDate: params.completedTime || nowStr,
        expectedDelivery: params.completedTime || nowStr,
        actualDelivery: params.completedTime || nowStr,
        senderName: params.origin.name || params.origin.city,
        senderAddress: params.origin.address,
        senderContact: driverPhone,
        receiverName: finalCustomerName,
        receiverAddress: params.destination.address,
        receiverContact: '+966 50 000 0000',
        items: [
          {
            id: 'item_1',
            sku: matchedInbound?.itemNumber || 'SKU-TLB-01',
            name: finalItemName,
            quantity: finalQty,
            unit: finalUom,
            weightKg: finalQty * 40,
            volumeCbm: finalQty * 0.05,
          },
        ],
        totalWeightKg: finalQty * 40,
        totalVolumeCbm: finalQty * 0.05,
        packagesCount: finalQty,
        receiverSignature: params.receiverSignature || 'Signed by Consignee at Site',
        podSignedAt: params.completedTime || nowStr,
        slipImageUrl: params.slipImageUrl,
        slipStatus: params.slipImageUrl ? 'pending' : 'not_submitted',
      },
    };

    // Add trip to state
    setTrips((prev) => [newTrip, ...prev]);

    // Update Driver total trips count
    if (params.driverId) {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === params.driverId
            ? {
                ...d,
                totalTripsCompleted: d.totalTripsCompleted + 1,
              }
            : d
        )
      );
    }

    // Link to Inbound DN if found
    if (matchedInbound) {
      setInboundDeliveryNotes((prev) =>
        prev.map((inb) =>
          inb.id === matchedInbound.id
            ? {
                ...inb,
                tripId: newTrip.id,
                driverId: params.driverId,
                driverName: driverName,
                vehiclePlate: vehiclePlate,
                pickupLocation: params.origin.name || params.origin.city,
                dropLocation: params.destination.name || params.destination.city,
              }
            : inb
        )
      );
    }

    // Tamper-evident Master Audit Logging (Crucial Requirement!)
    const auditId = logMasterAudit({
      action: 'TRIP_POST_DELIVERY_ADDED',
      recordRef: `${nextTripNumber} [DN #${cleanDn}]`,
      customer: finalCustomerName,
      item: `${finalItemName} [${finalQty} ${finalUom}]`,
      oldValue: `No Pre-Dispatch Record (Original Delivery: ${params.completedTime || nowStr})`,
      newValue: `Missing Trip Created Post-Delivery (Driver: ${driverName}, Truck: ${vehiclePlate}, Driver Rate: SAR ${params.driverTripRate})`,
      delta: `Retroactive Link: DN #${cleanDn} -> Driver ${driverName} [SAR ${params.driverTripRate}]`,
      reason: `Missing Trip added by Manager after delivery completed. Reason: ${params.reason}. Original Delivery: ${params.completedTime || nowStr}. Created at: ${nowStr}`,
      approvedBy: `${currentManager} (${activeRole.toUpperCase()})`,
      approvalDate: nowStr,
      category: 'dispatch',
      warehouse: params.origin.city || 'Central Warehouse',
    });

    newTrip.managerAuditRef = auditId;

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      'Missing Trip Added & Sealed',
      `Trip #${nextTripNumber} linked to DN #${cleanDn}. Driver Trip Amount updated (+SAR ${params.driverTripRate}). Master Audit #${auditId} logged.`,
      'success'
    );

    return newTrip;
  };

  const managerCancelTrip = (id: string, reason: string) => {
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;

    const currentManager = users.find((u) => u.role === activeRole)?.name || 'Operations Manager';
    const now = new Date();
    const nowStr = `${String(now.getDate()).padStart(2, '0')}-${now.toLocaleString('default', { month: 'short' })}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setTrips((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'cancelled',
              lastModifiedBy: currentManager,
              lastModifiedAt: nowStr,
              lastModifiedReason: `Cancelled: ${reason}`,
            }
          : t
      )
    );

    // Free driver & vehicle
    if (trip.driverId) {
      setDrivers((prev) => prev.map((d) => (d.id === trip.driverId ? { ...d, status: 'available' } : d)));
    }
    if (trip.vehicleId) {
      setVehicles((prev) => prev.map((v) => (v.id === trip.vehicleId ? { ...v, status: 'idle' } : v)));
    }

    const auditId = logMasterAudit({
      action: 'TRIP_CANCELLED',
      recordRef: `${trip.tripNumber} [DN #${trip.dnNumber || 'DN'}]`,
      customer: trip.customerName || trip.companyName,
      item: `${trip.itemName || 'Cargo'} [${trip.quantity || 1} ${trip.uom || 'Unit'}]`,
      oldValue: `Status: ${trip.status.toUpperCase()}`,
      newValue: 'Status: CANCELLED',
      reason: `Manager Cancellation: ${reason}`,
      approvedBy: `${currentManager} (${activeRole.toUpperCase()})`,
      category: 'dispatch',
      warehouse: trip.origin.city || 'Central Hub',
    });

    showToast('Trip Cancelled', `Trip #${trip.tripNumber} cancelled. Sealed in Master Audit #${auditId}.`, 'warning');
  };

  const managerReopenTrip = (id: string, reason: string, targetStatus: TripStatus = 'in_transit') => {
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;

    const currentManager = users.find((u) => u.role === activeRole)?.name || 'Operations Manager';
    const now = new Date();
    const nowStr = `${String(now.getDate()).padStart(2, '0')}-${now.toLocaleString('default', { month: 'short' })}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setTrips((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: targetStatus,
              tripStep: targetStatus === 'delivered' ? 'delivered' : 'on_route',
              lastModifiedBy: currentManager,
              lastModifiedAt: nowStr,
              lastModifiedReason: `Reopened: ${reason}`,
            }
          : t
      )
    );

    // Re-engage driver & vehicle
    if (trip.driverId && targetStatus === 'in_transit') {
      setDrivers((prev) => prev.map((d) => (d.id === trip.driverId ? { ...d, status: 'on_route' } : d)));
    }
    if (trip.vehicleId && targetStatus === 'in_transit') {
      setVehicles((prev) => prev.map((v) => (v.id === trip.vehicleId ? { ...v, status: 'in_transit' } : v)));
    }

    const auditId = logMasterAudit({
      action: 'TRIP_REOPENED',
      recordRef: `${trip.tripNumber} [DN #${trip.dnNumber || 'DN'}]`,
      customer: trip.customerName || trip.companyName,
      item: `${trip.itemName || 'Cargo'} [${trip.quantity || 1} ${trip.uom || 'Unit'}]`,
      oldValue: `Status: ${trip.status.toUpperCase()}`,
      newValue: `Status: ${targetStatus.toUpperCase()}`,
      reason: `Manager Reopened Trip: ${reason}`,
      approvedBy: `${currentManager} (${activeRole.toUpperCase()})`,
      category: 'dispatch',
      warehouse: trip.origin.city || 'Central Hub',
    });

    showToast('Trip Reopened', `Trip #${trip.tripNumber} is now ${targetStatus.toUpperCase()}. Master Audit #${auditId} logged.`, 'info');
  };

  const managerClearDelivery = (id: string, reason?: string) => {
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;

    clearTripSlip(id);
    const currentManager = users.find((u) => u.role === activeRole)?.name || 'Operations Manager';
    const now = new Date();
    const nowStr = `${String(now.getDate()).padStart(2, '0')}-${now.toLocaleString('default', { month: 'short' })}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const auditId = logMasterAudit({
      action: 'DELIVERY_CLEARED',
      recordRef: `${trip.tripNumber} [DN #${trip.dnNumber || trip.deliveryNote?.dnNumber}]`,
      customer: trip.customerName || trip.companyName,
      item: `${trip.itemName || 'Cargo'} [${trip.quantity || 1} ${trip.uom || 'Unit'}]`,
      oldValue: `Slip Status: ${trip.slipStatus || 'pending'}`,
      newValue: 'Slip Status: CLEARED & APPROVED',
      reason: reason ? `Manager Delivery Clearance: ${reason}` : 'Manager verified and approved delivery note clearance.',
      approvedBy: `${currentManager} (${activeRole.toUpperCase()})`,
      approvalDate: nowStr,
      category: 'dispatch',
      warehouse: trip.destination.city || 'Destination Site',
    });

    showToast('Delivery Cleared', `Delivery slip and POD approved. Master Audit #${auditId} logged.`, 'success');
  };

  const managerAttachSlip = (id: string, slipImageUrl: string, reason: string, receiverName?: string) => {
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;

    const currentManager = users.find((u) => u.role === activeRole)?.name || 'Operations Manager';
    const now = new Date();
    const nowStr = `${String(now.getDate()).padStart(2, '0')}-${now.toLocaleString('default', { month: 'short' })}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setTrips((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              slipImageUrl,
              slipStatus: 'pending',
              slipSubmittedAt: nowStr,
              deliveryNote: {
                ...t.deliveryNote,
                slipImageUrl,
                receiverSignature: receiverName || t.deliveryNote.receiverSignature || 'Consignee Signed',
                slipStatus: 'pending',
              },
            }
          : t
      )
    );

    const auditId = logMasterAudit({
      action: 'DELIVERY_SLIP_ATTACHED',
      recordRef: `${trip.tripNumber} [DN #${trip.dnNumber || trip.deliveryNote?.dnNumber}]`,
      customer: trip.customerName || trip.companyName,
      item: `${trip.itemName || 'Cargo'} [${trip.quantity || 1} ${trip.uom || 'Unit'}]`,
      oldValue: trip.slipImageUrl ? 'Slip Attached (Previous)' : 'No Slip Attached',
      newValue: 'New Delivery Slip Attached by Manager',
      reason: `Manager Attached Delivery Slip: ${reason}`,
      approvedBy: `${currentManager} (${activeRole.toUpperCase()})`,
      category: 'dispatch',
      warehouse: trip.destination.city || 'Destination Site',
    });

    showToast('Delivery Slip Attached', `Slip linked to trip. Master Audit #${auditId} logged.`, 'success');
  };

  // DRIVERS ACTIONS
  const addDriver = (driverData: Omit<Driver, 'id'>) => {
    const newDriver: Driver = {
      ...driverData,
      id: 'drv_' + Date.now(),
    };
    setDrivers((prev) => [newDriver, ...prev]);

    // Synchronize truck assignment across fleet vehicles
    if (newDriver.assignedVehiclePlate) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.plateNumber === newDriver.assignedVehiclePlate || v.id === newDriver.assignedVehicleId
            ? { ...v, assignedDriverName: newDriver.name }
            : v
        )
      );
    }

    showToast('Driver Enrolled', `${newDriver.name} added to driver roster with truck assignment.`, 'success');
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    const authorizedRoles: UserRole[] = ['admin', 'manager', 'gm', 'ceo', 'dispatcher'];
    if (!authorizedRoles.includes(activeRole)) {
      showToast('Access Denied', 'Only Admin and Operations Managers are authorized to edit driver profiles.', 'error');
      return;
    }

    let targetDriverName = '';
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const updated = { ...d, ...updates };
          targetDriverName = updated.name;
          return updated;
        }
        return d;
      })
    );

    // Synchronize truck assignment across fleet vehicles
    if (updates.assignedVehiclePlate !== undefined) {
      const newPlate = updates.assignedVehiclePlate;
      setVehicles((prev) =>
        prev.map((v) => {
          // If this vehicle is newly assigned to this driver
          if (newPlate && (v.plateNumber === newPlate || v.id === updates.assignedVehicleId)) {
            return { ...v, assignedDriverName: updates.name || targetDriverName };
          }
          // If this vehicle was previously assigned to this driver and is now unassigned
          if (targetDriverName && v.assignedDriverName === targetDriverName && (!newPlate || v.plateNumber !== newPlate)) {
            return { ...v, assignedDriverName: undefined };
          }
          return v;
        })
      );
    }

    showToast('Driver Profile Updated', 'Saved driver information, dates & truck assignment.', 'info');
  };

  // VEHICLES ACTIONS
  const addVehicle = (vehicleData: Omit<Vehicle, 'id'>) => {
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: 'veh_' + Date.now(),
    };
    setVehicles((prev) => [newVehicle, ...prev]);
    showToast('Vehicle Added', `Plate ${newVehicle.plateNumber} registered in fleet.`, 'success');
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    if (activeRole !== 'admin') {
      showToast('Access Denied', 'Only Admin users are authorized to edit fleet vehicles.', 'error');
      return;
    }
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    showToast('Vehicle Updated', 'Fleet record updated.', 'info');
  };

  // WAREHOUSE ACTIONS
  const addWarehouseItem = (itemData: Omit<WarehouseItem, 'id'>) => {
    const newItem: WarehouseItem = {
      ...itemData,
      id: 'wh_' + Date.now(),
    };
    setWarehouseItems((prev) => [newItem, ...prev]);
    showToast('Item Added to Inventory', `${newItem.name} registered.`, 'success');
  };

  const updateWarehouseItem = (id: string, updates: Partial<WarehouseItem>) => {
    if (activeRole !== 'admin') {
      showToast('Access Denied', 'Only Admin users are authorized to edit warehouse inventory.', 'error');
      return;
    }
    setWarehouseItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    showToast('Stock Updated', 'Warehouse item updated.', 'info');
  };

  const deleteWarehouseItem = (id: string) => {
    if (!['admin', 'manager', 'gm', 'warehouse_mgr', 'warehouse'].includes(activeRole)) {
      showToast('Access Denied', 'Only authorized inventory and manager roles can delete warehouse inventory items.', 'error');
      return;
    }
    const target = warehouseItems.find((i) => i.id === id);
    setWarehouseItems((prev) => prev.filter((i) => i.id !== id));
    logMasterAudit({
      action: 'QUANTITY_CORRECTED',
      recordRef: target?.sku || id,
      item: target?.name || 'Warehouse SKU',
      oldValue: `Qty: ${target?.quantityOnHand || 0}`,
      newValue: 'Item Deleted',
      reason: 'Administrative catalog deletion',
      warehouse: 'TLB Warehouse',
      category: 'inventory',
      approvedBy: `Admin (${activeRole.toUpperCase()})`,
    });
    showToast('Item Deleted', `Inventory item ${target?.name || ''} has been removed.`, 'warning');
  };

  const addWarehouseMovement = (movementData: Omit<WarehouseMovement, 'id' | 'timestamp'>) => {
    const newMovement: WarehouseMovement = {
      ...movementData,
      id: 'mov_' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setWarehouseMovements((prev) => [newMovement, ...prev]);
  };

  // =========================================================================
  // GYPSUM INVENTORY ENGINE (Real-Time Qty In / Qty Out & Traceable Movements)
  // =========================================================================
  const addGypsumItem = (item: Omit<GypsumInventoryItem, 'id' | 'availableStock'>) => {
    const opening = Number(item.openingStock) || 0;
    const qIn = Number(item.qtyIn) || 0;
    const qOut = Number(item.qtyOut) || 0;
    const avail = opening + qIn - qOut;
    const newItem: GypsumInventoryItem = {
      ...item,
      id: 'gyp_inv_' + Date.now(),
      openingStock: opening,
      qtyIn: qIn,
      qtyOut: qOut,
      availableStock: Math.max(0, avail),
    };
    setGypsumInventory((prev) => [...prev, newItem]);
    showToast('Gypsum Item Created', `Item #${newItem.itemNumber} (${newItem.itemDescription}) added.`, 'success');
  };

  const recordGypsumQtyIn = (params: {
    itemNumber: string;
    date: string;
    qtyIn: number;
    reference?: string;
    notes?: string;
    pdfName?: string;
    pdfUrl?: string;
    soNumber?: string;
    dnNumber?: string;
  }) => {
    const qty = Number(params.qtyIn) || 0;
    if (qty <= 0) {
      showToast('Validation Error', 'Quantity In must be greater than 0.', 'error');
      return { success: false, error: 'Quantity In must be greater than 0.' };
    }

    const targetItem = gypsumInventory.find((g) => g.itemNumber === params.itemNumber) || {
      id: 'gyp_inv_' + Date.now(),
      itemNumber: params.itemNumber,
      itemDescription: 'Bags - Regular 40 kg Gypsum Powder',
      uom: 'BAG',
      openingStock: 0,
      qtyIn: 0,
      qtyOut: 0,
      availableStock: 0,
      soNumber: '9100042352',
      dnNumber: '9010043436',
    };

    const newQtyIn = (targetItem.qtyIn || 0) + qty;
    const newAvailable = (targetItem.openingStock || 0) + newQtyIn - (targetItem.qtyOut || 0);

    let so = params.soNumber || '';
    let dn = params.dnNumber || '';
    if (!so && params.reference) {
      const match = params.reference.match(/(?:SO|so|Sales Order)[:#\s]*(\d+)/i);
      if (match) so = match[1];
    }
    if (!dn && params.reference) {
      const match = params.reference.match(/(?:DN|dn|Delivery Note)[:#\s]*(\d+)/i);
      if (match) dn = match[1];
    }

    const newMovement: GypsumMovement = {
      id: 'gyp_mov_' + Date.now(),
      date: params.date || new Date().toISOString().split('T')[0],
      type: 'IN',
      itemNumber: targetItem.itemNumber,
      itemDescription: targetItem.itemDescription,
      uom: targetItem.uom,
      qtyIn: qty,
      qtyOut: 0,
      balance: newAvailable,
      soNumber: so || targetItem.soNumber || '9100042352',
      dnNumber: dn || targetItem.dnNumber || '9010043436',
      reference: params.reference || (dn ? `DN #${dn}` : 'Manual Qty In'),
      notes: params.notes,
      pdfName: params.pdfName,
      pdfUrl: params.pdfUrl,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setGypsumInventory((prev) => {
      const exists = prev.some((g) => g.itemNumber === targetItem.itemNumber);
      if (exists) {
        return prev.map((g) =>
          g.itemNumber === targetItem.itemNumber
            ? {
                ...g,
                qtyIn: newQtyIn,
                availableStock: newAvailable,
                soNumber: so || g.soNumber,
                dnNumber: dn || g.dnNumber,
              }
            : g
        );
      } else {
        return [...prev, { ...targetItem, qtyIn: newQtyIn, availableStock: newAvailable }];
      }
    });

    setGypsumMovements((prev) => [newMovement, ...prev]);

    // Synchronize with general warehouse inventory
    setWarehouseItems((prev) => {
      const match = prev.find((it) => it.sku === targetItem.itemNumber);
      if (match) {
        return prev.map((it) =>
          it.sku === targetItem.itemNumber
            ? {
                ...it,
                quantityOnHand: it.quantityOnHand + qty,
                totalStockIn: (it.totalStockIn || 0) + qty,
              }
            : it
        );
      }
      return prev;
    });

    addWarehouseMovement({
      type: 'inbound_grn',
      movementType: 'IN',
      itemSku: targetItem.itemNumber,
      itemName: targetItem.itemDescription,
      quantity: qty,
      delta: qty,
      previousQuantityOnHand: targetItem.availableStock,
      newQuantityOnHand: newAvailable,
      referenceDoc: params.reference || (dn ? `DN #${dn}` : 'GRN-GYP-IN'),
      performedBy: 'Hassan Al-Otaibi (Warehouse Lead)',
      notes: params.notes || `Gypsum Qty In: +${qty} ${targetItem.uom}. Available: ${newAvailable}`,
    });

    showToast(
      'Qty In Saved',
      `+${qty} ${targetItem.uom} added to Item #${targetItem.itemNumber}. Available Stock: ${newAvailable} ${targetItem.uom}`,
      'success'
    );

    return { success: true, movement: newMovement };
  };

  const recordGypsumQtyOut = (params: {
    itemNumber: string;
    date: string;
    qtyOut: number;
    customer?: string;
    driverName?: string;
    tlbNumber?: string;
    reference?: string;
    notes?: string;
    soNumber?: string;
    dnNumber?: string;
  }) => {
    const qty = Number(params.qtyOut) || 0;
    if (qty <= 0) {
      showToast('Validation Error', 'Quantity Out must be greater than 0.', 'error');
      return { success: false, error: 'Quantity Out must be greater than 0.' };
    }

    const targetItem = gypsumInventory.find((g) => g.itemNumber === params.itemNumber);
    if (!targetItem) {
      showToast('Error', `Gypsum item #${params.itemNumber} not found.`, 'error');
      return { success: false, error: `Item #${params.itemNumber} not found.` };
    }

    // ⚠️ Mandatory Check: The system should not allow Qty Out greater than the available stock.
    if (qty > targetItem.availableStock) {
      const errMsg = `Quantity Out (${qty} ${targetItem.uom}) exceeds available stock (${targetItem.availableStock} ${targetItem.uom}).`;
      showToast('Insufficient Stock', errMsg, 'error');
      return { success: false, error: errMsg };
    }

    const newQtyOut = (targetItem.qtyOut || 0) + qty;
    const newAvailable = (targetItem.openingStock || 0) + (targetItem.qtyIn || 0) - newQtyOut;

    let so = params.soNumber || '';
    let dn = params.dnNumber || '';
    if (!so && params.reference) {
      const match = params.reference.match(/(?:SO|so|Sales Order)[:#\s]*(\d+)/i);
      if (match) so = match[1];
    }
    if (!dn && params.reference) {
      const match = params.reference.match(/(?:DN|dn|Delivery Note)[:#\s]*(\d+)/i);
      if (match) dn = match[1];
    }

    const newMovement: GypsumMovement = {
      id: 'gyp_mov_' + Date.now(),
      date: params.date || new Date().toISOString().split('T')[0],
      type: 'OUT',
      itemNumber: targetItem.itemNumber,
      itemDescription: targetItem.itemDescription,
      uom: targetItem.uom,
      qtyIn: 0,
      qtyOut: qty,
      balance: newAvailable,
      soNumber: so || targetItem.soNumber,
      dnNumber: dn || targetItem.dnNumber,
      customer: params.customer,
      driverName: params.driverName,
      tlbNumber: params.tlbNumber,
      reference: params.reference || (params.customer ? `Dispatched to ${params.customer}` : 'Manual Qty Out'),
      notes: params.notes,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setGypsumInventory((prev) =>
      prev.map((g) =>
        g.itemNumber === targetItem.itemNumber
          ? {
              ...g,
              qtyOut: newQtyOut,
              availableStock: newAvailable,
            }
          : g
      )
    );

    setGypsumMovements((prev) => [newMovement, ...prev]);

    // Synchronize with general warehouse inventory
    setWarehouseItems((prev) => {
      return prev.map((it) =>
        it.sku === targetItem.itemNumber
          ? {
              ...it,
              quantityOnHand: Math.max(0, it.quantityOnHand - qty),
              totalStockOut: (it.totalStockOut || 0) + qty,
            }
          : it
      );
    });

    addWarehouseMovement({
      type: 'stock_out_sale',
      movementType: 'OUT',
      itemSku: targetItem.itemNumber,
      itemName: targetItem.itemDescription,
      quantity: qty,
      delta: -qty,
      previousQuantityOnHand: targetItem.availableStock,
      newQuantityOnHand: newAvailable,
      referenceDoc: params.reference || (dn ? `DN #${dn}` : 'SALE-GYP-OUT'),
      customerName: params.customer,
      driverName: params.driverName,
      performedBy: 'Logistics Dispatcher',
      notes: params.notes || `Gypsum Qty Out: -${qty} ${targetItem.uom}. Remaining: ${newAvailable}`,
    });

    showToast(
      'Qty Out Saved',
      `-${qty} ${targetItem.uom} dispatched from Item #${targetItem.itemNumber}. Remaining Available: ${newAvailable} ${targetItem.uom}`,
      'success'
    );

    return { success: true, movement: newMovement };
  };

  const deleteGypsumMovement = (id: string) => {
    setGypsumMovements((prev) => prev.filter((m) => m.id !== id));
    showToast('Movement Deleted', 'Gypsum movement record removed from ledger.', 'info');
  };

  const resetGypsumInventory = () => {
    setGypsumInventory(initialGypsumInventory);
    setGypsumMovements(initialGypsumMovements);
    showToast('Gypsum Inventory Cleared', 'All gypsum stock and movements have been removed.', 'info');
  };

  // =========================================================================
  // TLB SUPPLIER INVENTORY ENGINE
  // Workflow: Supplier -> Supplier Inventory -> TLB Main Inventory -> Inward/Outward -> Sale/Dispatch
  // =========================================================================
  const addSupplierInventoryItem = (
    itemData: Omit<SupplierInventoryItem, 'id' | 'createdAt'> & { autoLinkToMainInventory?: boolean }
  ): { supplierItemId: string; mainItemId?: string } => {
    const supId = 'sup_inv_' + Date.now();
    const createdTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const actor = itemData.receivedBy || 'Admin / Logistics Manager';
    const cleanDn = (itemData.dnNo || '').trim();
    const cleanSo = (itemData.soNo || '').trim();
    const qty = Number(itemData.qtyReceived) || 0;
    const uom = itemData.uom || 'BAG';
    const prodName = itemData.itemDescription || 'TLB (Truck Load Bulk)';
    const prodSku = itemData.itemNumber || `TLB-${cleanDn.replace(/[^A-Za-z0-9]/g, '') || Date.now()}`;

    let mainItemId: string | undefined = undefined;

    // Auto link and create/sync in TLB Main Inventory if requested
    if (itemData.autoLinkToMainInventory !== false) {
      // Check existing main warehouse item
      const existing = warehouseItems.find(
        (i) => (cleanDn && i.dnNumber === cleanDn) || i.sku === prodSku || i.name.toLowerCase() === prodName.toLowerCase()
      );

      if (existing) {
        mainItemId = existing.id;
        setWarehouseItems((prev) =>
          prev.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  quantityOnHand: item.quantityOnHand + qty,
                  totalStockIn: (item.totalStockIn ?? item.quantityOnHand) + qty,
                  dnNumber: cleanDn || item.dnNumber,
                  sourceSupplier: itemData.supplier || item.sourceSupplier,
                  lastStockCheck: new Date().toISOString().split('T')[0],
                }
              : item
          )
        );
      } else {
        const newMainId = 'wh_' + Date.now();
        mainItemId = newMainId;
        const newMainItem: WarehouseItem = {
          id: newMainId,
          sku: prodSku,
          name: prodName,
          nameAr: prodName,
          category: 'Building Materials',
          aisle: 'B-04',
          rack: 'R-01',
          bay: 'B-04',
          quantityOnHand: qty,
          openingStock: qty,
          totalStockIn: qty,
          totalStockOut: 0,
          reservedQuantity: 0,
          minimumThreshold: 100,
          unit: uom,
          unitCost: 14,
          sellingPrice: 18,
          barcode: itemData.barcode || `628100${Math.floor(1000000 + Math.random() * 9000000)}`,
          dnNumber: cleanDn,
          sourceSupplier: itemData.supplier || '',
          isTemperatureControlled: false,
          lastStockCheck: new Date().toISOString().split('T')[0],
        };
        setWarehouseItems((prev) => [newMainItem, ...prev]);
      }

      // Record inward traceable warehouse movement
      const movId = 'mov_sup_in_' + Date.now();
      const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(16);
      const newMovement: WarehouseMovement = {
        id: movId,
        timestamp: createdTimestamp,
        date: createdTimestamp,
        type: 'stock_in',
        movementType: 'IN',
        itemId: mainItemId,
        inventoryId: mainItemId,
        dnNumber: cleanDn,
        itemSku: prodSku,
        itemName: prodName,
        productName: prodName,
        quantity: qty,
        delta: qty,
        previousQuantityOnHand: existing ? existing.quantityOnHand : 0,
        newQuantityOnHand: (existing ? existing.quantityOnHand : 0) + qty,
        referenceDoc: cleanDn ? `DN-${cleanDn}` : `SO-${cleanSo}`,
        driverName: 'Supplier Direct Transfer',
        barcode: itemData.barcode || '6281002938106',
        source: itemData.supplier || '',
        performedBy: actor,
        status: 'Available',
        unitPrice: 14,
        totalAmount: 14 * qty,
        auditHash: hash,
        notes: `Auto-credited to TLB Main Inventory from Supplier Receiving DN #${cleanDn} / SO #${cleanSo}.`,
      };
      setWarehouseMovements((prev) => [newMovement, ...prev]);
    }

    const newSupplierItem: SupplierInventoryItem = {
      ...itemData,
      id: supId,
      supplier: itemData.supplier || '',
      supplierName: itemData.supplierName || itemData.supplier || '',
      tlbNo: itemData.tlbNo || `TLB-${String(supplierInventory.length + 1).padStart(3, '0')}`,
      dnNo: cleanDn,
      soNo: cleanSo,
      itemDescription: prodName,
      itemNumber: prodSku,
      uom: uom,
      qtyReceived: qty,
      qtyAvailable: itemData.qtyAvailable !== undefined ? itemData.qtyAvailable : qty,
      qtyAllocated: itemData.qtyAllocated || 0,
      aiScanStatus: itemData.aiScanStatus || 'completed',
      barcode: itemData.barcode || `${cleanDn}${cleanSo}`,
      qrCode: itemData.qrCode || `DN:${cleanDn}|SO:${cleanSo}|QTY:${qty}|SUP:${itemData.supplier || 'Supplier'}`,
      receivedBy: actor,
      receivedDate: itemData.receivedDate || new Date().toISOString().split('T')[0],
      receivedTime: itemData.receivedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: itemData.status || 'RECEIVED',
      linkedMainInventoryId: mainItemId,
      transfers: itemData.transfers || [],
      notes: itemData.notes || `Stock received from supplier ${itemData.supplier} under DN #${cleanDn}.`,
      createdAt: createdTimestamp,
    };

    setSupplierInventory((prev) => [newSupplierItem, ...prev]);

    // Master Audit Trail
    logMasterAudit({
      action: 'SUPPLIER_STOCK_RECEIVED',
      recordRef: `${newSupplierItem.tlbNo} [DN: ${cleanDn}]`,
      item: `${prodName} (SKU: ${prodSku})`,
      quantity: qty,
      oldValue: 'Initial Supplier Intake',
      newValue: `Received: ${qty} ${uom} (Available: ${newSupplierItem.qtyAvailable} ${uom})`,
      delta: `+${qty} ${uom}`,
      reason: `Supplier Inward Stock Receipt from ${newSupplierItem.supplier} [DN #${cleanDn} / SO #${cleanSo}]`,
      warehouse: 'TLB Supplier Inventory -> Stock All',
      category: 'inventory',
      approvedBy: actor,
    });

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      'Supplier Stock Received',
      `Registered ${qty} ${uom} for DN #${cleanDn} (${prodName}) in Supplier Inventory & Synced to Main TLB Inventory.`,
      'success'
    );

    return { supplierItemId: supId, mainItemId };
  };

  const updateSupplierInventoryItem = (id: string, updates: Partial<SupplierInventoryItem>) => {
    setSupplierInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    showToast('Supplier Inventory Updated', 'Saved changes to supplier inventory record.', 'info');
  };

  const deleteSupplierInventoryItem = (id: string) => {
    const target = supplierInventory.find((i) => i.id === id);
    if (!target) return;
    setSupplierInventory((prev) => prev.filter((i) => i.id !== id));
    logMasterAudit({
      action: 'QUANTITY_CORRECTED',
      recordRef: target.tlbNo || target.dnNo,
      item: target.itemDescription,
      oldValue: `Qty: ${target.qtyReceived}`,
      newValue: 'Record Removed',
      reason: 'Administrative supplier inventory cleanup',
      warehouse: 'TLB Supplier Inventory',
      category: 'inventory',
      approvedBy: `Admin (${activeRole.toUpperCase()})`,
    });
    showToast('Supplier Record Removed', `Supplier inventory entry #${target.dnNo} removed.`, 'warning');
  };

  const transferSupplierStock = (params: {
    supplierItemId: string;
    quantity: number;
    transferredTo: 'TLB_MAIN_INVENTORY' | 'DISPATCH_LOAD' | 'DIRECT_SALE' | 'CUSTOMER_DELIVERY';
    driverId?: string;
    driverName?: string;
    vehiclePlate?: string;
    customerId?: string;
    customerName?: string;
    performedBy?: string;
    referenceDoc?: string;
    notes?: string;
  }): { success: boolean; transferId?: string; error?: string } => {
    const target = supplierInventory.find((i) => i.id === params.supplierItemId);
    if (!target) {
      return { success: false, error: 'Supplier inventory item not found' };
    }

    const qty = Number(params.quantity);
    if (!qty || qty <= 0) {
      return { success: false, error: 'Please enter a valid transfer quantity' };
    }

    if (qty > target.qtyAvailable) {
      return {
        success: false,
        error: `Insufficient available stock in supplier batch. Available: ${target.qtyAvailable} ${target.uom || 'Unit'}, Requested: ${qty}`,
      };
    }

    const transferId = 'trn_' + Date.now();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const actor = params.performedBy || 'Admin / Dispatcher';
    const driver = drivers.find((d) => d.id === params.driverId) || (params.driverName ? { name: params.driverName, id: params.driverId } : undefined);
    const customer = customers.find((c) => c.id === params.customerId) || (params.customerName ? { name: params.customerName, id: params.customerId } : undefined);

    const newTransfer: SupplierStockTransfer = {
      id: transferId,
      timestamp,
      transferredTo: params.transferredTo,
      quantity: qty,
      driverId: driver?.id || params.driverId,
      driverName: driver?.name || params.driverName,
      vehiclePlate: params.vehiclePlate,
      customerId: customer?.id || params.customerId,
      customerName: customer?.name || params.customerName,
      performedBy: actor,
      referenceDoc: params.referenceDoc || `TRF-${target.dnNo}`,
      notes: params.notes || `Transferred ${qty} ${target.uom} to ${params.transferredTo}.`,
    };

    // Update Supplier Inventory batch available and allocated quantities
    const newQtyAvailable = target.qtyAvailable - qty;
    const newQtyAllocated = (target.qtyAllocated || 0) + qty;
    const newStatus = newQtyAvailable === 0 ? 'ALLOCATED' : 'PARTIAL_ALLOCATED';

    setSupplierInventory((prev) =>
      prev.map((item) =>
        item.id === target.id
          ? {
              ...item,
              qtyAvailable: newQtyAvailable,
              qtyAllocated: newQtyAllocated,
              status: newStatus,
              transfers: [newTransfer, ...(item.transfers || [])],
            }
          : item
      )
    );

    // Record traceable movement in TLB Warehouse movements ledger
    const movId = 'mov_sup_trn_' + Date.now();
    const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(16);
    const warehouseMov: WarehouseMovement = {
      id: movId,
      timestamp,
      date: timestamp,
      type: params.transferredTo === 'DIRECT_SALE' ? 'stock_out_sale' : 'outbound_dispatch',
      movementType: 'OUT',
      itemId: target.linkedMainInventoryId || 'wh_6',
      inventoryId: target.linkedMainInventoryId || 'wh_6',
      dnNumber: target.dnNo,
      itemSku: target.itemNumber || 'TLB-MAIN-001',
      itemName: target.itemDescription,
      productName: target.itemDescription,
      quantity: qty,
      delta: -qty,
      previousQuantityOnHand: target.qtyAvailable,
      newQuantityOnHand: newQtyAvailable,
      referenceDoc: params.referenceDoc || `TRF-${target.dnNo}`,
      customerId: customer?.id || params.customerId,
      customerName: customer?.name || params.customerName,
      driverId: driver?.id || params.driverId,
      driverName: driver?.name || params.driverName,
      vehiclePlate: params.vehiclePlate,
      performedBy: actor,
      status: 'Completed',
      unitPrice: 14,
      totalAmount: 14 * qty,
      auditHash: hash,
      notes: `Supplier stock transfer: ${qty} ${target.uom} taken by ${actor} for ${driver?.name || customer?.name || params.transferredTo}.`,
    };
    setWarehouseMovements((prev) => [warehouseMov, ...prev]);

    // Master Audit Log
    logMasterAudit({
      action: 'SUPPLIER_STOCK_ALLOCATED',
      recordRef: `${target.tlbNo} -> ${params.transferredTo}`,
      item: target.itemDescription,
      quantity: qty,
      oldValue: `Available: ${target.qtyAvailable} ${target.uom}`,
      newValue: `Available: ${newQtyAvailable} ${target.uom} (Allocated: ${newQtyAllocated})`,
      delta: `-${qty} ${target.uom}`,
      reason: `Supplier batch stock allocation for ${driver?.name || customer?.name || params.referenceDoc || params.transferredTo}`,
      warehouse: 'TLB Supplier Inventory -> Stock All',
      category: 'inventory',
      approvedBy: actor,
    });

    showToast(
      'Stock Transferred from Supplier Batch',
      `Allocated ${qty} ${target.uom} from DN #${target.dnNo} to ${params.transferredTo}. Remaining: ${newQtyAvailable} ${target.uom}.`,
      'success'
    );

    return { success: true, transferId };
  };

  // =========================================================================
  // TRACEABLE STOCK IN & STOCK OUT (FOR SALE) MOVEMENTS ENGINE
  // =========================================================================
  const executeStockIn = (params: {
    dnNumber: string;
    productName?: string;
    itemSku?: string;
    quantity: number;
    unit?: string;
    barcode?: string;
    driverId?: string;
    driverName?: string;
    vehiclePlate?: string;
    source?: string;
    performedBy?: string;
    unitCost?: number;
    sellingPrice?: number;
    notes?: string;
  }): string => {
    const cleanDn = (params.dnNumber || '').trim();
    const qty = Number(params.quantity) || 0;
    const prodName = params.productName || 'TLB (Truck Load Bulk)';
    const prodSku = params.itemSku || `TLB-${cleanDn.replace(/[^A-Za-z0-9]/g, '') || Date.now()}`;
    const unit = params.unit || 'BAG';
    const driver = drivers.find((d) => d.id === params.driverId) || (params.driverName ? { name: params.driverName, id: params.driverId || 'drv_1' } : undefined);
    const vehicle = vehicles.find((v) => v.id === params.vehiclePlate || v.plateNumber === params.vehiclePlate);
    const actor = params.performedBy || 'Admin / Logistics Manager';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

    let openingQty = 0;
    let targetItemId = '';

    setWarehouseItems((prev) => {
      const existing = prev.find(
        (i) => (cleanDn && i.dnNumber === cleanDn) || i.sku === prodSku || i.name.toLowerCase() === prodName.toLowerCase()
      );
      if (existing) {
        targetItemId = existing.id;
        openingQty = existing.quantityOnHand;
        const newTotalIn = (existing.totalStockIn ?? existing.openingStock ?? existing.quantityOnHand) + qty;
        return prev.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                quantityOnHand: existing.quantityOnHand + qty,
                totalStockIn: newTotalIn,
                lastStockCheck: new Date().toISOString().split('T')[0],
              }
            : item
        );
      } else {
        const newId = 'wh_' + Date.now();
        targetItemId = newId;
        openingQty = 0;
        const newItem: WarehouseItem = {
          id: newId,
          sku: prodSku,
          name: prodName,
          nameAr: prodName,
          category: 'TLB Main Inventory',
          aisle: 'Bay B-01',
          rack: 'Silo Yard 1',
          bay: 'Bulk Silo A',
          quantityOnHand: qty,
          openingStock: qty,
          totalStockIn: qty,
          totalStockOut: 0,
          reservedQuantity: 0,
          minimumThreshold: 100,
          unit: unit,
          unitCost: params.unitCost || 14,
          sellingPrice: params.sellingPrice || 18,
          barcode: params.barcode || `628100${Math.floor(1000000 + Math.random() * 9000000)}`,
          dnNumber: cleanDn,
          sourceSupplier: params.source || '',
          isTemperatureControlled: false,
          lastStockCheck: new Date().toISOString().split('T')[0],
        };
        return [newItem, ...prev];
      }
    });

    const movId = 'mov_in_' + Date.now();
    const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(16);

    const newMovement: WarehouseMovement = {
      id: movId,
      timestamp,
      date: timestamp,
      type: 'stock_in',
      movementType: 'IN',
      itemId: targetItemId,
      inventoryId: targetItemId,
      dnNumber: cleanDn,
      itemSku: prodSku,
      itemName: prodName,
      productName: prodName,
      quantity: qty,
      delta: qty,
      previousQuantityOnHand: openingQty,
      newQuantityOnHand: openingQty + qty,
      referenceDoc: cleanDn.startsWith('DN-') ? cleanDn : `DN-${cleanDn}`,
      driverId: driver?.id,
      driverName: driver?.name || params.driverName || '',
      vehiclePlate: vehicle?.plateNumber || params.vehiclePlate || '',
      barcode: params.barcode || '6281002938106',
      source: params.source || '',
      performedBy: actor,
      status: 'Available',
      unitPrice: params.unitCost || 14,
      totalAmount: (params.unitCost || 14) * qty,
      auditHash: hash,
      notes: params.notes || `Inward physical stock verified from Supplier TLB Slip ${cleanDn}. +${qty} ${unit} available.`,
    };

    setWarehouseMovements((prev) => [newMovement, ...prev]);

    // Master Audit Trail
    logMasterAudit({
      action: 'INVENTORY_STOCK_IN',
      recordRef: `${cleanDn} [Stock In +${qty} ${unit}]`,
      item: `${prodName} (SKU: ${prodSku})`,
      quantity: qty,
      oldValue: `Opening: ${openingQty} ${unit}`,
      newValue: `Available: ${openingQty + qty} ${unit}`,
      delta: `+${qty} ${unit}`,
      reason: `TLB Supplier Inward Physical Stock Verification for Slip ${cleanDn}`,
      warehouse: 'TLB Main Inventory (Bay B-01)',
      category: 'inventory',
      approvedBy: actor,
    });

    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    } catch {
      // ignore
    }

    showToast(
      'Stock In Recorded & Verified',
      `Slip #${cleanDn}: +${qty} ${unit} credited to TLB Main Inventory (Available: ${openingQty + qty} ${unit}).`,
      'success'
    );

    return movId;
  };

  const executeStockOutForSale = (params: {
    saleNumber?: string;
    customerId: string;
    customerName: string;
    customerVat?: string;
    inventoryId?: string;
    dnNumber?: string;
    itemSku?: string;
    itemName?: string;
    quantity: number;
    unitPrice?: number;
    paymentMethod?: PaymentMethod;
    driverId?: string;
    driverName?: string;
    vehiclePlate?: string;
    performedBy?: string;
    autoApprove?: boolean;
    notes?: string;
  }): { saleId: string; movementId: string; orderNumber: string } => {
    const qty = Number(params.quantity) || 0;
    const actor = params.performedBy || 'Admin / Sales Desk';
    const isAutoApproved = params.autoApprove !== false;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // Find Target Item
    let target = warehouseItems.find(
      (i) =>
        (params.inventoryId && i.id === params.inventoryId) ||
        (params.dnNumber && i.dnNumber === params.dnNumber) ||
        (params.itemSku && i.sku === params.itemSku)
    );

    if (!target) {
      target = warehouseItems.find((i) => i.dnNumber?.startsWith('DN-') || i.sku.includes('TLB')) || warehouseItems[0];
    }

    const openingStock = target ? target.quantityOnHand : 750;
    const remainingStock = Math.max(0, openingStock - qty);
    const unitPrice = params.unitPrice || target?.sellingPrice || 18;
    const subtotal = qty * unitPrice;
    const vatTotal = subtotal * 0.15;
    const grandTotal = subtotal + vatTotal;

    const nextSaleNum =
      params.saleNumber ||
      `SAL-${String(saleOrders.filter((s) => s.orderNumber?.startsWith('SAL-')).length + 1).padStart(3, '0')}`;
    const saleId = 'sal_' + Date.now();
    const movId = 'mov_out_' + Date.now();

    // 1. Update Warehouse Item (Deduct stock ONLY via movement record)
    if (target) {
      setWarehouseItems((prev) =>
        prev.map((item) =>
          item.id === target!.id
            ? {
                ...item,
                quantityOnHand: remainingStock,
                totalStockOut: (item.totalStockOut ?? 0) + qty,
                lastStockCheck: new Date().toISOString().split('T')[0],
              }
            : item
        )
      );
    }

    // 2. Create Movement Record
    const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(16);
    const newMovement: WarehouseMovement = {
      id: movId,
      timestamp,
      date: timestamp,
      type: 'stock_out_sale',
      movementType: 'OUT',
      itemId: target?.id,
      inventoryId: target?.id,
      dnNumber: target?.dnNumber || params.dnNumber || 'DN-001',
      saleId: nextSaleNum,
      itemSku: target?.sku || params.itemSku || 'TLB-MAIN-001',
      itemName: target?.name || params.itemName || 'TLB (Truck Load Bulk)',
      productName: 'TLB',
      quantity: qty,
      delta: -qty,
      previousQuantityOnHand: openingStock,
      newQuantityOnHand: remainingStock,
      referenceDoc: nextSaleNum,
      customerId: params.customerId,
      customerName: params.customerName,
      driverId: params.driverId || 'drv_1',
      driverName: params.driverName || '',
      vehiclePlate: params.vehiclePlate || '',
      barcode: target?.barcode || '6281002938106',
      source: target ? `Warehouse ${target.aisle || 'Bay B-01'}` : 'Central Yard',
      performedBy: actor,
      status: isAutoApproved ? 'Completed' : 'Pending Approval',
      unitPrice: unitPrice,
      totalAmount: subtotal,
      auditHash: hash,
      notes:
        params.notes ||
        `Customer Sale ${nextSaleNum}: ${qty} ${target?.unit || 'BAG'} sold to ${params.customerName}. Available stock: ${openingStock} → ${remainingStock}.`,
    };
    setWarehouseMovements((prev) => [newMovement, ...prev]);

    // 3. Create Sale Order
    const newSaleOrder: SaleOrder = {
      id: saleId,
      orderNumber: nextSaleNum,
      saleNumber: nextSaleNum,
      date: timestamp,
      customerId: params.customerId,
      customerName: params.customerName,
      customerVat: params.customerVat || '300998127300003',
      linkedDnNo: target?.dnNumber || params.dnNumber || 'DN-001',
      stockOutStatus: isAutoApproved ? 'executed' : 'pending',
      movementId: movId,
      approvalStatus: isAutoApproved ? 'approved' : 'pending',
      approvedBy: isAutoApproved ? actor : undefined,
      driverId: params.driverId,
      driverName: params.driverName,
      vehiclePlate: params.vehiclePlate,
      items: [
        {
          itemId: target?.id || 'wh_6',
          sku: target?.sku || 'TLB-MAIN-001',
          name: target?.name || 'TLB (Truck Load Bulk)',
          quantity: qty,
          unitPrice: unitPrice,
          discount: 0,
          vatRate: 0.15,
          totalWithVat: grandTotal,
        },
      ],
      subtotal,
      discountTotal: 0,
      vatTotal,
      grandTotal,
      paymentMethod: params.paymentMethod || 'credit_account',
      paymentStatus: 'paid',
      salePoint: 'Riyadh Sulay Terminal HQ',
      cashierName: actor,
      invoiceId: 'inv_tax_' + saleId,
      notes: params.notes || `Stock Out from batch ${target?.dnNumber || 'DN-001'} for ${params.customerName}.`,
    };
    setSaleOrders((prev) => [newSaleOrder, ...prev]);

    // 4. Auto-generate Official Tax Invoice with QR
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];
    const qrPayload = generateTaxInvoiceQrBase64(
      companySettings.companyName,
      companySettings.vatNumber,
      new Date().toISOString(),
      grandTotal,
      vatTotal
    );

    const autoInvoice: TaxInvoice = {
      id: 'inv_tax_' + saleId,
      invoiceNumber: 'INV-' + nextSaleNum,
      invoiceType: 'tax_invoice_b2b',
      issueDate: dateStr,
      issueTime: timeStr,
      sellerName: companySettings.companyName,
      sellerVatNumber: companySettings.vatNumber,
      sellerCrNumber: companySettings.crNumber,
      sellerAddress: companySettings.address + ', ' + companySettings.city,
      buyerName: params.customerName,
      buyerVatNumber: params.customerVat || '300998127300003',
      buyerAddress: 'Kingdom of Saudi Arabia',
      items: [
        {
          id: '1',
          description: target?.name || 'TLB (Truck Load Bulk)',
          quantity: qty,
          unitPrice: unitPrice,
          discount: 0,
          taxableAmount: subtotal,
          vatRate: 0.15,
          vatAmount: vatTotal,
          totalWithVat: grandTotal,
        },
      ],
      subtotal,
      discountTotal: 0,
      totalVat: vatTotal,
      grandTotal,
      currency: 'SAR',
      status: 'paid',
      qrPayload,
      paymentTerms: (params.paymentMethod || 'credit_account').toUpperCase(),
      dueDate: dateStr,
    };
    setTaxInvoices((prev) => [autoInvoice, ...prev]);

    // 5. Master Audit Trail for GM/CEO
    logMasterAudit({
      action: 'SALE_APPROVAL',
      recordRef: `${nextSaleNum} [DN #${target?.dnNumber || 'DN-001'}]`,
      customer: params.customerName,
      item: `${target?.name || 'TLB'} [Qty: ${qty} ${target?.unit || 'BAG'}]`,
      quantity: qty,
      oldValue: `Available: ${openingStock} ${target?.unit || 'BAG'}`,
      newValue: `Available: ${remainingStock} ${target?.unit || 'BAG'}`,
      delta: `-${qty} ${target?.unit || 'BAG'}`,
      reason: `Customer Sale ${nextSaleNum} approved & stock out dispatched to ${params.customerName} via ${params.driverName || 'driver'} (${params.vehiclePlate || 'truck'})`,
      warehouse: target ? `Warehouse (${target.aisle || 'Bay B-01'})` : 'TLB Main Inventory',
      category: 'sales',
      approvedBy: actor,
    });

    // 6. Record Outbound Delivery Note in Available Warehouse Items Table (OUT)
    const outboundDnRecord: InboundDeliveryNote = {
      id: 'out_dn_' + Date.now(),
      dnNumber: `OUT-${nextSaleNum}`,
      soNumber: nextSaleNum,
      shippingRef: `${qty}`,
      printDate: dateStr,
      orderDate: dateStr,
      shipFrom: target ? `Warehouse (${target.aisle || 'Bay B-01'})` : 'Central Logistics Hub',
      salesman: actor,
      companyName: params.customerName,
      customerNumber: params.customerId || '',
      customerId: params.customerId,
      itemNumber: target?.sku || params.itemSku || 'TLB-MAIN-001',
      itemName: target?.name || params.itemName || 'TLB (Truck Load Bulk)',
      productDescription: `${target?.name || params.itemName || 'TLB'} – Customer Stock Out (${params.customerName})`,
      uom: target?.unit || 'BAG',
      quantity: qty,
      inOutType: 'OUT',
      status: 'verified',
      warehouseLocation: target?.aisle || 'Bay B-01 / Dispatched',
      driverName: params.driverName || '',
      vehiclePlate: params.vehiclePlate || '',
      importedAt: timestamp,
      notes: params.notes || `Stock Out customer sale ${nextSaleNum} for ${params.customerName}.`,
    };
    setInboundDeliveryNotes((prev) => [outboundDnRecord, ...prev]);

    try {
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.7 } });
    } catch {
      // ignore
    }

    showToast(
      'Sale Approved & Stock Out Recorded',
      `Sale #${nextSaleNum}: -${qty} ${target?.unit || 'BAG'} issued to ${params.customerName}. Available stock: ${openingStock} → ${remainingStock}.`,
      'success'
    );

    return { saleId, movementId: movId, orderNumber: nextSaleNum };
  };

  const approveSaleOrder = (saleId: string, approvedBy?: string) => {
    const actor = approvedBy || 'Admin / Operations Manager';
    setSaleOrders((prev) =>
      prev.map((s) => {
        if (s.id === saleId) {
          return {
            ...s,
            approvalStatus: 'approved',
            approvedBy: actor,
            stockOutStatus: 'executed',
          };
        }
        return s;
      })
    );

    showToast('Sale Order Approved', `Sale ${saleId} marked approved and executed.`, 'success');
  };

  // IN-TRANSIT ROUTE SHIFT FLOW (PRESERVING EXACT ORIGINAL DN & DRIVER)
  const executeRouteShift = (params: {
    tripId: string;
    customerId: string;
    customerName: string;
    customerNameAr?: string;
    customerPhone?: string;
    customerVat?: string;
    customerCr?: string;
    destinationAddress: string;
    destinationCity: string;
    destinationLat?: number;
    destinationLng?: number;
    shiftedQuantity: number;
    unitPrice?: number;
    reason: string;
    notes?: string;
    shiftedBy?: string;
  }): { success: boolean; routeShiftId?: string; error?: string } => {
    const trip = trips.find((t) => t.id === params.tripId);
    if (!trip) {
      showToast('Route Shift Failed', 'Trip record not found.', 'error');
      return { success: false, error: 'Trip not found' };
    }

    const originalQty = trip.originalQuantity || trip.quantity || 750;
    const currentDirectSold = trip.directSaleQuantity || 0;
    const remainingOnTruck = originalQty - currentDirectSold;
    const shiftQty = Number(params.shiftedQuantity) || 0;

    if (shiftQty <= 0) {
      showToast('Invalid Quantity', 'Shifted quantity must be greater than zero.', 'error');
      return { success: false, error: 'Shifted quantity must be > 0' };
    }

    if (shiftQty > remainingOnTruck) {
      showToast(
        'Quantity Exceeds Load',
        `Cannot shift ${shiftQty}. Only ${remainingOnTruck} units remain loaded on truck.`,
        'error'
      );
      return { success: false, error: 'Insufficient loaded quantity' };
    }

    const newDirectSaleTotal = currentDirectSold + shiftQty;
    const newRemainingWarehouseQty = originalQty - newDirectSaleTotal;
    const shiftId = 'RS-' + String(Date.now()).slice(-4);
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const actor = params.shiftedBy || 'Dispatcher / Operations';
    const originalDn = trip.dnNumber || trip.deliveryNote.dnNumber || 'DN-001';

    const unitPrice = params.unitPrice || 24.5;
    const totalSaleAmount = shiftQty * unitPrice;
    const hash =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(16);

    const newShiftRecord: RouteShiftRecord = {
      id: shiftId,
      timestamp,
      dnNumber: originalDn,
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      driverId: trip.driverId,
      driverName: trip.driverName,
      vehiclePlate: trip.vehiclePlate,
      shiftedBy: actor,
      shiftedByRole: 'dispatcher',
      reason: params.reason || 'Customer urgent order received while in transit',
      originalQuantity: originalQty,
      shiftedQuantity: shiftQty,
      remainingWarehouseQuantity: newRemainingWarehouseQty,
      originalDestination: trip.destination,
      shiftedCustomer: {
        id: params.customerId,
        name: params.customerName,
        nameAr: params.customerNameAr,
        phone: params.customerPhone,
        address: params.destinationAddress,
        city: params.destinationCity,
        vatNumber: params.customerVat || '300881928300003',
        crNumber: params.customerCr || '1010882736',
      },
      shiftedDestination: {
        id: 'loc_shift_' + shiftId,
        name: `${params.customerName} Drop Site`,
        nameAr: params.customerNameAr || params.customerName,
        city: params.destinationCity || '',
        lat: params.destinationLat || 24.65,
        lng: params.destinationLng || 46.8,
        address: params.destinationAddress || `${params.destinationCity} Customer Site`,
        category: 'customer',
        isCustom: true,
      },
      shiftStatus: 'initiated',
      unitPrice,
      totalSaleAmount,
      auditHash: hash,
    };

    // 1. Update Trip Record (Preserve same DN, driver, and vehicle!)
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === trip.id) {
          const prevShifts = t.routeShifts || [];
          return {
            ...t,
            hasRouteShift: true,
            originalQuantity: originalQty,
            directSaleQuantity: newDirectSaleTotal,
            remainingInwardQuantity: newRemainingWarehouseQty,
            routeShifts: [...prevShifts, newShiftRecord],
            routeShiftStage: 'shifted_in_transit',
            waypoints: [newShiftRecord.shiftedDestination, ...(t.waypoints || [])],
            notes:
              (t.notes ? t.notes + ' | ' : '') +
              `[ROUTE SHIFT #${shiftId}]: Diverting ${shiftQty} ${t.uom || 'BAG'} to ${params.customerName}. Remaining for Warehouse: ${newRemainingWarehouseQty}. DN: ${originalDn}`,
          };
        }
        return t;
      })
    );

    // 2. Update matching Inbound Delivery Note if present
    setInboundDeliveryNotes((prev) =>
      prev.map((dn) => {
        if (dn.dnNumber === originalDn || dn.tripId === trip.id) {
          const prevShifts = dn.routeShifts || [];
          return {
            ...dn,
            hasRouteShift: true,
            originalQuantity: originalQty,
            directSaleQuantity: newDirectSaleTotal,
            remainingInwardQuantity: newRemainingWarehouseQty,
            routeShifts: [...prevShifts, newShiftRecord],
            routeShiftStage: 'shifted_in_transit',
          };
        }
        return dn;
      })
    );

    // 3. Log Immutable GM/CEO Master Audit Record
    logMasterAudit({
      action: 'ROUTE_SHIFT_INITIATED',
      recordRef: `${originalDn} [Shift #${shiftId}]`,
      customer: params.customerName,
      item: `${trip.itemName || 'TLB'} (Original: ${originalQty} → Diverted: ${shiftQty})`,
      quantity: shiftQty,
      oldValue: `Route: ${trip.origin.city} → ${trip.destination.city} (${originalQty} ${trip.uom || 'BAG'})`,
      newValue: `Split Route: ${shiftQty} to ${params.customerName} + ${newRemainingWarehouseQty} to Warehouse`,
      delta: `Route Shift: ${shiftQty} ${trip.uom || 'BAG'}`,
      reason: `In-transit route shift initiated: ${params.reason}. Original DN ${originalDn} and Driver ${trip.driverName} preserved intact.`,
      category: 'dispatch',
      approvedBy: actor,
    });

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      'Route Shift Recorded',
      `DN ${originalDn}: ${shiftQty} units diverted to ${params.customerName}. Remaining ${newRemainingWarehouseQty} units destined for warehouse inward.`,
      'success'
    );

    return { success: true, routeShiftId: shiftId };
  };

  const shiftRouteToCustomer = (params: {
    tripId: string;
    previousCustomerId: string;
    previousCustomerName: string;
    newCustomerId: string;
    newCustomerName: string;
    newCustomerAddress?: string;
    newCustomerCity?: string;
    newCustomerPhone?: string;
    newCustomerVat?: string;
    newCustomerCr?: string;
    newDriverId?: string;
    newDriverName?: string;
    newVehicleId?: string;
    newVehiclePlate?: string;
    reason: string;
    notes?: string;
    effectiveDateTime: string;
    shiftedBy?: string;
  }): { success: boolean; shiftId?: string; error?: string } => {
    const trip = trips.find((t) => t.id === params.tripId);
    if (!trip) {
      showToast('Trip Not Found', 'Unable to locate route for customer shift.', 'error');
      return { success: false, error: 'Trip not found' };
    }

    const shiftId = 'CSH-' + Math.floor(1000 + Math.random() * 9000);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const actor = params.shiftedBy || users.find((u) => u.role === activeRole)?.name || 'Dispatcher Team';
    const effectiveTime = params.effectiveDateTime || nowStr;

    // Driver & vehicle details
    const targetDriver = params.newDriverId ? drivers.find((d) => d.id === params.newDriverId) : undefined;
    const finalDriverId = params.newDriverId || trip.driverId;
    const finalDriverName = targetDriver?.name || params.newDriverName || trip.driverName;
    const finalDriverPhone = targetDriver?.phone || trip.driverPhone || '—';

    const targetVehicle = params.newVehicleId ? vehicles.find((v) => v.id === params.newVehicleId) : undefined;
    const finalVehicleId = params.newVehicleId || trip.vehicleId;
    const finalVehiclePlate = targetVehicle?.plateNumber || params.newVehiclePlate || trip.vehiclePlate;

    const originalDn = trip.dnNumber || trip.deliveryNote?.dnNumber || 'DN-001';

    // New Destination Point
    const newDestination: LocationPoint = {
      id: 'loc_cust_shift_' + Date.now(),
      name: `${params.newCustomerName} Site`,
      nameAr: params.newCustomerName,
      city: params.newCustomerCity || trip.destination.city || '',
      lat: trip.destination.lat || 24.7136,
      lng: trip.destination.lng || 46.6753,
      address: params.newCustomerAddress || `${params.newCustomerCity || ''} Site`,
      category: 'customer',
      isCustom: true,
      phone: params.newCustomerPhone || '',
    };

    const shiftEntry: CustomerShiftHistoryEntry = {
      id: shiftId,
      timestamp: nowStr,
      effectiveDateTime: effectiveTime,
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      dnNumber: originalDn,
      previousCustomerId: params.previousCustomerId || trip.customerId || 'cust_prev',
      previousCustomerName: params.previousCustomerName || trip.customerName || trip.companyName || 'Previous Customer',
      newCustomerId: params.newCustomerId,
      newCustomerName: params.newCustomerName,
      previousDriverId: trip.driverId,
      previousDriverName: trip.driverName,
      newDriverId: finalDriverId,
      newDriverName: finalDriverName,
      previousVehiclePlate: trip.vehiclePlate,
      newVehiclePlate: finalVehiclePlate,
      reason: params.reason,
      notes: params.notes,
      shiftedBy: actor,
    };

    // 1. Update Trip: Reassign to new customer, update driver/truck if needed, add shift history
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === trip.id) {
          const prevHistory = t.customerShiftHistory || [];
          return {
            ...t,
            customerId: params.newCustomerId,
            customerName: params.newCustomerName,
            companyName: params.newCustomerName,
            destination: newDestination,
            driverId: finalDriverId,
            driverName: finalDriverName,
            driverPhone: finalDriverPhone,
            vehicleId: finalVehicleId,
            vehiclePlate: finalVehiclePlate,
            isCustomerShifted: true,
            previousCustomerId: params.previousCustomerId || trip.customerId,
            previousCustomerName: params.previousCustomerName || trip.customerName || trip.companyName,
            customerShiftNotification: `Route shifted to ${params.newCustomerName} from ${params.previousCustomerName} on ${effectiveTime}. Reason: ${params.reason}`,
            customerShiftHistory: [shiftEntry, ...prevHistory],
            deliveryNote: {
              ...t.deliveryNote,
              receiverName: params.newCustomerName,
              receiverAddress: params.newCustomerAddress || newDestination.address,
              receiverContact: params.newCustomerPhone || finalDriverPhone,
            },
            notes: (t.notes ? t.notes + ' | ' : '') + `[ROUTE SHIFTED TO CUSTOMER]: Moved to ${params.newCustomerName} on ${effectiveTime}. Reason: ${params.reason}`,
          };
        }
        return t;
      })
    );

    // 2. Update Inbound Delivery Notes if connected
    setInboundDeliveryNotes((prev) =>
      prev.map((inb) => {
        if (inb.dnNumber === originalDn || inb.tripId === trip.id) {
          return {
            ...inb,
            customerId: params.newCustomerId,
            companyName: params.newCustomerName,
            driverId: finalDriverId,
            driverName: finalDriverName,
            vehiclePlate: finalVehiclePlate,
            dropLocation: newDestination.name || newDestination.city,
            notes: (inb.notes ? inb.notes + ' | ' : '') + `[Shifted to ${params.newCustomerName} on ${effectiveTime}]`,
          };
        }
        return inb;
      })
    );

    // 3. Update customer load statistics and history
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === params.newCustomerId || c.name.toLowerCase() === params.newCustomerName.toLowerCase()) {
          const prevHistory = c.history || [];
          return {
            ...c,
            totalLoads: (c.totalLoads || 0) + 1,
            history: [
              {
                id: 'hist_shift_' + Date.now(),
                date: effectiveTime.split(' ')[0],
                action: 'Route Shifted to Customer',
                amount: trip.price || 4500,
                description: `Shipment #${trip.tripNumber} (DN #${originalDn}) shifted from ${params.previousCustomerName}. Reason: ${params.reason}`,
                performedBy: actor,
              },
              ...prevHistory,
            ],
          };
        }
        if (c.id === params.previousCustomerId || c.name.toLowerCase() === params.previousCustomerName.toLowerCase()) {
          const prevHistory = c.history || [];
          return {
            ...c,
            totalLoads: Math.max(0, (c.totalLoads || 1) - 1),
            history: [
              {
                id: 'hist_shift_out_' + Date.now(),
                date: effectiveTime.split(' ')[0],
                action: 'Route Shifted to New Customer',
                amount: trip.price || 4500,
                description: `Shipment #${trip.tripNumber} (DN #${originalDn}) shifted to ${params.newCustomerName}. Reason: ${params.reason}`,
                performedBy: actor,
              },
              ...prevHistory,
            ],
          };
        }
        return c;
      })
    );

    // 4. Master Audit Logging (Immutable tamper-evident record)
    const auditId = logMasterAudit({
      action: 'ROUTE_SHIFTED_CUSTOMER',
      recordRef: `${trip.tripNumber} [DN #${originalDn}]`,
      customer: `${params.previousCustomerName} → ${params.newCustomerName}`,
      item: `${trip.itemName || 'Cargo'} [${trip.quantity || 1} ${trip.uom || 'Unit'}]`,
      oldValue: `Customer: ${params.previousCustomerName} | Driver: ${trip.driverName} | Truck: ${trip.vehiclePlate}`,
      newValue: `Customer: ${params.newCustomerName} | Driver: ${finalDriverName} | Truck: ${finalVehiclePlate}`,
      delta: `Route Reassigned: ${params.previousCustomerName} → ${params.newCustomerName} (Effective: ${effectiveTime})`,
      reason: `Route Shift: ${params.reason}. Notes: ${params.notes || 'None'}. Performed by ${actor}`,
      approvedBy: `${actor} (${activeRole.toUpperCase()})`,
      approvalDate: nowStr,
      category: 'dispatch',
      warehouse: newDestination.city,
    });

    shiftEntry.auditId = auditId;

    try {
      confetti({ particleCount: 65, spread: 70, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      'Route Shifted to Customer',
      `Shipment #${trip.tripNumber} (DN #${originalDn}) successfully reassigned from ${params.previousCustomerName} to ${params.newCustomerName}. Master Audit #${auditId} logged.`,
      'success'
    );

    return { success: true, shiftId };
  };

  const confirmRouteShiftDelivery = (params: {
    tripId: string;
    routeShiftId: string;
    podImageUrl?: string;
    podBarcodeScanned?: string;
    receiverNotes?: string;
    receiverSignature?: string;
    confirmedBy?: string;
  }): { success: boolean; invoiceId?: string; error?: string } => {
    const trip = trips.find((t) => t.id === params.tripId);
    if (!trip) {
      showToast('Delivery Confirmation Failed', 'Trip not found.', 'error');
      return { success: false, error: 'Trip not found' };
    }

    const shiftRecord = (trip.routeShifts || []).find((s) => s.id === params.routeShiftId);
    if (!shiftRecord) {
      showToast('Route Shift Record Not Found', 'Could not locate shift record.', 'error');
      return { success: false, error: 'Route shift record not found' };
    }

    const originalDn = trip.dnNumber || trip.deliveryNote.dnNumber || 'DN-001';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];
    const actor = params.confirmedBy || `Driver ${trip.driverName}`;

    const deliveredQty = shiftRecord.shiftedQuantity;
    const unitPrice = shiftRecord.unitPrice || 24.5;
    const subtotal = deliveredQty * unitPrice;
    const vatAmount = subtotal * 0.15;
    const grandTotal = subtotal + vatAmount;

    const invoiceId = 'inv_rs_' + shiftRecord.id;
    const movId = 'mov_rs_' + Date.now();
    const hash =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(16);

    // 1. Update Route Shift Record in Trip
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === trip.id) {
          const updatedShifts = (t.routeShifts || []).map((s) => {
            if (s.id === shiftRecord.id) {
              return {
                ...s,
                shiftStatus: 'customer_delivered' as const,
                // Proof of delivery is whatever the driver actually captured — never a stand-in.
                podImageUrl: params.podImageUrl,
                podSignedAt: timestamp,
                podBarcodeScanned: params.podBarcodeScanned || originalDn,
                driverConfirmationNotes: params.receiverNotes,
              };
            }
            return s;
          });
          return {
            ...t,
            routeShifts: updatedShifts,
            routeShiftStage: 'partial_delivered',
            notes:
              (t.notes ? t.notes + ' | ' : '') +
              `[DELIVERED ON ROUTE]: ${deliveredQty} bags handed to ${shiftRecord.shiftedCustomer.name}. Driver continuing to warehouse with remaining ${t.remainingInwardQuantity} units.`,
          };
        }
        return t;
      })
    );

    // 2. Create Warehouse Movement Record (Direct Route Sale deduction)
    const newMovement: WarehouseMovement = {
      id: movId,
      timestamp,
      date: timestamp,
      type: 'route_shift_sale',
      movementType: 'OUT',
      dnNumber: originalDn,
      routeShiftId: shiftRecord.id,
      itemSku: trip.reservedItemSku || 'TLB-MAIN-001',
      itemName: trip.itemName || 'TLB (Truck Load Bulk)',
      productName: 'TLB',
      quantity: deliveredQty,
      delta: -deliveredQty,
      referenceDoc: `${originalDn} [Route Shift #${shiftRecord.id}]`,
      customerId: shiftRecord.shiftedCustomer.id,
      customerName: shiftRecord.shiftedCustomer.name,
      driverId: trip.driverId,
      driverName: trip.driverName,
      vehiclePlate: trip.vehiclePlate,
      barcode: originalDn,
      source: `Direct In-Transit Delivery (${trip.vehiclePlate})`,
      performedBy: actor,
      status: 'Delivered & POD Verified',
      unitPrice,
      totalAmount: subtotal,
      auditHash: hash,
      notes: `Direct route sale of ${deliveredQty} ${trip.uom || 'BAG'} to ${shiftRecord.shiftedCustomer.name} on DN ${originalDn}. Verified by ${actor}. Remaining ${trip.remainingInwardQuantity} units in transit to warehouse.`,
    };
    setWarehouseMovements((prev) => [newMovement, ...prev]);

    // 3. Auto-generate Official Tax Invoice with QR Code
    const qrPayload = generateTaxInvoiceQrBase64(
      companySettings.companyName,
      companySettings.vatNumber,
      new Date().toISOString(),
      grandTotal,
      vatAmount
    );

    const autoTaxInvoice: TaxInvoice = {
      id: invoiceId,
      invoiceNumber: 'INV-RS-' + shiftRecord.id,
      invoiceType: 'tax_invoice_b2b',
      issueDate: dateStr,
      issueTime: timeStr,
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      sellerName: companySettings.companyName,
      sellerVatNumber: companySettings.vatNumber,
      sellerCrNumber: companySettings.crNumber,
      sellerAddress: companySettings.address + ', ' + companySettings.city,
      buyerName: shiftRecord.shiftedCustomer.name,
      buyerVatNumber: shiftRecord.shiftedCustomer.vatNumber || '300881928300003',
      buyerCrNumber: shiftRecord.shiftedCustomer.crNumber || '1010882736',
      buyerAddress: shiftRecord.shiftedCustomer.address || 'Kingdom of Saudi Arabia',
      buyerPhone: shiftRecord.shiftedCustomer.phone || '',
      items: [
        {
          id: 'item_1',
          description: `Direct Route Delivery: ${trip.itemName || 'TLB'} (${deliveredQty} ${trip.uom || 'BAG'} on DN ${originalDn})`,
          quantity: deliveredQty,
          unitPrice,
          discount: 0,
          taxableAmount: subtotal,
          vatRate: 0.15,
          vatAmount,
          totalWithVat: grandTotal,
        },
      ],
      subtotal,
      discountTotal: 0,
      totalVat: vatAmount,
      grandTotal,
      currency: 'SAR',
      status: 'paid',
      qrPayload,
      paymentTerms: 'NET 30 / DIRECT ROUTE SALE',
      dueDate: dateStr,
    };
    setTaxInvoices((prev) => [autoTaxInvoice, ...prev]);

    // 4. Log Master Audit
    logMasterAudit({
      action: 'ROUTE_SHIFT_DELIVERED',
      recordRef: `${originalDn} [${shiftRecord.id}]`,
      customer: shiftRecord.shiftedCustomer.name,
      item: `${trip.itemName || 'TLB'} (Delivered: ${deliveredQty} ${trip.uom || 'BAG'})`,
      quantity: deliveredQty,
      oldValue: `In Transit to ${shiftRecord.shiftedCustomer.name}`,
      newValue: `Delivered & POD Cleared (Remaining: ${trip.remainingInwardQuantity} to Warehouse)`,
      delta: `-${deliveredQty} Units Handed Over`,
      reason: `Driver ${trip.driverName} confirmed customer delivery for DN ${originalDn}. Official Tax Invoice INV-RS-${shiftRecord.id} generated.`,
      category: 'sales',
      approvedBy: actor,
    });

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      'Delivery Confirmed & Tax Invoice Issued',
      `Delivered ${deliveredQty} bags to ${shiftRecord.shiftedCustomer.name}. Driver continuing with ${trip.remainingInwardQuantity} bags to warehouse.`,
      'success'
    );

    return { success: true, invoiceId };
  };

  const inwardRouteShiftRemainingStock = (params: {
    tripId: string;
    warehouseId?: string;
    warehouseLocation?: string;
    receivedBy?: string;
    notes?: string;
  }): { success: boolean; movementId?: string; inwardQty?: number; error?: string } => {
    const trip = trips.find((t) => t.id === params.tripId);
    if (!trip) {
      showToast('Inward Failed', 'Trip record not found.', 'error');
      return { success: false, error: 'Trip not found' };
    }

    const originalDn = trip.dnNumber || trip.deliveryNote.dnNumber || 'DN-001';
    const originalQty = trip.originalQuantity || trip.quantity || 750;
    const directSold = trip.directSaleQuantity || 0;
    const remainingToInward = trip.remainingInwardQuantity ?? (originalQty - directSold);

    if (remainingToInward <= 0) {
      showToast('Zero Remaining Stock', 'All stock from this delivery note has already been delivered.', 'info');
      return { success: false, error: 'No remaining quantity to inward' };
    }

    const actor = params.receivedBy || 'Admin / Warehouse In-Charge';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const movId = 'mov_in_rs_' + Date.now();

    // 1. Locate Warehouse Item (e.g. TLB Main Inventory / Gypsum Powder)
    let target = warehouseItems.find(
      (i) =>
        (params.warehouseId && i.id === params.warehouseId) ||
        (i.dnNumber && i.dnNumber === originalDn) ||
        i.sku.includes('TLB') ||
        i.name.includes('TLB')
    );

    if (!target) {
      target = warehouseItems[0];
    }

    const openingStock = target ? target.quantityOnHand : 0;
    const closingStock = openingStock + remainingToInward;

    // 2. Update Warehouse Item QuantityOnHand (Only increase by the EXACT remaining balance: e.g. +450)
    if (target) {
      setWarehouseItems((prev) =>
        prev.map((item) =>
          item.id === target!.id
            ? {
                ...item,
                quantityOnHand: closingStock,
                totalStockIn: (item.totalStockIn ?? 0) + remainingToInward,
                lastStockCheck: new Date().toISOString().split('T')[0],
              }
            : item
        )
      );
    }

    // 3. Create Warehouse Movement Record (Stock In)
    const hash =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(16);

    const newMovement: WarehouseMovement = {
      id: movId,
      timestamp,
      date: timestamp,
      type: 'stock_in',
      movementType: 'IN',
      itemId: target?.id,
      inventoryId: target?.id,
      dnNumber: originalDn,
      itemSku: target?.sku || trip.reservedItemSku || 'TLB-MAIN-001',
      itemName: target?.name || trip.itemName || 'TLB (Truck Load Bulk)',
      productName: 'TLB',
      quantity: remainingToInward,
      delta: remainingToInward,
      previousQuantityOnHand: openingStock,
      newQuantityOnHand: closingStock,
      referenceDoc: `${originalDn} [Warehouse Inward Balance]`,
      driverId: trip.driverId,
      driverName: trip.driverName,
      vehiclePlate: trip.vehiclePlate,
      barcode: target?.barcode || originalDn,
      source: `${trip.origin.name || '—'} → Inward`,
      performedBy: actor,
      status: 'Available',
      auditHash: hash,
      notes: `Warehouse inward of remaining balance (${remainingToInward} ${trip.uom || 'BAG'}) from ${originalDn}. (Original: ${originalQty}, Direct Route Sale: ${directSold}). Reconciled with zero remaining.`,
    };
    setWarehouseMovements((prev) => [newMovement, ...prev]);

    // 4. Update Trip to Delivered / Completed
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === trip.id) {
          const completedShifts = (t.routeShifts || []).map((s) => ({
            ...s,
            shiftStatus: 'completed' as const,
            warehouseInwardQty: remainingToInward,
            warehouseInwardedAt: timestamp,
            warehouseInwardedBy: actor,
          }));
          return {
            ...t,
            status: 'delivered',
            tripStep: 'delivered',
            routeShiftStage: 'inward_completed',
            routeShifts: completedShifts,
            remainingInwardQuantity: 0,
            inwardReceivedAt: timestamp,
            inwardReceivedBy: actor,
            inwardNotes:
              params.notes ||
              `Inwarded ${remainingToInward} bags at warehouse. Total ${originalQty} fully reconciled.`,
          };
        }
        return t;
      })
    );

    // 5. Update Inbound Delivery Note
    setInboundDeliveryNotes((prev) =>
      prev.map((dn) => {
        if (dn.dnNumber === originalDn || dn.tripId === trip.id) {
          return {
            ...dn,
            status: 'verified',
            tripStep: 'delivered',
            routeShiftStage: 'inward_completed',
            receiverSignature: actor,
            notes: `Inwarded ${remainingToInward} bags. (Direct sale: ${directSold}). Total ${originalQty} accounted for.`,
          };
        }
        return dn;
      })
    );

    // 6. Master Audit Record
    logMasterAudit({
      action: 'ROUTE_SHIFT_INWARDED',
      recordRef: `${originalDn} [Inward Balance]`,
      item: `${trip.itemName || 'TLB'} (Inward: +${remainingToInward} ${trip.uom || 'BAG'})`,
      quantity: remainingToInward,
      oldValue: `Loaded: ${originalQty} (Direct Sold: ${directSold}, Remaining: ${remainingToInward})`,
      newValue: `Available Stock: ${openingStock} → ${closingStock}. Remaining on Road: 0`,
      delta: `+${remainingToInward} Inwarded`,
      reason: `Final warehouse inward completed for DN ${originalDn}. Total ${originalQty} = Direct Route Sale (${directSold}) + Warehouse Inward (${remainingToInward}). Ledger fully reconciled.`,
      category: 'inventory',
      approvedBy: actor,
    });

    try {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      'Warehouse Inward Completed',
      `DN ${originalDn}: +${remainingToInward} bags added to warehouse inventory. Total ${originalQty} fully reconciled!`,
      'success'
    );

    return { success: true, movementId: movId, inwardQty: remainingToInward };
  };

  // INBOUND DELIVERY NOTE WORKFLOW INTEGRATION (TLB PDF Intake & Inventory Engine)
  const addInboundDeliveryNote = (noteData: Omit<InboundDeliveryNote, 'id' | 'importedAt'>) => {
    const cleanDnNumber = (noteData.dnNumber || '').trim();
    const cleanSoNumber = (noteData.soNumber || '').trim();
    const cleanCompany = (noteData.companyName || '').trim();
    const cleanCustomerNo = (noteData.customerNumber || '').trim();
    const cleanItemSku = (noteData.itemNumber || 'TLB-MAIN-001').trim();
    const quantity = Number(noteData.quantity) || 750;

    // Check if this TLB record already exists (by soNumber, dnNumber, or itemSku)
    const existingDn = inboundDeliveryNotes.find(
      (dn) =>
        (cleanSoNumber && (dn.soNumber === cleanSoNumber || dn.dnNumber === cleanSoNumber)) ||
        (cleanDnNumber && (dn.dnNumber === cleanDnNumber || dn.soNumber === cleanDnNumber)) ||
        (cleanDnNumber && dn.id.includes(cleanDnNumber))
    );

    const isDuplicateTlb = Boolean(existingDn);
    const dnId = existingDn ? existingDn.id : 'inb_dn_' + (cleanDnNumber || cleanSoNumber || Date.now());

    // 1. Check if Company exists in Customers; if not, automatically add it!
    let companyId = '';
    let isNewCompany = false;

    const existingCust = customers.find(
      (c) =>
        (cleanCustomerNo && c.customerNumber === cleanCustomerNo) ||
        (cleanCompany && (c.name.toLowerCase() === cleanCompany.toLowerCase() || (c.nameAr && c.nameAr.toLowerCase() === cleanCompany.toLowerCase())))
    );

    if (existingCust) {
      companyId = existingCust.id;
    } else {
      isNewCompany = true;
      companyId = 'cust_' + Date.now();
      const newCust: Customer = {
        id: companyId,
        customerNumber: cleanCustomerNo || `1100${Math.floor(100 + Math.random() * 900)}`,
        name: cleanCompany || 'Inbound Partner Company',
        nameAr: cleanCompany,
        contactPerson: noteData.salesman || 'Procurement In-Charge',
        phone: '+966 50 ' + Math.floor(1000000 + Math.random() * 9000000),
        email: 'info@' + (cleanCompany ? cleanCompany.replace(/\s+/g, '').toLowerCase().substring(0, 10) : 'partner') + '.sa',
        address: noteData.shipFrom || 'Kingdom of Saudi Arabia',
        city: 'Riyadh',
        crNumber: '1010' + Math.floor(100000 + Math.random() * 900000),
        vatNumber: '300' + Math.floor(100000000000 + Math.random() * 900000000000),
        creditLimit: 500000,
        outstandingBalance: 0,
        paymentTerms: 'Net 30',
        totalTrips: 1,
        totalSpent: quantity * 18,
        status: 'active',
      };
      setCustomers((prev) => [newCust, ...prev]);
    }

    const targetDriver = drivers.find((d) => d.id === 'drv_1') || drivers[0];
    const targetVehicle = vehicles.find((v) => v.id === 'veh_1') || vehicles[0];

    // 2. Handle Inbound Delivery Note (Update existing or insert new without duplicates)
    let tripId = existingDn?.tripId || '';

    if (existingDn) {
      // Update existing record without creating a duplicate
      setInboundDeliveryNotes((prev) =>
        prev.map((dn) =>
          dn.id === existingDn.id
            ? {
                ...dn,
                attachedPdfName: noteData.attachedPdfName || dn.attachedPdfName,
                attachedPdfDataUrl: noteData.attachedPdfDataUrl || dn.attachedPdfDataUrl,
                notes: noteData.notes || dn.notes,
                status: 'verified',
                confidenceScore: noteData.confidenceScore || dn.confidenceScore || 99,
              }
            : dn
        )
      );
    } else {
      // New TLB: Create Trip and Record
      tripId = 'trp_' + Date.now();
      const tripNum = `TRP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newTrip: Trip = {
        id: tripId,
        tripNumber: tripNum,
        inboundDnId: dnId,
        dnNumber: noteData.dnNumber,
        companyName: cleanCompany,
        customerNumber: cleanCustomerNo,
        itemName: noteData.itemName || 'Gypsum Powder',
        itemNumber: noteData.itemNumber || '1290000001',
        quantity: quantity,
        uom: noteData.uom || 'BAG',
        origin: {
          id: 'loc_origin_' + Date.now(),
          name: noteData.shipFrom || '',
          nameAr: noteData.shipFrom || 'مصنع الخياط للجبس',
          city: 'Rabigh / Western Corridor',
          lat: 22.8012,
          lng: 39.0145,
          address: noteData.shipFrom || '',
        },
        destination: {
          id: 'loc_dest_' + Date.now(),
          name: cleanCompany + ' Project Site',
          nameAr: cleanCompany + ' موقع المشروع',
          city: 'Riyadh',
          lat: 24.6408,
          lng: 46.8225,
          address: 'Riyadh Exit 18, Construction Area',
        },
        driverId: targetDriver ? targetDriver.id : 'drv_1',
        driverName: targetDriver ? targetDriver.name : (noteData.driverName || ''),
        driverPhone: targetDriver ? targetDriver.phone : '+966 50 123 4567',
        vehicleId: targetVehicle ? targetVehicle.id : 'veh_1',
        vehiclePlate: targetVehicle ? targetVehicle.plateNumber : (noteData.vehiclePlate || ''),
        vehicleType: 'trailer_30t',
        customerId: companyId,
        customerName: cleanCompany,
        status: 'loading',
        tripStep: 'loading',
        slipStatus: 'not_submitted',
        isOutsideCompanyLoad: false,
        cargoType: 'industrial',
        deliveryNote: {
          dnNumber: noteData.dnNumber,
          issueDate: noteData.orderDate || new Date().toISOString().split('T')[0],
          expectedDelivery: new Date().toISOString().split('T')[0] + ' 19:30',
          senderName: noteData.shipFrom || '',
          senderAddress: noteData.shipFrom || 'Plant Sector 3',
          senderContact: '+966 12 422 9900',
          receiverName: cleanCompany,
          receiverAddress: 'Riyadh Exit 18 Project Site',
          receiverContact: '+966 50 110 0187',
          receiverVatNumber: '300998127300003',
          items: [
            {
              id: 'itm_' + Date.now(),
              sku: noteData.itemNumber || '1290000001',
              name: noteData.productDescription || noteData.itemName || 'Gypsum Powder BAG – Regular 40 kg',
              quantity: quantity,
              unit: noteData.uom || 'BAG',
              weightKg: quantity * 40,
              volumeCbm: 42,
              unitPrice: 18,
            }
          ],
          totalWeightKg: quantity * 40,
          totalVolumeCbm: 42,
          packagesCount: quantity,
          specialInstructions: `Direct Inbound DN #${noteData.dnNumber} from ${noteData.shipFrom}. Verified ${quantity} ${noteData.uom || 'BAG'}.`,
          slipStatus: 'not_submitted',
        },
        departureTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
        estimatedArrivalTime: new Date().toISOString().split('T')[0] + ' 19:30',
        price: 4800,
        cost: 2100,
        progressPercent: 15,
        currentLat: 22.8012,
        currentLng: 39.0145,
        currentSpeedKmH: 0,
        attachedPdfName: noteData.attachedPdfName,
        attachedPdfDataUrl: noteData.attachedPdfDataUrl,
      };

      setTrips((prev) => [newTrip, ...prev]);

      const newDnRecord: InboundDeliveryNote = {
        ...noteData,
        id: dnId,
        tripId: tripId,
        driverId: targetDriver ? targetDriver.id : 'drv_1',
        driverName: targetDriver ? targetDriver.name : (noteData.driverName || ''),
        vehiclePlate: targetVehicle ? targetVehicle.plateNumber : (noteData.vehiclePlate || ''),
        tripStep: 'loading',
        slipStatus: 'not_submitted',
        importedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      setInboundDeliveryNotes((prev) => [newDnRecord, ...prev]);
    }

    // 3. Update Warehouse Inventory (TLB Inventory Item)
    const itemName = (noteData.itemName || 'TLB (Truck Load Bulk)').trim();
    const tlbSku = cleanSoNumber ? `TLB-${cleanSoNumber}` : (cleanDnNumber ? `TLB-${cleanDnNumber}` : cleanItemSku);

    let targetItemName = itemName;
    let targetItemSku = tlbSku;
    let computedAvailableQty = quantity;

    const matchedWarehouseItem = warehouseItems.find(
      (i) =>
        (cleanSoNumber && (i.sku.includes(cleanSoNumber) || (i.dnNumber && i.dnNumber.includes(cleanSoNumber)))) ||
        (cleanDnNumber && (i.sku.includes(cleanDnNumber) || (i.dnNumber && i.dnNumber.includes(cleanDnNumber)))) ||
        (cleanItemSku && i.sku.toLowerCase() === cleanItemSku.toLowerCase()) ||
        i.name.toLowerCase() === itemName.toLowerCase()
    );

    if (matchedWarehouseItem) {
      targetItemName = matchedWarehouseItem.name;
      targetItemSku = matchedWarehouseItem.sku;
      // If duplicate upload, available quantity remains existing; if new, compute total
      computedAvailableQty = isDuplicateTlb
        ? (matchedWarehouseItem.quantityOnHand || 0)
        : (matchedWarehouseItem.quantityOnHand || 0) + quantity;
    } else {
      computedAvailableQty = quantity;
    }

    setWarehouseItems((prev) => {
      const existing = prev.find(
        (i) =>
          (cleanSoNumber && (i.sku.includes(cleanSoNumber) || (i.dnNumber && i.dnNumber.includes(cleanSoNumber)))) ||
          (cleanDnNumber && (i.sku.includes(cleanDnNumber) || (i.dnNumber && i.dnNumber.includes(cleanDnNumber)))) ||
          (cleanItemSku && i.sku.toLowerCase() === cleanItemSku.toLowerCase()) ||
          i.name.toLowerCase() === itemName.toLowerCase()
      );

      if (existing) {
        // If it's a re-upload of the same TLB, update metadata without duplicating quantity
        return prev.map((i) =>
          i.id === existing.id
            ? {
                ...i,
                lastStockCheck: new Date().toISOString().split('T')[0],
                // If it's a fresh non-duplicate addition, credit quantity; otherwise preserve accurate quantity
                quantityOnHand: isDuplicateTlb ? i.quantityOnHand : i.quantityOnHand + quantity,
                totalStockIn: isDuplicateTlb ? (i.totalStockIn ?? i.quantityOnHand) : (i.totalStockIn ?? i.quantityOnHand) + quantity,
              }
            : i
        );
      } else {
        const newItem: WarehouseItem = {
          id: 'wh_' + Date.now(),
          sku: targetItemSku,
          dnNumber: cleanDnNumber ? `DN-${cleanDnNumber}` : (cleanSoNumber ? `TLB-${cleanSoNumber}` : 'DN-001'),
          name: itemName,
          nameAr: noteData.itemName || itemName,
          category: 'TLB Main Inventory',
          aisle: 'B-01',
          rack: 'R-01',
          bay: 'Bay B-01',
          quantityOnHand: quantity,
          openingStock: quantity,
          totalStockIn: quantity,
          totalStockOut: 0,
          reservedQuantity: 0,
          minimumThreshold: 100,
          unit: noteData.uom || 'BAG',
          unitCost: 14,
          sellingPrice: 18,
          barcode: noteData.barcode || `6281${(cleanSoNumber || cleanDnNumber || '9010043436').padStart(9, '0').slice(-9)}`,
          isTemperatureControlled: false,
          lastStockCheck: new Date().toISOString().split('T')[0],
          sourceSupplier: noteData.shipFrom || '',
        };
        return [newItem, ...prev];
      }
    });

    // 4. Create WarehouseMovement Log in database history
    const movement: WarehouseMovement = {
      id: 'mov_' + Date.now(),
      type: isDuplicateTlb ? 'adjustment' : 'inbound_grn',
      itemSku: targetItemSku,
      itemName: targetItemName,
      quantity: isDuplicateTlb ? 0 : quantity,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      referenceDoc: cleanDnNumber ? `DN-${cleanDnNumber}` : (cleanSoNumber ? `TLB-${cleanSoNumber}` : 'DN-INB'),
      performedBy: noteData.salesman ? `${noteData.salesman} (DN Intake)` : 'Dispatcher Intake',
      notes: isDuplicateTlb
        ? `Re-verified TLB #${cleanSoNumber || cleanDnNumber} from PDF. Recognized existing inventory record (no duplicate created). Available: ${computedAvailableQty} ${noteData.uom || 'BAG'}.`
        : `TLB #${cleanSoNumber || cleanDnNumber} created from PDF for ${cleanCompany} (${noteData.warehouseLocation || 'TLB Main Inventory'}). Stock In verified: +${quantity} ${noteData.uom || 'BAG'}.`,
    };
    setWarehouseMovements((prev) => [movement, ...prev]);

    // 5. Record Master Audit Log
    logMasterAudit({
      action: isDuplicateTlb ? 'TLB_INVENTORY_SYNC_RECOGNIZED' : 'STOCK_IN_VERIFIED',
      recordRef: cleanDnNumber ? `DN-${cleanDnNumber}` : `TLB-${cleanSoNumber}`,
      customer: cleanCompany,
      item: targetItemName,
      quantity: quantity,
      oldValue: isDuplicateTlb ? `Existing TLB #${cleanSoNumber || cleanDnNumber} in system` : `Stock: 0 ${noteData.uom || 'BAG'}`,
      newValue: isDuplicateTlb
        ? `Preserved existing TLB record. Available: ${computedAvailableQty} ${noteData.uom || 'BAG'}`
        : `New TLB Record Created. Available: ${computedAvailableQty} ${noteData.uom || 'BAG'}`,
      category: 'inventory',
      reason: isDuplicateTlb
        ? `TLB #${cleanSoNumber || cleanDnNumber} PDF re-uploaded. Recognized existing record; duplicate avoided and movement history preserved.`
        : `New TLB #${cleanSoNumber || cleanDnNumber} PDF processed. +${quantity} ${noteData.uom || 'BAG'} added to TLB Main Inventory.`,
    });

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    } catch {
      // ignore
    }

    if (isDuplicateTlb) {
      showToast(
        'Existing TLB Recognized & Synced',
        `TLB #${cleanSoNumber || cleanDnNumber} already exists in inventory. Record updated and movement history logged (No duplicate created). Available: ${computedAvailableQty} ${noteData.uom || 'BAG'}.`,
        'info'
      );
    } else {
      showToast(
        isNewCompany ? 'New TLB Record Created & Company Registered!' : 'New TLB Record Created & Stocked In!',
        `TLB #${cleanSoNumber || cleanDnNumber}: +${quantity} ${noteData.uom || 'BAG'} credited to TLB Main Inventory (Available: ${computedAvailableQty}).`,
        'success'
      );
    }

    return {
      dnId,
      companyId,
      isNewCompany,
      isDuplicateTlb,
      tripId,
      availableQty: computedAvailableQty,
      stockedItemName: targetItemName,
      stockedItemSku: targetItemSku,
    };
  };

  const updateInboundDeliveryNote = (id: string, updates: Partial<InboundDeliveryNote>) => {
    setInboundDeliveryNotes((prev) =>
      prev.map((dn) => {
        if (dn.id === id) {
          return { ...dn, ...updates };
        }
        return dn;
      })
    );
    showToast('Delivery Note Updated', 'Changes to warehouse item/delivery note saved successfully.', 'success');
  };

  const attachFilesInboundDeliveryNote = (id: string, newFiles: InboundAttachedFile[]) => {
    setInboundDeliveryNotes((prev) =>
      prev.map((dn) => {
        if (dn.id === id) {
          const currentFiles = dn.attachedFiles || [];
          return { ...dn, attachedFiles: [...currentFiles, ...newFiles] };
        }
        return dn;
      })
    );
    showToast('Files Attached', `${newFiles.length} file(s) attached successfully.`, 'success');
  };

  const removeAttachedFileInboundDeliveryNote = (dnId: string, fileId: string) => {
    setInboundDeliveryNotes((prev) =>
      prev.map((dn) => {
        if (dn.id === dnId) {
          const updated = (dn.attachedFiles || []).filter((f) => f.id !== fileId);
          return { ...dn, attachedFiles: updated };
        }
        return dn;
      })
    );
    showToast('File Removed', 'Attached file has been removed.', 'info');
  };

  const deleteInboundDeliveryNote = (id: string) => {
    if (!['admin', 'manager', 'gm', 'warehouse_mgr', 'warehouse', 'dispatcher'].includes(activeRole)) {
      showToast('Access Denied', 'Only authorized operations staff can delete delivery notes.', 'error');
      return;
    }
    setInboundDeliveryNotes((prev) => prev.filter((d) => d.id !== id));
    showToast('Delivery Note Removed', 'Inbound Delivery Note slip removed from history.', 'info');
  };

  // CUSTOMERS ACTIONS
  const addCustomer = (customerData: Omit<Customer, 'id'>): Customer => {
    const id = 'cust_' + Date.now();
    const custNum = customerData.customerNumber || `CUST-${1000 + customers.length + 1}`;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const actor = activeRole ? `${activeRole.toUpperCase()} Admin` : 'System Admin';

    const newCustomer: Customer = {
      ...customerData,
      id,
      customerNumber: custNum,
      companyName: customerData.companyName || customerData.name,
      customerType: customerData.customerType || 'Corporate',
      creditLimit: Number(customerData.creditLimit) || 100000,
      paymentTerms: customerData.paymentTerms || 'Net 30',
      status: customerData.status || 'active',
      totalLoads: Number(customerData.totalLoads) || 0,
      totalAmount: Number(customerData.totalAmount) || 0,
      paidAmount: Number(customerData.paidAmount) || 0,
      outstandingAmount: Math.max(0, (Number(customerData.totalAmount) || 0) - (Number(customerData.paidAmount) || 0)),
      outstandingBalance: Math.max(0, (Number(customerData.totalAmount) || 0) - (Number(customerData.paidAmount) || 0)),
      payments: customerData.payments || [],
      history: [
        {
          id: 'ch_' + Date.now(),
          timestamp,
          action: 'CUSTOMER_CREATED',
          performedBy: actor,
          details: `Customer account registered with initial credit limit SAR ${(Number(customerData.creditLimit) || 100000).toLocaleString()} and terms ${customerData.paymentTerms || 'Net 30'}.`,
        },
        ...(customerData.history || [])
      ]
    };

    setCustomers((prev) => [newCustomer, ...prev]);

    logMasterAudit({
      action: 'CUSTOMER_CREATED',
      recordRef: custNum,
      customer: newCustomer.name,
      newValue: `Limit: SAR ${newCustomer.creditLimit} | Terms: ${newCustomer.paymentTerms}`,
      reason: `Customer registered: ${newCustomer.name} (${custNum})`,
      category: 'finance',
      approvedBy: actor,
    });

    showToast('Customer Created', `${newCustomer.name} (${custNum}) account registered.`, 'success');
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>, reason?: string) => {
    if (activeRole !== 'admin') {
      showToast('Access Denied', 'Only Admin users are authorized to edit customer profiles.', 'error');
      return;
    }
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const actor = activeRole ? `${activeRole.toUpperCase()} Admin` : 'System Admin';

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const historyEntry: CustomerHistoryEntry = {
            id: 'ch_' + Date.now(),
            timestamp,
            action: 'CUSTOMER_EDITED',
            performedBy: actor,
            details: reason || 'Customer account profile and terms updated.',
          };
          const updated: Customer = {
            ...c,
            ...updates,
            companyName: updates.companyName || updates.name || c.companyName || c.name,
            history: [historyEntry, ...(c.history || [])],
          };
          if (updated.totalAmount !== undefined && updated.paidAmount !== undefined) {
            updated.outstandingAmount = Math.max(0, updated.totalAmount - updated.paidAmount);
            updated.outstandingBalance = updated.outstandingAmount;
          }
          return updated;
        }
        return c;
      })
    );

    logMasterAudit({
      action: 'CUSTOMER_EDITED',
      recordRef: id,
      customer: updates.name,
      reason: reason || 'Customer profile modified.',
      category: 'finance',
      approvedBy: actor,
    });

    showToast('Customer Updated', 'Customer account details updated.', 'info');
  };

  const deleteCustomer = (id: string, reason?: string) => {
    if (!['admin', 'manager', 'gm', 'sales', 'accountant'].includes(activeRole)) {
      showToast('Access Denied', 'Only authorized managerial and sales users can delete customer records.', 'error');
      return;
    }
    const target = customers.find((c) => c.id === id);
    if (!target) return;
    const actor = activeRole ? `${activeRole.toUpperCase()} Admin` : 'System Admin';

    setCustomers((prev) => prev.filter((c) => c.id !== id));

    logMasterAudit({
      action: 'CUSTOMER_DELETED',
      recordRef: target.customerNumber || id,
      customer: target.name,
      reason: reason || `Customer record ${target.name} deleted by ${actor}.`,
      category: 'finance',
      approvedBy: actor,
    });

    showToast('Customer Deleted', `Customer ${target.name} removed.`, 'info');
  };

  const recordCustomerPayment = (params: {
    customerId: string;
    type: 'payment_in' | 'payment_out';
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    invoiceId?: string;
    invoiceNumber?: string;
    tripId?: string;
    tripNumber?: string;
    dnNumber?: string;
    notes?: string;
    recordedBy?: string;
  }): string => {
    const paymentId = 'pmt_' + Date.now();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const actor = params.recordedBy || (activeRole ? `${activeRole.toUpperCase()} Finance` : 'Finance Dept');
    const customer = customers.find((c) => c.id === params.customerId);
    const isPaymentIn = params.type === 'payment_in';
    const numAmount = Number(params.amount);

    const paymentEntry: CustomerPaymentEntry = {
      id: paymentId,
      customerId: params.customerId,
      customerName: customer?.name || 'Customer',
      type: params.type,
      amount: numAmount,
      paymentDate: params.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: params.paymentMethod || 'bank_transfer',
      referenceNumber: params.referenceNumber || `REF-${Math.floor(10000 + Math.random() * 90000)}`,
      invoiceId: params.invoiceId,
      invoiceNumber: params.invoiceNumber,
      tripId: params.tripId,
      tripNumber: params.tripNumber,
      dnNumber: params.dnNumber,
      notes: params.notes,
      recordedBy: actor,
      timestamp,
    };

    // 1. Update Customer Record (Debit, Credit & Balance sync)
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === params.customerId) {
          const currentPaid = c.paidAmount || 0;
          const currentTotal = c.totalAmount || c.totalBilled || 0;
          const newPaid = isPaymentIn ? currentPaid + numAmount : Math.max(0, currentPaid - numAmount);
          const newOutstanding = Math.max(0, currentTotal - newPaid);
          const historyEntry: CustomerHistoryEntry = {
            id: 'ch_' + Date.now(),
            timestamp,
            action: isPaymentIn ? 'PAYMENT_IN_RECORDED' : 'PAYMENT_OUT_RECORDED',
            performedBy: actor,
            details: `${isPaymentIn ? 'Payment In (Credit)' : 'Payment Out (Debit/Refund)'} of SAR ${numAmount.toLocaleString()} via ${params.paymentMethod}. Ref: ${params.referenceNumber}. ${params.notes ? `(${params.notes})` : ''}`,
            amount: numAmount,
            referenceId: params.referenceNumber,
          };
          return {
            ...c,
            paidAmount: newPaid,
            outstandingAmount: newOutstanding,
            outstandingBalance: newOutstanding,
            payments: [paymentEntry, ...(c.payments || [])],
            history: [historyEntry, ...(c.history || [])],
          };
        }
        return c;
      })
    );

    // 2. Update Customer Invoices (Commercial & Accounts) if linked
    if (params.invoiceId || params.invoiceNumber) {
      setCustomerInvoices((prev) =>
        prev.map((inv) => {
          if (
            (params.invoiceId && inv.id === params.invoiceId) ||
            (params.invoiceNumber && inv.invoiceNumber === params.invoiceNumber)
          ) {
            const currentPaid = inv.paidAmount || 0;
            const totalAmount = inv.totalAmount || (inv.quantity * inv.unitPrice);
            const newPaid = isPaymentIn ? currentPaid + numAmount : Math.max(0, currentPaid - numAmount);
            const newOutstanding = Math.max(0, totalAmount - newPaid);
            const paymentStatus: InvoicePaymentStatus = newOutstanding <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
            return {
              ...inv,
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              paymentStatus,
            };
          }
          return inv;
        })
      );
    }

    // 3. Update Tax Invoice if linked
    if (params.invoiceId || params.invoiceNumber) {
      setTaxInvoices((prev) =>
        prev.map((inv) => {
          if (
            (params.invoiceId && inv.id === params.invoiceId) ||
            (params.invoiceNumber && inv.invoiceNumber === params.invoiceNumber)
          ) {
            const currentPaid = inv.paidAmount || 0;
            const grandTotal = inv.grandTotal || inv.totalAmount || 0;
            const newPaid = isPaymentIn ? currentPaid + numAmount : Math.max(0, currentPaid - numAmount);
            const newOutstanding = Math.max(0, grandTotal - newPaid);
            const paymentStatus: InvoicePaymentStatus = newOutstanding <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
            return {
              ...inv,
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              paymentStatus,
              status: paymentStatus === 'paid' ? 'paid' : inv.status,
              paymentHistory: [paymentEntry, ...(inv.paymentHistory || [])],
            };
          }
          return inv;
        })
      );
    }

    // 4. Log Master Audit
    logMasterAudit({
      action: isPaymentIn ? 'PAYMENT_IN_RECORDED' : 'PAYMENT_OUT_RECORDED',
      recordRef: params.referenceNumber || paymentId,
      customer: customer?.name || params.customerId,
      delta: `${isPaymentIn ? '+' : '-'}SAR ${numAmount.toLocaleString()}`,
      reason: `${isPaymentIn ? 'Payment In' : 'Payment Out'} recorded. Method: ${params.paymentMethod}. ${params.invoiceNumber ? `Invoice: ${params.invoiceNumber}. ` : ''}${params.notes || ''}`,
      category: 'finance',
      approvedBy: actor,
    });

    showToast(
      isPaymentIn ? 'Payment In Recorded' : 'Payment Out Recorded',
      `${isPaymentIn ? 'Credit' : 'Debit'} of SAR ${numAmount.toLocaleString()} posted to customer sub-ledger. Ref: ${params.referenceNumber}`,
      'success'
    );

    return paymentId;
  };

  // LOCATIONS ACTIONS (SAVED HUBS, DEPOTS, CLIENT SITES & CUSTOM LOCATIONS)
  const addLocation = (locData: Omit<LocationPoint, 'id'> | LocationPoint): LocationPoint => {
    // Generate id if not provided
    const newId = ('id' in locData && locData.id) 
      ? locData.id 
      : `loc_saved_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const newLoc: LocationPoint = {
      ...locData,
      id: newId,
      name: locData.name.trim(),
      nameAr: locData.nameAr?.trim() || locData.name.trim(),
      city: locData.city.trim(),
      address: locData.address.trim(),
      lat: Number(locData.lat) || 24.7136,
      lng: Number(locData.lng) || 46.6753,
      isCustom: true,
      category: locData.category || 'custom',
    };

    setLocations((prev) => {
      // Check if location already exists with exact id
      const existingIdIdx = prev.findIndex((l) => l.id === newLoc.id);
      if (existingIdIdx >= 0) {
        const copy = [...prev];
        copy[existingIdIdx] = newLoc;
        return copy;
      }
      // Check if duplicate by exact name and city
      const existingNameIdx = prev.findIndex(
        (l) => l.name.toLowerCase() === newLoc.name.toLowerCase() && l.city.toLowerCase() === newLoc.city.toLowerCase()
      );
      if (existingNameIdx >= 0) {
        const copy = [...prev];
        copy[existingNameIdx] = { ...copy[existingNameIdx], ...newLoc };
        return copy;
      }
      return [newLoc, ...prev];
    });

    showToast('Location Saved', `"${newLoc.name}" added to saved locations directory.`, 'success');
    return newLoc;
  };

  const updateLocation = (id: string, updates: Partial<LocationPoint>) => {
    if (activeRole !== 'admin') {
      showToast('Access Denied', 'Only Admin users are authorized to edit locations.', 'error');
      return;
    }
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, ...updates } : loc))
    );
    showToast('Location Updated', 'Saved location details updated.', 'info');
  };

  const deleteLocation = (id: string) => {
    if (!['admin', 'manager', 'gm', 'dispatcher'].includes(activeRole)) {
      showToast('Access Denied', 'Only authorized operations staff can delete locations.', 'error');
      return;
    }
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
    showToast('Location Removed', 'Location removed from directory.', 'info');
  };

  // SALES & POS
  const createSaleOrder = (orderData: Omit<SaleOrder, 'id' | 'orderNumber' | 'date'>): string => {
    const nextOrderNum = 'POS-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const orderId = 'so_' + Date.now();
    const newOrder: SaleOrder = {
      ...orderData,
      id: orderId,
      orderNumber: nextOrderNum,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    // Deduct stock from warehouse
    orderData.items.forEach((item) => {
      setWarehouseItems((prev) =>
        prev.map((whItem) => {
          if (whItem.id === item.itemId || whItem.sku === item.sku) {
            return {
              ...whItem,
              quantityOnHand: Math.max(0, whItem.quantityOnHand - item.quantity),
            };
          }
          return whItem;
        })
      );
    });

    setSaleOrders((prev) => [newOrder, ...prev]);

    // Auto-generate Tax Invoice
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];
    const qrPayload = generateTaxInvoiceQrBase64(
      companySettings.companyName,
      companySettings.vatNumber,
      new Date().toISOString(),
      newOrder.grandTotal,
      newOrder.vatTotal
    );

    const autoInvoice: TaxInvoice = {
      id: 'inv_tax_' + Date.now(),
      invoiceNumber: 'INV-' + nextOrderNum,
      invoiceType: 'tax_invoice_b2b',
      issueDate: dateStr,
      issueTime: timeStr,
      sellerName: companySettings.companyName,
      sellerVatNumber: companySettings.vatNumber,
      sellerCrNumber: companySettings.crNumber,
      sellerAddress: companySettings.address + ', ' + companySettings.city,
      buyerName: newOrder.customerName,
      buyerVatNumber: newOrder.customerVat,
      buyerAddress: 'Kingdom of Saudi Arabia',
      items: newOrder.items.map((it, idx) => ({
        id: (idx + 1).toString(),
        description: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxableAmount: it.unitPrice * it.quantity - it.discount,
        vatRate: it.vatRate,
        vatAmount: (it.unitPrice * it.quantity - it.discount) * it.vatRate,
        totalWithVat: it.totalWithVat,
      })),
      subtotal: newOrder.subtotal,
      discountTotal: newOrder.discountTotal,
      totalVat: newOrder.vatTotal,
      grandTotal: newOrder.grandTotal,
      currency: 'SAR',
      status: 'paid',
      qrPayload,
      paymentTerms: newOrder.paymentMethod.toUpperCase(),
      dueDate: dateStr,
    };

    setTaxInvoices((prev) => [autoInvoice, ...prev]);

    showToast('Sale Completed & Invoiced', `${nextOrderNum} processed with Tax Invoice QR.`, 'success');
    return orderId;
  };

  // EXPENSES
  const addExpense = (expData: Omit<ExpenseRecord, 'id'>) => {
    const newExp: ExpenseRecord = {
      ...expData,
      id: 'exp_' + Date.now(),
    };
    setExpenses((prev) => [newExp, ...prev]);
    showToast('Expense Recorded', `${expData.description} (${expData.amount} SAR) logged.`, 'success');
  };

  const deleteExpense = (id: string) => {
    if (!['admin', 'manager', 'gm', 'accountant'].includes(activeRole)) {
      showToast('Access Denied', 'Only authorized managerial and accounting staff can delete expenses.', 'error');
      return;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast('Expense Deleted', 'Record removed.', 'info');
  };

  const updateSalaryStatus = (id: string, status: 'pending' | 'approved' | 'paid') => {
    setSalarySlips((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              paymentStatus: status,
              paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : s.paidDate,
            }
          : s
      )
    );
    showToast('Salary Slip Updated', `Status changed to ${status.toUpperCase()}`, 'success');
  };

  // TAX INVOICES
  const createTaxInvoiceFromTrip = (tripId: string): string => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return '';

    const customer = customers.find((c) => c.id === trip.customerId);
    const subtotal = trip.price;
    const vatRate = 0.15;
    const vatAmount = subtotal * vatRate;
    const grandTotal = subtotal + vatAmount;
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];
    const invNumber = 'INV-' + dateStr.replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);

    const qrPayload = generateTaxInvoiceQrBase64(
      companySettings.companyName,
      companySettings.vatNumber,
      new Date().toISOString(),
      grandTotal,
      vatAmount
    );

    const newInvoice: TaxInvoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber: invNumber,
      invoiceType: 'tax_invoice_b2b',
      issueDate: dateStr,
      issueTime: timeStr,
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      sellerName: companySettings.companyName,
      sellerVatNumber: companySettings.vatNumber,
      sellerCrNumber: companySettings.crNumber,
      sellerAddress: companySettings.address + ', ' + companySettings.city,
      buyerName: customer ? customer.name : (trip.customerName || trip.companyName || 'Valued Client'),
      buyerVatNumber: customer?.vatNumber || '300998127300003',
      buyerCrNumber: customer?.crNumber || '1010882736',
      buyerAddress: customer?.address || 'Kingdom of Saudi Arabia',
      buyerPhone: customer?.phone || trip.driverPhone,
      items: [
        {
          id: '1',
          description: `Logistics Haulage & Freight: ${trip.origin.name || trip.origin.city} to ${trip.destination.name || trip.destination.city} [DN #${trip.dnNumber || trip.deliveryNote.dnNumber}]`,
          quantity: 1,
          unitPrice: subtotal,
          discount: 0,
          taxableAmount: subtotal,
          vatRate: vatRate,
          vatAmount: vatAmount,
          totalWithVat: grandTotal,
        },
      ],
      subtotal,
      discountTotal: 0,
      totalVat: vatAmount,
      grandTotal,
      currency: 'SAR',
      status: 'paid',
      qrPayload,
      paymentTerms: 'Net 30',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    };

    setTaxInvoices((prev) => [newInvoice, ...prev]);
    showToast('Tax Invoice Generated', `Invoice #${invNumber} created for Trip #${trip.tripNumber}.`, 'success');
    return newInvoice.id;
  };

  const createCustomTaxInvoice = (invData: Partial<TaxInvoice>): TaxInvoice => {
    const dateStr = invData.issueDate || invData.invoiceDate || new Date().toISOString().split('T')[0];
    const timeStr = invData.issueTime || new Date().toTimeString().split(' ')[0];
    const invNumber = invData.invoiceNumber?.trim() || '—' + dateStr.replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);
    const actor = activeRole ? `${activeRole.toUpperCase()} Admin` : 'System Admin';

    const subtotal = Number(invData.subtotal) || 0;
    const discountTotal = Number(invData.discountTotal) || 0;
    const totalVat = Number(invData.totalVat ?? invData.vatAmount) || 0;
    const grandTotal = Number(invData.grandTotal ?? invData.totalAmount) || (subtotal - discountTotal + totalVat);
    const paidAmount = Number(invData.paidAmount) || (invData.paymentStatus === 'paid' ? grandTotal : 0);
    const outstandingAmount = Math.max(0, grandTotal - paidAmount);
    const paymentStatus: InvoicePaymentStatus = invData.paymentStatus || (outstandingAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid');

    const qrPayload = generateTaxInvoiceQrBase64(
      companySettings.companyName,
      companySettings.vatNumber,
      new Date().toISOString(),
      grandTotal,
      totalVat
    );

    const newInvoice: TaxInvoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber: invNumber,
      invoiceType: invData.invoiceType || 'tax_invoice_b2b',
      issueDate: dateStr,
      invoiceDate: dateStr,
      issueTime: timeStr,
      customerId: invData.customerId,
      customerName: invData.customerName,
      customerNumber: invData.customerNumber,
      buyerName: invData.buyerName || invData.customerName || 'Valued Customer',
      buyerVatNumber: invData.buyerVatNumber || '300000000000003',
      buyerCrNumber: invData.buyerCrNumber,
      buyerAddress: invData.buyerAddress || 'Kingdom of Saudi Arabia',
      buyerPhone: invData.buyerPhone,
      buyerEmail: invData.buyerEmail,
      tripId: invData.tripId,
      tripNumber: invData.tripNumber,
      dnNumber: invData.dnNumber || invData.loadNumber,
      loadNumber: invData.loadNumber || invData.dnNumber,
      driverId: invData.driverId,
      driverName: invData.driverName,
      driverPhone: invData.driverPhone,
      truckId: invData.truckId,
      truckNo: invData.truckNo || invData.vehiclePlate,
      vehiclePlate: invData.vehiclePlate || invData.truckNo,
      pickupLocation: invData.pickupLocation,
      dropLocation: invData.dropLocation,
      productService: invData.productService,
      quantity: invData.quantity,
      sellerName: companySettings.companyName,
      sellerVatNumber: companySettings.vatNumber,
      sellerCrNumber: companySettings.crNumber,
      sellerAddress: companySettings.address + ', ' + companySettings.city,
      items: invData.items || [
        {
          id: '1',
          description: invData.productService || 'Commercial Logistics & Freight Haulage',
          quantity: invData.quantity || 1,
          unitPrice: subtotal,
          discount: discountTotal,
          taxableAmount: subtotal - discountTotal,
          vatRate: 0.15,
          vatAmount: totalVat,
          totalWithVat: grandTotal,
        }
      ],
      subtotal,
      discountTotal,
      totalVat,
      grandTotal,
      totalAmount: grandTotal,
      vatAmount: totalVat,
      currency: 'SAR',
      status: paymentStatus === 'paid' ? 'paid' : (invData.status || 'sent'),
      paymentStatus,
      paidAmount,
      outstandingAmount,
      paymentHistory: invData.paymentHistory || (paidAmount > 0 ? [{
        id: 'pmt_' + Date.now(),
        customerId: invData.customerId || '',
        customerName: invData.customerName || invData.buyerName,
        type: 'payment_in',
        amount: paidAmount,
        paymentDate: dateStr,
        paymentMethod: 'bank_transfer',
        referenceNumber: `INIT-${invNumber}`,
        invoiceNumber: invNumber,
        notes: 'Initial payment recorded during invoice issuance',
        recordedBy: actor,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      }] : []),
      qrPayload,
      paymentTerms: invData.paymentTerms || 'Net 30',
      dueDate: invData.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      notes: invData.notes,
    };

    setTaxInvoices((prev) => [newInvoice, ...prev]);

    // Update Customer aggregates if customerId matched
    if (invData.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === invData.customerId) {
            const newTotal = (c.totalAmount || 0) + grandTotal;
            const newPaid = (c.paidAmount || 0) + paidAmount;
            const newOutstanding = Math.max(0, newTotal - newPaid);
            const historyEntry: CustomerHistoryEntry = {
              id: 'ch_' + Date.now(),
              timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
              action: 'INVOICE_ISSUED',
              performedBy: actor,
              details: `Tax Invoice ${invNumber} issued for SAR ${grandTotal.toLocaleString()}. Status: ${paymentStatus.toUpperCase()}.`,
              amount: grandTotal,
              referenceId: invNumber,
            };
            return {
              ...c,
              totalLoads: (c.totalLoads || 0) + 1,
              totalAmount: newTotal,
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              outstandingBalance: newOutstanding,
              history: [historyEntry, ...(c.history || [])],
            };
          }
          return c;
        })
      );
    }

    logMasterAudit({
      action: 'INVOICE_CREATED',
      recordRef: invNumber,
      customer: newInvoice.customerName || newInvoice.buyerName,
      delta: `SAR ${grandTotal.toLocaleString()}`,
      reason: `Tax Invoice ${invNumber} generated. DN: ${newInvoice.dnNumber || 'N/A'}. Amount: SAR ${grandTotal.toLocaleString()}`,
      category: 'finance',
      approvedBy: actor,
    });

    showToast('Tax Invoice Created', `Invoice #${invNumber} generated.`, 'success');
    return newInvoice;
  };

  const updateTaxInvoice = (id: string, updates: Partial<TaxInvoice>, reason?: string) => {
    if (activeRole !== 'admin') {
      showToast('Access Denied', 'Only Admin users are authorized to edit tax invoices.', 'error');
      return;
    }
    const actor = activeRole ? `${activeRole.toUpperCase()} Admin` : 'System Admin';

    setTaxInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const grandTotal = updates.grandTotal !== undefined ? Number(updates.grandTotal) : inv.grandTotal;
          const paidAmount = updates.paidAmount !== undefined ? Number(updates.paidAmount) : inv.paidAmount;
          const outstandingAmount = Math.max(0, grandTotal - paidAmount);
          const paymentStatus: InvoicePaymentStatus = outstandingAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

          return {
            ...inv,
            ...updates,
            grandTotal,
            totalAmount: grandTotal,
            paidAmount,
            outstandingAmount,
            paymentStatus,
            status: paymentStatus === 'paid' ? 'paid' : (updates.status || inv.status),
          };
        }
        return inv;
      })
    );

    logMasterAudit({
      action: 'INVOICE_EDITED',
      recordRef: updates.invoiceNumber || id,
      customer: updates.customerName || updates.buyerName,
      reason: reason || 'Invoice line items or details updated.',
      category: 'finance',
      approvedBy: actor,
    });

    showToast('Invoice Updated', 'Invoice record updated.', 'info');
  };

  const deleteTaxInvoice = (id: string, reason?: string) => {
    if (!['admin', 'manager', 'gm', 'accountant'].includes(activeRole)) {
      showToast('Access Denied', 'Only authorized managerial and accounting staff can delete tax invoices.', 'error');
      return;
    }
    const target = taxInvoices.find((inv) => inv.id === id);
    if (!target) return;
    const actor = activeRole ? `${activeRole.toUpperCase()} Admin` : 'System Admin';

    setTaxInvoices((prev) => prev.filter((inv) => inv.id !== id));

    // Adjust Customer balance if customerId exists
    if (target.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === target.customerId) {
            const newTotal = Math.max(0, (c.totalAmount || 0) - target.grandTotal);
            const newPaid = Math.max(0, (c.paidAmount || 0) - target.paidAmount);
            const newOutstanding = Math.max(0, newTotal - newPaid);
            return {
              ...c,
              totalAmount: newTotal,
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              outstandingBalance: newOutstanding,
            };
          }
          return c;
        })
      );
    }

    logMasterAudit({
      action: 'INVOICE_DELETED',
      recordRef: target.invoiceNumber || id,
      customer: target.customerName || target.buyerName,
      reason: reason || `Tax Invoice ${target.invoiceNumber} deleted by ${actor}.`,
      category: 'finance',
      approvedBy: actor,
    });

    showToast('Invoice Deleted', `Invoice ${target.invoiceNumber} removed.`, 'info');
  };

  const recordInvoicePayment = (invoiceId: string, params: {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    notes?: string;
    recordedBy?: string;
  }): string => {
    const targetInvoice = taxInvoices.find((inv) => inv.id === invoiceId);
    if (!targetInvoice) {
      showToast('Invoice Not Found', 'Could not locate invoice to record payment.', 'error');
      return '';
    }

    return recordCustomerPayment({
      customerId: targetInvoice.customerId || '',
      type: 'payment_in',
      amount: params.amount,
      paymentDate: params.paymentDate,
      paymentMethod: params.paymentMethod,
      referenceNumber: params.referenceNumber,
      invoiceId: targetInvoice.id,
      invoiceNumber: targetInvoice.invoiceNumber,
      tripId: targetInvoice.tripId,
      tripNumber: targetInvoice.tripNumber,
      dnNumber: targetInvoice.dnNumber,
      notes: params.notes,
      recordedBy: params.recordedBy,
    });
  };

  // Commercial & Accounts: Customer Invoice Handlers
  const addCustomerInvoice = (
    invData: Omit<CustomerInvoice, 'id' | 'createdAt'>,
    creditStockIn?: boolean
  ): CustomerInvoice => {
    const qty = Number(invData.quantity) || 1;
    const uPrice = Number(invData.unitPrice) || 0;
    const totalAmount = qty * uPrice; // STRICT: Quantity * Unit Price = Total Amount
    const actor = activeRole ? `${activeRole.toUpperCase()} Commercial Officer` : 'Commercial Accounts';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const isStockCredited = !!invData.stockCredited || !!creditStockIn;
    let stockMovementId = invData.stockMovementId;

    if (isStockCredited && !stockMovementId) {
      const cleanDn = (invData.dnNumber || `DN-${invData.invoiceNumber.replace('INV-', '')}`).trim();
      stockMovementId = executeStockIn({
        dnNumber: cleanDn,
        productName: invData.productService || 'TLB (Truck Load Bulk)',
        quantity: qty,
        unit: 'BAG',
        unitCost: uPrice || 14,
        sellingPrice: uPrice || 18,
        driverName: invData.driverName,
        vehiclePlate: invData.vehiclePlate,
        source: invData.customerName || 'Customer Invoice Delivery Intake',
        performedBy: actor,
        notes: `Automated verified stock-in intake from Customer Invoice ${invData.invoiceNumber} (DN: ${cleanDn}).`,
      });
    }

    const newInv: CustomerInvoice = {
      ...invData,
      id: 'cinv_' + Date.now(),
      quantity: qty,
      unitPrice: uPrice,
      totalAmount,
      paidAmount: invData.paidAmount ?? (invData.paymentStatus === 'paid' ? totalAmount : 0),
      outstandingAmount: invData.outstandingAmount ?? (invData.paymentStatus === 'paid' ? 0 : totalAmount),
      stockCredited: isStockCredited,
      stockCreditedQty: isStockCredited ? qty : undefined,
      stockCreditedAt: isStockCredited ? timestamp : undefined,
      stockCreditedBy: isStockCredited ? actor : undefined,
      stockMovementId,
      createdAt: new Date().toISOString(),
    };

    setCustomerInvoices((prev) => [newInv, ...prev]);

    // Update customer account balance and append history/sub-ledger
    if (newInv.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === newInv.customerId) {
            const currentTotal = c.totalAmount || c.totalBilled || 0;
            const currentPaid = c.paidAmount || 0;
            const isFullyPaid = newInv.paymentStatus === 'paid';
            const invoicePaidPortion = isFullyPaid ? totalAmount : (newInv.paidAmount || 0);

            const newTotal = currentTotal + totalAmount; // Customer Debit increases
            const newPaid = currentPaid + invoicePaidPortion; // Customer Credit increases if paid
            const newOutstanding = Math.max(0, newTotal - newPaid);

            const historyEntry: CustomerHistoryEntry = {
              id: 'ch_inv_' + Date.now(),
              timestamp,
              action: 'INVOICE_CREATED',
              performedBy: actor,
              details: `Customer Invoice ${newInv.invoiceNumber} posted to Financial Sub-Ledger. Debit: SAR ${totalAmount.toLocaleString()} (${newInv.productService} • Qty ${qty} @ SAR ${uPrice.toLocaleString()})${isStockCredited ? ` • Stock In Credited (+${qty} units)` : ''}.`,
              amount: totalAmount,
              referenceId: newInv.invoiceNumber,
            };

            // If invoice is created as paid, also add payment entry to customer's payments sub-ledger
            let updatedPayments = c.payments || [];
            if (isFullyPaid || invoicePaidPortion > 0) {
              const paymentEntry: CustomerPaymentEntry = {
                id: 'pmt_inv_' + Date.now(),
                customerId: c.id,
                customerName: c.name,
                type: 'payment_in',
                amount: invoicePaidPortion,
                paymentDate: newInv.invoiceDate,
                paymentMethod: 'bank_transfer',
                referenceNumber: `PAY-${newInv.invoiceNumber.replace('INV-', '')}`,
                invoiceId: newInv.id,
                invoiceNumber: newInv.invoiceNumber,
                dnNumber: newInv.dnNumber,
                notes: `Direct settlement for Customer Invoice ${newInv.invoiceNumber}`,
                recordedBy: actor,
                timestamp,
              };
              updatedPayments = [paymentEntry, ...updatedPayments];
            }

            return {
              ...c,
              totalAmount: newTotal,
              totalBilled: newTotal,
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              outstandingBalance: newOutstanding,
              payments: updatedPayments,
              history: [historyEntry, ...(c.history || [])],
            };
          }
          return c;
        })
      );
    }

    logMasterAudit({
      action: 'INVOICE_CREATED',
      recordRef: newInv.invoiceNumber,
      customer: newInv.customerName,
      delta: `+SAR ${totalAmount.toLocaleString()}`,
      reason: `Customer Invoice ${newInv.invoiceNumber} created. Service: ${newInv.productService}. Qty: ${qty} x ${uPrice}. Total: SAR ${totalAmount}.${isStockCredited ? ` Stock In Verified (+${qty} units).` : ''}`,
      category: 'finance',
      approvedBy: actor,
    });

    showToast(
      isStockCredited ? 'Invoice Created & Stock In Credited' : 'Customer Invoice Created & Posted',
      isStockCredited
        ? `Invoice ${newInv.invoiceNumber} posted to Sub-Ledger (Debit: SAR ${totalAmount.toLocaleString()}) & +${qty} units credited to Main Inventory.`
        : `Invoice ${newInv.invoiceNumber} (Debit: SAR ${totalAmount.toLocaleString()}) posted to ${newInv.customerName}'s Financial Sub-Ledger.`,
      'success'
    );
    return newInv;
  };

  const verifyAndCreditCustomerInvoiceStockIn = (
    invoiceId: string,
    customQty?: number,
    notes?: string
  ): boolean => {
    const targetInv = customerInvoices.find((i) => i.id === invoiceId);
    if (!targetInv) {
      showToast('Invoice Not Found', 'Could not locate the requested customer invoice.', 'error');
      return false;
    }

    const qtyToCredit = Number(customQty || targetInv.quantity) || 1;
    const cleanDn = (targetInv.dnNumber || `DN-${targetInv.invoiceNumber.replace('INV-', '')}`).trim();
    const prodName = targetInv.productService || 'TLB (Truck Load Bulk)';
    const actor = activeRole ? `${activeRole.toUpperCase()} Warehouse/Finance Lead` : 'Finance & Inventory Officer';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 1. Execute Stock In to Main Inventory
    const movementId = executeStockIn({
      dnNumber: cleanDn,
      productName: prodName,
      quantity: qtyToCredit,
      unit: 'BAG',
      unitCost: targetInv.unitPrice || 14,
      sellingPrice: targetInv.unitPrice || 18,
      driverName: targetInv.driverName,
      vehiclePlate: targetInv.vehiclePlate,
      source: targetInv.customerName || 'Customer Invoice Verified Intake',
      performedBy: actor,
      notes: notes || `Verified & Credited Stock In from Customer Invoice ${targetInv.invoiceNumber} (DN: ${cleanDn}). Qty: +${qtyToCredit} units.`,
    });

    // 2. Mark Customer Invoice as Stock Credited
    setCustomerInvoices((prev) =>
      prev.map((item) =>
        item.id === invoiceId
          ? {
              ...item,
              stockCredited: true,
              stockCreditedQty: qtyToCredit,
              stockCreditedAt: timestamp,
              stockCreditedBy: actor,
              stockMovementId: movementId,
            }
          : item
      )
    );

    // 3. Append to Customer Sub-Ledger Audit History
    if (targetInv.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === targetInv.customerId) {
            const auditEntry: CustomerHistoryEntry = {
              id: 'ch_stock_' + Date.now(),
              timestamp,
              action: 'STOCK_CREDITED',
              performedBy: actor,
              details: `Stock In Verified & Credited (+${qtyToCredit} units of ${prodName}) against Invoice ${targetInv.invoiceNumber} (DN: ${cleanDn}).`,
              referenceId: targetInv.invoiceNumber,
            };
            return {
              ...c,
              history: [auditEntry, ...(c.history || [])],
            };
          }
          return c;
        })
      );
    }

    // 4. Log Master Audit
    logMasterAudit({
      action: 'STOCK_IN_VERIFIED',
      recordRef: `${targetInv.invoiceNumber} / ${cleanDn}`,
      customer: targetInv.customerName,
      delta: `+${qtyToCredit} Units Inward`,
      reason: `Verified & Credited Stock In from Customer Invoice ${targetInv.invoiceNumber}. +${qtyToCredit} units added to TLB Main Available Inventory.`,
      category: 'inventory',
      approvedBy: actor,
    });

    showToast(
      'Stock In Verified & Credited',
      `+${qtyToCredit} units of ${prodName} credited to Main Inventory for Invoice ${targetInv.invoiceNumber}.`,
      'success'
    );

    return true;
  };

  const updateCustomerInvoice = (id: string, updates: Partial<CustomerInvoice>) => {
    if (activeRole !== 'admin') {
      showToast('Access Denied', 'Only Admin users are authorized to edit customer invoices.', 'error');
      return;
    }
    setCustomerInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const qty = updates.quantity !== undefined ? Number(updates.quantity) : inv.quantity;
          const uPrice = updates.unitPrice !== undefined ? Number(updates.unitPrice) : inv.unitPrice;
          const totalAmount = qty * uPrice;
          const status = updates.paymentStatus || inv.paymentStatus;
          const paidAmount = updates.paidAmount !== undefined ? updates.paidAmount : (status === 'paid' ? totalAmount : (status === 'unpaid' ? 0 : inv.paidAmount || 0));
          const outstandingAmount = Math.max(0, totalAmount - paidAmount);

          return {
            ...inv,
            ...updates,
            quantity: qty,
            unitPrice: uPrice,
            totalAmount,
            paidAmount,
            outstandingAmount,
          };
        }
        return inv;
      })
    );
    showToast('Customer Invoice Updated', 'Changes saved and sub-ledger synchronized.', 'info');
  };

  const deleteCustomerInvoice = (id: string) => {
    if (!['admin', 'manager', 'gm', 'accountant'].includes(activeRole)) {
      showToast('Access Denied', 'Only authorized managerial and accounting staff can delete customer invoices.', 'error');
      return;
    }
    const target = customerInvoices.find((i) => i.id === id);
    if (!target) return;

    setCustomerInvoices((prev) => prev.filter((i) => i.id !== id));

    // Reverse balance from customer account if customer exists
    if (target.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === target.customerId) {
            const currentTotal = c.totalAmount || c.totalBilled || 0;
            const currentPaid = c.paidAmount || 0;
            const newTotal = Math.max(0, currentTotal - target.totalAmount);
            const newPaid = Math.max(0, currentPaid - (target.paidAmount || 0));
            const newOutstanding = Math.max(0, newTotal - newPaid);
            return {
              ...c,
              totalAmount: newTotal,
              totalBilled: newTotal,
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              outstandingBalance: newOutstanding,
            };
          }
          return c;
        })
      );
    }

    showToast('Customer Invoice Deleted', `Invoice ${target.invoiceNumber} removed from sub-ledger.`, 'info');
  };

  const addZatcaQrScan = (scan: Omit<ZatcaQrScan, 'id' | 'scannedAt'>): ZatcaQrScan => {
    const newScan: ZatcaQrScan = {
      id: 'scan_' + Date.now(),
      scannedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...scan,
    };
    setZatcaQrScans((prev) => [newScan, ...prev]);
    showToast('ZATCA QR Scanned & Logged', `Scan for "${newScan.sellerName || 'Invoice'}" recorded into database.`, 'success');
    return newScan;
  };

  const deleteZatcaQrScan = (id: string) => {
    if (!['admin', 'manager', 'gm', 'accountant'].includes(activeRole)) {
      showToast('Access Denied', 'Only authorized staff can delete ZATCA scan records.', 'error');
      return;
    }
    setZatcaQrScans((prev) => prev.filter((s) => s.id !== id));
    showToast('QR Scan Removed', 'QR scan audit record deleted.', 'info');
  };

  const addInvoiceStatusHistory = (history: Omit<InvoiceStatusHistory, 'id' | 'timestamp'>) => {
    const entry: InvoiceStatusHistory = {
      id: 'ish_' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...history,
    };
    setInvoiceStatusHistory((prev) => [entry, ...prev]);
  };

  const updateInvoiceStatus = (id: string, status: InvoiceStatus) => {
    const target = taxInvoices.find((inv) => inv.id === id);
    if (target) {
      addInvoiceStatusHistory({
        invoiceId: id,
        invoiceNumber: target.invoiceNumber,
        previousStatus: target.status,
        newStatus: status,
        changedBy: activeRole ? `${activeRole.toUpperCase()} Admin` : 'System Admin',
        reason: `Status updated to ${status.toUpperCase()}`,
        zatcaResponse: `ZATCA Compliance Gateway: Document status transitioned to ${status.toUpperCase()}.`,
      });
    }
    setTaxInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status } : inv)));
    showToast('Invoice Status Updated', `Status changed to ${status.toUpperCase()}`, 'info');
  };

  const updateCompanySettings = (settings: Partial<CompanySettings>) => {
    setCompanySettings((prev) => ({ ...prev, ...settings }));
    showToast('Settings Saved', 'Company profile and parameters updated.', 'success');
  };

  const addUser = (userData: Omit<SystemUser, 'id'>): SystemUser => {
    const newUser: SystemUser = {
      ...userData,
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      lastLogin: userData.lastLogin || new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setUsers((prev) => [newUser, ...prev]);
    showToast('User Created', `User ${newUser.name} added successfully with role ${newUser.role.toUpperCase()}`, 'success');
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<SystemUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    showToast('User Updated', 'User credentials and role permissions updated.', 'info');
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    showToast('User Removed', 'User has been deactivated and removed from system.', 'warning');
  };

  const exportDatabaseBackup = () => {
    const dump = {
      version: 'LogiFlow_v2.0_Enterprise',
      exportedAt: new Date().toISOString(),
      companySettings,
      trips,
      vehicles,
      drivers,
      warehouseItems,
      warehouseMovements,
      inboundDeliveryNotes,
      customers,
      saleOrders,
      expenses,
      salarySlips,
      taxInvoices,
      locations,
      masterAudits,
      approvalRequests,
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logiflow-enterprise-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup Exported', 'Full enterprise database snapshot downloaded.', 'success');
  };

  const importDatabaseBackup = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      if (!data.companySettings || !data.trips) {
        showToast('Import Failed', 'Invalid LogiFlow backup file format.', 'error');
        return false;
      }
      if (data.companySettings) setCompanySettings(data.companySettings);
      if (data.trips) setTrips(data.trips);
      if (data.vehicles) setVehicles(data.vehicles);
      if (data.drivers) setDrivers(data.drivers);
      if (data.warehouseItems) setWarehouseItems(data.warehouseItems);
      if (data.warehouseMovements) setWarehouseMovements(data.warehouseMovements);
      if (data.inboundDeliveryNotes) setInboundDeliveryNotes(data.inboundDeliveryNotes);
      if (data.customers) setCustomers(data.customers);
      if (data.saleOrders) setSaleOrders(data.saleOrders);
      if (data.expenses) setExpenses(data.expenses);
      if (data.salarySlips) setSalarySlips(data.salarySlips);
      if (data.taxInvoices) setTaxInvoices(data.taxInvoices);
      if (data.locations) setLocations(data.locations);
      if (data.masterAudits) setMasterAudits(data.masterAudits);
      if (data.approvalRequests) setApprovalRequests(data.approvalRequests);

      showToast('Database Restored', 'All tables populated from backup file.', 'success');
      return true;
    } catch {
      showToast('Import Error', 'Could not parse JSON backup file.', 'error');
      return false;
    }
  };

  const resetAllData = () => {
    setTrips(initialTrips);
    setVehicles(initialVehicles);
    setDrivers(initialDrivers);
    setWarehouseItems(initialWarehouseItems);
    setWarehouseMovements(initialWarehouseMovements);
    setInboundDeliveryNotes(initialInboundDeliveryNotes);
    setCustomers(initialCustomers);
    setSaleOrders(initialSaleOrders);
    setExpenses(initialExpenses);
    setSalarySlips(initialSalarySlips);
    setTaxInvoices(initialTaxInvoices);
    setCustomerInvoices(initialCustomerInvoices);
    setLocations(initialLocations);
    setCompanySettings(initialCompanySettings);
    setMasterAudits(initialMasterAudits);
    setApprovalRequests(initialApprovalRequests);
    setBrokerLoads(initialBrokerLoads);

    localStorage.clear();
    showToast('Workspace Cleared', 'All local records have been removed.', 'info');
  };

  // ==========================================
  // BROKER LOAD MANAGEMENT OPERATIONS
  // ==========================================

  const addBrokerLoad = (loadData: Omit<BrokerLoad, 'id' | 'createdAt' | 'updatedAt'>): BrokerLoad => {
    const newId = 'brk_' + Date.now();
    const dnNum = loadData.dnNumber?.trim() || `DN-BRK-${Math.floor(1000 + Math.random() * 9000)}`;
    const normalizedStops: BrokerDropLocation[] = (loadData.dropLocations || []).map((stop, idx) => ({
      ...stop,
      id: stop.id || `drop_${Date.now()}_${idx}`,
      stopNumber: idx + 1,
      status: stop.status || 'Pending',
    }));

    const newLoad: BrokerLoad = {
      ...loadData,
      id: newId,
      dnNumber: dnNum,
      dropLocations: normalizedStops,
      loadStatus: loadData.loadStatus || (loadData.assignedDriverId ? 'Assigned' : 'Pending'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBrokerLoads((prev) => [newLoad, ...prev]);

    try {
      logMasterAudit({
        action: 'TLB_SALE_RECORDED',
        category: 'dispatch',
        recordRef: newLoad.dnNumber,
        customer: newLoad.brokerName,
        item: newLoad.materialItem,
        quantity: newLoad.dropLocations.reduce((sum, s) => sum + (Number(s.deliveryQty) || 0), 0),
        reason: `Broker Load created for ${newLoad.brokerName} with ${newLoad.dropLocations.length} drop stop(s)`,
      });
    } catch {
      // ignore
    }

    showToast(
      language === 'ar' ? 'تم إضافة حمولة الوسيط بنجاح' : 'Broker Load Created',
      language === 'ar'
        ? `تم تسجيل الحمولة ${newLoad.dnNumber} لصالح ${newLoad.brokerName}`
        : `Load ${newLoad.dnNumber} registered for ${newLoad.brokerName} with ${newLoad.dropLocations.length} stops.`,
      'success'
    );

    return newLoad;
  };

  const updateBrokerLoad = (id: string, updates: Partial<BrokerLoad>) => {
    setBrokerLoads((prev) =>
      prev.map((load) => {
        if (load.id !== id) return load;

        const updated = {
          ...load,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        // If drops are updated, re-normalize stop numbers and check all-delivered
        if (updates.dropLocations) {
          updated.dropLocations = updates.dropLocations.map((d, i) => ({
            ...d,
            stopNumber: i + 1,
          }));
          const allDelivered =
            updated.dropLocations.length > 0 &&
            updated.dropLocations.every((s) => s.status === 'Delivered');
          if (allDelivered && updated.loadStatus !== 'Delivered') {
            updated.loadStatus = 'Delivered';
            updated.completedAt = updated.completedAt || new Date().toISOString();
          }
        }

        return updated;
      })
    );

    showToast(
      language === 'ar' ? 'تم تحديث الحمولة' : 'Broker Load Updated',
      language === 'ar' ? 'تم حفظ التعديلات بنجاح' : 'Load details and drop locations updated.',
      'info'
    );
  };

  const deleteBrokerLoad = (id: string) => {
    const target = brokerLoads.find((b) => b.id === id);
    setBrokerLoads((prev) => prev.filter((b) => b.id !== id));
    showToast(
      language === 'ar' ? 'تم حذف الحمولة' : 'Broker Load Deleted',
      target ? `Load #${target.dnNumber} removed.` : 'Load removed from system.',
      'warning'
    );
  };

  const assignBrokerDriverTruck = (
    id: string,
    driverId: string,
    truckPlate: string,
    tlbNo?: string
  ) => {
    const foundDriver = drivers.find((d) => d.id === driverId);
    setBrokerLoads((prev) =>
      prev.map((load) => {
        if (load.id !== id) return load;
        const newStatus = load.loadStatus === 'Pending' ? 'Assigned' : load.loadStatus;
        return {
          ...load,
          assignedDriverId: driverId,
          assignedDriverName: foundDriver?.name || driverId,
          assignedDriverPhone: foundDriver?.phone || '',
          assignedTruckPlate: truckPlate,
          assignedTruckTlbNo: tlbNo || load.assignedTruckTlbNo || 'TLB-AUTO',
          loadStatus: newStatus,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    showToast(
      language === 'ar' ? 'تم تعيين السائق والشاحنة' : 'Driver & Truck Assigned',
      language === 'ar'
        ? `تم إسناد الحمولة للسائق ${foundDriver?.name || driverId} على الشاحنة ${truckPlate}`
        : `Assigned to ${foundDriver?.name || driverId} on Truck ${truckPlate}.`,
      'success'
    );
  };

  const updateBrokerDropStatus = (
    loadId: string,
    stopId: string,
    status: BrokerDropStatus,
    extra?: { deliveredAt?: string; recipientName?: string; notes?: string }
  ) => {
    setBrokerLoads((prev) =>
      prev.map((load) => {
        if (load.id !== loadId) return load;

        let allDelivered = false;
        const updatedDrops = load.dropLocations.map((drop) => {
          if (drop.id === stopId) {
            return {
              ...drop,
              status,
              deliveredAt:
                status === 'Delivered'
                  ? extra?.deliveredAt || drop.deliveredAt || new Date().toLocaleString()
                  : drop.deliveredAt,
              recipientName: extra?.recipientName || drop.recipientName,
              notes: extra?.notes || drop.notes,
            };
          }
          return drop;
        });

        allDelivered = updatedDrops.length > 0 && updatedDrops.every((s) => s.status === 'Delivered');

        let newLoadStatus = load.loadStatus;
        let compAt = load.completedAt;

        if (allDelivered) {
          newLoadStatus = 'Delivered';
          compAt = compAt || new Date().toISOString();
          try {
            confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
          } catch {
            // ignore
          }
        } else if (status === 'In Transit' && (load.loadStatus === 'Pending' || load.loadStatus === 'Assigned')) {
          newLoadStatus = 'In Transit';
        }

        return {
          ...load,
          dropLocations: updatedDrops,
          loadStatus: newLoadStatus,
          completedAt: compAt,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    showToast(
      language === 'ar' ? 'تم تحديث نقطة التسليم' : 'Drop Stop Updated',
      language === 'ar'
        ? `الحالة الحالية للنقطة: ${status}`
        : `Drop status transitioned to "${status}".`,
      'info'
    );
  };

  const addBrokerDropLocation = (
    loadId: string,
    drop: Omit<BrokerDropLocation, 'id' | 'stopNumber'>
  ) => {
    setBrokerLoads((prev) =>
      prev.map((load) => {
        if (load.id !== loadId) return load;
        const nextNum = (load.dropLocations?.length || 0) + 1;
        const newDrop: BrokerDropLocation = {
          ...drop,
          id: 'drop_' + Date.now(),
          stopNumber: nextNum,
          status: drop.status || 'Pending',
        };
        return {
          ...load,
          dropLocations: [...(load.dropLocations || []), newDrop],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    showToast(
      language === 'ar' ? 'تمت إضافة نقطة التسليم' : 'Drop Location Added',
      language === 'ar' ? `تم إضافة النقطة: ${drop.dropLocation}` : `Added stop: ${drop.dropLocation}`,
      'success'
    );
  };

  const markBrokerLoadDelivered = (id: string) => {
    setBrokerLoads((prev) =>
      prev.map((load) => {
        if (load.id !== id) return load;
        const allDeliveredDrops = load.dropLocations.map((d) => ({
          ...d,
          status: 'Delivered' as BrokerDropStatus,
          deliveredAt: d.deliveredAt || new Date().toLocaleString(),
        }));
        return {
          ...load,
          loadStatus: 'Delivered',
          dropLocations: allDeliveredDrops,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      })
    );

    try {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      language === 'ar' ? 'تم إكمال وتوصيل الحمولة' : 'Broker Load Delivered',
      language === 'ar'
        ? 'تم تحديد كافة نقاط التوصيل كمسلمة بنجاح'
        : 'All drop stops marked as Delivered. Consignment cleared.',
      'success'
    );
  };

  const attachBrokerPdf = (id: string, fileDataUrl: string, fileName: string) => {
    setBrokerLoads((prev) =>
      prev.map((load) => {
        if (load.id !== id) return load;
        return {
          ...load,
          attachedPdfUrl: fileDataUrl,
          attachedPdfName: fileName,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    showToast(
      language === 'ar' ? 'تم إرفاق الملف' : 'PDF Slip Attached',
      language === 'ar' ? `تم حفظ ${fileName}` : `File ${fileName} attached to broker load.`,
      'success'
    );
  };

  // ==========================================
  // DRIVER LOAD REQUESTS LOGIC
  // ==========================================

  const addDriverLoadRequest = (
    requestData: Omit<DriverLoadRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt'>
  ): DriverLoadRequest => {
    const nextReqNumber = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();
    const newRequest: DriverLoadRequest = {
      ...requestData,
      id: 'req_' + Date.now(),
      requestNumber: nextReqNumber,
      status: 'Pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setDriverLoadRequests((prev) => [newRequest, ...prev]);

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    showToast(
      language === 'ar' ? 'تم تقديم طلب الحمولة' : 'Load Request Submitted',
      language === 'ar'
        ? `تم إرسال الطلب ${nextReqNumber} (${requestData.loadType}) بنجاح إلى شاشة الترحيل للموافقة.`
        : `Request ${nextReqNumber} for ${requestData.loadType} submitted to Dispatcher for approval.`,
      'success'
    );

    return newRequest;
  };

  const updateDriverLoadRequestStatus = (
    id: string,
    status: DriverLoadRequestStatus,
    reviewNotes?: string,
    reviewerName?: string
  ) => {
    const reviewer = reviewerName || (activeRole.toUpperCase() + ' Dispatcher');
    setDriverLoadRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          status,
          reviewNotes: reviewNotes || r.reviewNotes,
          reviewedBy: reviewer,
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      })
    );

    showToast(
      language === 'ar' ? 'تم تحديث حالة الطلب' : 'Request Status Updated',
      language === 'ar' ? `أصبح الطلب الآن: ${status}` : `Request status changed to ${status}.`,
      'info'
    );
  };

  const approveAndConvertDriverLoadRequest = (
    id: string,
    reviewerName?: string
  ): { success: boolean; tripId?: string; brokerLoadId?: string; error?: string } => {
    const req = driverLoadRequests.find((r) => r.id === id);
    if (!req) {
      return { success: false, error: 'Request not found' };
    }

    const reviewer = reviewerName || (activeRole.toUpperCase() + ' Dispatcher');
    const nowIso = new Date().toISOString();

    if (req.loadType === 'Company Load (TLB)') {
      // Create new Company Load (Trip)
      const nextTripNumber = `TRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const pickupLoc: LocationPoint = locations.find((l) =>
        l.name.toLowerCase().includes(req.pickupLocation.toLowerCase())
      ) || {
        id: 'loc_req_' + Date.now(),
        name: req.pickupLocation,
        city: 'Riyadh',
        lat: 24.6408,
        lng: 46.8225,
        address: req.pickupLocation,
      };

      const dropLoc: LocationPoint = locations.find((l) =>
        l.name.toLowerCase().includes(req.dropLocation.toLowerCase())
      ) || {
        id: 'loc_drop_' + Date.now(),
        name: req.dropLocation,
        city: 'Jeddah',
        lat: 21.4644,
        lng: 39.1672,
        address: req.dropLocation,
      };

      const driverObj = drivers.find((d) => d.id === req.driverId);
      const vehicleObj = vehicles.find((v) => v.plateNumber === req.truckNo || v.plateNumber.includes(req.truckNo));

      const newTrip: Trip = {
        id: 'trp_' + Date.now(),
        tripNumber: nextTripNumber,
        driverId: req.driverId,
        driverName: req.driverName,
        driverPhone: driverObj?.phone || '',
        vehicleId: vehicleObj?.id || 'veh_001',
        vehiclePlate: req.truckNo,
        vehicleType: 'trailer_30t',
        customerId: 'cust_' + Date.now(),
        customerName: req.customerCompanyName,
        companyName: req.customerCompanyName,
        itemName: 'Gypsum Mortar Premix (TLB Bulk)',
        quantity: req.tlbQuantity,
        uom: req.uom || 'Bags',
        origin: pickupLoc,
        destination: dropLoc,
        status: 'assigned',
        tripStep: 'loading',
        isOutsideCompanyLoad: false,
        loadType: 'gypsum',
        tlbNumber: req.truckNo,
        cargoType: 'industrial',
        price: 4800,
        cost: 450,
        driverTripRate: 550,
        departureTime: nowIso.replace('T', ' ').substring(0, 16),
        estimatedArrivalTime: new Date(Date.now() + 6 * 3600000).toISOString().replace('T', ' ').substring(0, 16),
        progressPercent: 20,
        slipStatus: 'not_submitted',
        deliveryNote: {
          dnNumber: `DN-${Date.now().toString().slice(-4)}`,
          issueDate: req.requestDate || nowIso.split('T')[0],
          expectedDelivery: new Date(Date.now() + 6 * 3600000).toISOString().replace('T', ' ').substring(0, 16),
          senderName: pickupLoc.name,
          senderAddress: pickupLoc.address,
          senderContact: '+966 12 422 9900',
          receiverName: req.customerCompanyName,
          receiverAddress: dropLoc.address,
          receiverContact: '+966 11 482 9900',
          items: [
            {
              id: 'itm_' + Date.now(),
              sku: req.truckNo,
              name: 'Gypsum Mortar Premix (TLB Bulk)',
              quantity: req.tlbQuantity,
              unit: req.uom || 'Bags',
              weightKg: req.tlbQuantity * 40,
              unitPrice: 20,
            },
          ],
          totalWeightKg: req.tlbQuantity * 40,
          totalVolumeCbm: 30,
          packagesCount: req.tlbQuantity,
          specialInstructions: req.notes || `Approved Driver Request #${req.requestNumber} for ${req.driverName}`,
          slipStatus: 'not_submitted',
        },
        notes: req.notes
          ? `[Approved from Driver Request ${req.requestNumber}] ${req.notes}`
          : `Created from Driver Request ${req.requestNumber}`,
      };

      setTrips((prev) => [newTrip, ...prev]);

      // Update request status to Approved & Assigned
      setDriverLoadRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'Assigned',
                assignedTripId: newTrip.id,
                reviewedBy: reviewer,
                reviewedAt: nowIso,
                reviewNotes: `Approved and converted to Trip #${nextTripNumber}.`,
                updatedAt: nowIso,
              }
            : r
        )
      );

      // Update driver status if needed
      if (req.driverId) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === req.driverId ? { ...d, status: 'loading' } : d))
        );
      }

      try {
        confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
      } catch {
        // ignore
      }

      showToast(
        language === 'ar' ? 'تمت الموافقة وتعيين الرحلة' : 'Request Approved & Dispatched',
        language === 'ar'
          ? `تم إنشاء الرحلة ${nextTripNumber} بنجاح للسائق ${req.driverName}`
          : `Trip #${nextTripNumber} created and assigned to ${req.driverName}.`,
        'success'
      );

      return { success: true, tripId: newTrip.id };
    } else {
      // Create Broker Load
      const newBrokerLoadId = 'brk_' + Date.now();
      const newDn = `DN-BRK-${Math.floor(1000 + Math.random() * 9000)}`;

      const newBrokerLoad: BrokerLoad = {
        id: newBrokerLoadId,
        dnNumber: newDn,
        slipDate: req.requestDate,
        brokerName: req.customerCompanyName,
        materialItem: `Broker Freight (TLB ${req.tlbQuantity} ${req.uom || 'Bags'})`,
        pickupLocation: req.pickupLocation,
        dropLocations: [
          {
            id: 'drop_' + Date.now(),
            stopNumber: 1,
            dropLocation: req.dropLocation,
            deliveryQty: req.tlbQuantity,
            unit: req.uom || 'BAG',
            status: 'Pending',
            recipientName: req.customerCompanyName,
            notes: req.notes,
          },
        ],
        assignedDriverId: req.driverId,
        assignedDriverName: req.driverName,
        assignedDriverPhone: drivers.find((d) => d.id === req.driverId)?.phone || '',
        assignedTruckPlate: req.truckNo,
        assignedTruckTlbNo: req.truckNo,
        freightAmount: 5200,
        brokerCommission: 520,
        loadStatus: 'Assigned',
        notes: req.notes
          ? `[Approved from Driver Request ${req.requestNumber}] ${req.notes}`
          : `Created from Driver Request ${req.requestNumber}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setBrokerLoads((prev) => [newBrokerLoad, ...prev]);

      // Update request status to Approved & Assigned
      setDriverLoadRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'Assigned',
                assignedBrokerLoadId: newBrokerLoadId,
                reviewedBy: reviewer,
                reviewedAt: nowIso,
                reviewNotes: `Approved and converted to Broker Load #${newDn}.`,
                updatedAt: nowIso,
              }
            : r
        )
      );

      try {
        confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
      } catch {
        // ignore
      }

      showToast(
        language === 'ar' ? 'تمت الموافقة وتعيين حمولة الوسيط' : 'Broker Request Approved',
        language === 'ar'
          ? `تم إنشاء حمولة الوسيط ${newDn} وإسنادها للسائق ${req.driverName}`
          : `Broker Load #${newDn} created and assigned to ${req.driverName}.`,
        'success'
      );

      return { success: true, brokerLoadId: newBrokerLoadId };
    }
  };

  const rejectDriverLoadRequest = (id: string, reason: string, reviewerName?: string) => {
    const reviewer = reviewerName || (activeRole.toUpperCase() + ' Dispatcher');
    const nowIso = new Date().toISOString();

    setDriverLoadRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Rejected',
              reviewNotes: reason,
              reviewedBy: reviewer,
              reviewedAt: nowIso,
              updatedAt: nowIso,
            }
          : r
      )
    );

    showToast(
      language === 'ar' ? 'تم رفض طلب الحمولة' : 'Load Request Rejected',
      language === 'ar' ? `سبب الرفض: ${reason}` : `Request rejected: ${reason}`,
      'warning'
    );
  };

  const deleteDriverLoadRequest = (id: string) => {
    const target = driverLoadRequests.find((r) => r.id === id);
    setDriverLoadRequests((prev) => prev.filter((r) => r.id !== id));
    showToast(
      language === 'ar' ? 'تم حذف الطلب' : 'Request Deleted',
      target ? `Request ${target.requestNumber} removed.` : 'Request removed.',
      'info'
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        language,
        setLanguage,
        t,
        isDark,
        setIsDark,
        searchQuery,
        setSearchQuery,
        activeRole,
        isAdmin,
        canEdit,
        canDelete,
        isViewOnlyRole,
        canPerformAction,
        selectedDriverId,
        setSelectedDriverId,
        trips,
        vehicles,
        drivers,
        warehouseItems,
        warehouseMovements,
        gypsumInventory,
        gypsumMovements,
        supplierInventory,
        inboundDeliveryNotes,
        customers,
        saleOrders,
        expenses,
        salarySlips,
        taxInvoices,
        locations,
        companySettings,
        users,
        masterAudits,
        approvalRequests,
        deleteMasterAudit,
        logMasterAudit,
        createApprovalRequest,
        processApprovalDecision,
        recordSensitiveChange,
        addTrip,
        updateTrip,
        updateTripStatus,
        advanceTripStep,
        startTripWithBarcode,
        submitTripSlip,
        clearTripSlip,
        confirmDriverLoading,
        confirmDriverDeliveryWithQty,
        inwardDriverReturnedStock,
        updateDriverStatus,
        deleteTrip,
        restoreTrip,
        duplicateTrip,
        adminUpdateTrip,
        createCompanyLoad,
        advanceCompanyLoadStage,
        inwardCompanyStock,
        createTruckLoad,
        updateTripLoadingStatus,
        managerModifyTrip,
        managerAddPostDeliveryTrip,
        managerCancelTrip,
        managerReopenTrip,
        managerClearDelivery,
        managerAttachSlip,
        getDriverTotalTripAmount,
        addDriver,
        updateDriver,
        addVehicle,
        updateVehicle,
        addWarehouseItem,
        updateWarehouseItem,
        deleteWarehouseItem,
        addWarehouseMovement,
        addGypsumItem,
        recordGypsumQtyIn,
        recordGypsumQtyOut,
        deleteGypsumMovement,
        resetGypsumInventory,
        addSupplierInventoryItem,
        updateSupplierInventoryItem,
        deleteSupplierInventoryItem,
        transferSupplierStock,
        executeStockIn,
        executeStockOutForSale,
        approveSaleOrder,
        executeRouteShift,
        shiftRouteToCustomer,
        confirmRouteShiftDelivery,
        inwardRouteShiftRemainingStock,
        addInboundDeliveryNote,
        updateInboundDeliveryNote,
        deleteInboundDeliveryNote,
        attachFilesInboundDeliveryNote,
        removeAttachedFileInboundDeliveryNote,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        recordCustomerPayment,
        addLocation,
        updateLocation,
        deleteLocation,
        createSaleOrder,
        addExpense,
        deleteExpense,
        updateSalaryStatus,
        createTaxInvoiceFromTrip,
        createCustomTaxInvoice,
        updateTaxInvoice,
        deleteTaxInvoice,
        updateInvoiceStatus,
        recordInvoicePayment,
        updateCompanySettings,
        addUser,
        updateUser,
        deleteUser,
        resetAllData,
        exportDatabaseBackup,
        exportStateJson: exportDatabaseBackup,
        importDatabaseBackup,
        importStateJson: importDatabaseBackup,
        zatcaQrScans,
        addZatcaQrScan,
        deleteZatcaQrScan,
        invoiceStatusHistory,
        addInvoiceStatusHistory,
        customerInvoices,
        addCustomerInvoice,
        updateCustomerInvoice,
        deleteCustomerInvoice,
        verifyAndCreditCustomerInvoiceStockIn,
        selectedCustomerInvoice,
        setSelectedCustomerInvoice,
        toasts,
        showToast,
        removeToast,
        selectedTripForDn,
        setSelectedTripForDn,
        selectedInvoice,
        setSelectedInvoice,
        selectedInboundDn,
        setSelectedInboundDn,        brokerLoads,
        addBrokerLoad,
        updateBrokerLoad,
        deleteBrokerLoad,
        assignBrokerDriverTruck,
        updateBrokerDropStatus,
        addBrokerDropLocation,
        markBrokerLoadDelivered,
        attachBrokerPdf,
        driverLoadRequests,
        addDriverLoadRequest,
        updateDriverLoadRequestStatus,
        approveAndConvertDriverLoadRequest,
        rejectDriverLoadRequest,
        deleteDriverLoadRequest,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

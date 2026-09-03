export type UserRole =
  | 'ceo'
  | 'gm'
  | 'manager'
  | 'admin'
  | 'dispatcher'
  | 'sales'
  | 'accountant'
  | 'warehouse'
  | 'warehouse_mgr'
  | 'driver';

export type Language = 'en' | 'ar';
export type ThemeMode = 'light' | 'dark';
export type Currency = 'SAR' | 'USD' | 'EUR' | 'AED';

export type TripStatus = 'draft' | 'assigned' | 'loading' | 'in_transit' | 'on_route' | 'unloading' | 'delayed' | 'arrived' | 'delivered' | 'cancelled';
export type TripStep = 'assigned' | 'loading' | 'on_route' | 'unloading' | 'delivered';
export type SlipStatus = 'not_submitted' | 'pending' | 'cleared' | 'needs_correction' | 'received';

export type VehicleType = 'trailer_30t' | 'dyna_10t' | 'reefer_chilled' | 'flatbed' | 'box_van';
export type DriverStatus = 'available' | 'loading' | 'on_route' | 'delivered' | 'resting' | 'off_duty';
export type CargoType = 'general' | 'chilled' | 'frozen' | 'fragile' | 'hazardous' | 'industrial';
export type PaymentMethod = 'cash' | 'card_mada' | 'mada' | 'bank_transfer' | 'credit_account';
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'reported' | 'cleared' | 'paid' | 'overdue' | 'accepted' | 'rejected';
export type InvoiceType = 'tax_invoice_b2b' | 'simplified_b2c';
export type ExpenseCategory = 'fuel' | 'maintenance' | 'toll_fees' | 'tolls' | 'tires' | 'insurance' | 'salaries' | 'warehouse_rent' | 'utilities' | 'other' | 'misc';

export type Expense = ExpenseRecord;

export interface LocationPoint {
  id: string;
  name: string;
  nameAr?: string;
  city: string;
  lat: number;
  lng: number;
  address: string;
  category?: 'hub' | 'port' | 'depot' | 'plant' | 'warehouse' | 'customer_site' | 'custom' | string;
  isCustom?: boolean;
  contactPerson?: string;
  phone?: string;
  notes?: string;
}

export interface CargoItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  weightKg: number;
  volumeCbm?: number;
  temperatureRequired?: string;
  unitPrice?: number;
}

export interface DeliveryNote {
  dnNumber: string;
  soNumber?: string;
  issueDate: string;
  expectedDelivery: string;
  actualDelivery?: string;
  senderName: string;
  senderAddress: string;
  senderContact: string;
  receiverName: string;
  receiverAddress: string;
  receiverContact: string;
  receiverVatNumber?: string;
  items: CargoItem[];
  totalWeightKg: number;
  totalVolumeCbm: number;
  packagesCount: number;
  specialInstructions?: string;
  receiverSignature?: string;
  podImageUrl?: string;
  podSignedAt?: string;
  slipStatus?: SlipStatus;
  slipImageUrl?: string;
  slipSubmittedAt?: string;
  slipClearedAt?: string;
  slipNotes?: string;
}

export interface Trip {
  id: string;
  tripNumber: string;
  inboundDnId?: string;
  dnNumber?: string;
  companyName?: string;
  customerNumber?: string;
  itemName?: string;
  itemNumber?: string;
  itemDescription?: string;
  quantity?: number;
  uom?: string;
  origin: LocationPoint;
  destination: LocationPoint;
  waypoints?: LocationPoint[];
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  customerId: string;
  customerName: string;
  status: TripStatus;
  tripStep?: TripStep;
  isOutsideCompanyLoad: boolean;
  partnerCompanyName?: string;
  partnerCommissionRate?: number;
  // Load Types & Truck Dispatcher Workflow
  loadType?: 'gypsum' | 'broker';
  tlbNumber?: string;
  brokerName?: string;
  supplierSource?: string;
  availableQuantity?: number;
  loadingQuantity?: number;
  loadingDate?: string;
  loadingStatus?: 'pending' | 'loading' | 'loaded' | 'completed' | 'going_to_supplier' | 'at_supplier';
  // Company Load & TLB Main Inventory Inward Workflow
  isCompanyLoad?: boolean;
  companyLoadId?: string; // e.g. "CL-0001"
  reservedDnNo?: string; // e.g. "DN-001"
  reservedItemSku?: string;
  reservedQuantity?: number; // e.g. 500
  companyLoadStage?: 'created' | 'driver_assigned' | 'supplier_loading' | 'returned_to_admin' | 'inward_completed';
  inwardReceivedAt?: string;
  inwardReceivedBy?: string;
  inwardNotes?: string;
  cargoType: CargoType;
  temperatureRequired?: string;
  deliveryNote: DeliveryNote;
  departureTime: string;
  estimatedArrivalTime: string;
  completedTime?: string;
  price: number;
  cost: number;
  driverTripRate?: number; // Manager configured driver trip rate (SAR)
  isRetroactive?: boolean; // If added after delivery by manager
  retroactiveReason?: string; // Reason for post-delivery creation
  retroactiveCreatedAt?: string; // When manager created the missing trip
  originalDeliveryTime?: string; // Preserved original delivery time
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  lastModifiedReason?: string;
  managerAuditRef?: string;
  notes?: string;
  currentLat?: number;
  currentLng?: number;
  currentSpeedKmH?: number;
  temperatureActual?: number;
  progressPercent: number;
  barcode?: string;
  startedByDriverAt?: string;
  startedByDriverId?: string;
  startedByDriverName?: string;
  // Unified Slip & Clearance Workflow
  slipStatus?: SlipStatus;
  slipImageUrl?: string;
  slipSubmittedAt?: string;
  slipClearedAt?: string;
  slipNotes?: string;
  attachedPdfDataUrl?: string;
  attachedPdfName?: string;
  // Driver Workflow & Quantity Verification
  driverWorkflowStage?: 'assigned' | 'loading' | 'loaded_confirmed' | 'on_route' | 'delivered' | 'pod_submitted' | 'completed';
  loadedQuantity?: number;
  loadingConfirmedAt?: string;
  loadingConfirmedBy?: string;
  deliveredQuantity?: number;
  shortExtraQuantity?: number; // delivered - loaded
  shortExtraReason?: string;
  shortExtraLoggedAt?: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  soBarcode?: string;
  dnBarcode?: string;
  podReceiverName?: string;
  podReceiverNotes?: string;
  podSignatureDataUrl?: string;
  podPhotoDataUrl?: string;
  outwardDeducted?: boolean;
  returnedStockQuantity?: number;
  returnedStockReason?: string;
  returnedStockInwarded?: boolean;
  // In-Transit Route Shift Flow (Same DN preserved)
  hasRouteShift?: boolean;
  routeShifts?: RouteShiftRecord[];
  originalQuantity?: number; // Original loaded e.g. 750
  directSaleQuantity?: number; // Total delivered to shifted customers e.g. 300
  remainingInwardQuantity?: number; // Remaining destined for warehouse inward e.g. 450
  routeShiftStage?: 'none' | 'shifted_in_transit' | 'partial_delivered' | 'inward_completed';
  // Customer Route Shift Tracking (Previous Customer -> New Customer)
  isCustomerShifted?: boolean;
  previousCustomerId?: string;
  previousCustomerName?: string;
  customerShiftNotification?: string;
  customerShiftHistory?: CustomerShiftHistoryEntry[];
  // Admin Operations & Audit
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
  duplicatedFromId?: string;
  editHistory?: LogisticsEditHistoryEntry[];
}

export interface CustomerShiftHistoryEntry {
  id: string;
  timestamp: string;
  effectiveDateTime: string;
  tripId: string;
  tripNumber: string;
  dnNumber: string;
  previousCustomerId: string;
  previousCustomerName: string;
  newCustomerId: string;
  newCustomerName: string;
  previousDriverId?: string;
  previousDriverName?: string;
  newDriverId?: string;
  newDriverName?: string;
  previousVehiclePlate?: string;
  newVehiclePlate?: string;
  reason: string;
  notes?: string;
  shiftedBy: string;
  auditId?: string;
}

export interface LogisticsEditHistoryEntry {
  id: string;
  timestamp: string;
  modifiedBy: string;
  modifiedByRole: string;
  reason: string;
  changesSummary: string;
  previousSnapshot?: Partial<Trip>;
}

export interface RouteShiftRecord {
  id: string; // e.g. "RS-0001"
  timestamp: string; // e.g. "18-Aug-2026 14:15:00"
  dnNumber: string; // Original DN No. e.g. "DN-001"
  tripId: string;
  tripNumber: string;
  driverId: string;
  driverName: string;
  vehiclePlate: string;
  shiftedBy: string; // e.g. "Dispatcher Ahmed / Operations"
  shiftedByRole: UserRole | string;
  reason: string; // e.g. "Customer urgent order on route"
  
  // Quantities
  originalQuantity: number; // e.g. 750
  shiftedQuantity: number; // e.g. 300
  remainingWarehouseQuantity: number; // e.g. 450
  
  // Destination shift
  originalDestination: LocationPoint;
  shiftedCustomer: {
    id: string;
    name: string;
    nameAr?: string;
    phone?: string;
    address?: string;
    city?: string;
    vatNumber?: string;
    crNumber?: string;
  };
  shiftedDestination: LocationPoint;
  
  // Delivery & Inward Progression
  shiftStatus: 'initiated' | 'customer_delivered' | 'warehouse_inwarded' | 'completed';
  unitPrice?: number; // e.g. 24.50 SAR
  totalSaleAmount?: number; // e.g. 7350 SAR
  podImageUrl?: string;
  podSignedAt?: string;
  podBarcodeScanned?: string;
  driverConfirmationNotes?: string;
  
  // Warehouse Arrival for remaining qty
  warehouseInwardQty?: number; // e.g. 450
  warehouseInwardedAt?: string;
  warehouseInwardedBy?: string;
  
  // GM / CEO Audit
  auditId?: string;
  auditHash: string; // SHA-256 seal
}

export type DocumentExpiryStatus = 'valid' | 'expiring_soon' | 'expired';

export interface DriverDocumentInfo {
  storagePath?: string; // Supabase Storage relative path, e.g. "driver-documents/iqama/drv_1.pdf"
  publicUrl?: string;   // Supabase Storage URL
  fileName: string;
  fileType: 'pdf' | 'image';
  fileSize?: number;
  fileDataUrl?: string; // Base64 data URL for offline rendering and instant preview
  uploadedAt?: string;
  bucket?: string;      // default: "driver-documents"
}

export interface Driver {
  id: string;
  employeeId?: string; // Driver ID / Employee ID e.g. "DRV-101"
  name: string;
  nameAr: string;
  phone: string;
  email: string;
  nationalIdOrIqama: string;

  // Truck Assignment
  assignedVehiclePlate?: string;
  assignedVehicleId?: string;

  // Iqama
  iqamaIssueDate?: string;
  iqamaExpiryDate?: string;
  iqamaDocument?: DriverDocumentInfo;
  iqamaStatus?: DocumentExpiryStatus;

  // Rukhsa (Driving Licence)
  licenseNumber: string;
  licenseCategory: string;
  licenseIssueDate?: string;
  licenseExpiry: string; // Expiry date
  rukhsaIssueDate?: string; // Alias for licenseIssueDate
  rukhsaExpiryDate?: string; // Alias for licenseExpiry
  rukhsaDocument?: DriverDocumentInfo;
  rukhsaStatus?: DocumentExpiryStatus;

  avatarUrl: string;
  status: DriverStatus;
  baseSalary: number;
  tripAllowanceRate: number;
  rating: number;
  totalTripsCompleted: number;
  safetyScore: number; // 0-100
  joinedDate: string;
  emergencyContact: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  truckModel: string;
  year: number;
  type: VehicleType;
  capacityTonnes: number;
  volumeCapacityCbm: number;
  isReefer: boolean;
  temperatureMin?: number;
  temperatureMax?: number;
  currentOdometerKm: number;
  fuelLevelPercent: number;
  status: 'active' | 'in_transit' | 'maintenance' | 'idle';
  assignedDriverName?: string;
  lastMaintenanceDate: string;
  nextMaintenanceDueKm: number;
  insuranceExpiryDate: string;
  currentLat: number;
  currentLng: number;
}

export interface SupplierStockTransfer {
  id: string;
  timestamp: string;
  transferredTo: 'TLB_MAIN_INVENTORY' | 'DISPATCH_LOAD' | 'DIRECT_SALE' | 'CUSTOMER_DELIVERY';
  quantity: number;
  driverId?: string;
  driverName?: string;
  vehiclePlate?: string;
  customerId?: string;
  customerName?: string;
  performedBy: string; // Who took it / authorized
  referenceDoc: string; // e.g. "LOAD-001" or "SAL-001" or "TRP-2026-001"
  notes?: string;
}

export interface SupplierInventoryItem {
  id: string; // e.g. "SUP-INV-001"
  supplier: string; // e.g. "ABC Supplier" or "El-Khayyat Gypsum Plant"
  supplierName?: string;
  tlbNo: string; // e.g. "TLB-001"
  dnNo: string; // e.g. "DN-001"
  soNo: string; // e.g. "SO-001"
  itemDescription: string; // e.g. "TLB" or "Gypsum Powder BAG Regular 40kg"
  itemNumber?: string; // e.g. "1290000001" or "TLB-MAIN-001"
  uom?: string; // e.g. "BAG" or "Tons"
  qtyReceived: number; // e.g. 750 (Original receiving record)
  qtyAvailable: number; // e.g. 750 (Decrements when allocated/taken)
  qtyAllocated?: number; // e.g. 0
  pdfName?: string; // Uploaded DN PDF e.g. "DN_001_ElKhayyat.pdf"
  pdfUrl?: string; // File URL or dataUrl
  attachedPdfDataUrl?: string;
  aiScanStatus: 'completed' | 'verified' | 'in_progress' | 'needs_review' | 'manual';
  barcode: string; // DN/SO barcode
  qrCode?: string;
  receivedBy: string; // Admin / Driver / Dispatcher
  receivedDate: string; // e.g. "22-Aug-2026"
  receivedTime?: string; // e.g. "09:30 AM"
  status: 'RECEIVED' | 'ALLOCATED' | 'PARTIAL_ALLOCATED' | 'TRANSFERRED_TO_MAIN' | 'IN_TRANSIT';
  linkedMainInventoryId?: string; // Link to TLB Main Inventory (WarehouseItem)
  transfers?: SupplierStockTransfer[];
  notes?: string;
  createdAt: string;
}

export interface WarehouseItem {
  id: string;
  sku: string;
  name: string;
  nameAr: string;
  category: string;
  aisle: string;
  rack: string;
  bay: string;
  quantityOnHand: number;
  reservedQuantity?: number; // Quantity reserved for active Company Loads
  openingStock?: number;
  totalStockIn?: number;
  totalStockOut?: number;
  minimumThreshold: number;
  unit: string;
  unitCost: number;
  sellingPrice: number;
  barcode: string;
  isTemperatureControlled: boolean;
  targetTemp?: string;
  lastStockCheck: string;
  dnNumber?: string; // Linked DN No. e.g. "DN-001"
  sourceSupplier?: string;
}

export interface GypsumInventoryItem {
  id: string;
  itemNumber: string; // e.g. "1290000001"
  itemDescription: string; // e.g. "Bags - Regular 40 kg Gypsum Powder"
  uom: string; // e.g. "BAG"
  openingStock: number; // e.g. 0
  qtyIn: number; // e.g. 750
  qtyOut: number; // e.g. 0
  availableStock: number; // calculated e.g. 750
  soNumber?: string; // e.g. "9100042352"
  dnNumber?: string; // e.g. "9010043436"
  notes?: string;
  sourceSupplier?: string;
}

export interface GypsumMovement {
  id: string;
  date: string; // e.g. "2026-08-13"
  type: 'IN' | 'OUT';
  itemNumber: string; // "1290000001"
  itemDescription: string; // "Bags - Regular 40 kg Gypsum Powder"
  uom: string; // "BAG"
  qtyIn: number;
  qtyOut: number;
  balance: number;
  soNumber?: string; // "9100042352"
  dnNumber?: string; // "9010043436"
  reference?: string; // "SO / DN / Manual"
  customer?: string;
  driverName?: string;
  tlbNumber?: string;
  notes?: string;
  pdfName?: string;
  pdfUrl?: string;
  createdAt?: string;
}

export type MovementType = 'IN' | 'OUT' | 'RESERVE' | 'RELEASE';

export interface WarehouseMovement {
  id: string;
  timestamp: string;
  date?: string;
  type: 'inbound_grn' | 'outbound_dispatch' | 'transfer' | 'adjustment' | 'stock_in' | 'stock_out_sale' | 'route_shift_sale';
  movementType?: MovementType; // 'IN' | 'OUT' | 'RESERVE' | 'RELEASE'
  itemId?: string;
  inventoryId?: string;
  dnNumber?: string; // e.g. "DN-001"
  saleId?: string; // e.g. "SAL-001"
  routeShiftId?: string; // e.g. "RS-0001"
  itemSku: string;
  itemName: string;
  productName?: string;
  quantity: number; // e.g. 200
  delta?: number; // +750 or -200
  previousQuantityOnHand?: number; // Opening Stock e.g. 750
  newQuantityOnHand?: number; // Remaining/Closing Stock e.g. 550
  referenceDoc: string; // GRN-#, DN-#, or SAL-#
  customerId?: string;
  customerName?: string;
  driverId?: string;
  driverName?: string;
  vehiclePlate?: string;
  barcode?: string;
  source?: string;
  performedBy: string; // e.g. "Admin / Hassan Al-Otaibi"
  status?: string; // 'Available', 'Completed', 'Approved'
  unitPrice?: number;
  totalAmount?: number;
  auditHash?: string; // SHA-256 seal for GM/CEO Master Audit
  notes?: string;
}

export type CustomerType = 'Corporate' | 'Direct Wholesale' | 'Retailer' | 'Contractor' | 'Government' | 'Individual';
export type CustomerPaymentTerms = 'COD' | 'Net 15' | 'Net 30' | 'Net 60' | 'Net 90' | 'Advance' | 'Immediate / Cash' | string;
export type CustomerStatus = 'active' | 'inactive' | 'suspended' | 'on_hold';

export interface CustomerPaymentEntry {
  id: string;
  customerId: string;
  customerName?: string;
  type: 'payment_in' | 'payment_out'; // Payment In (received from customer), Payment Out (refund/adjustment)
  amount: number;
  paymentDate: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque' | 'pos' | 'credit_card' | string;
  referenceNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  tripId?: string;
  tripNumber?: string;
  dnNumber?: string;
  notes?: string;
  recordedBy: string;
  timestamp: string;
}

export interface CustomerHistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  referenceId?: string;
  amount?: number;
}

export interface Customer {
  id: string;
  customerNumber: string; // e.g. 'CUST-1001' or '1100187'
  name: string;
  companyName?: string;
  nameAr?: string;
  contactPerson?: string;
  phone: string;
  mobileNumber?: string;
  email: string;
  address: string;
  city: string;
  crNumber?: string;
  vatNumber: string;
  customerType?: CustomerType | string;
  creditLimit: number;
  paymentTerms: CustomerPaymentTerms;
  status: CustomerStatus;
  
  // Financial & Load Aggregates
  totalLoads?: number;
  totalAmount?: number; // Total billed from trips & invoices
  paidAmount?: number; // Total payments received
  outstandingAmount?: number; // totalAmount - paidAmount
  
  // Backward compatibility fields
  outstandingBalance?: number;
  totalTrips?: number;
  totalSpent?: number;
  totalBilled?: number;
  deliveryNotesCount?: number;
  
  // Sub-ledgers
  payments?: CustomerPaymentEntry[];
  history?: CustomerHistoryEntry[];
}

export interface InboundAttachedFile {
  id: string;
  name: string;
  url?: string;
  type?: string;
  size?: string;
  uploadedAt: string;
}

export interface InboundDeliveryNote {
  id: string;
  dnNumber: string; // e.g. "9010043436"
  soNumber: string; // e.g. "9100042352"
  shippingRef: string; // e.g. "750"
  printDate: string; // e.g. "2026-08-13"
  orderDate: string; // e.g. "2026-08-13"
  shipFrom: string; // e.g. "El-Khayyat Gypsum Plant"
  salesman: string; // e.g. "sherief abdelkudous"
  companyName: string; // e.g. "مؤسسة صرح البنيان للتجارة"
  customerNumber: string; // e.g. "1100187"
  customerId?: string;
  itemNumber: string; // e.g. "1290000001"
  itemName: string; // e.g. "Gypsum Powder"
  productDescription: string; // e.g. "Gypsum Powder BAG – Regular 40 kg"
  uom: string; // e.g. "BAG"
  quantity: number; // e.g. 750
  inOutType?: 'IN' | 'OUT'; // e.g. 'IN' or 'OUT'
  status: 'received' | 'verified' | 'needs_review';
  warehouseLocation: string; // e.g. "Main Bay B-04 / Pallet Rack"
  // Unified Trip & Driver integration
  tripId?: string;
  driverId?: string;
  driverName?: string;
  driverContact?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  tripStatus?: TripStatus;
  tripStep?: TripStep;
  pickupLocation?: string;
  dropLocation?: string;
  slipStatus?: SlipStatus;
  slipImageUrl?: string;
  slipSubmittedAt?: string;
  slipClearedAt?: string;
  slipNotes?: string;
  dispatcher?: string;
  receiverSignature?: string;
  attachedPdfName?: string;
  attachedPdfDataUrl?: string;
  attachedFiles?: InboundAttachedFile[];
  importedAt: string;
  confidenceScore?: number;
  barcode?: string;
  needsReviewFields?: string[];
  notes?: string;
  // In-Transit Route Shift Flow (Same DN preserved)
  hasRouteShift?: boolean;
  routeShifts?: RouteShiftRecord[];
  originalQuantity?: number; // 750
  directSaleQuantity?: number; // 300
  remainingInwardQuantity?: number; // 450
  routeShiftStage?: 'none' | 'shifted_in_transit' | 'partial_delivered' | 'inward_completed';
}

export interface SaleItem {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number; // 0.15 for 15%
  totalWithVat: number;
}

export interface SaleOrder {
  id: string;
  orderNumber: string; // e.g. "SAL-001" or "POS-2026-0412"
  saleNumber?: string; // e.g. "SAL-001"
  date: string;
  customerId: string;
  customerName: string;
  customerVat?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'partial' | 'pending';
  salePoint: string;
  cashierName: string;
  invoiceId?: string;
  linkedDnNo?: string; // e.g. "DN-001"
  stockOutStatus?: 'executed' | 'pending' | 'cancelled';
  movementId?: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  approvedBy?: string;
  driverId?: string;
  driverName?: string;
  vehiclePlate?: string;
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  vehiclePlate?: string;
  driverName?: string;
  receiptNumber?: string;
  vendorName?: string;
  paidBy: string;
  paymentMethod: PaymentMethod;
  taxDeductible: boolean;
  vatAmount: number;
}

export interface DriverSalarySlip {
  id: string;
  driverId: string;
  driverName: string;
  month: string; // e.g. "2026-08"
  baseSalary: number;
  tripsCount: number;
  tripAllowances: number;
  overtimeBonus: number;
  deductions: number;
  netPayout: number;
  paymentStatus: 'pending' | 'approved' | 'paid';
  paidDate?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableAmount: number;
  vatRate: number; // 0.15
  vatAmount: number;
  totalWithVat: number;
}

export type InvoicePaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  customerNumber?: string;
  dnNumber?: string;
  productService: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number; // Quantity * Unit Price
  paymentStatus: InvoicePaymentStatus;
  paidAmount?: number;
  outstandingAmount?: number;
  notes?: string;
  driverName?: string;
  vehiclePlate?: string;
  pickupLocation?: string;
  dropLocation?: string;
  stockCredited?: boolean;
  stockCreditedQty?: number;
  stockCreditedAt?: string;
  stockCreditedBy?: string;
  stockMovementId?: string;
  createdAt?: string;
}

export interface TaxInvoice {
  id: string;
  invoiceNumber: string; // manual or auto
  invoiceType: InvoiceType;
  issueDate: string;
  invoiceDate?: string;
  issueTime: string;
  
  // Customer Connection
  customerId?: string;
  customerName?: string;
  customerNumber?: string;
  buyerName: string;
  buyerVatNumber?: string;
  buyerCrNumber?: string;
  buyerAddress: string;
  buyerPhone?: string;
  buyerEmail?: string;
  
  // Workflow Links (Customer → Load/DN → Driver → Truck → Route → Delivery → Invoice → Payment)
  tripId?: string;
  tripNumber?: string;
  dnNumber?: string; // DN / Load No.
  loadNumber?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  truckId?: string;
  truckNo?: string; // Truck No. / Plate
  vehiclePlate?: string;
  pickupLocation?: string;
  dropLocation?: string;
  productService?: string;
  quantity?: number;
  
  // Financial breakdown
  sellerName: string;
  sellerVatNumber: string;
  sellerCrNumber: string;
  sellerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  totalVat: number;
  grandTotal: number;
  totalAmount?: number;
  vatAmount?: number;
  currency: Currency;
  
  // Payment Status & Ledger
  status: InvoiceStatus;
  paymentStatus?: InvoicePaymentStatus;
  isPaid?: boolean;
  paidAmount?: number;
  outstandingAmount?: number;
  paymentHistory?: CustomerPaymentEntry[];
  notes?: string;
  
  // Compliance & Standard Invoicing
  zatcaQrPayload?: string;
  qrPayload?: string;
  zatcaUuid?: string;
  invoiceUuid?: string;
  zatcaStatusDescription?: string;
  statusDescription?: string;
  paymentTerms: string;
  dueDate: string;
}

export type ZatcaInvoice = TaxInvoice;

export interface ZatcaQrScan {
  id: string;
  scannedAt: string;
  scannedBy: string;
  sourceType: 'camera' | 'pdf' | 'image' | 'manual_base64';
  rawQrPayload: string;
  isValidTlv: boolean;
  sellerName: string;
  sellerVatNumber: string;
  timestamp: string;
  totalAmountWithVat: number;
  vatAmount: number;
  unitPrice?: number;
  discount?: number;
  vatPercent?: number;
  subtotal?: number;
  grandTotal?: number;
  invoiceHash?: string;
  digitalSignature?: string;
  publicKey?: string;
  matchedInvoiceId?: string;
  matchedInvoiceNumber?: string;
  status: 'verified' | 'tampered' | 'unverified';
  notes?: string;
}

export interface InvoiceStatusHistory {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  timestamp: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
  zatcaResponse?: string;
}

export interface CompanySettings {
  companyName: string;
  companyNameAr: string;
  vatNumber: string;
  crNumber: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  vatRate: number;
  defaultCurrency: Currency;
  defaultPaymentTerms: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  autoSyncSupabase: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  phone: string;
  lastLogin: string;
  status: 'active' | 'inactive';
  permissions: string[];
}

export type MasterAuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'ADD_INVENTORY'
  | 'EDIT_INVENTORY'
  | 'INVENTORY_TRANSFER'
  | 'INVENTORY_SALE'
  | 'INVENTORY_STOCK_IN'
  | 'INVENTORY_STOCK_OUT'
  | 'SALE_APPROVAL'
  | 'CUSTOMER_CREATION'
  | 'SALE_CREATION'
  | 'SALE_CANCELLATION'
  | 'SLIP_SCANNED'
  | 'TRIP_STARTED'
  | 'LOADING_CONFIRMED'
  | 'TRIP_DELIVERED'
  | 'TRIP_CREATED'
  | 'TRIP_MODIFIED'
  | 'TRIP_CANCELLED'
  | 'TRIP_REOPENED'
  | 'TRIP_POST_DELIVERY_ADDED'
  | 'TRIP_RATE_CHANGED'
  | 'COMPANY_LOAD_CREATED'
  | 'STOCK_RESERVED'
  | 'INWARD_STOCK_RECEIVED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_REASSIGNED'
  | 'ROUTE_CHANGED'
  | 'ROUTE_SHIFT_INITIATED'
  | 'ROUTE_SHIFT_DELIVERED'
  | 'ROUTE_SHIFT_INWARDED'
  | 'ROUTE_SHIFTED_CUSTOMER'
  | 'QUANTITY_CORRECTED'
  | 'DELIVERY_SLIP_ATTACHED'
  | 'DELIVERY_CLEARED'
  | 'DISPATCHER_APPROVAL'
  | 'MANAGER_APPROVAL'
  | 'GM_APPROVAL'
  | 'CEO_APPROVAL'
  | 'EXPENSE_ADDED'
  | 'EXPENSE_APPROVED'
  | 'SALARY_CHANGED'
  | 'MONTH_END'
  | 'USER_CREATED'
  | 'PERMISSION_CHANGED'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_EDITED'
  | 'CUSTOMER_DELETED'
  | 'INVOICE_CREATED'
  | 'INVOICE_EDITED'
  | 'INVOICE_DELETED'
  | 'PAYMENT_IN_RECORDED'
  | 'PAYMENT_OUT_RECORDED'
  | 'STOCK_IN_VERIFIED'
  | 'SUPPLIER_STOCK_RECEIVED'
  | 'SUPPLIER_STOCK_ALLOCATED'
  | 'TLB_INVENTORY_SYNC_RECOGNIZED'
  | 'TLB_LOAD_RECORDED'
  | 'TLB_INWARD_RECORDED'
  | 'TLB_SALE_RECORDED'
  | 'RECORD_DELETED'
  | 'RECORD_RESTORED'
  | 'RECORD_DUPLICATED';

export interface MasterAuditRecord {
  id: string; // e.g. "AUD-00001258"
  timestamp: string; // e.g. "17-Aug-2026 09:42:18"
  user: string; // e.g. "Dispatcher Ahmed"
  userRole: UserRole | string; // e.g. "dispatcher"
  action: MasterAuditAction;
  recordRef: string; // e.g. "SLIP-TLB-00451" or "TRP-2026-0901"
  customer?: string; // e.g. "ABC Trading"
  item?: string; // e.g. "TLB", "TLB SP", "Gypsum Powder"
  quantity?: number;
  oldValue?: string | number;
  newValue?: string | number;
  delta?: string | number;
  reason?: string;
  warehouse?: string; // e.g. "Main Warehouse"
  ipDevice?: string; // e.g. "192.168.1.104 (Chrome / macOS)"
  approvedBy?: string; // e.g. "Manager Ahmed"
  approvalDate?: string; // e.g. "17-Aug-2026 09:43:02"
  integrityHash: string; // SHA-256 seal
  immutable: true;
  category: 'inventory' | 'dispatch' | 'sales' | 'finance' | 'security' | 'governance';
}

export type ApprovalTier = 'manager' | 'gm' | 'ceo';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

export type DnImportMode = 'pdf' | 'picture' | 'excel' | 'barcode' | 'manual';

export interface ApprovalRequest {
  id: string; // e.g. "REQ-0021"
  title: string;
  description: string;
  category: 'operational' | 'inventory_delta' | 'credit_override' | 'discount' | 'salary' | 'expense' | 'policy';
  requestedBy: string;
  requestedByRole: UserRole;
  requestedAt: string;
  requiredTier: ApprovalTier;
  status: ApprovalStatus;
  recordRef?: string;
  item?: string;
  oldValue?: string | number;
  newValue?: string | number;
  delta?: string | number;
  reason: string;
  customer?: string;
  amount?: number;
  warehouse?: string;
  decisionBy?: string;
  decisionByRole?: UserRole;
  decisionAt?: string;
  decisionNotes?: string;
  auditId?: string;
}

// ==========================================
// BROKER LOAD MANAGEMENT TYPES
// ==========================================

export type BrokerLoadStatus = 'Pending' | 'Assigned' | 'In Transit' | 'Delivered' | 'Cancelled';
export type BrokerDropStatus = 'Pending' | 'In Transit' | 'Delivered';

export interface BrokerDropLocation {
  id: string;
  stopNumber: number;
  dropLocation: string;
  deliveryQty: number;
  unit?: string; // e.g. 'BAG', 'TON', 'PALLET', 'PCS'
  status: BrokerDropStatus;
  deliveredAt?: string;
  recipientName?: string;
  recipientPhone?: string;
  notes?: string;
}

export interface BrokerLoad {
  id: string;
  dnNumber: string; // DN No.
  slipDate: string; // Slip Date e.g. "2026-09-03"
  brokerName: string; // Broker Name
  materialItem: string; // Material / Item
  pickupLocation: string; // Pickup Location
  dropLocations: BrokerDropLocation[]; // Multiple drop locations / stops
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedTruckPlate?: string; // Assigned Truck
  assignedTruckTlbNo?: string; // TLB No.
  freightAmount: number; // Freight Amount (SAR)
  brokerCommission: number; // Broker Commission (SAR)
  loadStatus: BrokerLoadStatus;
  notes?: string;
  attachedPdfUrl?: string; // Base64 data URL or document link
  attachedPdfName?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ==========================================
// DRIVER LOAD REQUEST TYPES
// ==========================================

export type DriverRequestedLoadType = 'Broker Load' | 'Company Load (TLB)';
export type DriverLoadRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Assigned';

export interface DriverLoadRequest {
  id: string;
  requestNumber: string; // e.g. "LR-2026-001"
  requestDate: string; // YYYY-MM-DD
  driverId: string;
  driverName: string;
  truckNo: string;
  loadType: DriverRequestedLoadType;
  tlbQuantity: number;
  uom?: string; // e.g. 'Bags' | 'Tons' | 'Pallets'
  pickupLocation: string;
  dropLocation: string;
  customerCompanyName: string;
  notes?: string;
  status: DriverLoadRequestStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  assignedTripId?: string;
  assignedBrokerLoadId?: string;
}


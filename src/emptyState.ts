import type {
  ApprovalRequest,
  BrokerLoad,
  CompanySettings,
  Customer,
  CustomerInvoice,
  Driver,
  DriverLoadRequest,
  DriverSalarySlip,
  ExpenseRecord,
  GypsumInventoryItem,
  GypsumMovement,
  InboundDeliveryNote,
  InvoiceStatusHistory,
  LocationPoint,
  MasterAuditRecord,
  SaleOrder,
  SupplierInventoryItem,
  SystemUser,
  TaxInvoice,
  Trip,
  Vehicle,
  WarehouseItem,
  WarehouseMovement,
  ZatcaQrScan,
} from './types';

/**
 * Starting state for a fresh installation.
 *
 * The application ships with NO sample data. Every list starts empty and is
 * filled by real operations; company details are entered in Settings.
 *
 * This replaces the former `mockData.ts`, which seeded the app with invented
 * trucks, drivers, customers, trips and invoices. Demo records are indis-
 * tinguishable from real ones once they are in the database, so none are
 * created here.
 */

export const initialLocations: LocationPoint[] = [];
export const initialVehicles: Vehicle[] = [];
export const initialDrivers: Driver[] = [];
export const initialCustomers: Customer[] = [];
export const initialTrips: Trip[] = [];
export const initialWarehouseItems: WarehouseItem[] = [];
export const initialGypsumInventory: GypsumInventoryItem[] = [];
export const initialGypsumMovements: GypsumMovement[] = [];
export const initialSupplierInventory: SupplierInventoryItem[] = [];
export const initialWarehouseMovements: WarehouseMovement[] = [];
export const initialSaleOrders: SaleOrder[] = [];
export const initialExpenses: ExpenseRecord[] = [];
export const initialSalarySlips: DriverSalarySlip[] = [];
export const initialTaxInvoices: TaxInvoice[] = [];
export const initialUsers: SystemUser[] = [];
export const initialInboundDeliveryNotes: InboundDeliveryNote[] = [];
export const initialMasterAudits: MasterAuditRecord[] = [];
export const initialApprovalRequests: ApprovalRequest[] = [];
export const initialZatcaQrScans: ZatcaQrScan[] = [];
export const initialInvoiceStatusHistory: InvoiceStatusHistory[] = [];
export const initialCustomerInvoices: CustomerInvoice[] = [];
export const initialBrokerLoads: BrokerLoad[] = [];
export const initialDriverLoadRequests: DriverLoadRequest[] = [];

/**
 * Blank company profile.
 *
 * Filled in from Settings. The VAT rate defaults to the Saudi statutory 15%
 * and the currency to SAR — these are facts about the jurisdiction, not
 * sample data.
 *
 * Supabase credentials are NOT stored here: they come from the environment
 * (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) so they never end up in
 * browser storage or in a settings export.
 */
export const initialCompanySettings: CompanySettings = {
  companyName: '',
  companyNameAr: '',
  vatNumber: '',
  crNumber: '',
  address: '',
  city: '',
  country: 'Saudi Arabia',
  phone: '',
  email: '',
  website: '',
  vatRate: 0.15,
  defaultCurrency: 'SAR',
  defaultPaymentTerms: 'Net 30',
  supabaseUrl: '',
  supabaseAnonKey: '',
  autoSyncSupabase: false,
};

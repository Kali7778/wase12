import { Language, Currency } from '../types';

export const translations = {
  en: {
    // Navigation
    ceoPanel: 'CEO Executive Panel',
    gmPanel: 'GM Operations Panel',
    managerPanel: 'Manager Daily Panel',
    masterAudit: 'Master-Level Audit',
    approvalCenter: 'Approval Center',
    dashboard: 'Dashboard',
    trips: 'Trips & Delivery Notes',
    dispatcher: 'Truck Dispatcher',
    adminSlips: 'Delivery Slips',
    supplierInventory: 'TLB Supplier Inventory (Stock All)',
    drivers: 'Drivers & Fleet Management',
    warehouse: 'Inventory',
    sales: '+ Customer Sale (Stock Out)',
    customers: 'Customers & Accounts',
    expenses: 'Expenses & Salaries',
    invoices: 'ZATCA E-Invoice',
    driverPanel: 'Driver Mobile Panel',
    liveGps: 'Live GPS Tracking',
    reports: 'Reports & Analytics',
    users: 'Users & Roles',
    backupSync: 'Backup & Cloud Sync',
    settings: 'Settings',

    // Common
    appName: 'LogiFlow',
    appSubtitle: 'Enterprise Logistics & Fleet Management',
    searchPlaceholder: 'Search trips, DN, drivers, cargo, customers...',
    create: 'Create',
    add: 'Add New',
    save: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View Details',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    status: 'Status',
    date: 'Date',
    action: 'Actions',
    filter: 'Filter',
    all: 'All',
    total: 'Total',
    subtotal: 'Subtotal',
    vat: 'VAT (15%)',
    grandTotal: 'Grand Total',
    currency: 'SAR',
    downloadPdf: 'Download PDF',
    downloadJson: 'Download JSON',
    downloadCsv: 'Export CSV',
    activeRole: 'Active Role',
    switchRole: 'Switch Role Preview',

    // Dashboard metrics
    activeFleet: 'Active Fleet',
    tripsToday: 'Trips in Transit',
    onTimeRate: 'On-Time Rate',
    monthlyRevenue: 'Monthly Revenue',
    monthlyExpenses: 'Monthly Expenses',
    netProfit: 'Net Margin',
    pendingDispatch: 'Pending Loads',
    criticalAlerts: 'Operational Alerts',
    recentTrips: 'Recent Trips & Deliveries',
    quickActions: 'Quick Dispatch Actions',
    fleetDistribution: 'Fleet Status Breakdown',
    revenueExpenseTrends: 'Revenue vs Operating Cost Trends',

    // Trips
    newTrip: 'New Trip / Delivery Note',
    tripNumber: 'Trip ID',
    dnNumber: 'DN Number',
    origin: 'Origin',
    destination: 'Destination',
    driver: 'Assigned Driver',
    vehicle: 'Vehicle / Plate',
    customer: 'Customer',
    cargo: 'Cargo Type',
    weight: 'Weight (kg)',
    volume: 'Volume (m³)',
    progress: 'Progress',
    podStatus: 'Proof of Delivery',
    signPod: 'Sign POD',
    viewDn: 'View Delivery Note',
    outsideCompanyLoad: 'Outside 3rd Party Load',
    temperature: 'Temperature',

    // Statuses
    draft: 'Draft',
    assigned: 'Assigned',
    in_transit: 'In Transit',
    delayed: 'Delayed',
    arrived: 'Arrived',
    delivered: 'Delivered',
    cancelled: 'Cancelled',

    // Warehouse
    sku: 'SKU',
    itemName: 'Item Name',
    category: 'Category',
    location: 'Aisle / Rack / Bay',
    quantityOnHand: 'Stock Qty',
    minThreshold: 'Reorder Level',
    unitCost: 'Unit Cost',
    totalValue: 'Total Value',
    inboundMovement: 'Inbound Receipt (GRN)',
    outboundMovement: 'Outbound Pick & Dispatch',
    stockAlerts: 'Low Stock Warnings',

    // Sales & POS
    posTerminal: 'Sale Point / Express POS',
    cart: 'Order Cart',
    checkout: 'Complete Sale',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    cardMada: 'Mada / Card',
    bankTransfer: 'Bank Transfer',
    creditAccount: 'Customer Credit',

    // Invoices
    taxInvoiceB2b: 'Standard Tax Invoice (B2B)',
    simplifiedB2c: 'Simplified Tax Invoice (B2C)',
    zatcaCompliance: 'Standard Tax Invoicing System',
    zatcaQrCode: 'Tax Verification QR',
    zatcaStatus: 'Invoice Status',
    buyerVatNumber: 'Buyer VAT #',
    buyerCrNumber: 'Buyer CR #',
    sellerVatNumber: 'Seller VAT #',
    sellerCrNumber: 'Seller CR #',
    xmlView: 'UBL 2.1 XML Preview',

    // Live GPS
    liveGpsTitle: 'Real-Time Fleet & Corridor Tracking',
    speed: 'Speed',
    reeferTemp: 'Reefer Temp',
    fuelLevel: 'Fuel Level',
    geofenceStatus: 'Geofence Area',
    simulationSpeed: 'Simulation Speed',
  },
  ar: {
    // Navigation
    ceoPanel: 'لوحة الرئيس التنفيذي (CEO)',
    gmPanel: 'لوحة المدير العام (GM)',
    managerPanel: 'لوحة مدير العمليات (Manager)',
    masterAudit: 'سجل التدقيق الشامل (Master Audit)',
    approvalCenter: 'مركز الموافقات والاعتمادات',
    dashboard: 'لوحة التحكم',
    trips: 'الرحلات وإشعارات التسليم (DN)',
    dispatcher: 'لوحة ترحيل الشاحنات (Truck Dispatcher)',
    adminSlips: 'إشعارات التسليم',
    supplierInventory: 'مخزون المورّد TLB (Stock All)',
    drivers: 'السائقين وإدارة الأسطول',
    driverPanel: 'لوحة السائق المتنقلة',
    warehouse: 'المخزون',
    sales: '+ مبيعات العملاء (صرف مخزون)',
    customers: 'العملاء والحسابات',
    expenses: 'المصروفات والرواتب',
    invoices: 'الفوترة الإلكترونية (زاتكا)',
    liveGps: 'التتبع المباشر (GPS)',
    reports: 'التقارير والتحليلات',
    users: 'المستخدمين والصلاحيات',
    backupSync: 'النسخ الاحتياطي والمزامنة',
    settings: 'الإعدادات العامة',

    // Common
    appName: 'لوجي فلو',
    appSubtitle: 'نظام إدارة العمليات اللوجستية والأسطول المتكامل',
    searchPlaceholder: 'ابحث عن رحلة، سند تسليم، سائق، شحنة، عميل...',
    create: 'إنشاء',
    add: 'إضافة جديد',
    save: 'حفظ التعديلات',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    view: 'عرض التفاصيل',
    export: 'تصدير',
    import: 'استيراد',
    print: 'طباعة',
    status: 'الحالة',
    date: 'التاريخ',
    action: 'الإجراءات',
    filter: 'تصفية',
    all: 'الكل',
    total: 'الإجمالي',
    subtotal: 'المجموع قبل الضريبة',
    vat: 'ضريبة القيمة المضافة (15%)',
    grandTotal: 'المبلغ الإجمالي شامل الضريبة',
    currency: 'ر.س',
    downloadPdf: 'تحميل PDF',
    downloadJson: 'تحميل JSON',
    downloadCsv: 'تصدير CSV',
    activeRole: 'الدور الحالي',
    switchRole: 'تبديل الدور للتجربة',

    // Dashboard metrics
    activeFleet: 'الأسطول النشط',
    tripsToday: 'رحلات قيد التنفيذ',
    onTimeRate: 'نسبة الالتزام بالوقت',
    monthlyRevenue: 'إيرادات الشهر',
    monthlyExpenses: 'مصاريف التشغيل',
    netProfit: 'صافي الهامش',
    pendingDispatch: 'شحنات بانتظار الترحيل',
    criticalAlerts: 'تنبيهات العمليات',
    recentTrips: 'أحدث الرحلات والتسليمات',
    quickActions: 'إجراءات سريعة',
    fleetDistribution: 'توزيع حالات الأسطول',
    revenueExpenseTrends: 'مؤشرات الإيرادات مقابل تكاليف التشغيل',

    // Trips
    newTrip: 'رحلة جديدة / سند تسليم',
    tripNumber: 'رقم الرحلة',
    dnNumber: 'رقم سند التسليم (DN)',
    origin: 'نقطة الانطلاق',
    destination: 'وجهة التسليم',
    driver: 'السائق المعين',
    vehicle: 'المركبة / اللوحة',
    customer: 'العميل',
    cargo: 'نوع الشحنة',
    weight: 'الوزن (كجم)',
    volume: 'الحجم (م³)',
    progress: 'نسبة الإنجاز',
    podStatus: 'إثبات التسليم (POD)',
    signPod: 'توقيع إثبات التسليم',
    viewDn: 'عرض سند التسليم',
    outsideCompanyLoad: 'حمولة شركة خارجية (وساطة)',
    temperature: 'درجة الحرارة',

    // Statuses
    draft: 'مسودة',
    assigned: 'تم التعيين',
    in_transit: 'في الطريق',
    delayed: 'متأخر',
    arrived: 'وصل الموقع',
    delivered: 'تم التسليم بنجاح',
    cancelled: 'ملغي',

    // Warehouse
    sku: 'رمز الصنف (SKU)',
    itemName: 'اسم الصنف',
    category: 'التصنيف',
    location: 'الممر / الرف / الخانة',
    quantityOnHand: 'الكمية المتوفرة',
    minThreshold: 'حد إعادة الطلب',
    unitCost: 'تكلفة الوحدة',
    totalValue: 'إجمالي القيمة',
    inboundMovement: 'سند استلام بضاعة (GRN)',
    outboundMovement: 'سند صرف وترحيل',
    stockAlerts: 'تنبيهات نقص المخزون',

    // Sales & POS
    posTerminal: 'نقطة البيع السريع (POS)',
    cart: 'سلة الطلب',
    checkout: 'إتمام البيع وإصدار الفاتورة',
    paymentMethod: 'طريقة الدفع',
    cash: 'نقداً (كاش)',
    cardMada: 'بطاقة مدى / ائتمان',
    bankTransfer: 'تحويل بنكي',
    creditAccount: 'حساب آجل (عميل معتمد)',

    // Invoices
    taxInvoiceB2b: 'فاتورة ضريبية قياسية (B2B)',
    simplifiedB2c: 'فاتورة ضريبية مبسطة (B2C)',
    zatcaCompliance: 'نظام الفوترة الضريبية القياسي',
    zatcaQrCode: 'رمز الاستجابة السريع المعتمد',
    zatcaStatus: 'حالة الفاتورة',
    buyerVatNumber: 'الرقم الضريبي للمشتري',
    buyerCrNumber: 'السجل التجاري للمشتري',
    sellerVatNumber: 'الرقم الضريبي للمنشأة',
    sellerCrNumber: 'السجل التجاري للمنشأة',
    xmlView: 'معاينة ملف XML بصيغة UBL 2.1',

    // Live GPS
    liveGpsTitle: 'التتبع الحي للأسطول ومسارات النقل بالمملكة',
    speed: 'السرعة',
    reeferTemp: 'حرارة التبريد',
    fuelLevel: 'مستوى الوقود',
    geofenceStatus: 'نطاق السياج الجغرافي',
    simulationSpeed: 'سرعة المحاكاة',
  },
};

export function formatCurrency(amount?: number | null, currency: Currency = 'SAR', lang: Language = 'en'): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : (Number(amount) || 0);
  const symbol = lang === 'ar' 
    ? (currency === 'SAR' ? 'ر.س' : currency === 'AED' ? 'د.إ' : currency === 'EUR' ? '€' : '$')
    : currency;
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

export function formatNumber(val?: number | null, fallback = 0): string {
  const num = typeof val === 'number' && !isNaN(val) ? val : (Number(val) || fallback);
  return num.toLocaleString('en-US');
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}


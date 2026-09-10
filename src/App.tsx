import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { AuthGate } from './components/auth/AuthGate';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { DeliveryNoteModal } from './components/DeliveryNoteModal';
import { TaxInvoiceModal } from './components/TaxInvoiceModal';
import { InboundDeliveryNoteSlipModal } from './components/InboundDeliveryNoteSlipModal';
import { NewTripModal } from './components/NewTripModal';

// Views
import { AdminSlipsView } from './views/AdminSlipsView';
import { SlipReviewView } from './views/SlipReviewView';
import { DriverSlipsView } from './views/DriverSlipsView';
import { ReceivingView } from './views/ReceivingView';
import { StockOutView } from './views/StockOutView';
import { InventoryView } from './views/InventoryView';
import { ProductsView } from './views/ProductsView';
import { DashboardView } from './views/DashboardView';
import { TripsView } from './views/TripsView';
import { DispatcherView } from './views/DispatcherView';
import { DriverPanelView } from './views/DriverPanelView';
import { DriversFleetView } from './views/DriversFleetView';
import { SupplierInventoryView } from './views/SupplierInventoryView';
import { WarehouseView } from './views/WarehouseView';
import { CustomerInvoicesView } from './views/CustomerInvoicesView';
import { CustomersView } from './views/CustomersView';
import { ExpensesView } from './views/ExpensesView';
import { InvoicesView } from './views/InvoicesView';
import { LiveGpsView } from './views/LiveGpsView';
import { ReportsView } from './views/ReportsView';
import { UsersView } from './views/UsersView';
import { BackupSyncView } from './views/BackupSyncView';
import { SettingsView } from './views/SettingsView';
import { CeoPanelView } from './views/CeoPanelView';
import { GmPanelView } from './views/GmPanelView';
import { ManagerPanelView } from './views/ManagerPanelView';
import { ApprovalCenterView } from './views/ApprovalCenterView';
import { MasterAuditView } from './views/MasterAuditView';

const MainLayout: React.FC = () => {
  const { currentView, language } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNewTripModal, setShowNewTripModal] = useState(false);

  const renderActiveView = () => {
    switch (currentView) {
      case 'ceoPanel':
        return <CeoPanelView />;
      case 'gmPanel':
        return <GmPanelView />;
      case 'managerPanel':
        return <ManagerPanelView />;
      case 'approvalCenter':
        return <ApprovalCenterView />;
      case 'masterAudit':
        return <MasterAuditView />;
      case 'adminSlips':
        return <AdminSlipsView />;
      case 'slipReview':
        return <SlipReviewView />;
      case 'myDeliveries':
        return <DriverSlipsView />;
      case 'receiving':
        return <ReceivingView />;
      case 'stockOut':
        return <StockOutView />;
      case 'inventory':
        return <InventoryView />;
      case 'products':
        return <ProductsView />;
      case 'dashboard':
        return <DashboardView onOpenNewTripModal={() => setShowNewTripModal(true)} />;
      case 'trips':
        return <TripsView onOpenNewTripModal={() => setShowNewTripModal(true)} />;
      case 'dispatcher':
        return <DispatcherView onOpenNewTripModal={() => setShowNewTripModal(true)} />;
      case 'driverPanel':
        return <DriverPanelView />;
      case 'drivers':
        return <DriversFleetView />;
      case 'supplierInventory':
        return <SupplierInventoryView />;
      case 'warehouse':
        return <WarehouseView />;
      case 'sales':
        return <CustomerInvoicesView />;
      case 'customers':
        return <CustomersView />;
      case 'expenses':
        return <ExpensesView />;
      case 'invoices':
        return <InvoicesView />;
      case 'liveGps':
        return <LiveGpsView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UsersView />;
      case 'backupSync':
        return <BackupSyncView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onOpenNewTripModal={() => setShowNewTripModal(true)} />;
    }
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="flex min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200"
    >
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Header */}
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        {/*
          Dynamic View Canvas.

          The cap here (and the matching one inside Header) exists so the two
          stay aligned. It used to be max-w-7xl on the content alone while the
          header spanned the whole window, which left the content in a 1280px
          column with the header stretching past it on both sides, and the
          inventory table scrolling sideways next to space it could not use.

          1600px is wide enough for the register's eleven columns with room to
          spare, and narrow enough that a half-empty panel does not stretch
          across a 2560px monitor looking abandoned.
        */}
        <main className="flex-1 w-full min-w-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Global Modals & Overlays */}
      <DeliveryNoteModal />
      <TaxInvoiceModal />
      <InboundDeliveryNoteSlipModal />
      <NewTripModal
        isOpen={showNewTripModal}
        onClose={() => setShowNewTripModal(false)}
      />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppProvider>
          <MainLayout />
        </AppProvider>
      </AuthGate>
    </AuthProvider>
  );
}

export default App;

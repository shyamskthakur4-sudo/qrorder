import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import { ToastProvider } from './components/ui/Toast';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { NavigationPage } from './components/layout/Sidebar';
import { AuthModal } from './components/auth/AuthModal';
import { Button } from './components/ui/Button';
import { Sparkles, Lock, Loader2 } from 'lucide-react';

// Lazy loaded page components for optimal production bundle splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })));
const KitchenDisplayPage = lazy(() => import('./pages/KitchenDisplayPage').then(m => ({ default: m.KitchenDisplayPage })));
const TablesPage = lazy(() => import('./pages/TablesPage').then(m => ({ default: m.TablesPage })));
const MenuPage = lazy(() => import('./pages/MenuPage').then(m => ({ default: m.MenuPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const CouponsPage = lazy(() => import('./pages/CouponsPage').then(m => ({ default: m.CouponsPage })));
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage').then(m => ({ default: m.LoyaltyPage })));
const MarketingPage = lazy(() => import('./pages/MarketingPage').then(m => ({ default: m.MarketingPage })));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then(m => ({ default: m.InventoryPage })));
const StaffPage = lazy(() => import('./pages/StaffPage').then(m => ({ default: m.StaffPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage').then(m => ({ default: m.SuperAdminPage })));
const CustomerOrderingPage = lazy(() => import('./pages/CustomerOrderingPage').then(m => ({ default: m.CustomerOrderingPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-400 animate-in fade-in">
    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
    <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
      Loading CafeOS module...
    </p>
  </div>
);

const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <DashboardLayout
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
      >
        {/* Guest Preview Notification Banner if logged out */}
        {!isAuthenticated && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-300">Sandbox Preview Mode</h4>
                <p className="text-xs text-slate-300">
                  You are previewing CafeOS in demo mode. Sign in with owner credentials or staff PIN to manage live data.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setAuthModalOpen(true)}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Sign In / Staff PIN
            </Button>
          </div>
        )}

        {/* View Router with Suspense lazy loading */}
        <Suspense fallback={<PageLoadingFallback />}>
          {currentPage === 'dashboard' && (
            <DashboardPage onNavigate={(page) => setCurrentPage(page)} />
          )}
          {currentPage === 'orders' && <OrdersPage />}
          {currentPage === 'kitchen' && <KitchenDisplayPage />}
          {currentPage === 'tables' && (
            <TablesPage onNavigate={(page) => setCurrentPage(page)} />
          )}
          {currentPage === 'menu' && <MenuPage />}
          {currentPage === 'customers' && <CustomersPage />}
          {currentPage === 'coupons' && <CouponsPage />}
          {currentPage === 'loyalty' && <LoyaltyPage />}
          {currentPage === 'marketing' && <MarketingPage />}
          {currentPage === 'inventory' && <InventoryPage />}
          {currentPage === 'staff' && <StaffPage />}
          {currentPage === 'analytics' && <AnalyticsPage />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'super-admin' && <SuperAdminPage />}
          {currentPage === 'customer-ordering' && <CustomerOrderingPage />}
        </Suspense>
      </DashboardLayout>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BusinessProvider>
          <MainApp />
        </BusinessProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

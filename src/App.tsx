import React, { useState, useEffect, Suspense, lazy } from 'react';
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
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));

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

interface AppRouteInfo {
  isMenu: boolean;
  tableCode: string | null;
  isAuth: boolean;
  authMode: 'login' | 'signup' | 'magic-link' | 'staff-pin';
}

function parseAppRoute(): AppRouteInfo {
  if (typeof window === 'undefined') {
    return { isMenu: false, tableCode: null, isAuth: false, authMode: 'login' };
  }

  const path = window.location.pathname.toLowerCase();
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash.toLowerCase();

  // 1. Direct path /menu or /menu/:code
  const pathMatch = path.match(/^\/menu(?:\/([^\/?#]+))?/i);
  if (pathMatch) {
    return {
      isMenu: true,
      tableCode: pathMatch[1] ? decodeURIComponent(pathMatch[1]) : search.get('table'),
      isAuth: false,
      authMode: 'login',
    };
  }

  // 2. Query param ?menu=true or ?table=...
  if (search.has('menu') || search.has('table')) {
    return {
      isMenu: true,
      tableCode: search.get('table'),
      isAuth: false,
      authMode: 'login',
    };
  }

  // 3. Hash routing fallback #/menu or #/menu/:code
  const hashMatch = hash.match(/^#\/?menu(?:\/([^\/?#]+))?/i);
  if (hashMatch) {
    return {
      isMenu: true,
      tableCode: hashMatch[1] ? decodeURIComponent(hashMatch[1]) : null,
      isAuth: false,
      authMode: 'login',
    };
  }

  // 4. Auth paths (/login, /register, /signup, /auth)
  if (
    path.startsWith('/register') ||
    path.startsWith('/signup') ||
    search.get('auth') === 'register' ||
    hash.includes('register') ||
    hash.includes('signup')
  ) {
    return { isMenu: false, tableCode: null, isAuth: true, authMode: 'signup' };
  }

  if (
    path.startsWith('/login') ||
    path.startsWith('/auth') ||
    search.has('login') ||
    hash.includes('login')
  ) {
    return { isMenu: false, tableCode: null, isAuth: true, authMode: 'login' };
  }

  if (
    path.startsWith('/magic-link') ||
    search.has('magic-link') ||
    hash.includes('magic-link')
  ) {
    return { isMenu: false, tableCode: null, isAuth: true, authMode: 'magic-link' };
  }

  return { isMenu: false, tableCode: null, isAuth: false, authMode: 'login' };
}

const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [routeInfo, setRouteInfo] = useState<AppRouteInfo>(() => parseAppRoute());
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Listen to browser forward/backward buttons or pushState
  useEffect(() => {
    const handlePopState = () => {
      setRouteInfo(parseAppRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // When visiting /menu or scanning table QR, render ONLY the standalone Customer Menu
  // Do NOT render admin DashboardLayout, sidebar, topbar, or demo preview banners!
  if (routeInfo.isMenu) {
    return (
      <>
        <Suspense fallback={<PageLoadingFallback />}>
          <CustomerOrderingPage
            scannedTableCode={routeInfo.tableCode}
            isStandalone={true}
            onExitToAdmin={() => {
              window.history.pushState({}, '', '/login');
              setRouteInfo(parseAppRoute());
            }}
          />
        </Suspense>

        {/* Global Auth Modal for staff portal login if accessed */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </>
    );
  }

  // When visiting /login or /register, render the standalone AuthPage
  if (routeInfo.isAuth) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <AuthPage
          initialMode={routeInfo.authMode}
          onSuccess={() => {
            window.history.pushState({}, '', '/');
            setRouteInfo(parseAppRoute());
          }}
          onBackToDashboard={() => {
            window.history.pushState({}, '', '/');
            setRouteInfo(parseAppRoute());
          }}
        />
      </Suspense>
    );
  }

  const handleNavigate = (page: NavigationPage) => {
    if (page === 'customer-ordering') {
      window.history.pushState({}, '', '/menu');
      setRouteInfo(parseAppRoute());
    } else {
      setCurrentPage(page);
    }
  };

  return (
    <>
      <DashboardLayout
        currentPage={currentPage}
        onNavigate={handleNavigate}
      >
        {/* Guest Preview Notification Banner if logged out */}
        {!isAuthenticated && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-300">Sandbox Preview Mode</h4>
                <p className="text-xs text-slate-300">
                  You are previewing CafeOS in demo mode. Sign in with owner credentials or register your restaurant to manage live data.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.history.pushState({}, '', '/login');
                  setRouteInfo(parseAppRoute());
                }}
              >
                Sign In
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  window.history.pushState({}, '', '/register');
                  setRouteInfo(parseAppRoute());
                }}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Register with Email
              </Button>
            </div>
          </div>
        )}

        {/* View Router with Suspense lazy loading */}
        <Suspense fallback={<PageLoadingFallback />}>
          {currentPage === 'dashboard' && (
            <DashboardPage onNavigate={handleNavigate} />
          )}
          {currentPage === 'orders' && <OrdersPage />}
          {currentPage === 'kitchen' && <KitchenDisplayPage />}
          {currentPage === 'tables' && (
            <TablesPage onNavigate={handleNavigate} />
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
          {currentPage === 'customer-ordering' && (
            <CustomerOrderingPage
              isStandalone={false}
              onExitToAdmin={() => setCurrentPage('dashboard')}
            />
          )}
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

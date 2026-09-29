import React from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  QrCode,
  BookOpen,
  Users,
  Tag,
  Gift,
  Megaphone,
  Boxes,
  UserCheck,
  BarChart3,
  Settings,
  ShieldAlert,
  ChevronDown,
  Building2,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { StaffRole } from '../../types';
import { cn } from '../../lib/utils';

export type NavigationPage =
  | 'dashboard'
  | 'orders'
  | 'kitchen'
  | 'tables'
  | 'menu'
  | 'customers'
  | 'coupons'
  | 'loyalty'
  | 'marketing'
  | 'inventory'
  | 'staff'
  | 'analytics'
  | 'settings'
  | 'super-admin'
  | 'customer-ordering';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { role, switchRolePreview, logout, user } = useAuth();
  const { activeBusiness, activeBranch, branches, switchBranch, allBusinesses, switchBusiness } =
    useBusiness();

  const [showRoleMenu, setShowRoleMenu] = React.useState(false);
  const [showBranchMenu, setShowBranchMenu] = React.useState(false);

  const navItems: {
    id: NavigationPage;
    label: string;
    icon: React.ReactNode;
    roles: StaffRole[];
    badge?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'orders',
      label: 'Live Orders',
      icon: <UtensilsCrossed className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'SUPER_ADMIN'],
    },
    {
      id: 'kitchen',
      label: 'Kitchen Display (KDS)',
      icon: <ChefHat className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'KITCHEN', 'SUPER_ADMIN'],
      badge: 'LIVE',
    },
    {
      id: 'tables',
      label: 'Tables & QR Codes',
      icon: <QrCode className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'WAITER', 'SUPER_ADMIN'],
    },
    {
      id: 'menu',
      label: 'Digital Menu',
      icon: <BookOpen className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'customers',
      label: 'Customer CRM',
      icon: <Users className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'coupons',
      label: 'Coupons & Offers',
      icon: <Tag className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'loyalty',
      label: 'Loyalty Program',
      icon: <Gift className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'marketing',
      label: 'Marketing & Broadcast',
      icon: <Megaphone className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'inventory',
      label: 'Inventory & Stock',
      icon: <Boxes className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'staff',
      label: 'Staff & Roles',
      icon: <UserCheck className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: <BarChart3 className="w-5 h-5" />,
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      id: 'settings',
      label: 'Business Settings',
      icon: <Settings className="w-5 h-5" />,
      roles: ['OWNER', 'SUPER_ADMIN'],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => role === 'SUPER_ADMIN' || item.roles.includes(role)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-950/95 border-r border-slate-800/80 flex flex-col transition-transform duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/25 text-slate-950 font-black text-xl">
              C
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-100 font-['Outfit'] tracking-tight">
                  CafeOS
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeBusiness.subscription_plan}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
                {activeBusiness.name}
              </p>
            </div>
          </div>
        </div>

        {/* Business & Branch Selector */}
        <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/40 relative">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-400" /> Active Branch
            </span>
            <button
              onClick={() => setShowBranchMenu(!showBranchMenu)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              Switch
            </button>
          </div>

          <div
            onClick={() => setShowBranchMenu(!showBranchMenu)}
            className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{activeBranch.name}</p>
              <p className="text-[10px] text-slate-400">{activeBranch.city || 'Bangalore'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Branch Dropdown Popover */}
          {showBranchMenu && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Branches for {activeBusiness.name}
              </p>
              {branches.map((br) => (
                <button
                  key={br.id}
                  onClick={() => {
                    switchBranch(br.id);
                    setShowBranchMenu(false);
                  }}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer',
                    br.id === activeBranch.id
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  )}
                >
                  <span className="truncate">{br.name}</span>
                  {br.id === activeBranch.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              ))}

              <div className="pt-2 mt-2 border-t border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Switch Business (Multi-Tenant)
                </p>
                {allBusinesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      switchBusiness(b.id);
                      setShowBranchMenu(false);
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer',
                      b.id === activeBusiness.id
                        ? 'text-amber-400 font-bold'
                        : 'text-slate-400 hover:bg-slate-800'
                    )}
                  >
                    <span className="truncate">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer group',
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/30 font-semibold shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'transition-colors',
                      isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Super Admin Access Tab */}
          <div className="pt-3 mt-3 border-t border-slate-800/80">
            <button
              onClick={() => {
                onNavigate('super-admin');
                onClose();
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                currentPage === 'super-admin'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-purple-400/80 hover:text-purple-300 hover:bg-purple-950/20'
              )}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                <span>Super Admin SaaS Portal</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </button>
          </div>
        </nav>

        {/* Staff Role Switcher & User Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-2">
          {/* Quick Role Tester Bar */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-all cursor-pointer"
            >
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Role: <strong className="text-slate-200">{role}</strong>
              </span>
              <span className="text-[10px] text-amber-400 hover:underline">Change</span>
            </button>

            {showRoleMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50">
                <p className="text-[10px] text-slate-400 uppercase font-bold px-2 py-1">
                  Preview As Staff Role:
                </p>
                {(['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER', 'SUPER_ADMIN'] as StaffRole[]).map(
                  (r) => (
                    <button
                      key={r}
                      onClick={() => {
                        switchRolePreview(r);
                        setShowRoleMenu(false);
                      }}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer',
                        role === r
                          ? 'bg-amber-500/20 text-amber-300 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      )}
                    >
                      <span>{r}</span>
                      {role === r && <span className="text-amber-400 text-xs">Active</span>}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* User profile row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200 shrink-0">
                {user?.full_name ? user.full_name[0] : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user?.full_name || 'Cafe Staff'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

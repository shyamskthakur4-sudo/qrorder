import React from 'react';
import {
  Menu as MenuIcon,
  QrCode,
  Volume2,
  VolumeX,
  Radio,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useToast } from '../ui/Toast';
import { NavigationPage } from './Sidebar';
import { isSupabaseConfigured } from '../../lib/supabase';

interface TopbarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  onOpenMobileSidebar: () => void;
  onOpenNewOrderModal?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentPage,
  onNavigate,
  onOpenMobileSidebar,
  onOpenNewOrderModal,
}) => {
  const { activeBusiness, activeBranch, playKitchenAlert } = useBusiness();
  const { info } = useToast();
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  const getPageTitle = (page: NavigationPage): string => {
    switch (page) {
      case 'dashboard':
        return 'Owner Dashboard';
      case 'orders':
        return 'Live Order Management';
      case 'kitchen':
        return 'Kitchen Display System (KDS)';
      case 'tables':
        return 'Tables & QR Identifiers';
      case 'menu':
        return 'Digital Menu & Customizations';
      case 'customers':
        return 'Customer CRM & Profiles';
      case 'coupons':
        return 'Coupons & Promotional Rules';
      case 'loyalty':
        return 'Customer Loyalty & Rewards';
      case 'marketing':
        return 'Marketing Campaigns & Broadcasts';
      case 'inventory':
        return 'Inventory & Stock Management';
      case 'staff':
        return 'Staff & Role-based Access';
      case 'analytics':
        return 'Analytics, Sales & AOV';
      case 'settings':
        return 'Business & Branch Settings';
      case 'super-admin':
        return 'SaaS Platform Super-Admin';
      case 'customer-ordering':
        return 'Customer Mobile QR Order Simulation';
      default:
        return 'Overview';
    }
  };

  const handleTestAudio = () => {
    if (soundEnabled) {
      playKitchenAlert();
      info('Audio Alert Tested', 'Kitchen sound chime played successfully.');
    } else {
      setSoundEnabled(true);
      info('Sound Unmuted', 'Order notification chimes are now enabled.');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left Title & Mobile Menu Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-900 lg:hidden cursor-pointer"
          aria-label="Open sidebar"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            {getPageTitle(currentPage)}
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {activeBusiness.name} &bull; <span className="text-amber-400">{activeBranch.name}</span>
          </p>
        </div>
      </div>

      {/* Right Tools & Customer QR Launcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Realtime Supabase Indicator */}
        <div
          title={
            isSupabaseConfigured
              ? 'Connected to Supabase PostgreSQL Realtime'
              : 'Running in Local Multi-tenant Simulation Mode (Connect Supabase via .env)'
          }
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        >
          <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
          <span>{isSupabaseConfigured ? 'Supabase Realtime' : 'Live Sync Active'}</span>
        </div>

        {/* Audio Alert Toggle */}
        <button
          onClick={handleTestAudio}
          title={soundEnabled ? 'Kitchen sound is enabled (Click to test)' : 'Sound is muted'}
          className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-amber-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {/* Launch Customer QR Ordering Simulator */}
        <button
          onClick={() => onNavigate('customer-ordering')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 transition-all cursor-pointer shadow-sm hover:border-amber-400/50"
        >
          <QrCode className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Customer QR Menu</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </button>

        {/* Quick New Order Button */}
        {onOpenNewOrderModal && (
          <button
            onClick={onOpenNewOrderModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 transition-all cursor-pointer shadow-md shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New POS Order</span>
          </button>
        )}
      </div>
    </header>
  );
};

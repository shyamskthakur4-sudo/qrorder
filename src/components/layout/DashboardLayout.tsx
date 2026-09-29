import React, { useState } from 'react';
import { Sidebar, NavigationPage } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

interface DashboardLayoutProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  children: React.ReactNode;
  onOpenNewOrderModal?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
  onOpenNewOrderModal,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      {/* Desktop & Mobile Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col flex-1 min-h-screen">
        <Topbar
          currentPage={currentPage}
          onNavigate={onNavigate}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenNewOrderModal={onOpenNewOrderModal}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Navigation */}
        <MobileNav currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </div>
  );
};

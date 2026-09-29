import React from 'react';
import { LayoutDashboard, UtensilsCrossed, ChefHat, QrCode, BookOpen } from 'lucide-react';
import { NavigationPage } from './Sidebar';
import { cn } from '../../lib/utils';

interface MobileNavProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  const items: { id: NavigationPage; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'orders', label: 'Orders', icon: <UtensilsCrossed className="w-5 h-5" /> },
    { id: 'kitchen', label: 'KDS', icon: <ChefHat className="w-5 h-5" /> },
    { id: 'tables', label: 'Tables', icon: <QrCode className="w-5 h-5" /> },
    { id: 'menu', label: 'Menu', icon: <BookOpen className="w-5 h-5" /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2 flex items-center justify-around">
      {items.map((item) => {
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer',
              isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {item.icon}
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

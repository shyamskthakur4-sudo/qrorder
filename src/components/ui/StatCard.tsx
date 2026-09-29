import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  icon: React.ReactNode;
  iconColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  subtext,
  icon,
  iconColor = 'from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30',
  className,
}) => {
  return (
    <div
      className={cn(
        'relative bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-lg hover:border-slate-700/80 transition-all duration-200 overflow-hidden group',
        className
      )}
    >
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-300" />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1 tracking-tight font-['Outfit']">
            {value}
          </h3>
        </div>
        <div
          className={cn(
            'p-3 rounded-2xl border bg-gradient-to-br shadow-inner shrink-0',
            iconColor
          )}
        >
          {icon}
        </div>
      </div>

      {(change || subtext) && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/50 text-xs relative z-10">
          {change && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded-md',
                isPositive
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-rose-400 bg-rose-500/10'
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {change}
            </span>
          )}
          {subtext && <span className="text-slate-400 truncate">{subtext}</span>}
        </div>
      )}
    </div>
  );
};

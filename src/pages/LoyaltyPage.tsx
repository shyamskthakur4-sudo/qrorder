import React, { useState } from 'react';
import { Gift, Award, Sparkles, TrendingUp, Users, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { LoyaltyTier } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const LoyaltyPage: React.FC = () => {
  const { activeBusiness, customers } = useBusiness();

  // Tier criteria
  const tiers: {
    tier: LoyaltyTier;
    name: string;
    threshold: number;
    cashbackPercent: number;
    perk: string;
    badgeVariant: 'amber' | 'info' | 'purple' | 'success';
  }[] = [
    {
      tier: 'BRONZE',
      name: 'Bronze Diner',
      threshold: 0,
      cashbackPercent: 3,
      perk: '3% points on every dine-in order',
      badgeVariant: 'amber',
    },
    {
      tier: 'SILVER',
      name: 'Silver Connoisseur',
      threshold: 5000,
      cashbackPercent: 5,
      perk: '5% points + Free dessert on birthdays',
      badgeVariant: 'info',
    },
    {
      tier: 'GOLD',
      name: 'Gold VIP',
      threshold: 15000,
      cashbackPercent: 8,
      perk: '8% points + Priority seating + Chef specials',
      badgeVariant: 'purple',
    },
    {
      tier: 'PLATINUM',
      name: 'Platinum Elite',
      threshold: 30000,
      cashbackPercent: 12,
      perk: '12% points + Private tasting events & reserved tables',
      badgeVariant: 'success',
    },
  ];

  const totalPointsInCirculation = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Customer Loyalty & Tier Rewards
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Automated points accumulation on every QR order to drive repeat dining visits and higher lifetime spending.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{totalPointsInCirculation.toLocaleString()} Active Points</span>
          </div>
        </div>
      </div>

      {/* Tier Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((t) => (
          <Card key={t.tier} className="flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-start justify-between">
                <Badge variant={t.badgeVariant} size="sm">
                  {t.name}
                </Badge>
                <span className="font-extrabold text-amber-400 font-['Outfit'] text-base">
                  {t.cashbackPercent}% Back
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Min Spend Threshold
                </span>
                <p className="text-xl font-extrabold text-slate-100 font-['Outfit'] mt-0.5">
                  {formatCurrency(t.threshold, 'INR', '₹')}
                </p>
              </div>

              <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800 leading-relaxed">
                ✨ {t.perk}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
              Eligible Diners:{' '}
              <strong className="text-slate-200">
                {
                  customers.filter((c) => {
                    if (t.tier === 'PLATINUM') return c.total_spending >= 30000;
                    if (t.tier === 'GOLD') return c.total_spending >= 15000 && c.total_spending < 30000;
                    if (t.tier === 'SILVER') return c.total_spending >= 5000 && c.total_spending < 15000;
                    return c.total_spending < 5000;
                  }).length
                }
              </strong>
            </div>
          </Card>
        ))}
      </div>

      {/* Top Loyalty Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            <span>Top Loyalty Point Holders</span>
          </CardTitle>
          <CardDescription>Guests with the highest redeemable points balances</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">Guest</th>
                <th className="pb-3 font-semibold">Phone</th>
                <th className="pb-3 font-semibold">Total Spent</th>
                <th className="pb-3 font-semibold">Point Balance</th>
                <th className="pb-3 font-semibold">Cashback Value</th>
                <th className="pb-3 font-semibold">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customers
                .slice()
                .sort((a, b) => b.loyalty_points - a.loyalty_points)
                .map((cust) => {
                  const tier =
                    cust.total_spending >= 30000
                      ? 'PLATINUM'
                      : cust.total_spending >= 15000
                      ? 'GOLD'
                      : cust.total_spending >= 5000
                      ? 'SILVER'
                      : 'BRONZE';

                  return (
                    <tr key={cust.id} className="hover:bg-slate-800/30">
                      <td className="py-3 font-bold text-slate-100">{cust.name || 'Guest'}</td>
                      <td className="py-3 text-slate-400 font-mono">{cust.phone}</td>
                      <td className="py-3 font-semibold text-slate-200">
                        {formatCurrency(cust.total_spending, 'INR', '₹')}
                      </td>
                      <td className="py-3 font-bold font-mono text-amber-400">
                        {cust.loyalty_points} pts
                      </td>
                      <td className="py-3 text-emerald-400 font-semibold">
                        ₹{(cust.loyalty_points * 0.5).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            tier === 'PLATINUM'
                              ? 'success'
                              : tier === 'GOLD'
                              ? 'purple'
                              : tier === 'SILVER'
                              ? 'info'
                              : 'amber'
                          }
                          size="sm"
                        >
                          {tier}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

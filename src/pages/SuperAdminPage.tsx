import React from 'react';
import {
  ShieldAlert,
  Building2,
  DollarSign,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SuperAdminPage: React.FC = () => {
  const { allBusinesses, subscriptions, switchBusiness } = useBusiness();

  const totalMrr = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const totalArr = totalMrr * 12;
  const activeTenantsCount = allBusinesses.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Super Admin Protection Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-purple-950/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <ShieldAlert className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 font-['Outfit'] flex items-center gap-2">
              <span>CafeOS SaaS Platform Super-Admin</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                Platform Root
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-tenant global administration console for tracking subscriptions, tenants, and MRR.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="purple" size="md">
            {activeTenantsCount} Active Restaurant Tenants
          </Badge>
        </div>
      </div>

      {/* Super Admin SaaS Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Recurring (MRR)"
          value={formatCurrency(totalMrr, 'INR', '₹')}
          change="+34.5%"
          isPositive={true}
          subtext="From active subscriptions"
          icon={<DollarSign className="w-5 h-5 text-purple-400" />}
          iconColor="from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400"
        />
        <StatCard
          title="Annual Run Rate (ARR)"
          value={formatCurrency(totalArr, 'INR', '₹')}
          change="+41.2%"
          isPositive={true}
          subtext="Projected annualized ARR"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          iconColor="from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400"
        />
        <StatCard
          title="Active Tenant Businesses"
          value={activeTenantsCount}
          change="+2 this week"
          isPositive={true}
          subtext="Isolated Postgres RLS tenants"
          icon={<Building2 className="w-5 h-5 text-sky-400" />}
          iconColor="from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-400"
        />
        <StatCard
          title="Platform Uptime"
          value="99.98%"
          change="0 degraded incidents"
          isPositive={true}
          subtext="Supabase Cloud Realtime"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          iconColor="from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400"
        />
      </div>

      {/* Tenants & Subscriptions Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Restaurant Tenants & SaaS Plans</CardTitle>
          <CardDescription>
            Row-Level-Security isolated cafe organizations on CafeOS
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="py-3 px-4 font-semibold">Tenant Organization</th>
                <th className="py-3 px-4 font-semibold">Slug Identifier</th>
                <th className="py-3 px-4 font-semibold">Current Plan</th>
                <th className="py-3 px-4 font-semibold">Monthly Billing</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Onboarded</th>
                <th className="py-3 px-4 font-semibold text-right">Switch Org</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allBusinesses.map((biz) => {
                const sub = subscriptions.find((s) => s.business_id === biz.id);
                return (
                  <tr key={biz.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        {biz.name[0]}
                      </div>
                      <div>
                        <span>{biz.name}</span>
                        <span className="block text-[10px] text-slate-400 font-normal">{biz.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{biz.slug}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="amber" size="sm">
                        {biz.subscription_plan}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {sub ? formatCurrency(sub.amount, 'INR', '₹') : '₹2,999.00'}/mo
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={biz.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {biz.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{formatDate(biz.created_at)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => switchBusiness(biz.id)}
                      >
                        Enter Tenant
                      </Button>
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

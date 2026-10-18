import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Repeat,
  Store,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useBusiness } from '../context/BusinessContext';
import { formatCurrency } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';

export const AnalyticsPage: React.FC = () => {
  const { activeBusiness, activeBranch, branches, orders, customers, menuItems } = useBusiness();
  const [timeRange, setTimeRange] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK');

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalOrders = orders.length;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const repeatGuests = customers.filter((c) => c.visit_count > 1).length;
  const repeatRate =
    customers.length > 0 ? Math.round((repeatGuests / customers.length) * 100) : 0;

  // Real 7-day sales breakdown from actual orders
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailySales = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayName = daysOfWeek[d.getDay()];
    const dateStr = d.toISOString().split('T')[0];
    return { day: dayName, dateStr, revenue: 0, orders: 0 };
  });

  orders.forEach((ord) => {
    if (!ord.created_at) return;
    const ordDate = new Date(ord.created_at).toISOString().split('T')[0];
    const bucket = dailySales.find((b) => b.dateStr === ordDate);
    if (bucket) {
      bucket.revenue += Number(ord.total_amount) || 0;
      bucket.orders += 1;
    }
  });

  // Real multi-branch comparison
  const branchList = branches.length > 0 ? branches : [activeBranch];
  const branchComparison = branchList.map((b) => {
    const bOrders = orders.filter(
      (o) => o.branch_id === b.id || (!o.branch_id && b.id === activeBranch.id)
    );
    const bRev = bOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    return {
      branch: b.name,
      revenue: bRev,
      orders: bOrders.length,
      aov: bOrders.length > 0 ? Math.round(bRev / bOrders.length) : 0,
    };
  });

  // Calculate actual sold quantities per menu item from real orders
  const itemSalesMap = new Map<string, number>();
  orders.forEach((ord) => {
    (ord.items || []).forEach((it) => {
      const key = it.menu_item_id || it.item_name;
      itemSalesMap.set(key, (itemSalesMap.get(key) || 0) + (it.quantity || 1));
    });
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Business Analytics & Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track multi-branch sales velocity, customer acquisition, retention, and dish profitability.
          </p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          {(['DAY', 'WEEK', 'MONTH'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === r
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r === 'DAY' ? 'Today' : r === 'WEEK' ? 'Last 7 Days' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gross Revenue"
          value={formatCurrency(totalRevenue, activeBusiness.currency, activeBusiness.currency_symbol)}
          change={orders.length > 0 ? `${orders.length} orders recorded` : 'No orders yet'}
          isPositive={totalRevenue > 0}
          subtext="Real-time gross revenue"
          icon={<DollarSign className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          title="Total Orders Count"
          value={`${totalOrders} orders`}
          change={`${orders.filter((o) => o.status === 'COMPLETED').length} completed`}
          isPositive={true}
          subtext={totalOrders > 0 ? `Live order velocity` : 'Awaiting orders'}
          icon={<ShoppingBag className="w-5 h-5 text-sky-400" />}
          iconColor="from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-400"
        />
        <StatCard
          title="Average Order Value"
          value={formatCurrency(aov, activeBusiness.currency, activeBusiness.currency_symbol)}
          change={totalOrders > 0 ? 'Live average' : 'No data'}
          isPositive={true}
          subtext="Per dining ticket"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          iconColor="from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400"
        />
        <StatCard
          title="Repeat Guest Rate"
          value={`${repeatRate}%`}
          change={`${repeatGuests} repeat visitors`}
          isPositive={true}
          subtext="Based on CRM visitor count"
          icon={<Repeat className="w-5 h-5 text-purple-400" />}
          iconColor="from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400"
        />
      </div>

      {/* Main Charts: Revenue over time & Multi-Branch Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Revenue & Orders Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend Over Time</CardTitle>
            <CardDescription>Daily revenue flow for {activeBranch.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySales}>
                  <defs>
                    <linearGradient id="analyticsSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                    }}
                    formatter={(val: unknown) => [
                      formatCurrency(Number(val) || 0, 'INR', '₹'),
                      'Revenue',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fill="url(#analyticsSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Branch Comparison Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Multi-Branch Performance Comparison</CardTitle>
            <CardDescription>Revenue comparison across physical locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="branch" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                    }}
                    formatter={(val: unknown) => [
                      formatCurrency(Number(val) || 0, 'INR', '₹'),
                      'Gross Sales',
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Revenue Contributing Products */}
      <Card>
        <CardHeader>
          <CardTitle>Product Sales Performance</CardTitle>
          <CardDescription>Contribution to branch turnover from placed orders</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="py-3 px-4 font-semibold">Dish / Item</th>
                <th className="py-3 px-4 font-semibold">Unit Price</th>
                <th className="py-3 px-4 font-semibold">Quantity Sold</th>
                <th className="py-3 px-4 font-semibold">Gross Turnover</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {menuItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No menu items registered yet. Items and sales will appear here as orders are placed.
                  </td>
                </tr>
              ) : (
                menuItems.slice(0, 10).map((item) => {
                  const qtySold = itemSalesMap.get(item.id) || itemSalesMap.get(item.name) || 0;
                  const turnover = qtySold * item.price;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.is_veg ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        {item.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {formatCurrency(item.price, activeBusiness.currency, activeBusiness.currency_symbol)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                        {qtySold} units
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-amber-400">
                        {formatCurrency(turnover, activeBusiness.currency, activeBusiness.currency_symbol)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={qtySold > 0 ? 'success' : 'default'}>
                          {qtySold > 0 ? `${qtySold} Sold` : 'No Orders Yet'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

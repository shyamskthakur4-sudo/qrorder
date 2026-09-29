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
  Legend,
} from 'recharts';
import { useBusiness } from '../context/BusinessContext';
import { formatCurrency } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';

const DAILY_SALES = [
  { day: 'Mon', revenue: 24500, orders: 48 },
  { day: 'Tue', revenue: 28900, orders: 56 },
  { day: 'Wed', revenue: 26200, orders: 52 },
  { day: 'Thu', revenue: 31400, orders: 63 },
  { day: 'Fri', revenue: 42800, orders: 84 },
  { day: 'Sat', revenue: 58600, orders: 112 },
  { day: 'Sun', revenue: 52100, orders: 104 },
];

const BRANCH_COMPARISON = [
  { branch: 'Indiranagar Flagship', revenue: 142000, orders: 320, aov: 443 },
  { branch: 'Koramangala Roastery', revenue: 122500, orders: 260, aov: 471 },
];

export const AnalyticsPage: React.FC = () => {
  const { activeBusiness, activeBranch, orders, customers, menuItems } = useBusiness();
  const [timeRange, setTimeRange] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK');

  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrders = orders.length;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const repeatGuests = customers.filter((c) => c.visit_count > 1).length;
  const repeatRate =
    customers.length > 0 ? Math.round((repeatGuests / customers.length) * 100) : 0;

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
          value={formatCurrency(264500, activeBusiness.currency, activeBusiness.currency_symbol)}
          change="+22.4%"
          isPositive={true}
          subtext="vs previous 7 days"
          icon={<DollarSign className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          title="Total Orders Count"
          value="519 orders"
          change="+14.8%"
          isPositive={true}
          subtext="74 orders/day avg"
          icon={<ShoppingBag className="w-5 h-5 text-sky-400" />}
          iconColor="from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-400"
        />
        <StatCard
          title="Average Order Value"
          value={formatCurrency(aov || 510, activeBusiness.currency, activeBusiness.currency_symbol)}
          change="+7.2%"
          isPositive={true}
          subtext="Higher with add-ons"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          iconColor="from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400"
        />
        <StatCard
          title="Repeat Guest Rate"
          value={`${repeatRate}%`}
          change={`${repeatGuests} repeat visitors`}
          isPositive={true}
          subtext="High brand retention"
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
            <CardDescription>Daily revenue flow and dinner rush peaks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DAILY_SALES}>
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
                <BarChart data={BRANCH_COMPARISON}>
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
                      'Weekly Gross',
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
          <CardDescription>Detailed contribution to branch turnover</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="py-3 px-4 font-semibold">Dish / Item</th>
                <th className="py-3 px-4 font-semibold">Unit Price</th>
                <th className="py-3 px-4 font-semibold">Quantity Sold (7d)</th>
                <th className="py-3 px-4 font-semibold">Gross Turnover</th>
                <th className="py-3 px-4 font-semibold">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {menuItems.slice(0, 6).map((item, idx) => {
                const simulatedQty = [142, 88, 116, 95, 78, 110][idx] || 50;
                const turnover = simulatedQty * item.price;
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
                      {formatCurrency(item.price, 'INR', '₹')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      {simulatedQty} units
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-amber-400">
                      {formatCurrency(turnover, 'INR', '₹')}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="success">68% Margin</Badge>
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

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Repeat,
  Store,
  CreditCard,
  QrCode,
  Sparkles,
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

  // Filter out any mock/test artifacts
  const cleanOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o) return false;
      const num = (o.order_number || '').toUpperCase();
      if (num.includes('TEST') || o.id === '99999999-9999-9999-9999-999999999999') return false;
      return true;
    });
  }, [orders]);

  // Filter orders by active time range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return cleanOrders.filter((ord) => {
      if (!ord.created_at) return false;
      const d = new Date(ord.created_at);
      if (timeRange === 'DAY') {
        return d.toDateString() === now.toDateString();
      }
      if (timeRange === 'WEEK') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= sevenDaysAgo;
      }
      if (timeRange === 'MONTH') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [cleanOrders, timeRange]);

  // Key performance indicators derived exclusively from filtered real orders
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [filteredOrders]);

  const totalOrders = filteredOrders.length;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const completedCount = filteredOrders.filter((o) => o.status === 'COMPLETED').length;

  const repeatGuests = useMemo(() => {
    return customers.filter((c) => c.visit_count > 1).length;
  }, [customers]);

  const repeatRate = customers.length > 0 ? Math.round((repeatGuests / customers.length) * 100) : 0;

  // Chart data: Trend over time
  const salesTrendData = useMemo(() => {
    if (timeRange === 'DAY') {
      const slots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      return slots.map((slot) => {
        const slotHour = parseInt(slot.split(':')[0], 10);
        const matches = filteredOrders.filter((o) => {
          if (!o.created_at) return false;
          const h = new Date(o.created_at).getHours();
          return h >= slotHour && h < slotHour + 2;
        });
        const rev = matches.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        return { label: slot, revenue: rev, orders: matches.length };
      });
    }

    if (timeRange === 'WEEK') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayLabel = days[d.getDay()];
        const dateKey = d.toISOString().split('T')[0];
        const matches = filteredOrders.filter((o) => {
          if (!o.created_at) return false;
          return new Date(o.created_at).toISOString().split('T')[0] === dateKey;
        });
        const rev = matches.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        return { label: dayLabel, revenue: rev, orders: matches.length };
      });
    }

    // MONTH: 4 weekly buckets
    return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((wLabel, idx) => {
      const matches = filteredOrders.filter((o) => {
        if (!o.created_at) return false;
        const dom = new Date(o.created_at).getDate();
        const weekNum = Math.min(Math.floor((dom - 1) / 7), 3);
        return weekNum === idx;
      });
      const rev = matches.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      return { label: wLabel, revenue: rev, orders: matches.length };
    });
  }, [filteredOrders, timeRange]);

  // Chart data: Multi-branch comparison or Payment Method breakdown
  const hasMultipleBranches = branches.length > 1;

  const branchComparison = useMemo(() => {
    if (!hasMultipleBranches) return [];
    return branches.map((b) => {
      const bOrders = filteredOrders.filter((o) => o.branch_id === b.id);
      const bRev = bOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      return {
        branch: b.name,
        revenue: bRev,
        orders: bOrders.length,
      };
    });
  }, [branches, filteredOrders, hasMultipleBranches]);

  // Channel & Payment Breakdown (when single branch)
  const paymentBreakdown = useMemo(() => {
    const paymentMap: Record<string, { label: string; count: number; total: number }> = {
      UPI: { label: 'UPI / QR Pay', count: 0, total: 0 },
      CASH: { label: 'Cash at Counter', count: 0, total: 0 },
      CARD: { label: 'Debit / Credit Card', count: 0, total: 0 },
    };

    filteredOrders.forEach((o) => {
      const method = (o.payment_method || 'UPI').toUpperCase();
      if (!paymentMap[method]) {
        paymentMap[method] = { label: method, count: 0, total: 0 };
      }
      paymentMap[method].count += 1;
      paymentMap[method].total += Number(o.total_amount) || 0;
    });

    return Object.values(paymentMap).filter((p) => p.count > 0);
  }, [filteredOrders]);

  // Product sales analysis: only dishes that actually have orders
  const soldProducts = useMemo(() => {
    const salesMap = new Map<string, { item_name: string; qty: number; turnover: number; is_veg: boolean; price: number }>();

    filteredOrders.forEach((ord) => {
      (ord.items || []).forEach((it) => {
        const itemKey = it.menu_item_id || it.item_name;
        const existing = salesMap.get(itemKey);
        const matchMenuItem = menuItems.find((m) => m.id === it.menu_item_id || m.name === it.item_name);

        const qty = it.quantity || 1;
        const price = it.unit_price || matchMenuItem?.price || 0;
        const total = it.total_price || price * qty;
        const isVeg = matchMenuItem ? matchMenuItem.is_veg : true;

        if (existing) {
          existing.qty += qty;
          existing.turnover += total;
        } else {
          salesMap.set(itemKey, {
            item_name: it.item_name,
            qty,
            turnover: total,
            is_veg: isVeg,
            price,
          });
        }
      });
    });

    return Array.from(salesMap.values()).sort((a, b) => b.turnover - a.turnover);
  }, [filteredOrders, menuItems]);

  const currencySymbol = activeBusiness.currency_symbol || '₹';
  const currency = activeBusiness.currency || 'INR';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Business Analytics & Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time sales velocity, guest acquisition, and product turnover.
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
          value={formatCurrency(totalRevenue, currency, currencySymbol)}
          change={totalOrders > 0 ? `${totalOrders} orders in period` : 'No orders in period'}
          isPositive={totalRevenue > 0}
          subtext="Actual gross billing"
          icon={<DollarSign className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          title="Total Orders Count"
          value={`${totalOrders} orders`}
          change={totalOrders > 0 ? `${completedCount} completed` : 'Awaiting orders'}
          isPositive={totalOrders > 0}
          subtext={totalOrders > 0 ? 'Live ticket volume' : 'No tickets in period'}
          icon={<ShoppingBag className="w-5 h-5 text-sky-400" />}
          iconColor="from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-400"
        />
        <StatCard
          title="Average Order Value"
          value={formatCurrency(aov, currency, currencySymbol)}
          change={totalOrders > 0 ? 'Live average' : 'Awaiting data'}
          isPositive={aov > 0}
          subtext="Per dining ticket"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          iconColor="from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400"
        />
        <StatCard
          title="Repeat Guest Rate"
          value={`${repeatRate}%`}
          change={customers.length > 0 ? `${repeatGuests} repeat visitors` : 'No CRM visitors'}
          isPositive={repeatRate > 0}
          subtext="Based on CRM visitor count"
          icon={<Repeat className="w-5 h-5 text-purple-400" />}
          iconColor="from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend Over Time</CardTitle>
            <CardDescription>
              {timeRange === 'DAY'
                ? `Hourly breakdown for today (${activeBranch.name})`
                : timeRange === 'WEEK'
                ? `Daily revenue for the last 7 days`
                : `Weekly revenue distribution this month`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalRevenue === 0 ? (
              <div className="h-[280px] w-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <BarChart3 className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Sales in Selected Period</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Revenue will plot automatically as diners place orders via table QR code or counter POS.
                </p>
              </div>
            ) : (
              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrendData}>
                    <defs>
                      <linearGradient id="analyticsSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) =>
                        val === 0
                          ? '0'
                          : val >= 1000
                          ? `${currencySymbol}${Math.round(val / 1000)}k`
                          : `${currencySymbol}${val}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                      }}
                      formatter={(val: unknown) => [
                        formatCurrency(Number(val) || 0, currency, currencySymbol),
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
            )}
          </CardContent>
        </Card>

        {/* Multi-Branch Performance OR Payment Channel Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>
              {hasMultipleBranches ? 'Multi-Branch Performance' : 'Payment Method Distribution'}
            </CardTitle>
            <CardDescription>
              {hasMultipleBranches
                ? 'Revenue comparison across active locations'
                : 'Settlement channel breakdown for placed orders'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasMultipleBranches ? (
              branchComparison.every((b) => b.revenue === 0) ? (
                <div className="h-[280px] w-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Store className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No Branch Sales Yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Multi-branch revenue comparisons will appear here as orders are placed.
                  </p>
                </div>
              ) : (
                <div className="h-[280px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="branch" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) =>
                          val === 0
                            ? '0'
                            : val >= 1000
                            ? `${currencySymbol}${Math.round(val / 1000)}k`
                            : `${currencySymbol}${val}`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '12px',
                        }}
                        formatter={(val: unknown) => [
                          formatCurrency(Number(val) || 0, currency, currencySymbol),
                          'Gross Sales',
                        ]}
                      />
                      <Bar dataKey="revenue" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            ) : paymentBreakdown.length === 0 ? (
              <div className="h-[280px] w-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <CreditCard className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Payment Data</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Breakdown by UPI, Card, and Cash will automatically appear as guests settle bills.
                </p>
              </div>
            ) : (
              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) =>
                        val === 0
                          ? '0'
                          : val >= 1000
                          ? `${currencySymbol}${Math.round(val / 1000)}k`
                          : `${currencySymbol}${val}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                      }}
                      formatter={(val: unknown) => [
                        formatCurrency(Number(val) || 0, currency, currencySymbol),
                        'Settlement Total',
                      ]}
                    />
                    <Bar dataKey="total" fill="#a855f7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Revenue Contributing Products */}
      <Card>
        <CardHeader>
          <CardTitle>Product Sales Performance</CardTitle>
          <CardDescription>Ranked dishes by volume and revenue for the selected period</CardDescription>
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
              {soldProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <ShoppingBag className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-medium text-slate-300">No dish sales recorded yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Menu items will be ranked here by sales volume and turnover once customer orders are placed.
                    </p>
                  </td>
                </tr>
              ) : (
                soldProducts.slice(0, 10).map((prod, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            prod.is_veg ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        {prod.item_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {formatCurrency(prod.price, currency, currencySymbol)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                        {prod.qty} {prod.qty === 1 ? 'unit' : 'units'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-amber-400">
                        {formatCurrency(prod.turnover, currency, currencySymbol)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="success">
                          {prod.qty} Sold
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

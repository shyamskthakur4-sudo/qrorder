import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  Plus,
  QrCode,
  Flame,
  CheckCircle,
  AlertCircle,
  Building,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useBusiness } from '../context/BusinessContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { NavigationPage } from '../components/layout/Sidebar';
import { BusinessOnboardingModal } from '../components/onboarding/BusinessOnboardingModal';

interface DashboardPageProps {
  onNavigate: (page: NavigationPage) => void;
}

const SALES_HOURLY_DATA = [
  { time: '08:00', sales: 1200, orders: 4 },
  { time: '10:00', sales: 3400, orders: 11 },
  { time: '12:00', sales: 8900, orders: 24 },
  { time: '14:00', sales: 12400, orders: 32 },
  { time: '16:00', sales: 7800, orders: 19 },
  { time: '18:00', sales: 15600, orders: 38 },
  { time: '20:00', sales: 22400, orders: 51 },
  { time: '22:00', sales: 18200, orders: 42 },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const {
    activeBusiness,
    activeBranch,
    orders,
    tables,
    menuItems,
    customers,
    updateOrderStatus,
  } = useBusiness();

  const [showOnboarding, setShowOnboarding] = useState(false);

  // Computed metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalOrders = orders.length;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;
  const totalTablesCount = tables.length;
  const occupancyRate =
    totalTablesCount > 0 ? Math.round((occupiedTables / totalTablesCount) * 100) : 0;

  // Active / in-progress orders
  const activeOrders = orders.filter(
    (o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
  );

  // Top products
  const bestSellers = menuItems.filter((m) => m.is_bestseller).slice(0, 4);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PLACED':
        return 'warning';
      case 'ACCEPTED':
        return 'info';
      case 'PREPARING':
        return 'amber';
      case 'READY':
        return 'purple';
      case 'SERVED':
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Operations Online
            </span>
            <span className="text-xs text-slate-400">&bull; {activeBranch.name}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-['Outfit'] tracking-tight">
            {activeBusiness.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Real-time branch control center. QR orders are actively dispatching to KDS stations and POS terminals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<QrCode className="w-4 h-4 text-amber-400" />}
            onClick={() => onNavigate('tables')}
          >
            Manage QR Tables
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Building className="w-4 h-4 text-slate-400" />}
            onClick={() => setShowOnboarding(true)}
          >
            + Onboard New Cafe
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => onNavigate('customer-ordering')}
          >
            Simulate QR Order
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue Today"
          value={formatCurrency(totalRevenue, activeBusiness.currency, activeBusiness.currency_symbol)}
          change="+18.4%"
          isPositive={true}
          subtext="vs yesterday (₹24,020)"
          icon={<DollarSign className="w-5 h-5 text-amber-400" />}
          iconColor="from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400"
        />

        <StatCard
          title="Orders Today"
          value={totalOrders}
          change="+12.5%"
          isPositive={true}
          subtext={`${activeOrders.length} currently active`}
          icon={<ShoppingBag className="w-5 h-5 text-sky-400" />}
          iconColor="from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-400"
        />

        <StatCard
          title="Avg Order Value (AOV)"
          value={formatCurrency(aov, activeBusiness.currency, activeBusiness.currency_symbol)}
          change="+6.2%"
          isPositive={true}
          subtext="Goal: ₹500.00"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          iconColor="from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400"
        />

        <StatCard
          title="Table Occupancy"
          value={`${occupancyRate}%`}
          change={`${occupiedTables} / ${totalTablesCount} tables`}
          isPositive={occupancyRate < 90}
          subtext="Dine-in Capacity"
          icon={<Users className="w-5 h-5 text-purple-400" />}
          iconColor="from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400"
        />
      </div>

      {/* Charts & Live Orders Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart (2 Cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Sales & Volume Velocity</CardTitle>
              <CardDescription>Intraday revenue trajectory for {activeBranch.name}</CardDescription>
            </div>
            <Badge variant="amber" size="sm">
              Today's Peak: 8:00 PM
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SALES_HOURLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val: unknown) => [
                      formatCurrency(Number(val) || 0, 'INR', '₹'),
                      'Hourly Sales',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Live Orders Kanban Pipeline (1 Col) */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>Active Live Orders</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </CardTitle>
              <CardDescription>{activeOrders.length} pending service</CardDescription>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-1">
            {activeOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle className="w-8 h-8 mx-auto text-emerald-400/60 mb-2" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs mt-1">No active kitchen or counter orders.</p>
              </div>
            ) : (
              activeOrders.map((order) => {
                const tableObj = tables.find((t) => t.id === order.table_id);
                return (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400">
                          {order.order_number}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">
                          {order.customer_name}
                        </span>
                      </div>
                      <Badge variant={getStatusBadgeVariant(order.status)} size="sm" dot>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{tableObj ? `Table ${tableObj.table_number}` : 'Takeaway'}</span>
                      <span className="font-semibold text-slate-200">
                        {formatCurrency(
                          order.total_amount,
                          activeBusiness.currency,
                          activeBusiness.currency_symbol
                        )}
                      </span>
                    </div>

                    {/* Quick Step Status Button */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-700/50">
                      {order.status === 'PLACED' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                          className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Accept Order
                        </button>
                      )}
                      {order.status === 'ACCEPTED' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                          className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Send to Kitchen
                        </button>
                      )}
                      {order.status === 'PREPARING' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'READY')}
                          className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Mark Ready
                        </button>
                      )}
                      {order.status === 'READY' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'SERVED')}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Mark Served
                        </button>
                      )}
                      {order.status === 'SERVED' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                          className="px-2 py-0.5 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Best Sellers & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best Selling Products */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Bestselling Items</span>
              </CardTitle>
              <CardDescription>Top revenue generators</CardDescription>
            </div>
            <button
              onClick={() => onNavigate('menu')}
              className="text-xs text-amber-400 hover:underline cursor-pointer"
            >
              Menu
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {bestSellers.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 transition-all"
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-slate-200 truncate">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-amber-400">
                      {formatCurrency(
                        item.price,
                        activeBusiness.currency,
                        activeBusiness.currency_symbol
                      )}
                    </span>
                  </div>
                </div>
                <Badge variant="amber" size="sm">
                  Top Seller
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Orders Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Orders & Transactions</CardTitle>
              <CardDescription>Audit of latest customer activity</CardDescription>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              All orders <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Order</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Table / Area</th>
                  <th className="pb-3 font-semibold">Total</th>
                  <th className="pb-3 font-semibold">Payment</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.slice(0, 5).map((ord) => {
                  const tableObj = tables.find((t) => t.id === ord.table_id);
                  return (
                    <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-mono font-bold text-amber-400">{ord.order_number}</td>
                      <td className="py-3 font-medium text-slate-200">{ord.customer_name}</td>
                      <td className="py-3 text-slate-400">
                        {tableObj ? `${tableObj.table_number} (${tableObj.seating_area})` : 'Takeaway'}
                      </td>
                      <td className="py-3 font-bold text-slate-100">
                        {formatCurrency(
                          ord.total_amount,
                          activeBusiness.currency,
                          activeBusiness.currency_symbol
                        )}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">
                          {ord.payment_method}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge variant={getStatusBadgeVariant(ord.status)} size="sm">
                          {ord.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-400 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(ord.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Business Onboarding Modal */}
      <BusinessOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
};

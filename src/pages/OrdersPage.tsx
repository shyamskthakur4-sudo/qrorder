import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Search,
  Printer,
  Eye,
  Plus,
  Clock,
  CheckCircle,
  Filter,
  DollarSign,
  User,
  Phone,
  FileText,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Order, OrderStatus, RestaurantTable, MenuItem } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

export const OrdersPage: React.FC = () => {
  const {
    activeBusiness,
    activeBranch,
    orders,
    tables,
    menuItems,
    updateOrderStatus,
    createOrder,
  } = useBusiness();
  const { success, error, info } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isNewPosOrderOpen, setIsNewPosOrderOpen] = useState(false);

  // New POS Order Form
  const [posCustomerName, setPosCustomerName] = useState('Walk-in Guest');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posTableId, setPosTableId] = useState<string>(tables[0]?.id || '');
  const [posSelectedItems, setPosSelectedItems] = useState<{ item: MenuItem; qty: number }[]>([]);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_phone && o.customer_phone.includes(searchQuery));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PLACED':
        return <Badge variant="warning" dot>Placed</Badge>;
      case 'ACCEPTED':
        return <Badge variant="info" dot>Accepted</Badge>;
      case 'PREPARING':
        return <Badge variant="amber" dot>Preparing</Badge>;
      case 'READY':
        return <Badge variant="purple" dot>Ready</Badge>;
      case 'SERVED':
        return <Badge variant="success" dot>Served</Badge>;
      case 'COMPLETED':
        return <Badge variant="default">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
    }
  };

  const handlePrintReceipt = (order: Order) => {
    const tableObj = tables.find((t) => t.id === order.table_id);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Thermal Receipt - ${order.order_number}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 280px; margin: 0 auto; padding: 15px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .item-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
            .header { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
            .sub { font-size: 10px; margin-bottom: 8px; }
            .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="header">${activeBusiness.name}</div>
            <div class="sub">${activeBranch.name}</div>
            <div class="sub">GSTIN: ${activeBranch.gst_number || '29ABCDE1234F1Z5'}</div>
          </div>
          <div class="divider"></div>
          <div style="font-size: 11px;">
            <div>Order: ${order.order_number}</div>
            <div>Date: ${formatDate(order.created_at)}</div>
            <div>Table: ${tableObj ? tableObj.table_number : 'Takeaway'}</div>
            <div>Customer: ${order.customer_name}</div>
          </div>
          <div class="divider"></div>
          <div>
            ${order.items
              ?.map(
                (i) => `
              <div class="item-row">
                <span>${i.quantity}x ${i.item_name} ${i.variant_name ? '(' + i.variant_name + ')' : ''}</span>
                <span>₹${i.total_price}</span>
              </div>
            `
              )
              .join('')}
          </div>
          <div class="divider"></div>
          <div style="font-size: 11px;">
            <div class="item-row"><span>Subtotal:</span><span>₹${order.subtotal}</span></div>
            <div class="item-row"><span>GST (${activeBranch.tax_rate_percent}%):</span><span>₹${order.tax_amount}</span></div>
            ${order.discount_amount ? `<div class="item-row"><span>Discount:</span><span>-₹${order.discount_amount}</span></div>` : ''}
          </div>
          <div class="divider"></div>
          <div class="total-row">
            <span>TOTAL:</span>
            <span>₹${order.total_amount}</span>
          </div>
          <div style="font-size: 11px; margin-top: 4px;">Payment: ${order.payment_method} (${order.payment_status})</div>
          <div class="divider"></div>
          <div class="center" style="font-size: 11px; margin-top: 10px;">
            Thank you for dining with us!<br/>Powered by CafeOS
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCreatePosOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (posSelectedItems.length === 0) {
      error('No Items Selected', 'Please add at least one food or drink item.');
      return;
    }

    const subtotal = posSelectedItems.reduce((sum, i) => sum + i.item.price * i.qty, 0);
    const tax = (subtotal * (activeBranch.tax_rate_percent || 5)) / 100;
    const total = subtotal + tax;

    await createOrder({
      table_id: posTableId,
      customer_name: posCustomerName,
      customer_phone: posCustomerPhone,
      subtotal,
      tax_amount: tax,
      total_amount: total,
      payment_method: 'CASH',
      payment_status: 'PAID',
      notes: 'Direct Cashier POS Entry',
      items: posSelectedItems.map((pi) => ({
        id: '',
        order_id: '',
        menu_item_id: pi.item.id,
        item_name: pi.item.name,
        quantity: pi.qty,
        unit_price: pi.item.price,
        total_price: pi.item.price * pi.qty,
        status: 'ORDERED',
        created_at: new Date().toISOString(),
      })),
    });

    success('POS Order Created', `Dispatched to kitchen pipeline.`);
    setPosSelectedItems([]);
    setIsNewPosOrderOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Live Order Pipeline & POS
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time multi-channel orders from table QR codes, counter POS, and takeaway.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewPosOrderOpen(true)}
        >
          New Counter Order (POS)
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {['ALL', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st} {st !== 'ALL' && `(${orders.filter((o) => o.status === st).length})`}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, customer, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Orders Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
          const tableObj = tables.find((t) => t.id === order.table_id);
          return (
            <Card
              key={order.id}
              className="flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-extrabold text-sm text-amber-400">
                      {order.order_number}
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                      {order.customer_name}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {tableObj ? `Table ${tableObj.table_number} (${tableObj.seating_area})` : 'Takeaway'}
                    </p>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Items breakdown list */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-300">
                      <span className="truncate pr-2">
                        <strong className="text-amber-400 font-mono">{item.quantity}x</strong>{' '}
                        {item.item_name}
                        {item.variant_name && ` (${item.variant_name})`}
                      </span>
                      <span className="font-mono font-semibold shrink-0">₹{item.total_price}</span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 mt-2">
                      Notes: {order.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Order total & Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Payment: <strong className="text-slate-200">{order.payment_method}</strong> ({order.payment_status})
                  </span>
                  <span className="text-sm font-extrabold text-slate-100 font-['Outfit']">
                    {formatCurrency(
                      order.total_amount,
                      activeBusiness.currency,
                      activeBusiness.currency_symbol
                    )}
                  </span>
                </div>

                {/* Step progression button */}
                <div className="flex items-center gap-2">
                  {order.status === 'PLACED' && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1 text-xs"
                      onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                    >
                      Accept Order
                    </Button>
                  )}
                  {order.status === 'ACCEPTED' && (
                    <Button
                      size="sm"
                      variant="amber"
                      className="flex-1 text-xs"
                      onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                    >
                      Send to Kitchen
                    </Button>
                  )}
                  {order.status === 'PREPARING' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 text-xs text-purple-400"
                      onClick={() => updateOrderStatus(order.id, 'READY')}
                    >
                      Mark Ready
                    </Button>
                  )}
                  {order.status === 'READY' && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => updateOrderStatus(order.id, 'SERVED')}
                    >
                      Mark Served
                    </Button>
                  )}
                  {order.status === 'SERVED' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 text-xs"
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                    >
                      Complete & Clear
                    </Button>
                  )}

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handlePrintReceipt(order)}
                    title="Print Thermal Receipt"
                  >
                    <Printer className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* New POS Order Modal */}
      <Modal
        isOpen={isNewPosOrderOpen}
        onClose={() => setIsNewPosOrderOpen(false)}
        title="Create Counter / POS Order"
        description="Punch order directly into the kitchen terminal."
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePosOrder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Customer Name"
              value={posCustomerName}
              onChange={(e) => setPosCustomerName(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              placeholder="+91..."
              value={posCustomerPhone}
              onChange={(e) => setPosCustomerPhone(e.target.value)}
            />
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Dining Table
              </label>
              <select
                value={posTableId}
                onChange={(e) => setPosTableId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.table_number} ({t.seating_area})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Menu Item Picker */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Select Dishes / Drinks
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {menuItems.map((item) => {
                const count = posSelectedItems.find((p) => p.item.id === item.id)?.qty || 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPosSelectedItems((prev) => {
                        const existing = prev.find((p) => p.item.id === item.id);
                        if (existing) {
                          return prev.map((p) =>
                            p.item.id === item.id ? { ...p, qty: p.qty + 1 } : p
                          );
                        }
                        return [...prev, { item, qty: 1 }];
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      count > 0
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold truncate">{item.name}</div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span>₹{item.price}</span>
                      {count > 0 && (
                        <span className="font-bold text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded-md">
                          {count}x
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected summary */}
          {posSelectedItems.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              {posSelectedItems.map((p, idx) => (
                <div key={idx} className="flex justify-between text-slate-300">
                  <span>{p.qty}x {p.item.name}</span>
                  <span className="font-bold">₹{p.item.price * p.qty}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-sm text-amber-400 pt-2 border-t border-slate-800">
                <span>Total Amount (with GST):</span>
                <span>
                  ₹
                  {posSelectedItems.reduce((sum, p) => sum + p.item.price * p.qty, 0) * 1.05}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsNewPosOrderOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Dispatch Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

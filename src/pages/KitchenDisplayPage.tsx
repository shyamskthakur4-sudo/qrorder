import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Volume2,
  Flame,
  AlertTriangle,
  Play,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Order, OrderStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';

export const KitchenDisplayPage: React.FC = () => {
  const { activeBusiness, activeBranch, orders, updateOrderStatus, playKitchenAlert } =
    useBusiness();
  const { info, success } = useToast();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter KDS orders into 3 columns
  const newOrders = orders.filter((o) => o.status === 'PLACED' || o.status === 'ACCEPTED');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  const getElapsedMinutes = (createdAt: string) => {
    const diffMs = currentTime.getTime() - new Date(createdAt).getTime();
    return Math.floor(diffMs / (1000 * 60));
  };

  const getTimerColor = (minutes: number) => {
    if (minutes > 20) return 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse';
    if (minutes > 10) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  const handleAdvanceStatus = (orderId: string, currentStatus: OrderStatus) => {
    if (currentStatus === 'PLACED' || currentStatus === 'ACCEPTED') {
      updateOrderStatus(orderId, 'PREPARING');
      success('Order Sent to Prep', 'Station is now working on order items.');
    } else if (currentStatus === 'PREPARING') {
      updateOrderStatus(orderId, 'READY');
      playKitchenAlert();
      success('Order Plated & Ready!', 'Runner notified for table service.');
    } else if (currentStatus === 'READY') {
      updateOrderStatus(orderId, 'SERVED');
      info('Order Served', 'Table delivery verified.');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top KDS Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 font-['Outfit'] tracking-tight flex items-center gap-2">
              <span>Kitchen Display Station (KDS)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </h2>
            <p className="text-xs text-slate-400">
              {activeBranch.name} &bull; Live Chef Line Dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm font-bold text-amber-400">
            {currentTime.toLocaleTimeString()}
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Volume2 className="w-4 h-4 text-amber-400" />}
            onClick={() => {
              playKitchenAlert();
              info('Chime Test', 'Kitchen bell tested.');
            }}
          >
            Chime Bell
          </Button>
        </div>
      </div>

      {/* 3-Column KDS Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* COLUMN 1: NEW ORDERS */}
        <div className="flex flex-col rounded-3xl bg-slate-950/60 border border-slate-800/80 p-3 min-h-[600px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 px-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <h3 className="font-bold text-sm text-slate-100">1. New Tickets</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
              {newOrders.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {newOrders.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs">
                No new incoming tickets.
              </div>
            ) : (
              newOrders.map((order) => {
                const elapsed = getElapsedMinutes(order.created_at);
                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-lg hover:border-amber-400 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-base font-extrabold text-amber-400">
                          {order.order_number}
                        </span>
                        <p className="text-xs font-bold text-slate-200 mt-0.5">
                          {order.customer_name}
                        </p>
                      </div>

                      <div
                        className={`px-2 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1 ${getTimerColor(
                          elapsed
                        )}`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{elapsed}m</span>
                      </div>
                    </div>

                    {/* Order items with big readable text for chef */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-100">
                            <span className="text-amber-400 font-mono text-sm mr-1">
                              {item.quantity}x
                            </span>
                            {item.item_name}
                            {item.variant_name && (
                              <span className="text-slate-400 text-[11px] block ml-5">
                                {item.variant_name}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                      {order.notes && (
                        <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 italic mt-2">
                          ⚠️ "{order.notes}"
                        </p>
                      )}
                    </div>

                    <Button
                      variant="primary"
                      className="w-full text-xs"
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                      onClick={() => handleAdvanceStatus(order.id, order.status)}
                    >
                      Start Cooking
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: PREPARING */}
        <div className="flex flex-col rounded-3xl bg-slate-950/60 border border-slate-800/80 p-3 min-h-[600px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 px-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-400 animate-pulse" />
              <h3 className="font-bold text-sm text-slate-100">2. In Preparation</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-xs font-bold">
              {preparingOrders.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs">
                No orders currently in the pan.
              </div>
            ) : (
              preparingOrders.map((order) => {
                const elapsed = getElapsedMinutes(order.created_at);
                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-sky-500/30 shadow-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-base font-extrabold text-sky-400">
                          {order.order_number}
                        </span>
                        <p className="text-xs font-bold text-slate-200 mt-0.5">
                          {order.customer_name}
                        </p>
                      </div>

                      <div
                        className={`px-2 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1 ${getTimerColor(
                          elapsed
                        )}`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{elapsed}m</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-100">
                            <span className="text-sky-400 font-mono text-sm mr-1">
                              {item.quantity}x
                            </span>
                            {item.item_name}
                          </span>
                        </div>
                      ))}
                      {order.notes && (
                        <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 italic mt-2">
                          ⚠️ "{order.notes}"
                        </p>
                      )}
                    </div>

                    <Button
                      variant="primary"
                      className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => handleAdvanceStatus(order.id, 'PREPARING')}
                    >
                      Plate & Mark Ready
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3: READY TO SERVE */}
        <div className="flex flex-col rounded-3xl bg-slate-950/60 border border-slate-800/80 p-3 min-h-[600px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 px-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <h3 className="font-bold text-sm text-slate-100">3. Ready for Service</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {readyOrders.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs">
                No orders waiting on the pass.
              </div>
            ) : (
              readyOrders.map((order) => {
                const elapsed = getElapsedMinutes(order.created_at);
                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-base font-extrabold text-emerald-400">
                          {order.order_number}
                        </span>
                        <p className="text-xs font-bold text-slate-200 mt-0.5">
                          {order.customer_name}
                        </p>
                      </div>

                      <Badge variant="success">Plated</Badge>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="text-slate-200 font-medium">
                          {item.quantity}x {item.item_name}
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="secondary"
                      className="w-full text-xs hover:border-emerald-500 text-emerald-300"
                      onClick={() => handleAdvanceStatus(order.id, 'READY')}
                    >
                      Confirm Delivered / Served
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

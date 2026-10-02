import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  CreditCard,
  QrCode,
  Tag,
  ChevronRight,
  ChefHat,
  Utensils,
  Smartphone,
  Bell,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { MenuItem, MenuVariant, MenuAddon, OrderItem, OrderItemAddon, Order } from '../types';
import { formatCurrency, generateUUID } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CartItem {
  id: string;
  item: MenuItem;
  variant?: MenuVariant;
  addons: MenuAddon[];
  quantity: number;
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

export interface CustomerOrderingPageProps {
  scannedTableCode?: string | null;
  isStandalone?: boolean;
  onExitToAdmin?: () => void;
}

export const CustomerOrderingPage: React.FC<CustomerOrderingPageProps> = ({
  scannedTableCode,
  isStandalone = false,
  onExitToAdmin,
}) => {
  const {
    activeBusiness,
    activeBranch,
    tables,
    categories,
    menuItems,
    coupons,
    createOrder,
  } = useBusiness();
  const { success, error, info } = useToast();

  // Web Push Notification Permission & Opt-In State
  const [showNotificationPrompt, setShowNotificationPrompt] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'default';
    }
    return false;
  });

  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      info('Not Supported', 'Push notifications are not supported on this browser.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setShowNotificationPrompt(false);

      if (perm === 'granted') {
        success('Notifications Enabled! 🎉', 'You will receive real-time food updates & secret flash discounts on your phone.');
        new Notification(`${activeBusiness.name}`, {
          body: '🎉 Notifications enabled! We will alert you the moment your food is ready + VIP table deals.',
          icon: activeBusiness.logo_url || '/favicon.svg',
          badge: '/favicon.svg',
        });
      } else {
        info('Notifications Blocked', 'You can change this anytime in browser site permissions.');
      }
    } catch (e) {
      console.warn('Notification permission error:', e);
    }
  };

  // Listen to live marketing broadcasts & order updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('public:cafeos_broadcasts')
      .on('broadcast', { event: 'marketing_push' }, (payload: any) => {
        const data = payload?.payload;
        if (data && data.business_id === activeBusiness.id) {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`${data.business_name || activeBusiness.name}: ${data.title}`, {
              body: data.message,
              icon: data.logo_url || activeBusiness.logo_url || '/favicon.svg',
              badge: '/favicon.svg',
            });
          }
          info(`📢 ${data.title}`, data.message);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBusiness.id]);

  // Selected table - automatically matched from scanned QR code or URL param
  const [selectedTableId, setSelectedTableId] = useState<string>(() => tables[0]?.id || '');

  useEffect(() => {
    if (tables.length === 0) return;

    // Check code from prop or URL
    let code = scannedTableCode;
    if (!code && typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      code = search.get('table');
      if (!code) {
        const match = window.location.pathname.match(/^\/menu(?:\/([^\/?#]+))?/i);
        if (match && match[1]) code = decodeURIComponent(match[1]);
      }
    }

    if (code) {
      const clean = code.trim().toLowerCase();
      const matched = tables.find((t) => {
        if (t.qr_code?.code_identifier && t.qr_code.code_identifier.toLowerCase() === clean) return true;
        if (t.table_number.toLowerCase() === clean) return true;
        if (t.id.toLowerCase() === clean) return true;
        if (t.table_number.toLowerCase() === clean.replace(/^t-?/i, '')) return true;
        if (`t-${t.table_number.toLowerCase()}` === clean) return true;
        return false;
      });

      if (matched) {
        setSelectedTableId(matched.id);
        return;
      }
    }

    if (!tables.some((t) => t.id === selectedTableId) && tables[0]) {
      setSelectedTableId(tables[0].id);
    }
  }, [scannedTableCode, tables, selectedTableId]);

  const activeTable = tables.find((t) => t.id === selectedTableId) || tables[0];

  // Menu filtering
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Item customization modal
  const [selectedItemForCustom, setSelectedItemForCustom] = useState<MenuItem | null>(null);
  const [customVariant, setCustomVariant] = useState<MenuVariant | undefined>(undefined);
  const [customAddons, setCustomAddons] = useState<MenuAddon[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [customQuantity, setCustomQuantity] = useState(1);

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [custName, setCustName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cafeos_cust_name') || '';
    }
    return '';
  });
  const [custPhone, setCustPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cafeos_cust_phone') || '';
    }
    return '';
  });
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH'>('UPI');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  // Active placed order tracking screen
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Filtered menu
  const displayItems = menuItems.filter((m) => {
    const matchesCat = selectedCatId === 'ALL' || m.category_id === selectedCatId;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesVeg = !vegOnly || m.is_veg;
    return matchesCat && matchesSearch && matchesVeg && m.is_available;
  });

  // Open item customizer
  const handleOpenCustomizer = (item: MenuItem) => {
    setSelectedItemForCustom(item);
    setCustomVariant(item.variants && item.variants.length > 0 ? item.variants[0] : undefined);
    setCustomAddons([]);
    setCustomNotes('');
    setCustomQuantity(1);
  };

  // Add to cart from customizer
  const handleAddToCart = () => {
    if (!selectedItemForCustom) return;

    const basePrice = customVariant ? customVariant.price : selectedItemForCustom.price;
    const addonsTotal = customAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = basePrice + addonsTotal;
    const totalPrice = unitPrice * customQuantity;

    const newCartItem: CartItem = {
      id: generateUUID(),
      item: selectedItemForCustom,
      variant: customVariant,
      addons: customAddons,
      quantity: customQuantity,
      notes: customNotes.trim(),
      unitPrice,
      totalPrice,
    };

    setCart((prev) => [...prev, newCartItem]);
    success('Added to Cart', `${customQuantity}x ${selectedItemForCustom.name}`);
    setSelectedItemForCustom(null);
  };

  const updateCartQuantity = (cartItemId: string, change: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.id === cartItemId) {
            const newQty = ci.quantity + change;
            if (newQty <= 0) return null;
            return {
              ...ci,
              quantity: newQty,
              totalPrice: ci.unitPrice * newQty,
            };
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Subtotal calculations
  const cartSubtotal = cart.reduce((sum, ci) => sum + ci.totalPrice, 0);
  const gstRate = activeBranch.tax_rate_percent || 5.0;
  const gstAmount = (cartSubtotal * gstRate) / 100;
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const finalTotal = Math.max(0, cartSubtotal + gstAmount - discountAmount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const matched = coupons.find(
      (cp) =>
        cp.code.toUpperCase() === couponCode.trim().toUpperCase() &&
        cp.is_active &&
        cartSubtotal >= cp.min_order_value
    );

    if (matched) {
      let discount = 0;
      if (matched.discount_type === 'PERCENTAGE') {
        discount = (cartSubtotal * matched.discount_value) / 100;
        if (matched.max_discount && discount > matched.max_discount) {
          discount = matched.max_discount;
        }
      } else {
        discount = matched.discount_value;
      }
      setAppliedCoupon({ code: matched.code, discount });
      success('Coupon Applied!', `You saved ${formatCurrency(discount, 'INR', '₹')}`);
    } else {
      error('Invalid Coupon', 'Code is expired, invalid, or does not meet minimum order value.');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const orderItemsPayload: OrderItem[] = cart.map((ci) => ({
      id: generateUUID(),
      order_id: '',
      menu_item_id: ci.item.id,
      item_name: ci.item.name,
      variant_name: ci.variant?.name,
      quantity: ci.quantity,
      unit_price: ci.unitPrice,
      total_price: ci.totalPrice,
      notes: ci.notes,
      status: 'ORDERED',
      created_at: new Date().toISOString(),
      addons: ci.addons.map((a) => ({
        id: generateUUID(),
        order_item_id: '',
        addon_name: a.name,
        price: a.price,
      })),
    }));

    const newOrder = await createOrder({
      table_id: activeTable?.id,
      customer_name: custName,
      customer_phone: custPhone,
      subtotal: cartSubtotal,
      tax_amount: gstAmount,
      discount_amount: discountAmount,
      total_amount: finalTotal,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'CASH' ? 'PENDING' : 'PAID',
      items: orderItemsPayload,
      notes: `Ordered via Customer QR (Table: ${activeTable?.table_number})`,
    });

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`${activeBusiness.name} - Order Placed! 🍽️`, {
          body: `Order ${newOrder.order_number} received! Our kitchen is preparing it fresh for Table ${activeTable?.table_number}.`,
          icon: activeBusiness.logo_url || '/favicon.svg',
        });
      } catch {}
    }

    if (custName.trim() && typeof window !== 'undefined') {
      localStorage.setItem('cafeos_cust_name', custName.trim());
    }
    if (custPhone.trim() && typeof window !== 'undefined') {
      localStorage.setItem('cafeos_cust_phone', custPhone.trim());
    }

    setPlacedOrder(newOrder);
    setCart([]);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    success('Order Placed!', `Your order ${newOrder.order_number} has been dispatched to the kitchen.`);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${isStandalone ? 'w-full' : 'max-w-md mx-auto border border-slate-800 rounded-[36px] shadow-2xl overflow-hidden my-4'}`}>
      <div className={`w-full ${isStandalone ? 'max-w-lg mx-auto sm:border-x sm:border-slate-800/80 min-h-screen flex flex-col relative bg-slate-950 shadow-2xl' : 'flex flex-col relative'}`}>
        {/* Smartphone Notch / Status simulation banner (only if in preview inside admin) */}
        {!isStandalone && (
          <div className="bg-slate-900/90 px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              Customer QR Preview
            </span>
            {/* Table Selector for simulation */}
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="bg-slate-800 text-amber-300 font-bold rounded-lg px-2 py-0.5 text-[10px] border border-amber-500/30 cursor-pointer"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.table_number} ({t.seating_area})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Brand Header */}
        <div className="relative p-5 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeBusiness.logo_url ? (
                <img
                  src={activeBusiness.logo_url}
                  alt={activeBusiness.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-amber-500/40 shadow-lg shadow-amber-500/30 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/30 shrink-0">
                  {activeBusiness.name ? activeBusiness.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div>
                <h1 className="text-base font-extrabold text-slate-100 font-['Outfit']">
                  {activeBusiness.name}
                </h1>
                <p className="text-xs text-slate-400">{activeBranch.name}</p>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-center font-bold text-xs shadow-inner">
              <span className="text-[10px] text-amber-400/90 block font-normal">Dining at</span>
              <span className="flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Table {activeTable?.table_number || '01'}
              </span>
            </div>
          </div>

        {/* Swiggy/Zomato VIP Notification Bar Opt-in */}
        {showNotificationPrompt && (
          <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 border border-amber-500/40 backdrop-blur-md shadow-lg shadow-amber-500/10 animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 text-base shadow-sm">
                🔔
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-100">Live Order Tracking & VIP Deals</h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500 text-slate-950">Swiggy Speed</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Get real-time updates when your food is ready & secret 20% off table codes directly in your notification bar!
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={handleRequestNotifications}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition-all cursor-pointer"
                  >
                    <span>Turn On Notifications</span>
                  </button>
                  <button
                    onClick={() => setShowNotificationPrompt(false)}
                    className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Promo strip */}
        <div className="mt-3 p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-bold text-amber-300">
            <Tag className="w-3.5 h-3.5" /> Use code WELCOME20 for 20% off
          </span>
          <span className="text-[10px] text-amber-400 font-semibold">Min ₹400</span>
        </div>

        {/* Search & Veg toggle */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search food or coffee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
              vegOnly
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Veg
          </button>
        </div>
      </div>

      {/* Category Horizontal Bar */}
      <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSelectedCatId('ALL')}
          className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCatId === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCatId(c.id)}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCatId === c.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Food Items Catalog */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {displayItems.map((item) => (
          <div
            key={item.id}
            onClick={() => handleOpenCustomizer(item)}
            className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex gap-3 cursor-pointer group"
          >
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.is_veg ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  {item.is_bestseller && (
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" /> Bestseller
                    </span>
                  )}
                  {item.is_spicy && <span className="text-[10px]">🌶️</span>}
                </div>
                <h4 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors leading-tight">
                  {item.name}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                <span className="font-extrabold text-sm text-slate-100 font-['Outfit']">
                  {formatCurrency(
                    item.price,
                    activeBusiness.currency,
                    activeBusiness.currency_symbol
                  )}
                </span>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                  + Customize
                </span>
              </div>
            </div>

            <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-slate-800">
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Floating Sticky Cart Bar */}
      {cart.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold shadow-2xl shadow-amber-500/40 flex items-center justify-between transition-transform active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-950/20 flex items-center justify-center font-black text-xs">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </div>
              <span className="text-sm">View Order Cart</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold font-['Outfit']">
                {formatCurrency(cartSubtotal, 'INR', '₹')}
              </span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}

      {/* Item Customizer Modal */}
      <Modal
        isOpen={Boolean(selectedItemForCustom)}
        onClose={() => setSelectedItemForCustom(null)}
        title={selectedItemForCustom?.name}
        description="Select size variants, customize add-ons, and add cooking notes."
        maxWidth="sm"
      >
        {selectedItemForCustom && (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="h-32 rounded-2xl overflow-hidden relative">
              <img
                src={selectedItemForCustom.image_url}
                alt={selectedItemForCustom.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
            </div>

            {/* Variants */}
            {selectedItemForCustom.variants && selectedItemForCustom.variants.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Select Portion / Size</label>
                <div className="space-y-1.5">
                  {selectedItemForCustom.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setCustomVariant(v)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        customVariant?.id === v.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className="font-bold">₹{v.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {selectedItemForCustom.addons && selectedItemForCustom.addons.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Optional Add-ons</label>
                <div className="space-y-1.5">
                  {selectedItemForCustom.addons.map((addon) => {
                    const isChecked = customAddons.some((a) => a.id === addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setCustomAddons((prev) => prev.filter((a) => a.id !== addon.id));
                          } else {
                            setCustomAddons((prev) => [...prev, addon]);
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                              isChecked
                                ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                                : 'border-slate-600'
                            }`}
                          >
                            {isChecked && '✓'}
                          </span>
                          <span>{addon.name}</span>
                        </div>
                        <span className="text-amber-400 font-bold">+₹{addon.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cooking Notes */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Special Instructions for Kitchen Chef
              </label>
              <input
                type="text"
                placeholder="e.g. Extra hot, less ice, spicy dressing on the side..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Quantity Selector & Add Button */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-sm w-5 text-center">{customQuantity}</span>
                <button
                  type="button"
                  onClick={() => setCustomQuantity(customQuantity + 1)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <Button variant="primary" className="flex-1" onClick={handleAddToCart}>
                Add to Cart &bull;{' '}
                {formatCurrency(
                  ((customVariant ? customVariant.price : selectedItemForCustom.price) +
                    customAddons.reduce((sum, a) => sum + a.price, 0)) *
                    customQuantity,
                  'INR',
                  '₹'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cart & Bill Drawer Modal */}
      <Modal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <span>Your Table {activeTable?.table_number} Order</span>
          </div>
        }
        description="Review items before sending order directly to the kitchen."
        maxWidth="sm"
      >
        <div className="space-y-4">
          {/* Cart items list */}
          <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
            {cart.map((ci) => (
              <div
                key={ci.id}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{ci.item.name}</h4>
                  {ci.variant && (
                    <p className="text-[10px] text-amber-400">{ci.variant.name}</p>
                  )}
                  {ci.addons.length > 0 && (
                    <p className="text-[10px] text-slate-400">
                      +{ci.addons.map((a) => a.name).join(', ')}
                    </p>
                  )}
                  {ci.notes && (
                    <p className="text-[10px] text-slate-500 italic mt-0.5">"{ci.notes}"</p>
                  )}
                  <span className="font-extrabold text-xs text-slate-100 font-['Outfit'] block mt-1">
                    {formatCurrency(ci.totalPrice, 'INR', '₹')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => updateCartQuantity(ci.id, -1)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-xs font-bold px-1">{ci.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(ci.id, 1)}
                    className="p-1 text-slate-400 hover:text-emerald-400"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Coupon Entry */}
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <input
              type="text"
              placeholder="Promo code (e.g. WELCOME20)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 uppercase font-mono"
            />
            <Button type="submit" variant="secondary" size="sm">
              Apply
            </Button>
          </form>

          {appliedCoupon && (
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
              <span>Code <strong>{appliedCoupon.code}</strong> applied</span>
              <span>-₹{appliedCoupon.discount}</span>
            </div>
          )}

          {/* Bill breakdown */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Item Subtotal</span>
              <span>{formatCurrency(cartSubtotal, 'INR', '₹')}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>GST ({gstRate}%)</span>
              <span>{formatCurrency(gstAmount, 'INR', '₹')}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Coupon Discount</span>
                <span>-{formatCurrency(discountAmount, 'INR', '₹')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-100 font-black text-sm pt-2 border-t border-slate-800">
              <span>To Pay</span>
              <span className="text-amber-400 font-['Outfit']">
                {formatCurrency(finalTotal, 'INR', '₹')}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              setIsCartOpen(false);
              setIsCheckoutOpen(true);
            }}
          >
            Proceed to Checkout &bull; {formatCurrency(finalTotal, 'INR', '₹')}
          </Button>
        </div>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Dine-in Customer Checkout"
        description={`Confirming order for Table ${activeTable?.table_number}`}
        maxWidth="sm"
      >
        <form onSubmit={handlePlaceOrder} className="space-y-4">
          <Input
            label="Your Name"
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            required
          />

          <Input
            label="Mobile Number (for live order SMS / WhatsApp tracking)"
            value={custPhone}
            onChange={(e) => setCustPhone(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                  paymentMethod === 'UPI'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                UPI QR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                  paymentMethod === 'CARD'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                Card POS
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                Pay Cash
              </button>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
            Total Payable: <strong className="font-['Outfit'] text-sm">{formatCurrency(finalTotal, 'INR', '₹')}</strong>
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Confirm & Dispatch to Kitchen
          </Button>
        </form>
      </Modal>

      {/* Live Placed Order Tracking Screen */}
      <Modal
        isOpen={Boolean(placedOrder)}
        onClose={() => setPlacedOrder(null)}
        title={
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span>Order Dispatched to Kitchen!</span>
          </div>
        }
        description="Your food is being prepared. Track live kitchen status below."
        maxWidth="sm"
      >
        {placedOrder && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400 text-base">
                  {placedOrder.order_number}
                </span>
                <Badge variant="amber" dot>
                  {placedOrder.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Table {activeTable?.table_number} &bull; {custName}
              </p>
              <p className="text-xs text-slate-400">
                {placedOrder.items?.length || 0} items ordered &bull; Total:{' '}
                <strong className="text-slate-100">
                  {formatCurrency(placedOrder.total_amount, 'INR', '₹')}
                </strong>
              </p>
            </div>

            {/* Live Visual Tracker Progression */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-3">
              <h4 className="text-xs font-bold text-slate-300">Kitchen Pipeline Status</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>1. Order Placed & Confirmed</span>
                </div>
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <ChefHat className="w-4 h-4 shrink-0 animate-bounce" />
                  <span>2. Kitchen Station Preparing ({activeBranch.name})</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>3. Plated & Ready for Service</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Utensils className="w-4 h-4 shrink-0" />
                  <span>4. Served at Table {activeTable?.table_number}</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => setPlacedOrder(null)}
            >
              Order More Items
            </Button>
          </div>
        )}
      </Modal>

        {/* Customer Experience Footer */}
        <div className="mt-auto py-6 px-4 text-center border-t border-slate-900 text-slate-500 text-[11px] space-y-1.5">
          <p>© {new Date().getFullYear()} {activeBusiness.name} &bull; Contactless Mobile Dining</p>
          <div className="flex items-center justify-center gap-2 pt-1 text-[10px]">
            <span className="text-slate-600">⚡ Powered by CafeOS</span>
            {onExitToAdmin && (
              <>
                <span className="text-slate-700">&bull;</span>
                <button
                  onClick={onExitToAdmin}
                  className="text-amber-500/80 hover:text-amber-300 hover:underline cursor-pointer"
                >
                  Staff Login / Admin POS
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

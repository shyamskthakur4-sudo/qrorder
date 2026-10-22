import React, { useState, useEffect, useRef } from 'react';
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
  Star,
  Gift,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Business, Branch, RestaurantTable, MenuCategory, MenuItem, MenuVariant, MenuAddon, OrderItem, OrderItemAddon, Order, OrderStatus, Coupon } from '../types';
import { formatCurrency, generateUUID, isValidUUID } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GoogleReviewModal, GoogleIcon } from '../components/reviews/GoogleReviewModal';
import {
  registerServiceWorker,
  showLockScreenNotification,
  getOrderStatusNotificationConfig,
  dispatchWebPushViaEdge,
  getOrCreateDinerSessionId,
  subscribeToPushServiceAndSave,
  requestNotificationPermission,
} from '../lib/pushNotifications';

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

function extractScannedCode(propCode?: string | null): string | null {
  if (propCode) return propCode;
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const qTable = search.get('table');
  if (qTable) return qTable;
  const match = window.location.pathname.match(/^\/menu(?:\/([^\/?#]+))?/i);
  if (match && match[1]) return decodeURIComponent(match[1]);
  const hashMatch = window.location.hash.match(/^#\/?menu(?:\/([^\/?#]+))?/i);
  if (hashMatch && hashMatch[1]) return decodeURIComponent(hashMatch[1]);
  return null;
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
    orders,
    createOrder,
    updateOrderStatus,
    submitOrderReview,
  } = useBusiness();
  const { success, error, info } = useToast();

  // Cloud-resolved state directly from table QR code
  const [cloudBusiness, setCloudBusiness] = useState<Business | null>(null);
  const [cloudBranch, setCloudBranch] = useState<Branch | null>(null);
  const [cloudTable, setCloudTable] = useState<RestaurantTable | null>(null);
  const [cloudCategories, setCloudCategories] = useState<MenuCategory[]>([]);
  const [cloudMenuItems, setCloudMenuItems] = useState<MenuItem[]>([]);
  const [cloudCoupons, setCloudCoupons] = useState<Coupon[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState<boolean>(() => {
    return isSupabaseConfigured && !!extractScannedCode(scannedTableCode);
  });

  // Dynamically resolve QR code from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsCloudLoading(false);
      return;
    }
    const code = extractScannedCode(scannedTableCode);
    if (!code) {
      setIsCloudLoading(false);
      return;
    }

    let isMounted = true;
    const clean = code.trim();

    const resolveQrFromSupabase = async () => {
      try {
        setIsCloudLoading(true);

        // 1. Check qr_codes table by code_identifier
        const { data: qrData } = await supabase
          .from('qr_codes')
          .select('*, table:tables(*), business:businesses(*), branch:branches(*)')
          .ilike('code_identifier', clean)
          .maybeSingle();

        if (qrData && qrData.business && qrData.table) {
          if (!isMounted) return;
          const biz: Business = qrData.business;
          const br: Branch = qrData.branch || {
            id: qrData.branch_id,
            business_id: biz.id,
            name: 'Main Branch',
            slug: 'main-branch',
            tax_rate_percent: 5.0,
            service_charge_percent: 0.0,
            opening_time: '09:00',
            closing_time: '23:00',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const tbl: RestaurantTable = {
            ...qrData.table,
            qr_code: qrData,
          };

          setCloudBusiness(biz);
          setCloudBranch(br);
          setCloudTable(tbl);

          const [catRes, itemRes, coupRes] = await Promise.all([
            supabase
              .from('menu_categories')
              .select('*')
              .eq('business_id', biz.id)
              .or(`branch_id.eq.${br.id},branch_id.is.null`)
              .order('sort_order', { ascending: true }),
            supabase
              .from('menu_items')
              .select('*, variants:menu_variants(*), addons:menu_addons(*)')
              .eq('business_id', biz.id)
              .or(`branch_id.eq.${br.id},branch_id.is.null`)
              .order('sort_order', { ascending: true }),
            supabase.from('coupons').select('*').eq('business_id', biz.id).eq('is_active', true),
          ]);

          if (isMounted) {
            if (catRes.data) setCloudCategories(catRes.data);
            if (itemRes.data) setCloudMenuItems(itemRes.data);
            if (coupRes.data) setCloudCoupons(coupRes.data);
          }
          return;
        }

        // 2. Query tables directly if qr_code was not found
        const tableBaseQuery = supabase
          .from('tables')
          .select('*, qr_code:qr_codes(*), business:businesses(*), branch:branches(*)')
          .limit(1);

        const { data: tblData } = isValidUUID(clean)
          ? await tableBaseQuery.or(`id.eq.${clean},table_number.ilike.${clean}`).maybeSingle()
          : await tableBaseQuery.ilike('table_number', clean).maybeSingle();

        if (tblData && tblData.business) {
          if (!isMounted) return;
          const biz: Business = tblData.business;
          const br: Branch = tblData.branch || {
            id: tblData.branch_id,
            business_id: biz.id,
            name: 'Main Branch',
            slug: 'main-branch',
            tax_rate_percent: 5.0,
            service_charge_percent: 0.0,
            opening_time: '09:00',
            closing_time: '23:00',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const rawQr = Array.isArray(tblData.qr_code) ? tblData.qr_code[0] : tblData.qr_code;
          const tbl: RestaurantTable = {
            ...tblData,
            qr_code: rawQr,
          };

          setCloudBusiness(biz);
          setCloudBranch(br);
          setCloudTable(tbl);

          const [catRes, itemRes, coupRes] = await Promise.all([
            supabase
              .from('menu_categories')
              .select('*')
              .eq('business_id', biz.id)
              .or(`branch_id.eq.${br.id},branch_id.is.null`)
              .order('sort_order', { ascending: true }),
            supabase
              .from('menu_items')
              .select('*, variants:menu_variants(*), addons:menu_addons(*)')
              .eq('business_id', biz.id)
              .or(`branch_id.eq.${br.id},branch_id.is.null`)
              .order('sort_order', { ascending: true }),
            supabase.from('coupons').select('*').eq('business_id', biz.id).eq('is_active', true),
          ]);

          if (isMounted) {
            if (catRes.data) setCloudCategories(catRes.data);
            if (itemRes.data) setCloudMenuItems(itemRes.data);
            if (coupRes.data) setCloudCoupons(coupRes.data);
          }
        }
      } catch (err) {
        console.warn('Supabase QR cloud resolution error:', err);
      } finally {
        if (isMounted) setIsCloudLoading(false);
      }
    };

    resolveQrFromSupabase();

    return () => {
      isMounted = false;
    };
  }, [scannedTableCode]);

  // Selected table in admin simulator
  const [selectedTableId, setSelectedTableId] = useState<string>(() => tables[0]?.id || '');

  useEffect(() => {
    if (tables.length === 0) return;
    const code = extractScannedCode(scannedTableCode);
    if (code) {
      const clean = code.trim().toLowerCase();
      const matched = tables.find((t) => {
        if (t.qr_code?.code_identifier && t.qr_code.code_identifier.toLowerCase() === clean) return true;
        if (t.table_number.toLowerCase() === clean) return true;
        if (t.id.toLowerCase() === clean) return true;
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

  // Effective tenant entities: prefer cloud-resolved live cafe over local admin context
  const effectiveBusiness: Business = cloudBusiness || activeBusiness;
  const effectiveBranch: Branch = cloudBranch || activeBranch;
  const effectiveTable: RestaurantTable | undefined = cloudTable || activeTable;
  const effectiveCategories: MenuCategory[] = cloudCategories.length > 0 ? cloudCategories : categories;
  const effectiveMenuItems: MenuItem[] = cloudMenuItems.length > 0 ? cloudMenuItems : menuItems;
  const effectiveCoupons: Coupon[] = cloudCoupons.length > 0 ? cloudCoupons : coupons;

  // Web Push & Lock Screen Notification State (Swiggy / Zomato Style)
  // Register service worker silently for background push without interrupting customer
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Listen to live marketing broadcasts with Lock-Screen Push
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('public:cafeos_broadcasts')
      .on('broadcast', { event: 'marketing_push' }, (payload: any) => {
        const data = payload?.payload;
        if (data && data.business_id === effectiveBusiness.id) {
          showLockScreenNotification({
            title: `${data.business_name || effectiveBusiness.name}: ${data.title}`,
            body: data.message,
            icon: data.logo_url || effectiveBusiness.logo_url || '/favicon.svg',
            chimeType: 'ping',
            url: data.link_url || window.location.href,
          });
          info(`📢 ${data.title}`, data.message);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveBusiness.id, effectiveBusiness.name, effectiveBusiness.logo_url]);

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
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cafeos_active_order_id') || null;
    }
    return null;
  });
  const [placedOrderToken, setPlacedOrderToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cafeos_active_order_token') || null;
    }
    return null;
  });
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [hasAutoPromptedReview, setHasAutoPromptedReview] = useState<boolean>(false);

  // Synchronize placed order with real-time context orders state or Supabase
  const currentPlacedOrder: Order | null =
    orders.find((o) => o.id === (placedOrderId || placedOrder?.id)) ||
    placedOrder;

  const lastNotifiedStatusRef = useRef<OrderStatus | null>(null);
  const hasRequestedPermOnInteractionRef = useRef(false);

  // Auto-sync Web Push subscription if diner has already granted notification permissions
  useEffect(() => {
    if (
      effectiveBusiness?.id &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      subscribeToPushServiceAndSave({
        businessId: effectiveBusiness.id,
        branchId: effectiveBranch.id,
      }).catch(() => {});
    }
  }, [effectiveBusiness?.id, effectiveBranch?.id]);

  // Request browser native notification permission on the diner's first click or touch interaction
  const handleFirstUserInteraction = () => {
    if (hasRequestedPermOnInteractionRef.current) return;
    hasRequestedPermOnInteractionRef.current = true;
    if (
      effectiveBusiness?.id &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      requestNotificationPermission({
        businessId: effectiveBusiness.id,
        branchId: effectiveBranch.id,
        businessName: effectiveBusiness.name,
        logoUrl: effectiveBusiness.logo_url,
      }).catch(() => {});
    }
  };

  // Dedicated reactive engine: fires Swiggy/Zomato lock screen push whenever status transitions
  useEffect(() => {
    if (!currentPlacedOrder) return;

    // Initialize ref on first observation of an active order so we don't fire stale alerts on page reload
    if (lastNotifiedStatusRef.current === null) {
      lastNotifiedStatusRef.current = currentPlacedOrder.status;
      return;
    }

    const prevStatus = lastNotifiedStatusRef.current;
    const newStatus = currentPlacedOrder.status;

    if (prevStatus !== newStatus) {
      lastNotifiedStatusRef.current = newStatus;

      const cfg = getOrderStatusNotificationConfig(
        newStatus,
        currentPlacedOrder.order_number,
        effectiveTable?.table_number,
        effectiveBusiness.name
      );

      // Local client notification with chime & vibration
      showLockScreenNotification({
        title: cfg.title,
        body: cfg.body,
        icon: effectiveBusiness.logo_url || '/favicon.svg',
        chimeType: cfg.chimeType,
        orderId: currentPlacedOrder.id,
        tag: `order_status_${currentPlacedOrder.id}`,
        url: window.location.href,
      });

      // Server-side Web Push dispatch via Edge Function (reaches lock screen when tab is backgrounded / device asleep)
      dispatchWebPushViaEdge({
        businessId: effectiveBusiness.id,
        branchId: effectiveBranch.id,
        customerId: currentPlacedOrder.customer_id || undefined,
        sessionId: getOrCreateDinerSessionId(),
        orderId: currentPlacedOrder.id,
        orderToken: currentPlacedOrder.order_token || placedOrderToken || undefined,
        notificationType: 'ORDER_STATUS',
        notification: {
          title: cfg.title,
          body: cfg.body,
          icon: effectiveBusiness.logo_url || '/favicon.svg',
          tag: `order_status_${currentPlacedOrder.id}`,
          url: window.location.href,
          orderId: currentPlacedOrder.id,
          chimeType: cfg.chimeType,
        },
      }).catch((err) => {
        console.warn('Edge push status dispatch notice:', err);
      });

      if (newStatus === 'COMPLETED' && !hasAutoPromptedReview) {
        setIsReviewModalOpen(true);
        setHasAutoPromptedReview(true);
      }
    }
  }, [
    currentPlacedOrder?.status,
    currentPlacedOrder?.id,
    currentPlacedOrder?.order_number,
    effectiveTable?.table_number,
    effectiveBusiness.name,
    effectiveBusiness.logo_url,
    hasAutoPromptedReview,
  ]);

  // Real-time listener for placed order status updates via Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !placedOrderId) return;

    // Securely retrieve diner's order using track_customer_order RPC with cryptographic token
    if (placedOrderToken) {
      supabase
        .rpc('track_customer_order', {
          p_order_id: placedOrderId,
          p_order_token: placedOrderToken,
        })
        .then(({ data, error }) => {
          if (data && !error) {
            setPlacedOrder(data as Order);
          }
        });
    }

    const channel = supabase
      .channel(`cust_order_${placedOrderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${placedOrderId}` },
        (payload) => {
          const updated = payload.new as Order;
          setPlacedOrder((prev) => (prev ? { ...prev, ...updated } : updated));
        }
      )
      .on('broadcast', { event: 'order_status_updated' }, (payload: any) => {
        const data = payload?.payload;
        if (data && data.orderId === placedOrderId) {
          const newStatus = data.status as OrderStatus;
          setPlacedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [placedOrderId, placedOrderToken]);

  // Real-time synchronization for customer QR menu items and categories
  useEffect(() => {
    if (!isSupabaseConfigured || !effectiveBusiness?.id) return;

    const channel = supabase
      .channel(`cust_menu_${effectiveBusiness.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `business_id=eq.${effectiveBusiness.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as MenuItem;
            setCloudMenuItems((prev) => {
              const base = prev.length > 0 ? prev : menuItems;
              if (base.some((m) => m.id === newItem.id)) {
                return base.map((m) => (m.id === newItem.id ? { ...m, ...newItem } : m));
              }
              return [...base, newItem];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as MenuItem;
            setCloudMenuItems((prev) => {
              const base = prev.length > 0 ? prev : menuItems;
              return base.map((m) => (m.id === updated.id ? { ...m, ...updated } : m));
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) {
              setCloudMenuItems((prev) => {
                const base = prev.length > 0 ? prev : menuItems;
                return base.filter((m) => m.id !== oldId);
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_categories',
          filter: `business_id=eq.${effectiveBusiness.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCat = payload.new as MenuCategory;
            setCloudCategories((prev) => {
              const base = prev.length > 0 ? prev : categories;
              if (base.some((c) => c.id === newCat.id)) {
                return base.map((c) => (c.id === newCat.id ? { ...c, ...newCat } : c));
              }
              return [...base, newCat];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as MenuCategory;
            setCloudCategories((prev) => {
              const base = prev.length > 0 ? prev : categories;
              return base.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) {
              setCloudCategories((prev) => {
                const base = prev.length > 0 ? prev : categories;
                return base.filter((c) => c.id !== oldId);
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveBusiness?.id, menuItems, categories]);

  // Auto prompt Google Review when order status reaches COMPLETED
  useEffect(() => {
    if (
      currentPlacedOrder &&
      currentPlacedOrder.status === 'COMPLETED' &&
      !currentPlacedOrder.review_submitted &&
      !hasAutoPromptedReview &&
      effectiveBusiness.enable_google_review_prompt !== false
    ) {
      setHasAutoPromptedReview(true);
      const timer = setTimeout(() => {
        setIsReviewModalOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [
    currentPlacedOrder,
    hasAutoPromptedReview,
    effectiveBusiness.enable_google_review_prompt,
  ]);

  const handleReviewSubmit = (review: {
    rating: number;
    feedback?: string;
    platform: 'GOOGLE' | 'INTERNAL';
  }) => {
    if (currentPlacedOrder) {
      submitOrderReview(currentPlacedOrder.id, review);
      success('Review Saved', 'Thank you for supporting our business!');
    }
  };

  // Filtered menu
  const displayItems = effectiveMenuItems.filter((m) => {
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
  const gstRate = effectiveBranch.tax_rate_percent || 5.0;
  const gstAmount = (cartSubtotal * gstRate) / 100;
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const finalTotal = Math.max(0, cartSubtotal + gstAmount - discountAmount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const matched = effectiveCoupons.find(
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
      success('Coupon Applied!', `You saved ${formatCurrency(discount, effectiveBusiness.currency, effectiveBusiness.currency_symbol)}`);
    } else {
      error('Invalid Coupon', 'Code is expired, invalid, or does not meet minimum order value.');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Ensure native notification permission is requested during place-order click gesture
    if (
      effectiveBusiness?.id &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      try {
        await requestNotificationPermission({
          businessId: effectiveBusiness.id,
          branchId: effectiveBranch.id,
          businessName: effectiveBusiness.name,
          logoUrl: effectiveBusiness.logo_url,
        });
      } catch {}
    }

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
      business_id: effectiveBusiness.id,
      branch_id: effectiveBranch.id,
      table_id: effectiveTable?.id,
      customer_name: custName,
      customer_phone: custPhone,
      coupon_code: appliedCoupon?.code || undefined,
      subtotal: cartSubtotal,
      tax_amount: gstAmount,
      discount_amount: discountAmount,
      total_amount: finalTotal,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'CASH' ? 'PENDING' : 'PAID',
      items: orderItemsPayload,
      notes: `Ordered via Customer QR (Table: ${effectiveTable?.table_number || '01'})`,
    } as any);

    // Mark current status as PLACED so subsequent transitions (PREPARING, READY, etc.) fire smoothly
    lastNotifiedStatusRef.current = 'PLACED';

    // Link customer & order to push subscription in Supabase
    subscribeToPushServiceAndSave({
      businessId: effectiveBusiness.id,
      branchId: effectiveBranch.id,
      customerId: newOrder.customer_id || undefined,
      orderId: newOrder.id,
    }).catch(() => {});

    // Trigger Swiggy/Zomato Instant Lock Screen Push Notification with chime & haptics
    const placedNotifCfg = getOrderStatusNotificationConfig(
      'PLACED',
      newOrder.order_number,
      effectiveTable?.table_number,
      effectiveBusiness.name
    );
    showLockScreenNotification({
      title: placedNotifCfg.title,
      body: placedNotifCfg.body,
      icon: effectiveBusiness.logo_url || '/favicon.svg',
      chimeType: placedNotifCfg.chimeType,
      orderId: newOrder.id,
      tag: `order_status_${newOrder.id}`,
      url: window.location.href,
    });

    // Also dispatch server-side Web Push for placed order
    dispatchWebPushViaEdge({
      businessId: effectiveBusiness.id,
      branchId: effectiveBranch.id,
      customerId: newOrder.customer_id || undefined,
      sessionId: getOrCreateDinerSessionId(),
      orderId: newOrder.id,
      orderToken: newOrder.order_token,
      notificationType: 'ORDER_STATUS',
      notification: {
        title: placedNotifCfg.title,
        body: placedNotifCfg.body,
        icon: effectiveBusiness.logo_url || '/favicon.svg',
        tag: `order_status_${newOrder.id}`,
        url: window.location.href,
        orderId: newOrder.id,
        chimeType: placedNotifCfg.chimeType,
      },
    }).catch((err) => {
      console.warn('Edge push dispatch note on place order:', err);
    });

    if (custName.trim() && typeof window !== 'undefined') {
      localStorage.setItem('cafeos_cust_name', custName.trim());
    }
    if (custPhone.trim() && typeof window !== 'undefined') {
      localStorage.setItem('cafeos_cust_phone', custPhone.trim());
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('cafeos_active_order_id', newOrder.id);
      if (newOrder.order_token) {
        localStorage.setItem('cafeos_active_order_token', newOrder.order_token);
        setPlacedOrderToken(newOrder.order_token);
      }
    }

    setPlacedOrderId(newOrder.id);
    setPlacedOrder(newOrder);
    setIsTrackerOpen(false);
    setHasAutoPromptedReview(false);
    setCart([]);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    success('Order Placed!', `Your order ${newOrder.order_number} has been dispatched to the kitchen.`);
  };

  if (isCloudLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="w-14 h-14 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
          <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-slate-100 font-['Outfit']">Connecting to Restaurant...</h3>
        <p className="text-xs text-slate-400 mt-1">Loading digital menu & table details</p>
      </div>
    );
  }

  return (
    <div
      onClick={handleFirstUserInteraction}
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${isStandalone ? 'w-full' : 'max-w-md mx-auto border border-slate-800 rounded-[36px] shadow-2xl overflow-hidden my-4'}`}
    >
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
              {effectiveBusiness.logo_url ? (
                <img
                  src={effectiveBusiness.logo_url}
                  alt={effectiveBusiness.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-amber-500/40 shadow-lg shadow-amber-500/30 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/30 shrink-0">
                  {effectiveBusiness.name ? effectiveBusiness.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div>
                <h1 className="text-base font-extrabold text-slate-100 font-['Outfit']">
                  {effectiveBusiness.name}
                </h1>
                <p className="text-xs text-slate-400">{effectiveBranch.name}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <div className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-center font-bold text-xs shadow-inner">
                <span className="text-[9px] text-amber-400/90 block font-normal">Dining at</span>
                <span className="flex items-center gap-1.5 justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Table {effectiveTable?.table_number || '01'}
                </span>
              </div>
            </div>
          </div>

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
        {effectiveCategories.map((c) => (
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
                    effectiveBusiness.currency,
                    effectiveBusiness.currency_symbol
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

      {/* Floating Order Status & Google Review Banner */}
      {cart.length === 0 && currentPlacedOrder && (
        <div className="fixed sm:absolute bottom-4 left-4 right-4 z-20">
          {currentPlacedOrder.status === 'COMPLETED' ? (
            !currentPlacedOrder.review_submitted ? (
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold shadow-2xl shadow-amber-500/40 flex items-center justify-between transition-transform active:scale-[0.98] cursor-pointer animate-pulse"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center p-1.5 shadow-sm">
                    <GoogleIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-black block font-['Outfit']">Order Completed!</span>
                    <span className="text-[11px] font-semibold text-slate-900">
                      Rate us on Google &bull; Get 10% Off 🎁
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-950 font-bold text-xs bg-slate-950/15 px-2.5 py-1 rounded-xl">
                  <Star className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Review</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsTrackerOpen(true)}
                className="w-full p-3 rounded-2xl bg-slate-900/95 border border-emerald-500/40 text-emerald-300 font-semibold shadow-2xl flex items-center justify-between transition-transform active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Order {currentPlacedOrder.order_number} Completed &bull; Reviewed</span>
                </div>
                <span className="text-xs text-slate-400">View Details &rarr;</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => setIsTrackerOpen(true)}
              className="w-full p-3 rounded-2xl bg-slate-900/95 border border-amber-500/40 text-slate-100 font-semibold shadow-2xl flex items-center justify-between transition-transform active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2 text-xs">
                <ChefHat className="w-4 h-4 text-amber-400" />
                <span>
                  Order {currentPlacedOrder.order_number}:{' '}
                  <strong className="text-amber-400">{currentPlacedOrder.status}</strong>
                </span>
              </div>
              <span className="text-xs text-amber-400 font-bold">Track Live &rarr;</span>
            </button>
          )}
        </div>
      )}

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
                {formatCurrency(cartSubtotal, effectiveBusiness.currency, effectiveBusiness.currency_symbol)}
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
                        <span className="text-amber-400 font-bold">+{effectiveBusiness.currency_symbol}{addon.price}</span>
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
                  effectiveBusiness.currency,
                  effectiveBusiness.currency_symbol
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
            <span>Your Table {effectiveTable?.table_number || '01'} Order</span>
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
                    {formatCurrency(ci.totalPrice, effectiveBusiness.currency, effectiveBusiness.currency_symbol)}
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
              <span>{formatCurrency(cartSubtotal, effectiveBusiness.currency, effectiveBusiness.currency_symbol)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>GST ({gstRate}%)</span>
              <span>{formatCurrency(gstAmount, effectiveBusiness.currency, effectiveBusiness.currency_symbol)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Coupon Discount</span>
                <span>-{formatCurrency(discountAmount, effectiveBusiness.currency, effectiveBusiness.currency_symbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-100 font-black text-sm pt-2 border-t border-slate-800">
              <span>To Pay</span>
              <span className="text-amber-400 font-['Outfit']">
                {formatCurrency(finalTotal, effectiveBusiness.currency, effectiveBusiness.currency_symbol)}
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
            Proceed to Checkout &bull; {formatCurrency(finalTotal, effectiveBusiness.currency, effectiveBusiness.currency_symbol)}
          </Button>
        </div>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Dine-in Customer Checkout"
        description={`Confirming order for Table ${effectiveTable?.table_number || '01'}`}
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
            Total Payable: <strong className="font-['Outfit'] text-sm">{formatCurrency(finalTotal, effectiveBusiness.currency, effectiveBusiness.currency_symbol)}</strong>
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Confirm & Dispatch to Kitchen
          </Button>
        </form>
      </Modal>

      {/* Live Placed Order Tracking Screen */}
      <Modal
        isOpen={isTrackerOpen || (Boolean(currentPlacedOrder) && !placedOrder && isTrackerOpen)}
        onClose={() => setIsTrackerOpen(false)}
        title={
          currentPlacedOrder?.status === 'COMPLETED' ? (
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Order Completed! 🎉</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>Order Dispatched to Kitchen!</span>
            </div>
          )
        }
        description={
          currentPlacedOrder?.status === 'COMPLETED'
            ? 'Thank you for dining with us! How was your experience?'
            : 'Your food is being prepared. Track live kitchen status below.'
        }
        maxWidth="sm"
      >
        {currentPlacedOrder && (
          <div className="space-y-4 text-center">
            {/* Order Card Overview */}
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400 text-base">
                  {currentPlacedOrder.order_number}
                </span>
                <Badge
                  variant={currentPlacedOrder.status === 'COMPLETED' ? 'success' : 'amber'}
                  dot
                >
                  {currentPlacedOrder.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Table {effectiveTable?.table_number || currentPlacedOrder.table?.table_number || '01'} &bull;{' '}
                {currentPlacedOrder.customer_name}
              </p>
              <p className="text-xs text-slate-400">
                {currentPlacedOrder.items?.length || 0} items ordered &bull; Total:{' '}
                <strong className="text-slate-100">
                  {formatCurrency(currentPlacedOrder.total_amount, effectiveBusiness.currency, effectiveBusiness.currency_symbol)}
                </strong>
              </p>
            </div>

            {/* Google Review Prompt Card (Prominently featured when order is COMPLETED) */}
            {currentPlacedOrder.status === 'COMPLETED' && (
              <div className="p-4 rounded-3xl bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 text-left space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-1.5 shadow-sm">
                      <GoogleIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 font-['Outfit']">
                        Rate Your Experience on Google
                      </h4>
                      <p className="text-[10px] text-amber-400">
                        {effectiveBusiness.review_reward_text || 'Help our local team & earn 10% off your next visit!'}
                      </p>
                    </div>
                  </div>
                </div>

                {currentPlacedOrder.review_submitted ? (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5 text-xs text-emerald-300">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Review Recorded ({currentPlacedOrder.review_rating}★ on {currentPlacedOrder.review_platform})</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Thank you for your generous feedback! Show this to staff or use code{' '}
                      <strong className="font-mono text-amber-300">{effectiveBusiness.review_coupon_code || 'REVIEW10'}</strong>{' '}
                      for your reward.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-center gap-1.5 py-1 bg-slate-950/60 rounded-2xl border border-slate-800">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setIsReviewModalOpen(true)}
                          className="p-1 hover:scale-125 transition-transform text-amber-400 cursor-pointer"
                        >
                          <Star className="w-6 h-6 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="primary"
                      className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold font-['Outfit'] shadow-md"
                      onClick={() => setIsReviewModalOpen(true)}
                      leftIcon={<GoogleIcon className="w-4 h-4" />}
                      rightIcon={<ExternalLink className="w-3.5 h-3.5 ml-auto text-slate-600" />}
                    >
                      Leave a Google Review
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Live Visual Tracker Progression */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-3">
              <h4 className="text-xs font-bold text-slate-300">Kitchen Pipeline Status</h4>
              <div className="space-y-2 text-xs">
                {/* Step 1 */}
                <div
                  className={`flex items-center gap-2 font-semibold ${
                    ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'].includes(currentPlacedOrder.status)
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>1. Order Placed & Confirmed</span>
                </div>

                {/* Step 2 */}
                <div
                  className={`flex items-center gap-2 font-semibold ${
                    ['PREPARING', 'READY', 'SERVED', 'COMPLETED'].includes(currentPlacedOrder.status)
                      ? 'text-amber-400'
                      : 'text-slate-500'
                  }`}
                >
                  <ChefHat
                    className={`w-4 h-4 shrink-0 ${
                      currentPlacedOrder.status === 'PREPARING' ? 'animate-bounce text-amber-400' : ''
                    }`}
                  />
                  <span>2. Kitchen Station Preparing ({effectiveBranch.name})</span>
                </div>

                {/* Step 3 */}
                <div
                  className={`flex items-center gap-2 font-semibold ${
                    ['READY', 'SERVED', 'COMPLETED'].includes(currentPlacedOrder.status)
                      ? 'text-purple-400'
                      : 'text-slate-500'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>3. Plated & Ready for Service</span>
                </div>

                {/* Step 4 */}
                <div
                  className={`flex items-center gap-2 font-semibold ${
                    ['SERVED', 'COMPLETED'].includes(currentPlacedOrder.status)
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  <Utensils className="w-4 h-4 shrink-0" />
                  <span>4. Served at Table {effectiveTable?.table_number || currentPlacedOrder.table?.table_number || '01'}</span>
                </div>

                {/* Step 5: Completed */}
                <div
                  className={`flex items-center gap-2 font-semibold ${
                    currentPlacedOrder.status === 'COMPLETED'
                      ? 'text-amber-400'
                      : 'text-slate-600'
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>5. Order Completed & Dining Concluded 🎉</span>
                </div>
              </div>
            </div>


            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1 text-xs"
                onClick={() => setIsTrackerOpen(false)}
              >
                Close Tracker
              </Button>
              <Button
                variant="primary"
                className="flex-1 text-xs"
                onClick={() => {
                  setIsTrackerOpen(false);
                  info('Browse Menu', 'You can order more items whenever ready.');
                }}
              >
                Order More Items
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Google Review Modal Popup */}
      <GoogleReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        order={currentPlacedOrder}
        business={effectiveBusiness}
        branch={effectiveBranch}
        onSubmitReview={handleReviewSubmit}
      />

        {/* Customer Experience Footer */}
        <div className="mt-auto py-6 px-4 text-center border-t border-slate-900 text-slate-500 text-[11px] space-y-1.5">
          <p>© {new Date().getFullYear()} {effectiveBusiness.name} &bull; Contactless Mobile Dining</p>
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

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Business,
  Branch,
  RestaurantTable,
  Order,
  OrderItem,
  OrderStatus,
  MenuItem,
  MenuCategory,
  Customer,
  CustomerSegment,
  Coupon,
  InventoryItem,
  Campaign,
  Subscription,
  TableStatus,
} from '../types';
import { generateUUID, isValidUUID } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { showLockScreenNotification, dispatchWebPushViaEdge, getOrderStatusNotificationConfig } from '../lib/pushNotifications';

interface BusinessContextType {
  // Tenant states
  activeBusiness: Business;
  activeBranch: Branch;
  branches: Branch[];
  allBusinesses: Business[];
  subscriptions: Subscription[];

  // Tenant Operations
  switchBusiness: (businessId: string) => void;
  switchBranch: (branchId: string) => void;
  createBranch: (data: { name: string; address?: string; phone?: string; gst_number?: string }) => void;
  updateBusinessProfile: (data: Partial<Business>) => void;
  updateBranchSettings: (data: Partial<Branch>) => void;
  onboardNewBusiness: (businessName: string, branchName: string, currency?: string) => Promise<Business>;

  // Data collections (filtered by active tenant)
  tables: RestaurantTable[];
  orders: Order[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  customers: Customer[];
  coupons: Coupon[];
  inventory: InventoryItem[];
  campaigns: Campaign[];

  // Order & Operations Handlers
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  submitOrderReview: (
    orderId: string,
    review: {
      rating: number;
      feedback?: string;
      platform?: 'GOOGLE' | 'INTERNAL';
    }
  ) => void;
  markReviewRequested: (orderId: string) => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  createTable: (tableNumber: string, capacity: number, seatingArea: string) => RestaurantTable;
  deleteTable: (tableId: string) => void;

  // Menu Handlers
  createCategory: (name: string, description?: string) => Promise<MenuCategory> | void;
  createMenuItem: (item: Partial<MenuItem>) => Promise<void> | void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => Promise<void> | void;
  deleteMenuItem: (id: string) => Promise<void> | void;

  // Inventory Handlers
  updateInventoryStock: (id: string, addedStock: number) => void;

  // Marketing & Smart Broadcasts
  sendSmartBroadcast: (campaignData: {
    title: string;
    message: string;
    discountCode?: string;
    linkUrl?: string;
    notificationType?: 'OFFER' | 'ANNOUNCEMENT' | 'ORDER_STATUS' | 'TEST';
  }) => Promise<any> | void;

  // Real-time sound alert toggle
  playKitchenAlert: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// Helper to detect and purge stale mock demo data from previous sessions
const isDemoData = (raw: string | null) => {
  if (!raw) return false;
  const s = raw.toLowerCase();
  return (
    s.includes('roast & brew') ||
    s.includes('roastbrew') ||
    s.includes('bella italia') ||
    s.includes('tapas trail') ||
    s.includes('spice symphony') ||
    s.includes('brew & bites') ||
    s.includes('cafeos demo') ||
    s.includes('demo-restaurant') ||
    s.includes('demo-branch') ||
    s.includes('demo@cafeos.app') ||
    s.includes('demo owner') ||
    s.includes('usr-demo') ||
    s.includes('staff-demo') ||
    s.includes('special masala chai') ||
    s.includes('hot filter coffee') ||
    s.includes('grilled paneer tikka') ||
    s.includes('classic veg burger') ||
    s.includes('spanish latte with sweet condensed foam') ||
    s.includes('creamy burrata & sun-dried tomato fettuccine') ||
    s.includes('indiranagar') ||
    s.includes('koramangala') ||
    s.includes('city center plaza') ||
    s.includes('b1111111') ||
    s.includes('ba111111') ||
    s.includes('fa111111') ||
    s.includes('fa222222') ||
    s.includes('ord-test') ||
    s.includes('99999999-9999') ||
    s.includes('biz-01') ||
    s.includes('biz-02') ||
    s.includes('branch-01') ||
    s.includes('branch-02') ||
    s.includes('tbl-01') ||
    s.includes('tbl-02') ||
    s.includes('tbl-1') ||
    s.includes('tbl-2') ||
    s.includes('tbl-3') ||
    s.includes('table-01') ||
    s.includes('cat-01') ||
    s.includes('cat-02') ||
    s.includes('cat-03') ||
    s.includes('cat-beverages') ||
    s.includes('cat-snacks') ||
    s.includes('cat-mains') ||
    s.includes('item-01') ||
    s.includes('item-02') ||
    s.includes('item-03') ||
    s.includes('item-04') ||
    s.includes('item-1') ||
    s.includes('item-2') ||
    s.includes('item-3') ||
    s.includes('item-4') ||
    s.includes('cust-01') ||
    s.includes('cust-02') ||
    s.includes('ord-01') ||
    s.includes('ord-02') ||
    s.includes('coupon-01') ||
    s.includes('inv-01') ||
    s.includes('camp-01') ||
    s.includes('sub-01') ||
    s.includes('aarav sharma') ||
    s.includes('priya patel') ||
    s.includes('vikram malhotra') ||
    s.includes('ananya iyer')
  );
};

// Auto-purge any stale mock demo keys from previous browser sessions
if (typeof window !== 'undefined') {
  try {
    const keys = [
      'cafeos_businesses',
      'cafeos_active_biz_id',
      'cafeos_branches',
      'cafeos_active_branch_id',
      'cafeos_tables',
      'cafeos_orders',
      'cafeos_categories',
      'cafeos_menu_items',
      'cafeos_customers',
      'cafeos_coupons',
      'cafeos_inventory',
      'cafeos_campaigns',
      'cafeos_staff',
      'cafeos_role',
    ];
    keys.forEach((k) => {
      const val = localStorage.getItem(k);
      if (val && isDemoData(val)) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
}

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Businesses
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    const saved = localStorage.getItem('cafeos_businesses');
    if (saved && !isDemoData(saved)) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  });

  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    const saved = localStorage.getItem('cafeos_active_biz_id');
    if (saved && !isDemoData(saved)) {
      return saved;
    }
    return '';
  });

  // Branches
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('cafeos_branches');
    if (saved && !isDemoData(saved)) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  });

  const [activeBranchId, setActiveBranchId] = useState<string>(() => {
    const saved = localStorage.getItem('cafeos_active_branch_id');
    if (saved && !isDemoData(saved)) {
      return saved;
    }
    return '';
  });

  // Tables
  const [tables, setTables] = useState<RestaurantTable[]>(() => {
    const saved = localStorage.getItem('cafeos_tables');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('cafeos_orders');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // Menu
  const [categories, setCategories] = useState<MenuCategory[]>(() => {
    const saved = localStorage.getItem('cafeos_categories');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('cafeos_menu_items');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // CRM & Loyalty
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('cafeos_customers');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('cafeos_coupons');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // Inventory
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('cafeos_inventory');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // Marketing Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem('cafeos_campaigns');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // Subscriptions (Super Admin)
  const [subscriptions] = useState<Subscription[]>([]);

  // Sync back to localStorage
  useEffect(() => {
    localStorage.setItem('cafeos_businesses', JSON.stringify(businesses));
  }, [businesses]);

  useEffect(() => {
    localStorage.setItem('cafeos_active_biz_id', activeBusinessId);
  }, [activeBusinessId]);

  useEffect(() => {
    localStorage.setItem('cafeos_branches', JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('cafeos_active_branch_id', activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    localStorage.setItem('cafeos_tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('cafeos_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('cafeos_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('cafeos_menu_items', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('cafeos_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('cafeos_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem('cafeos_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('cafeos_campaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  // Derived active items
  const activeBusiness: Business =
    businesses.find((b) => b.id === activeBusinessId) ||
    businesses[0] || {
      id: user?.id || 'pending-biz',
      name: user?.full_name ? `${user.full_name}'s Cafe` : 'My Restaurant',
      slug: 'my-restaurant',
      email: user?.email || '',
      phone: '',
      logo_url: '',
      currency: 'INR',
      currency_symbol: '₹',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      subscription_plan: 'PRO',
      google_review_url: '',
      google_place_id: '',
      enable_google_review_prompt: false,
      min_rating_for_google: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

  const currentBranches = branches.filter((br) => br.business_id === activeBusiness.id);

  const activeBranch: Branch =
    currentBranches.find((br) => br.id === activeBranchId) ||
    currentBranches[0] ||
    branches[0] || {
      id: 'main-branch',
      business_id: activeBusiness.id,
      name: 'Main Branch',
      slug: 'main-branch',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: user?.email || '',
      gst_number: '',
      tax_rate_percent: 5.0,
      service_charge_percent: 0.0,
      opening_time: '09:00',
      closing_time: '23:00',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

  // Hydrate data from Supabase whenever user or active tenant changes
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    const fetchCloudData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const curUser = sessionData?.session?.user || user;

        if (!curUser) {
          return;
        }

        // 1. Fetch staff rows for this user
        const { data: staffList, error: staffErr } = await supabase
          .from('staff')
          .select('*')
          .or(`user_id.eq.${curUser.id},email.eq.${curUser.email}`);

        if (staffErr) {
          console.warn('Error fetching staff list:', staffErr);
          return;
        }

        // Self-heal: If user has no staff row yet, check or create business
        if (!staffList || staffList.length === 0) {
          const { data: directBizList } = await supabase
            .from('businesses')
            .select('*')
            .eq('email', curUser.email);

          if (directBizList && directBizList.length > 0) {
            const directBiz = directBizList[0];
            const { data: brList } = await supabase.from('branches').select('*').eq('business_id', directBiz.id);
            const brId = brList && brList.length > 0 ? brList[0].id : null;
            await supabase.from('staff').insert({
              id: generateUUID(),
              business_id: directBiz.id,
              branch_id: brId,
              user_id: curUser.id,
              full_name: (curUser as any).user_metadata?.full_name || (curUser as any).full_name || curUser.email?.split('@')[0] || 'Owner',
              email: curUser.email,
              role: 'OWNER',
              pin_code: '1234',
              is_active: true,
            });
            setTimeout(fetchCloudData, 200);
            return;
          } else {
            const rawMeta = (curUser as any).user_metadata;
            const fallbackName = (curUser as any).full_name || curUser.email?.split('@')[0] || 'My';
            const defaultBizName = rawMeta?.business_name || (rawMeta?.full_name ? `${rawMeta.full_name}'s Cafe` : `${fallbackName}'s Cafe`);
            await onboardNewBusiness(defaultBizName, 'Main Branch');
            return;
          }
        }

        if (isMounted && staffList && staffList.length > 0) {
          const userBizIds = Array.from(new Set(staffList.map((s: any) => s.business_id).filter(Boolean)));

          const [bizRes, brRes] = await Promise.all([
            supabase.from('businesses').select('*').in('id', userBizIds),
            supabase.from('branches').select('*').in('business_id', userBizIds),
          ]);

          if (isMounted && bizRes.data && bizRes.data.length > 0) {
            setBusinesses(bizRes.data);

            // Determine active business (prefer currently selected if valid for this user, else first)
            let targetBiz = bizRes.data.find((b: any) => b.id === activeBusinessId);
            if (!targetBiz) {
              targetBiz = bizRes.data.find((b: any) => b.id === staffList[0].business_id) || bizRes.data[0];
            }
            setActiveBusinessId(targetBiz.id);

            // Determine active branch
            if (isMounted && brRes.data && brRes.data.length > 0) {
              setBranches(brRes.data);
              const bizBranches = brRes.data.filter((br: any) => br.business_id === targetBiz.id);
              let targetBranch = bizBranches.find((br: any) => br.id === activeBranchId);
              if (!targetBranch) {
                targetBranch = bizBranches.find((br: any) => br.id === staffList[0].branch_id) || bizBranches[0] || brRes.data[0];
              }
              setActiveBranchId(targetBranch.id);

              const currentBranchId = targetBranch.id;
              const currentBizId = targetBiz.id;

              // 2. Fetch tables with qr_codes for this active branch
              const { data: tblData } = await supabase
                .from('tables')
                .select('*, qr_code:qr_codes(*)')
                .eq('branch_id', currentBranchId);

              if (isMounted && tblData) {
                const formattedTables: RestaurantTable[] = tblData.map((t: any) => {
                  const rawQr = Array.isArray(t.qr_code) ? t.qr_code[0] : t.qr_code;
                  return {
                    ...t,
                    qr_code: rawQr ? {
                      ...rawQr,
                      qr_url: `${window.location.origin}/menu/${encodeURIComponent(rawQr.code_identifier || t.table_number)}`,
                    } : undefined,
                  };
                });
                setTables(formattedTables);
              }

              // 3. Fetch categories & menu items for this active business/branch
              const [catRes, itemRes] = await Promise.all([
                supabase
                  .from('menu_categories')
                  .select('*')
                  .eq('business_id', currentBizId)
                  .or(`branch_id.eq.${currentBranchId},branch_id.is.null`)
                  .order('sort_order', { ascending: true }),
                supabase
                  .from('menu_items')
                  .select('*, variants:menu_variants(*), addons:menu_addons(*)')
                  .eq('business_id', currentBizId)
                  .or(`branch_id.eq.${currentBranchId},branch_id.is.null`)
                  .order('sort_order', { ascending: true }),
              ]);

              if (catRes.error) console.error('Menu categories fetch error:', catRes.error);
              if (itemRes.error) console.error('Menu items fetch error:', itemRes.error);

              if (isMounted) {
                setCategories((catRes.data || []).filter((c: any) => !isDemoData(JSON.stringify(c))));
                setMenuItems((itemRes.data || []).filter((m: any) => !isDemoData(JSON.stringify(m))));
              }

              // 4. Fetch orders for this business
              const { data: ordData, error: ordErr } = await supabase
                .from('orders')
                .select('*, items:order_items(*)')
                .eq('business_id', currentBizId)
                .order('created_at', { ascending: false })
                .limit(100);

              if (ordErr) console.error('Orders cloud fetch error:', ordErr);

              if (isMounted) {
                const cleanOrd = (ordData || []).filter(
                  (o: any) => o.order_number !== '#ORD-TEST' && !isDemoData(JSON.stringify(o))
                );
                setOrders(cleanOrd);
              }

              // 5. Fetch customers for this business
              const { data: custData } = await supabase
                .from('customers')
                .select('*')
                .eq('business_id', currentBizId)
                .order('created_at', { ascending: false });

              if (isMounted) {
                setCustomers((custData || []).filter((c: any) => !isDemoData(JSON.stringify(c))));
              }

              // 6. Fetch coupons for this business
              const { data: coupData } = await supabase
                .from('coupons')
                .select('*')
                .eq('business_id', currentBizId);

              if (isMounted) {
                setCoupons((coupData || []).filter((cp: any) => !isDemoData(JSON.stringify(cp))));
              }

              // 7. Fetch inventory for this branch
              const { data: invData } = await supabase
                .from('inventory_items')
                .select('*')
                .eq('branch_id', currentBranchId);

              if (isMounted) {
                setInventory(invData || []);
              }

              // 8. Fetch marketing campaigns for this business
              const { data: campData } = await supabase
                .from('campaigns')
                .select('*')
                .eq('business_id', currentBizId)
                .order('created_at', { ascending: false });

              if (isMounted) {
                setCampaigns(campData || []);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Supabase cloud hydration note:', err);
      }
    };

    fetchCloudData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, activeBusinessId, activeBranchId]);

  // Supabase Realtime listeners for orders, tables, menu_items, and menu_categories
  useEffect(() => {
    if (!isSupabaseConfigured || !activeBusiness?.id) return;

    const channel = supabase
      .channel(`cafeos_realtime_${activeBusiness.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as Order;
            if (incoming.business_id === activeBusiness.id) {
              // Immediately fetch full order with items so items are never missing
              const { data: fullOrder } = await supabase
                .from('orders')
                .select('*, items:order_items(*)')
                .eq('id', incoming.id)
                .maybeSingle();

              const orderToAdd = fullOrder || incoming;
              setOrders((prev) => {
                if (prev.some((o) => o.id === orderToAdd.id)) {
                  return prev.map((o) => (o.id === orderToAdd.id ? { ...o, ...orderToAdd } : o));
                }
                return [orderToAdd, ...prev];
              });
              playKitchenAlert();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Order;
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items' },
        (payload) => {
          const newItem = payload.new as OrderItem;
          if (newItem.order_id) {
            setOrders((prev) =>
              prev.map((o) => {
                if (o.id === newItem.order_id) {
                  const currentItems = o.items || [];
                  if (currentItems.some((it) => it.id === newItem.id)) return o;
                  return { ...o, items: [...currentItems, newItem] };
                }
                return o;
              })
            );
          }
        }
      )
      .on('broadcast', { event: 'new_order_placed' }, (payload: any) => {
        const incomingOrder = payload?.payload?.order as Order;
        if (incomingOrder && incomingOrder.business_id === activeBusiness.id) {
          setOrders((prev) => {
            if (prev.some((o) => o.id === incomingOrder.id)) return prev;
            return [incomingOrder, ...prev];
          });
          playKitchenAlert();
        }
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables' },
        (payload) => {
          const updatedTable = payload.new as RestaurantTable;
          setTables((prev) =>
            prev.map((t) =>
              t.id === updatedTable.id ? { ...t, status: updatedTable.status } : t
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as MenuItem;
            if (newItem.business_id === activeBusiness.id) {
              setMenuItems((prev) => {
                if (prev.some((m) => m.id === newItem.id)) return prev;
                return [...prev, newItem];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as MenuItem;
            if (updated.business_id === activeBusiness.id) {
              setMenuItems((prev) =>
                prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) {
              setMenuItems((prev) => prev.filter((m) => m.id !== oldId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_categories' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCat = payload.new as MenuCategory;
            if (newCat.business_id === activeBusiness.id) {
              setCategories((prev) => {
                if (prev.some((c) => c.id === newCat.id)) return prev;
                return [...prev, newCat];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as MenuCategory;
            if (updated.business_id === activeBusiness.id) {
              setCategories((prev) =>
                prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) {
              setCategories((prev) => prev.filter((c) => c.id !== oldId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCust = payload.new as Customer;
            if (newCust.business_id === activeBusiness.id) {
              setCustomers((prev) => {
                if (prev.some((c) => c.id === newCust.id || (c.business_id === newCust.business_id && c.phone === newCust.phone))) {
                  return prev.map((c) => (c.id === newCust.id || c.phone === newCust.phone ? { ...c, ...newCust } : c));
                }
                return [newCust, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Customer;
            if (updated.business_id === activeBusiness.id) {
              setCustomers((prev) =>
                prev.map((c) => (c.id === updated.id || (c.business_id === updated.business_id && c.phone === updated.phone) ? { ...c, ...updated } : c))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) {
              setCustomers((prev) => prev.filter((c) => c.id !== oldId));
            }
          }
        }
      )
      .on('broadcast', { event: 'customer_updated' }, (payload: any) => {
        const cust = payload?.payload?.customer as Customer;
        if (cust && cust.business_id === activeBusiness.id) {
          setCustomers((prev) => {
            const exists = prev.some((c) => c.id === cust.id || c.phone === cust.phone);
            if (exists) {
              return prev.map((c) => (c.id === cust.id || c.phone === cust.phone ? { ...c, ...cust } : c));
            }
            return [cust, ...prev];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBusiness.id]);

  const switchBusiness = (businessId: string) => {
    const biz = businesses.find((b) => b.id === businessId);
    if (biz) {
      setActiveBusinessId(businessId);
      const bizBranches = branches.filter((br) => br.business_id === businessId);
      if (bizBranches.length > 0) {
        setActiveBranchId(bizBranches[0].id);
      }
    }
  };

  const switchBranch = (branchId: string) => {
    setActiveBranchId(branchId);
  };

  const createBranch = (data: { name: string; address?: string; phone?: string; gst_number?: string }) => {
    const newBranch: Branch = {
      id: generateUUID(),
      business_id: activeBusiness.id,
      name: data.name,
      slug: data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      address: data.address || '',
      phone: data.phone || activeBusiness.phone || '',
      gst_number: data.gst_number || '',
      tax_rate_percent: 5.0,
      service_charge_percent: 0.0,
      opening_time: '09:00',
      closing_time: '23:00',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setBranches((prev) => [...prev, newBranch]);
    setActiveBranchId(newBranch.id);
  };

  const updateBusinessProfile = (data: Partial<Business>) => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === activeBusiness.id ? { ...b, ...data, updated_at: new Date().toISOString() } : b))
    );
    if (isSupabaseConfigured && isValidUUID(activeBusiness.id)) {
      supabase.from('businesses').update({ ...data, updated_at: new Date().toISOString() }).eq('id', activeBusiness.id).then();
    }
  };

  const updateBranchSettings = (data: Partial<Branch>) => {
    setBranches((prev) =>
      prev.map((br) => (br.id === activeBranch.id ? { ...br, ...data, updated_at: new Date().toISOString() } : br))
    );
    if (isSupabaseConfigured && isValidUUID(activeBranch.id)) {
      supabase.from('branches').update({ ...data, updated_at: new Date().toISOString() }).eq('id', activeBranch.id).then();
    }
  };

  const sendSmartBroadcast = async (campaignData: {
    title: string;
    message: string;
    discountCode?: string;
    linkUrl?: string;
    notificationType?: 'OFFER' | 'ANNOUNCEMENT' | 'ORDER_STATUS' | 'TEST';
  }) => {
    const newCampaign: Campaign = {
      id: generateUUID(),
      business_id: activeBusiness.id,
      name: campaignData.title,
      target_segment: 'REGULAR',
      channel: 'WEB_PUSH',
      message_template: campaignData.message,
      status: 'SENT',
      sent_at: new Date().toISOString(),
      audience_count: customers.length || 28,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCampaigns((prev) => [newCampaign, ...prev]);

    // 1. Send Realtime Broadcast via Supabase (for currently open customer browser tabs)
    if (isSupabaseConfigured) {
      const bCastChannel = supabase.channel('public:cafeos_broadcasts');
      bCastChannel.subscribe((chStatus) => {
        if (chStatus === 'SUBSCRIBED') {
          bCastChannel.send({
            type: 'broadcast',
            event: 'marketing_push',
            payload: {
              business_id: activeBusiness.id,
              business_name: activeBusiness.name,
              logo_url: activeBusiness.logo_url,
              title: campaignData.title,
              message: campaignData.message,
              discount_code: campaignData.discountCode,
              link_url: campaignData.linkUrl,
              sent_at: new Date().toISOString(),
            },
          }).then(() => {
            setTimeout(() => supabase.removeChannel(bCastChannel), 1500);
          });
        }
      });
    }

    // 2. Server-side Web Push dispatch via Edge Function (reaches lock screens of all subscribed diner devices)
    try {
      await dispatchWebPushViaEdge({
        businessId: activeBusiness.id,
        campaignId: newCampaign.id,
        notificationType: campaignData.notificationType || 'OFFER',
        notification: {
          title: `${activeBusiness.name}: ${campaignData.title}`,
          body: campaignData.message,
          icon: activeBusiness.logo_url || '/favicon.svg',
          tag: `campaign_${newCampaign.id}`,
          url: campaignData.linkUrl || (typeof window !== 'undefined' ? window.location.href : '/'),
          chimeType: 'celebrate',
        },
      });
    } catch (pushErr) {
      console.warn('Edge push broadcast notice:', pushErr);
    }

    // 3. Trigger immediate native lock-screen notification preview on sender's device if browser has permission
    showLockScreenNotification({
      title: `${activeBusiness.name}: ${campaignData.title}`,
      body: campaignData.message,
      icon: activeBusiness.logo_url || '/favicon.svg',
      chimeType: 'ping',
      tag: 'smart_broadcast',
      url: campaignData.linkUrl || (typeof window !== 'undefined' ? window.location.href : '/'),
    });
  };

  const onboardNewBusiness = async (
    businessName: string,
    branchName: string,
    currency = 'INR'
  ): Promise<Business> => {
    const newBizId = generateUUID();
    const newBranchId = generateUUID();
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const newBusiness: Business = {
      id: newBizId,
      name: businessName,
      slug,
      email: `contact@${slug}.com`,
      currency,
      currency_symbol: currency === 'INR' ? '₹' : '$',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      subscription_plan: 'PRO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newBranch: Branch = {
      id: newBranchId,
      business_id: newBizId,
      name: branchName,
      slug: branchName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      tax_rate_percent: 5.0,
      service_charge_percent: 0.0,
      opening_time: '09:00',
      closing_time: '23:00',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create 3 initial sample tables for this new business
    const newTables: RestaurantTable[] = [1, 2, 3].map((num) => {
      const tblId = generateUUID();
      const codeId = `${slug.toUpperCase()}-T${num}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return {
        id: tblId,
        business_id: newBizId,
        branch_id: newBranchId,
        table_number: `T-0${num}`,
        capacity: 4,
        seating_area: 'Main Hall',
        status: 'AVAILABLE',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        qr_code: {
          id: generateUUID(),
          business_id: newBizId,
          branch_id: newBranchId,
          table_id: tblId,
          code_identifier: codeId,
          qr_url: `${window.location.origin}/menu/${codeId}`,
          scan_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    });

    setBusinesses((prev) => [...prev, newBusiness]);
    setBranches((prev) => [...prev, newBranch]);
    setTables((prev) => [...prev, ...newTables]);
    setActiveBusinessId(newBizId);
    setActiveBranchId(newBranchId);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('businesses').insert({
          id: newBusiness.id,
          name: newBusiness.name,
          slug: newBusiness.slug,
          email: newBusiness.email,
          currency: newBusiness.currency,
          currency_symbol: newBusiness.currency_symbol,
          timezone: newBusiness.timezone,
          status: newBusiness.status,
          subscription_plan: newBusiness.subscription_plan,
        });

        await supabase.from('branches').insert({
          id: newBranch.id,
          business_id: newBranch.business_id,
          name: newBranch.name,
          slug: newBranch.slug,
          tax_rate_percent: newBranch.tax_rate_percent,
          service_charge_percent: newBranch.service_charge_percent,
          opening_time: newBranch.opening_time,
          closing_time: newBranch.closing_time,
          is_active: newBranch.is_active,
        });

        for (const tbl of newTables) {
          await supabase.from('tables').insert({
            id: tbl.id,
            business_id: tbl.business_id,
            branch_id: tbl.branch_id,
            table_number: tbl.table_number,
            capacity: tbl.capacity,
            seating_area: tbl.seating_area,
            status: tbl.status,
            is_active: tbl.is_active,
          });
          if (tbl.qr_code) {
            await supabase.from('qr_codes').insert({
              id: tbl.qr_code.id,
              business_id: tbl.qr_code.business_id,
              branch_id: tbl.qr_code.branch_id,
              table_id: tbl.id,
              code_identifier: tbl.qr_code.code_identifier,
              qr_url: tbl.qr_code.qr_url,
              is_active: true,
            });
          }
        }
      } catch (err) {
        console.warn('Supabase onboarding sync notice:', err);
      }
    }

    return newBusiness;
  };

  const playKitchenAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {}
  };

  const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
    const orderNumber = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const targetBizId = isValidUUID(orderData.business_id) ? orderData.business_id! : activeBusiness.id;
    let targetBranchId = isValidUUID(orderData.branch_id) ? orderData.branch_id! : activeBranch.id;

    // Ensure targetBranchId is a valid branch for targetBizId
    if (!isValidUUID(targetBranchId)) {
      const bFound = branches.find((b) => b.business_id === targetBizId && isValidUUID(b.id));
      if (bFound) {
        targetBranchId = bFound.id;
      }
    }

    const newOrder: Order = {
      id: generateUUID(),
      business_id: targetBizId,
      branch_id: targetBranchId,
      order_number: orderNumber,
      customer_name: orderData.customer_name || 'Guest Diner',
      customer_phone: orderData.customer_phone || '',
      table_id: orderData.table_id,
      status: 'PLACED',
      subtotal: orderData.subtotal || 0,
      tax_amount: orderData.tax_amount || 0,
      discount_amount: orderData.discount_amount || 0,
      service_charge: orderData.service_charge || 0,
      tip_amount: orderData.tip_amount || 0,
      total_amount: orderData.total_amount || 0,
      payment_status: orderData.payment_status || 'PENDING',
      payment_method: orderData.payment_method || 'UPI',
      notes: orderData.notes || '',
      items: orderData.items || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    // If order is linked to a table, update table status to OCCUPIED
    if (orderData.table_id) {
      updateTableStatus(orderData.table_id, 'OCCUPIED');
    }

    // Update customer spending, loyalty points, and CRM profile
    let targetCustomerId: string | null = null;
    let preparedCustomer: Customer | null = null;

    if (orderData.customer_phone && orderData.customer_phone.trim()) {
      const cleanPhone = orderData.customer_phone.trim();
      const cleanName = (orderData.customer_name && orderData.customer_name.trim()) || 'Guest Diner';

      const existingCust = customers.find(
        (c) => c.business_id === targetBizId && c.phone === cleanPhone
      );

      const prevSpend = Number(existingCust?.total_spending || 0);
      const prevVisits = Number(existingCust?.visit_count || 0);
      const prevPoints = Number(existingCust?.loyalty_points || 0);

      const newSpend = prevSpend + Number(newOrder.total_amount || 0);
      const newVisits = prevVisits + 1;
      const newPoints = prevPoints + Math.floor(Number(newOrder.total_amount || 0) * 0.05);

      let newSegment: CustomerSegment = 'NEW';
      if (newSpend >= 5000 || newVisits >= 10) {
        newSegment = 'VIP';
      } else if (newVisits >= 3) {
        newSegment = 'REGULAR';
      }

      preparedCustomer = {
        id: existingCust?.id || generateUUID(),
        business_id: targetBizId,
        name: cleanName,
        phone: cleanPhone,
        email: existingCust?.email || undefined,
        total_spending: newSpend,
        visit_count: newVisits,
        last_visit: new Date().toISOString(),
        loyalty_points: newPoints,
        segment: newSegment,
        notes: existingCust?.notes || undefined,
        created_at: existingCust?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      targetCustomerId = preparedCustomer.id;
      newOrder.customer_id = targetCustomerId;

      // Update local state immediately for instant CRM responsiveness
      if (preparedCustomer) {
        const custToSave = preparedCustomer;
        setCustomers((prev) => {
          const idx = prev.findIndex(
            (c) => c.id === custToSave.id || (c.business_id === targetBizId && c.phone === cleanPhone)
          );
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = custToSave;
            return updated;
          }
          return [custToSave, ...prev];
        });
      }
    }

    playKitchenAlert();

    // Securely persist order to Supabase via server-side submit_customer_order RPC
    if (isSupabaseConfigured) {
      try {
        // Validate linked table ID
        let dbTableId: string | null = null;
        if (orderData.table_id && isValidUUID(orderData.table_id)) {
          const tableExists = tables.some((t) => t.id === orderData.table_id);
          if (tableExists) {
            dbTableId = orderData.table_id;
          }
        }

        const rpcPayload = {
          business_id: targetBizId,
          branch_id: targetBranchId,
          table_id: dbTableId,
          customer_name: orderData.customer_name || 'Guest Diner',
          customer_phone: orderData.customer_phone || null,
          coupon_code: (orderData as any).coupon_code || null,
          payment_method: orderData.payment_method || 'UPI',
          payment_status: orderData.payment_status || 'PENDING',
          notes: orderData.notes || null,
          tip_amount: orderData.tip_amount || 0,
          items: (orderData.items || []).map((it) => ({
            menu_item_id: it.menu_item_id,
            variant_id: (it as any).variant_id || null,
            variant_name: it.variant_name || null,
            quantity: it.quantity,
            notes: it.notes || null,
            addons: (it.addons || []).map((a) => ({
              id: (a as any).id || null,
              addon_name: a.addon_name,
              price: a.price,
            })),
          })),
        };

        const { data: rpcRes, error: rpcErr } = await supabase.rpc('submit_customer_order', {
          p_order_payload: rpcPayload,
        });

        if (rpcErr) {
          console.error('Supabase submit_customer_order RPC error:', rpcErr);
          throw rpcErr;
        }

        if (rpcRes) {
          newOrder.id = rpcRes.order_id;
          newOrder.order_number = rpcRes.order_number;
          newOrder.order_token = rpcRes.order_token;
          newOrder.subtotal = Number(rpcRes.subtotal);
          newOrder.tax_amount = Number(rpcRes.tax_amount);
          newOrder.discount_amount = Number(rpcRes.discount_amount);
          newOrder.service_charge = Number(rpcRes.service_charge);
          newOrder.total_amount = Number(rpcRes.total_amount);
          newOrder.customer_id = rpcRes.customer_id || undefined;
          newOrder.status = rpcRes.status || 'PLACED';

          // Update local state orders with server-computed order
          setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
        }

        // Dual-Layer Instant Realtime Broadcast to notify all cafe owner/staff/KDS screens
        try {
          const realtimeChannel = supabase.channel(`cafeos_realtime_${targetBizId}`);
          realtimeChannel.subscribe((chStatus) => {
            if (chStatus === 'SUBSCRIBED') {
              realtimeChannel
                .send({
                  type: 'broadcast',
                  event: 'new_order_placed',
                  payload: { order: newOrder },
                })
                .then(() => {
                  if (preparedCustomer) {
                    realtimeChannel.send({
                      type: 'broadcast',
                      event: 'customer_updated',
                      payload: { customer: preparedCustomer },
                    });
                  }
                  setTimeout(() => supabase.removeChannel(realtimeChannel), 2000);
                });
            }
          });
        } catch (bcErr) {
          console.warn('Realtime order broadcast notice:', bcErr);
        }
      } catch (e) {
        console.error('Supabase submit_customer_order exception:', e);
      }
    }

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              updated_at: new Date().toISOString(),
            }
          : o
      )
    );

    // If completed or cancelled, free the table
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder?.table_id && (status === 'COMPLETED' || status === 'CANCELLED')) {
      updateTableStatus(targetOrder.table_id, 'AVAILABLE');
    }

    if (isSupabaseConfigured && isValidUUID(orderId)) {
      supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId).then();

      // Broadcast to both customer order channel and business realtime channel
      try {
        const custCh = supabase.channel(`cust_order_${orderId}`);
        custCh.subscribe((chStatus) => {
          if (chStatus === 'SUBSCRIBED') {
            custCh.send({
              type: 'broadcast',
              event: 'order_status_updated',
              payload: { orderId, status },
            }).then(() => {
              setTimeout(() => supabase.removeChannel(custCh), 1500);
            });
          }
        });

        const targetBizId = targetOrder?.business_id || activeBusiness.id;
        const bizCh = supabase.channel(`cafeos_realtime_${targetBizId}`);
        bizCh.subscribe((chStatus) => {
          if (chStatus === 'SUBSCRIBED') {
            bizCh.send({
              type: 'broadcast',
              event: 'order_status_updated',
              payload: { orderId, status },
            }).then(() => {
              setTimeout(() => supabase.removeChannel(bizCh), 1500);
            });
          }
        });
      } catch (bcErr) {
        console.warn('Realtime status broadcast notice:', bcErr);
      }
    }

    // 3. Dispatch real Web Push via Edge Function to wake up diner's lock screen
    if (targetOrder) {
      try {
        const table = tables.find((t) => t.id === targetOrder.table_id);
        const tableName = table ? table.table_number : undefined;
        const notifCfg = getOrderStatusNotificationConfig(
          status,
          targetOrder.order_number,
          tableName,
          activeBusiness.name
        );

        dispatchWebPushViaEdge({
          businessId: targetOrder.business_id || activeBusiness.id,
          branchId: targetOrder.branch_id || activeBranch?.id,
          customerId: targetOrder.customer_id || undefined,
          orderId: targetOrder.id,
          notificationType: 'ORDER_STATUS',
          notification: {
            title: notifCfg.title,
            body: notifCfg.body,
            icon: activeBusiness.logo_url || '/favicon.svg',
            tag: `order_status_${targetOrder.id}`,
            url: `/order/${targetOrder.table_id || ''}`,
            orderId: targetOrder.id,
            chimeType: notifCfg.chimeType,
          },
        }).catch((err) => {
          console.warn('Web push status dispatch error:', err);
        });
      } catch (pushEx) {
        console.warn('Push notification dispatch notice:', pushEx);
      }
    }
  };

  const submitOrderReview = (
    orderId: string,
    review: {
      rating: number;
      feedback?: string;
      platform?: 'GOOGLE' | 'INTERNAL';
    }
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              review_submitted: true,
              review_rating: review.rating,
              review_feedback: review.feedback,
              review_platform: review.platform || 'GOOGLE',
              updated_at: new Date().toISOString(),
            }
          : o
      )
    );
  };

  const markReviewRequested = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              review_requested_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : o
      )
    );
  };

  const updateTableStatus = (tableId: string, status: TableStatus) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status, updated_at: new Date().toISOString() } : t))
    );

    if (isSupabaseConfigured && isValidUUID(tableId)) {
      supabase.from('tables').update({ status, updated_at: new Date().toISOString() }).eq('id', tableId).then();
    }
  };

  const createTable = (tableNumber: string, capacity: number, seatingArea: string): RestaurantTable => {
    const tableId = generateUUID();
    const qrIdentifier = `${activeBusiness.slug.toUpperCase()}-${activeBranch.slug.toUpperCase()}-${tableNumber}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newTable: RestaurantTable = {
      id: tableId,
      business_id: activeBusiness.id,
      branch_id: activeBranch.id,
      table_number: tableNumber,
      capacity,
      seating_area: seatingArea,
      status: 'AVAILABLE',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      qr_code: {
        id: generateUUID(),
        business_id: activeBusiness.id,
        branch_id: activeBranch.id,
        table_id: tableId,
        code_identifier: qrIdentifier,
        qr_url: `${window.location.origin}/menu/${qrIdentifier}`,
        scan_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    setTables((prev) => [...prev, newTable]);

    if (isSupabaseConfigured) {
      supabase.from('tables').insert({
        id: newTable.id,
        business_id: newTable.business_id,
        branch_id: newTable.branch_id,
        table_number: newTable.table_number,
        capacity: newTable.capacity,
        seating_area: newTable.seating_area,
        status: newTable.status,
        is_active: newTable.is_active,
      }).then(({ error }) => {
        if (!error && newTable.qr_code) {
          supabase.from('qr_codes').insert({
            id: newTable.qr_code.id,
            business_id: newTable.business_id,
            branch_id: newTable.branch_id,
            table_id: newTable.id,
            code_identifier: newTable.qr_code.code_identifier,
            qr_url: newTable.qr_code.qr_url,
            is_active: true,
          }).then();
        }
      });
    }

    return newTable;
  };

  const deleteTable = (tableId: string) => {
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    if (isSupabaseConfigured && isValidUUID(tableId)) {
      supabase.from('tables').delete().eq('id', tableId).then();
    }
  };

  const createCategory = async (name: string, description?: string): Promise<MenuCategory> => {
    const newCat: MenuCategory = {
      id: generateUUID(),
      business_id: activeBusiness.id,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description,
      sort_order: categories.length + 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);

    if (isSupabaseConfigured) {
      try {
        const { error: catErr } = await supabase.from('menu_categories').insert({
          id: newCat.id,
          business_id: newCat.business_id,
          branch_id: isValidUUID(activeBranch.id) ? activeBranch.id : null,
          name: newCat.name,
          slug: newCat.slug,
          description: newCat.description || null,
          sort_order: newCat.sort_order,
          is_active: true,
        });
        if (catErr) {
          console.error('Failed to create menu category in Supabase:', catErr);
        }
      } catch (err) {
        console.error('Category insert exception:', err);
      }
    }
    return newCat;
  };

  const createMenuItem = async (item: Partial<MenuItem>) => {
    let catId = item.category_id;
    if (!catId || !isValidUUID(catId)) {
      const validCat = categories.find((c) => isValidUUID(c.id));
      if (validCat) {
        catId = validCat.id;
      } else {
        const createdCat = await createCategory('General');
        catId = createdCat.id;
      }
    }

    const newItem: MenuItem = {
      id: generateUUID(),
      business_id: activeBusiness.id,
      branch_id: isValidUUID(activeBranch.id) ? activeBranch.id : undefined,
      category_id: catId,
      name: item.name || 'New Item',
      description: item.description || '',
      price: item.price || 0,
      gst_percent: item.gst_percent ?? 5,
      is_veg: item.is_veg ?? true,
      is_available: item.is_available ?? true,
      is_bestseller: item.is_bestseller ?? false,
      is_new: item.is_new ?? true,
      is_spicy: item.is_spicy ?? false,
      prep_time_minutes: item.prep_time_minutes || 15,
      calories: item.calories,
      image_url: item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
      sort_order: menuItems.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      variants: item.variants || [],
      addons: item.addons || [],
    };
    setMenuItems((prev) => [...prev, newItem]);

    if (isSupabaseConfigured) {
      try {
        const { error: itemErr } = await supabase.from('menu_items').insert({
          id: newItem.id,
          business_id: newItem.business_id,
          branch_id: isValidUUID(newItem.branch_id) ? newItem.branch_id : null,
          category_id: newItem.category_id,
          name: newItem.name,
          description: newItem.description || null,
          price: newItem.price,
          gst_percent: newItem.gst_percent,
          is_veg: newItem.is_veg,
          is_available: newItem.is_available,
          is_bestseller: newItem.is_bestseller,
          is_new: newItem.is_new,
          is_spicy: newItem.is_spicy,
          prep_time_minutes: newItem.prep_time_minutes,
          calories: newItem.calories || null,
          image_url: newItem.image_url || null,
          sort_order: newItem.sort_order,
        });

        if (itemErr) {
          console.error('Failed to create menu item in Supabase:', itemErr);
        }

        if (newItem.variants && newItem.variants.length > 0) {
          const variantsPayload = newItem.variants.map((v) => ({
            id: isValidUUID(v.id) ? v.id : generateUUID(),
            menu_item_id: newItem.id,
            name: v.name,
            price: v.price,
            is_available: v.is_available ?? true,
          }));
          const { error: varErr } = await supabase.from('menu_variants').insert(variantsPayload);
          if (varErr) console.warn('Menu variants insert note:', varErr);
        }

        if (newItem.addons && newItem.addons.length > 0) {
          const addonsPayload = newItem.addons.map((a) => ({
            id: isValidUUID(a.id) ? a.id : generateUUID(),
            menu_item_id: newItem.id,
            name: a.name,
            price: a.price,
            is_available: a.is_available ?? true,
            max_selection: a.max_selection ?? 1,
          }));
          const { error: addErr } = await supabase.from('menu_addons').insert(addonsPayload);
          if (addErr) console.warn('Menu addons insert note:', addErr);
        }
      } catch (err) {
        console.error('Menu item insert exception:', err);
      }
    }
  };

  const updateMenuItem = async (id: string, updated: Partial<MenuItem>) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated, updated_at: new Date().toISOString() } : item))
    );

    if (isSupabaseConfigured && isValidUUID(id)) {
      try {
        const dbPayload: Record<string, any> = { updated_at: new Date().toISOString() };
        if (updated.category_id && isValidUUID(updated.category_id)) dbPayload.category_id = updated.category_id;
        if (updated.name !== undefined) dbPayload.name = updated.name;
        if (updated.description !== undefined) dbPayload.description = updated.description;
        if (updated.price !== undefined) dbPayload.price = updated.price;
        if (updated.gst_percent !== undefined) dbPayload.gst_percent = updated.gst_percent;
        if (updated.is_veg !== undefined) dbPayload.is_veg = updated.is_veg;
        if (updated.is_available !== undefined) dbPayload.is_available = updated.is_available;
        if (updated.is_bestseller !== undefined) dbPayload.is_bestseller = updated.is_bestseller;
        if (updated.is_new !== undefined) dbPayload.is_new = updated.is_new;
        if (updated.is_spicy !== undefined) dbPayload.is_spicy = updated.is_spicy;
        if (updated.prep_time_minutes !== undefined) dbPayload.prep_time_minutes = updated.prep_time_minutes;
        if (updated.calories !== undefined) dbPayload.calories = updated.calories;
        if (updated.image_url !== undefined) dbPayload.image_url = updated.image_url;
        if (updated.sort_order !== undefined) dbPayload.sort_order = updated.sort_order;

        const { error: updateErr } = await supabase.from('menu_items').update(dbPayload).eq('id', id);
        if (updateErr) {
          console.error('Failed to update menu item in Supabase:', updateErr);
        }
      } catch (err) {
        console.error('Menu item update exception:', err);
      }
    }
  };

  const deleteMenuItem = async (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));

    if (isSupabaseConfigured && isValidUUID(id)) {
      try {
        const { error: delErr } = await supabase.from('menu_items').delete().eq('id', id);
        if (delErr) {
          console.error('Failed to delete menu item from Supabase:', delErr);
        }
      } catch (err) {
        console.error('Menu item delete exception:', err);
      }
    }
  };

  const updateInventoryStock = (id: string, addedStock: number) => {
    setInventory((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              current_stock: Math.max(0, inv.current_stock + addedStock),
              updated_at: new Date().toISOString(),
            }
          : inv
      )
    );
  };

  // Filter tenant isolated datasets
  const tenantTables = tables.filter(
    (t) => t.business_id === activeBusiness.id && t.branch_id === activeBranch.id
  );
  const tenantOrders = orders.filter((o) => o.business_id === activeBusiness.id);
  const tenantCategories = categories.filter((c) => c.business_id === activeBusiness.id);
  const tenantMenuItems = menuItems.filter((m) => m.business_id === activeBusiness.id);
  const tenantCustomers = customers.filter((c) => c.business_id === activeBusiness.id);
  const tenantCoupons = coupons.filter((c) => c.business_id === activeBusiness.id);
  const tenantInventory = inventory.filter((i) => i.business_id === activeBusiness.id);
  const tenantCampaigns = campaigns.filter((cp) => cp.business_id === activeBusiness.id);

  return (
    <BusinessContext.Provider
      value={{
        activeBusiness,
        activeBranch,
        branches: currentBranches,
        allBusinesses: businesses,
        subscriptions,
        switchBusiness,
        switchBranch,
        createBranch,
        updateBusinessProfile,
        updateBranchSettings,
        onboardNewBusiness,
        tables: tenantTables,
        orders: tenantOrders,
        categories: tenantCategories,
        menuItems: tenantMenuItems,
        customers: tenantCustomers,
        coupons: tenantCoupons,
        inventory: tenantInventory,
        campaigns: tenantCampaigns,
        createOrder,
        updateOrderStatus,
        submitOrderReview,
        markReviewRequested,
        updateTableStatus,
        createTable,
        deleteTable,
        createCategory,
        createMenuItem,
        updateMenuItem,
        deleteMenuItem,
        updateInventoryStock,
        sendSmartBroadcast,
        playKitchenAlert,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Business,
  Branch,
  RestaurantTable,
  Order,
  OrderStatus,
  MenuItem,
  MenuCategory,
  Customer,
  Coupon,
  InventoryItem,
  Campaign,
  Subscription,
  TableStatus,
} from '../types';
import {
  INITIAL_BUSINESSES,
  INITIAL_BRANCHES,
  INITIAL_TABLES,
  INITIAL_ORDERS,
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_CUSTOMERS,
  INITIAL_COUPONS,
  INITIAL_INVENTORY,
  INITIAL_CAMPAIGNS,
  INITIAL_SUBSCRIPTIONS,
} from '../lib/mockData';
import { generateUUID, isValidUUID } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  createCategory: (name: string, description?: string) => void;
  createMenuItem: (item: Partial<MenuItem>) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;

  // Inventory Handlers
  updateInventoryStock: (id: string, addedStock: number) => void;

  // Marketing & Smart Broadcasts
  sendSmartBroadcast: (campaignData: {
    title: string;
    message: string;
    discountCode?: string;
    linkUrl?: string;
  }) => void;

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
    s.includes('b2222222-2222-2222-2222-222222222222') ||
    s.includes('indiranagar flagship') ||
    s.includes('#rb-108') ||
    s.includes('b1111111-1111-1111-1111-111111111111') ||
    s.includes('ba111111-1111-1111-1111-111111111111') ||
    s.includes('shyams-cafe') ||
    s.includes("shyam's cafe") ||
    s.includes('shyamskthakur@gmail.com') ||
    s.includes('#ord-1001') ||
    s.includes('rahul sharma') ||
    s.includes('cafeos demo') ||
    s.includes('demo-restaurant') ||
    s.includes('demo@cafeos.app')
  );
};

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
    return isSupabaseConfigured ? [] : INITIAL_BUSINESSES;
  });

  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    const saved = localStorage.getItem('cafeos_active_biz_id');
    if (saved && !isDemoData(saved)) {
      return saved;
    }
    return isSupabaseConfigured ? '' : INITIAL_BUSINESSES[0].id;
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
    return isSupabaseConfigured ? [] : INITIAL_BRANCHES;
  });

  const [activeBranchId, setActiveBranchId] = useState<string>(() => {
    const saved = localStorage.getItem('cafeos_active_branch_id');
    if (saved && !isDemoData(saved)) {
      return saved;
    }
    return isSupabaseConfigured ? '' : INITIAL_BRANCHES[0].id;
  });

  // Tables
  const [tables, setTables] = useState<RestaurantTable[]>(() => {
    const saved = localStorage.getItem('cafeos_tables');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return isSupabaseConfigured ? [] : INITIAL_TABLES;
  });

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('cafeos_orders');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return isSupabaseConfigured ? [] : INITIAL_ORDERS;
  });

  // Menu
  const [categories, setCategories] = useState<MenuCategory[]>(() => {
    const saved = localStorage.getItem('cafeos_categories');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return isSupabaseConfigured ? [] : INITIAL_CATEGORIES;
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('cafeos_menu_items');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return isSupabaseConfigured ? [] : INITIAL_MENU_ITEMS;
  });

  // CRM & Loyalty
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('cafeos_customers');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return isSupabaseConfigured ? [] : INITIAL_CUSTOMERS;
  });

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('cafeos_coupons');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return isSupabaseConfigured ? [] : INITIAL_COUPONS;
  });

  // Inventory
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('cafeos_inventory');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return isSupabaseConfigured ? [] : INITIAL_INVENTORY;
  });

  // Marketing Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem('cafeos_campaigns');
    if (saved && !isDemoData(saved)) {
      try { return JSON.parse(saved); } catch {}
    }
    return isSupabaseConfigured ? [] : INITIAL_CAMPAIGNS;
  });

  // Subscriptions (Super Admin)
  const [subscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);

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
    businesses[0] ||
    (isSupabaseConfigured
      ? {
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
        }
      : INITIAL_BUSINESSES[0]);

  const currentBranches = branches.filter((br) => br.business_id === activeBusiness.id);

  const activeBranch: Branch =
    currentBranches.find((br) => br.id === activeBranchId) ||
    currentBranches[0] ||
    branches[0] ||
    (isSupabaseConfigured
      ? {
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
        }
      : INITIAL_BRANCHES[0]);

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

              // 3. Fetch categories & menu items for this active branch
              const [catRes, itemRes] = await Promise.all([
                supabase.from('menu_categories').select('*').eq('branch_id', currentBranchId).order('display_order', { ascending: true }),
                supabase.from('menu_items').select('*, variants:menu_variants(*), addons:menu_addons(*)').eq('branch_id', currentBranchId).order('display_order', { ascending: true }),
              ]);

              if (isMounted) {
                setCategories(catRes.data || []);
                setMenuItems(itemRes.data || []);
              }

              // 4. Fetch orders for this branch
              const { data: ordData } = await supabase
                .from('orders')
                .select('*, items:order_items(*)')
                .eq('branch_id', currentBranchId)
                .order('created_at', { ascending: false })
                .limit(50);

              if (isMounted) {
                setOrders(ordData || []);
              }

              // 5. Fetch customers for this business
              const { data: custData } = await supabase
                .from('customers')
                .select('*')
                .eq('business_id', currentBizId)
                .order('created_at', { ascending: false });

              if (isMounted) {
                setCustomers(custData || []);
              }

              // 6. Fetch coupons for this business
              const { data: coupData } = await supabase
                .from('coupons')
                .select('*')
                .eq('business_id', currentBizId);

              if (isMounted) {
                setCoupons(coupData || []);
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

  // Supabase Realtime listeners for orders and tables
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('public:cafeos_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            if (newOrder.business_id === activeBusiness.id) {
              setOrders((prev) => {
                if (prev.some((o) => o.id === newOrder.id)) return prev;
                return [newOrder, ...prev];
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

  const sendSmartBroadcast = (campaignData: {
    title: string;
    message: string;
    discountCode?: string;
    linkUrl?: string;
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

    // Send Realtime Broadcast via Supabase
    if (isSupabaseConfigured) {
      supabase.channel('public:cafeos_broadcasts').send({
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
      }).then();
    }

    // Trigger immediate native notification if browser has permission
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`${activeBusiness.name}: ${campaignData.title}`, {
          body: campaignData.message,
          icon: activeBusiness.logo_url || '/favicon.svg',
          badge: '/favicon.svg',
        });
      } catch (err) {
        console.warn('Native notification trigger notice:', err);
      }
    }
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
    const newOrder: Order = {
      id: generateUUID(),
      business_id: orderData.business_id || activeBusiness.id,
      branch_id: orderData.branch_id || activeBranch.id,
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

    // Update customer spending or add customer if new
    if (orderData.customer_phone) {
      setCustomers((prev) => {
        const existing = prev.find(
          (c) => c.business_id === activeBusiness.id && c.phone === orderData.customer_phone
        );
        if (existing) {
          return prev.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  total_spending: c.total_spending + newOrder.total_amount,
                  visit_count: c.visit_count + 1,
                  last_visit: new Date().toISOString(),
                  loyalty_points: c.loyalty_points + Math.floor(newOrder.total_amount * 0.05),
                }
              : c
          );
        } else {
          const newCust: Customer = {
            id: generateUUID(),
            business_id: activeBusiness.id,
            name: orderData.customer_name || 'Guest Diner',
            phone: orderData.customer_phone || '',
            total_spending: newOrder.total_amount,
            visit_count: 1,
            last_visit: new Date().toISOString(),
            loyalty_points: Math.floor(newOrder.total_amount * 0.05),
            segment: 'NEW',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return [newCust, ...prev];
        }
      });
    }

    playKitchenAlert();

    // Sync order to Supabase in background
    if (isSupabaseConfigured) {
      try {
        const dbTableId = isValidUUID(orderData.table_id) ? orderData.table_id : null;
        const { error: ordErr } = await supabase
          .from('orders')
          .insert({
            id: newOrder.id,
            business_id: newOrder.business_id,
            branch_id: newOrder.branch_id,
            table_id: dbTableId,
            order_number: newOrder.order_number,
            status: newOrder.status,
            customer_name: newOrder.customer_name,
            customer_phone: newOrder.customer_phone,
            subtotal: newOrder.subtotal,
            tax_amount: newOrder.tax_amount,
            discount_amount: newOrder.discount_amount,
            service_charge: newOrder.service_charge,
            tip_amount: newOrder.tip_amount,
            total_amount: newOrder.total_amount,
            payment_status: newOrder.payment_status,
            payment_method: newOrder.payment_method,
            notes: newOrder.notes,
          });

        if (!ordErr && newOrder.items && newOrder.items.length > 0) {
          const itemsToInsert = newOrder.items.map((it) => ({
            id: generateUUID(),
            order_id: newOrder.id,
            menu_item_id: isValidUUID(it.menu_item_id) ? it.menu_item_id : null,
            item_name: it.item_name,
            variant_name: it.variant_name || null,
            unit_price: it.unit_price,
            quantity: it.quantity,
            total_price: it.total_price,
            notes: it.notes || null,
          }));
          await supabase.from('order_items').insert(itemsToInsert);
        }
      } catch (e) {
        console.warn('Supabase order insert notice:', e);
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

  const createCategory = (name: string, description?: string) => {
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
      supabase.from('menu_categories').insert({
        id: newCat.id,
        business_id: newCat.business_id,
        branch_id: activeBranch.id,
        name: newCat.name,
        slug: newCat.slug,
        description: newCat.description || null,
        display_order: newCat.sort_order,
        is_active: true,
      }).then();
    }
  };

  const createMenuItem = (item: Partial<MenuItem>) => {
    const newItem: MenuItem = {
      id: generateUUID(),
      business_id: activeBusiness.id,
      branch_id: activeBranch.id,
      category_id: item.category_id || categories[0]?.id || '',
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
      supabase.from('menu_items').insert({
        id: newItem.id,
        business_id: newItem.business_id,
        branch_id: newItem.branch_id,
        category_id: isValidUUID(newItem.category_id) ? newItem.category_id : null,
        name: newItem.name,
        description: newItem.description || null,
        price: newItem.price,
        gst_percent: newItem.gst_percent,
        is_veg: newItem.is_veg,
        is_available: newItem.is_available,
        is_bestseller: newItem.is_bestseller,
        prep_time_minutes: newItem.prep_time_minutes,
        calories: newItem.calories || null,
        image_url: newItem.image_url || null,
        display_order: newItem.sort_order,
      }).then();
    }
  };

  const updateMenuItem = (id: string, updated: Partial<MenuItem>) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated, updated_at: new Date().toISOString() } : item))
    );

    if (isSupabaseConfigured && isValidUUID(id)) {
      supabase.from('menu_items').update({ ...updated, updated_at: new Date().toISOString() }).eq('id', id).then();
    }
  };

  const deleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));

    if (isSupabaseConfigured && isValidUUID(id)) {
      supabase.from('menu_items').delete().eq('id', id).then();
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

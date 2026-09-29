-- ====================================================================
-- CafeOS — Production Multi-Tenant PostgreSQL Schema with RLS
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- IDEMPOTENT CUSTOM ENUM TYPES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    CREATE TYPE staff_role AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_status') THEN
    CREATE TYPE table_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_segment') THEN
    CREATE TYPE customer_segment AS ENUM ('NEW', 'REGULAR', 'VIP', 'AT_RISK', 'INACTIVE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('CASH', 'UPI', 'CARD', 'ONLINE', 'LOYALTY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_tier') THEN
    CREATE TYPE loyalty_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
  END IF;
END $$;

-- 1. BUSINESSES (Tenants)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    logo_url TEXT,
    currency VARCHAR(10) DEFAULT 'INR',
    currency_symbol VARCHAR(10) DEFAULT '₹',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED')),
    subscription_plan VARCHAR(50) DEFAULT 'PRO' CHECK (subscription_plan IN ('STARTER', 'PRO', 'ENTERPRISE')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. BRANCHES (Multi-location per business)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    gst_number VARCHAR(50),
    tax_rate_percent NUMERIC(5,2) DEFAULT 5.00,
    service_charge_percent NUMERIC(5,2) DEFAULT 0.00,
    opening_time TIME DEFAULT '09:00:00',
    closing_time TIME DEFAULT '23:00:00',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (business_id, slug)
);

-- 3. PROFILES / USERS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_superadmin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. STAFF & ROLE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role staff_role NOT NULL DEFAULT 'WAITER',
    pin_code VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (business_id, email)
);

-- 5. TABLES
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    capacity INT DEFAULT 4,
    seating_area VARCHAR(100) DEFAULT 'Main Dining',
    status table_status DEFAULT 'AVAILABLE',
    current_order_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (branch_id, table_number)
);

-- 6. QR CODES (Permanent Unique Identifiers)
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    code_identifier VARCHAR(100) UNIQUE NOT NULL,
    qr_url TEXT NOT NULL,
    scan_count INT DEFAULT 0,
    last_scanned_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. MENU CATEGORIES
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    gst_percent NUMERIC(5,2) DEFAULT 5.00,
    is_veg BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    is_bestseller BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    is_spicy BOOLEAN DEFAULT false,
    prep_time_minutes INT DEFAULT 15,
    calories INT,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. MENU VARIANTS
CREATE TABLE IF NOT EXISTS public.menu_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. MENU ADDONS
CREATE TABLE IF NOT EXISTS public.menu_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_available BOOLEAN DEFAULT true,
    max_selection INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    phone VARCHAR(30) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    total_spending NUMERIC(12,2) DEFAULT 0.00,
    visit_count INT DEFAULT 0,
    last_visit TIMESTAMPTZ,
    loyalty_points INT DEFAULT 0,
    segment customer_segment DEFAULT 'NEW',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (business_id, phone)
);

-- 12. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    order_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(30),
    status order_status DEFAULT 'PLACED',
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    service_charge NUMERIC(10,2) DEFAULT 0.00,
    tip_amount NUMERIC(10,2) DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_status payment_status DEFAULT 'PENDING',
    payment_method payment_method DEFAULT 'UPI',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'ORDERED' CHECK (status IN ('ORDERED', 'PREPARING', 'READY', 'SERVED')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. ORDER ITEM ADDONS
CREATE TABLE IF NOT EXISTS public.order_item_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    addon_name VARCHAR(150) NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_method payment_method DEFAULT 'UPI',
    transaction_ref VARCHAR(150),
    status payment_status DEFAULT 'PAID',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) DEFAULT 'PERCENTAGE' CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    min_order_value NUMERIC(10,2) DEFAULT 0.00,
    max_discount NUMERIC(10,2),
    start_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ,
    usage_limit INT DEFAULT 100,
    usage_count INT DEFAULT 0,
    customer_specific_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (business_id, code)
);

-- 17. COUPON USAGE
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    discount_applied NUMERIC(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. LOYALTY ACCOUNTS
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    points_balance INT DEFAULT 0,
    lifetime_points INT DEFAULT 0,
    tier loyalty_tier DEFAULT 'BRONZE',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (business_id, customer_id)
);

-- 19. LOYALTY TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loyalty_account_id UUID NOT NULL REFERENCES public.loyalty_accounts(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    points INT NOT NULL,
    type VARCHAR(30) CHECK (type IN ('EARNED', 'REDEEMED', 'EXPIRED', 'BONUS')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 20. MARKETING CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_segment customer_segment,
    channel VARCHAR(30) DEFAULT 'WHATSAPP' CHECK (channel IN ('WHATSAPP', 'SMS', 'EMAIL')),
    message_template TEXT NOT NULL,
    offer_coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED')),
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    audience_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. CAMPAIGN MESSAGES
CREATE TABLE IF NOT EXISTS public.campaign_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED')),
    provider_response JSONB,
    sent_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 22. INVENTORY ITEMS
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    unit VARCHAR(50) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'g', 'l', 'ml', 'pcs', 'boxes', 'packets')),
    current_stock NUMERIC(12,3) DEFAULT 0.000,
    minimum_stock NUMERIC(12,3) DEFAULT 5.000,
    unit_cost NUMERIC(10,2) DEFAULT 0.00,
    supplier_name VARCHAR(255),
    supplier_contact VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 23. INVENTORY TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('PURCHASE', 'CONSUMPTION', 'WASTAGE', 'ADJUSTMENT')),
    quantity NUMERIC(12,3) NOT NULL,
    unit_cost NUMERIC(10,2) DEFAULT 0.00,
    reference_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 24. RECIPES / BOM
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_required NUMERIC(12,3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (menu_item_id, inventory_item_id)
);

-- 25. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan VARCHAR(50) DEFAULT 'PRO' CHECK (plan IN ('STARTER', 'PRO', 'ENTERPRISE')),
    billing_cycle VARCHAR(20) DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAST_DUE', 'TRIAL', 'CANCELLED')),
    start_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    renewal_date TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + INTERVAL '30 days'),
    amount NUMERIC(10,2) DEFAULT 2999.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_branches_business ON public.branches(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_business ON public.staff(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_tables_branch ON public.tables(branch_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_ident ON public.qr_codes(code_identifier);
CREATE INDEX IF NOT EXISTS idx_menu_cat_branch ON public.menu_categories(branch_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_cat ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_branch ON public.menu_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_created ON public.orders(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_branch_status ON public.orders(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_phone ON public.customers(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_inventory_branch ON public.inventory_items(branch_id);

-- ====================================================================
-- REALTIME REPLICATION CONFIGURATION
-- ====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
  END IF;
END $$;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_superadmin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_business_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
    SELECT business_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Businesses Policies
DROP POLICY IF EXISTS "Superadmin full access to businesses" ON public.businesses;
CREATE POLICY "Superadmin full access to businesses" ON public.businesses
    FOR ALL USING (public.is_superadmin());

DROP POLICY IF EXISTS "Staff can view their business" ON public.businesses;
CREATE POLICY "Staff can view their business" ON public.businesses
    FOR SELECT USING (id IN (SELECT public.get_user_business_ids()));

DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
CREATE POLICY "Owners can update their business" ON public.businesses
    FOR UPDATE USING (
        id IN (
            SELECT business_id FROM public.staff
            WHERE user_id = auth.uid() AND role = 'OWNER'
        )
    );

-- Branches Policies
DROP POLICY IF EXISTS "Superadmin full access to branches" ON public.branches;
CREATE POLICY "Superadmin full access to branches" ON public.branches
    FOR ALL USING (public.is_superadmin());

DROP POLICY IF EXISTS "Staff can view branches in their business" ON public.branches;
CREATE POLICY "Staff can view branches in their business" ON public.branches
    FOR SELECT USING (business_id IN (SELECT public.get_user_business_ids()));

DROP POLICY IF EXISTS "Owners & Managers can modify branches" ON public.branches;
CREATE POLICY "Owners & Managers can modify branches" ON public.branches
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM public.staff
            WHERE user_id = auth.uid() AND role IN ('OWNER', 'MANAGER')
        )
    );

-- Menu & QR Public Access
DROP POLICY IF EXISTS "Public can view active menu categories" ON public.menu_categories;
CREATE POLICY "Public can view active menu categories" ON public.menu_categories
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active menu items" ON public.menu_items;
CREATE POLICY "Public can view active menu items" ON public.menu_items
    FOR SELECT USING (is_available = true);

DROP POLICY IF EXISTS "Public can view active variants" ON public.menu_variants;
CREATE POLICY "Public can view active variants" ON public.menu_variants
    FOR SELECT USING (is_available = true);

DROP POLICY IF EXISTS "Public can view active addons" ON public.menu_addons;
CREATE POLICY "Public can view active addons" ON public.menu_addons
    FOR SELECT USING (is_available = true);

DROP POLICY IF EXISTS "Public can read table info for active qr" ON public.tables;
CREATE POLICY "Public can read table info for active qr" ON public.tables
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can read active QR tokens" ON public.qr_codes;
CREATE POLICY "Public can read active QR tokens" ON public.qr_codes
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff manage menu categories" ON public.menu_categories;
CREATE POLICY "Staff manage menu categories" ON public.menu_categories
    FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

DROP POLICY IF EXISTS "Staff manage menu items" ON public.menu_items;
CREATE POLICY "Staff manage menu items" ON public.menu_items
    FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

-- Orders Policies
DROP POLICY IF EXISTS "Customers can insert orders" ON public.orders;
CREATE POLICY "Customers can insert orders" ON public.orders
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can track placed orders by ID" ON public.orders;
CREATE POLICY "Customers can track placed orders by ID" ON public.orders
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can view orders in their business" ON public.orders;
CREATE POLICY "Staff can view orders in their business" ON public.orders
    FOR SELECT USING (business_id IN (SELECT public.get_user_business_ids()));

DROP POLICY IF EXISTS "Staff can update orders in their business" ON public.orders;
CREATE POLICY "Staff can update orders in their business" ON public.orders
    FOR UPDATE USING (business_id IN (SELECT public.get_user_business_ids()));

DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
CREATE POLICY "Public can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
CREATE POLICY "Public can view order items" ON public.order_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert order addons" ON public.order_item_addons;
CREATE POLICY "Public can insert order addons" ON public.order_item_addons
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view order addons" ON public.order_item_addons;
CREATE POLICY "Public can view order addons" ON public.order_item_addons
    FOR SELECT USING (true);

-- Operations Data Isolation Policies
DROP POLICY IF EXISTS "Business isolated tables" ON public.tables;
CREATE POLICY "Business isolated tables" ON public.tables
    FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

DROP POLICY IF EXISTS "Business isolated customers" ON public.customers;
CREATE POLICY "Business isolated customers" ON public.customers
    FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

DROP POLICY IF EXISTS "Business isolated inventory" ON public.inventory_items;
CREATE POLICY "Business isolated inventory" ON public.inventory_items
    FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

DROP POLICY IF EXISTS "Business isolated inventory tx" ON public.inventory_transactions;
CREATE POLICY "Business isolated inventory tx" ON public.inventory_transactions
    FOR ALL USING (inventory_item_id IN (SELECT id FROM public.inventory_items WHERE business_id IN (SELECT public.get_user_business_ids())));

DROP POLICY IF EXISTS "Business isolated coupons" ON public.coupons;
CREATE POLICY "Business isolated coupons" ON public.coupons
    FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

DROP POLICY IF EXISTS "Business isolated campaigns" ON public.campaigns;
CREATE POLICY "Business isolated campaigns" ON public.campaigns
    FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

DROP POLICY IF EXISTS "Business isolated staff management" ON public.staff;
CREATE POLICY "Business isolated staff management" ON public.staff
    FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

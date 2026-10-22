-- ==============================================================================
-- CafeOS SaaS Security Hardening Migration
-- Comprehensive Multi-Tenant Isolation, Privilege Escalation Prevention,
-- Server-Side Order Computation & Cryptographic Token Order Tracking
-- Date: 2026-10-22
-- ==============================================================================

-- 1. Search Path Hijacking Prevention for SECURITY DEFINER Functions
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_superadmin = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_business_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT business_id FROM public.staff
  WHERE user_id = auth.uid() AND is_active = true;
END;
$$;

-- 2. Prevent Self-Superadmin Promotion Trigger on public.profiles
CREATE OR REPLACE FUNCTION public.prevent_self_superadmin_elevation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_superadmin = true AND (OLD.is_superadmin IS NULL OR OLD.is_superadmin = false) THEN
    IF NOT public.is_superadmin() THEN
      RAISE EXCEPTION 'Privilege escalation rejected: only existing superadmins can grant superadmin status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_superadmin_elevation ON public.profiles;
CREATE TRIGGER trg_prevent_self_superadmin_elevation
BEFORE UPDATE OF is_superadmin ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_superadmin_elevation();

-- 3. Add order_token to public.orders for Cryptographic Diner Tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_orders_token ON public.orders(id, order_token);

-- 4. Customer CRM Protection: Restrict Select/Update strictly to authenticated staff
ALTER POLICY "Public can select customers" ON public.customers
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Public can update customers" ON public.customers
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin())
WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Authenticated can manage customers" ON public.customers
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin())
WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

-- 5. Orders & Order Items Protection
ALTER POLICY "Customers can track placed orders by ID" ON public.orders
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Authenticated can manage orders" ON public.orders
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin())
WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Customers can insert orders" ON public.orders
TO authenticated
WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Public can view order items" ON public.order_items
TO authenticated
USING (
  (order_id IN (SELECT id FROM public.orders WHERE business_id IN (SELECT get_user_business_ids())))
  OR is_superadmin()
);

ALTER POLICY "Authenticated can manage order items" ON public.order_items
TO authenticated
USING (
  (order_id IN (SELECT id FROM public.orders WHERE business_id IN (SELECT get_user_business_ids())))
  OR is_superadmin()
)
WITH CHECK (
  (order_id IN (SELECT id FROM public.orders WHERE business_id IN (SELECT get_user_business_ids())))
  OR is_superadmin()
);

ALTER POLICY "Public can insert order items" ON public.order_items
TO authenticated
WITH CHECK (
  (order_id IN (SELECT id FROM public.orders WHERE business_id IN (SELECT get_user_business_ids())))
  OR is_superadmin()
);

ALTER POLICY "Public can view order addons" ON public.order_item_addons
TO authenticated
USING (
  (order_item_id IN (
    SELECT order_items.id FROM public.order_items
    JOIN public.orders ON orders.id = order_items.order_id
    WHERE orders.business_id IN (SELECT get_user_business_ids())
  ))
  OR is_superadmin()
);

ALTER POLICY "Public can insert order addons" ON public.order_item_addons
TO authenticated
WITH CHECK (
  (order_item_id IN (
    SELECT order_items.id FROM public.order_items
    JOIN public.orders ON orders.id = order_items.order_id
    WHERE orders.business_id IN (SELECT get_user_business_ids())
  ))
  OR is_superadmin()
);

-- 6. Tables, QR Codes, Menu Items & Variants Protection
ALTER POLICY "Authenticated can manage tables" ON public.tables
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin())
WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Authenticated can manage qr_codes" ON public.qr_codes
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin())
WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Authenticated can manage menu categories" ON public.menu_categories
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin())
WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Public can view all menu categories" ON public.menu_categories
TO public
USING (is_active = true);

ALTER POLICY "Authenticated can manage menu items" ON public.menu_items
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin())
WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Public can view all menu items" ON public.menu_items
TO public
USING (is_available = true);

ALTER POLICY "Staff manage menu variants" ON public.menu_variants
TO authenticated
USING (
  (menu_item_id IN (SELECT id FROM public.menu_items WHERE business_id IN (SELECT get_user_business_ids())))
  OR is_superadmin()
)
WITH CHECK (
  (menu_item_id IN (SELECT id FROM public.menu_items WHERE business_id IN (SELECT get_user_business_ids())))
  OR is_superadmin()
);

ALTER POLICY "Staff manage menu addons" ON public.menu_addons
TO authenticated
USING (
  (menu_item_id IN (SELECT id FROM public.menu_items WHERE business_id IN (SELECT get_user_business_ids())))
  OR is_superadmin()
)
WITH CHECK (
  (menu_item_id IN (SELECT id FROM public.menu_items WHERE business_id IN (SELECT get_user_business_ids())))
  OR is_superadmin()
);

-- 7. Staff Role Isolation (Owners/Managers Only)
ALTER POLICY "Business isolated staff management" ON public.staff
TO authenticated
USING (
  (business_id IN (
    SELECT staff.business_id FROM public.staff
    WHERE staff.user_id = auth.uid()
      AND staff.role IN ('OWNER'::staff_role, 'MANAGER'::staff_role)
      AND staff.is_active = true
  ))
  OR is_superadmin()
)
WITH CHECK (
  (business_id IN (
    SELECT staff.business_id FROM public.staff
    WHERE staff.user_id = auth.uid()
      AND staff.role IN ('OWNER'::staff_role, 'MANAGER'::staff_role)
      AND staff.is_active = true
  ))
  OR is_superadmin()
);

ALTER POLICY "Users can view own staff record" ON public.staff
TO authenticated
USING (
  user_id = auth.uid()
  OR email = (auth.jwt() ->> 'email')
  OR business_id IN (SELECT get_user_business_ids())
  OR is_superadmin()
);

-- 8. Push Notification Isolation
ALTER POLICY "Public can select push subscriptions" ON public.push_subscriptions
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Public can update own push subscription" ON public.push_subscriptions
TO public
USING (endpoint IS NOT NULL AND length(endpoint) > 10)
WITH CHECK (endpoint IS NOT NULL AND length(endpoint) > 10);

ALTER POLICY "Public can view push notification logs" ON public.push_notification_logs
TO authenticated
USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

ALTER POLICY "Public can insert push notification logs" ON public.push_notification_logs
TO authenticated
WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());

-- 9. Secondary Operational Tables
ALTER POLICY "Staff can insert branches" ON public.branches
TO authenticated
WITH CHECK (
  (business_id IN (SELECT staff.business_id FROM staff WHERE staff.user_id = auth.uid() AND staff.role IN ('OWNER', 'MANAGER')))
  OR is_superadmin()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Staff can manage payments') THEN
    CREATE POLICY "Staff can manage payments" ON public.payments
    FOR ALL TO authenticated
    USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin())
    WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Staff can view subscriptions') THEN
    CREATE POLICY "Staff can view subscriptions" ON public.subscriptions
    FOR SELECT TO authenticated
    USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Superadmin manage subscriptions') THEN
    CREATE POLICY "Superadmin manage subscriptions" ON public.subscriptions
    FOR ALL TO authenticated
    USING (is_superadmin())
    WITH CHECK (is_superadmin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'Staff manage recipes') THEN
    CREATE POLICY "Staff manage recipes" ON public.recipes
    FOR ALL TO authenticated
    USING (
      (menu_item_id IN (SELECT id FROM public.menu_items WHERE business_id IN (SELECT get_user_business_ids())))
      OR is_superadmin()
    )
    WITH CHECK (
      (menu_item_id IN (SELECT id FROM public.menu_items WHERE business_id IN (SELECT get_user_business_ids())))
      OR is_superadmin()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_accounts' AND policyname = 'Staff manage loyalty accounts') THEN
    CREATE POLICY "Staff manage loyalty accounts" ON public.loyalty_accounts
    FOR ALL TO authenticated
    USING ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin())
    WITH CHECK ((business_id IN (SELECT get_user_business_ids())) OR is_superadmin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_transactions' AND policyname = 'Staff manage loyalty transactions') THEN
    CREATE POLICY "Staff manage loyalty transactions" ON public.loyalty_transactions
    FOR ALL TO authenticated
    USING (
      (loyalty_account_id IN (SELECT id FROM public.loyalty_accounts WHERE business_id IN (SELECT get_user_business_ids())))
      OR is_superadmin()
    )
    WITH CHECK (
      (loyalty_account_id IN (SELECT id FROM public.loyalty_accounts WHERE business_id IN (SELECT get_user_business_ids())))
      OR is_superadmin()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupon_usage' AND policyname = 'Staff view coupon usage') THEN
    CREATE POLICY "Staff view coupon usage" ON public.coupon_usage
    FOR SELECT TO authenticated
    USING (
      (coupon_id IN (SELECT id FROM public.coupons WHERE business_id IN (SELECT get_user_business_ids())))
      OR is_superadmin()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_messages' AND policyname = 'Staff manage campaign messages') THEN
    CREATE POLICY "Staff manage campaign messages" ON public.campaign_messages
    FOR ALL TO authenticated
    USING (
      (campaign_id IN (SELECT id FROM public.campaigns WHERE business_id IN (SELECT get_user_business_ids())))
      OR is_superadmin()
    )
    WITH CHECK (
      (campaign_id IN (SELECT id FROM public.campaigns WHERE business_id IN (SELECT get_user_business_ids())))
      OR is_superadmin()
    );
  END IF;
END $$;

-- 10. Cryptographic Diner Order Tracking Function
CREATE OR REPLACE FUNCTION public.track_customer_order(
  p_order_id UUID,
  p_order_token UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', o.id,
    'business_id', o.business_id,
    'branch_id', o.branch_id,
    'table_id', o.table_id,
    'order_number', o.order_number,
    'status', o.status,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'subtotal', o.subtotal,
    'tax_amount', o.tax_amount,
    'discount_amount', o.discount_amount,
    'service_charge', o.service_charge,
    'tip_amount', o.tip_amount,
    'total_amount', o.total_amount,
    'payment_status', o.payment_status,
    'payment_method', o.payment_method,
    'notes', o.notes,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'order_token', o.order_token,
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'order_id', oi.order_id,
          'menu_item_id', oi.menu_item_id,
          'item_name', oi.item_name,
          'variant_name', oi.variant_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'notes', oi.notes,
          'status', oi.status,
          'addons', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', oia.id,
                'addon_name', oia.addon_name,
                'price', oia.price
              )
            )
            FROM public.order_item_addons oia
            WHERE oia.order_item_id = oi.id
          ), '[]'::jsonb)
        )
      )
      FROM public.order_items oi
      WHERE oi.order_id = o.id
    ), '[]'::jsonb)
  ) INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.order_token = p_order_token;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_customer_order(UUID, UUID) TO anon, authenticated;

-- 11. Server-Side Atomic Order Submission & Catalog Price Validation
CREATE OR REPLACE FUNCTION public.submit_customer_order(
  p_order_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_id UUID;
  v_branch_id UUID;
  v_table_id UUID;
  v_customer_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_payment_method public.payment_method;
  v_payment_status public.payment_status;
  v_notes TEXT;
  v_tip_amount NUMERIC(10,2);
  v_tax_rate NUMERIC(5,2);
  v_service_charge_percent NUMERIC(5,2);
  
  v_items jsonb;
  v_item jsonb;
  v_item_id UUID;
  v_variant_id UUID;
  v_qty INT;
  v_unit_price NUMERIC(10,2);
  v_item_total NUMERIC(10,2);
  v_subtotal NUMERIC(10,2) := 0.00;
  v_tax_amount NUMERIC(10,2) := 0.00;
  v_discount NUMERIC(10,2) := 0.00;
  v_service_charge NUMERIC(10,2) := 0.00;
  v_total_amount NUMERIC(10,2) := 0.00;
  
  v_menu_item RECORD;
  v_variant RECORD;
  v_addon RECORD;
  v_addon_elem jsonb;
  v_addon_id UUID;
  v_addon_name TEXT;
  v_addon_price NUMERIC(10,2);
  
  v_coupon_code TEXT;
  v_coupon RECORD;
  
  v_order_id UUID;
  v_order_number TEXT;
  v_order_token UUID;
  v_order_item_id UUID;

  v_existing_customer RECORD;
  v_new_spend NUMERIC(10,2);
  v_new_visits INT;
  v_new_points INT;
  v_new_segment public.customer_segment;
BEGIN
  -- 1. Extract & validate business_id
  BEGIN
    v_business_id := (p_order_payload->>'business_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid business_id supplied';
  END;

  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_business_id AND status = 'ACTIVE') THEN
    RAISE EXCEPTION 'Target business is not active or does not exist';
  END IF;

  -- 2. Extract & validate branch_id
  BEGIN
    v_branch_id := (p_order_payload->>'branch_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid branch_id supplied';
  END;

  SELECT tax_rate_percent, service_charge_percent 
  INTO v_tax_rate, v_service_charge_percent
  FROM public.branches 
  WHERE id = v_branch_id AND business_id = v_business_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target branch not found or inactive for this business';
  END IF;

  v_tax_rate := COALESCE(v_tax_rate, 5.0);
  v_service_charge_percent := COALESCE(v_service_charge_percent, 0.0);

  -- 3. Extract & validate table_id if provided
  IF (p_order_payload->>'table_id') IS NOT NULL AND (p_order_payload->>'table_id') <> '' THEN
    BEGIN
      v_table_id := (p_order_payload->>'table_id')::UUID;
      IF NOT EXISTS (SELECT 1 FROM public.tables WHERE id = v_table_id AND business_id = v_business_id) THEN
        v_table_id := NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_table_id := NULL;
    END;
  END IF;

  -- 4. Customer info
  v_customer_name := COALESCE(NULLIF(TRIM(p_order_payload->>'customer_name'), ''), 'Guest Diner');
  v_customer_phone := NULLIF(TRIM(p_order_payload->>'customer_phone'), '');

  -- 5. Payment details & Notes
  BEGIN
    v_payment_method := COALESCE((p_order_payload->>'payment_method')::public.payment_method, 'UPI'::public.payment_method);
  EXCEPTION WHEN OTHERS THEN
    v_payment_method := 'UPI'::public.payment_method;
  END;

  BEGIN
    v_payment_status := COALESCE((p_order_payload->>'payment_status')::public.payment_status, 'PENDING'::public.payment_status);
  EXCEPTION WHEN OTHERS THEN
    v_payment_status := 'PENDING'::public.payment_status;
  END;

  v_notes := NULLIF(TRIM(p_order_payload->>'notes'), '');
  v_tip_amount := GREATEST(COALESCE((p_order_payload->>'tip_amount')::NUMERIC, 0.0), 0.0);

  -- 6. Process items and verify prices directly against database catalog
  v_items := p_order_payload->'items';
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- Generate order identifiers
  v_order_id := gen_random_uuid();
  v_order_token := gen_random_uuid();
  v_order_number := '#ORD-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

  -- Pre-insert placeholder order record
  INSERT INTO public.orders (
    id,
    business_id,
    branch_id,
    table_id,
    order_number,
    status,
    customer_name,
    customer_phone,
    subtotal,
    tax_amount,
    discount_amount,
    service_charge,
    tip_amount,
    total_amount,
    payment_status,
    payment_method,
    notes,
    order_token
  ) VALUES (
    v_order_id,
    v_business_id,
    v_branch_id,
    v_table_id,
    v_order_number,
    'PLACED'::public.order_status,
    v_customer_name,
    v_customer_phone,
    0, 0, 0, 0, v_tip_amount, 0,
    v_payment_status,
    v_payment_method,
    v_notes,
    v_order_token
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    BEGIN
      v_item_id := (v_item->>'menu_item_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid menu_item_id in order items: %', v_item;
    END;

    v_qty := GREATEST(COALESCE((v_item->>'quantity')::INT, 1), 1);

    -- Fetch trusted menu item price from database
    SELECT * INTO v_menu_item
    FROM public.menu_items
    WHERE id = v_item_id AND business_id = v_business_id AND is_available = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item not found or unavailable: %', v_item_id;
    END IF;

    v_unit_price := v_menu_item.price;

    -- If variant selected, fetch variant price from database
    IF (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') <> '' THEN
      BEGIN
        v_variant_id := (v_item->>'variant_id')::UUID;
        SELECT * INTO v_variant
        FROM public.menu_variants
        WHERE id = v_variant_id AND menu_item_id = v_item_id AND is_available = true;

        IF FOUND THEN
          v_unit_price := v_variant.price;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    v_order_item_id := gen_random_uuid();

    -- Insert order item
    INSERT INTO public.order_items (
      id,
      order_id,
      menu_item_id,
      item_name,
      variant_name,
      quantity,
      unit_price,
      total_price,
      notes,
      status
    ) VALUES (
      v_order_item_id,
      v_order_id,
      v_item_id,
      v_menu_item.name,
      v_item->>'variant_name',
      v_qty,
      v_unit_price,
      ROUND(v_unit_price * v_qty, 2),
      NULLIF(TRIM(v_item->>'notes'), ''),
      'ORDERED'
    );

    -- Process addons
    IF (v_item->'addons') IS NOT NULL AND jsonb_array_length(v_item->'addons') > 0 THEN
      FOR v_addon_elem IN SELECT * FROM jsonb_array_elements(v_item->'addons')
      LOOP
        v_addon_name := TRIM(v_addon_elem->>'addon_name');
        v_addon_price := 0.00;

        IF (v_addon_elem->>'id') IS NOT NULL AND (v_addon_elem->>'id') <> '' THEN
          BEGIN
            v_addon_id := (v_addon_elem->>'id')::UUID;
            SELECT * INTO v_addon
            FROM public.menu_addons
            WHERE id = v_addon_id AND menu_item_id = v_item_id AND is_available = true;

            IF FOUND THEN
              v_addon_price := v_addon.price;
              v_addon_name := v_addon.name;
            ELSE
              v_addon_price := GREATEST(COALESCE((v_addon_elem->>'price')::NUMERIC, 0.0), 0.0);
            END IF;
          EXCEPTION WHEN OTHERS THEN
            v_addon_price := GREATEST(COALESCE((v_addon_elem->>'price')::NUMERIC, 0.0), 0.0);
          END;
        ELSE
          v_addon_price := GREATEST(COALESCE((v_addon_elem->>'price')::NUMERIC, 0.0), 0.0);
        END IF;

        IF v_addon_name IS NOT NULL AND v_addon_name <> '' THEN
          INSERT INTO public.order_item_addons (
            id,
            order_item_id,
            addon_name,
            price
          ) VALUES (
            gen_random_uuid(),
            v_order_item_id,
            v_addon_name,
            v_addon_price
          );

          v_unit_price := v_unit_price + v_addon_price;
        END IF;
      END LOOP;

      UPDATE public.order_items
      SET unit_price = v_unit_price,
          total_price = ROUND(v_unit_price * v_qty, 2)
      WHERE id = v_order_item_id;
    END IF;

    v_item_total := ROUND(v_unit_price * v_qty, 2);
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- 7. Validate coupon and calculate discount server-side
  v_coupon_code := NULLIF(UPPER(TRIM(p_order_payload->>'coupon_code')), '');
  IF v_coupon_code IS NOT NULL THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE business_id = v_business_id
      AND UPPER(code) = v_coupon_code
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (start_date IS NULL OR start_date <= NOW())
      AND (usage_limit IS NULL OR usage_count < usage_limit);

    IF FOUND THEN
      IF v_subtotal >= COALESCE(v_coupon.min_order_value, 0.0) THEN
        IF v_coupon.discount_type = 'PERCENTAGE' THEN
          v_discount := ROUND(v_subtotal * (v_coupon.discount_value / 100.0), 2);
          IF v_coupon.max_discount IS NOT NULL AND v_discount > v_coupon.max_discount THEN
            v_discount := v_coupon.max_discount;
          END IF;
        ELSE
          v_discount := LEAST(v_subtotal, v_coupon.discount_value);
        END IF;

        INSERT INTO public.coupon_usage (
          id,
          coupon_id,
          order_id,
          customer_id,
          discount_applied,
          used_at
        ) VALUES (
          gen_random_uuid(),
          v_coupon.id,
          v_order_id,
          v_customer_id,
          v_discount,
          NOW()
        );

        UPDATE public.coupons
        SET usage_count = COALESCE(usage_count, 0) + 1
        WHERE id = v_coupon.id;
      END IF;
    END IF;
  END IF;

  -- 8. Calculate Taxes, Service Charge, and Total
  v_discount := LEAST(v_discount, v_subtotal);
  v_tax_amount := ROUND((v_subtotal - v_discount) * (v_tax_rate / 100.0), 2);
  v_service_charge := ROUND((v_subtotal - v_discount) * (v_service_charge_percent / 100.0), 2);
  v_total_amount := (v_subtotal - v_discount) + v_tax_amount + v_service_charge + v_tip_amount;

  -- 9. Upsert customer CRM record securely
  IF v_customer_phone IS NOT NULL THEN
    SELECT * INTO v_existing_customer
    FROM public.customers
    WHERE business_id = v_business_id AND phone = v_customer_phone;

    IF FOUND THEN
      v_customer_id := v_existing_customer.id;
      v_new_spend := COALESCE(v_existing_customer.total_spending, 0) + v_total_amount;
      v_new_visits := COALESCE(v_existing_customer.visit_count, 0) + 1;
      v_new_points := COALESCE(v_existing_customer.loyalty_points, 0) + FLOOR(v_total_amount * 0.05);

      IF v_new_spend >= 5000 OR v_new_visits >= 10 THEN
        v_new_segment := 'VIP'::public.customer_segment;
      ELSIF v_new_visits >= 3 THEN
        v_new_segment := 'REGULAR'::public.customer_segment;
      ELSE
        v_new_segment := 'NEW'::public.customer_segment;
      END IF;

      UPDATE public.customers
      SET name = COALESCE(NULLIF(v_customer_name, 'Guest Diner'), name),
          total_spending = v_new_spend,
          visit_count = v_new_visits,
          loyalty_points = v_new_points,
          segment = v_new_segment,
          last_visit = NOW(),
          updated_at = NOW()
      WHERE id = v_customer_id;
    ELSE
      v_customer_id := gen_random_uuid();
      v_new_spend := v_total_amount;
      v_new_visits := 1;
      v_new_points := FLOOR(v_total_amount * 0.05);
      v_new_segment := 'NEW'::public.customer_segment;

      INSERT INTO public.customers (
        id,
        business_id,
        name,
        phone,
        total_spending,
        visit_count,
        loyalty_points,
        segment,
        last_visit,
        created_at,
        updated_at
      ) VALUES (
        v_customer_id,
        v_business_id,
        v_customer_name,
        v_customer_phone,
        v_new_spend,
        v_new_visits,
        v_new_points,
        v_new_segment,
        NOW(),
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  -- 10. Update final financial amounts on order
  UPDATE public.orders
  SET customer_id = v_customer_id,
      subtotal = v_subtotal,
      tax_amount = v_tax_amount,
      discount_amount = v_discount,
      service_charge = v_service_charge,
      total_amount = v_total_amount,
      updated_at = NOW()
  WHERE id = v_order_id;

  -- 11. Update table status if table linked
  IF v_table_id IS NOT NULL THEN
    UPDATE public.tables
    SET status = 'OCCUPIED'::public.table_status,
        updated_at = NOW()
    WHERE id = v_table_id;
  END IF;

  -- 12. Return secure response with order_token
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'order_token', v_order_token,
    'subtotal', v_subtotal,
    'tax_amount', v_tax_amount,
    'discount_amount', v_discount,
    'service_charge', v_service_charge,
    'tip_amount', v_tip_amount,
    'total_amount', v_total_amount,
    'customer_id', v_customer_id,
    'status', 'PLACED'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_customer_order(jsonb) TO anon, authenticated;

-- 12. POS Terminal Isolated Staff PIN Login Function
CREATE OR REPLACE FUNCTION public.staff_pin_login(
  p_business_id UUID,
  p_pin TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff RECORD;
BEGIN
  IF p_pin IS NULL OR LENGTH(TRIM(p_pin)) < 4 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_staff
  FROM public.staff
  WHERE business_id = p_business_id
    AND pin_code = TRIM(p_pin)
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_staff.id,
    'business_id', v_staff.business_id,
    'branch_id', v_staff.branch_id,
    'user_id', v_staff.user_id,
    'full_name', v_staff.full_name,
    'email', v_staff.email,
    'phone', v_staff.phone,
    'role', v_staff.role,
    'is_active', v_staff.is_active,
    'created_at', v_staff.created_at,
    'updated_at', v_staff.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_pin_login(UUID, TEXT) TO anon, authenticated;

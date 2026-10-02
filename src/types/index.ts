export type StaffRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'KITCHEN' | 'WAITER' | 'SUPER_ADMIN';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'ONLINE' | 'LOYALTY';

export type CustomerSegment = 'NEW' | 'REGULAR' | 'VIP' | 'AT_RISK' | 'INACTIVE';

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type SubscriptionPlan = 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface Business {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  logo_url?: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED';
  subscription_plan: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gst_number?: string;
  tax_rate_percent: number;
  service_charge_percent: number;
  opening_time: string;
  closing_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  is_superadmin?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  business_id: string;
  branch_id?: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  pin_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTable {
  id: string;
  business_id: string;
  branch_id: string;
  table_number: string;
  capacity: number;
  seating_area: string;
  status: TableStatus;
  current_order_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  qr_code?: QRCode;
}

export interface QRCode {
  id: string;
  business_id: string;
  branch_id: string;
  table_id: string;
  code_identifier: string;
  qr_url: string;
  scan_count: number;
  last_scanned_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  business_id: string;
  branch_id?: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  business_id: string;
  branch_id?: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  gst_percent: number;
  is_veg: boolean;
  is_available: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_spicy: boolean;
  prep_time_minutes: number;
  calories?: number;
  image_url?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  variants?: MenuVariant[];
  addons?: MenuAddon[];
}

export interface MenuVariant {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  is_available: boolean;
  created_at: string;
}

export interface MenuAddon {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  is_available: boolean;
  max_selection: number;
  created_at: string;
}

export interface OrderItemAddon {
  id: string;
  order_item_id: string;
  addon_name: string;
  price: number;
  created_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id?: string;
  item_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  status: 'ORDERED' | 'PREPARING' | 'READY' | 'SERVED';
  created_at: string;
  addons?: OrderItemAddon[];
}

export interface Order {
  id: string;
  business_id: string;
  branch_id: string;
  table_id?: string;
  customer_id?: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  service_charge: number;
  tip_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  notes?: string;
  created_at: string;
  updated_at: string;
  table?: RestaurantTable;
  items?: OrderItem[];
}

export interface Customer {
  id: string;
  business_id: string;
  phone: string;
  name?: string;
  email?: string;
  total_spending: number;
  visit_count: number;
  last_visit?: string;
  loyalty_points: number;
  segment: CustomerSegment;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  business_id: string;
  code: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_order_value: number;
  max_discount?: number;
  start_date: string;
  expires_at?: string;
  usage_limit: number;
  usage_count: number;
  customer_specific_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyAccount {
  id: string;
  business_id: string;
  customer_id: string;
  points_balance: number;
  lifetime_points: number;
  tier: LoyaltyTier;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  loyalty_account_id: string;
  order_id?: string;
  points: number;
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'BONUS';
  notes?: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  target_segment?: CustomerSegment;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'WEB_PUSH';
  message_template: string;
  offer_coupon_id?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
  scheduled_at?: string;
  sent_at?: string;
  audience_count: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  business_id: string;
  branch_id: string;
  name: string;
  sku?: string;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'boxes' | 'packets';
  current_stock: number;
  minimum_stock: number;
  unit_cost: number;
  supplier_name?: string;
  supplier_contact?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: 'PURCHASE' | 'CONSUMPTION' | 'WASTAGE' | 'ADJUSTMENT';
  quantity: number;
  unit_cost: number;
  reference_order_id?: string;
  notes?: string;
  created_at: string;
}

export interface Recipe {
  id: string;
  menu_item_id: string;
  inventory_item_id: string;
  quantity_required: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  business_id: string;
  plan: SubscriptionPlan;
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  status: 'ACTIVE' | 'PAST_DUE' | 'TRIAL' | 'CANCELLED';
  start_date: string;
  renewal_date: string;
  amount: number;
  created_at: string;
  updated_at: string;
  business_name?: string;
}

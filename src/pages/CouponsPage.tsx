import React, { useState } from 'react';
import { Tag, Plus, Clock, Users, Percent, DollarSign, CheckCircle2 } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Coupon } from '../types';
import { formatCurrency, formatDate, generateUUID } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

export const CouponsPage: React.FC = () => {
  const { activeBusiness, coupons } = useBusiness();
  const { success, error } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('20');
  const [minOrderValue, setMinOrderValue] = useState('400');
  const [maxDiscount, setMaxDiscount] = useState('150');
  const [usageLimit, setUsageLimit] = useState('500');

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !discountValue) {
      error('Missing Information', 'Coupon code and discount value are required.');
      return;
    }

    const newCoupon: Coupon = {
      id: generateUUID(),
      business_id: activeBusiness.id,
      code: code.trim().toUpperCase(),
      description: description.trim(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      min_order_value: parseFloat(minOrderValue) || 0,
      max_discount: maxDiscount ? parseFloat(maxDiscount) : undefined,
      start_date: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
      usage_limit: parseInt(usageLimit) || 100,
      usage_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    coupons.push(newCoupon);
    success('Coupon Created', `Code "${newCoupon.code}" is now active for QR ordering.`);
    setCode('');
    setDescription('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Coupons & Promotional Rules
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure percentage or flat discounts, minimum cart values, usage caps, and expirations.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Coupon
        </Button>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {coupons.map((coupon) => {
          const usagePercent = Math.round((coupon.usage_count / coupon.usage_limit) * 100);
          return (
            <Card
              key={coupon.id}
              className="flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-mono font-black text-base text-amber-400 tracking-wider">
                        {coupon.code}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">{coupon.description}</p>
                    </div>
                  </div>
                  <Badge variant={coupon.is_active ? 'success' : 'danger'}>
                    {coupon.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Offer Details */}
                <div className="grid grid-cols-2 gap-3 mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Discount</span>
                    <strong className="text-sm font-bold text-slate-100 font-['Outfit']">
                      {coupon.discount_type === 'PERCENTAGE'
                        ? `${coupon.discount_value}% OFF`
                        : formatCurrency(coupon.discount_value, 'INR', '₹')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Min Cart Value</span>
                    <strong className="text-sm font-bold text-slate-100 font-['Outfit']">
                      {formatCurrency(coupon.min_order_value, 'INR', '₹')}
                    </strong>
                  </div>
                </div>

                {/* Usage meter */}
                <div className="mt-4 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Redemptions</span>
                    <span>
                      {coupon.usage_count} / {coupon.usage_limit} ({usagePercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, usagePercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Expires: {formatDate(coupon.expires_at)}</span>
                <span className="font-semibold text-emerald-400">QR Ready</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create Coupon Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Promotional Coupon"
        description="Issue discounts for QR ordering guests."
        maxWidth="md"
      >
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <Input
            label="Coupon Code (e.g. WELCOME20)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="uppercase font-mono tracking-wider font-bold"
            required
          />

          <Input
            label="Description / Marketing Headline"
            placeholder="e.g. 20% off for first-time digital order customers"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>

            <Input
              label={discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount (₹)'}
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Minimum Order Value (₹)"
              type="number"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
              required
            />
            <Input
              label="Max Discount Cap (₹)"
              type="number"
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
            />
          </div>

          <Input
            label="Total Usage Limit"
            type="number"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Publish Coupon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

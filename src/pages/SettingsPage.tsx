import React, { useState, useRef } from 'react';
import {
  Building2,
  Store,
  Clock,
  Percent,
  Plus,
  Save,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Upload,
  Image as ImageIcon,
  Trash2,
  Camera,
  Sparkles,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

export const SettingsPage: React.FC = () => {
  const {
    activeBusiness,
    activeBranch,
    branches,
    createBranch,
    updateBusinessProfile,
    updateBranchSettings,
  } = useBusiness();
  const { success, error } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Business Profile Form
  const [bizName, setBizName] = useState(activeBusiness.name);
  const [bizEmail, setBizEmail] = useState(activeBusiness.email);
  const [bizPhone, setBizPhone] = useState(activeBusiness.phone || '');
  const [currency, setCurrency] = useState(activeBusiness.currency);
  const [bizLogo, setBizLogo] = useState(activeBusiness.logo_url || '');

  // Branch Settings Form
  const [branchName, setBranchName] = useState(activeBranch.name);
  const [branchAddress, setBranchAddress] = useState(activeBranch.address || '');
  const [branchCity, setBranchCity] = useState(activeBranch.city || '');
  const [branchGst, setBranchGst] = useState(activeBranch.gst_number || '');
  const [taxRate, setTaxRate] = useState(activeBranch.tax_rate_percent.toString());
  const [serviceCharge, setServiceCharge] = useState(activeBranch.service_charge_percent.toString());
  const [openingTime, setOpeningTime] = useState(activeBranch.opening_time || '09:00');
  const [closingTime, setClosingTime] = useState(activeBranch.closing_time || '23:00');

  // New Branch Modal
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchGst, setNewBranchGst] = useState('');

  const PRESET_LOGOS = [
    { label: 'Artisan Coffee', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop&q=80' },
    { label: 'Fine Dining Bistro', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80' },
    { label: 'Italian Trattoria', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80' },
    { label: 'Burger & Craft Bar', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80' },
    { label: 'Pastry & Bakery', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=80' },
  ];

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      error('Image Too Large', 'Please upload a photo under 2MB for faster mobile loading.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBizLogo(dataUrl);
      success('Logo Loaded', 'Preview updated! Click "Save Settings" below to apply everywhere.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessProfile({
      name: bizName.trim(),
      email: bizEmail.trim(),
      phone: bizPhone.trim(),
      currency,
      logo_url: bizLogo.trim() || undefined,
    });
    success('Settings Saved', 'Business profile and logo updated across all terminals & customer menus.');
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranchSettings({
      name: branchName.trim(),
      address: branchAddress.trim(),
      city: branchCity.trim(),
      gst_number: branchGst.trim(),
      tax_rate_percent: parseFloat(taxRate) || 0,
      service_charge_percent: parseFloat(serviceCharge) || 0,
      opening_time: openingTime,
      closing_time: closingTime,
    });
    success('Branch Saved', `Settings for "${branchName}" have been applied.`);
  };

  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    createBranch({
      name: newBranchName.trim(),
      address: newBranchAddress.trim(),
      phone: newBranchPhone.trim(),
      gst_number: newBranchGst.trim(),
    });

    success('Branch Created', `Outlet "${newBranchName}" added with instant table QR provisioning.`);
    setNewBranchName('');
    setNewBranchAddress('');
    setIsAddBranchModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Business & Multi-Branch Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure legal entity profile, tax / GST rates, service charges, operating hours, and new outlets.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddBranchModalOpen(true)}
        >
          Add New Branch / Outlet
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Entity Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>Company & Brand Profile</span>
            </CardTitle>
            <CardDescription>Master organization details across all branches</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveBusiness} className="space-y-4">
              {/* Cafe Logo Uploader */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <label className="text-xs font-semibold text-slate-200 block">
                  Restaurant / Cafe Logo
                </label>

                <div className="flex items-center gap-4">
                  {/* Logo Preview */}
                  <div className="relative group shrink-0">
                    {bizLogo ? (
                      <img
                        src={bizLogo}
                        alt="Cafe Logo"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 shadow-lg shadow-amber-500/20"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center font-black text-slate-950 text-2xl shadow-lg shadow-amber-500/25">
                        {bizName ? bizName.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 rounded-2xl flex flex-col items-center justify-center text-[10px] text-amber-300 font-bold transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Change</span>
                    </button>
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        leftIcon={<Upload className="w-3.5 h-3.5" />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload Image
                      </Button>
                      {bizLogo && (
                        <button
                          type="button"
                          onClick={() => setBizLogo('')}
                          className="px-2.5 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      PNG, JPG, SVG, or WEBP up to 2MB. Displayed on QR menu, topbar, and notifications.
                    </p>
                  </div>
                </div>

                {/* Direct URL input */}
                <div>
                  <input
                    type="url"
                    placeholder="Or paste direct image URL (e.g. https://...)"
                    value={bizLogo}
                    onChange={(e) => setBizLogo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Preset aesthetic logos */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                    Quick Preset Icons
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_LOGOS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setBizLogo(p.url)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                          bizLogo === p.url
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Input
                label="Restaurant / Brand Legal Name"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Official Email"
                  type="email"
                  value={bizEmail}
                  onChange={(e) => setBizEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Official Phone"
                  value={bizPhone}
                  onChange={(e) => setBizPhone(e.target.value)}
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Currency Standard
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Subscription Plan
                  </label>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400">
                    {activeBusiness.subscription_plan} SaaS License (Active)
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
                  Save Business Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Active Branch Settings & GST */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-400" />
              <span>Active Branch: {activeBranch.name}</span>
            </CardTitle>
            <CardDescription>Location-specific taxes, hours, and invoicing details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveBranch} className="space-y-4">
              <Input
                label="Branch / Outlet Name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City"
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                />
                <Input
                  label="GSTIN / Tax Registration No."
                  placeholder="29ABCDE1234F1Z5"
                  value={branchGst}
                  onChange={(e) => setBranchGst(e.target.value)}
                />
              </div>

              <Input
                label="Full Physical Address"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4" />}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="GST Rate (%)"
                  type="number"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  rightIcon={<Percent className="w-4 h-4" />}
                />
                <Input
                  label="Service Charge (%)"
                  type="number"
                  step="0.1"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(e.target.value)}
                  rightIcon={<Percent className="w-4 h-4" />}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Opening Time"
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  leftIcon={<Clock className="w-4 h-4" />}
                />
                <Input
                  label="Closing Time"
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  leftIcon={<Clock className="w-4 h-4" />}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
                  Save Branch Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Add New Branch Modal */}
      <Modal
        isOpen={isAddBranchModalOpen}
        onClose={() => setIsAddBranchModalOpen(false)}
        title="Add New Branch / Outlet"
        description="Expand your restaurant brand into multiple physical locations."
        maxWidth="md"
      >
        <form onSubmit={handleCreateBranchSubmit} className="space-y-4">
          <Input
            label="Branch / Location Name"
            placeholder="e.g. Whitefield Roastery"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            required
          />

          <Input
            label="Street Address"
            placeholder="e.g. ITPL Main Road, Whitefield"
            value={newBranchAddress}
            onChange={(e) => setNewBranchAddress(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Phone"
              placeholder="+91..."
              value={newBranchPhone}
              onChange={(e) => setNewBranchPhone(e.target.value)}
            />
            <Input
              label="GST Number"
              placeholder="29ABC..."
              value={newBranchGst}
              onChange={(e) => setNewBranchGst(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAddBranchModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Launch Outlet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
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

  // Business Profile Form
  const [bizName, setBizName] = useState(activeBusiness.name);
  const [bizEmail, setBizEmail] = useState(activeBusiness.email);
  const [bizPhone, setBizPhone] = useState(activeBusiness.phone || '');
  const [currency, setCurrency] = useState(activeBusiness.currency);

  // Branch Settings Form
  const [branchName, setBranchName] = useState(activeBranch.name);
  const [branchAddress, setBranchAddress] = useState(activeBranch.address || '');
  const [branchCity, setBranchCity] = useState(activeBranch.city || '');
  const [branchGst, setBranchGst] = useState(activeBranch.gst_number || '');
  const [taxRate, setTaxRate] = useState(activeBranch.tax_rate_percent.toString());
  const [serviceCharge, setServiceCharge] = useState(activeBranch.service_charge_percent.toString());
  const [openingTime, setOpeningTime] = useState(activeBranch.opening_time || '09:00');
  const [closingTime, setClosingTime] = useState(activeBranch.closing_time || '23:00');

  // Add Branch Modal
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchGst, setNewBranchGst] = useState('');

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessProfile({
      name: bizName.trim(),
      email: bizEmail.trim(),
      phone: bizPhone.trim(),
      currency,
    });
    success('Settings Saved', 'Business profile has been updated.');
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

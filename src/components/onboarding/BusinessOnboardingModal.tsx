import React, { useState } from 'react';
import { Sparkles, Building2, Store, DollarSign, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useBusiness } from '../../context/BusinessContext';
import { useToast } from '../ui/Toast';

interface BusinessOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const BusinessOnboardingModal: React.FC<BusinessOnboardingModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const { onboardNewBusiness } = useBusiness();
  const { success, error } = useToast();

  const [businessName, setBusinessName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !branchName.trim()) {
      error('Missing Details', 'Please enter your business name and first branch name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onboardNewBusiness(businessName.trim(), branchName.trim(), currency);
      success(
        'Welcome to CafeOS!',
        `Your business "${businessName}" & branch "${branchName}" have been onboarded with digital tables and QR codes!`
      );
      setBusinessName('');
      setBranchName('');
      onClose();
      if (onCompleted) onCompleted();
    } catch {
      error('Onboarding Failed', 'Could not create new tenant business.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-100">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <span>Onboard New Restaurant / Cafe</span>
        </div>
      }
      description="Create a new isolated multi-tenant restaurant workspace in under 60 seconds."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Restaurant / Cafe Name"
          placeholder="e.g. Copper Chimney Bistro"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          leftIcon={<Building2 className="w-4 h-4" />}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Branch / Outlet Name"
            placeholder="e.g. Indiranagar Flagship"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            leftIcon={<Store className="w-4 h-4" />}
            required
          />

          <Select
            label="Currency & Pricing Standard"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={[
              { value: 'INR', label: 'INR (₹) - Indian Rupee' },
              { value: 'USD', label: 'USD ($) - US Dollar' },
              { value: 'EUR', label: 'EUR (€) - Euro' },
              { value: 'GBP', label: 'GBP (£) - British Pound' },
              { value: 'AED', label: 'AED (د.إ) - UAE Dirham' },
            ]}
          />
        </div>

        <Input
          label="Official Contact Phone"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          leftIcon={<DollarSign className="w-4 h-4" />}
        />

        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-amber-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Automatic Tenant Provisioning</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Upon creation, CafeOS will instantly configure Row-Level-Security (RLS) data isolation,
            provision your initial branch, and generate permanent QR codes for dining tables.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Business & Launch
          </Button>
        </div>
      </form>
    </Modal>
  );
};

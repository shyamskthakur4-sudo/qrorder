import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  KeyRound,
  Mail,
  Phone,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { Staff, StaffRole } from '../types';
import { INITIAL_STAFF } from '../lib/mockData';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { generateUUID } from '../lib/utils';

export const StaffPage: React.FC = () => {
  const { activeBusiness, activeBranch } = useBusiness();
  const { role: currentRole, switchRolePreview } = useAuth();
  const { success, error } = useToast();

  const [staffList, setStaffList] = useState<Staff[]>(INITIAL_STAFF);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  // New staff form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('WAITER');
  const [pinCode, setPinCode] = useState('1122');

  const permissionsMatrix: {
    permission: string;
    description: string;
    roles: StaffRole[];
  }[] = [
    {
      permission: 'View Financial Dashboard & Revenue',
      description: 'Access intraday revenue, profit margins, and sales charts',
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      permission: 'Manage Digital Menu & Pricing',
      description: 'Create items, set prices, mark availability',
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      permission: 'Table Management & QR Codes',
      description: 'Generate permanent QR codes and configure seating areas',
      roles: ['OWNER', 'MANAGER', 'WAITER', 'SUPER_ADMIN'],
    },
    {
      permission: 'Kitchen Display Terminal (KDS)',
      description: 'View chef tickets, step order prep progression',
      roles: ['OWNER', 'MANAGER', 'KITCHEN', 'SUPER_ADMIN'],
    },
    {
      permission: 'POS Order Billing & Payments',
      description: 'Punch orders, collect cash/card, issue thermal receipts',
      roles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'SUPER_ADMIN'],
    },
    {
      permission: 'Customer CRM & Marketing Campaigns',
      description: 'View customer spend, issue coupons, send WhatsApp broadcasts',
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      permission: 'Raw Inventory & Procurement',
      description: 'Log deliveries, wastage, and supplier purchase orders',
      roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    },
    {
      permission: 'Branch & Tax/GST Settings',
      description: 'Modify legal business profile, taxes, and service charges',
      roles: ['OWNER', 'SUPER_ADMIN'],
    },
  ];

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      error('Missing Information', 'Please provide staff name and email address.');
      return;
    }

    const newStaff: Staff = {
      id: generateUUID(),
      business_id: activeBusiness.id,
      branch_id: activeBranch.id,
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      role: staffRole,
      pin_code: pinCode.trim(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setStaffList((prev) => [...prev, newStaff]);
    success('Staff Member Added', `${fullName} invited as ${staffRole} with PIN ${pinCode}.`);
    setFullName('');
    setEmail('');
    setPhone('');
    setIsAddStaffOpen(false);
  };

  const getRoleBadgeVariant = (role: StaffRole) => {
    switch (role) {
      case 'OWNER':
        return 'amber';
      case 'MANAGER':
        return 'purple';
      case 'CASHIER':
        return 'info';
      case 'KITCHEN':
        return 'success';
      case 'WAITER':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Staff Members & Role-Based Permissions
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Assign team members to branches with dedicated roles (Owner, Manager, Cashier, Kitchen, Waiter).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddStaffOpen(true)}
          >
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Staff Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {staffList.map((member) => (
          <Card key={member.id} className="flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-slate-200">
                  {member.full_name[0]}
                </div>
                <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
                  {member.role}
                </Badge>
              </div>

              <div className="mt-3">
                <h4 className="text-sm font-bold text-slate-100">{member.full_name}</h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">{member.email}</p>
                {member.phone && (
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{member.phone}</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1 font-mono">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                PIN: <strong className="text-slate-200">{member.pin_code || '1234'}</strong>
              </span>

              <button
                onClick={() => switchRolePreview(member.role)}
                className="text-amber-400 hover:underline font-semibold cursor-pointer text-[11px]"
              >
                Simulate Role
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <span>Role-Based Access Control (RBAC) Matrix</span>
          </CardTitle>
          <CardDescription>
            Row Level Security (RLS) enforcement policies per functional role
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="py-3 px-4 font-semibold">Capability / Permission</th>
                <th className="py-3 px-3 font-semibold text-center">Owner</th>
                <th className="py-3 px-3 font-semibold text-center">Manager</th>
                <th className="py-3 px-3 font-semibold text-center">Cashier</th>
                <th className="py-3 px-3 font-semibold text-center">Kitchen</th>
                <th className="py-3 px-3 font-semibold text-center">Waiter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {permissionsMatrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-200">{item.permission}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                  </td>
                  {(['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'] as StaffRole[]).map(
                    (r) => {
                      const has = item.roles.includes(r);
                      return (
                        <td key={r} className="py-3 px-3 text-center">
                          {has ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-slate-600">
                              —
                            </span>
                          )}
                        </td>
                      );
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title="Add Staff Member"
        description="Configure staff credentials and PIN for quick terminal logins."
        maxWidth="md"
      >
        <form onSubmit={handleAddStaff} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Arjun Patel"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Work Email"
              type="email"
              placeholder="arjun@cafe.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              placeholder="+91..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Assigned Role
              </label>
              <select
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value as StaffRole)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
              >
                <option value="OWNER">OWNER (Full Admin)</option>
                <option value="MANAGER">MANAGER (Operations & Menu)</option>
                <option value="CASHIER">CASHIER (POS & Billing)</option>
                <option value="KITCHEN">KITCHEN (KDS Terminal)</option>
                <option value="WAITER">WAITER (Tables & Orders)</option>
              </select>
            </div>

            <Input
              label="Quick PIN (4 digits)"
              type="password"
              maxLength={4}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAddStaffOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Issue Staff Credentials
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

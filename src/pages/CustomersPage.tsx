import React, { useState } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  Clock,
  Heart,
  Edit3,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Customer, CustomerSegment } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

export const CustomersPage: React.FC = () => {
  const { activeBusiness, customers, orders } = useBusiness();
  const { success } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const filteredCustomers = customers.filter((c) => {
    const matchesSegment = selectedSegment === 'ALL' || c.segment === selectedSegment;
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSegment && matchesSearch;
  });

  const getSegmentBadge = (segment: CustomerSegment) => {
    switch (segment) {
      case 'VIP':
        return <Badge variant="purple" dot>VIP Member</Badge>;
      case 'REGULAR':
        return <Badge variant="success" dot>Regular</Badge>;
      case 'NEW':
        return <Badge variant="info" dot>New Diner</Badge>;
      case 'AT_RISK':
        return <Badge variant="warning" dot>At Risk</Badge>;
      case 'INACTIVE':
        return <Badge variant="danger" dot>Inactive</Badge>;
    }
  };

  const handleOpenNoteModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNoteText(customer.notes || '');
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = () => {
    if (selectedCustomer) {
      selectedCustomer.notes = noteText;
      success('Notes Saved', `Updated CRM profile for ${selectedCustomer.name || selectedCustomer.phone}`);
      setIsNoteModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Customer CRM & Segmentation
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track dining frequency, lifetime value (LTV), loyalty status, and personalized guest preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="amber" size="md">
            {customers.length} Registered Guest Profiles
          </Badge>
        </div>
      </div>

      {/* Segment Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {['ALL', 'VIP', 'REGULAR', 'NEW', 'AT_RISK', 'INACTIVE'].map((seg) => (
            <button
              key={seg}
              onClick={() => setSelectedSegment(seg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSegment === seg
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {seg} {seg !== 'ALL' && `(${customers.filter((c) => c.segment === seg).length})`}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Customer Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map((customer) => {
          const aov =
            customer.visit_count > 0
              ? customer.total_spending / customer.visit_count
              : 0;

          // Find customer orders
          const customerOrders = orders.filter(
            (o) => o.customer_phone === customer.phone || o.customer_id === customer.id
          );

          return (
            <Card
              key={customer.id}
              className="flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-base">
                      {customer.name ? customer.name[0] : 'G'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                        {customer.name || 'Guest Diner'}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {customer.phone}
                      </p>
                    </div>
                  </div>

                  <div>{getSegmentBadge(customer.segment)}</div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Spend</span>
                    <strong className="text-xs font-bold text-amber-400 font-['Outfit']">
                      {formatCurrency(
                        customer.total_spending,
                        activeBusiness.currency,
                        activeBusiness.currency_symbol
                      )}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Visits</span>
                    <strong className="text-xs font-bold text-slate-200">
                      {customer.visit_count}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Avg Bill</span>
                    <strong className="text-xs font-bold text-slate-200 font-['Outfit']">
                      {formatCurrency(
                        aov,
                        activeBusiness.currency,
                        activeBusiness.currency_symbol
                      )}
                    </strong>
                  </div>
                </div>

                {/* Loyalty & Notes */}
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" /> Loyalty Points
                    </span>
                    <span className="font-bold text-slate-200 font-mono">
                      {customer.loyalty_points} pts
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> Last Visit
                    </span>
                    <span className="text-slate-300">{formatDate(customer.last_visit)}</span>
                  </div>

                  {customer.notes && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 italic">
                      "{customer.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Footer actions */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {customerOrders.length} order history
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  leftIcon={<Edit3 className="w-3.5 h-3.5 text-amber-400" />}
                  onClick={() => handleOpenNoteModal(customer)}
                >
                  Edit Guest Notes
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Guest Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title={`CRM Notes: ${selectedCustomer?.name || selectedCustomer?.phone}`}
        description="Save culinary preferences, allergies, or VIP seat requests."
        maxWidth="md"
      >
        <div className="space-y-4">
          <textarea
            rows={4}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Always sits at Table 2, loves single-origin pour-overs with almond milk..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveNote}>
              Save CRM Profile
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

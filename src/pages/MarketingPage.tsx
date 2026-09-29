import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Plug,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Campaign, CustomerSegment } from '../types';
import { formatDate, generateUUID } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

export const MarketingPage: React.FC = () => {
  const { activeBusiness, campaigns, customers } = useBusiness();
  const { success, error, info } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetSegment, setTargetSegment] = useState<CustomerSegment>('REGULAR');
  const [channel, setChannel] = useState<'WHATSAPP' | 'SMS' | 'EMAIL'>('WHATSAPP');
  const [template, setTemplate] = useState(
    'Hey {{name}}! ☕ Your table is waiting at {{business}}. Enjoy 20% off with code CAFE20!'
  );

  const audienceSize = customers.filter(
    (c) => targetSegment === 'NEW' || c.segment === targetSegment
  ).length;

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !template.trim()) {
      error('Missing Information', 'Campaign name and message template are required.');
      return;
    }

    const newCampaign: Campaign = {
      id: generateUUID(),
      business_id: activeBusiness.id,
      name: name.trim(),
      target_segment: targetSegment,
      channel,
      message_template: template.trim(),
      status: 'SENT',
      sent_at: new Date().toISOString(),
      audience_count: audienceSize || 12,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    campaigns.unshift(newCampaign);
    success(
      'Campaign Dispatched!',
      `Broadcast sent via ${channel} to ${newCampaign.audience_count} customers in ${targetSegment} segment.`
    );
    setName('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Marketing Campaigns & Smart Broadcasts
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Re-engage diners via WhatsApp, SMS, and Email using automated customer segments.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Broadcast
        </Button>
      </div>

      {/* Provider Connectivity Architecture Banner */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Plug className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">
              Extensible Omnichannel Messaging Architecture
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Ready for Meta WhatsApp Cloud API, Twilio SMS, and SendGrid/Resend webhooks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Meta WhatsApp Ready
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Twilio Ready
          </span>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((camp) => (
          <Card key={camp.id} className="flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      camp.channel === 'WHATSAPP'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : camp.channel === 'SMS'
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    }`}
                  >
                    {camp.channel === 'WHATSAPP' && <MessageSquare className="w-5 h-5" />}
                    {camp.channel === 'SMS' && <Smartphone className="w-5 h-5" />}
                    {camp.channel === 'EMAIL' && <Mail className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{camp.name}</h4>
                    <span className="text-[11px] text-slate-400">
                      Channel: <strong className="text-slate-200">{camp.channel}</strong>
                    </span>
                  </div>
                </div>

                <Badge variant={camp.status === 'SENT' ? 'success' : 'warning'}>
                  {camp.status}
                </Badge>
              </div>

              {/* Message preview snippet */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed">
                "{camp.message_template}"
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Audience: <strong>{camp.audience_count} guests</strong></span>
              </span>
              <span>Sent: {formatDate(camp.sent_at)}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Broadcast Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Marketing Campaign Broadcast"
        description="Target specific segments with tailored promotional notifications."
        maxWidth="md"
      >
        <form onSubmit={handleCreateCampaign} className="space-y-4">
          <Input
            label="Campaign Name"
            placeholder="e.g. Weekend Brunch Cold Brew Offer"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Target Guest Segment
              </label>
              <select
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value as CustomerSegment)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
              >
                <option value="REGULAR">Regular Visitors</option>
                <option value="VIP">VIP Diners</option>
                <option value="AT_RISK">At Risk (Lapsed 30+ Days)</option>
                <option value="NEW">New Customers</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Broadcast Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as 'WHATSAPP' | 'SMS' | 'EMAIL')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
              >
                <option value="WHATSAPP">WhatsApp Business</option>
                <option value="SMS">Direct SMS</option>
                <option value="EMAIL">Promotional Email</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Message Template
            </label>
            <textarea
              rows={3}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Supports dynamic merge tags: <code className="text-amber-400">{`{{name}}`}</code>,{' '}
              <code className="text-amber-400">{`{{business}}`}</code>
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
            <span>Estimated Audience Size:</span>
            <strong className="font-bold text-sm">{audienceSize || 18} Diners</strong>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" leftIcon={<Send className="w-3.5 h-3.5" />}>
              Dispatch Campaign
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

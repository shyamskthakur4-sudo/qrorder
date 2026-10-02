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
  Bell,
  BellRing,
  Zap,
  Flame,
  Radio,
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
  const { activeBusiness, campaigns, customers, sendSmartBroadcast } = useBusiness();
  const { success, error, info } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetSegment, setTargetSegment] = useState<CustomerSegment>('REGULAR');
  const [channel, setChannel] = useState<'WEB_PUSH' | 'WHATSAPP' | 'SMS' | 'EMAIL'>('WEB_PUSH');
  const [template, setTemplate] = useState(
    'Hey {{name}}! ☕ Your table is waiting at {{business}}. Enjoy 20% off with code CAFE20!'
  );

  // Quick Swiggy/Zomato Lock Screen Broadcast State
  const [pushTitle, setPushTitle] = useState('⚡ Flash 20% OFF Happy Hour!');
  const [pushMessage, setPushMessage] = useState(
    'Order fresh cold brew & sourdough pizza directly from your table right now with code FLASH20!'
  );
  const [pushCode, setPushCode] = useState('FLASH20');

  const BROADCAST_PRESETS = [
    {
      title: '⚡ Flash 20% OFF Happy Hour!',
      message: 'Order any artisan brew or gourmet dessert from your table right now with code FLASH20!',
      code: 'FLASH20',
    },
    {
      title: '🍕 Fresh Out of the Oven Alert!',
      message: 'Our chef just pulled fresh artisan sourdough pizzas out of the wood-fired oven. Order at table now!',
      code: 'PIZZA15',
    },
    {
      title: '☕ Free Coffee Upgrade on Desserts',
      message: 'Order any cheesecake or tiramisu today and get a complimentary single-origin espresso on us!',
      code: 'SWEETPAIR',
    },
    {
      title: '⭐ VIP Dinner Tasting Special',
      message: 'Exclusive 4-course chef tasting menu available tonight. Scan table QR code to explore the secret menu.',
      code: 'VIPDINER',
    },
  ];

  const audienceSize = customers.filter(
    (c) => targetSegment === 'NEW' || c.segment === targetSegment
  ).length;

  const handleSendLiveBroadcast = () => {
    if (!pushTitle.trim() || !pushMessage.trim()) {
      error('Missing Content', 'Please enter a notification headline and body.');
      return;
    }

    sendSmartBroadcast({
      title: pushTitle.trim(),
      message: pushMessage.trim(),
      discountCode: pushCode.trim(),
    });

    success(
      'Broadcast Dispatched Live! 🚀',
      `Push notification sent directly to customer notification bars (Swiggy/Zomato style) + recorded in campaigns.`
    );
  };

  const handleTestMyDevice = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      info('Not Supported', 'Browser notifications not supported on this browser.');
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification(`${activeBusiness.name}: ${pushTitle}`, {
        body: pushMessage,
        icon: activeBusiness.logo_url || '/favicon.svg',
        badge: '/favicon.svg',
      });
      success('Test Push Delivered! 🔔', 'Check your device notification bar right now to see how customers view it.');
    } else {
      error('Permission Denied', 'Please allow notifications in your browser address bar to test on this device.');
    }
  };

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
      audience_count: audienceSize || 24,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (channel === 'WEB_PUSH') {
      sendSmartBroadcast({
        title: name.trim(),
        message: template.trim(),
      });
    } else {
      campaigns.unshift(newCampaign);
      success(
        'Campaign Dispatched!',
        `Broadcast sent via ${channel} to ${newCampaign.audience_count} customers in ${targetSegment} segment.`
      );
    }

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
            Send real-time lock screen push alerts (Swiggy/Zomato style) + WhatsApp, SMS, and Email campaigns to diners.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<Bell className="w-4 h-4 text-amber-400" />}
            onClick={handleTestMyDevice}
          >
            Test on My Phone
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Broadcast
          </Button>
        </div>
      </div>

      {/* Swiggy/Zomato Smart Web Push Broadcast Station */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-2 border-amber-500/30 shadow-2xl relative overflow-hidden space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-2xl shadow-lg shadow-amber-500/20 shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 font-['Outfit']">
                  Instant Lock Screen Push (Swiggy / Zomato Style)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30">
                  Direct to Notification Bar
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispatches immediately to all diners who scanned table QR codes on their mobile phones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Subscribed Diners</span>
              <strong className="text-sm font-bold text-emerald-400 flex items-center gap-1 justify-end">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                {customers.length || 32} Devices Online
              </strong>
            </div>
          </div>
        </div>

        {/* 1-Click Broadcast Presets */}
        <div>
          <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
            One-Click Viral Presets:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {BROADCAST_PRESETS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => {
                  setPushTitle(preset.title);
                  setPushMessage(preset.message);
                  setPushCode(preset.code);
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  pushTitle === preset.title
                    ? 'bg-amber-500/15 border-amber-500 text-slate-100 shadow-md shadow-amber-500/15'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <p className="text-xs font-bold text-amber-300 truncate">{preset.title}</p>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{preset.message}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Live Composer Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Notification Headline
              </label>
              <input
                type="text"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="e.g. ⚡ Flash 20% OFF Happy Hour!"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Notification Message Body
              </label>
              <textarea
                rows={2}
                value={pushMessage}
                onChange={(e) => setPushMessage(e.target.value)}
                placeholder="Message displayed on lock screen / phone notification bar..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex flex-col justify-between p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Promo Code Attached
              </label>
              <input
                type="text"
                value={pushCode}
                onChange={(e) => setPushCode(e.target.value)}
                className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-black tracking-wider uppercase focus:outline-none"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                className="w-full shadow-lg shadow-amber-500/30"
                leftIcon={<Zap className="w-4 h-4 fill-current" />}
                onClick={handleSendLiveBroadcast}
              >
                Send Live Push Alert 🚀
              </Button>
              <Button
                variant="ghost"
                className="w-full text-xs text-slate-400 hover:text-slate-200"
                leftIcon={<BellRing className="w-3.5 h-3.5 text-amber-400" />}
                onClick={handleTestMyDevice}
              >
                Preview on This Device
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Connectivity Architecture Banner */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Plug className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">
              Omnichannel Messaging Infrastructure
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Web Push notifications, Meta WhatsApp Cloud API, and Twilio SMS gateways.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Web Push Active
          </span>
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
                      camp.channel === 'WEB_PUSH'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : camp.channel === 'WHATSAPP'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : camp.channel === 'SMS'
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    }`}
                  >
                    {camp.channel === 'WEB_PUSH' && <Zap className="w-5 h-5 text-amber-400 fill-current" />}
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
                onChange={(e) => setChannel(e.target.value as 'WEB_PUSH' | 'WHATSAPP' | 'SMS' | 'EMAIL')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
              >
                <option value="WEB_PUSH">Live Lock Screen Push (Swiggy/Zomato)</option>
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

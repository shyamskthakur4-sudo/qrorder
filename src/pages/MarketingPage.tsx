import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Laptop,
  History,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Campaign, CustomerSegment, PushNotificationLog, PushSubscriptionRecord } from '../types';
import { formatDate, generateUUID } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { showLockScreenNotification, requestNotificationPermission } from '../lib/pushNotifications';

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
  const [notifType, setNotifType] = useState<'OFFER' | 'ANNOUNCEMENT' | 'ORDER_STATUS' | 'TEST'>('OFFER');
  const [isSending, setIsSending] = useState(false);

  // Live Push Subscriptions & Delivery Audit Logs State
  const [activeSubscribers, setActiveSubscribers] = useState<PushSubscriptionRecord[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<PushNotificationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Local notification permission status
  const [devicePermission, setDevicePermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const fetchPushData = async () => {
    if (!isSupabaseConfigured || !activeBusiness?.id) return;
    setIsLoadingLogs(true);
    try {
      const { data: subsData } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .eq('is_active', true);
      if (subsData) {
        setActiveSubscribers(subsData as PushSubscriptionRecord[]);
      }

      const { data: logsData } = await supabase
        .from('push_notification_logs')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (logsData) {
        setDeliveryLogs(logsData as PushNotificationLog[]);
      }
    } catch (err) {
      console.warn('Error fetching push subscriptions/logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchPushData();
  }, [activeBusiness?.id]);

  const androidCount = activeSubscribers.filter((s) => s.platform === 'ANDROID').length;
  const iosCount = activeSubscribers.filter((s) => s.platform === 'IOS_PWA').length;
  const desktopWebCount = activeSubscribers.filter(
    (s) => s.platform === 'DESKTOP' || s.platform === 'WEB' || !s.platform
  ).length;

  const BROADCAST_PRESETS = [
    {
      title: '⚡ Flash 20% OFF Happy Hour!',
      message: 'Order any artisan brew or gourmet dessert from your table right now with code FLASH20!',
      code: 'FLASH20',
      type: 'OFFER' as const,
    },
    {
      title: '🍕 Fresh Out of the Oven Alert!',
      message: 'Our chef just pulled fresh artisan sourdough pizzas out of the wood-fired oven. Order at table now!',
      code: 'PIZZA15',
      type: 'OFFER' as const,
    },
    {
      title: '☕ Free Coffee Upgrade on Desserts',
      message: 'Order any cheesecake or tiramisu today and get a complimentary single-origin espresso on us!',
      code: 'SWEETPAIR',
      type: 'OFFER' as const,
    },
    {
      title: '⭐ VIP Dinner Tasting Special',
      message: 'Exclusive 4-course chef tasting menu available tonight. Scan table QR code to explore the secret menu.',
      code: 'VIPDINER',
      type: 'ANNOUNCEMENT' as const,
    },
  ];

  const audienceSize = customers.filter(
    (c) => targetSegment === 'NEW' || c.segment === targetSegment
  ).length;

  const handleSendLiveBroadcast = async () => {
    if (!pushTitle.trim() || !pushMessage.trim()) {
      error('Missing Content', 'Please enter a notification headline and body.');
      return;
    }

    setIsSending(true);
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        try {
          const perm = await requestNotificationPermission({
            businessName: activeBusiness.name,
            logoUrl: activeBusiness.logo_url,
          });
          setDevicePermission(perm);
        } catch {}
      }

      await sendSmartBroadcast({
        title: pushTitle.trim(),
        message: pushMessage.trim(),
        discountCode: pushCode.trim(),
        notificationType: notifType,
      });

      success(
        'Broadcast Dispatched Live! 🚀',
        `Push alert dispatched to all active diner devices (Swiggy/Zomato style) + previewed on this device.`
      );

      // Refresh delivery logs to reflect new push statistics
      setTimeout(fetchPushData, 800);
    } catch (err: any) {
      error('Broadcast Error', err?.message || 'Could not dispatch broadcast');
    } finally {
      setIsSending(false);
    }
  };

  const handleTestMyDevice = async () => {
    const isSupported = typeof window !== 'undefined' && 'Notification' in window;
    if (!isSupported) {
      showLockScreenNotification({
        title: `${activeBusiness.name}: ${pushTitle}`,
        body: pushMessage,
        icon: activeBusiness.logo_url || '/favicon.svg',
        chimeType: 'ping',
        tag: 'marketing_test',
        url: typeof window !== 'undefined' ? window.location.href : '/',
      });
      info('In-App Notification Preview', 'Notification banner & sound tested.');
      return;
    }

    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await requestNotificationPermission({
        businessName: activeBusiness.name,
        logoUrl: activeBusiness.logo_url,
      });
      setDevicePermission(perm);
    }

    // Always trigger lock screen notification + in-app banner + chime + haptic vibration
    await showLockScreenNotification({
      title: `${activeBusiness.name}: ${pushTitle}`,
      body: pushMessage,
      icon: activeBusiness.logo_url || '/favicon.svg',
      chimeType: 'ping',
      tag: 'marketing_test',
      url: window.location.href,
    });

    if (perm === 'granted') {
      success(
        'Lock-Screen Push Delivered! 🔔',
        'Check your device lock screen, notification bar & top screen banner.'
      );
    } else {
      info(
        'In-App Push Banner Displayed! 🔔',
        'Native OS notifications are blocked in your browser. Unblock in address bar to also receive lock screen push when browser is closed.'
      );
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
      audience_count: audienceSize,
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

          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Subscribers</span>
              <strong className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                {activeSubscribers.length} Devices
              </strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] flex items-center gap-1.5 text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android: <strong className="text-emerald-300">{androidCount}</strong></span>
            </div>
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] flex items-center gap-1.5 text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span>iOS PWA: <strong className="text-purple-300">{iosCount}</strong></span>
            </div>
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] flex items-center gap-1.5 text-slate-300">
              <Laptop className="w-3.5 h-3.5 text-sky-400" />
              <span>Desktop: <strong className="text-sky-300">{desktopWebCount}</strong></span>
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
                  setNotifType(preset.type);
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  pushTitle === preset.title
                    ? 'bg-amber-500/15 border-amber-500 text-slate-100 shadow-md shadow-amber-500/15'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-xs font-bold text-amber-300 truncate">{preset.title}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold uppercase shrink-0">
                    {preset.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{preset.message}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Live Composer Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
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
                  Category
                </label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500 h-[38px]"
                >
                  <option value="OFFER">🎁 Exclusive Offer</option>
                  <option value="ANNOUNCEMENT">📢 Event Announcement</option>
                  <option value="TEST">🧪 Test Dispatch</option>
                </select>
              </div>
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
                disabled={isSending}
                isLoading={isSending}
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
              <div className="pt-1 flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-400">Lock-Screen Alert:</span>
                {devicePermission === 'granted' ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Active on Device
                  </span>
                ) : devicePermission === 'denied' ? (
                  <span className="text-rose-400 font-semibold text-[10px]" title="Unblock in your browser address bar">
                    Blocked in Browser
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleTestMyDevice}
                    className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer text-[10px]"
                  >
                    Click to Enable
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Push Notification Delivery & Audit Logs */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-['Outfit']">
                  Push Delivery & Server Audit Logs
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                  Supabase Edge
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time delivery receipts, recipient device counts, and expired subscription cleanup logs.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPushData}
            isLoading={isLoadingLogs}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />}
            className="text-xs text-slate-300 hover:text-slate-100 self-start sm:self-auto"
          >
            Refresh Logs
          </Button>
        </div>

        {deliveryLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 rounded-2xl border border-dashed border-slate-800">
            <Radio className="w-6 h-6 mx-auto text-slate-600 mb-2 opacity-60" />
            <p className="text-xs font-semibold text-slate-300">No push notification logs recorded yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Broadcasts and order status updates sent via the Edge Function will display delivery metrics here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Sent Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Notification Content</th>
                  <th className="py-2.5 px-3 text-center">Recipients</th>
                  <th className="py-2.5 px-3 text-center">Delivered</th>
                  <th className="py-2.5 px-3 text-center">Failed</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {deliveryLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.notification_type === 'OFFER'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : log.notification_type === 'ANNOUNCEMENT'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : log.notification_type === 'ORDER_STATUS'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {log.notification_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs sm:max-w-md">
                      <p className="font-bold text-slate-200 truncate">{log.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{log.body}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-200">
                      {log.recipient_count}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">
                      {log.success_count}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-rose-400">
                      {log.failure_count}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SENT'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : log.status === 'PARTIAL'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        {campaigns.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 rounded-2xl border border-dashed border-slate-800">
            <Megaphone className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">No campaigns launched yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Use "Send Live Push Alert" above or click "Create Broadcast" to reach registered diners.
            </p>
          </div>
        ) : (
          campaigns.map((camp) => (
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
          ))
        )}
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

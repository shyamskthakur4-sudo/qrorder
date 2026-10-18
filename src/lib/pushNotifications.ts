// CafeOS Professional Push Notification & Web Push Engine (Swiggy / Zomato Style)
import { supabase, isSupabaseConfigured } from './supabase';
import { OrderStatus } from '../types';

export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BI1WU_gSiMY-lQxUKj4O3pfRiG_9RZ1M3gI1Mkv3y2uvq5A4Bi9h2zboCVmWVSdS-V4NJLjD2OibZRRRJn5t3W4';

let audioCtx: AudioContext | null = null;

// Convert base64url VAPID public key string to Uint8Array for PushManager
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Client platform detection
export function getClientPlatform(): 'ANDROID' | 'IOS_PWA' | 'DESKTOP' | 'WEB' {
  if (typeof window === 'undefined' || !navigator) return 'WEB';
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  if (isIos) {
    return isStandalone ? 'IOS_PWA' : 'WEB';
  }
  if (/android/.test(ua)) {
    return 'ANDROID';
  }
  if (/windows|macintosh|linux/.test(ua)) {
    return 'DESKTOP';
  }
  return 'WEB';
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined' || !navigator) return false;
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}

export function isIosPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

// Session identifier for anonymous diners prior to phone checkout
export function getOrCreateDinerSessionId(): string {
  if (typeof window === 'undefined') return 'diner_sess_default';
  let sessId = localStorage.getItem('cafeos_diner_session_id');
  if (!sessId) {
    sessId = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    localStorage.setItem('cafeos_diner_session_id', sessId);
  }
  return sessId;
}

// Synthesize pleasant, crisp audio chimes using Web Audio API
export const playNotificationChime = (type: 'order' | 'ready' | 'celebrate' | 'ping' = 'order') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioContextClass();
    }

    const now = audioCtx.currentTime;

    if (type === 'ready' || type === 'celebrate') {
      // Swiggy/Zomato food-ready 4-note ascending fanfare
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.3, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } else {
      // Swiggy 2-note uplifting bell
      const freqs = [587.33, 880.0]; // D5, A5
      freqs.forEach((freq, idx) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.25, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.3);
      });
    }
  } catch (err) {
    console.debug('Audio chime notice:', err);
  }
};

// Haptic vibration feedback for mobile devices
export const triggerHaptic = (pattern: number[] = [250, 100, 250, 100, 250]) => {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
};

// Register Service Worker for Mobile Lock-Screen Push notifications
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('Service Worker registration note:', err);
    return null;
  }
};

// Subscribe device to Web Push service and securely persist to Supabase
export const subscribeToPushServiceAndSave = async (params: {
  businessId: string;
  branchId?: string;
  customerId?: string;
}): Promise<boolean> => {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return false;
  }

  try {
    const reg = await registerServiceWorker();
    if (!reg) return false;

    // Check or create subscription with PushManager using VAPID public key
    let sub = await reg.pushManager.getSubscription();
    if (!sub && VAPID_PUBLIC_KEY) {
      try {
        const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey as unknown as BufferSource,
        });
      } catch (subErr) {
        console.warn('PushManager subscription exception:', subErr);
      }
    }

    if (!sub) return false;

    const subJson = sub.toJSON();
    const endpoint = sub.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) return false;

    const sessionId = getOrCreateDinerSessionId();
    const platform = getClientPlatform();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

    if (isSupabaseConfigured) {
      const { error: upsertErr } = await supabase.from('push_subscriptions').upsert(
        {
          business_id: params.businessId,
          branch_id: params.branchId || null,
          customer_id: params.customerId || null,
          session_id: sessionId,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent,
          platform,
          is_active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

      if (upsertErr) {
        console.warn('Push subscription persistence notice:', upsertErr);
      }
    }

    localStorage.setItem('cafeos_push_endpoint', endpoint);
    return true;
  } catch (err) {
    console.warn('Push subscription notice:', err);
    return false;
  }
};

// Request Notification Permission on user gesture and register Web Push subscription
export const requestNotificationPermission = async (options?: {
  businessName?: string;
  logoUrl?: string;
  businessId?: string;
  branchId?: string;
  customerId?: string;
}): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  // 1. Resume audio context inside this user gesture
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    }
  } catch {}

  try {
    // 2. Request native permission synchronously within user gesture
    let permission: NotificationPermission;
    try {
      const res = Notification.requestPermission();
      if (res && typeof (res as any).then === 'function') {
        permission = await res;
      } else {
        permission = await new Promise((resolve) => Notification.requestPermission(resolve));
      }
    } catch {
      permission = await new Promise((resolve) => Notification.requestPermission(resolve));
    }

    if (permission === 'granted') {
      triggerHaptic([200, 80, 200]);
      playNotificationChime('ready');

      // 3. Register Web Push with PushManager & save to Supabase
      if (options?.businessId) {
        subscribeToPushServiceAndSave({
          businessId: options.businessId,
          branchId: options.branchId,
          customerId: options.customerId,
        }).catch(() => {});
      } else {
        registerServiceWorker().catch(() => {});
      }

      // 4. Send immediate welcome lock-screen confirmation
      await showLockScreenNotification({
        title: `✨ Live Food Tracking Enabled!`,
        body: `You'll receive live lock-screen updates when your order is cooking & ready to serve!`,
        icon: options?.logoUrl || '/favicon.svg',
        tag: 'welcome_notification',
      });
    }

    return permission;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return 'denied';
  }
};

export interface LockScreenNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  orderId?: string;
  vibrate?: number[];
  chimeType?: 'order' | 'ready' | 'celebrate' | 'ping';
}

// Show Lock Screen Notification (Swiggy / Zomato style)
export const showLockScreenNotification = async ({
  title,
  body,
  icon = '/favicon.svg',
  badge = '/favicon.svg',
  image,
  tag = 'cafeos_notification',
  url = typeof window !== 'undefined' ? window.location.href : '/',
  orderId,
  vibrate = [250, 100, 250, 100, 250],
  chimeType = 'order',
}: LockScreenNotificationOptions): Promise<boolean> => {
  // 1. Audio chime & mobile haptic vibration
  triggerHaptic(vibrate);
  playNotificationChime(chimeType);

  // 2. Dispatch in-app dynamic floating banner
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('cafeos:push_notification', {
          detail: {
            title,
            body,
            icon,
            badge,
            tag,
            url,
            orderId,
            chimeType,
            timestamp: Date.now(),
          },
        })
      );
    } catch {}
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return true; // in-app banner handled
  }

  if (Notification.permission !== 'granted') {
    return true; // in-app banner handled
  }

  const persistentOptions: NotificationOptions & Record<string, any> = {
    body,
    icon,
    badge,
    image,
    tag,
    renotify: true,
    requireInteraction: true,
    data: {
      url,
      orderId,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'track', title: '📍 Live Order Tracker' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  const standardOptions: NotificationOptions & Record<string, any> = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: true,
    data: {
      url,
      orderId,
      timestamp: Date.now(),
    },
  };

  // 1. Android, iOS PWA, and Chrome: ServiceWorkerRegistration.showNotification
  if ('serviceWorker' in navigator) {
    try {
      let reg: ServiceWorkerRegistration | null | undefined = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await registerServiceWorker();
      }
      if (reg) {
        if (reg.active) {
          reg.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            options: persistentOptions,
          });
        }
        await reg.showNotification(title, persistentOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('Service worker showNotification notice:', swErr);
    }
  }

  // 2. Desktop fallback without active ServiceWorker
  try {
    const notif = new Notification(title, standardOptions);
    notif.onclick = () => {
      window.focus();
      if (url) window.location.href = url;
    };
    return true;
  } catch (nErr) {
    console.warn('Fallback Notification constructor note:', nErr);
  }

  return true;
};

// Dispatch server-side Web Push notification via Supabase Edge Function to all subscribed devices
export const dispatchWebPushViaEdge = async (params: {
  businessId: string;
  branchId?: string;
  customerId?: string;
  sessionId?: string;
  orderId?: string;
  campaignId?: string;
  notificationType?: 'ORDER_STATUS' | 'OFFER' | 'ANNOUNCEMENT' | 'TEST';
  notification: LockScreenNotificationOptions;
}): Promise<{
  success: boolean;
  recipient_count?: number;
  success_count?: number;
  failure_count?: number;
  cleaned_expired_count?: number;
}> => {
  try {
    const baseUrl =
      import.meta.env.VITE_SUPABASE_URL || 'https://mqwhqptxdyhphgosodrb.supabase.co';
    const edgeUrl = `${baseUrl}/functions/v1/send-push`;

    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        business_id: params.businessId,
        branch_id: params.branchId,
        customer_id: params.customerId,
        session_id: params.sessionId,
        order_id: params.orderId,
        campaign_id: params.campaignId,
        notification_type: params.notificationType || 'ORDER_STATUS',
        notification: params.notification,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Edge push response notice:', errText);
      return { success: false };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Edge push dispatch network notice:', err);
    return { success: false };
  }
};

// Generate Swiggy / Zomato dynamic status notification content
export const getOrderStatusNotificationConfig = (
  status: OrderStatus,
  orderNumber: string,
  tableName?: string,
  businessName?: string
): { title: string; body: string; chimeType: 'order' | 'ready' | 'celebrate' | 'ping' } => {
  const bizPrefix = businessName ? `${businessName}: ` : '';
  const num = orderNumber ? (orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`) : '#ORD';
  const tableText = tableName ? `Table ${tableName}` : 'your table';

  switch (status) {
    case 'PLACED':
      return {
        title: `${bizPrefix}🍽️ Order ${num} Received!`,
        body: `Order dispatched to kitchen for ${tableText}. Tap to track live cooking time!`,
        chimeType: 'order',
      };
    case 'PREPARING':
      return {
        title: `${bizPrefix}🔥 Sizzling in Kitchen — ${num}`,
        body: `The chef is cooking your dishes fresh for ${tableText}! Almost ready.`,
        chimeType: 'order',
      };
    case 'READY':
      return {
        title: `${bizPrefix}🛎️ Fresh & Hot! Order ${num} Ready!`,
        body: `Your food is ready to serve at ${tableText}! Enjoy your meal! 🎉`,
        chimeType: 'ready',
      };
    case 'COMPLETED':
      return {
        title: `${bizPrefix}⭐ Hope You Loved It! Order ${num}`,
        body: `Thank you for dining with us! Tap here to leave a quick 5-star review.`,
        chimeType: 'celebrate',
      };
    case 'CANCELLED':
      return {
        title: `${bizPrefix}⚠️ Order ${num} Update`,
        body: `Your order was marked cancelled. Please check with your server if unexpected.`,
        chimeType: 'ping',
      };
    default:
      return {
        title: `${bizPrefix}🍽️ Order ${num} Update`,
        body: `Status: ${status} for ${tableText}.`,
        chimeType: 'order',
      };
  }
};

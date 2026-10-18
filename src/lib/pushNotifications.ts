// CafeOS Professional Push Notification & Lock-Screen Engine (Swiggy / Zomato Style)
import { OrderStatus } from '../types';

let audioCtx: AudioContext | null = null;

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

// Request Notification Permission
export const requestNotificationPermission = async (options?: {
  businessName?: string;
  logoUrl?: string;
}): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  // 1. Resume audio context inside this user gesture so chimes play freely
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
    // 2. CRITICAL: Request permission IMMEDIATELY without awaiting service worker first,
    // to ensure the browser user-gesture activation is active!
    const permission = await Notification.requestPermission();

    // 3. Register service worker in background once permission is granted
    registerServiceWorker().catch(() => {});

    if (permission === 'granted') {
      triggerHaptic([200, 80, 200]);
      playNotificationChime('ready');

      // Send immediate welcome test lock-screen notification
      await showLockScreenNotification({
        title: `✨ VIP Food Tracking Enabled!`,
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
  // 1. Always play pleasant Swiggy audio chime & trigger mobile haptic vibration
  triggerHaptic(vibrate);
  playNotificationChime(chimeType);

  // 2. ALWAYS dispatch in-app dynamic push event so an instant Swiggy/Zomato banner slides down immediately
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
    return true; // in-app displayed
  }

  if (Notification.permission !== 'granted') {
    return true; // in-app displayed
  }

  // Persistent notification options (supported with actions by ServiceWorkerRegistration)
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

  // Standard non-persistent notification options (WITHOUT actions to prevent browser TypeError in new Notification)
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

  // 1. On Android, iOS PWA, and Chrome: ServiceWorkerRegistration.showNotification is preferred for lock screen
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

  // 2. Fallback for desktop browsers without active SW (uses standardOptions without 'actions')
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

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

  try {
    // Register SW first so it is available immediately when permission is granted
    await registerServiceWorker();

    const permission = await Notification.requestPermission();

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
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  // Play audio chime & trigger mobile haptic vibration
  triggerHaptic(vibrate);
  playNotificationChime(chimeType);

  const notificationOptions: NotificationOptions & Record<string, any> = {
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

  // On Android and iOS PWA, ServiceWorkerRegistration.showNotification is REQUIRED
  if ('serviceWorker' in navigator) {
    try {
      let reg: ServiceWorkerRegistration | null | undefined = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await registerServiceWorker();
      }
      if (reg) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('Service worker showNotification notice:', swErr);
    }
  }

  // Fallback for desktop browsers without active SW
  try {
    new Notification(title, notificationOptions);
    return true;
  } catch (nErr) {
    console.warn('Fallback Notification constructor note:', nErr);
  }

  return false;
};

// Generate Swiggy / Zomato dynamic status notification content
export const getOrderStatusNotificationConfig = (
  status: OrderStatus,
  orderNumber: string,
  tableName?: string,
  businessName?: string
): { title: string; body: string; chimeType: 'order' | 'ready' | 'celebrate' | 'ping' } => {
  const bizPrefix = businessName ? `${businessName}: ` : '';
  const tableText = tableName ? `Table ${tableName}` : 'your table';

  switch (status) {
    case 'PLACED':
      return {
        title: `${bizPrefix}🍽️ Order #${orderNumber} Received!`,
        body: `Order dispatched to kitchen for ${tableText}. Tap to track live cooking time!`,
        chimeType: 'order',
      };
    case 'PREPARING':
      return {
        title: `${bizPrefix}🔥 Sizzling in Kitchen — #${orderNumber}`,
        body: `The chef is cooking your dishes fresh for ${tableText}! Almost ready.`,
        chimeType: 'order',
      };
    case 'READY':
      return {
        title: `${bizPrefix}🛎️ Fresh & Hot! Order #${orderNumber} Ready!`,
        body: `Your food is ready to serve at ${tableText}! Enjoy your meal! 🎉`,
        chimeType: 'ready',
      };
    case 'COMPLETED':
      return {
        title: `${bizPrefix}⭐ Hope You Loved It! Order #${orderNumber}`,
        body: `Thank you for dining with us! Tap here to leave a quick 5-star review.`,
        chimeType: 'celebrate',
      };
    case 'CANCELLED':
      return {
        title: `${bizPrefix}⚠️ Order #${orderNumber} Update`,
        body: `Your order was marked cancelled. Please check with your server if unexpected.`,
        chimeType: 'ping',
      };
    default:
      return {
        title: `${bizPrefix}🍽️ Order #${orderNumber} Update`,
        body: `Status: ${status} for ${tableText}.`,
        chimeType: 'order',
      };
  }
};

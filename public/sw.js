// CafeOS Service Worker — Swiggy/Zomato Style Instant Lock Screen Push Notifications
const CACHE_NAME = 'cafeos-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification event (triggered from Web Push server / Supabase Webhooks)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Order Update', body: event.data.text() };
    }
  }

  const title = data.title || '🍽️ CafeOS Food Alert';
  const options = {
    body: data.body || 'Your delicious meal status has changed!',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    image: data.image,
    vibrate: data.vibrate || [250, 100, 250, 100, 250],
    tag: data.tag || 'order_update',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      orderId: data.orderId,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'track', title: '📍 Track Live Prep' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_EVENT_RECEIVED',
            payload: { title, ...options },
          });
        });
      }),
    ])
  );
});

// Handle subscription rotation from browser push service
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true })
      .then((subscription) => {
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_ROTATED',
              subscription: subscription.toJSON(),
            });
          });
        });
      })
  );
});

// Handle notification display request dispatched from web client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const notificationOptions = {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [250, 100, 250, 100, 250],
      requireInteraction: true,
      renotify: true,
      ...options,
    };

    event.waitUntil(
      self.registration.showNotification(title, notificationOptions)
    );
  }
});

// Lock-screen Notification Click Handler — Opens/Focuses Order Tracker
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it and navigate
      for (let client of windowClients) {
        if ('focus' in client) {
          if (client.url === targetUrl || client.url.includes('/menu')) {
            return client.focus();
          }
        }
      }
      // If client exists but on different page, focus and redirect
      if (windowClients.length > 0 && 'focus' in windowClients[0] && 'navigate' in windowClients[0]) {
        return windowClients[0].focus().then(() => windowClients[0].navigate(targetUrl));
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

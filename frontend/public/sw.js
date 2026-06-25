// VSM Ambassador PWA — service worker with Web Push + offline shell
const CACHE = 'vsm-amb-v8';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/logo-original.png',
  '/icons/file_000000008e6471f4811ba9633a86cab4.png',
  '/icons/image_1782342973184.jpeg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchP = fetch(req).then((res) => {
        if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || fetchP;
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } catch (_e) {
      data = { title: 'VSM Ambassador', body: event.data.text() };
    }
  }
  const title = data.title || 'VSM Ambassador';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/image_1782342973184.jpeg',
    badge: '/icons/file_000000008e6471f4811ba9633a86cab4.png',
    data: { url: data.url || '/dashboard' },
    vibrate: [120, 60, 120],
    tag: data.tag || 'vsm-amb',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) { client.focus(); client.navigate(url); return; }
        } catch (_e) { /* ignore */ }
      }
      return self.clients.openWindow(url);
    })
  );
});

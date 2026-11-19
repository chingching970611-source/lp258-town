/* Minimal service worker so the town can be installed as a phone app. It doesn't cache anything:
   every request goes straight to the network, so updates show up immediately. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

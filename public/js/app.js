// Keyboard input
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  handleKey(e.key);
});

// Service Worker (PWA offline support)
if ('serviceWorker' in navigator) {
  const sw = new Blob([`
    self.addEventListener('install', e => self.skipWaiting());
    self.addEventListener('activate', e => e.waitUntil(clients.claim()));
    self.addEventListener('fetch', e => {
      e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request).catch(() => new Response('Offline')))
      );
    });
  `], { type: 'application/javascript' });
  navigator.serviceWorker.register(URL.createObjectURL(sw)).catch(() => {});
}

// Start
initGame();

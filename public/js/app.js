// Keyboard input
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // Prevent Enter from activating focused buttons (New, Stats, etc.)
  if (e.key === 'Enter') {
    e.preventDefault();
  }
  handleKey(e.key);
  // Visual feedback on virtual keyboard
  const vk = e.key === 'Enter' ? document.getElementById('key-ENTER')
           : e.key === 'Backspace' ? document.getElementById('key-⌫')
           : /^[a-zA-Z]$/.test(e.key) ? document.getElementById(`key-${e.key.toLowerCase()}`)
           : null;
  if (vk) {
    vk.style.transform = 'scale(0.93)';
    setTimeout(() => { vk.style.transform = ''; }, 120);
  }
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

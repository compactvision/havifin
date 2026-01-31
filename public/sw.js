self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
    // Minimal fetch listener required for PWA installability
});

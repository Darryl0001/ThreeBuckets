self.addEventListener('install', e => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', e => {
  // This is a simple fetch handler, caches can be added here
});

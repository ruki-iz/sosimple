// Сервис-воркер приложения «Мои задачи»: офлайн-кеш основных файлов.
// Стратегия network-first: при наличии сети всегда отдаётся свежая версия,
// без сети — последняя закешированная копия.
const CACHE_NAME = 'tasks-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './in_fixed.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(CORE_ASSETS.map(a => cache.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() =>
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html')
            .then(r => r || caches.match('./in_fixed.html'))
            .then(r => r || caches.match('./'))
            .then(r => r || Response.error());
        }
        return Response.error();
      })
    )
  );
});

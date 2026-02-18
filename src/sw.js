const CACHE_NAME = 'news-cache-v1';
const STATIC_CACHE_NAME = 'static-cache-v1';

// Ресурсы для кэширования
const staticAssets = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js'
];

// Установка Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE_NAME).then(cache => {
                return cache.addAll(staticAssets);
            }),
            caches.open(CACHE_NAME)
        ])
    );
});

// Активация и очистка старых кэшей
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== STATIC_CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// Стратегия кэширования: Stale-While-Revalidate для API, Cache First для статики
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Для API запросов
    if (url.pathname.includes('/api/')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(event.request)
                    .then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    })
                    .catch(() => {
                        return cache.match(event.request);
                    });
            })
        );
    } 
    // Для статических ресурсов
    else {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(event.request).then(response => {
                        return caches.open(STATIC_CACHE_NAME).then(cache => {
                            cache.put(event.request, response.clone());
                            return response;
                        });
                    });
                })
        );
    }
});
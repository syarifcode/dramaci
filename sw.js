self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Strategi: Network First (Ambil dari internet dulu, kalau offline baru error)
    // Ini biar update kodingan Mas selalu langsung muncul tanpa cache nyangkut.
    e.respondWith(
        fetch(e.request).catch(() => {
            return new Response("Anda sedang offline.");
        })
    );
});

const CACHE = 'kiosk-cache-v1';
const ASSETS = [
'./',
'./index.html',
'./kit.html',
'./styles.css',
'./manifest.json',
'./js/config.js',
'./js/api.js',
'./js/app.js',
'./js/kit.js',
'./js/qrcode.min.js',
];
self.addEventListener('install', (e) => {
e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', (e) => {
e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', (e) => {
e.respondWith(
caches.match(e.request).then(r => r || fetch(e.request).catch(()=>caches.match('./index.html')))
);
});


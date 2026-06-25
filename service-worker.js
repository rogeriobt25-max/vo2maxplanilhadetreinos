/* VO2 Máx — Service Worker v1.0 */
const CACHE_NAME = 'vo2max-v1';

/* Arquivos a cachear na instalação */
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* Instala e pré-cacheia os arquivos essenciais */
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE).catch(function() {
        /* Se algum recurso falhar, instala mesmo assim */
      });
    })
  );
});

/* Ativa e limpa caches antigos */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* Estratégia: Network First, fallback para cache */
self.addEventListener('fetch', function(event) {
  /* Ignora requisições não-GET e cross-origin */
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        /* Atualiza o cache com a resposta mais recente */
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        /* Offline: serve do cache */
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});

/* VO2 Máx — Service Worker v1.1 */
const CACHE_NAME = 'vo2max-v10';

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

/* Estratégia: Network First, fallback para cache.
   Para o documento principal (navegação/index.html), força bypass do cache HTTP
   do navegador (cache:'no-store'), pra garantir que o app instalado sempre
   busque a versão mais nova do código assim que houver internet. */
self.addEventListener('fetch', function(event) {
  /* Ignora requisições não-GET e cross-origin */
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  var isNavigation = event.request.mode === 'navigate' ||
    (event.request.destination === 'document') ||
    url.pathname.endsWith('index.html');

  var fetchRequest = isNavigation
    ? new Request(event.request.url, { cache: 'no-store', credentials: event.request.credentials, mode: 'same-origin' })
    : event.request;

  event.respondWith(
    fetch(fetchRequest)
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

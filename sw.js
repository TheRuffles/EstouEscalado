// Service Worker - sw.js

const CACHE_NAME = 'estou-escalado-cache-v1';
// Adicione aqui os arquivos que compõem a "casca" do seu app
// O '.' se refere ao index.html na raiz.
// Adicione os caminhos para seus ícones e outros assets estáticos importantes.
const urlsToCache = [
    '.', 
    'index.html', // Redundante se '.' estiver, mas bom para clareza
    'favicon.png',
    'icon-192x192.png',
    'icon-512x512.png',
    'https://i.imgur.com/5aGcTPI.png', // Imagem do logo no cabeçalho
    // Não adicione aqui os arquivos de áudio se você quer que eles sempre tentem ser buscados da rede
    // ou se eles mudam. Se forem estáticos, pode adicionar.
    // Não adicione a URL da planilha aqui, pois ela é dinâmica e usa proxy.
    // CSS e JS externos (Tailwind, Google Fonts) são cacheados pelo navegador,
    // mas para um PWA mais robusto offline, poderiam ser cacheados aqui também,
    // embora aumente a complexidade do service worker.
];

// Evento de Instalação: Cacheia os arquivos da "casca" do app
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Cache aberto e arquivos da casca sendo cacheados.');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Falha ao cachear arquivos da casca:', error);
            })
    );
});

// Evento Fetch: Serve arquivos do cache primeiro, com fallback para a rede
self.addEventListener('fetch', event => {
    // Não interceptar requisições para o proxy CORS ou para a planilha diretamente
    if (event.request.url.includes('allorigins.win') || event.request.url.includes('docs.google.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se o recurso estiver no cache, retorna ele
                if (response) {
                    return response;
                }
                // Caso contrário, busca na rede
                return fetch(event.request).then(
                    networkResponse => {
                        // Se a busca na rede for bem-sucedida, clona a resposta
                        // e armazena no cache para uso futuro.
                        if (networkResponse && networkResponse.status === 200) {
                            let responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    }
                ).catch(error => {
                    console.error("Service Worker: Erro ao buscar da rede:", error);
                    // Você pode retornar uma página offline customizada aqui se quiser
                });
            })
    );
});

// Evento Activate: Limpa caches antigos
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
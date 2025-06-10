// Service Worker - v2 - Prioridade de Rede para Dados
// Rootless Byteghost

const CACHE_NAME = 'estou-escalado-cache-v2'; // Versão do cache atualizada para forçar a atualização
const DATA_URLS = [
    'https://script.google.com/macros/s/AKfycbzQ1YcE4-1y2b_O0yA1dbPEHBM_gY2Y2D4n1c-1iRjpqN2S4No_BBL-AnmYASf6jCg/exec',
    'operadores_nomes_msg.csv'
];

// Arquivos que compõem a "casca" do app. Carregam rápido e raramente mudam.
const APP_SHELL_URLS = [
    '/',
    'index.html',
    'manifest.json',
    'favicon.png',
    'icon-192x192.png',
    'icon-512x512.png',
    'wallpaper.jpg',
    'https://i.imgur.com/5aGcTPI.png', // Logo
    'https://fonts.googleapis.com/css2?family=Cal+Sans&display=swap', // Fonte
    'https://cdn.tailwindcss.com' // Estilos
];

// Evento de Instalação: Ocorre quando o novo Service Worker é instalado.
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando nova versão...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Service Worker: Cacheando a "casca" da aplicação.');
            // Cacheia todos os arquivos da casca da aplicação.
            // Se um falhar, a instalação inteira falha.
            return cache.addAll(APP_SHELL_URLS);
        })
    );
    // Força o novo Service Worker a se tornar ativo imediatamente.
    self.skipWaiting();
});

// Evento de Ativação: Ocorre após a instalação. Limpa caches antigos.
self.addEventListener('activate', event => {
    console.log('Service Worker: Ativando nova versão e limpando caches antigos.');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Se o nome do cache não for o atual, ele é deletado.
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deletando cache obsoleto:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Garante que o Service Worker ativado controle a página imediatamente.
            return self.clients.claim();
        })
    );
});

// Evento Fetch: Intercepta todas as requisições da página.
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Verifica se a URL da requisição é uma das URLs de dados.
    const isDataUrl = DATA_URLS.some(dataUrl => url.includes(dataUrl));

    if (isDataUrl) {
        // Estratégia: REDE PRIMEIRO, para dados críticos.
        // Tenta buscar na rede. Se falhar, a requisição falha. Não usa cache.
        event.respondWith(
            fetch(event.request)
            .then(networkResponse => {
                // Se a rede responder, clona a resposta para poder guardá-la no cache
                // e ao mesmo tempo retorná-la para a página.
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            })
            .catch(error => {
                console.error('Service Worker: Falha ao buscar dados críticos da rede. A operação não usará cache.', url);
                // Lança o erro para que a aplicação saiba que a busca falhou.
                throw error;
            })
        );
    } else {
        // Estratégia: CACHE PRIMEIRO, para a "casca" da aplicação.
        // Responde rápido com o cache, e se não encontrar, busca na rede.
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                // Se houver uma resposta no cache, retorna ela.
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Se não, busca na rede.
                return fetch(event.request);
            })
        );
    }
});

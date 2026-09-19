// Service Worker di Chirone
// Scopo: rendere l'app completamente funzionante offline dopo il primo
// caricamento, senza alcuna dipendenza da server esterni.
//
// IMPORTANTE PER CHI AGGIORNA IL CONTENUTO:
// Ogni volta che index.html viene modificato, aumentare il numero di
// versione qui sotto (es. "chirone-v1" -> "chirone-v2"). Questo forza il
// service worker a scaricare di nuovo il file e a sostituire la copia
// offline salvata sul dispositivo dell'utente.
const CACHE_VERSION = "chirone-v1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
];

// Installazione: scarica e salva tutti i file necessari per l'uso offline.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Attivazione: elimina le versioni vecchie della cache, cosi' l'app non
// occupa spazio inutile sul dispositivo dopo un aggiornamento.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Strategia di risposta: prima la cache (per garantire velocita' e
// funzionamento offline), con la rete come riserva se qualcosa manca
// nella cache e come aggiornamento silenzioso in background.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Se abbiamo una copia offline, la usiamo subito (istantaneo e
      // funziona senza connessione); altrimenti aspettiamo la rete.
      return cachedResponse || networkFetch;
    })
  );
});

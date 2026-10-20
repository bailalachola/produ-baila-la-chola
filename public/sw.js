/* La Produ · service worker
 * - La app (HTML, JS, CSS, íconos) queda guardada para abrir rápido y sin señal.
 * - Los datos (Supabase) y el login (Google) NO pasan por acá: siempre van a la red.
 * Para forzar que todos bajen una versión nueva alcanza con publicar: el HTML se pide
 * primero a la red y los archivos de /assets/ tienen nombres nuevos en cada build.
 */
const CACHE = 'la-produ-v1';
const BASE = new URL('./', self.location).pathname;
const PRECACHE = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icon-192.png`, `${BASE}icon-512.png`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google: directo a la red
  if (!url.pathname.startsWith(BASE)) return;

  // Pantalla de la app: primero la red (para tener siempre la última versión), si no hay señal la guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(BASE, copia));
          return res;
        })
        .catch(() => caches.match(BASE).then((r) => r || Response.error())),
    );
    return;
  }

  // JS, CSS, fuentes e íconos: si ya los tenemos, al toque; si no, se bajan y se guardan
  if (url.pathname.startsWith(`${BASE}assets/`) || url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
  }
});

/* ---------------- avisos al celu ---------------- */

self.addEventListener('push', (event) => {
  let aviso = { titulo: 'La Produ', cuerpo: '', url: BASE, tag: 'la-produ' };
  try {
    aviso = { ...aviso, ...event.data.json() };
  } catch {
    if (event.data) aviso.cuerpo = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      tag: aviso.tag,
      icon: `${BASE}icon-192.png`,
      badge: `${BASE}icon-192.png`,
      data: { url: aviso.url },
    }),
  );
});

// tocar el aviso abre La Produ en la pantalla que corresponde
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || BASE;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => new URL(v.url).pathname.startsWith(BASE));
      if (abierta) return abierta.navigate(url).then((v) => (v || abierta).focus());
      return self.clients.openWindow(url);
    }),
  );
});

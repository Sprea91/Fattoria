/* ==========================================================================
   FATTORIA TASKS — Service Worker
   Fa due cose:
   1) tiene una copia dell'app, così si apre anche senza connessione
   2) riceve le notifiche push e le mostra sul telefono
   ========================================================================== */
'use strict';

const DEPOSITO = 'fattoria-v1';

// File dell'app da tenere sempre pronti
const ESSENZIALI = [
  './',
  './index.html',
  './manifest.json',
  './icona-192.png',
  './icona-512.png'
];

// Librerie esterne: le teniamo in copia per poter aprire l'app offline
const ESTERNE = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
];

/* ---------- installazione: scarico e metto da parte ---------- */
self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const dep = await caches.open(DEPOSITO);
    // uno per uno: se una risorsa esterna non risponde, l'installazione
    // non deve fallire tutta
    await Promise.all(ESSENZIALI.concat(ESTERNE).map(async (u) => {
      try { await dep.add(new Request(u, { cache: 'reload' })); } catch (e) {}
    }));
    await self.skipWaiting();
  })());
});

/* ---------- attivazione: butto le copie vecchie ---------- */
self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    for (const nome of await caches.keys()) if (nome !== DEPOSITO) await caches.delete(nome);
    await self.clients.claim();
  })());
});

/* ---------- richieste ----------
   L'app: prima la rete (così vedi sempre l'ultima versione), la copia solo
   se la rete manca. Le altre risorse: prima la copia, che è più veloce.
   Le chiamate a Supabase non vengono mai messe in copia: i dati devono
   essere veri, non vecchi.                                                */
self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  const eDocumento = req.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.endsWith('/');

  if (eDocumento) {
    ev.respondWith((async () => {
      try {
        const risposta = await fetch(req);
        const dep = await caches.open(DEPOSITO);
        dep.put(req, risposta.clone());
        return risposta;
      } catch (e) {
        const copia = await caches.match(req) || await caches.match('./index.html') || await caches.match('./');
        return copia || new Response(
          '<meta charset="utf-8"><body style="font-family:system-ui;padding:2rem;text-align:center">'
          + '<h1>🚜 Fattoria</h1><p>Nessuna connessione e nessuna copia salvata.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  ev.respondWith((async () => {
    const copia = await caches.match(req);
    if (copia) {
      fetch(req).then((r) => caches.open(DEPOSITO).then((d) => d.put(req, r))).catch(() => {});
      return copia;
    }
    try {
      const r = await fetch(req);
      if (r && r.status === 200) (await caches.open(DEPOSITO)).put(req, r.clone());
      return r;
    } catch (e) {
      return new Response('', { status: 504 });
    }
  })());
});

/* ---------- notifiche in arrivo ---------- */
self.addEventListener('push', (ev) => {
  let d = {};
  try { d = ev.data ? ev.data.json() : {}; }
  catch (e) { d = { titolo: '🚜 Fattoria', corpo: ev.data ? ev.data.text() : '' }; }

  const titolo = d.titolo || '🚜 Fattoria';
  const opzioni = {
    body: d.corpo || '',
    icon: './icona-192.png',
    badge: './icona-192.png',
    tag: d.etichetta || 'fattoria-giorno',
    renotify: true,
    requireInteraction: false,
    vibrate: [120, 60, 120],
    lang: 'it',
    data: { url: d.url || './' }
  };
  ev.waitUntil(self.registration.showNotification(titolo, opzioni));
});

/* ---------- tocco sulla notifica: apro l'app ---------- */
self.addEventListener('notificationclick', (ev) => {
  ev.notification.close();
  const destinazione = (ev.notification.data && ev.notification.data.url) || './';
  ev.waitUntil((async () => {
    const finestre = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const f of finestre) {
      if (f.url.startsWith(self.registration.scope) && 'focus' in f) {
        try { await f.navigate(destinazione); } catch (e) {}
        return f.focus();
      }
    }
    return self.clients.openWindow(destinazione);
  })());
});

/* ---------- prova manuale dalle impostazioni dell'app ---------- */
self.addEventListener('message', (ev) => {
  if (ev.data && ev.data.tipo === 'prova-notifica') {
    self.registration.showNotification('🚜 Fattoria — prova', {
      body: ev.data.corpo || 'Se leggi questo messaggio, le notifiche funzionano.',
      icon: './icona-192.png', badge: './icona-192.png', tag: 'prova', lang: 'it',
      vibrate: [120, 60, 120]
    });
  }
});

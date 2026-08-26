/* ==========================================================================
   FATTORIA TASKS — il banco di prova
   Esegue il JavaScript dell'app FUORI dal browser e poi ci lancia dentro
   prove-uova.js. Serve a due cose:

     1. dire subito se il file ha un errore di sintassi. Senza questo
        controllo un apostrofo di troppo si scopre solo aprendo l'app, che
        resta completamente bianca: è già successo il 25 agosto 2026;
     2. far girare le prove dei conti senza dover incollare niente nella
        console del telefono.

   Quello che il banco NON può fare è vedere: niente colori, niente tocchi,
   niente tastiera del telefono. Le prove dell'interfaccia restano a occhio,
   sull'app vera.

   ---------------------------------------------------------------------
   COME SI LANCIA (Windows, senza installare niente)

   Node non è installato sul PC, ma dentro VS Code ce n'è uno: basta
   chiedere a VS Code di comportarsi da Node con ELECTRON_RUN_AS_NODE.

   Da Git Bash, dentro la cartella del progetto:

     ELECTRON_RUN_AS_NODE=1 \
       "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" \
       prove/banco.js

   Dal Prompt dei comandi:

     set ELECTRON_RUN_AS_NODE=1
     "C:\Users\spreafico\AppData\Local\Programs\Microsoft VS Code\Code.exe" prove\banco.js

   Se un giorno Node fosse installato per davvero, funziona anche:

     node prove/banco.js

   Esce con codice 0 se è tutto a posto, 1 se qualcosa è rotto o se una
   prova fallisce: così ci si può appoggiare un controllo automatico.
   ========================================================================== */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const RADICE = path.join(__dirname, '..');

/* ---------- prendo il codice dell'app ---------- */
// L'app è un file solo: il codice sta nell'ultimo <script> senza src (gli
// altri due tirano giù Tailwind e Supabase da internet, e qui non servono).
const html = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const blocchi = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
if (!blocchi.length) {
  console.log('Non ho trovato nessuno <script> dentro index.html.');
  process.exit(1);
}
const app = blocchi[blocchi.length - 1].replace(/^<script>|<\/script>$/g, '');
const prove = fs.readFileSync(path.join(RADICE, 'prove', 'prove-uova.js'), 'utf8');

/* ---------- il guscio finto al posto del browser ---------- */
// L'app, appena caricata, cerca elementi della pagina e si iscrive agli
// eventi. Qui non c'è nessuna pagina: invece di far finta che non esista
// (e prendersi un errore alla prima riga), si risponde a tutto con un
// oggetto che accetta qualunque cosa gli si chieda e non fa niente.
const nulla = () => {};
const finto = new Proxy(function () {}, {
  get: (o, k) => (k === 'value' || k === 'textContent' || k === 'innerHTML') ? '' : finto,
  set: () => true,
  apply: () => finto,
  has: () => true
});

const documento = {
  addEventListener: nulla, removeEventListener: nulla,
  querySelector: () => finto, querySelectorAll: () => [],
  getElementById: () => finto, createElement: () => finto,
  body: finto, documentElement: finto, head: finto, hidden: false
};

const ctx = {
  document: documento, console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  addEventListener: nulla, removeEventListener: nulla, scrollTo: nulla,
  navigator: { onLine: true, serviceWorker: undefined, userAgent: 'banco' },
  location: { href: '', hostname: 'banco', reload: nulla },
  localStorage: { getItem: () => null, setItem: nulla, removeItem: nulla },
  matchMedia: () => ({ matches: false, addEventListener: nulla }),
  fetch: () => Promise.reject(new Error('il banco non va in rete')),
  supabase: { createClient: () => finto },
  alert: nulla, confirm: () => false, prompt: () => null,
  requestAnimationFrame: nulla,
  crypto: { randomUUID: () => 'banco' },
  Intl, URL,
  Blob: function () {}, FileReader: function () {}, Image: function () {}
};
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.self = ctx;
vm.createContext(ctx);

/* ---------- leggo il risultato mentre passa ---------- */
// Le prove stampano "N passati, M falliti." in fondo. Lo intercetto qui per
// poter uscire con il codice giusto, senza toccare prove-uova.js.
let falliti = null;
const stampaVera = console.log;
ctx.console = {
  ...console,
  log: (...a) => {
    const riga = a.join(' ');
    const m = riga.match(/(\d+) passati, (\d+) falliti\./);
    if (m) falliti = Number(m[2]);
    stampaVera(...a);
  }
};

// Appena caricata, l'app prova ad andare in rete e la promessa viene
// rifiutata: è previsto, non deve far cadere il banco.
process.on('unhandledRejection', () => {});

/* ---------- si esegue ---------- */
// app e prove insieme in un unico pezzo: le variabili dichiarate con let
// (uova, attivita, animali…) non finiscono nell'oggetto globale, quindi le
// prove le vedono solo se girano nello stesso identico scope.
try {
  vm.runInContext(app + '\n;\n' + prove, ctx, { filename: 'app+prove.js' });
} catch (e) {
  console.log('\nIL BANCO SI È FERMATO: ' + e.message);
  console.log((e.stack || '').split('\n').slice(0, 5).join('\n'));
  process.exit(1);
}

if (falliti === null) {
  console.log('\nLe prove non hanno stampato il totale: qualcosa non ha girato.');
  process.exit(1);
}

// L'app tiene vivi dei timer e la sincronizzazione: senza uscire a mano, il
// banco resterebbe appeso per sempre a prove finite.
process.exit(falliti === 0 ? 0 : 1);

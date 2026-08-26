# Il foglio che si accorcia sotto la tastiera — piano di realizzazione

> **Per chi lavora a questo piano:** SOTTO-SKILL RICHIESTA: usare
> `superpowers:executing-plans` (o `superpowers:subagent-driven-development`) per
> eseguirlo un compito alla volta. I passi usano le caselle `- [ ]` per tenere il segno.

**Obiettivo:** quando esce la tastiera del telefono, il foglio che sale dal basso si
accorcia e resta sopra la tastiera, invece di finirci dietro.

**Architettura:** una variabile CSS `--tastiera` dice al foglio quanto spazio si è preso
la tastiera. Su Android resta a zero perché ci pensa il sistema, grazie a una riga
aggiunta alla dichiarazione della pagina; su iPhone la riempie una misura fatta a
runtime. Il foglio non sa quale delle due strade l'ha riempita: legge solo la variabile.

**Tecnologie:** un unico file `index.html` (HTML + CSS + JavaScript senza librerie),
`visualViewport`, prove in `prove/prove-uova.js` eseguite da `prove/banco.js`.

**Progetto di riferimento:** `docs/superpowers/specs/2026-08-26-tastiera-pannello-design.md`

---

## Prima di iniziare

Valgono le stesse regole dell'altro piano di oggi:

- **le prove automatiche si lanciano da qui**, con
  `ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js`;
- **prima di ogni commit** si guarda `git status --short`: se compaiono modificate le
  icone che nessuno ha toccato, sono state marchiate dal sistema aziendale e vanno
  ripristinate con `git checkout -- icona-192.png icona-512.png`, perché il repository
  è pubblico;
- **ogni push pubblica sui telefoni**, l'app è servita da GitHub Pages dal ramo `main`.

**Una avvertenza specifica di questo lavoro:** il banco di prova **non può dire se
funziona**. Non c'è nessuna tastiera da far uscire. Il banco serve solo a garantire che
non si sia rotto niente e che la formula sia giusta. La risposta vera arriva solo dai
due telefoni, e per l'iPhone serve Anna.

---

## I file toccati

| File | Cosa ci si fa |
|---|---|
| `index.html` | la riga della dichiarazione, due proprietà CSS, la misura in JavaScript |
| `prove/prove-uova.js` | le prove della formula, in fondo alle 56 già presenti |

Punti di riferimento (i numeri di riga si spostano: cercare il testo, non fidarsi del
numero):

| Riga | Cosa c'è |
|---|---|
| 15 | il `<meta name="viewport">` |
| 249 | la regola `.pannello`, al livello base del CSS |
| 305–307 | `#pannello` e il foglio con le classi `bottom-0 max-h-[94vh]` |
| ~3080 | la zona degli ascoltatori globali, in fondo al codice |

---

## Compito 1 — Android, e il CSS che fa spazio a tutti e due

Questo compito da solo **risolve sull'Android di Stefano**. Prepara anche il terreno per
l'iPhone, senza cambiare niente finché la variabile vale zero.

**File:**
- Modifica: `index.html` — il meta, la regola `.pannello`, le classi del foglio

- [x] **Passo 1: dire al telefono cosa fare quando esce la tastiera**

Sostituire la riga 15:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5">
```

con:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5, interactive-widget=resizes-content">
```

I browser che non conoscono `interactive-widget` la ignorano senza lamentarsi.

- [x] **Passo 2: portare `bottom` e `max-height` dentro la regola `.pannello`**

Sostituire:

```css
  .pannello { animation: su .22s cubic-bezier(.2,.8,.2,1); }
```

con:

```css
  /* Il foglio che sale dal basso. bottom e max-height stanno qui, e non fra le classi
     scritte sull'elemento, perché devono poter cambiare quando esce la tastiera:
     --tastiera vale zero finché non ce n'è una. Su Android resta zero anche con la
     tastiera aperta, perché lì è il sistema a rimpicciolire la pagina. */
  .pannello {
    animation: su .22s cubic-bezier(.2,.8,.2,1);
    bottom: var(--tastiera, 0px);
    max-height: calc(94vh - var(--tastiera, 0px));
  }
```

- [x] **Passo 3: togliere dall'elemento le due classi che vincerebbero comunque**

Le classi Tailwind arrivano da internet e vengono aggiunte alla pagina a lavoro già
fatto: a parità di peso vince l'ultima scritta, quindi `bottom-0` batterebbe la regola
del passo 2. Vanno tolte.

Sostituire:

```html
  <div class="absolute inset-x-0 bottom-0 max-h-[94vh] flex flex-col pannello rounded-t-3xl overflow-hidden" style="background:var(--sabbia)">
```

con:

```html
  <div class="absolute inset-x-0 flex flex-col pannello rounded-t-3xl overflow-hidden" style="background:var(--sabbia)">
```

- [x] **Passo 4: controllare che non si sia rotto niente**

```bash
ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js
```

Atteso: `56 passati, 0 falliti.`
Il banco non vede il CSS: qui serve solo a dire che il file è ancora sano.

- [x] **Passo 5: commit e pubblicazione**

```bash
git status --short
git checkout -- icona-192.png icona-512.png   # solo se compaiono modificate
git add index.html
git commit -m "Il foglio fa spazio alla tastiera"
git push
```

- [x] **Passo 6: ⏸ SERVE STEFANO — la prova sull'Android** — **fatta il 26/08: funziona.**

1. aprire una nuova vendita e toccare il campo «A chi»
2. atteso: il pulsante **Registra** e i suggerimenti **restano visibili** sopra la
   tastiera; il modulo è più corto e si scorre
3. chiudere la tastiera: il foglio torna alto come prima, senza spazi vuoti in fondo
4. ripetere con la **ricerca** (la lente): i risultati non devono finire sotto
5. girare il telefono in orizzontale e riprovare: non deve restare una fascia vuota

Se qui va tutto bene, sull'Android il lavoro è finito. Il compito 2 riguarda l'iPhone.

---

## Compito 2 — iPhone, la misura

**Nota del 26/08:** eseguito insieme al compito 1 e pubblicato in un commit solo, per
chiedere ai telefoni una prova sola invece di due. Le due parti restano distinte:
se sbaglia Android il sospetto e la riga del compito 1, se sbaglia iPhone la misura.

Safari ignora la riga del compito 1. Qui si misura quanto spazio si è preso la tastiera
e si riempie la variabile che il foglio già legge.

**File:**
- Modifica: `index.html` — la formula vicino alle altre funzioni di conto, l'aggancio in
  fondo con gli altri ascoltatori globali
- Prove: `prove/prove-uova.js`, in fondo, **prima** della riga `} finally {`

- [x] **Passo 1: scrivere le prove, prima del codice**

La formula è staccata dal browser apposta: così si può provare da qui con dei numeri,
invece di dover avere un telefono in mano. Incollare prima di `} finally {`:

```javascript
    /* ---------- quanto spazio si prende la tastiera ---------- */
    controlla('tastiera aperta: lo spazio che manca', 320, ingombroTastiera(800, 480, 0));
    controlla('la pagina spostata entra nel conto', 300, ingombroTastiera(800, 480, 20));
    controlla('tastiera chiusa: zero', 0, ingombroTastiera(800, 800, 0));
    controlla('la barra degli indirizzi non e una tastiera', 0, ingombroTastiera(800, 740, 0));
    controlla('proprio sulla soglia conta', 100, ingombroTastiera(800, 700, 0));
    controlla('un pixel sotto la soglia non conta', 0, ingombroTastiera(800, 701, 0));
    controlla('i numeri con la virgola si arrotondano', 320, ingombroTastiera(800.4, 480.1, 0));
    controlla('mai un valore negativo', 0, ingombroTastiera(800, 900, 0));
```

- [x] **Passo 2: lanciare le prove e vederle fallire**

```bash
ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js
```

Atteso: `ingombroTastiera is not defined`, dopo che le 56 di prima sono passate.

- [x] **Passo 3: scrivere la formula**

In `index.html`, subito **prima** di `function prezzoProposto()`:

```javascript
// Sotto questa misura non è una tastiera. Su iPhone anche la barra degli indirizzi che
// compare e sparisce muove gli stessi numeri: senza una soglia, il foglio si alzerebbe e
// riabbasserebbe da solo mentre si scorre, con nessuna tastiera in giro. Le tastiere
// vere stanno sopra i 200 pixel anche col telefono coricato.
const SOGLIA_TASTIERA = 100;

// Quanto spazio si è preso la tastiera, in pixel. Sta staccata dal browser apposta:
// così si può provare con dei numeri, senza un telefono in mano.
function ingombroTastiera(altezzaPagina, altezzaVisibile, scostamento) {
  const spazio = Math.round(altezzaPagina - altezzaVisibile - (scostamento || 0));
  return spazio >= SOGLIA_TASTIERA ? spazio : 0;
}
```

- [x] **Passo 4: rilanciare le prove**

```bash
ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js
```

Atteso: `64 passati, 0 falliti.`

- [x] **Passo 5: agganciare la misura al browser**

In fondo a `index.html`, dopo l'ultimo `document.addEventListener(...)` degli ascoltatori
globali:

```javascript
/* ==========================================================================
   LA TASTIERA DEL TELEFONO
   ========================================================================== */
// Su Android basta interactive-widget=resizes-content nella dichiarazione della pagina:
// è il sistema a rimpicciolire lo spazio, e questa misura risulta zero. Safari quella
// riga la ignora, quindi sull'iPhone la misura serve davvero. Il foglio non sa chi ha
// riempito --tastiera: legge solo quella.
function seguiTastiera() {
  const vv = window.visualViewport;
  // browser vecchi, e il banco di prova: non si aggancia niente e tutto resta come prima
  if (!vv) return;
  const aggiorna = () => {
    const px = ingombroTastiera(window.innerHeight, vv.height, vv.offsetTop);
    document.documentElement.style.setProperty('--tastiera', px + 'px');
  };
  // con la tastiera aperta la pagina si può ancora spostare: senza "scroll" il foglio
  // ballerebbe mentre si scorre
  vv.addEventListener('resize', aggiorna);
  vv.addEventListener('scroll', aggiorna);
  aggiorna();
}
seguiTastiera();
```

- [x] **Passo 6: ricontrollare**

```bash
ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js
```

Atteso: `64 passati, 0 falliti.`
Nel banco `window.visualViewport` non esiste, quindi `seguiTastiera()` esce subito: è la
prova che sui browser vecchi non fa danni.

- [x] **Passo 7: commit e pubblicazione**

```bash
git status --short
git checkout -- icona-192.png icona-512.png   # solo se compaiono modificate
git add index.html prove/prove-uova.js
git commit -m "Sull'iPhone lo spazio della tastiera si misura"
git push
```

- [ ] **Passo 8: ⏸ SERVE ANNA — la prova sull'iPhone** — in programma la sera del 26/08

Le stesse cinque prove del compito 1, passo 6, ma sull'iPhone.

**Se non funziona, non improvvisare:** la seconda mossa è scritta nel progetto. Si
sostituisce `max-height: calc(94vh - var(--tastiera, 0px))` con
`max-height: calc(94dvh - var(--tastiera, 0px))`: le unità `dvh` tengono già conto della
tastiera su Safari recenti. Prima di farlo, però, chiedere ad Anna **cosa** ha visto: il
foglio non si è mosso per niente, oppure si è mosso male? Sono due guasti diversi.

---

## Compito 3 — Il giro finale, insieme all'altro lavoro di oggi

Questo compito chiude **anche** il compito 5 del piano
`2026-08-26-clienti-uova.md`: le prove sono le stesse e conviene farle in una volta.

- [ ] **Passo 1: ⏸ SERVE STEFANO — il giro completo**

1. registrare una vendita scegliendo un cliente dalle pastiglie, **guardando che la
   tastiera non copra niente**
2. cercare quel nome: compare nel gruppo 🥚 Uova col totale aggiornato
3. aprire la scheda: la vendita nuova è la prima
4. toccarla, cambiare la quantità, salvare
5. cercare di nuovo: il totale è cambiato di conseguenza

- [ ] **Passo 2: ⏸ SERVE ANNA — la prova sui due telefoni insieme**

Registrare qualcosa dai due telefoni nello stesso momento e controllare che compaia su
entrambi. Chiude anche la verifica di sincronizzazione rimasta in sospeso dal 25 agosto.

- [ ] **Passo 3: l'ultima passata delle prove**

```bash
ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js
```

Atteso: `64 passati, 0 falliti.`

---

## Cosa questo piano NON fa

- non porta in vista da solo il campo su cui si scrive (si valuta **dopo** la prova: se
  si aggiunge adesso, non si saprà mai quale dei due ha risolto)
- non tocca la disposizione dei moduli, per esempio fissando il pulsante che salva in
  fondo al foglio
- non tocca la barra di navigazione in basso

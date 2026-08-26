# I clienti delle uova — piano di realizzazione

> **Per chi lavora a questo piano:** SOTTO-SKILL RICHIESTA: usare
> `superpowers:subagent-driven-development` (consigliata) oppure
> `superpowers:executing-plans` per eseguirlo un compito alla volta. I passi usano
> le caselle `- [ ]` per tenere il segno.

**Obiettivo:** rendere utile il campo «A chi» delle vendite di uova — cercabile, con lo
storico per persona, e con i suggerimenti che impediscono ai doppioni di nascere.

**Architettura:** una funzione sola, `clientiUova()`, raggruppa le vendite per persona
applicando **una** regola di normalizzazione dei nomi. Ricerca, scheda del cliente e
suggerimenti del modulo la usano tutti e tre. Nessun meccanismo nuovo: si riusano il
pannello di `apriRiepilogoSpese()`, le pastiglie `data-imposta` e l'ascoltatore `input`
già presenti.

**Tecnologie:** un unico file `index.html` (HTML + CSS + JavaScript senza librerie),
dati su Supabase, prove in `prove/prove-uova.js` eseguite da `prove/banco.js` fuori dal
browser.

**Progetto di riferimento:** `docs/superpowers/specs/2026-08-26-ricerca-clienti-uova-design.md`

---

## Come si provano le cose in questo progetto (leggere prima di iniziare)

**Aggiornato il 26/08 durante il compito 1.** Node non risulta installato, ma dentro
VS Code ce n'è uno: chiedendo a VS Code di comportarsi da Node
(`ELECTRON_RUN_AS_NODE=1`) le prove si possono lanciare dal PC di lavoro, senza browser
e senza installare niente. Da qui il banco di prova, `prove/banco.js`.

1. **Le prove automatiche si lanciano da qui**, con il banco:

   ```bash
   ELECTRON_RUN_AS_NODE=1 \
     "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" \
     prove/banco.js
   ```

   Stampa una riga per controllo e in fondo il totale; esce con codice 1 se una prova
   fallisce o se il file ha un errore di sintassi.
2. **Le prove a occhio le fa Stefano** sull'app vera: colori, tocco, tastiera del
   telefono. Il banco non vede niente. Questi passi restano marcati
   **⏸ SERVE STEFANO**.
3. **Un errore di sintassi rende la pagina completamente bianca.** Adesso lo intercetta
   il banco, che si ferma indicando riga e messaggio. Resta buona abitudine scrivere
   **fra virgolette doppie ogni stringa che contiene un apostrofo**: è così che il 25
   agosto è finita bianca l'app.
4. **Un commit per compito**, e un push per compito: l'app sui telefoni è servita da
   GitHub Pages dal ramo `main`, quindi ogni push pubblica.

**Prima di ogni `git commit`, sempre:**

```bash
git status --short
```

Se compaiono modificati file che nessuno ha toccato — tipicamente `icona-192.png` e
`icona-512.png` — è il sistema aziendale che li ha marchiati con l'etichetta di
riservatezza Medacta. Il repository è pubblico. Vanno ripristinati **prima** di
committare:

```bash
git checkout -- icona-192.png icona-512.png
```

---

## I file toccati

| File | Cosa ci si fa |
|---|---|
| `index.html` | tutto il codice: la funzione condivisa, la ricerca, la scheda, i suggerimenti |
| `prove/prove-uova.js` | le prove automatiche della logica, in fondo ai 30 già presenti |
| `prove/banco.js` | esegue l'app e le prove fuori dal browser (aggiunto durante il compito 1) |

Nessun file nuovo, nessuna modifica al database: il campo `cliente` sulla tabella `uova`
esiste già.

Punti di riferimento in `index.html` (i numeri di riga si spostano man mano che si
lavora: cercare il nome della funzione, non fidarsi del numero):

| Riga | Cosa c'è |
|---|---|
| 446 | `pul()` — mette al sicuro il testo dentro l'HTML |
| 450 | `euro()` — formato «1.230,00 €» |
| 1518 | `apriRiepilogoSpese()` — il modello della scheda a pannello |
| 1643 | `senzaAccenti()` — minuscole e via gli accenti |
| 1646 | `cercaTutto()` — la ricerca |
| 1691 | `disegnaRisultati()` — la frase «cerco fra…» |
| 1731 | `apriTrovato()` — dove porta il tocco su un risultato |
| 1895 | `numero()` — formato «1.230» |
| 1909 | `prezzoProposto()` — il criterio «più recente» da imitare |
| 1948 | `contiUova()` — i conti del periodo |
| 2307 | `apriMovimentoUova()` — apre una vendita in correzione |
| ~2520 | il campo `#m-cliente` nel modulo vendita |
| 3117 | il gestore `data-imposta` — scrive in `mod` e ridisegna |
| 3348 | l'ascoltatore `input` — aggiorna pezzi senza ridisegnare |

---

## Compito 1 — `clientiUova()`, il pezzo condiviso

**File:**
- Modifica: `index.html`, subito dopo `prezzoProposto()` (che finisce con
  `return vendite.length ? Number(vendite[0].prezzo_unitario) : PREZZO_INIZIALE;`)
- Prove: `prove/prove-uova.js`, in fondo, **prima** della riga `} finally {`

- [x] **Passo 1: scrivere le prove, prima del codice**

In `prove/prove-uova.js`, subito prima di `} finally {`, incollare:

```javascript
    /* ---------- i clienti delle uova ---------- */
    uova = [
      { id: '1', data: '2026-06-03', tipo: 'Vendita', quantita: 150, prezzo_unitario: 0.61, cliente: 'Rossi',  creato_il: '2026-06-03T08:00:00Z' },
      { id: '2', data: '2026-07-22', tipo: 'Vendita', quantita: 36,  prezzo_unitario: 0.55, cliente: 'rossi',  creato_il: '2026-07-22T08:00:00Z' },
      { id: '3', data: '2026-08-12', tipo: 'Vendita', quantita: 30,  prezzo_unitario: 0.60, cliente: 'ROSSI ', creato_il: '2026-08-12T08:00:00Z' }
    ];
    controlla('tre grafie dello stesso nome fanno un cliente solo', 1, clientiUova().length);
    controlla('le tre vendite sommano le uova', 216, clientiUova()[0].quantita);
    controlla('incasso: somma riga per riga, non prezzo medio',
      '129.30', clientiUova()[0].incasso.toFixed(2));
    controlla("il nome mostrato e' quello dell'ultima vendita", 'ROSSI', clientiUova()[0].nome);
    controlla('le vendite del cliente sono dalla piu recente',
      ['3', '2', '1'], clientiUova()[0].vendite.map((u) => u.id));
    controlla('la prima e l ultima data del cliente',
      { prima: '2026-06-03', ultima: '2026-08-12' },
      { prima: clientiUova()[0].prima, ultima: clientiUova()[0].ultima });

    uova = [
      { id: '1', data: '2026-08-12', tipo: 'Vendita', quantita: 10, prezzo_unitario: 0.60, cliente: 'rossi', creato_il: '2026-08-12T08:00:00Z' },
      { id: '2', data: '2026-08-12', tipo: 'Vendita', quantita: 10, prezzo_unitario: 0.60, cliente: 'Rossi', creato_il: '2026-08-12T19:00:00Z' }
    ];
    controlla('stessa data: vale la grafia inserita per ultima', 'Rossi', clientiUova()[0].nome);

    uova = [
      { id: '1', data: '2026-08-01', tipo: 'Vendita', quantita: 10, prezzo_unitario: 0.60, cliente: 'Rossi',       creato_il: '2026-08-01T08:00:00Z' },
      { id: '2', data: '2026-08-02', tipo: 'Vendita', quantita: 10, prezzo_unitario: 0.60, cliente: 'Rossi Mario', creato_il: '2026-08-02T08:00:00Z' }
    ];
    controlla('Rossi e Rossi Mario restano due clienti diversi', 2, clientiUova().length);
    controlla('ordinati per ultima vendita, la piu recente per prima',
      ['Rossi Mario', 'Rossi'], clientiUova().map((c) => c.nome));

    uova = [
      { id: '1', data: '2026-08-01', tipo: 'Raccolta', quantita: 20, cliente: 'Rossi', creato_il: '2026-08-01T08:00:00Z' },
      { id: '2', data: '2026-08-02', tipo: 'Vendita',  quantita: 10, prezzo_unitario: 0.60, cliente: '',      creato_il: '2026-08-02T08:00:00Z' },
      { id: '3', data: '2026-08-03', tipo: 'Vendita',  quantita: 10, prezzo_unitario: 0.60, cliente: '   ',   creato_il: '2026-08-03T08:00:00Z' },
      { id: '4', data: '2026-08-04', tipo: 'Vendita',  quantita: 10, prezzo_unitario: 0.60, cliente: null,    creato_il: '2026-08-04T08:00:00Z' }
    ];
    controlla('raccolte e vendite senza nome restano fuori', 0, clientiUova().length);

    uova = [
      { id: '1', data: '2026-08-01', tipo: 'Vendita', quantita: 10, prezzo_unitario: null, cliente: 'Rossi', creato_il: '2026-08-01T08:00:00Z' }
    ];
    controlla('prezzo mancante: conta le uova e aggiunge zero all incasso',
      { quantita: 10, incasso: 0 },
      { quantita: clientiUova()[0].quantita, incasso: clientiUova()[0].incasso });

    uova = [];
    controlla('archivio vuoto: nessun cliente e nessun errore', 0, clientiUova().length);
```

Nota sulle stringhe: i nomi delle prove sono scritti **senza apostrofi** oppure fra
virgolette doppie. Un apostrofo dentro apici singoli rende bianca l'intera app.

- [x] **Passo 2: lanciare le prove e vederle fallire**

```bash
ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js
```

Atteso: i 30 controlli precedenti passano, poi `clientiUova is not defined`.
**È il risultato giusto**: dimostra che le prove toccano davvero la funzione nuova.

- [x] **Passo 3: scrivere la funzione**

In `index.html`, subito dopo la chiusura di `prezzoProposto()`, inserire:

```javascript
// Quando due vendite sono alla stessa persona: quando il nome coincide ignorando
// maiuscole, accenti e spazi in più. senzaAccenti() è la stessa funzione che usa la
// ricerca: una seconda regola scritta a parte prima o poi divergerebbe da questa, e i
// totali sarebbero sbagliati restando credibili, cioè invisibili.
function chiaveCliente(nome) {
  return senzaAccenti(nome).trim().replace(/\s+/g, ' ');
}

// Chi compra le uova, ricavato dalle vendite. Lo usano la ricerca, la scheda del
// cliente e i suggerimenti del campo "A chi": devono dire tutti la stessa cosa, quindi
// il conto si fa qui una volta sola.
// Restano fuori le raccolte (non hanno un compratore) e le vendite senza nome (non
// hanno niente da cercare).
function clientiUova() {
  // Stesso criterio di prezzoProposto(): prima la data, a parità di data l'ordine di
  // inserimento. Serve per sapere qual è "l'ultima" vendita.
  const piuRecentiPrima = (a, b) =>
    String(b.data).localeCompare(String(a.data))
    || String(b.creato_il || '').localeCompare(String(a.creato_il || ''));

  const per = new Map();
  uova
    .filter((u) => u.tipo === 'Vendita' && chiaveCliente(u.cliente))
    .sort(piuRecentiPrima)
    .forEach((u) => {
      const k = chiaveCliente(u.cliente);
      // Scorrendo dalla vendita più recente, la prima volta che incontro una persona
      // sto guardando la sua ultima vendita: da lì prendo la grafia da mostrare e la
      // data dell'ultima volta. Per lo stesso motivo la Map esce già ordinata come
      // serve, dal cliente più recente al più vecchio.
      if (!per.has(k)) {
        per.set(k, { chiave: k, nome: String(u.cliente).trim(),
                     quantita: 0, incasso: 0, ultima: u.data, prima: u.data, vendite: [] });
      }
      const c = per.get(k);
      const q = Number(u.quantita || 0);
      c.quantita += q;
      // riga per riga, non quantità totale × prezzo medio: il prezzo cambia nel tempo
      c.incasso += q * Number(u.prezzo_unitario || 0);
      if (u.data < c.prima) c.prima = u.data;
      c.vendite.push(u);
    });
  return [...per.values()];
}
```

- [x] **Passo 4: rilanciare le prove**

```bash
ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js
```

Atteso: `42 passati, 0 falliti.`
Se una prova fallisce, il banco stampa atteso e avuto: **non ammorbidire la prova**,
capire chi ha ragione.

Fatto il 26/08, più quattro sabotaggi (normalizzazione, incasso, ordinamento, filtro
sulle vendite): ognuno accende le prove giuste, quindi non sono verdi per caso.

- [x] **Passo 5: commit**

```bash
git status --short
git checkout -- icona-192.png icona-512.png   # solo se compaiono modificate
git add index.html prove/prove-uova.js
git commit -m "Chi compra le uova, contato in un posto solo"
```

---

## Compito 2 — Le uova nella ricerca

**File:**
- Modifica: `index.html`, dentro `cercaTutto()` e `disegnaRisultati()`

- [x] **Passo 1: aggiungere il gruppo alla ricerca**

In `cercaTutto()`, dopo il blocco `aggiungi('Contatti', …)` e **prima** della riga
`const quanti = gruppi.reduce(…)`, inserire:

```javascript
  aggiungi('Uova', '🥚', clientiUova().filter((c) => dentro(c.nome))
    .map((c) => ({ testo: c.nome,
      sotto: [numero(c.quantita) + ' uova', euro(c.incasso) || '0,00 €',
              'ultima ' + c.ultima.split('-').reverse().slice(0, 2).join('/')].join(' · '),
      apri: { tipo: 'cliente-uova', id: c.chiave } })));
```

Il tocco porta la **chiave normalizzata**, non il nome mostrato: è l'unica cosa che
resta uguale fra una grafia e l'altra.

- [x] **Passo 2: correggere la frase che elenca dove si cerca**

In `disegnaRisultati()`, sostituire la riga:

```javascript
      Scrivi qualcosa: cerco fra lavori, routine, note, spesa, animali, interventi e contatti.</p>`;
```

con:

```javascript
      Scrivi qualcosa: cerco fra lavori, routine, note, spesa, animali, interventi,
      contatti e chi compra le uova.</p>`;
```

Senza questa correzione la frase mentirebbe: elencare dove si cerca e non aggiornarlo è
peggio che non elencarlo affatto.

**Aggiunto in corsa il 26/08:** quattro prove automatiche su `cercaTutto()`, che il
piano non prevedeva perché senza banco non erano eseguibili. Verificano che il gruppo
compaia, cosa dice la riga e che il tocco porti la chiave normalizzata e non il nome
scritto. Prove totali: 46. Sabotata la chiave: accende la prova giusta e solo quella.

- [ ] **Passo 3: ⏸ SERVE STEFANO — provare a mano**

Con dei dati veri (serve almeno una vendita con un nome scritto):

1. aprire la ricerca (la lente) e scrivere le prime lettere di un cliente
2. atteso: compare il gruppo **🥚 Uova** con una riga per persona, del tipo
   `240 uova · 144,00 € · ultima 12/08`
3. scrivere il nome in MAIUSCOLO: deve trovare lo stesso
4. a ricerca vuota, la frase in mezzo allo schermo deve nominare anche le uova
5. il tocco sulla riga per ora **non fa niente**: è previsto, lo si collega nel
   compito 3

- [ ] **Passo 4: commit**

```bash
git status --short
git checkout -- icona-192.png icona-512.png   # solo se compaiono modificate
git add index.html
git commit -m "Cercando un nome si trova chi compra le uova"
```

---

## Compito 3 — La scheda del cliente

**File:**
- Modifica: `index.html` — nuova funzione dopo `apriRiepilogoSpese()`, più un ramo in
  `apriTrovato()`

- [ ] **Passo 1: scrivere la scheda**

Subito dopo la chiusura di `apriRiepilogoSpese()`, inserire:

```javascript
// La scheda di chi compra le uova: quanto ha preso in tutto e tutte le sue vendite.
// Usa il pannello che sale dal basso, lo stesso del riepilogo spese e della scheda
// animale: l'app ne ha uno solo, e questo è il motivo per cui aprendo la correzione di
// una vendita la scheda si chiude.
function apriClienteUova(chiave) {
  const c = clientiUova().find((x) => x.chiave === chiave);
  if (!c) return;
  modo = 'cliente-uova';
  $('#pannello-titolo').textContent = c.nome;

  const gg = (d) => String(d || '').split('-').reverse().slice(0, 2).join('/');
  const riga = (u) => {
    const p = Number(u.prezzo_unitario || 0);
    return `<div class="riga tocca" data-uovo="${pul(u.id)}" role="button" tabindex="0">
        <span class="text-xl shrink-0">💶</span>
        <div class="flex-1 min-w-0">
          <p class="font-black">${numero(u.quantita)} uova${p ? ' × ' + pul(euro(p)) : ''}</p>
          <p class="text-xs font-semibold" style="color:var(--inchiostro2)">${pul(etichettaData(u.data))}</p>
        </div>
        <span class="font-black tabellare shrink-0">${pul(euro(Number(u.quantita || 0) * p) || '0,00 €')}</span>
      </div>`;
  };

  $('#pannello-corpo').innerHTML = `
    <div class="scheda text-center">
      <span class="didascalia">Ha comprato in tutto</span>
      <p class="text-3xl font-black mt-1">${numero(c.quantita)} uova</p>
      <p class="text-xl font-black">${pul(euro(c.incasso) || '0,00 €')}</p>
      <p class="text-xs font-semibold mt-2" style="color:var(--inchiostro2)">
        ${c.vendite.length} ${c.vendite.length === 1 ? 'vendita' : 'vendite'} ·
        ${c.prima === c.ultima ? 'il ' + gg(c.prima) : 'dal ' + gg(c.prima) + ' al ' + gg(c.ultima)}</p>
    </div>

    <section>
      <h3 class="titolo-sez">🥚 Le sue vendite</h3>
      <div class="space-y-2.5">${c.vendite.map(riga).join('')}</div>
    </section>

    <p class="text-xs font-semibold px-1" style="color:var(--inchiostro2)">
      Toccando una vendita la puoi correggere. La scheda si chiude: l'app ha un pannello
      solo.</p>`;
  apriPannello();
}
```

Le righe usano `data-uovo`, lo stesso attributo delle righe nella sezione Uova: il
gestore dei clic (`index.html:3097`) chiama già `apriMovimentoUova()` da solo, non
serve scrivere niente per il tocco.

- [ ] **Passo 2: collegare il tocco dalla ricerca**

In `apriTrovato()`, prima della riga `if (tipo === 'contatti')`, inserire:

```javascript
  if (tipo === 'cliente-uova') { vista = 'uova'; disegna(); apriClienteUova(id); return; }
```

Il `vista = 'uova'; disegna();` non è decorativo: senza, chiudendo la correzione di una
vendita si tornerebbe nella sezione da cui è partita la ricerca — «Oggi», di solito — e
la riga corretta resterebbe evidenziata dentro una sezione nascosta.

- [ ] **Passo 3: ⏸ SERVE STEFANO — provare a mano**

1. cercare un cliente, toccare la sua riga
2. atteso: si apre la scheda col totale in alto e sotto tutte le sue vendite, dalla più
   recente, con quantità, prezzo a uovo e incasso di quella riga
3. controllare che il totale in alto corrisponda alla somma delle righe sotto
4. toccare una vendita: si apre la correzione, già compilata con quei dati
5. chiudere: si finisce nella sezione Uova (non in «Oggi»)
6. **atteso e normale:** se quella vendita è fuori dal periodo scelto, sotto non si vede
   la sua riga. Cambiare periodo in «Anno» per ritrovarla. È scritto nel progetto fra i
   prezzi accettati, non è un difetto nuovo

- [ ] **Passo 4: commit**

```bash
git status --short
git checkout -- icona-192.png icona-512.png   # solo se compaiono modificate
git add index.html
git commit -m "La scheda di chi compra: quanto ha preso e tutte le sue vendite"
```

---

## Compito 4 — I suggerimenti nel campo «A chi»

**File:**
- Modifica: `index.html` — nuova funzione dopo `clientiUova()`, il markup del modulo
  vendita, l'ascoltatore `input`
- Prove: `prove/prove-uova.js`, in fondo, prima di `} finally {`

- [ ] **Passo 1: scrivere le prove, prima del codice**

In `prove/prove-uova.js`, prima di `} finally {` (dopo le prove del compito 1),
incollare:

```javascript
    /* ---------- i suggerimenti del campo "A chi" ---------- */
    uova = [
      { id: '1', data: '2026-08-01', tipo: 'Vendita', quantita: 10, prezzo_unitario: 0.6, cliente: 'Verdi',        creato_il: '2026-08-01T08:00:00Z' },
      { id: '2', data: '2026-08-02', tipo: 'Vendita', quantita: 10, prezzo_unitario: 0.6, cliente: 'Bar Centrale', creato_il: '2026-08-02T08:00:00Z' },
      { id: '3', data: '2026-08-03', tipo: 'Vendita', quantita: 10, prezzo_unitario: 0.6, cliente: 'Bianchi',      creato_il: '2026-08-03T08:00:00Z' },
      { id: '4', data: '2026-08-04', tipo: 'Vendita', quantita: 10, prezzo_unitario: 0.6, cliente: 'Rossi',        creato_il: '2026-08-04T08:00:00Z' }
    ];
    controlla('campo vuoto: i tre clienti piu recenti',
      ['Rossi', 'Bianchi', 'Bar Centrale'], suggerimentiCliente(''));
    controlla('scrivendo, restano solo quelli che corrispondono',
      ['Bianchi'], suggerimentiCliente('bian'));
    controlla('non guarda maiuscole ne accenti',
      ['Rossi'], suggerimentiCliente('ROS'));
    controlla('cerca anche in mezzo al nome, non solo all inizio',
      ['Bar Centrale'], suggerimentiCliente('centr'));
    controlla('nessuna corrispondenza: nessun suggerimento',
      [], suggerimentiCliente('zzz'));

    uova = Array.from({ length: 9 }, (_, i) => ({
      id: String(i + 1), data: '2026-08-0' + (i + 1), tipo: 'Vendita', quantita: 10,
      prezzo_unitario: 0.6, cliente: 'Cliente ' + (i + 1),
      creato_il: '2026-08-0' + (i + 1) + 'T08:00:00Z'
    }));
    controlla('scrivendo se ne mostrano al massimo sei', 6, suggerimentiCliente('cliente').length);
    controlla('e sono i sei piu recenti, non i primi che capitano',
      ['Cliente 9', 'Cliente 8', 'Cliente 7', 'Cliente 6', 'Cliente 5', 'Cliente 4'],
      suggerimentiCliente('cliente'));
    controlla('a campo vuoto restano tre anche con nove clienti', 3, suggerimentiCliente('').length);
```

- [ ] **Passo 2: lanciare le prove e vederle fallire**

```bash
ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js
```

Atteso: `suggerimentiCliente is not defined`. I controlli del compito 1 devono passare
prima dell'errore.

- [ ] **Passo 3: scrivere la funzione**

In `index.html`, subito dopo la chiusura di `clientiUova()`:

```javascript
// I nomi da proporre sotto il campo "A chi". A campo vuoto i tre clienti più recenti;
// scrivendo, quelli che contengono il testo, al massimo sei per non allungare il
// modulo all'infinito. Il taglio è sempre sui più recenti: clientiUova() li restituisce
// già in quell'ordine, e il cliente abituale non deve restare fuori proprio mentre lo
// si sta cercando.
function suggerimentiCliente(scritto) {
  const cercato = chiaveCliente(scritto);
  const tutti = clientiUova();
  if (!cercato) return tutti.slice(0, 3).map((c) => c.nome);
  return tutti.filter((c) => c.chiave.includes(cercato)).slice(0, 6).map((c) => c.nome);
}
```

- [ ] **Passo 4: rilanciare le prove**

```bash
ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js
```

Atteso: `54 passati, 0 falliti.`

- [ ] **Passo 5: scrivere il pezzo che disegna le pastiglie**

Va scritto **prima** di toccare il modulo: se il markup chiamasse una funzione che
ancora non esiste, fra un passo e l'altro l'app resterebbe rotta.

Subito dopo `suggerimentiCliente()`:

```javascript
// Le pastiglie dei suggerimenti. data-imposta="cliente" basta a farle funzionare: il
// gestore dei clic legge i campi, scrive mod.cliente e ridisegna il modulo, lo stesso
// meccanismo del ruolo nei contatti.
function pastiglieCliente(scritto) {
  const nomi = suggerimentiCliente(scritto);
  // niente da proporre: la fila sparisce invece di lasciare uno spazio vuoto
  if (!nomi.length) return '';
  return pastiglie(nomi, scritto.trim(), 'cliente', '');
}
```

- [ ] **Passo 6: mettere le pastiglie sotto il campo**

Nel modulo vendita, sostituire il blocco del campo cliente:

```html
      <div><label class="didascalia" for="m-cliente">A chi (se vuoi)</label>
        <input id="m-cliente" type="text" class="campo mt-1.5" value="${pul(mod.cliente || '')}"
               placeholder="nome di chi compra"></div>`}
```

con:

```html
      <div><label class="didascalia" for="m-cliente">A chi (se vuoi)</label>
        <input id="m-cliente" type="text" class="campo mt-1.5" value="${pul(mod.cliente || '')}"
               placeholder="nome di chi compra" autocomplete="off">
        <div id="suggerimenti-cliente" class="flex flex-wrap gap-2 mt-1.5">${pastiglieCliente(mod.cliente || '')}</div></div>`}
```

`autocomplete="off"` serve a togliere di mezzo il completamento del browser, che
altrimenti coprirebbe le pastiglie con la sua tendina.

- [ ] **Passo 7: aggiornare le pastiglie mentre si scrive**

Nell'ascoltatore `input` (quello che comincia con
`if (ev.target.id !== 'm-quantita' && ev.target.id !== 'm-prezzo') return;`), sostituire
quella prima riga con:

```javascript
  if (ev.target.id === 'm-cliente') {
    const fila = $('#suggerimenti-cliente');
    if (fila) fila.innerHTML = pastiglieCliente(ev.target.value);
    return;
  }
  if (ev.target.id !== 'm-quantita' && ev.target.id !== 'm-prezzo') return;
```

Si riscrive **solo** la fila delle pastiglie. Chiamare `disegnaPannello()` qui
ridisegnerebbe tutto il modulo a ogni lettera: il campo perderebbe il fuoco e la
tastiera del telefono si chiuderebbe da sola.

- [ ] **Passo 8: ⏸ SERVE STEFANO — provare a mano sul telefono**

1. aprire una nuova vendita: sotto «A chi» compaiono fino a tre nomi recenti
2. toccarne uno: il nome entra nel campo scritto giusto
3. cancellare e scrivere due lettere di un cliente: la fila si restringe
4. **il controllo che conta:** mentre si scrive, la tastiera **non deve chiudersi** e il
   cursore non deve saltare
5. scrivere un nome che non esiste: la fila sparisce e si può salvare lo stesso
6. salvare, riaprire il modulo: il nome nuovo compare fra i suggerimenti

- [ ] **Passo 9: commit**

```bash
git status --short
git checkout -- icona-192.png icona-512.png   # solo se compaiono modificate
git add index.html prove/prove-uova.js
git commit -m "Il nome di chi compra si sceglie, non si riscrive"
```

---

## Compito 5 — Il giro completo e la pubblicazione

- [ ] **Passo 1: ⏸ SERVE STEFANO — il giro dall'inizio alla fine**

Sull'app vera, con i dati veri:

1. registrare una vendita nuova scegliendo un cliente dalle pastiglie
2. cercare quel nome: deve comparire nel gruppo 🥚 Uova con il totale aggiornato
3. aprire la scheda: la vendita appena fatta è la prima della lista
4. toccarla, cambiare la quantità, salvare
5. cercare di nuovo: il totale deve essere cambiato di conseguenza

- [ ] **Passo 2: ⏸ SERVE STEFANO — la prova sull'altro telefono**

Sul telefono di Anna: cercare lo stesso cliente e controllare che il totale sia lo
stesso. È anche l'occasione per chiudere la prova di sincronizzazione rimasta in sospeso
dal 25 agosto.

- [ ] **Passo 3: l'ultima passata delle prove automatiche**

```bash
ELECTRON_RUN_AS_NODE=1 "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" prove/banco.js
```

Atteso: `54 passati, 0 falliti.`

- [ ] **Passo 4: pubblicare**

```bash
git status --short
git checkout -- icona-192.png icona-512.png   # solo se compaiono modificate
git log --oneline -5
git push
```

---

## Cosa questo piano NON fa

Sono scelte del progetto, non dimenticanze:

- non si cerca fra le raccolte né fra le note dei movimenti
- non si possono unire due clienti scritti in modo diverso («Rossi» e «Rossi Mario»
  restano due)
- non c'è un filtro per cliente nella sezione Uova
- non si torna alla scheda del cliente dopo aver corretto una vendita
- la scheda del cliente mostra sempre tutte le vendite, senza periodo né tetto

# La data delle note si cambia toccandola — piano di realizzazione

> **Per chi esegue:** SKILL NECESSARIA: superpowers:subagent-driven-development (consigliata)
> oppure superpowers:executing-plans, un compito alla volta. I passi usano le caselle
> `- [ ]` per tenere il segno.

**Obiettivo:** nel Registro si tocca la data di una nota, si sceglie il giorno dal
calendario del telefono e la data è salvata subito; tutte le note mostrano solo il giorno,
senza ora.

**Come:** due funzioni pure nuove (`giornoLungo`, `mezzogiornoDi`) provate dal banco; un
`<input type="date">` trasparente sopra l'etichetta della data nell'elenco del Registro; una
funzione `cambiaDataNota` che scrive `creato_il` e annota nel diario. Nessun cambio al
database.

**Progetto:** `docs/superpowers/specs/2026-09-23-data-note-registro-design.md`

**Strumenti:** un file solo, `index.html` (JavaScript senza librerie di build, Tailwind da
CDN, Supabase). Prove con `prove/banco.js`.

---

## Come si provano le cose in questo progetto (leggere prima di iniziare)

1. **Le prove automatiche si lanciano con il banco**, da Git Bash nella cartella
   `I:\Spreafico\Altro\Personali\Fattoria`:

   ```bash
   ELECTRON_RUN_AS_NODE=1 \
     "C:/Users/spreafico/AppData/Local/Programs/Microsoft VS Code/Code.exe" \
     prove/banco.js
   ```

   Stampa una riga per controllo e in fondo il totale. Punto di partenza verificato il
   23/09: **64 passati, 0 falliti.** Esce con codice 1 se una prova fallisce o se
   `index.html` ha un errore di sintassi.
2. **Le prove a occhio le fanno Stefano (Android) e Anna (iPhone)** sull'app vera. Il banco
   non vede niente. Questi passi sono marcati **⏸ SERVE STEFANO / ⏸ SERVE ANNA**.
3. **Un errore di sintassi rende la pagina completamente bianca.** Scrivere fra virgolette
   doppie ogni stringa che contiene un apostrofo.
4. **Pubblicare = `git push`.** L'app sui telefoni è servita da GitHub Pages dal ramo
   `main` e il repository è **pubblico**: il push si fa solo nel compito finale, con l'ok
   di Stefano.

**Prima di ogni `git commit`, sempre:**

```bash
git status --short
```

Se compaiono modificati `icona-192.png` e `icona-512.png` è il sistema aziendale che li ha
marchiati con l'etichetta di riservatezza Medacta. **Non vanno committati**: si
aggiungono al commit solo i file nominati nel passo (`git add <file>`), mai `git add .`.

---

## I file toccati

| File | Cosa cambia |
|---|---|
| `index.html` vicino a riga 495 | `giornoLungo` nuova, `oraLunga` la riusa, `mezzogiornoDi` nuova |
| `index.html` riga 1427 | nota nella scheda dell'animale: solo il giorno |
| `index.html` riga 1481 | elenco del Registro: etichetta con il calendario sopra |
| `index.html` riga 1722 | ricerca: solo il giorno |
| `index.html` dopo `disegnaRegistro` (riga ~1493) | `cambiaDataNota` nuova |
| `index.html` riga 3232-3233 | il gestore dei clic ignora il campo data |
| `index.html` riga 3493-3494 | il gestore dei `change` chiama `cambiaDataNota` |
| `prove/prove-uova.js` in fondo, prima di `} finally {` | prove nuove |

I numeri di riga sono quelli del 23/09 e si spostano di qualche riga dopo il compito 1:
cercare sempre il testo citato, non la riga.

---

## Compito 1 — Il giorno senza ora, e il mezzogiorno

**File:**
- Modifica: `index.html` (funzione `oraLunga`, riga ~495)
- Prove: `prove/prove-uova.js`

- [x] **Passo 1: scrivere le prove che falliscono**

In `prove/prove-uova.js`, subito **prima** della riga `  } finally {`, dopo l'ultima prova
della tastiera (`controlla('mai un valore negativo', 0, ingombroTastiera(800, 900, 0));`),
aggiungere:

```js

    /* ---------- la data delle note: solo il giorno ---------- */
    controlla('nota di oggi: «Oggi», senza ora',
      'Oggi', giornoLungo(new Date().toISOString()));
    controlla('nota di ieri: «Ieri», senza ora',
      'Ieri', giornoLungo(mezzogiornoDi(fraGiorni(-1))));
    controlla('altra data: giorno della settimana, numero e mese',
      new Date(2026, 2, 10, 12).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }),
      giornoLungo(mezzogiornoDi('2026-03-10')));
    controlla('altra data: nessun orario dentro',
      false, giornoLungo(mezzogiornoDi('2026-03-10')).includes(':'));
    controlla('data mancante: stringa vuota', '', giornoLungo(null));
    controlla("oraLunga continua a mettere l'ora dopo il giorno",
      true, /^Oggi · \d\d:\d\d$/.test(oraLunga(new Date().toISOString())));

    /* ---------- il giorno scelto diventa mezzogiorno ---------- */
    controlla('il giorno scelto torna lo stesso giorno',
      '2026-03-10', isoDi(new Date(mezzogiornoDi('2026-03-10'))));
    controlla("il giorno del cambio d'ora non scivola",
      '2026-03-29', isoDi(new Date(mezzogiornoDi('2026-03-29'))));
    controlla('ultimo dell anno non passa all anno dopo',
      '2025-12-31', isoDi(new Date(mezzogiornoDi('2025-12-31'))));
    controlla('è proprio mezzogiorno ora locale',
      12, new Date(mezzogiornoDi('2026-03-10')).getHours());
```

- [x] **Passo 2: lanciare il banco e vederlo fallire**

Comando: quello della sezione «Come si provano».
Atteso: `IL BANCO SI È FERMATO: mezzogiornoDi is not defined` (oppure `giornoLungo is not
defined`), codice di uscita 1.

- [x] **Passo 3: scrivere le due funzioni**

In `index.html` sostituire la funzione `oraLunga` attuale:

```js
function oraLunga(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const g = isoDi(d) === OGGI ? 'Oggi' : isoDi(d) === fraGiorni(-1) ? 'Ieri'
    : d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${g} · ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
}
```

con:

```js
// Il giorno di un istante, detto come lo si direbbe: "Oggi", "Ieri", "mar 22 set".
// Le note mostrano solo questo: la loro data si può spostare, l'ora no.
function giornoLungo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return isoDi(d) === OGGI ? 'Oggi' : isoDi(d) === fraGiorni(-1) ? 'Ieri'
    : d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}
function oraLunga(ts) {
  if (!ts) return '';
  return `${giornoLungo(ts)} · ${new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
}
// "2026-03-10" -> l'istante di mezzogiorno, ora locale, di quel giorno. A mezzogiorno
// nessun fuso orario e nessun cambio d'ora può far scivolare la data di un giorno.
function mezzogiornoDi(giorno) {
  const [a, m, g] = giorno.split('-').map(Number);
  return new Date(a, m - 1, g, 12).toISOString();
}
```

- [x] **Passo 4: lanciare il banco e vederlo passare**

Atteso: **74 passati, 0 falliti.**, codice di uscita 0.

- [x] **Passo 5: commit**

```bash
git status --short
git add index.html prove/prove-uova.js
git commit -m "Il giorno di una nota, senza l'ora"
```

---

## Compito 2 — Le note mostrano solo il giorno

**File:** modifica `index.html` in tre punti.

- [x] **Passo 1: scheda dell'animale**

Nella scheda dell'animale (sezione `📓 Note su ${pul(a.nome)}`, riga ~1427) sostituire:

```js
              <span class="etichetta shrink-0">${pul(oraLunga(t.creato_il))}</span>
```

con:

```js
              <span class="etichetta shrink-0">${pul(giornoLungo(t.creato_il))}</span>
```

Attenzione: la stessa riga esatta esiste anche in `disegnaRegistro` (riga ~1481, con 10
spazi di rientro invece di 14). Quella si cambia nel compito 3, non qui: usare un pezzo di
testo che comprenda la riga `<h4 class="flex-1 font-bold leading-tight">` subito sopra per
essere sicuri di prendere quella giusta.

- [x] **Passo 2: ricerca**

In `aggiungi('Note del registro', …)` (riga ~1722) sostituire:

```js
    .map((t) => ({ testo: t.titolo, sotto: [oraLunga(t.creato_il), nomeAnimale(t.animale_id)].filter(Boolean).join(' · '),
```

con:

```js
    .map((t) => ({ testo: t.titolo, sotto: [giornoLungo(t.creato_il), nomeAnimale(t.animale_id)].filter(Boolean).join(' · '),
```

- [x] **Passo 3: banco**

Atteso: **74 passati, 0 falliti.** (nessuna prova nuova: serve a escludere errori di
sintassi).

- [x] **Passo 4: commit**

```bash
git status --short
git add index.html
git commit -m "Le note nella scheda dell'animale e nella ricerca mostrano solo il giorno"
```

---

## Compito 3 — La data si tocca e si cambia

**File:** modifica `index.html` in quattro punti.

- [x] **Passo 1: l'etichetta con il calendario sopra**

In `disegnaRegistro()` sostituire:

```js
          <h3 class="flex-1 font-black text-base leading-tight">${pul(t.titolo)}</h3>
          <span class="etichetta shrink-0">${pul(oraLunga(t.creato_il))}</span>
```

con:

```js
          <h3 class="flex-1 font-black text-base leading-tight">${pul(t.titolo)}</h3>
          <span class="etichetta shrink-0" style="position:relative">📅 ${pul(giornoLungo(t.creato_il))}
            <input type="date" data-sposta-nota="${t.id}" aria-label="Cambia la data della nota"
                   value="${t.creato_il ? isoDi(new Date(t.creato_il)) : ''}"
                   style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:0;padding:0">
          </span>
```

Perché così:
- il campo data vero, trasparente, copre tutta l'etichetta: il dito tocca lui e il telefono
  apre il suo calendario (Android e iPhone), senza bisogno di `showPicker()`;
- `position:relative` scritto nello `style` e non con la classe Tailwind `relative`:
  Tailwind arriva da internet e genera le regole a runtime (lezione del 26/08);
- uno `<span>`, **non** un `<label>`: un label rimanda il clic al campo e ne genera un
  secondo che partirebbe dal label, cioè dalla scheda, e aprirebbe la nota;
- il 📅 fa capire che la data si può toccare.

- [x] **Passo 2: la funzione che salva**

Subito **dopo** la chiusura di `disegnaRegistro()` (la riga `}` che segue
`  $('#corpo-registro').innerHTML = h;`) aggiungere:

```js

// Nel Registro la data di una nota si sposta toccandola: il giorno scelto nel
// calendario diventa il suo creato_il, a mezzogiorno. Il momento in cui la nota
// è stata scritta davvero resta nel diario.
async function cambiaDataNota(id, giorno) {
  const t = attivita.find((x) => x.id === id);
  if (!t || !giorno || (t.creato_il && giorno === isoDi(new Date(t.creato_il)))) return;
  try {
    metti('attivita', await archivio.modifica('attivita', id, { creato_il: mezzogiornoDi(giorno) }));
    annota('Modificato', 'Nota', t.titolo, 'data spostata al ' + giorno.split('-').reverse().join('/'), id);
    disegna(); avvisa('Data cambiata');
  } catch (e) { disegna(); avvisa('Non salvato: ' + (e.message || e), true); }
}
```

- [x] **Passo 3: il clic sul campo data non apre la nota**

Nel gestore dei clic (`document.addEventListener('click', (ev) => {`, riga ~3232) aggiungere
una riga **prima** di `const el = ev.target.closest(...)`:

```js
document.addEventListener('click', (ev) => {
  if (ev.target.closest('[data-sposta-nota]')) return;   // il calendario della data, non la nota
  const el = ev.target.closest('[data-azione],[data-vista],[data-apri],...
```

(solo la riga nuova va aggiunta; le altre due sono lì per dire dove.)

Il `return` non blocca il calendario: quello lo apre il browser da sé, il gestore evita
soltanto che il tocco arrivi anche al `data-apri` della scheda.

- [x] **Passo 4: il giorno scelto arriva alla funzione**

Nel gestore dei `change` (`document.addEventListener('change', (e) => {`, riga ~3493)
aggiungere come **prima** riga dentro la funzione:

```js
document.addEventListener('change', (e) => {
  if (e.target.dataset && e.target.dataset.spostaNota) { cambiaDataNota(e.target.dataset.spostaNota, e.target.value); return; }
  if (e.target.id === 'm-scadenza') { mod.scadenza = e.target.value; disegnaPannello(); }
```

- [x] **Passo 5: banco**

Atteso: **74 passati, 0 falliti.**, codice 0.

- [x] **Passo 6: controllo a occhio dal PC**

Aprire `index.html` nel browser del PC (doppio clic sul file). Non è verificato che da file
l'app si apra e si possa entrare: se ci riesce, andare in Registro, creare una nota di prova,
toccare la sua data: deve aprirsi il calendario **e non** il modulo della nota. Scegliere
ieri: messaggio «Data cambiata», etichetta «📅 Ieri». Eliminare poi la nota di prova. Se
dal PC l'app non si apre, saltare questo passo: lo copre il compito 4.

- [x] **Passo 7: commit**

```bash
git status --short
git add index.html
git commit -m "Nel Registro la data di una nota si cambia toccandola"
```

---

## Compito 4 — Il giro sui telefoni e la pubblicazione

- [ ] **Passo 1: ⏸ SERVE STEFANO — chiedere l'ok per pubblicare**

Il repository è pubblico e il push pubblica subito sui telefoni. Senza ok esplicito, non
si fa.

- [ ] **Passo 2: pubblicare**

```bash
git status --short
git push
```

- [ ] **Passo 3: ⏸ SERVE STEFANO — la prova su Android**

Aprire l'app (ricaricarla se era già aperta), andare in Registro:
- tocco sulla data di una nota → si apre il calendario, **non** la nota;
- scelgo ieri → «Data cambiata», la nota scende al posto giusto, l'etichetta dice «📅 Ieri»;
- tocco sul titolo della stessa nota → si apre il modulo come prima;
- in Attività c'è «Modificato · Nota · … · data spostata al …»;
- se la nota è di un animale: nella sua scheda mostra la nuova data, senza ora;
- rimettere la data giusta alla nota usata per la prova.

- [ ] **Passo 4: ⏸ SERVE ANNA — la stessa prova su iPhone**

È l'unica che dice se il campo trasparente apre il calendario anche su Safari.

**Se su iPhone il calendario non si apre:** la seconda mossa è già decisa. Nel gestore dei
clic, invece di `return`, chiamare `ev.target.closest('[data-sposta-nota]').showPicker?.()`
prima del `return` (Safari 16+). Non è la prima scelta perché su Android non serve.

---

## Cosa questo piano NON fa

- Cambiare la data dal modulo della nota o dalla scheda dell'animale.
- Scegliere l'ora.
- Toccare il database, il service worker o la stampa del registro sanitario (che mostra
  già solo il giorno).

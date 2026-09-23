# La data delle note si cambia toccandola

**Data:** 23 settembre 2026
**Stato:** progetto approvato, da realizzare

---

## Il problema

Una nota del Registro prende come data il momento in cui viene scritta (`creato_il`,
messo dall'app al salvataggio) e non c'è modo di cambiarla. Se una cosa è successa ieri
e la annoto oggi, nel Registro resta con la data di oggi.

## Cosa costruiamo

### 1. Nell'elenco del Registro la data è toccabile

Sulla scheda di ogni nota, in `disegnaRegistro()`, l'etichetta con la data diventa un
pulsante:

- **tocco sulla data** → si apre il calendario del telefono → scelgo il giorno → la
  data è **salvata subito**, senza passare dal modulo e senza premere Salva. Messaggio:
  «Data cambiata».
- **tocco sul resto della scheda** → la nota si apre come oggi.
- **qualsiasi giorno** è ammesso, anche nel futuro.
- Una nota **nuova** continua a nascere con la data di adesso; se serve, la si sposta
  poi dall'elenco.

Solo nell'elenco del Registro. La scheda dell'animale e il modulo della nota **non**
cambiano.

### 2. Le note mostrano solo il giorno

Tutte le note, anche quelle già scritte, mostrano «Oggi», «Ieri» o «mar 22 set»
**senza l'orario**. Vale nei tre punti dove oggi le note mostrano `oraLunga(creato_il)`:

- elenco del Registro (`disegnaRegistro`);
- note nella scheda dell'animale;
- risultati della ricerca («Note del registro»).

Serve una funzione nuova, `giornoLungo(ts)`: la stessa di `oraLunga` senza la parte
dell'ora. `oraLunga` resta com'è per tutto il resto dell'app. La stampa del registro
sanitario mostra già solo il giorno e non si tocca.

### 3. Resta traccia nell'Attività

Ogni cambio di data si annota nel diario come le altre modifiche:
`annota('Modificato', 'Nota', titolo, 'data spostata al GG/MM/AAAA', id)`.

## Come funziona

### Il calendario

Sopra l'etichetta c'è un `<input type="date">` **trasparente** che la copre tutta
(etichetta in `position: relative`, campo in `position: absolute; inset: 0; opacity: 0`).
Il dito tocca il campo vero, e il telefono apre il suo calendario. È il sistema che
funziona sia su Chrome Android sia su Safari iPhone, senza dipendere da `showPicker()`.

Il campo parte con il giorno attuale della nota (`isoDi(new Date(creato_il))`, giorno
locale, non UTC).

### Il tocco non deve aprire la nota

La scheda ha `data-apri`, e il gestore unico dei clic (`document.addEventListener('click'…)`)
cerca il `data-apri` più vicino: toccando il campo data aprirebbe anche la nota. Il
gestore deve **ignorare i clic che partono dal campo data** della nota, prima di tutto
il resto.

### Il salvataggio

Al `change` del campo:

1. se il valore è vuoto o uguale al giorno attuale, non si fa niente;
2. il giorno scelto diventa **mezzogiorno ora locale** di quel giorno
   (`new Date(a, m − 1, g, 12).toISOString()`): così nessun fuso orario lo può far
   scivolare al giorno prima o dopo;
3. `archivio.modifica('attivita', id, { creato_il })`, poi `metti('attivita', …)`,
   `annota(...)`, `disegna()`, `avvisa('Data cambiata')`.

L'elenco si riordina da solo: `leNote()` ordina già per `creato_il`.

**Nessuna modifica al database.** `creato_il` non ha trigger, e i permessi di
modifica (`schema-chiudi-permessi.sql`) valgono per tutta la riga.

### Se il salvataggio non riesce

Si comporta come le altre modifiche dell'app: `archivio.modifica` lancia un errore, lo
si cattura con `try/catch` e si mostra `avvisa('Non salvato: ' + (e.message || e), true)`
(stesso messaggio di `index.html:2285`). Poi si chiama `disegna()`: i dati non sono
cambiati, quindi l'elenco torna a mostrare la data di prima.

## Cosa si perde, ed è accettato

`creato_il` delle note smette di voler dire «quando l'ho scritta» e diventa «quando è
successo». Il momento vero della scrittura resta nel diario (Attività), riga «Aggiunto ·
Nota».

## Come si prova

**Prove automatiche** (il banco `prove/banco.js`):

- `giornoLungo`: oggi → «Oggi», ieri → «Ieri», un'altra data → giorno della settimana,
  numero e mese, **nessun orario**; valore vuoto → stringa vuota;
- il calcolo del mezzogiorno: un giorno scelto, riportato con `isoDi(new Date(...))`,
  torna lo stesso giorno;
- il banco deve continuare a dire 0 falliti.

**Prove a mano sul telefono** (Stefano su Android, Anna su iPhone):

- toccare la data di una nota → si apre il calendario, non la nota;
- scegliere ieri → messaggio «Data cambiata», la nota scende al posto giusto, la data
  mostra «Ieri»;
- toccare il titolo della stessa nota → si apre il modulo come prima;
- nell'Attività compare «data spostata al …»;
- nella scheda dell'animale la nota mostra la nuova data, senza ora.

## Fuori ambito, di proposito

- Cambiare la data dal modulo della nota o dalla scheda dell'animale.
- Scegliere l'ora.
- Una colonna separata per la data (valutata e scartata: servirebbe un SQL e più punti
  da toccare, per un'informazione che il diario conserva già).

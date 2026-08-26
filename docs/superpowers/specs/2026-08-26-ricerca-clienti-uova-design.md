# I clienti delle uova: cercarli, vederne lo storico, riscriverli senza sbagliare

**Data:** 26 agosto 2026
**Stato:** progetto approvato, da realizzare

---

## Il problema

Il registro delle uova sa già chi ha comprato: il campo «A chi» esiste, si compila e
compare nell'elenco dei movimenti. Ma quel dato, una volta scritto, non serve a niente.

Due buchi concreti:

1. **La ricerca non lo vede.** `cercaTutto()` copre lavori, routine, note, spesa,
   animali, interventi e contatti. Le uova no. Cercare «Rossi» non trova le sue vendite.
2. **Il nome va riscritto ogni volta.** Il prezzo viene proposto (`prezzoProposto()`),
   il cliente no: il campo riparte sempre vuoto. Su un telefono, riscrivere un nome col
   dito significa prima o poi scriverlo in due modi diversi — e da lì i conti si spezzano
   senza che nessuno se ne accorga.

La domanda a cui l'app oggi non sa rispondere è la più semplice di tutte:
**«quanto ha comprato Rossi?»**

---

## Cosa costruiamo

Tre cose che poggiano tutte sullo stesso pezzo di codice.

### 1. `clientiUova()` — il pezzo condiviso

Una funzione che passa in rassegna le vendite e restituisce l'elenco delle persone.
Per ognuna: nome, uova totali, incasso totale, data dell'ultima volta, e le sue vendite
ordinate dalla più recente.

**Chi entra:** solo le righe con `tipo === 'Vendita'` e un `cliente` non vuoto.
Le raccolte non hanno un compratore; le vendite senza nome non hanno niente da cercare.

**Quando due vendite sono alla stessa persona:** quando il nome coincide ignorando
maiuscole, accenti e spazi in più. La chiave si ricava con `senzaAccenti()`
(`index.html:1643`, già in uso per la ricerca) più la riduzione degli spazi:

```
chiave = senzaAccenti(cliente).trim().replace(/\s+/g, ' ')
```

Riusare `senzaAccenti()` non è un risparmio di righe: è la garanzia che i totali e la
ricerca applichino **la stessa** regola. Una seconda regola scritta a parte prima o poi
diverge da questa, e il difetto che ne esce è invisibile (i numeri restano plausibili).

**Come si scrive il nome in elenco:** la grafia usata nell'**ultima** vendita, con lo
stesso criterio di ordinamento di `prezzoProposto()` — prima `data`, a parità
`creato_il`. Se scrivi «rossi» oggi e ieri avevi scritto «Rossi», vedrai «rossi»:
l'ultima parola è tua.

**Ordinamento dell'elenco:** per data dell'ultima vendita, dalla più recente. Vale sia
per i risultati della ricerca sia per i suggerimenti.

**Restano separati** «Rossi» e «Rossi Mario». Per il computer sono due nomi diversi, e
unirli per somiglianza è pericoloso: potrebbe fondere due clienti veri in uno.

### 2. Le uova nella ricerca

Un gruppo nuovo 🥚 **Uova** in `cercaTutto()`, in fondo agli altri, che cerca **solo fra
i nomi dei clienti**. Una riga per persona, non una per vendita:

```
Rossi
240 uova · 144,00 € · ultima il 12/08
```

Il filtro usa la funzione `dentro()` già presente nella ricerca, applicata al nome.

Va corretta anche la frase che compare a ricerca vuota, in `disegnaRisultati()`, che
oggi elenca dove si cerca: senza le uova, quella frase mente.

Il collegamento del tocco passa da `apri: { tipo: 'cliente-uova', id: <chiave> }`, e
`apriTrovato()` guadagna il ramo corrispondente. Si usa la **chiave normalizzata**, non
il nome visualizzato: è l'unica cosa stabile fra una grafia e l'altra.

Il ramo nuovo porta prima alla sezione Uova e poi apre la scheda:

```
vista = 'uova'; disegna(); apriClienteUova(chiave);
```

come già fanno i rami `animale` e `intervento` con la sezione Animali. Senza il cambio
di vista, chiudendo il pannello ci si ritroverebbe nella sezione da cui è partita la
ricerca — «Oggi», di solito — e la riga della vendita appena corretta resterebbe
evidenziata in una sezione nascosta.

### 3. La scheda del cliente

Il tocco apre il pannello che sale dal basso — lo stesso di `apriRiepilogoSpese()` e
`apriAnimale()`: `modo`, `#pannello-titolo`, `#pannello-corpo`, `apriPannello()`.
Nessun meccanismo nuovo.

Dentro: il totale in grande, poi tutte le vendite.

```
┌─ Rossi ───────────────────────────┐
│  240 uova            144,00 €     │
│  4 vendite · dal 03/06 al 12/08   │
└───────────────────────────────────┘

  12/08    30 uova × 0,60 €    18,00 €
  05/08    24 uova × 0,60 €    14,40 €
  22/07    36 uova × 0,55 €    19,80 €
  03/06   150 uova × 0,61 €    91,80 €
```

Il prezzo unitario riga per riga è voluto: è lì che si vede se a qualcuno si sta facendo
un prezzo diverso, o come è cambiato nel tempo.

**Le righe sono toccabili** e aprono la correzione, riusando `apriMovimentoUova(id)`.

Due prezzi accettati e messi in conto, non scoperti dopo:

- L'app ha **un pannello solo**, quindi la scheda del cliente si chiude per far posto al
  modulo. Chiudendo il modulo si resta nella sezione Uova, non nella scheda di Rossi. Se
  all'uso desse fastidio, si costruirà un ritorno; adesso no.
- Nella sezione Uova la riga corretta si vede solo se rientra nel **periodo
  selezionato** (`periodoUova`). Dalla scheda di un cliente si arriva spesso a vendite
  di mesi fa: con il periodo su «Oggi», chiuso il modulo, sotto non c'è la riga. Non è
  un guasto nuovo — succede già oggi aprendo un movimento — ma qui capiterà molto più
  spesso, e va saputo prima di scambiarlo per un difetto.

### 4. I suggerimenti nel campo «A chi»

Sotto il campo `#m-cliente`, una fila di pastiglie:

- **campo vuoto** → i 3 clienti più recenti;
- **mentre si scrive** → quelli che contengono il testo digitato (stessa normalizzazione),
  fino a un massimo di 6, per non allungare il modulo all'infinito;
- **nessuna corrispondenza** → la fila sparisce, e si scrive il nome nuovo a mano.

**Il tocco non richiede codice nuovo.** Le pastiglie si generano con `pastiglie()`, che
produce `data-imposta="cliente" data-valore="<nome>"`; il gestore già esistente
(`index.html:3117`) fa `leggiCampi()`, scrive `mod.cliente` e ridisegna il pannello.
Lo stesso meccanismo del ruolo nei contatti.

**L'aggiornamento mentre si scrive tocca solo la fila delle pastiglie**, non tutto il
modulo. Ridisegnare il pannello a ogni lettera farebbe perdere il fuoco al campo e
chiuderebbe la tastiera del telefono. Si estende l'ascoltatore `input` già presente
(`index.html:3348`, quello che aggiorna l'incasso e l'avviso scorte) aggiungendo il caso
`m-cliente`, che riscrive il solo contenitore dei suggerimenti.

---

## Come si prova

I controlli vanno in `prove/prove-uova.js`, accanto ai 30 già presenti sui conti, con lo
stesso schema: dati veri messi da parte, dati finti al loro posto, ripristino in
`finally`.

Cosa deve essere coperto:

- «Rossi», «rossi» e «ROSSI » finiscono in una riga sola, e i totali sommano tutte e tre
- «Rossi» e «Rossi Mario» restano due righe
- le raccolte non compaiono
- le vendite senza nome non compaiono
- il nome mostrato è quello dell'ultima vendita per data, e a parità di data quello
  inserito per ultimo
- uova totali e incasso tornano (incasso = somma di quantità × prezzo, riga per riga:
  un prezzo medio darebbe un numero diverso quando il prezzo cambia)
- l'elenco è ordinato per ultima vendita, dalla più recente
- una vendita con prezzo mancante conta le uova ma aggiunge zero all'incasso
- il filtro dei suggerimenti pesca ignorando maiuscole e accenti, e rispetta i tetti
  (3 a campo vuoto, 6 mentre si scrive)

**Le prove le lancia Stefano** dalla console del telefono o del PC di casa: dal PC di
lavoro la policy aziendale blocca il browser, quindi da qui i controlli non si possono
eseguire.

---

## Fuori ambito, di proposito

- **Cercare fra le raccolte o fra le note dei movimenti.** Il gruppo Uova della ricerca
  guarda solo i nomi dei clienti. Cercare una parola scritta nelle note di una raccolta
  non troverà niente.
- **Unire o rinominare i clienti.** Se «Rossi» e «Rossi Mario» sono la stessa persona,
  restano due righe. Serve un comando apposta, e non sappiamo ancora se servirà davvero.
- **Un filtro per cliente nella sezione Uova.** La scheda risponde già alla domanda.
- **Trasformare i clienti in una tabella vera.** Valutato e scartato: costringerebbe a
  ricollegare a mano le vendite già registrate, in cambio di una precisione che i
  suggerimenti ottengono quasi tutta impedendo i doppioni alla nascita.

---

## Rischi noti

- **Il tetto ai suggerimenti nasconde.** Con più di 6 corrispondenze alcune non si
  vedono. È accettabile: scrivendo una lettera in più la lista si stringe. Ma il tetto
  deve valere sui **più recenti**, non sui primi che càpitano, altrimenti il cliente
  abituale può restare fuori proprio mentre lo si cerca.
- **La scheda cliente non ha un periodo.** Mostra tutte le vendite di sempre. Fra due
  anni potrebbe essere un elenco lungo. Non lo limitiamo adesso: con pochi mesi di dati
  un tetto sarebbe una complicazione a vuoto, e il problema è lo stesso già annotato per
  l'elenco dei movimenti.
- **Ogni salvataggio in `I:\Spreafico\Altro\Personali` può prendersi l'etichetta di
  riservatezza aziendale.** Il 26/08 le due icone erano di nuovo marchiate e sono state
  ripristinate prima di toccare qualsiasi cosa. Prima di ogni commit va guardato
  `git status`: se compaiono file che nessuno ha modificato, vanno ripristinati. Il
  repository è pubblico.

# Il foglio si accorcia quando esce la tastiera

**Data:** 26 agosto 2026
**Stato:** progetto approvato, da realizzare
**Mockup approvato:** https://claude.ai/code/artifact/e392d382-b29d-4600-b68c-149578eaf214

---

## Il problema

Segnalato da Stefano provando i suggerimenti dei clienti: scrivendo in un campo, la
tastiera del telefono copre **tutto quello che sta sotto il campo**, e per arrivarci
bisogna risalire il modulo col dito.

Non riguarda solo la vendita delle uova. Il foglio che sale dal basso è lo stesso per
tutti i moduli e per la ricerca (30 campi di testo nell'app), quindi il fastidio è
dappertutto: nella ricerca sono i risultati, nei moduli sono i campi in fondo e il
pulsante che salva.

## Perché succede

Due cose che si sommano.

La pagina dichiara al telefono
`width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5`, e **non dice
niente su cosa fare quando esce la tastiera**. Il comportamento predefinito su Chrome
Android è `resizes-visual`: la tastiera si sovrappone, e per la pagina è come se lo
schermo fosse rimasto alto uguale.

Il foglio è agganciato al bordo basso (`#pannello` è `fixed inset-0`, dentro c'è un
`absolute inset-x-0 bottom-0 max-h-[94vh]`). Se per la pagina lo schermo non si è
accorciato, il fondo del foglio resta dov'era: sotto la tastiera.

## Cosa costruiamo

Due meccanismi, uno per famiglia di telefoni. Stefano ha un Android, Anna un iPhone.

### 1. La riga per Android

Al `<meta name="viewport">` si aggiunge `interactive-widget=resizes-content`. Da lì in
poi è il sistema a rimpicciolire la pagina quando esce la tastiera: il foglio, essendo
agganciato al fondo, si sistema da solo. Nessun codice, nessuna misura.

Vale da Chrome 108 (fine 2022). Sui browser che non la conoscono viene ignorata senza
errori.

### 2. La misura per iPhone

Safari ignora quella riga. Lì si misura quanto spazio si è preso la tastiera:

```
ingombro = window.innerHeight − visualViewport.height − visualViewport.offsetTop
```

Il valore finisce in una variabile CSS `--tastiera` sull'elemento radice, e il foglio la
usa in due punti:

```css
.pannello {
  bottom: var(--tastiera, 0px);
  max-height: calc(94vh - var(--tastiera, 0px));
}
```

`offsetTop` entra nel conto perché su iPhone, con la tastiera aperta, la pagina si può
ancora spostare: senza, il foglio ballerebbe.

**Le due strade non si sommano.** Dove funziona la prima, la pagina si è già
rimpicciolita, quindi `innerHeight` e `visualViewport.height` coincidono e l'ingombro
misurato è zero. Non c'è doppio conteggio.

### La soglia

Ingombri sotto i **100 pixel** si trattano come zero. Non è una precauzione teorica: su
iPhone la barra degli indirizzi che compare e sparisce cambia gli stessi numeri, e senza
soglia il foglio si alzerebbe e riabbasserebbe mentre si scorre, senza nessuna tastiera
in giro. Le tastiere vere stanno sopra i 200 pixel anche in orizzontale.

### Dove si aggancia

Alle variazioni di `visualViewport` (`resize` e `scroll`). Se `window.visualViewport` non
esiste — browser vecchi, o il banco di prova — non si aggancia niente e la variabile
resta a zero: la pagina si comporta esattamente come oggi.

### Una modifica di contorno, necessaria

Le due proprietà da cambiare (`bottom` e `max-height`) oggi arrivano dalle classi
Tailwind `bottom-0` e `max-h-[94vh]` scritte sull'elemento. Tailwind viene caricato da
internet e genera le sue regole a runtime, quindi non è detto che il CSS della pagina
riesca a scavalcarle. Le due classi vanno **tolte dall'elemento** e le proprietà scritte
nella regola `.pannello`, che già esiste. È l'unico modo per essere sicuri di chi vince.

## Come si prova

**Nessuna di queste cose si può provare da qui.** Il banco di prova non serve: non c'è
nessuna tastiera da far uscire, e le prove automatiche non toccano il CSS. La verifica è
tutta sui telefoni:

- **Stefano, Android:** apre una vendita, tocca «A chi». Il pulsante Registra e i
  suggerimenti devono restare visibili. Poi la stessa cosa nella ricerca.
- **Anna, iPhone:** identico. È l'unica prova che dice se la misura funziona.
- **Da controllare in tutti e due:** chiusa la tastiera il foglio deve tornare come
  prima, e ruotando il telefono non deve restare uno spazio vuoto in fondo.

## Se sull'iPhone non funziona

La seconda mossa è già decisa, così non si improvvisa: si dichiara l'altezza del foglio
in `dvh` invece che in `vh` (`max-height: 94dvh`). Le unità `dvh` tengono già conto
della tastiera su Safari recenti, e non richiedono nessuna misura. Non è la prima scelta
perché cambia il comportamento anche dove oggi va bene, ma è la rete.

## Fuori ambito, di proposito

- **Portare in vista il campo su cui si scrive.** Con il foglio accorciato dovrebbe non
  servire. Se dopo la prova serve ancora, si aggiunge allora: aggiungerlo adesso vuol
  dire non sapere mai quale dei due ha risolto.
- **Cambiare la disposizione dei moduli** (per esempio il pulsante che salva fissato in
  fondo al foglio). È una strada diversa, tocca ogni modulo, e va valutata solo se la
  correzione dello spazio non basta.
- **La barra di navigazione in basso.** Resta com'è: quando il pannello è aperto sta
  dietro, e chiuso il pannello non c'è nessuna tastiera.

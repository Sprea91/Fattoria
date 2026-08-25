# Registro uova e vendite

Data: 2026-08-25
Stato: approvato, da realizzare

## Perché

L'app registra tutto quello che esce (acquisto degli animali, costi del
veterinario) e niente di quello che entra. Della raccolta delle uova resta solo
una spunta nelle routine del mattino: non si sa quante ne facciano le galline né
quanto abbiano reso.

La bozza del progetto stima 9.000 uova all'anno, 5.400 euro di ricavo lordo e
circa 4.260 euro netti. Senza registrare nulla non c'è modo di sapere se i
numeri veri assomigliano a quelli previsti.

## Cosa si costruisce

Una sezione nuova, **Uova**, sesta voce della barra in basso, che serve a:

1. segnare quante uova sono state raccolte in un giorno;
2. segnare una vendita, con quante uova e a che prezzo;
3. vedere, su un periodo a scelta, quanto è stato prodotto, venduto e incassato,
   e come si confronta con le spese già registrate nell'app.

## Struttura dei dati

Una tabella sola, `public.uova`, sullo stampo delle esistenti (uuid come chiave,
`creato_il` con l'ora di inserimento, indice sul campo su cui si filtra).

| Campo             | Tipo           | Note                                    |
|-------------------|----------------|-----------------------------------------|
| `id`              | uuid           | chiave, `gen_random_uuid()`             |
| `data`            | date           | giorno del movimento, default oggi      |
| `tipo`            | text           | `Raccolta` \| `Vendita`, default Raccolta |
| `quantita`        | int            | obbligatorio, maggiore di zero          |
| `prezzo_unitario` | numeric(6,2)   | solo per le vendite                     |
| `cliente`         | text           | solo per le vendite, facoltativo        |
| `note`            | text           | libero                                  |
| `creato_il`       | timestamptz    | default `now()`                         |

Indice su `(data desc)`: tutte le viste ordinano e filtrano per data.

L'incasso non è una colonna: si ricava da `quantita * prezzo_unitario`. Salvare
un totale che si può ricalcolare significa rischiare che un giorno non torni.

### Perché una tabella sola

Raccolte e vendite stanno insieme, distinte dal campo `tipo`, come la tabella
`attivita` tiene insieme Routine, Lavoro, Nota e Spesa. Ogni schema SQL va
incollato a mano nell'SQL Editor di Supabase: una tabella significa un passaggio
manuale invece di due, e un solo elenco da tenere allineato nell'app.

### Il prezzo

Ogni vendita si porta dietro il prezzo con cui è stata fatta. Il modulo propone
l'ultimo prezzo usato, letto dalla vendita più recente in archivio; se non
esistono vendite propone 0,60 euro. Cambiandolo in una vendita, da quel momento
sarà quello proposto anche sull'altro telefono, perché sta nel database.

Non serve una schermata di impostazioni: oggi le impostazioni dell'app vivono
nel `localStorage`, che è diverso su ogni telefono, e un prezzo diverso fra
Stefano e Anna sarebbe un errore silenzioso.

## Interfaccia

### La sezione

```
Oggi   Animali   [Uova]   Lavori   Registro   Spesa
```

La barra passa da `repeat(5, ...)` a `repeat(6, ...)`. È l'unica modifica a
qualcosa che già esiste. "Uova" è corta e regge anche su schermi stretti.

Dall'alto: riepilogo, poi elenco dei movimenti del periodo. Il pulsante ＋ è
quello galleggiante che c'è già in basso a destra: entrando nella sezione la sua
etichetta diventa "Uova", come fa oggi cambiando fra Lavori e Spesa.

### I due moduli

Il pulsante ＋ chiede prima quale dei due.

**Raccolta** — data (oggi per difetto), quantità con i tasti −/+, note.

**Vendita** — data, quantità, prezzo già compilato, incasso che si aggiorna
mentre si batte il numero, a chi (facoltativo), note.

Si riusa il pannello unico dei moduli, come per animali e interventi. Toccando
una riga dell'elenco si riapre lo stesso modulo per correggere; il pulsante per
eliminare sta dentro il modulo.

### Il riepilogo

Quattro pulsanti: **Oggi · Mese · Anno · Periodo**. L'ultimo apre due campi
data, da e a.

```
UOVA — quest'anno

  Prezzo attuale     0,60 euro/uovo

  Raccolte                  4.180
  Vendute                   3.640
  Restate in casa             540

  Incassato              2.184,00
  Cure e veterinario       420,00
  Acquisto animali         220,00
  ------------------------------
  In attivo             +1.544,00

  Media al giorno    18 uova
```

## Calcoli

Su tutti i movimenti con `data` dentro il periodo scelto:

- **Raccolte**: somma di `quantita` dove `tipo = 'Raccolta'`
- **Vendute**: somma di `quantita` dove `tipo = 'Vendita'`
- **Restate in casa**: raccolte meno vendute. Può risultare negativo se si
  vendono uova raccolte in un periodo precedente: in quel caso si mostra zero e
  non un numero sotto zero, che confonderebbe.
- **Incassato**: somma di `quantita * prezzo_unitario` sulle vendite
- **Media al giorno**: raccolte diviso i giorni del periodo già trascorsi, non
  i giorni totali: a metà mese la media non deve risultare dimezzata.

### Le spese, e un limite dichiarato

Le due voci restano separate perché hanno un'attendibilità diversa:

- **Cure e veterinario**: somma di `interventi_animali.costo` con
  `data_evento` nel periodo. Data reale, filtro esatto.
- **Acquisto animali**: somma di `animali.costo_acquisto` per gli animali con
  `creato_il` nel periodo. Nel database **non esiste una data di acquisto**:
  c'è solo quando l'animale è stato inserito nell'app. L'etichetta dice
  "registrati nel periodo" per non spacciare l'approssimazione per un dato certo.

Tenerle separate invece di sommarle in un "Speso" unico permette di leggere il
totale sapendo quale metà è precisa.

## Cosa si aggancia a quello che c'è

- **Diario**: ogni movimento salvato chiama `annota()` (`index.html:634`), come
  già fanno animali, interventi e contatti.
- **Archivio locale**: `uova` va aggiunta alle collezioni che funzionano senza
  rete, altrimenti la sezione si rompe quando manca la connessione.
- **Permessi**: `schema-chiudi-permessi.sql` e `schema-riapri-permessi.sql`
  elencano oggi sei tabelle per nome. Senza aggiungere `uova` all'elenco, la
  tabella nuova resterebbe fuori dalla chiusura dei permessi e dalla marcia
  indietro. Va corretto insieme al resto, non dopo.
- **Sincronizzazione istantanea**: la sezione si aggiorna da sola come le altre,
  attraverso il canale già attivo.

## Fuori dallo scopo

Escluse di proposito, da riprendere quando ci saranno mesi di dati veri:

- le uova nella notifica del mattino;
- le uova nella ricerca globale;
- i grafici dell'andamento mese per mese;
- la donazione annuale all'associazione Il Gabbiano, che nel progetto è ancora
  da definire nell'entità.

## Come si capisce che funziona

- Una raccolta e una vendita segnate su un telefono compaiono sull'altro senza
  ricaricare.
- Cambiando il prezzo in una vendita, la successiva lo propone già cambiato, e
  le vendite vecchie mantengono il loro.
- Il riepilogo sui quattro periodi dà numeri coerenti fra loro: la somma dei
  mesi dell'anno corrisponde al totale dell'anno.
- Senza rete la sezione si apre e accetta registrazioni, che risalgono al
  ritorno della connessione.
- Con i permessi chiusi, senza accesso la tabella `uova` non è leggibile.

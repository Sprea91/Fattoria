# Registro uova e vendite — Piano di realizzazione

> **Per chi esegue:** SOTTO-SKILL RICHIESTA: usare superpowers:subagent-driven-development (consigliata) oppure superpowers:executing-plans per realizzare questo piano un compito alla volta. I passi usano caselle (`- [ ]`) per segnare l'avanzamento.

**Obiettivo:** aggiungere all'app una sezione Uova che registra raccolte e vendite e mostra, sul periodo scelto, quanto è stato prodotto, venduto e incassato a confronto con le spese.

**Impostazione:** una tabella nuova `uova` con raccolte e vendite distinte da un campo `tipo`. Nell'app una sesta vista che riusa i meccanismi già in piedi: il pannello unico dei moduli, il diario, la sincronizzazione istantanea e l'archivio locale per quando manca la rete. Nessuna dipendenza nuova.

**Tecnologie:** HTML/CSS/JavaScript in un unico file (`index.html`, nessun passaggio di compilazione), Supabase (PostgreSQL + realtime), Tailwind dal CDN.

**Progetto di riferimento:** `docs/superpowers/specs/2026-08-25-registro-uova-design.md`

---

## Come si verifica il lavoro in questo progetto

Il progetto non ha un framework di test e Node non è installato sul computer di sviluppo. Le verifiche si fanno così, e ogni compito dice quale usare:

- **Prove dei calcoli**: il file `prove/prove-uova.js` si incolla nella console del browser con l'app aperta e stampa un elenco di ✓ e ✗. Le funzioni dell'app stanno nello scope dello script, quindi la console le vede.
- **Prove dell'interfaccia**: si apre l'app e si guarda, seguendo i passi descritti nel compito.

Le prove dei calcoli si scrivono **prima** della funzione che devono provare: si incollano, si vede il ✗, si implementa, si reincollano e si vede il ✓.

---

## Struttura dei file

| File | Responsabilità | Stato |
|---|---|---|
| `schema-uova.sql` | crea la tabella `uova`, i suoi permessi e la sincronizzazione | da creare |
| `schema-chiudi-permessi.sql` | elenca le tabelle di cui chiudere i permessi | da modificare |
| `schema-riapri-permessi.sql` | la marcia indietro dei permessi | da modificare |
| `prove/prove-uova.js` | controlli dei calcoli, da incollare in console | da creare |
| `index.html` | tutta l'app | da modificare in cinque zone distinte |

Dentro `index.html` il lavoro tocca cinque zone, ciascuna nel suo compito: caricamento dei dati, calcoli, disegno della sezione, moduli, eventi.

---

## Compito 1: la tabella nel database

**File:**
- Creare: `schema-uova.sql`
- Modificare: `schema-chiudi-permessi.sql`
- Modificare: `schema-riapri-permessi.sql`

- [ ] **Passo 1: creare `schema-uova.sql`**

```sql
-- ============================================================================
-- FATTORIA TASKS — registro delle uova (raccolte e vendite)
-- Da eseguire una volta nell'SQL Editor di Supabase.
-- Aggiunge una tabella nuova, non tocca nulla di esistente.
--
-- Raccolte e vendite stanno insieme, distinte dal campo "tipo", come la tabella
-- delle attività tiene insieme Routine, Lavoro, Nota e Spesa.
-- L'incasso non è una colonna: si ricava da quantita * prezzo_unitario, così
-- non può esistere un totale salvato che un giorno non torna.
-- ============================================================================

create table if not exists public.uova (
  id              uuid        primary key default gen_random_uuid(),
  data            date        not null default current_date,
  tipo            text        not null default 'Raccolta',   -- Raccolta | Vendita
  quantita        int         not null check (quantita > 0),
  prezzo_unitario numeric(6,2),                              -- solo per le vendite
  cliente         text,                                      -- solo per le vendite
  note            text,
  creato_il       timestamptz not null default now()
);

create index if not exists uova_data_idx on public.uova (data desc);

-- ---------------------------------------------------------------------------
-- Permessi: come le altre tabelle, solo chi ha fatto l'accesso.
-- Le regole vecchie vengono lette dal database e rimosse, qualunque nome
-- abbiano: generarne i nomi a mano lascerebbe fuori quelle con nomi storici.
-- ---------------------------------------------------------------------------
alter table public.uova enable row level security;

do $$
declare r record;
begin
  for r in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'uova'
  loop
    execute format('drop policy %I on public.uova', r.policyname);
  end loop;
end $$;

create policy "uova_entrati_leggono"    on public.uova for select to authenticated using (true);
create policy "uova_entrati_scrivono"   on public.uova for insert to authenticated with check (true);
create policy "uova_entrati_modificano" on public.uova for update to authenticated using (true) with check (true);
create policy "uova_entrati_eliminano"  on public.uova for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Sincronizzazione istantanea, con lo stesso giro di schema-v4.sql: se la
-- tabella è già nella pubblicazione, l'errore va ignorato.
-- ---------------------------------------------------------------------------
do $$
begin
  alter table public.uova replica identity full;
  begin
    alter publication supabase_realtime add table public.uova;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- VERIFICA: deve elencare 4 righe, tutte con ruolo {authenticated}.
-- ---------------------------------------------------------------------------
select tablename, policyname, roles, cmd
  from pg_policies
 where schemaname = 'public' and tablename = 'uova'
 order by cmd;
```

- [ ] **Passo 2: aggiungere `uova` agli elenchi in `schema-chiudi-permessi.sql`**

Il file contiene più elenchi di tabelle scritti per nome. Vanno aggiornati tutti.

Nella `select` che cerca le regole da rimuovere:

```sql
       and tablename in ('attivita','animali','interventi_animali','contatti','iscrizioni_push','diario','uova')
```

Nel ciclo che crea le regole nuove:

```sql
  foreach t in array array['attivita','animali','interventi_animali','contatti','iscrizioni_push','diario','uova'] loop
```

Nel commento della verifica finale, dove c'è scritto `deve elencare 24 righe`, il numero diventa `28 righe` (sette tabelle per quattro regole).

Nella `select` di verifica in fondo al file:

```sql
   and tablename in ('attivita','animali','interventi_animali','contatti','iscrizioni_push','diario','uova')
```

- [ ] **Passo 3: la stessa aggiunta in `schema-riapri-permessi.sql`**

Aprire il file, trovare ogni elenco di tabelle e aggiungere `,'uova'` in coda, esattamente come al passo 2. Senza questo, la marcia indietro lascerebbe la tabella nuova con i permessi chiusi mentre tutte le altre tornano aperte.

- [ ] **Passo 4: controllare che nessun elenco sia rimasto indietro**

```bash
grep -nE "'diario'\)|'diario'\]" schema-chiudi-permessi.sql schema-riapri-permessi.sql
```

Atteso: **nessuna riga stampata**. Il comando cerca gli elenchi che si CHIUDONO subito
dopo `'diario'`, con la parentesi o la quadra: quelli sono gli elenchi dimenticati.
Cercare il solo `'diario'` senza l'ancoraggio della chiusura non servirebbe a
niente, perché combacerebbe anche con gli elenchi già corretti.

```bash
grep -c "uova" schema-chiudi-permessi.sql schema-riapri-permessi.sql
```

Atteso: un numero maggiore di zero per entrambi i file.

- [ ] **Passo 5: eseguire lo schema su Supabase**

Questo passo lo fa l'utente, non l'agente: aprire l'SQL Editor di Supabase, incollare tutto `schema-uova.sql`, premere Run. In fondo deve comparire la tabella di verifica con 4 righe, tutte con ruolo `{authenticated}`.

Fermarsi qui e chiedere conferma prima di andare avanti: senza la tabella nel database, i compiti seguenti non si possono provare.

- [ ] **Passo 6: commit**

```bash
git add schema-uova.sql schema-chiudi-permessi.sql schema-riapri-permessi.sql
git commit -m "La tabella delle uova, con i suoi permessi"
```

---

## Compito 2: i dati dentro l'app

**File:**
- Modificare: `index.html` (zona archivio e caricamento)

Nessun disegno in questo compito: si tratta solo di far arrivare le righe della tabella dentro l'app, come già succede per animali e interventi.

- [ ] **Passo 1: aggiungere la tabella all'elenco dei nomi**

Cercare `const TABELLE = {` e sostituire la costante con:

```js
const TABELLE = { attivita: 'attivita', animali: 'animali', interventi: 'interventi_animali',
                  contatti: 'contatti', iscrizioni: 'iscrizioni_push', diario: 'diario',
                  uova: 'uova' };
```

- [ ] **Passo 2: la variabile che tiene le righe**

Nel blocco `/* ---------- Stato ---------- */`, sotto la riga `let contatti   = [];`:

```js
let uova       = [];              // raccolte e vendite delle uova
```

- [ ] **Passo 3: registrarla fra le collezioni**

Cercare `const elenco = {` e sostituire con:

```js
const elenco = { attivita: () => attivita, animali: () => animali, interventi: () => interventi,
                 contatti: () => contatti, iscrizioni: () => iscrizioni, diario: () => diario,
                 uova: () => uova };
```

- [ ] **Passo 4: leggerla dal database**

In `archivioRemoto.carica()`, dopo il blocco che legge il diario e prima del `return`, aggiungere la lettura protetta. Il `try` serve perché chi non ha ancora eseguito `schema-uova.sql` deve poter usare l'app esattamente come prima:

```js
    // come per le iscrizioni: se la tabella non c'è ancora, l'app non deve
    // rompersi, semplicemente la sezione resta vuota
    let uo = [];
    try {
      const r = await sb.from(TABELLE.uova).select('*').order('data', { ascending: false });
      if (!r.error) uo = r.data || [];
    } catch (e) {}
```

E nel `return` della stessa funzione aggiungere la voce in coda:

```js
    return { attivita: a.data || [], animali: an.data || [], interventi: iv.data || [],
             contatti: co.data || [], iscrizioni: isc, diario: di, uova: uo };
```

- [ ] **Passo 5: farla funzionare anche senza rete**

In `archivioLocale.carica()`, nel `return` finale:

```js
    return { attivita: d.attivita || [], animali: d.animali || [], interventi: d.interventi || [],
             contatti: d.contatti || [], iscrizioni: d.iscrizioni || [],
             diario: (d.diario || []).slice(-400).reverse(), uova: d.uova || [] };
```

In `archivioLocale.inserisci()`, l'oggetto di partenza quando la memoria è vuota deve conoscere la collezione nuova:

```js
    const d = this.leggi() || { attivita: [], animali: [], interventi: [], contatti: [], uova: [] };
```

- [ ] **Passo 6: metterla in memoria a ogni caricamento**

Nella funzione `ricarica()`, sotto la riga `diario = d.diario || [];`:

```js
    uova = d.uova || [];
```

- [ ] **Passo 7: la sincronizzazione istantanea**

Sostituire `COLL_DI_TABELLA` con:

```js
const COLL_DI_TABELLA = { attivita: 'attivita', animali: 'animali', interventi_animali: 'interventi',
                          contatti: 'contatti', uova: 'uova' };
```

Dentro `avviaSincronia()`, nel blocco che gestisce le cancellazioni, aggiungere la riga sotto quella dei contatti:

```js
          if (coll === 'uova') uova = uova.filter((x) => x.id !== id);
```

- [ ] **Passo 8: provare che i dati arrivino**

Aprire l'app nel browser, fare l'accesso, aprire la console e scrivere:

```js
Array.isArray(uova)
```

Atteso: `true`.

```js
uova.length
```

Atteso: `0`, perché la tabella è appena stata creata. Se compare `Uncaught ReferenceError: uova is not defined`, il passo 2 non è stato applicato.

- [ ] **Passo 9: commit**

```bash
git add index.html
git commit -m "Le uova arrivano dal database fino all'app"
```

---

## Compito 3: i calcoli

**File:**
- Creare: `prove/prove-uova.js`
- Modificare: `index.html` (sezione nuova, subito prima di `DISEGNO GENERALE`)

- [ ] **Passo 1: scrivere le prove che devono fallire**

Creare `prove/prove-uova.js`:

```js
/* ==========================================================================
   FATTORIA TASKS — controlli dei conti delle uova
   Si incolla nella console del browser con l'app aperta e stampa una riga
   per controllo. Mette da parte i dati veri, lavora su dati finti, poi li
   rimette a posto.
   ========================================================================== */
(function proveUova() {
  const veri = uova;
  let ok = 0, ko = 0;
  const controlla = (nome, atteso, avuto) => {
    const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
    console.log((uguale ? 'OK  ' : 'NO  ') + nome
      + (uguale ? '' : '\n    atteso ' + JSON.stringify(atteso) + '\n    avuto  ' + JSON.stringify(avuto)));
    if (uguale) ok++; else ko++;
  };

  const annoOggi = OGGI.slice(0, 4);
  const meseOggi = OGGI.slice(0, 7);

  /* ---------- estremi del periodo ---------- */
  controlla('oggi: da e a sono la data di oggi',
    { da: OGGI, a: OGGI }, estremiPeriodo({ tipo: 'oggi' }));

  controlla('mese: dal primo del mese a oggi',
    { da: meseOggi + '-01', a: OGGI }, estremiPeriodo({ tipo: 'mese' }));

  controlla('anno: dal primo gennaio a oggi',
    { da: annoOggi + '-01-01', a: OGGI }, estremiPeriodo({ tipo: 'anno' }));

  controlla('periodo con date invertite: le raddrizza',
    { da: '2026-03-01', a: '2026-03-31' },
    estremiPeriodo({ tipo: 'periodo', da: '2026-03-31', a: '2026-03-01' }));

  /* ---------- giorni trascorsi ---------- */
  controlla('un giorno solo conta 1',
    1, giorniTrascorsi({ da: '2026-03-10', a: '2026-03-10' }));

  controlla('dal 1 al 10 marzo sono 10 giorni',
    10, giorniTrascorsi({ da: '2026-03-01', a: '2026-03-10' }));

  controlla('i giorni futuri non si contano',
    1, giorniTrascorsi({ da: OGGI, a: '2099-12-31' }));

  /* ---------- i conti ---------- */
  uova = [
    { id: '1', data: '2026-03-01', tipo: 'Raccolta', quantita: 20 },
    { id: '2', data: '2026-03-02', tipo: 'Raccolta', quantita: 24 },
    { id: '3', data: '2026-03-02', tipo: 'Vendita',  quantita: 12, prezzo_unitario: 0.60 },
    { id: '4', data: '2026-03-10', tipo: 'Vendita',  quantita: 10, prezzo_unitario: 0.70 },
    { id: '5', data: '2026-04-01', tipo: 'Raccolta', quantita: 99 }
  ];
  const c = contiUova({ tipo: 'periodo', da: '2026-03-01', a: '2026-03-31' });

  controlla('raccolte: somma solo quelle dentro il periodo', 44, c.raccolte);
  controlla('vendute: somma solo le vendite', 22, c.vendute);
  controlla('restate in casa: raccolte meno vendute', 22, c.restate);
  controlla('incassato: ogni vendita al suo prezzo', 14.2, Math.round(c.incassato * 100) / 100);
  controlla('movimenti del periodo: quattro, il quinto e fuori', 4, c.movimenti.length);
  controlla('i movimenti partono dal piu recente', '2026-03-10', c.movimenti[0].data);

  /* ---------- restate in casa non va sotto zero ---------- */
  uova = [
    { id: '1', data: '2026-03-02', tipo: 'Vendita', quantita: 30, prezzo_unitario: 0.60 }
  ];
  controlla('vendere uova raccolte prima non da un numero sotto zero',
    0, contiUova({ tipo: 'periodo', da: '2026-03-01', a: '2026-03-31' }).restate);

  /* ---------- prezzo proposto ---------- */
  uova = [
    { id: '1', data: '2026-03-01', tipo: 'Vendita',  quantita: 5,  prezzo_unitario: 0.60, creato_il: '2026-03-01T08:00:00Z' },
    { id: '2', data: '2026-03-09', tipo: 'Vendita',  quantita: 5,  prezzo_unitario: 0.75, creato_il: '2026-03-09T08:00:00Z' },
    { id: '3', data: '2026-03-10', tipo: 'Raccolta', quantita: 20 }
  ];
  controlla('propone il prezzo dell ultima vendita, non dell ultimo movimento',
    0.75, prezzoProposto());

  uova = [{ id: '1', data: '2026-03-10', tipo: 'Raccolta', quantita: 20 }];
  controlla('senza vendite propone il prezzo di partenza', 0.60, prezzoProposto());

  uova = [];
  const z = contiUova({ tipo: 'anno' });
  controlla('archivio vuoto: zero dappertutto e nessun errore',
    { raccolte: 0, vendute: 0, restate: 0, incassato: 0 },
    { raccolte: z.raccolte, vendute: z.vendute, restate: z.restate, incassato: z.incassato });

  uova = veri;
  console.log('\n' + ok + ' passati, ' + ko + ' falliti.');
  return ko === 0 ? 'TUTTO A POSTO' : 'CI SONO PROBLEMI';
})();
```

- [ ] **Passo 2: incollare le prove e vederle fallire**

Aprire l'app nel browser, aprire la console, incollare tutto il contenuto di `prove/prove-uova.js`.

Atteso: `Uncaught ReferenceError: estremiPeriodo is not defined`. È il fallimento giusto: le funzioni non esistono ancora.

- [ ] **Passo 3: scrivere i calcoli**

In `index.html`, subito **prima** del blocco commentato `DISEGNO GENERALE`, inserire:

```js
/* ==========================================================================
   UOVA — periodi e conti
   ========================================================================== */
// Prezzo di partenza finché non c'è nessuna vendita da cui copiarlo.
const PREZZO_INIZIALE = 0.60;

// Quale fetta di tempo mostra il riepilogo. Le due date servono solo al tipo
// "periodo": le altre voci si ricavano da oggi.
let periodoUova = { tipo: 'mese', da: OGGI, a: OGGI };

function estremiPeriodo(p) {
  if (p.tipo === 'oggi') return { da: OGGI, a: OGGI };
  if (p.tipo === 'mese') return { da: OGGI.slice(0, 8) + '01', a: OGGI };
  if (p.tipo === 'anno') return { da: OGGI.slice(0, 4) + '-01-01', a: OGGI };
  const da = p.da || OGGI, a = p.a || OGGI;
  return da <= a ? { da, a } : { da: a, a: da };   // date invertite: le raddrizzo
}

const dentroPeriodo = (g, e) => !!g && g >= e.da && g <= e.a;

// Giorni del periodo già passati: a metà mese la media non deve risultare
// dimezzata da giorni che devono ancora arrivare.
function giorniTrascorsi(e) {
  const fine = e.a > OGGI ? OGGI : e.a;
  if (fine < e.da) return 0;
  const [y1, m1, g1] = e.da.split('-').map(Number);
  const [y2, m2, g2] = fine.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, g2) - new Date(y1, m1 - 1, g1)) / 86400000) + 1;
}

// Il prezzo proposto è quello dell'ultima vendita registrata: sta nel
// database, quindi è lo stesso sul telefono di tutti.
function prezzoProposto() {
  const vendite = uova
    .filter((u) => u.tipo === 'Vendita' && u.prezzo_unitario !== null && u.prezzo_unitario !== undefined)
    .sort((a, b) => String(b.data).localeCompare(String(a.data))
                 || String(b.creato_il || '').localeCompare(String(a.creato_il || '')));
  return vendite.length ? Number(vendite[0].prezzo_unitario) : PREZZO_INIZIALE;
}

function contiUova(p) {
  const e = estremiPeriodo(p);
  const dentro   = uova.filter((u) => dentroPeriodo(u.data, e));
  const somma    = (righe) => righe.reduce((s, u) => s + Number(u.quantita || 0), 0);
  const raccolte = somma(dentro.filter((u) => u.tipo === 'Raccolta'));
  const vendite  = dentro.filter((u) => u.tipo === 'Vendita');
  const vendute  = somma(vendite);
  const incassato = vendite.reduce((s, u) =>
    s + Number(u.quantita || 0) * Number(u.prezzo_unitario || 0), 0);

  // Le cure hanno una data vera. Per gli animali esiste solo la data in cui
  // sono stati inseriti nell'app: il riepilogo lo scrive, non lo nasconde.
  const cure = interventi
    .filter((x) => dentroPeriodo(x.data_evento, e))
    .reduce((s, x) => s + Number(x.costo || 0), 0);
  const acquisti = animali
    .filter((a) => dentroPeriodo(String(a.creato_il || '').slice(0, 10), e))
    .reduce((s, a) => s + Number(a.costo_acquisto || 0), 0);

  const giorni = giorniTrascorsi(e);
  return {
    da: e.da, a: e.a,
    raccolte, vendute,
    restate: Math.max(0, raccolte - vendute),
    incassato, cure, acquisti,
    differenza: incassato - cure - acquisti,
    media: giorni > 0 ? raccolte / giorni : 0,
    movimenti: dentro.slice().sort((x, y) =>
      String(y.data).localeCompare(String(x.data))
      || String(y.creato_il || '').localeCompare(String(x.creato_il || '')))
  };
}
```

- [ ] **Passo 4: reincollare le prove e vederle passare**

Ricaricare la pagina, riaprire la console, incollare di nuovo `prove/prove-uova.js`.

Atteso: diciassette righe che iniziano con `OK`, poi `17 passati, 0 falliti.` e il valore di ritorno `'TUTTO A POSTO'`. Se una riga inizia con `NO`, stampa sotto il valore atteso e quello ottenuto: correggere la funzione, mai la prova.

- [ ] **Passo 5: commit**

```bash
git add index.html prove/prove-uova.js
git commit -m "I conti delle uova, con i controlli che li verificano"
```

---

## Compito 4: la sezione e la navigazione

**File:**
- Modificare: `index.html` (CSS della barra, corpo HTML, disegno generale)

Alla fine di questo compito la voce Uova esiste, si apre e mostra un riquadro vuoto. Il contenuto arriva nei compiti 5 e 7.

- [ ] **Passo 1: la barra passa a sei colonne**

Nel CSS, nella regola `#barra`:

```css
  #barra { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
           display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));
           background: var(--scheda); border-top: 1.5px solid var(--bordo);
           padding-bottom: env(safe-area-inset-bottom, 0px); }
```

- [ ] **Passo 2: la sezione nel corpo della pagina**

Dopo la riga della sezione `vista-animali`, aggiungere:

```html
  <section id="vista-uova"     hidden><div id="corpo-uova"     class="space-y-5"></div></section>
```

- [ ] **Passo 3: la voce nella barra**

Dentro `<nav id="barra">`, fra la voce `animali` e la voce `lavori`:

```html
  <button class="voce" data-vista="uova"><span class="ic">🥚</span>Uova</button>
```

- [ ] **Passo 4: registrare la vista**

Nel blocco `DISEGNO GENERALE`, sostituire le due costanti:

```js
const VISTE = ['oggi', 'animali', 'uova', 'lavori', 'registro', 'spesa', 'storico'];
const ETICHETTA_BOT = { oggi: 'Attività', animali: 'Animale', uova: 'Uova', lavori: 'Attività',
                        registro: 'Nota', spesa: 'Spesa', storico: 'Attività' };
```

E dentro `disegna()`, sotto la riga `if (vista === 'animali')  disegnaAnimali();`:

```js
  if (vista === 'uova')     disegnaUova();
```

- [ ] **Passo 5: la funzione di disegno, per ora minima**

Prima del blocco `DISEGNO GENERALE`, dopo i calcoli del compito 3:

```js
/* ==========================================================================
   UOVA — la sezione
   ========================================================================== */
function disegnaUova() {
  $('#corpo-uova').innerHTML = '<p class="scheda text-center font-bold py-10">Sezione in costruzione</p>';
}
```

- [ ] **Passo 6: provare la navigazione**

Ricaricare l'app e verificare, uno per uno:

1. In fondo si vedono sei voci: Oggi, Animali, Uova, Lavori, Registro, Spesa. Nessuna scritta è tagliata.
2. Toccando Uova compare la scritta "Sezione in costruzione" e la voce si evidenzia.
3. Il pulsante verde in basso a destra scrive "＋ Uova".
4. Tornando su Oggi la schermata di prima ricompare intatta.

- [ ] **Passo 7: commit**

```bash
git add index.html
git commit -m "La sezione Uova nella barra in basso"
```

---

## Compito 5: il riepilogo

**File:**
- Modificare: `index.html` (funzione `disegnaUova`, gestione eventi)

- [ ] **Passo 1: sostituire la funzione minima con quella vera**

Sostituire per intero la `disegnaUova()` scritta nel compito 4 con:

```js
const NOMI_PERIODO = { oggi: 'Oggi', mese: 'Questo mese', anno: 'Quest\'anno', periodo: 'Periodo scelto' };

function sceltaPeriodo() {
  const bottone = (t) => `<button class="bot ${periodoUova.tipo === t ? 'bot-verde' : 'bot-chiaro'} bot-piccolo flex-1"
      data-periodo="${t}">${NOMI_PERIODO[t]}</button>`;
  const date = periodoUova.tipo !== 'periodo' ? '' : `
    <div class="flex items-end gap-2 mt-2">
      <div class="flex-1"><label class="didascalia" for="p-da">Dal</label>
        <input id="p-da" type="date" class="campo mt-1" value="${periodoUova.da}"></div>
      <div class="flex-1"><label class="didascalia" for="p-a">Al</label>
        <input id="p-a" type="date" class="campo mt-1" value="${periodoUova.a}"></div>
    </div>`;
  return `<div class="scheda">
      <div class="flex gap-1.5">${['oggi', 'mese', 'anno', 'periodo'].map(bottone).join('')}</div>
      ${date}
    </div>`;
}

function riquadroConti() {
  const c = contiUova(periodoUova);
  const riga = (etichetta, valore, forte) => `<div class="flex items-baseline gap-2 ${forte ? 'font-black' : 'font-bold'}">
      <span class="flex-1 min-w-0">${etichetta}</span>
      <span class="shrink-0 tabellare">${valore}</span></div>`;
  const attivo = c.differenza >= 0;
  return `<div class="scheda space-y-1.5">
      <p class="didascalia">${NOMI_PERIODO[periodoUova.tipo]}</p>
      <p class="text-sm font-semibold" style="color:var(--inchiostro2)">
        Prezzo attuale ${euro(prezzoProposto())} a uovo</p>

      <div class="pt-2 space-y-1">
        ${riga('Raccolte', c.raccolte)}
        ${riga('Vendute', c.vendute)}
        ${riga('Restate in casa', c.restate)}
      </div>

      <div class="pt-2 space-y-1" style="border-top:1.5px solid var(--bordo)">
        ${riga('Incassato', euro(c.incassato) || '0,00 €')}
        ${riga('Cure e veterinario', euro(c.cure) || '0,00 €')}
        ${riga('Acquisto animali', euro(c.acquisti) || '0,00 €')}
      </div>

      <div class="pt-2" style="border-top:1.5px solid var(--bordo);color:${attivo ? 'var(--verde-cupo)' : 'var(--allarme)'}">
        ${riga(attivo ? 'In attivo' : 'In passivo', (attivo ? '+' : '') + euro(c.differenza), true)}
      </div>

      <p class="text-xs font-semibold pt-2" style="color:var(--inchiostro2)">
        Media ${c.media.toFixed(1).replace('.', ',')} uova al giorno ·
        l'acquisto degli animali è contato per data di inserimento nell'app,
        che è l'unica data disponibile.</p>
    </div>`;
}

function disegnaUova() {
  $('#corpo-uova').innerHTML = sceltaPeriodo() + riquadroConti();
}
```

- [ ] **Passo 2: aggiungere la classe per incolonnare i numeri**

Nel CSS, dopo la regola `.didascalia` (o in fondo al blocco `<style>`):

```css
  .tabellare { font-variant-numeric: tabular-nums; }
```

- [ ] **Passo 3: far funzionare i quattro pulsanti**

Nella funzione che gestisce i click (blocco `EVENTI`), sotto la riga che gestisce `el.dataset.scheda`:

```js
  if (el.dataset.periodo) { periodoUova = { ...periodoUova, tipo: el.dataset.periodo }; disegna(); return; }
```

- [ ] **Passo 4: far funzionare i due campi data**

Esiste **già** un ascoltatore globale di `change`, quello che gestisce il campo
`m-scadenza`. Non crearne un secondo: aggiungere la riga dentro quello,
lasciando invariata quella che c'è.

```js
document.addEventListener('change', (e) => {
  if (e.target.id === 'm-scadenza') { mod.scadenza = e.target.value; disegnaPannello(); }
  if (e.target.id === 'p-da' || e.target.id === 'p-a') {
    periodoUova = { ...periodoUova, [e.target.id === 'p-da' ? 'da' : 'a']: e.target.value || OGGI };
    disegnaUova();
  }
});
```

- [ ] **Passo 5: provare il riepilogo**

Con la tabella ancora vuota, aprire la sezione Uova e verificare:

1. Si vedono quattro pulsanti e "Questo mese" è quello acceso.
2. Tutti i numeri sono a zero, nessun `NaN`, nessun `undefined`.
3. Il prezzo attuale dice `0,60 €`.
4. Toccando "Periodo" compaiono i due campi data; scegliendo due date il riquadro si aggiorna.
5. Toccando "Oggi", "Questo mese", "Quest'anno" il pulsante acceso cambia.

- [ ] **Passo 6: commit**

```bash
git add index.html
git commit -m "Il riepilogo delle uova sui quattro periodi"
```

---

## Compito 6: i moduli per registrare

**File:**
- Modificare: `index.html` (moduli, salvataggio, pulsante di aggiunta)

- [ ] **Passo 1: il pulsante ＋ apre la scelta**

Nell'ascoltatore del pulsante di aggiunta (cercare `$('#aggiungi').addEventListener`), aggiungere il caso della vista nuova come prima riga del corpo:

```js
$('#aggiungi').addEventListener('click', () => {
  if (vista === 'uova')          apriNuovo('Raccolta');
  else if (vista === 'animali')  apriNuovo('Animale');
  else if (vista === 'registro') apriNuovo('Nota');
  else if (vista === 'spesa')    apriNuovo('Spesa');
  else apriNuovo('Lavoro', vista === 'oggi' && calSel !== OGGI ? calSel : '');
});
```

- [ ] **Passo 2: i valori di partenza del modulo**

Dentro `apriNuovo()`, nell'oggetto `mod`, aggiungere in coda le tre voci nuove (prima di `extra: false`):

```js
          data_uova: OGGI, quantita: '', prezzo: prezzoProposto(), cliente: '',
```

- [ ] **Passo 3: il disegno dei due moduli**

Dentro `disegnaPannello()` ogni tipo ha il suo blocco, riconoscibile da un
commento come `/* ---------- ANIMALE ---------- */`. Ogni blocco **non
restituisce una stringa**: scrive il titolo in `#pannello-titolo`, il contenuto
in `#pannello-corpo` e poi fa `return;`. Il blocco nuovo va scritto nella stessa
forma e inserito dopo quello dell'intervento.

La variabile `k` esiste già all'inizio della funzione (`const k = tipoAperto;`),
così come `nuovo`.

```js
  /* ---------- UOVA: RACCOLTA E VENDITA ---------- */
  if (k === 'Raccolta' || k === 'Vendita') {
    const vendita = k === 'Vendita';
    const quante = Number(mod.quantita || 0);
    const prezzo = Number(mod.prezzo || 0);
    $('#pannello-titolo').textContent = vendita
      ? (nuovo ? 'Nuova vendita' : 'Vendita di uova')
      : (nuovo ? 'Nuova raccolta' : 'Raccolta di uova');
    $('#pannello-corpo').innerHTML = `
      <div class="flex gap-1.5">
        <button class="bot ${vendita ? 'bot-chiaro' : 'bot-verde'} flex-1" data-tipo-uova="Raccolta">🧺 Raccolta</button>
        <button class="bot ${vendita ? 'bot-verde' : 'bot-chiaro'} flex-1" data-tipo-uova="Vendita">💶 Vendita</button>
      </div>

      <div><label class="didascalia" for="m-data-uova">Giorno</label>
        <input id="m-data-uova" type="date" class="campo mt-1.5" value="${mod.data_uova || OGGI}"></div>

      <div><label class="didascalia" for="m-quantita">Quante uova</label>
        <div class="flex items-center gap-2 mt-1.5">
          <button class="bot bot-chiaro" data-uova-meno="1" aria-label="Una in meno">−</button>
          <input id="m-quantita" type="number" inputmode="numeric" min="1" class="campo flex-1 text-center"
                 value="${mod.quantita}" placeholder="0">
          <button class="bot bot-chiaro" data-uova-piu="1" aria-label="Una in più">+</button>
        </div></div>

      ${!vendita ? '' : `
      <div><label class="didascalia" for="m-prezzo">Prezzo a uovo</label>
        <input id="m-prezzo" type="number" inputmode="decimal" step="0.01" min="0"
               class="campo mt-1.5" value="${mod.prezzo}"></div>

      <div class="scheda flex items-baseline gap-2">
        <span class="flex-1 font-bold">Incasso</span>
        <span id="incasso-uova" class="font-black text-lg tabellare">${euro(quante * prezzo) || '0,00 €'}</span>
      </div>

      <div><label class="didascalia" for="m-cliente">A chi (se vuoi)</label>
        <input id="m-cliente" type="text" class="campo mt-1.5" value="${pul(mod.cliente || '')}"
               placeholder="nome di chi compra"></div>`}

      <div><label class="didascalia" for="m-note">Note</label>
        <textarea id="m-note" rows="2" class="campo mt-1.5">${pul(mod.note || '')}</textarea></div>

      <button class="bot bot-verde bot-largo" data-azione="salva">${nuovo ? '＋ Registra' : '💾 Salva'}</button>
      ${!nuovo ? '<button class="bot bot-rosso bot-largo" data-azione="elimina-nel-pannello">🗑 Elimina</button>' : ''}`;
    return;
  }
```

- [ ] **Passo 4: leggere i campi nuovi**

Dentro `leggiCampi()`, nell'oggetto `v`, aggiungere le quattro voci:

```js
    data_uova: g('#m-data-uova'), quantita: g('#m-quantita'),
    prezzo: g('#m-prezzo'), cliente: g('#m-cliente'),
```

- [ ] **Passo 5: i pulsanti − e + e lo scambio fra raccolta e vendita**

Nel blocco `EVENTI`, insieme alle altre righe che leggono un `dataset`:

```js
  if (el.dataset.tipoUova) { leggiCampi(); tipoAperto = el.dataset.tipoUova; disegnaPannello(); return; }
  if (el.dataset.uovaMeno) { leggiCampi(); mod.quantita = Math.max(0, Number(mod.quantita || 0) - 1); disegnaPannello(); return; }
  if (el.dataset.uovaPiu)  { leggiCampi(); mod.quantita = Number(mod.quantita || 0) + 1; disegnaPannello(); return; }
```

Perché l'incasso si aggiorni mentre si batte il numero serve un ascoltatore di
`input`. Un ascoltatore globale di `input` **non esiste** (quello alla riga del
campo di ricerca è agganciato a un singolo campo), quindi va aggiunto: metterlo
subito sotto l'ascoltatore globale di `change`.

Non si ridisegna tutto il pannello a ogni tasto, altrimenti il campo perde il
fuoco mentre si scrive: si aggiorna solo la cella dell'incasso.

```js
document.addEventListener('input', (ev) => {
  if (ev.target.id !== 'm-quantita' && ev.target.id !== 'm-prezzo') return;
  if (tipoAperto !== 'Vendita') return;
  leggiCampi();
  const q = Number(mod.quantita || 0), p = Number(mod.prezzo || 0);
  const cella = $('#incasso-uova');
  if (cella) cella.textContent = euro(q * p) || '0,00 €';
});
```

Perché la cella si trovi, nel blocco del modulo scritto al passo 3 la riga
dell'incasso deve avere il suo identificativo:

```html
      <div class="scheda flex items-baseline gap-2">
        <span class="flex-1 font-bold">Incasso</span>
        <span id="incasso-uova" class="font-black text-lg tabellare">${euro(quante * prezzo) || '0,00 €'}</span>
      </div>
```

- [ ] **Passo 6: togliere di mezzo il controllo sul nome**

All'inizio di `salva()` c'è una guardia che pretende un titolo per tutto tranne
gli interventi:

```js
  if (k !== 'Intervento' && !titolo) { avvisa('Scrivi prima il nome', true); const e = $('#m-titolo'); if (e) e.focus(); return; }
```

I moduli delle uova non hanno un campo nome, quindi così non salverebbero mai.
Sostituirla con:

```js
  const senzaNome = k === 'Intervento' || k === 'Raccolta' || k === 'Vendita';
  if (!senzaNome && !titolo) { avvisa('Scrivi prima il nome', true); const e = $('#m-titolo'); if (e) e.focus(); return; }
```

- [ ] **Passo 7: il salvataggio**

Dentro `salva()`, insieme agli altri casi per tipo (accanto a quello di `Intervento`), aggiungere:

```js
    if (k === 'Raccolta' || k === 'Vendita') {
      const quante = Math.trunc(Number(mod.quantita || 0));
      if (!(quante > 0)) { avvisa('Scrivi quante uova', true); return; }
      const riga = { data: mod.data_uova || OGGI, tipo: k, quantita: quante,
                     note: (mod.note || '').trim() || null,
                     prezzo_unitario: null, cliente: null };
      if (k === 'Vendita') {
        const prezzo = Number(mod.prezzo);
        if (!isFinite(prezzo) || prezzo < 0) { avvisa('Prezzo non valido', true); return; }
        riga.prezzo_unitario = prezzo;
        riga.cliente = (mod.cliente || '').trim() || null;
      }
      const salvatoUo = nuovo ? await archivio.inserisci('uova', riga)
                              : await archivio.modifica('uova', idAperto, riga);
      metti('uova', salvatoUo);
      annota(nuovo ? 'Aggiunto' : 'Modificato', k, quante + ' uova',
             k === 'Vendita' ? euro(quante * riga.prezzo_unitario) : null,
             (salvatoUo && salvatoUo.id) || idAperto);
      disegna(); chiudiPannello();
      avvisa(nuovo ? (k === 'Vendita' ? 'Vendita registrata' : 'Raccolta registrata') : 'Modifiche salvate');
      return;
    }
```

- [ ] **Passo 8: provare a registrare**

Nell'app, sezione Uova:

1. Premere ＋: si apre il pannello con "Raccolta" acceso e la data di oggi.
2. Premere + tre volte: il numero diventa 3.
3. Salvare: compare l'avviso "Raccolta registrata" e il riepilogo dice 3 raccolte.
4. Premere ＋, passare a "Vendita", mettere 2 uova: l'incasso dice `1,20 €`.
5. Battere `10` nella quantità: l'incasso diventa `6,00 €` mentre si scrive.
6. Salvare: il riepilogo dice 3 raccolte, 10 vendute, restate 0, incassato `6,00 €`.
7. Aprire ＋ di nuovo su Vendita: il prezzo proposto è `0,6`, quello appena usato.
8. Provare a salvare con quantità vuota: compare "Scrivi quante uova" e non salva niente.
9. Aprire la sezione Registro, scheda del diario: ci sono due righe nuove con chi ha registrato.

- [ ] **Passo 9: commit**

```bash
git add index.html
git commit -m "Registrare una raccolta o una vendita di uova"
```

---

## Compito 7: l'elenco dei movimenti

**File:**
- Modificare: `index.html` (funzione `disegnaUova`, apertura in modifica)

- [ ] **Passo 1: aggiungere l'elenco sotto il riepilogo**

Sostituire `disegnaUova()` con:

```js
function elencoMovimenti() {
  const c = contiUova(periodoUova);
  if (!c.movimenti.length) {
    return `<p class="scheda text-center font-bold py-8">Nessun movimento in questo periodo.<br>
      <span class="font-semibold text-sm">Con il pulsante ＋ segni una raccolta o una vendita.</span></p>`;
  }
  const riga = (u) => {
    const vendita = u.tipo === 'Vendita';
    const soldi = vendita ? euro(Number(u.quantita) * Number(u.prezzo_unitario || 0)) : null;
    return `<div class="riga" data-uovo="${u.id}">
        <span class="text-xl shrink-0">${vendita ? '💶' : '🧺'}</span>
        <div class="flex-1 min-w-0">
          <p class="font-black">${u.quantita} uova${vendita && u.cliente ? ' · ' + pul(u.cliente) : ''}</p>
          <p class="text-xs font-semibold" style="color:var(--inchiostro2)">${pul(etichettaData(u.data))}</p>
        </div>
        ${soldi ? `<span class="font-black tabellare shrink-0">${soldi}</span>` : ''}
      </div>`;
  };
  return `<section><h2 class="titolo-sez">📒 Movimenti <span class="conta">${c.movimenti.length}</span></h2>
      <div class="space-y-2.5">${c.movimenti.map(riga).join('')}</div></section>`;
}

function disegnaUova() {
  $('#corpo-uova').innerHTML = sceltaPeriodo() + riquadroConti() + elencoMovimenti();
}
```

- [ ] **Passo 2: riaprire un movimento per correggerlo**

Aggiungere la funzione di apertura, accanto alle altre `apri...`:

```js
function apriMovimentoUova(id) {
  const u = uova.find((x) => x.id === id); if (!u) return;
  modo = 'uova-modifica'; idAperto = id; tipoAperto = u.tipo || 'Raccolta'; fotoScelta.dati = null;
  mod = { data_uova: u.data || OGGI, quantita: u.quantita ?? '',
          prezzo: u.prezzo_unitario ?? prezzoProposto(), cliente: u.cliente || '',
          note: u.note || '' };
  disegnaPannello(); apriPannello();
}
```

Nel blocco `EVENTI`, insieme alle altre righe che leggono un `dataset`:

```js
  if (el.dataset.uovo) { apriMovimentoUova(el.dataset.uovo); return; }
```

- [ ] **Passo 3: far funzionare l'eliminazione**

Il pulsante è già stato messo nel modulo al compito 6, e usa
`data-azione="elimina-nel-pannello"`. Quell'azione però smista per tipo e
finisce in un ramo `else` che cancella dalle attività: senza il ramo giusto,
eliminare un movimento di uova proverebbe a cancellare un'attività inesistente.

Nel `case 'elimina-nel-pannello'`, aggiungere il ramo prima dell'`else` finale:

```js
        const x = idAperto, k = tipoAperto, an = animaleAperto;
        if (k === 'Animale') { chiudiPannello(); elimina('animali', x); }
        else if (k === 'Intervento') { elimina('interventi', x).then(() => apriAnimale(an)); }
        else if (k === 'Raccolta' || k === 'Vendita') { chiudiPannello(); elimina('uova', x); }
        else { chiudiPannello(); elimina('attivita', x); }
```

La funzione `elimina(coll, id)` è generica e si occupa già del diario e del
ridisegno, ma tiene un elenco esplicito delle collezioni da svuotare in memoria.
Aggiungere la riga, sotto quella dei contatti:

```js
    if (coll === 'uova') uova = uova.filter((x) => x.id !== id);
```

E perché nel diario non resti una riga senza nome, in `NOME_OGGETTO` aggiungere
la voce:

```js
const NOME_OGGETTO = { attivita: 'Attività', animali: 'Animale', interventi: 'Intervento',
                       contatti: 'Contatto', iscrizioni: 'Dispositivo', diario: 'Diario',
                       uova: 'Uova' };
```

Sempre in `elimina()`, la riga che ricava il nome di cosa si sta cancellando non
trova nulla per le uova, che non hanno né titolo né nome. Estenderla:

```js
    const comeSiChiamava = riga.titolo || riga.nome || riga.tipo_evento || riga.dispositivo
                           || (riga.quantita ? riga.quantita + ' uova' : '');
```

- [ ] **Passo 4: provare elenco, modifica ed eliminazione**

1. Nella sezione Uova si vedono i movimenti registrati nel compito 6, dal più recente.
2. Le vendite mostrano l'incasso a destra, le raccolte no.
3. Toccando una riga si riapre il pannello con i valori giusti già dentro.
4. Cambiando la quantità e salvando, il riepilogo si aggiorna.
5. Eliminando un movimento, sparisce dall'elenco e i totali cambiano.
6. Scegliendo un periodo che non contiene movimenti compare "Nessun movimento in questo periodo".

- [ ] **Passo 5: rifare le prove dei calcoli**

Ricaricare la pagina e incollare di nuovo `prove/prove-uova.js` in console.

Atteso: `17 passati, 0 falliti.` Le modifiche di questo compito non toccano i calcoli, ma è il momento di accorgersene se fosse successo.

- [ ] **Passo 6: commit**

```bash
git add index.html
git commit -m "L'elenco dei movimenti delle uova, con modifica ed eliminazione"
```

---

## Compito 8: prova sul campo e pubblicazione

- [ ] **Passo 1: la prova a due telefoni**

Con l'app aperta su due dispositivi (o due finestre del browser, entrambe con l'accesso fatto):

1. Registrare una raccolta sul primo: entro pochi secondi compare sul secondo senza ricaricare.
2. Eliminarla dal secondo: sparisce dal primo.

Se non succede, la tabella non è nella pubblicazione realtime: rieseguire l'ultimo blocco `do $$` di `schema-uova.sql`.

- [ ] **Passo 2: la prova senza rete**

Mettere il telefono in modalità aereo, aprire l'app, entrare nella sezione Uova.

Atteso: la sezione si apre e non dà errori. La striscia in alto segnala che si è offline.

- [ ] **Passo 3: la prova dei permessi**

Aprire l'indirizzo dell'app in una finestra anonima, senza fare l'accesso.

Atteso: compare la schermata di accesso e nessun dato. Poi, sempre in anonima, chiedere la tabella al database:

```
https://aiowitawkzyohycsxkxi.supabase.co/rest/v1/uova?select=*&apikey=LA_CHIAVE_PUBBLICA
```

La chiave pubblica è quella in `index.html`, costante `SUPABASE_ANON_KEY`.

Atteso: una risposta vuota `[]` oppure un errore di permessi. Se compaiono i dati, i permessi della tabella nuova non sono chiusi: rieseguire `schema-chiudi-permessi.sql` aggiornato al compito 1.

- [ ] **Passo 4: pubblicare**

```bash
git push
```

Poi verificare che il sito sia stato ripubblicato:

```bash
gh api repos/Sprea91/Fattoria/pages/builds/latest --jq '{status,commit:.commit[0:7]}'
```

Atteso: `status` uguale a `built` e `commit` uguale alle prime sette cifre dell'ultimo commit.

- [ ] **Passo 5: aggiornare il progetto con quello che si è imparato**

Se durante la realizzazione qualcosa è stato deciso diversamente da come era scritto nel documento di progetto, aggiornare `docs/superpowers/specs/2026-08-25-registro-uova-design.md` perché resti il racconto di com'è fatta davvero, e committare.

---

## Cosa resta fuori

Non fa parte di questo piano, per scelta presa in fase di progetto:

- le uova nella notifica del mattino;
- le uova nella ricerca globale;
- i grafici dell'andamento mese per mese;
- la donazione annuale all'associazione Il Gabbiano.

/* ==========================================================================
   FATTORIA TASKS — controlli dei conti delle uova
   Si incolla nella console del browser con l'app aperta e stampa una riga
   per controllo. Mette da parte i dati veri, lavora su dati finti, poi li
   rimette a posto anche se un controllo va storto (try/finally): senza,
   un errore lascerebbe l'app in mano ai dati inventati.
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

  try {
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

    /* ---------- il prezzo scritto a mano ----------
       Qui stava il difetto peggiore: il campo era numerico, il tastierino
       italiano dà la virgola, e un campo numerico con la virgola torna vuoto.
       Number('') vale zero, non "non valido": la vendita finiva salvata a
       0,00 euro, e quello zero diventava il prezzo proposto a tutti. */
    controlla('prezzo con la virgola, come lo scrive un telefono italiano',
      0.6, leggiPrezzo('0,60'));

    controlla('prezzo con il punto: va bene lo stesso',
      0.6, leggiPrezzo('0.60'));

    controlla('prezzo con spazi intorno',
      1.2, leggiPrezzo('  1,20  '));

    controlla('campo vuoto: non e zero, e "manca il prezzo"',
      null, leggiPrezzo(''));

    controlla('campo mai compilato: non e zero',
      null, leggiPrezzo(undefined));

    controlla('scritta al posto del numero: rifiutata',
      null, leggiPrezzo('non lo so'));

    controlla('prezzo negativo: rifiutato',
      null, leggiPrezzo('-1'));

    controlla('zero scritto apposta: e un prezzo valido, per chi regala',
      0, leggiPrezzo('0'));

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
    controlla('non vendute nel periodo: raccolte meno vendute', 22, c.restate);
    controlla('incassato: ogni vendita al suo prezzo', 14.2, Math.round(c.incassato * 100) / 100);
    controlla('movimenti del periodo: quattro, il quinto e fuori', 4, c.movimenti.length);
    controlla('i movimenti partono dal piu recente', '2026-03-10', c.movimenti[0].data);

    /* ---------- quante ne restano in casa, su tutto l'archivio ----------
       Diverso dal riepilogo, che guarda solo il periodo scelto: qui conta
       tutto, perche il magazzino non ha periodi. */
    controlla('in casa: tutte le raccolte meno tutte le vendite', 121, uovaDisponibili());

    controlla('modificando una vendita, quella riga non conta piu',
      131, uovaDisponibili('4'));

    /* ---------- casi limite ---------- */
    uova = [
      { id: '1', data: '2026-03-02', tipo: 'Vendita', quantita: 30, prezzo_unitario: 0.60 }
    ];
    controlla('vendere uova raccolte prima non da un numero sotto zero',
      0, contiUova({ tipo: 'periodo', da: '2026-03-01', a: '2026-03-31' }).restate);

    controlla('in casa puo invece risultare negativo, e giusto saperlo',
      -30, uovaDisponibili());

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

    uova = [
      { id: '1', data: '2026-03-01', tipo: 'Vendita', quantita: 5, prezzo_unitario: 0.60, creato_il: '2026-03-01T08:00:00Z' },
      { id: '2', data: '2026-03-09', tipo: 'Vendita', quantita: 5, prezzo_unitario: 0,    creato_il: '2026-03-09T08:00:00Z' }
    ];
    controlla('una vendita a zero non diventa il prezzo proposto a tutti',
      0.60, prezzoProposto());

    uova = [];
    const z = contiUova({ tipo: 'anno' });
    controlla('archivio vuoto: zero dappertutto e nessun errore',
      { raccolte: 0, vendute: 0, restate: 0, incassato: 0 },
      { raccolte: z.raccolte, vendute: z.vendute, restate: z.restate, incassato: z.incassato });

    controlla('archivio vuoto: in casa zero, non un errore', 0, uovaDisponibili());

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
  } finally {
    uova = veri;
  }

  console.log('\n' + ok + ' passati, ' + ko + ' falliti.');
  return ko === 0 ? 'TUTTO A POSTO' : 'CI SONO PROBLEMI';
})();

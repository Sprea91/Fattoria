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

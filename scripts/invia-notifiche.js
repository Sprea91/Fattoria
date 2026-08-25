/* ==========================================================================
   FATTORIA TASKS — invio del riassunto della giornata
   Gira su GitHub Actions (vedi .github/workflows/notifiche.yml).
   Legge le attività da Supabase e manda una notifica a ogni telefono iscritto.

   La chiave privata arriva dal segreto VAPID_PRIVATA: non è mai nel codice.
   ========================================================================== */
'use strict';

const webpush = require('web-push');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aiowitawkzyohycsxkxi.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpb3dpdGF3a3p5b2h5Y3N4a3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjgwNjMsImV4cCI6MjEwMDkwNDA2M30.w2PA_VHPZc-2LQJHy__yK73XnxVwGDOwKyiYQN5klXE';
// Chiave di servizio: serve solo quando i permessi del database sono chiusi.
// Sta nei segreti del repository, non nel codice. Se manca si usa quella
// pubblica, che basta finché i permessi restano aperti.
const SERVIZIO = (process.env.SUPABASE_SERVIZIO || '').trim();
const CHIAVE_LETTURA = SERVIZIO || SUPABASE_ANON;
const VAPID_PUBBLICA = process.env.VAPID_PUBBLICA
  || 'BOoKI-xfJkU6tRnNaXKpO99FBDOwkOj61WoO1E2zxi9wOgb5dHvcqvjJgu7pl0eWSqwFkqyzU_rG25hQAmfCmvs';
// trim: se il segreto viene incollato con un fine riga o uno spazio in coda,
// web-push lo rifiuta ("must be a URL safe Base 64")
const VAPID_PRIVATA = (process.env.VAPID_PRIVATA || '').trim().replace(/[^A-Za-z0-9\-_]/g, '');
// Indirizzo di riferimento richiesto dallo standard delle notifiche push: i
// servizi di Apple e Google lo usano per avvisare il proprietario se qualcosa
// non va. Questo è un progetto privato: niente indirizzi di lavoro.
const CONTATTO = process.env.VAPID_CONTATTO || 'mailto:stefano_spreafico@yahoo.it';
const FORZA = String(process.env.FORZA || '').toLowerCase() === 'true';
// Prova a vuoto: fa tutto il giro (legge il database, compone il messaggio) ma
// non manda niente ai telefoni. Serve per controllare che la catena funzioni
// senza far arrivare il riassunto del mattino a metà pomeriggio.
const SOLO_PROVA = String(process.env.SOLO_PROVA || '').toLowerCase() === 'true';
// Finestra oraria italiana in cui il riassunto può partire. Non un'ora secca:
// le esecuzioni pianificate di GitHub possono essere saltate o slittare, e con
// una finestra il tentativo successivo recupera.
// Il limite è le 11 e non le 10 perché i ritardi misurati arrivano a cinquanta
// minuti: con la finestra stretta l'ultimo tentativo della mattina partiva
// troppo tardi e si escludeva da solo, lasciando la giornata senza riassunto.
const ORA_DA  = Number(process.env.ORA_DA  || 7);
const ORA_A   = Number(process.env.ORA_A   || 11);
const INDIRIZZO_APP = process.env.INDIRIZZO_APP || 'https://sprea91.github.io/Fattoria/';

const intestazioni = {
  apikey: CHIAVE_LETTURA,
  Authorization: 'Bearer ' + CHIAVE_LETTURA,
  'Content-Type': 'application/json'
};

/* ---------- data e ora in Italia, indipendenti dal fuso del server ---------- */
function adessoInItalia() {
  const f = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const p = {};
  for (const x of f.formatToParts(new Date())) p[x.type] = x.value;
  return { giorno: `${p.year}-${p.month}-${p.day}`, ora: Number(p.hour), minuto: Number(p.minute) };
}

const chiedi = async (percorso) => {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + percorso, { headers: intestazioni });
  if (!r.ok) throw new Error('Supabase ' + r.status + ' su ' + percorso + ': ' + await r.text());
  return r.json();
};

function giorniDiDifferenza(dataIso, oggi) {
  const a = new Date(dataIso + 'T00:00:00Z'), b = new Date(oggi + 'T00:00:00Z');
  return Math.round((a - b) / 86400000);
}

/* ---------- costruisco il messaggio ---------- */
function componiMessaggio(attivita, oggi) {
  const lavori = attivita.filter((t) => t.tipo === 'Lavoro');
  const routine = attivita.filter((t) => t.tipo === 'Routine');
  const spesa = attivita.filter((t) => t.tipo === 'Spesa' && t.stato !== 'Completato');

  const aperti = lavori.filter((t) => t.stato !== 'Completato');
  const ritardo = aperti.filter((t) => t.scadenza && giorniDiDifferenza(t.scadenza, oggi) < 0);
  const diOggi = aperti.filter((t) => t.scadenza === oggi);
  const iniziati = aperti.filter((t) => t.stato === 'In corso');
  // Al mattino contano le routine del mattino (e quelle "in giornata"):
  // ricordare le serali alle 7 del mattino non serve a niente.
  const routineMattino = routine.filter((t) => t.momento !== 'Sera');
  const routineSera    = routine.filter((t) => t.momento === 'Sera');
  const routineDaFare  = routineMattino.filter((t) => t.ultimo_completamento !== oggi);

  const appuntamenti = diOggi.filter((t) => t.ora).sort((a, b) => a.ora.localeCompare(b.ora));
  const senzaOra = diOggi.filter((t) => !t.ora);

  const righe = [];
  if (ritardo.length) {
    righe.push('⛔ In ritardo (' + ritardo.length + ')');
    ritardo.slice(0, 3).forEach((t) => righe.push('  • ' + t.titolo));
  }
  if (appuntamenti.length) {
    righe.push('🕐 Appuntamenti di oggi');
    appuntamenti.forEach((t) => righe.push('  • ' + t.ora + ' ' + t.titolo));
  }
  if (senzaOra.length) {
    righe.push('📅 Da fare oggi (' + senzaOra.length + ')');
    senzaOra.slice(0, 3).forEach((t) => righe.push('  • ' + t.titolo));
  }
  if (iniziati.length) righe.push('🔄 Iniziati e non finiti: ' + iniziati.length);
  if (routineMattino.length) {
    righe.push('☀️ Routine del mattino: ' + (routineMattino.length - routineDaFare.length)
      + ' su ' + routineMattino.length + ' fatte');
  }
  if (routineSera.length) righe.push('🌙 Stasera: ' + routineSera.length
    + (routineSera.length === 1 ? ' routine' : ' routine'));
  if (spesa.length) righe.push('🛒 Da comprare: ' + spesa.length + (spesa.length === 1 ? ' cosa' : ' cose'));

  const qualcosaDaDire = ritardo.length || diOggi.length || spesa.length || routineDaFare.length || iniziati.length;
  return { corpo: righe.join('\n'), qualcosaDaDire, conteggi: { ritardo: ritardo.length, oggi: diOggi.length, spesa: spesa.length } };
}

/* ---------- invio ---------- */
async function principale() {
  if (!VAPID_PRIVATA) {
    console.error('Manca il segreto VAPID_PRIVATA: impostalo nelle impostazioni del repository.');
    process.exit(1);
  }
  if (VAPID_PRIVATA.length !== 43) {
    console.error(`La chiave privata ha ${VAPID_PRIVATA.length} caratteri invece di 43: `
      + 'probabilmente è stata incollata con caratteri di troppo. Reimposta il segreto VAPID_PRIVATA.');
    process.exit(1);
  }
  webpush.setVapidDetails(CONTATTO, VAPID_PUBBLICA, VAPID_PRIVATA);

  const { giorno, ora, minuto } = adessoInItalia();
  console.log(`In Italia sono le ${String(ora).padStart(2, '0')}:${String(minuto).padStart(2, '0')} del ${giorno}`);
  console.log('Chiave usata per leggere: ' + (SERVIZIO ? 'di servizio (permessi chiusi)' : 'pubblica (permessi aperti)'));

  // Fuori dalla finestra non si invia: le pianificazioni coprono sia l'ora
  // legale sia quella solare, e quelle fuori orario non devono fare nulla.
  if (!FORZA && (ora < ORA_DA || ora >= ORA_A)) {
    console.log(`Fuori dalla finestra ${ORA_DA}-${ORA_A} in Italia (sono le ${ora}): non invio.`);
    return;
  }

  const [attivita, tuttiIscritti] = await Promise.all([
    chiedi('attivita?select=tipo,titolo,scadenza,ora,stato,ultimo_completamento'),
    chiedi('iscrizioni_push?select=*')
  ]);
  console.log(`Attività lette: ${attivita.length} · dispositivi iscritti: ${tuttiIscritti.length}`);

  if (!tuttiIscritti.length) { console.log('Nessun dispositivo iscritto: niente da inviare.'); return; }

  // Chi ha già ricevuto il riassunto di oggi viene saltato: così i tentativi di
  // recupero non producono notifiche doppie.
  const giaServito = (i) => String(i.ultimo_invio || '').slice(0, 10) === giorno;
  const iscrizioni = FORZA ? tuttiIscritti : tuttiIscritti.filter((i) => !giaServito(i));
  const saltati = tuttiIscritti.length - iscrizioni.length;
  if (saltati) console.log(`${saltati} dispositivo/i hanno già ricevuto il riassunto di oggi: li salto.`);
  if (!iscrizioni.length) { console.log('Tutti già avvisati oggi: non faccio nulla.'); return; }

  const { corpo, qualcosaDaDire, conteggi } = componiMessaggio(attivita, giorno);
  if (!qualcosaDaDire && !FORZA) { console.log('Giornata vuota: non disturbo.'); return; }

  const titolo = conteggi.ritardo ? `🚜 Oggi in fattoria — ${conteggi.ritardo} in ritardo`
                                  : '🚜 Oggi in fattoria';
  const carico = JSON.stringify({
    titolo,
    corpo: corpo || 'Buona giornata!',
    etichetta: 'riassunto-' + giorno,
    url: INDIRIZZO_APP
  });
  console.log('--- messaggio ---\n' + titolo + '\n' + corpo + '\n-----------------');

  if (SOLO_PROVA) {
    console.log(`PROVA: mi fermo qui, non mando niente. Senza la prova avrei scritto a ${iscrizioni.length} dispositivo/i:`);
    iscrizioni.forEach((i) => console.log('  - ' + (i.dispositivo || i.id)));
    return;
  }

  let inviate = 0, rimosse = 0, errori = 0;
  for (const i of iscrizioni) {
    const iscrizione = { endpoint: i.endpoint, keys: { p256dh: i.chiave_p256dh, auth: i.chiave_auth } };
    try {
      await webpush.sendNotification(iscrizione, carico, { TTL: 6 * 3600, urgency: 'normal' });
      inviate++;
      await fetch(`${SUPABASE_URL}/rest/v1/iscrizioni_push?id=eq.${i.id}`, {
        method: 'PATCH', headers: intestazioni,
        body: JSON.stringify({ ultimo_invio: new Date().toISOString(), errori: 0 })
      });
      console.log('  inviata a ' + (i.dispositivo || i.id));
    } catch (e) {
      const stato = e && e.statusCode;
      if (stato === 404 || stato === 410) {
        // il telefono ha disinstallato o revocato: l'iscrizione non vale più
        await fetch(`${SUPABASE_URL}/rest/v1/iscrizioni_push?id=eq.${i.id}`, { method: 'DELETE', headers: intestazioni });
        rimosse++;
        console.log('  iscrizione scaduta, rimossa: ' + (i.dispositivo || i.id));
      } else {
        errori++;
        console.log('  errore su ' + (i.dispositivo || i.id) + ': ' + stato + ' ' + (e && e.body || e.message));
        await fetch(`${SUPABASE_URL}/rest/v1/iscrizioni_push?id=eq.${i.id}`, {
          method: 'PATCH', headers: intestazioni, body: JSON.stringify({ errori: (i.errori || 0) + 1 })
        });
      }
    }
  }
  console.log(`Fatto: ${inviate} inviate, ${rimosse} iscrizioni scadute rimosse, ${errori} errori.`);
  if (errori && !inviate) process.exit(1);
}

principale().catch((e) => { console.error('Errore generale:', e); process.exit(1); });

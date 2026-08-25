-- ============================================================================
-- FATTORIA TASKS — CHIUDE i permessi del database
--
-- Dopo questo script i dati sono visibili e modificabili SOLO da chi ha fatto
-- l'accesso con email e password.
--
-- Questa versione NON indovina i nomi delle regole esistenti: le legge dal
-- database e le rimuove tutte. La versione precedente generava i nomi dal nome
-- della tabella, e per "attivita" (che un tempo si chiamava tasks) e per
-- "iscrizioni_push" i nomi storici erano diversi: quelle due restavano aperte.
--
-- PRIMA di eseguirlo:
--   1. tu e Anna dovete essere entrati almeno una volta dai vostri telefoni
--   2. il segreto SUPABASE_SERVIZIO deve essere su GitHub, altrimenti le
--      notifiche del mattino smettono di arrivare
--
-- MARCIA INDIETRO: schema-riapri-permessi.sql riporta tutto come prima.
-- ============================================================================

-- 1) Via TUTTE le regole esistenti sulle sette tabelle, qualunque nome abbiano.
do $$
declare r record;
begin
  for r in
    select tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('attivita','animali','interventi_animali','contatti','iscrizioni_push','diario','uova')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2) Solo chi ha fatto l'accesso puo' leggere e scrivere.
do $$
declare t text;
begin
  foreach t in array array['attivita','animali','interventi_animali','contatti','iscrizioni_push','diario','uova'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s_entrati_leggono"    on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "%s_entrati_scrivono"   on public.%I for insert to authenticated with check (true)', t, t);
    execute format('create policy "%s_entrati_modificano" on public.%I for update to authenticated using (true) with check (true)', t, t);
    execute format('create policy "%s_entrati_eliminano"  on public.%I for delete to authenticated using (true)', t, t);
  end loop;
end $$;

-- 3) Foto: restano visibili a chi ha l'indirizzo esatto dell'immagine (serve
--    all'app per mostrarle), ma caricarle o cancellarle richiede l'accesso.
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname in ('farm_photos_read','farm_photos_write','farm_photos_delete',
                          'foto_leggi','foto_carica','foto_elimina')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy "foto_leggi"   on storage.objects for select using (bucket_id = 'farm-photos');
create policy "foto_carica"  on storage.objects for insert to authenticated with check (bucket_id = 'farm-photos');
create policy "foto_elimina" on storage.objects for delete to authenticated using (bucket_id = 'farm-photos');

-- ---------------------------------------------------------------------------
-- VERIFICA: deve elencare 28 righe, tutte con nome "..._entrati_..." e
-- ruolo {authenticated}. Se ne compare una con ruolo {public}, e' rimasta
-- aperta.
-- ---------------------------------------------------------------------------
select tablename, policyname, roles, cmd
  from pg_policies
 where schemaname = 'public'
   and tablename in ('attivita','animali','interventi_animali','contatti','iscrizioni_push','diario','uova')
 order by tablename, cmd;

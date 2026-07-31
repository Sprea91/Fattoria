-- ============================================================================
-- FATTORIA TASKS — CHIUDE i permessi del database
--
-- Dopo questo script i dati sono visibili e modificabili SOLO da chi ha fatto
-- l'accesso con email e password. Chi apre il link senza accedere non vede
-- niente.
--
-- PRIMA di eseguirlo assicurati che:
--   1. tu e Anna siate entrati almeno una volta dai vostri telefoni
--   2. il segreto SUPABASE_SERVIZIO sia stato messo su GitHub, altrimenti
--      le notifiche del mattino smettono di arrivare
--
-- SE QUALCOSA VA STORTO: esegui schema-riapri-permessi.sql e torna a come era
-- prima, senza perdere nessun dato.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array['attivita','animali','interventi_animali','contatti','iscrizioni_push','diario'] loop

    -- via le regole aperte
    execute format('drop policy if exists "%s_leggi"     on public.%I', t, t);
    execute format('drop policy if exists "%s_inserisci" on public.%I', t, t);
    execute format('drop policy if exists "%s_modifica"  on public.%I', t, t);
    execute format('drop policy if exists "%s_elimina"   on public.%I', t, t);
    execute format('drop policy if exists "%s_all_select" on public.%I', t, t);
    execute format('drop policy if exists "%s_all_insert" on public.%I', t, t);
    execute format('drop policy if exists "%s_all_update" on public.%I', t, t);
    execute format('drop policy if exists "%s_all_delete" on public.%I', t, t);
    execute format('drop policy if exists "tasks_all_select" on public.%I', t);
    execute format('drop policy if exists "tasks_all_insert" on public.%I', t);
    execute format('drop policy if exists "tasks_all_update" on public.%I', t);
    execute format('drop policy if exists "tasks_all_delete" on public.%I', t);

    -- solo chi ha fatto l'accesso
    execute format('create policy "%s_entrati_leggono"    on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "%s_entrati_scrivono"   on public.%I for insert to authenticated with check (true)', t, t);
    execute format('create policy "%s_entrati_modificano" on public.%I for update to authenticated using (true) with check (true)', t, t);
    execute format('create policy "%s_entrati_eliminano"  on public.%I for delete to authenticated using (true)', t, t);

  end loop;
end $$;

-- Le foto restano leggibili da chiunque abbia l'indirizzo esatto dell'immagine
-- (serve perche' le pagine mostrano le foto), ma caricarle e cancellarle
-- diventa possibile solo a chi e' entrato.
drop policy if exists "foto_carica"  on storage.objects;
drop policy if exists "foto_elimina" on storage.objects;
create policy "foto_carica"  on storage.objects for insert to authenticated with check (bucket_id = 'farm-photos');
create policy "foto_elimina" on storage.objects for delete to authenticated using (bucket_id = 'farm-photos');

-- ---------------------------------------------------------------------------
-- Verifica: queste righe devono elencare solo regole "entrati_..."
-- ---------------------------------------------------------------------------
-- select tablename, policyname, roles from pg_policies
--  where schemaname = 'public' order by tablename, policyname;

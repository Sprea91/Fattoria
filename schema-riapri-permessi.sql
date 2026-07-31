-- ============================================================================
-- FATTORIA TASKS — RIAPRE i permessi (marcia indietro)
--
-- Usalo se dopo la chiusura qualcosa non funziona: riporta il database come
-- era prima. Nessun dato viene perso: si toccano solo i permessi.
--
-- Dopo averlo eseguito va rimesso ACCESSO_OBBLIGATORIO = false nell'app,
-- altrimenti resta la schermata di accesso.
-- ============================================================================

-- via tutte le regole, qualunque nome abbiano
do $$
declare r record;
begin
  for r in
    select tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('attivita','animali','interventi_animali','contatti','iscrizioni_push','diario')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- accesso aperto come prima
do $$
declare t text;
begin
  foreach t in array array['attivita','animali','interventi_animali','contatti','iscrizioni_push','diario'] loop
    execute format('create policy "%s_leggi"     on public.%I for select using (true)', t, t);
    execute format('create policy "%s_inserisci" on public.%I for insert with check (true)', t, t);
    execute format('create policy "%s_modifica"  on public.%I for update using (true) with check (true)', t, t);
    execute format('create policy "%s_elimina"   on public.%I for delete using (true)', t, t);
  end loop;
end $$;

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
create policy "foto_carica"  on storage.objects for insert with check (bucket_id = 'farm-photos');
create policy "foto_elimina" on storage.objects for delete using (bucket_id = 'farm-photos');

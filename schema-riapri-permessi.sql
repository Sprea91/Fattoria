-- ============================================================================
-- FATTORIA TASKS — RIAPRE i permessi (marcia indietro)
--
-- Usalo se dopo aver chiuso i permessi qualcosa non funziona: riporta il
-- database come era prima. Nessun dato viene perso.
--
-- Dopo averlo eseguito, nell'app va rimesso ACCESSO_OBBLIGATORIO = false
-- (una riga in cima allo script di index.html), altrimenti resta la
-- schermata di accesso.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array['attivita','animali','interventi_animali','contatti','iscrizioni_push','diario'] loop

    execute format('drop policy if exists "%s_entrati_leggono"    on public.%I', t, t);
    execute format('drop policy if exists "%s_entrati_scrivono"   on public.%I', t, t);
    execute format('drop policy if exists "%s_entrati_modificano" on public.%I', t, t);
    execute format('drop policy if exists "%s_entrati_eliminano"  on public.%I', t, t);

    execute format('create policy "%s_leggi"     on public.%I for select using (true)', t, t);
    execute format('create policy "%s_inserisci" on public.%I for insert with check (true)', t, t);
    execute format('create policy "%s_modifica"  on public.%I for update using (true) with check (true)', t, t);
    execute format('create policy "%s_elimina"   on public.%I for delete using (true)', t, t);

  end loop;
end $$;

drop policy if exists "foto_carica"  on storage.objects;
drop policy if exists "foto_elimina" on storage.objects;
create policy "foto_carica"  on storage.objects for insert with check (bucket_id = 'farm-photos');
create policy "foto_elimina" on storage.objects for delete using (bucket_id = 'farm-photos');

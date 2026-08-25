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

-- Il campo "tipo" decide come viene letta la riga: un valore diverso da questi
-- due sparirebbe dal riepilogo pur restando nell'archivio. Postgres non ha un
-- "add constraint if not exists", quindi si guarda prima se c'è già.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'uova_tipo_valido') then
    alter table public.uova
      add constraint uova_tipo_valido check (tipo in ('Raccolta', 'Vendita'));
  end if;
end $$;

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
